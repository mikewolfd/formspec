//! AcroForm field creation — map formspec component types to PDF interactive fields.
//!
//! Uses pdf-writer typed dict API to emit merged field+widget annotation dicts.
//! Supports hierarchical field naming for repeat group paths (e.g. `items[0].name`).

use formspec_plan::{EvaluatedNode, FieldOption};
use pdf_writer::{Finish, Name, Pdf, Ref, Str, TextStr};

use crate::appearance;
use crate::layout::Rect;
use crate::options::PdfConfig;

/// Information about a single AcroForm field placed on a page.
pub struct FieldInfo {
    /// Reference to the field/widget object.
    pub field_ref: Ref,
    /// Fully qualified field name (dotted path).
    pub name: String,
    /// Bounding rectangle [llx, lly, urx, ury].
    pub rect: [f32; 4],
    /// The page this field appears on.
    pub page_index: usize,
}

/// Accumulates fields for later writing to the Pdf.
pub struct AcroFormBuilder {
    pub fields: Vec<FieldInfo>,
}

impl AcroFormBuilder {
    pub fn new() -> Self {
        Self { fields: Vec::new() }
    }

    /// Record a field to be written later.
    pub fn add_field(
        &mut self,
        node: &EvaluatedNode,
        field_ref: Ref,
        rect: &Rect,
        page_index: usize,
    ) -> &FieldInfo {
        let name = node.bind_path.clone().unwrap_or_else(|| node.id.clone());

        let pdf_rect = [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height];

        self.fields.push(FieldInfo {
            field_ref,
            name,
            rect: pdf_rect,
            page_index,
        });

        self.fields.last().unwrap()
    }

    /// Write all accumulated fields into the Pdf document.
    pub fn write_fields(
        &self,
        pdf: &mut Pdf,
        nodes: &[EvaluatedNode],
        page_refs: &[Ref],
        config: &PdfConfig,
        alloc: &mut i32,
    ) {
        for info in &self.fields {
            let node = find_node_by_path(nodes, &info.name);
            let page_ref = page_refs[info.page_index];
            let width = info.rect[2] - info.rect[0];
            let height = info.rect[3] - info.rect[1];

            let comp = node.map(|n| n.component.as_str()).unwrap_or("text");
            let value_str = node
                .and_then(|n| n.value.as_ref())
                .map(value_to_display_string)
                .unwrap_or_default();
            let is_readonly = node.map(|n| n.readonly).unwrap_or(false);

            match comp {
                "checkbox" | "toggle" | "Checkbox" | "Toggle" => {
                    let checked = node
                        .and_then(|n| n.value.as_ref())
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);
                    write_checkbox_field(
                        pdf,
                        info,
                        page_ref,
                        checked,
                        is_readonly,
                        width,
                        height,
                        alloc,
                    );
                }
                "Select" | "select" | "dropdown" => {
                    let options = node
                        .and_then(|n| n.field_item.as_ref())
                        .map(|fi| &fi.options)
                        .cloned()
                        .unwrap_or_default();
                    write_choice_field(
                        pdf,
                        info,
                        page_ref,
                        &value_str,
                        is_readonly,
                        width,
                        height,
                        config,
                        alloc,
                        &options,
                        true,
                    );
                }
                "RadioGroup" | "radio" | "CheckboxGroup" | "checkboxGroup" => {
                    let options = node
                        .and_then(|n| n.field_item.as_ref())
                        .map(|fi| &fi.options)
                        .cloned()
                        .unwrap_or_default();
                    write_radio_field(
                        pdf,
                        info,
                        page_ref,
                        &value_str,
                        is_readonly,
                        height,
                        config,
                        alloc,
                        &options,
                    );
                }
                "Signature" | "signature" => {
                    write_signature_field(pdf, info, page_ref, is_readonly, width, height, alloc);
                }
                "textArea" | "textarea" | "Textarea" => {
                    write_text_field(
                        pdf,
                        info,
                        page_ref,
                        &value_str,
                        is_readonly,
                        width,
                        height,
                        config,
                        alloc,
                        true,
                    );
                }
                _ => {
                    write_text_field(
                        pdf,
                        info,
                        page_ref,
                        &value_str,
                        is_readonly,
                        width,
                        height,
                        config,
                        alloc,
                        false,
                    );
                }
            }
        }
    }

    /// Get the top-level field refs for the `/AcroForm /Fields` array.
    /// For hierarchical paths (containing `.` or `[`), builds parent field
    /// dicts and returns only root-level refs.
    pub fn field_refs_hierarchical(&self, pdf: &mut Pdf, alloc: &mut i32) -> Vec<Ref> {
        let has_hierarchy = self.fields.iter().any(|f| is_hierarchical_path(&f.name));

        if !has_hierarchy {
            // Simple case: all fields are flat, return them directly
            return self.fields.iter().map(|f| f.field_ref).collect();
        }

        // Build hierarchy tree
        let mut root = HierarchyNode::new_root();

        for info in &self.fields {
            let segments = parse_path_segments(&info.name);
            if segments.len() <= 1 {
                // Flat field — goes directly in /Fields
                root.flat_refs.push(info.field_ref);
            } else {
                root.insert(&segments, info.field_ref);
            }
        }

        // Write parent field dicts and collect root refs
        let mut top_refs = root.flat_refs.clone();
        for (name, child) in &root.children {
            let parent_ref = alloc_ref(alloc);
            write_parent_field_dict(pdf, parent_ref, name, child, alloc);
            top_refs.push(parent_ref);
        }

        top_refs
    }

    /// Get annotation refs for a given page index.
    pub fn annot_refs_for_page(&self, page_index: usize) -> Vec<Ref> {
        self.fields
            .iter()
            .filter(|f| f.page_index == page_index)
            .map(|f| f.field_ref)
            .collect()
    }
}

// ── Hierarchical field naming ──

/// Whether a field path contains hierarchy (dots or brackets).
fn is_hierarchical_path(path: &str) -> bool {
    path.contains('.') || path.contains('[')
}

/// Parse a dotted/bracketed path into segments.
/// `"items[0].name"` → `["items", "0", "name"]`
fn parse_path_segments(path: &str) -> Vec<String> {
    let mut segments = Vec::new();
    let mut current = String::new();

    for ch in path.chars() {
        match ch {
            '.' => {
                if !current.is_empty() {
                    segments.push(std::mem::take(&mut current));
                }
            }
            '[' => {
                if !current.is_empty() {
                    segments.push(std::mem::take(&mut current));
                }
            }
            ']' => {
                if !current.is_empty() {
                    segments.push(std::mem::take(&mut current));
                }
            }
            _ => {
                current.push(ch);
            }
        }
    }
    if !current.is_empty() {
        segments.push(current);
    }
    segments
}

/// Intermediate tree for building hierarchical parent field dicts.
struct HierarchyNode {
    children: Vec<(String, HierarchyNode)>,
    /// Terminal widget refs at this level.
    terminal_refs: Vec<Ref>,
    /// Flat (non-hierarchical) field refs collected at root level.
    flat_refs: Vec<Ref>,
}

impl HierarchyNode {
    fn new_root() -> Self {
        Self {
            children: Vec::new(),
            terminal_refs: Vec::new(),
            flat_refs: Vec::new(),
        }
    }

    fn new() -> Self {
        Self {
            children: Vec::new(),
            terminal_refs: Vec::new(),
            flat_refs: Vec::new(),
        }
    }

    fn insert(&mut self, segments: &[String], widget_ref: Ref) {
        if segments.is_empty() {
            return;
        }
        if segments.len() == 1 {
            // Terminal: this segment is the widget's partial name
            let name = &segments[0];
            // Find or create child
            let child = self.find_or_create_child(name);
            child.terminal_refs.push(widget_ref);
            return;
        }
        // Non-terminal: descend
        let name = &segments[0];
        let child = self.find_or_create_child(name);
        child.insert(&segments[1..], widget_ref);
    }

    fn find_or_create_child(&mut self, name: &str) -> &mut HierarchyNode {
        let pos = self.children.iter().position(|(n, _)| n == name);
        match pos {
            Some(i) => &mut self.children[i].1,
            None => {
                self.children.push((name.to_string(), HierarchyNode::new()));
                let last = self.children.len() - 1;
                &mut self.children[last].1
            }
        }
    }
}

/// Recursively write non-terminal parent field dicts with `/T`, `/Kids`.
fn write_parent_field_dict(
    pdf: &mut Pdf,
    parent_ref: Ref,
    name: &str,
    node: &HierarchyNode,
    alloc: &mut i32,
) {
    // Collect kid refs: terminal widgets + child parent dicts
    let mut kid_refs: Vec<Ref> = node.terminal_refs.clone();

    for (child_name, child_node) in &node.children {
        let child_ref = alloc_ref(alloc);
        write_parent_field_dict(pdf, child_ref, child_name, child_node, alloc);
        kid_refs.push(child_ref);
    }

    // Write the parent field dict
    let mut dict = pdf.indirect(parent_ref).dict();
    dict.insert(Name(b"T")).primitive(TextStr(name));
    if !kid_refs.is_empty() {
        dict.insert(Name(b"Kids"))
            .array()
            .items(kid_refs.iter().copied());
    }
    dict.finish();
}

// ── Value display ──

/// Convert a JSON value to a display string suitable for PDF text fields.
/// Handles strings, numbers, booleans; null and complex types → empty string.
pub fn value_to_display_string(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Null => String::new(),
        // Arrays/objects: not representable as a single text field
        _ => String::new(),
    }
}

fn find_node_by_path<'a>(nodes: &'a [EvaluatedNode], path: &str) -> Option<&'a EvaluatedNode> {
    for node in nodes {
        if node.bind_path.as_deref() == Some(path) || node.id == path {
            return Some(node);
        }
        if let Some(found) = find_node_by_path(&node.children, path) {
            return Some(found);
        }
    }
    None
}

fn alloc_ref(alloc: &mut i32) -> Ref {
    let r = Ref::new(*alloc);
    *alloc += 1;
    r
}

// ── Field writers ──

/// Write a text field (single-line or multiline) as a merged Widget annotation.
fn write_text_field(
    pdf: &mut Pdf,
    info: &FieldInfo,
    page_ref: Ref,
    value: &str,
    readonly: bool,
    width: f32,
    height: f32,
    config: &PdfConfig,
    alloc: &mut i32,
    multiline: bool,
) {
    let ap_bytes = if multiline {
        appearance::build_multiline_text_appearance(value, width, height, config.field_font_size)
    } else {
        appearance::build_text_field_appearance(value, width, height, config.field_font_size)
    };
    let ap_ref = alloc_ref(alloc);

    let mut xobj = pdf.form_xobject(ap_ref, &ap_bytes);
    xobj.bbox(pdf_writer::Rect::new(0.0, 0.0, width, height));
    xobj.finish();

    let rect = &info.rect;
    let partial_name = terminal_name(&info.name);
    let mut annot = pdf.annotation(info.field_ref);
    annot.subtype(pdf_writer::types::AnnotationType::Widget);
    annot.rect(pdf_writer::Rect::new(rect[0], rect[1], rect[2], rect[3]));
    annot.page(page_ref);
    annot.insert(Name(b"FT")).primitive(Name(b"Tx"));
    annot.insert(Name(b"T")).primitive(TextStr(partial_name));
    if !value.is_empty() {
        annot.insert(Name(b"V")).primitive(TextStr(value));
    }
    let mut ff = 0_i32;
    if multiline {
        ff |= 1 << 12; // bit 13 = Multiline
    }
    if readonly {
        ff |= 1; // bit 1 = ReadOnly
    }
    if ff != 0 {
        annot.insert(Name(b"Ff")).primitive(ff);
    }
    let da = format!("/Helv {} Tf 0 0 0 rg", config.field_font_size);
    annot.insert(Name(b"DA")).primitive(Str(da.as_bytes()));
    annot.insert(Name(b"AP")).dict().pair(Name(b"N"), ap_ref);
    annot.finish();
}

/// Write a checkbox field as a merged Widget annotation.
fn write_checkbox_field(
    pdf: &mut Pdf,
    info: &FieldInfo,
    page_ref: Ref,
    checked: bool,
    readonly: bool,
    width: f32,
    height: f32,
    alloc: &mut i32,
) {
    let on_bytes = appearance::build_checkmark_appearance(width, height);
    let off_bytes = appearance::build_empty_box_appearance(width, height);
    let on_ref = alloc_ref(alloc);
    let off_ref = alloc_ref(alloc);

    let mut xobj = pdf.form_xobject(on_ref, &on_bytes);
    xobj.bbox(pdf_writer::Rect::new(0.0, 0.0, width, height));
    xobj.finish();
    let mut xobj = pdf.form_xobject(off_ref, &off_bytes);
    xobj.bbox(pdf_writer::Rect::new(0.0, 0.0, width, height));
    xobj.finish();

    let rect = &info.rect;
    let partial_name = terminal_name(&info.name);
    let mut annot = pdf.annotation(info.field_ref);
    annot.subtype(pdf_writer::types::AnnotationType::Widget);
    annot.rect(pdf_writer::Rect::new(rect[0], rect[1], rect[2], rect[3]));
    annot.page(page_ref);
    annot.insert(Name(b"FT")).primitive(Name(b"Btn"));
    annot.insert(Name(b"T")).primitive(TextStr(partial_name));
    if checked {
        annot.insert(Name(b"V")).primitive(Name(b"Yes"));
    } else {
        annot.insert(Name(b"V")).primitive(Name(b"Off"));
    }
    if readonly {
        annot.insert(Name(b"Ff")).primitive(1_i32);
    }
    let mut ap = annot.insert(Name(b"AP")).dict();
    let mut n_dict = ap.insert(Name(b"N")).dict();
    n_dict.pair(Name(b"Yes"), on_ref);
    n_dict.pair(Name(b"Off"), off_ref);
    n_dict.finish();
    ap.finish();
    annot.finish();
}

/// Write a choice (combo/list) field as a merged Widget annotation.
/// `is_combo` = true for Select/dropdown (combo box), false for list display.
fn write_choice_field(
    pdf: &mut Pdf,
    info: &FieldInfo,
    page_ref: Ref,
    value: &str,
    readonly: bool,
    width: f32,
    height: f32,
    config: &PdfConfig,
    alloc: &mut i32,
    options: &[FieldOption],
    is_combo: bool,
) {
    let ap_bytes =
        appearance::build_text_field_appearance(value, width, height, config.field_font_size);
    let ap_ref = alloc_ref(alloc);

    let mut xobj = pdf.form_xobject(ap_ref, &ap_bytes);
    xobj.bbox(pdf_writer::Rect::new(0.0, 0.0, width, height));
    xobj.finish();

    let rect = &info.rect;
    let partial_name = terminal_name(&info.name);
    let mut annot = pdf.annotation(info.field_ref);
    annot.subtype(pdf_writer::types::AnnotationType::Widget);
    annot.rect(pdf_writer::Rect::new(rect[0], rect[1], rect[2], rect[3]));
    annot.page(page_ref);
    annot.insert(Name(b"FT")).primitive(Name(b"Ch"));
    annot.insert(Name(b"T")).primitive(TextStr(partial_name));

    if !value.is_empty() {
        annot.insert(Name(b"V")).primitive(TextStr(value));
    }

    if !options.is_empty() {
        let mut opt_array = annot.insert(Name(b"Opt")).array();
        for option in options {
            let opt_value = value_to_display_string(&option.value);
            let opt_label = option.label.as_deref().unwrap_or(&opt_value);
            let mut pair = opt_array.push().array();
            pair.push().primitive(TextStr(&opt_value));
            pair.push().primitive(TextStr(opt_label));
            pair.finish();
        }
        opt_array.finish();
    }

    let mut ff = 0_i32;
    if is_combo {
        ff |= 1 << 17; // bit 18 = Combo
    }
    if readonly {
        ff |= 1; // bit 1 = ReadOnly
    }
    if ff != 0 {
        annot.insert(Name(b"Ff")).primitive(ff);
    }

    let da = format!("/Helv {} Tf 0 0 0 rg", config.field_font_size);
    annot.insert(Name(b"DA")).primitive(Str(da.as_bytes()));
    annot.insert(Name(b"AP")).dict().pair(Name(b"N"), ap_ref);
    annot.finish();
}

/// Write a radio group as a `/Btn` field with individual widget annotations per option.
///
/// PDF radio buttons use a non-terminal parent field (`/FT /Btn`) whose `/Kids` array
/// holds one widget annotation per option. Each widget has an `/AP` dict with the option's
/// export name as the "on" key and `/Off` as the off key.
fn write_radio_field(
    pdf: &mut Pdf,
    info: &FieldInfo,
    page_ref: Ref,
    selected_value: &str,
    readonly: bool,
    height: f32,
    config: &PdfConfig,
    alloc: &mut i32,
    options: &[FieldOption],
) {
    let option_count = options.len().max(1);
    // Per-option height within the allocated field rect
    let opt_h = height / option_count as f32;
    // Radio circle size
    let circle_size = opt_h.min(config.option_height).min(14.0);

    // Build shared on/off appearance streams
    let on_bytes = appearance::build_radio_on_appearance(circle_size, circle_size);
    let off_bytes = appearance::build_radio_off_appearance(circle_size, circle_size);

    // Pre-allocate widget refs for each option
    let widget_infos: Vec<(Ref, String, bool)> = options
        .iter()
        .enumerate()
        .map(|(i, opt)| {
            let widget_ref = alloc_ref(alloc);
            let export_name = format!("opt{}", i);
            let opt_value = value_to_display_string(&opt.value);
            let is_selected = opt_value == selected_value;
            (widget_ref, export_name, is_selected)
        })
        .collect();

    // Write each option as a widget annotation
    for (i, (widget_ref, export_name, is_selected)) in widget_infos.iter().enumerate() {
        let on_ref = alloc_ref(alloc);
        let off_ref = alloc_ref(alloc);

        let mut xobj = pdf.form_xobject(on_ref, &on_bytes);
        xobj.bbox(pdf_writer::Rect::new(0.0, 0.0, circle_size, circle_size));
        xobj.finish();
        let mut xobj = pdf.form_xobject(off_ref, &off_bytes);
        xobj.bbox(pdf_writer::Rect::new(0.0, 0.0, circle_size, circle_size));
        xobj.finish();

        let opt_y = info.rect[1] + (height - (i as f32 + 1.0) * opt_h);
        let mut annot = pdf.annotation(*widget_ref);
        annot.subtype(pdf_writer::types::AnnotationType::Widget);
        annot.rect(pdf_writer::Rect::new(
            info.rect[0],
            opt_y,
            info.rect[0] + circle_size,
            opt_y + circle_size,
        ));
        annot.page(page_ref);
        // Widget's parent is the group field
        annot.insert(Name(b"Parent")).primitive(info.field_ref);
        // Appearance dict: /AP << /N << /optN on_ref /Off off_ref >> >>
        let mut ap = annot.insert(Name(b"AP")).dict();
        let mut n_dict = ap.insert(Name(b"N")).dict();
        n_dict.pair(Name(export_name.as_bytes()), on_ref);
        n_dict.pair(Name(b"Off"), off_ref);
        n_dict.finish();
        ap.finish();
        // If selected, current appearance state = this option's export name
        if *is_selected {
            annot
                .insert(Name(b"AS"))
                .primitive(Name(export_name.as_bytes()));
        } else {
            annot.insert(Name(b"AS")).primitive(Name(b"Off"));
        }
        annot.finish();
    }

    // Write the parent (non-terminal) field dict at info.field_ref
    let partial_name = terminal_name(&info.name);
    let kid_refs: Vec<Ref> = widget_infos.iter().map(|(r, _, _)| *r).collect();

    // PDF spec: bit 15 = Radio (1 << 14 = 16384), bit 16 = NoToggleToOff (1 << 15 = 32768)
    let mut ff: i32 = (1 << 14) | (1 << 15); // 49152
    if readonly {
        ff |= 1; // bit 1 = ReadOnly
    }

    // Determine /V = export name of selected option, or /Off
    let selected_export = widget_infos
        .iter()
        .find(|(_, _, sel)| *sel)
        .map(|(_, name, _)| name.as_str());

    let mut dict = pdf.indirect(info.field_ref).dict();
    dict.insert(Name(b"FT")).primitive(Name(b"Btn"));
    dict.insert(Name(b"T")).primitive(TextStr(partial_name));
    dict.insert(Name(b"Ff")).primitive(ff);
    if let Some(export) = selected_export {
        dict.insert(Name(b"V")).primitive(Name(export.as_bytes()));
    } else {
        dict.insert(Name(b"V")).primitive(Name(b"Off"));
    }
    let da = format!("/Helv {} Tf 0 0 0 rg", config.field_font_size);
    dict.insert(Name(b"DA")).primitive(Str(da.as_bytes()));
    dict.insert(Name(b"Kids"))
        .array()
        .items(kid_refs.iter().copied());
    dict.finish();
}

/// Write a signature placeholder field (`/FT /Sig`, unsigned, no `/V`).
fn write_signature_field(
    pdf: &mut Pdf,
    info: &FieldInfo,
    page_ref: Ref,
    readonly: bool,
    width: f32,
    height: f32,
    alloc: &mut i32,
) {
    let ap_bytes = appearance::build_signature_placeholder_appearance(width, height);
    let ap_ref = alloc_ref(alloc);

    let mut xobj = pdf.form_xobject(ap_ref, &ap_bytes);
    xobj.bbox(pdf_writer::Rect::new(0.0, 0.0, width, height));
    xobj.finish();

    let rect = &info.rect;
    let partial_name = terminal_name(&info.name);
    let mut annot = pdf.annotation(info.field_ref);
    annot.subtype(pdf_writer::types::AnnotationType::Widget);
    annot.rect(pdf_writer::Rect::new(rect[0], rect[1], rect[2], rect[3]));
    annot.page(page_ref);
    // AnnotationFlags::PRINT = 4 (bit 3)
    annot.flags(pdf_writer::types::AnnotationFlags::PRINT);
    annot.insert(Name(b"FT")).primitive(Name(b"Sig"));
    annot.insert(Name(b"T")).primitive(TextStr(partial_name));
    // No /V — this is an unsigned placeholder
    if readonly {
        annot.insert(Name(b"Ff")).primitive(1_i32);
    }
    annot.insert(Name(b"AP")).dict().pair(Name(b"N"), ap_ref);
    annot.finish();
}

/// Extract the terminal (last) segment from a dotted/bracketed path for use as `/T`.
/// For flat paths, returns the full name. For `items[0].name`, returns `"name"`.
fn terminal_name(path: &str) -> &str {
    let segments = parse_path_segments(path);
    if segments.len() <= 1 {
        return path;
    }
    // Return the last segment — but we need to return a &str with static lifetime...
    // Since parse_path_segments allocates, we fall back to string slicing.
    if let Some(dot_pos) = path.rfind('.') {
        &path[dot_pos + 1..]
    } else {
        path
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_path_flat() {
        assert_eq!(parse_path_segments("name"), vec!["name"]);
    }

    #[test]
    fn parse_path_dotted() {
        assert_eq!(parse_path_segments("a.b.c"), vec!["a", "b", "c"]);
    }

    #[test]
    fn parse_path_bracketed() {
        assert_eq!(
            parse_path_segments("items[0].name"),
            vec!["items", "0", "name"]
        );
    }

    #[test]
    fn parse_path_nested_brackets() {
        assert_eq!(
            parse_path_segments("items[0].addresses[1].street"),
            vec!["items", "0", "addresses", "1", "street"]
        );
    }

    #[test]
    fn terminal_name_flat() {
        assert_eq!(terminal_name("name"), "name");
    }

    #[test]
    fn terminal_name_dotted() {
        assert_eq!(terminal_name("items.name"), "name");
    }

    #[test]
    fn terminal_name_complex() {
        assert_eq!(terminal_name("items[0].name"), "name");
    }
}
