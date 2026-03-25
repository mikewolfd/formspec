//! AcroForm field creation — map formspec component types to PDF interactive fields.
//!
//! Uses pdf-writer typed dict API to emit merged field+widget annotation dicts.
//! Supports hierarchical field naming for repeat group paths (e.g. `items[0].name`).
//! Integrates with TaggingContext for PDF/UA structure tree (/StructParent, /TU).

use std::collections::HashMap;

use formspec_plan::{EvaluatedNode, FieldOption};
use pdf_writer::{Filter, Finish, Name, Pdf, Ref, Str, TextStr};

use crate::appearance;
use crate::compress::zlib_compress;
use crate::layout::Rect;
use crate::options::PdfConfig;
use crate::tagged::TaggingContext;

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
    /// Pre-assigned StructParent key (assigned at render time for correct tag order).
    pub struct_parent_key: Option<i32>,
}

/// Accumulates fields for later writing to the Pdf.
pub struct AcroFormBuilder {
    pub fields: Vec<FieldInfo>,
    /// Extra annotation refs created by radio/checkbox-group writers
    /// that need to appear in page /Annots arrays. Each entry is (ref, page_index).
    extra_annot_refs: Vec<(Ref, usize)>,
}

impl AcroFormBuilder {
    pub fn new() -> Self {
        Self {
            fields: Vec::new(),
            extra_annot_refs: Vec::new(),
        }
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
            struct_parent_key: None,
        });

        self.fields.last().unwrap()
    }

    /// Build a map from terminal widget field_ref (as i32) to its immediate
    /// parent_ref for hierarchical paths. Call before `write_fields` so
    /// terminal annotations can include `/Parent`.
    pub fn build_parent_map(&self, alloc: &mut i32) -> HashMap<i32, Ref> {
        let has_hierarchy = self.fields.iter().any(|f| is_hierarchical_path(&f.name));
        if !has_hierarchy {
            return HashMap::new();
        }

        let mut root = HierarchyNode::new_root();
        for info in &self.fields {
            let segments = parse_path_segments(&info.name);
            if segments.len() > 1 {
                root.insert(&segments, info.field_ref);
            }
        }

        let mut parent_map = HashMap::new();
        collect_parent_refs(&root, None, &mut parent_map, alloc);
        parent_map
    }

    /// Write all accumulated fields into the Pdf document.
    ///
    /// For each field, registers it with the TaggingContext to create <Form> struct
    /// elements and sets /StructParent and /TU on the annotation.
    /// `parent_map` maps terminal field_ref.get() -> parent_ref for hierarchical paths.
    pub fn write_fields(
        &mut self,
        pdf: &mut Pdf,
        nodes: &[EvaluatedNode],
        page_refs: &[Ref],
        config: &PdfConfig,
        alloc: &mut i32,
        tag_ctx: &mut TaggingContext,
        parent_map: &HashMap<i32, Ref>,
    ) {
        // Collect extra widget refs to add after the loop (avoids borrow conflict).
        let mut new_extra_refs: Vec<(Ref, usize)> = Vec::new();

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

            // Build tooltip from hint (preferred) or label
            let tooltip = node
                .and_then(|n| n.field_item.as_ref())
                .and_then(|fi| fi.hint.as_deref().or(fi.label.as_deref()))
                .unwrap_or("");

            // Use pre-assigned StructParent key (set at render time for correct tag order),
            // or register with tagging context now as a fallback.
            let sect_ref = tag_ctx.default_sect_ref;
            let struct_parent_key = match info.struct_parent_key {
                Some(key) => key,
                None => tag_ctx.tag_field(info.field_ref, sect_ref, tooltip),
            };

            // Look up parent ref for hierarchical paths
            let hier_parent = parent_map.get(&info.field_ref.get()).copied();

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
                        struct_parent_key,
                        tooltip,
                        hier_parent,
                    );
                }
                "Select" | "select" | "dropdown" => {
                    let options = node
                        .and_then(|n| n.field_item.as_ref())
                        .map(|fi| &fi.options)
                        .cloned()
                        .unwrap_or_default();
                    write_choice_field(
                        pdf, info, page_ref, &value_str, is_readonly, width, height, config, alloc,
                        &options, true, struct_parent_key, tooltip, hier_parent,
                    );
                }
                "RadioGroup" | "radio" => {
                    let options = node
                        .and_then(|n| n.field_item.as_ref())
                        .map(|fi| &fi.options)
                        .cloned()
                        .unwrap_or_default();
                    let widget_refs = write_radio_field(
                        pdf,
                        info,
                        page_ref,
                        &value_str,
                        is_readonly,
                        height,
                        config,
                        alloc,
                        &options,
                        struct_parent_key,
                        tooltip,
                    );
                    for wr in widget_refs {
                        new_extra_refs.push((wr, info.page_index));
                    }
                }
                "CheckboxGroup" | "checkboxGroup" => {
                    let options = node
                        .and_then(|n| n.field_item.as_ref())
                        .map(|fi| &fi.options)
                        .cloned()
                        .unwrap_or_default();
                    let widget_refs = write_checkbox_group_field(
                        pdf,
                        info,
                        page_ref,
                        &value_str,
                        is_readonly,
                        height,
                        config,
                        alloc,
                        &options,
                        struct_parent_key,
                        tooltip,
                    );
                    for wr in widget_refs {
                        new_extra_refs.push((wr, info.page_index));
                    }
                }
                "Signature" | "signature" => {
                    write_signature_field(
                        pdf,
                        info,
                        page_ref,
                        is_readonly,
                        width,
                        height,
                        alloc,
                        struct_parent_key,
                        tooltip,
                        hier_parent,
                    );
                }
                "textArea" | "textarea" | "Textarea" => {
                    write_text_field(
                        pdf, info, page_ref, &value_str, is_readonly, width, height, config, alloc,
                        true, struct_parent_key, tooltip, hier_parent,
                    );
                }
                _ => {
                    write_text_field(
                        pdf, info, page_ref, &value_str, is_readonly, width, height, config, alloc,
                        false, struct_parent_key, tooltip, hier_parent,
                    );
                }
            }
        }

        self.extra_annot_refs.extend(new_extra_refs);
    }

    /// Get the top-level field refs for the `/AcroForm /Fields` array.
    /// For hierarchical paths (containing `.` or `[`), builds parent field
    /// dicts and returns only root-level refs.
    pub fn field_refs_hierarchical(&self, pdf: &mut Pdf, alloc: &mut i32) -> Vec<Ref> {
        let has_hierarchy = self.fields.iter().any(|f| is_hierarchical_path(&f.name));

        if !has_hierarchy {
            return self.fields.iter().map(|f| f.field_ref).collect();
        }

        let mut root = HierarchyNode::new_root();

        for info in &self.fields {
            let segments = parse_path_segments(&info.name);
            if segments.len() <= 1 {
                root.flat_refs.push(info.field_ref);
            } else {
                root.insert(&segments, info.field_ref);
            }
        }

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
        let mut refs: Vec<Ref> = self
            .fields
            .iter()
            .filter(|f| f.page_index == page_index)
            .map(|f| f.field_ref)
            .collect();
        refs.extend(
            self.extra_annot_refs
                .iter()
                .filter(|(_, pi)| *pi == page_index)
                .map(|(r, _)| *r),
        );
        refs
    }
}

// ── Hierarchical field naming ──

fn is_hierarchical_path(path: &str) -> bool {
    path.contains('.') || path.contains('[')
}

/// Parse a dotted/bracketed path into segments.
/// `"items[0].name"` -> `["items", "0", "name"]`
fn parse_path_segments(path: &str) -> Vec<String> {
    let mut segments = Vec::new();
    let mut current = String::new();

    for ch in path.chars() {
        match ch {
            '.' | '[' | ']' => {
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

struct HierarchyNode {
    children: Vec<(String, HierarchyNode)>,
    terminal_refs: Vec<Ref>,
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
            let name = &segments[0];
            let child = self.find_or_create_child(name);
            child.terminal_refs.push(widget_ref);
            return;
        }
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

/// Recursively collect terminal field_ref -> parent_ref mappings,
/// pre-allocating parent refs for each non-terminal node.
fn collect_parent_refs(
    node: &HierarchyNode,
    parent_ref: Option<Ref>,
    map: &mut HashMap<i32, Ref>,
    alloc: &mut i32,
) {
    if let Some(pref) = parent_ref {
        for tref in &node.terminal_refs {
            map.insert(tref.get(), pref);
        }
    }
    for (_name, child) in &node.children {
        let child_ref = alloc_ref(alloc);
        collect_parent_refs(child, Some(child_ref), map, alloc);
    }
}

fn write_parent_field_dict(
    pdf: &mut Pdf,
    parent_ref: Ref,
    name: &str,
    node: &HierarchyNode,
    alloc: &mut i32,
) {
    let mut kid_refs: Vec<Ref> = node.terminal_refs.clone();

    for (child_name, child_node) in &node.children {
        let child_ref = alloc_ref(alloc);
        write_parent_field_dict(pdf, child_ref, child_name, child_node, alloc);
        kid_refs.push(child_ref);
    }

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
pub fn value_to_display_string(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Null => String::new(),
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

fn write_compressed_xobject(
    pdf: &mut Pdf,
    xobj_ref: Ref,
    ap_bytes: &[u8],
    width: f32,
    height: f32,
) {
    let result = zlib_compress(ap_bytes);
    let mut xobj = pdf.form_xobject(xobj_ref, result.as_bytes());
    xobj.bbox(pdf_writer::Rect::new(0.0, 0.0, width, height));
    if result.is_compressed() {
        xobj.filter(Filter::FlateDecode);
    }
    xobj.finish();
}

fn write_tagging_attrs(
    annot: &mut pdf_writer::writers::Annotation<'_>,
    struct_parent_key: i32,
    tooltip: &str,
) {
    annot.struct_parent(struct_parent_key);
    if !tooltip.is_empty() {
        annot.insert(Name(b"TU")).primitive(TextStr(tooltip));
    }
}

fn write_parent_attr(annot: &mut pdf_writer::writers::Annotation<'_>, parent_ref: Option<Ref>) {
    if let Some(pref) = parent_ref {
        annot.insert(Name(b"Parent")).primitive(pref);
    }
}

// ── Field writers ──

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
    struct_parent_key: i32,
    tooltip: &str,
    hier_parent: Option<Ref>,
) {
    let ap_bytes = if multiline {
        appearance::build_multiline_text_appearance(value, width, height, config.field_font_size)
    } else {
        appearance::build_text_field_appearance(value, width, height, config.field_font_size)
    };
    let ap_ref = alloc_ref(alloc);
    write_compressed_xobject(pdf, ap_ref, &ap_bytes, width, height);

    let rect = &info.rect;
    let partial_name = terminal_name(&info.name);
    let mut annot = pdf.annotation(info.field_ref);
    annot.subtype(pdf_writer::types::AnnotationType::Widget);
    annot.rect(pdf_writer::Rect::new(rect[0], rect[1], rect[2], rect[3]));
    annot.page(page_ref);
    annot.flags(pdf_writer::types::AnnotationFlags::PRINT);
    write_tagging_attrs(&mut annot, struct_parent_key, tooltip);
    write_parent_attr(&mut annot, hier_parent);
    annot.insert(Name(b"FT")).primitive(Name(b"Tx"));
    annot.insert(Name(b"T")).primitive(TextStr(partial_name));
    if !value.is_empty() {
        annot.insert(Name(b"V")).primitive(TextStr(value));
    }
    let mut ff = 0_i32;
    if multiline {
        ff |= 1 << 12;
    }
    if readonly {
        ff |= 1;
    }
    if ff != 0 {
        annot.insert(Name(b"Ff")).primitive(ff);
    }
    let da = format!("/Helv {} Tf 0 0 0 rg", config.field_font_size);
    annot.insert(Name(b"DA")).primitive(Str(da.as_bytes()));
    annot.insert(Name(b"AP")).dict().pair(Name(b"N"), ap_ref);
    annot.finish();
}

fn write_checkbox_field(
    pdf: &mut Pdf,
    info: &FieldInfo,
    page_ref: Ref,
    checked: bool,
    readonly: bool,
    width: f32,
    height: f32,
    alloc: &mut i32,
    struct_parent_key: i32,
    tooltip: &str,
    hier_parent: Option<Ref>,
) {
    let on_bytes = appearance::build_checkmark_appearance(width, height);
    let off_bytes = appearance::build_empty_box_appearance(width, height);
    let on_ref = alloc_ref(alloc);
    let off_ref = alloc_ref(alloc);
    write_compressed_xobject(pdf, on_ref, &on_bytes, width, height);
    write_compressed_xobject(pdf, off_ref, &off_bytes, width, height);

    let rect = &info.rect;
    let partial_name = terminal_name(&info.name);
    let mut annot = pdf.annotation(info.field_ref);
    annot.subtype(pdf_writer::types::AnnotationType::Widget);
    annot.rect(pdf_writer::Rect::new(rect[0], rect[1], rect[2], rect[3]));
    annot.page(page_ref);
    annot.flags(pdf_writer::types::AnnotationFlags::PRINT);
    write_tagging_attrs(&mut annot, struct_parent_key, tooltip);
    write_parent_attr(&mut annot, hier_parent);
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
    struct_parent_key: i32,
    tooltip: &str,
    hier_parent: Option<Ref>,
) {
    let ap_bytes =
        appearance::build_text_field_appearance(value, width, height, config.field_font_size);
    let ap_ref = alloc_ref(alloc);
    write_compressed_xobject(pdf, ap_ref, &ap_bytes, width, height);

    let rect = &info.rect;
    let partial_name = terminal_name(&info.name);
    let mut annot = pdf.annotation(info.field_ref);
    annot.subtype(pdf_writer::types::AnnotationType::Widget);
    annot.rect(pdf_writer::Rect::new(rect[0], rect[1], rect[2], rect[3]));
    annot.page(page_ref);
    annot.flags(pdf_writer::types::AnnotationFlags::PRINT);
    write_tagging_attrs(&mut annot, struct_parent_key, tooltip);
    write_parent_attr(&mut annot, hier_parent);
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
        ff |= 1 << 17;
    }
    if readonly {
        ff |= 1;
    }
    if ff != 0 {
        annot.insert(Name(b"Ff")).primitive(ff);
    }

    let da = format!("/Helv {} Tf 0 0 0 rg", config.field_font_size);
    annot.insert(Name(b"DA")).primitive(Str(da.as_bytes()));
    annot.insert(Name(b"AP")).dict().pair(Name(b"N"), ap_ref);
    annot.finish();
}

/// Returns the per-option widget refs (for page /Annots tracking).
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
    struct_parent_key: i32,
    tooltip: &str,
) -> Vec<Ref> {
    let option_count = options.len().max(1);
    let opt_h = height / option_count as f32;
    let circle_size = opt_h.min(config.option_height).min(14.0);

    let on_bytes = appearance::build_radio_on_appearance(circle_size, circle_size);
    let off_bytes = appearance::build_radio_off_appearance(circle_size, circle_size);

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

    for (i, (widget_ref, export_name, is_selected)) in widget_infos.iter().enumerate() {
        let on_ref = alloc_ref(alloc);
        let off_ref = alloc_ref(alloc);
        write_compressed_xobject(pdf, on_ref, &on_bytes, circle_size, circle_size);
        write_compressed_xobject(pdf, off_ref, &off_bytes, circle_size, circle_size);

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
        annot.flags(pdf_writer::types::AnnotationFlags::PRINT);
        annot.insert(Name(b"Parent")).primitive(info.field_ref);
        let mut ap = annot.insert(Name(b"AP")).dict();
        let mut n_dict = ap.insert(Name(b"N")).dict();
        n_dict.pair(Name(export_name.as_bytes()), on_ref);
        n_dict.pair(Name(b"Off"), off_ref);
        n_dict.finish();
        ap.finish();
        if *is_selected {
            annot
                .insert(Name(b"AS"))
                .primitive(Name(export_name.as_bytes()));
        } else {
            annot.insert(Name(b"AS")).primitive(Name(b"Off"));
        }
        annot.finish();
    }

    let partial_name = terminal_name(&info.name);
    let kid_refs: Vec<Ref> = widget_infos.iter().map(|(r, _, _)| *r).collect();

    let mut ff: i32 = (1 << 14) | (1 << 15); // Radio + NoToggleToOff = 49152
    if readonly {
        ff |= 1;
    }

    let selected_export = widget_infos
        .iter()
        .find(|(_, _, sel)| *sel)
        .map(|(_, name, _)| name.as_str());

    let mut dict = pdf.indirect(info.field_ref).dict();
    dict.insert(Name(b"FT")).primitive(Name(b"Btn"));
    dict.insert(Name(b"T")).primitive(TextStr(partial_name));
    dict.insert(Name(b"Ff")).primitive(ff);
    dict.pair(Name(b"StructParent"), struct_parent_key);
    if !tooltip.is_empty() {
        dict.insert(Name(b"TU")).primitive(TextStr(tooltip));
    }
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

    kid_refs
}

/// Write a checkbox group as independent checkboxes (multi-select).
/// Returns the per-option widget refs (for page /Annots tracking).
fn write_checkbox_group_field(
    pdf: &mut Pdf,
    info: &FieldInfo,
    page_ref: Ref,
    selected_value: &str,
    readonly: bool,
    height: f32,
    config: &PdfConfig,
    alloc: &mut i32,
    options: &[FieldOption],
    struct_parent_key: i32,
    tooltip: &str,
) -> Vec<Ref> {
    let option_count = options.len().max(1);
    let opt_h = height / option_count as f32;
    let box_size = opt_h.min(config.option_height).min(14.0);

    let on_bytes = appearance::build_checkmark_appearance(box_size, box_size);
    let off_bytes = appearance::build_empty_box_appearance(box_size, box_size);

    let selected_set: Vec<&str> = selected_value.split(',').map(|s| s.trim()).collect();

    let mut widget_refs = Vec::new();

    for (i, opt) in options.iter().enumerate() {
        let widget_ref = alloc_ref(alloc);
        widget_refs.push(widget_ref);

        let on_ref = alloc_ref(alloc);
        let off_ref = alloc_ref(alloc);
        write_compressed_xobject(pdf, on_ref, &on_bytes, box_size, box_size);
        write_compressed_xobject(pdf, off_ref, &off_bytes, box_size, box_size);

        let opt_value = value_to_display_string(&opt.value);
        let is_checked = selected_set.contains(&opt_value.as_str());
        let opt_y = info.rect[1] + (height - (i as f32 + 1.0) * opt_h);

        let mut annot = pdf.annotation(widget_ref);
        annot.subtype(pdf_writer::types::AnnotationType::Widget);
        annot.rect(pdf_writer::Rect::new(
            info.rect[0],
            opt_y,
            info.rect[0] + box_size,
            opt_y + box_size,
        ));
        annot.page(page_ref);
        annot.flags(pdf_writer::types::AnnotationFlags::PRINT);
        annot.insert(Name(b"FT")).primitive(Name(b"Btn"));
        annot
            .insert(Name(b"T"))
            .primitive(TextStr(&opt_value));
        if is_checked {
            annot.insert(Name(b"V")).primitive(Name(b"Yes"));
        } else {
            annot.insert(Name(b"V")).primitive(Name(b"Off"));
        }
        let mut ff = 0_i32;
        if readonly {
            ff |= 1;
        }
        if ff != 0 {
            annot.insert(Name(b"Ff")).primitive(ff);
        }
        let mut ap = annot.insert(Name(b"AP")).dict();
        let mut n_dict = ap.insert(Name(b"N")).dict();
        n_dict.pair(Name(b"Yes"), on_ref);
        n_dict.pair(Name(b"Off"), off_ref);
        n_dict.finish();
        ap.finish();
        if is_checked {
            annot.insert(Name(b"AS")).primitive(Name(b"Yes"));
        } else {
            annot.insert(Name(b"AS")).primitive(Name(b"Off"));
        }
        annot.finish();
    }

    let partial_name = terminal_name(&info.name);
    let mut dict = pdf.indirect(info.field_ref).dict();
    dict.insert(Name(b"T")).primitive(TextStr(partial_name));
    dict.pair(Name(b"StructParent"), struct_parent_key);
    if !tooltip.is_empty() {
        dict.insert(Name(b"TU")).primitive(TextStr(tooltip));
    }
    dict.insert(Name(b"Kids"))
        .array()
        .items(widget_refs.iter().copied());
    dict.finish();

    widget_refs
}

fn write_signature_field(
    pdf: &mut Pdf,
    info: &FieldInfo,
    page_ref: Ref,
    readonly: bool,
    width: f32,
    height: f32,
    alloc: &mut i32,
    struct_parent_key: i32,
    tooltip: &str,
    hier_parent: Option<Ref>,
) {
    let ap_bytes = appearance::build_signature_placeholder_appearance(width, height);
    let ap_ref = alloc_ref(alloc);
    write_compressed_xobject(pdf, ap_ref, &ap_bytes, width, height);

    let rect = &info.rect;
    let partial_name = terminal_name(&info.name);
    let mut annot = pdf.annotation(info.field_ref);
    annot.subtype(pdf_writer::types::AnnotationType::Widget);
    annot.rect(pdf_writer::Rect::new(rect[0], rect[1], rect[2], rect[3]));
    annot.page(page_ref);
    annot.flags(pdf_writer::types::AnnotationFlags::PRINT);
    write_tagging_attrs(&mut annot, struct_parent_key, tooltip);
    write_parent_attr(&mut annot, hier_parent);
    annot.insert(Name(b"FT")).primitive(Name(b"Sig"));
    annot.insert(Name(b"T")).primitive(TextStr(partial_name));
    if readonly {
        annot.insert(Name(b"Ff")).primitive(1_i32);
    }
    annot.insert(Name(b"AP")).dict().pair(Name(b"N"), ap_ref);
    annot.finish();
}

fn terminal_name(path: &str) -> &str {
    let segments = parse_path_segments(path);
    if segments.len() <= 1 {
        return path;
    }
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
