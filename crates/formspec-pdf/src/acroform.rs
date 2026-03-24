//! AcroForm field creation — map formspec component types to PDF interactive fields.

use pdf_writer::{Finish, Name, Pdf, Ref, Str, TextStr};
use formspec_plan::EvaluatedNode;

use crate::appearance;
use crate::layout::Rect;
use crate::options::PdfConfig;

/// Information about a single AcroForm field placed on a page.
pub struct FieldInfo {
    /// Reference to the field/widget object.
    pub field_ref: Ref,
    /// Fully qualified field name.
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
        Self {
            fields: Vec::new(),
        }
    }

    /// Record a field to be written later. Returns the FieldInfo.
    pub fn add_field(
        &mut self,
        node: &EvaluatedNode,
        field_ref: Ref,
        rect: &Rect,
        page_index: usize,
    ) -> &FieldInfo {
        let name = node
            .bind_path
            .clone()
            .unwrap_or_else(|| node.id.clone());

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
    ///
    /// `nodes` — the flat list of evaluated nodes for looking up field data.
    /// `page_refs` — refs of each page, indexed by page_index.
    /// `alloc` — mutable ref counter for allocating new Refs.
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
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let is_readonly = node.map(|n| n.readonly).unwrap_or(false);

            match comp {
                "checkbox" | "toggle" => {
                    let checked = node
                        .and_then(|n| n.value.as_ref())
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);
                    write_checkbox(
                        pdf, info.field_ref, page_ref, &info.name, &info.rect,
                        checked, is_readonly, width, height, alloc,
                    );
                }
                "textArea" | "textarea" => {
                    write_multiline_text(
                        pdf, info.field_ref, page_ref, &info.name, &info.rect,
                        value_str, is_readonly, width, height, config, alloc,
                    );
                }
                _ => {
                    write_text_field(
                        pdf, info.field_ref, page_ref, &info.name, &info.rect,
                        value_str, is_readonly, width, height, config, alloc,
                    );
                }
            }
        }
    }

    /// Get all field refs (for /AcroForm /Fields array).
    pub fn field_refs(&self) -> Vec<Ref> {
        self.fields.iter().map(|f| f.field_ref).collect()
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

fn write_text_field(
    pdf: &mut Pdf,
    field_ref: Ref,
    page_ref: Ref,
    name: &str,
    rect: &[f32; 4],
    value: &str,
    readonly: bool,
    width: f32,
    height: f32,
    config: &PdfConfig,
    alloc: &mut i32,
) {
    let ap_bytes = appearance::build_text_field_appearance(
        value, width, height, config.field_font_size,
    );
    let ap_ref = alloc_ref(alloc);

    // Write appearance XObject
    let mut xobj = pdf.form_xobject(ap_ref, &ap_bytes);
    xobj.bbox(pdf_writer::Rect::new(0.0, 0.0, width, height));
    xobj.finish();

    // Write the field as a combined field+widget annotation dict
    let mut annot = pdf.indirect(field_ref).start::<pdf_writer::writers::Annotation>();
    annot.subtype(pdf_writer::types::AnnotationType::Widget);
    annot.rect(pdf_writer::Rect::new(rect[0], rect[1], rect[2], rect[3]));
    annot.page(page_ref);
    annot.insert(Name(b"FT")).name(Name(b"Tx"));
    annot.insert(Name(b"T")).text_str(TextStr(name));
    if !value.is_empty() {
        annot.insert(Name(b"V")).text_str(TextStr(value));
    }
    if readonly {
        annot.insert(Name(b"Ff")).primitive(1_i32); // ReadOnly flag
    }
    let da = format!("/Helv {} Tf 0 0 0 rg", config.field_font_size);
    annot.insert(Name(b"DA")).primitive(Str(da.as_bytes()));
    annot.insert(Name(b"AP")).dict().pair(Name(b"N"), ap_ref);
    annot.finish();
}

fn write_multiline_text(
    pdf: &mut Pdf,
    field_ref: Ref,
    page_ref: Ref,
    name: &str,
    rect: &[f32; 4],
    value: &str,
    readonly: bool,
    width: f32,
    height: f32,
    config: &PdfConfig,
    alloc: &mut i32,
) {
    let ap_bytes = appearance::build_multiline_text_appearance(
        value, width, height, config.field_font_size,
    );
    let ap_ref = alloc_ref(alloc);

    let mut xobj = pdf.form_xobject(ap_ref, &ap_bytes);
    xobj.bbox(pdf_writer::Rect::new(0.0, 0.0, width, height));
    xobj.finish();

    let mut annot = pdf.indirect(field_ref).start::<pdf_writer::writers::Annotation>();
    annot.subtype(pdf_writer::types::AnnotationType::Widget);
    annot.rect(pdf_writer::Rect::new(rect[0], rect[1], rect[2], rect[3]));
    annot.page(page_ref);
    annot.insert(Name(b"FT")).name(Name(b"Tx"));
    annot.insert(Name(b"T")).text_str(TextStr(name));
    if !value.is_empty() {
        annot.insert(Name(b"V")).text_str(TextStr(value));
    }
    // Ff: Multiline (bit 13 = 4096) + optional ReadOnly (bit 1 = 1)
    let ff = 4096 | if readonly { 1 } else { 0 };
    annot.insert(Name(b"Ff")).primitive(ff as i32);
    let da = format!("/Helv {} Tf 0 0 0 rg", config.field_font_size);
    annot.insert(Name(b"DA")).primitive(Str(da.as_bytes()));
    annot.insert(Name(b"AP")).dict().pair(Name(b"N"), ap_ref);
    annot.finish();
}

fn write_checkbox(
    pdf: &mut Pdf,
    field_ref: Ref,
    page_ref: Ref,
    name: &str,
    rect: &[f32; 4],
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

    let mut annot = pdf.indirect(field_ref).start::<pdf_writer::writers::Annotation>();
    annot.subtype(pdf_writer::types::AnnotationType::Widget);
    annot.rect(pdf_writer::Rect::new(rect[0], rect[1], rect[2], rect[3]));
    annot.page(page_ref);
    annot.insert(Name(b"FT")).name(Name(b"Btn"));
    annot.insert(Name(b"T")).text_str(TextStr(name));
    if checked {
        annot.insert(Name(b"V")).name(Name(b"Yes"));
    } else {
        annot.insert(Name(b"V")).name(Name(b"Off"));
    }
    if readonly {
        annot.insert(Name(b"Ff")).primitive(1_i32);
    }
    // AP dict with N sub-dict mapping Yes and Off
    let mut ap = annot.insert(Name(b"AP")).dict();
    let mut n_dict = ap.insert(Name(b"N")).dict();
    n_dict.pair(Name(b"Yes"), on_ref);
    n_dict.pair(Name(b"Off"), off_ref);
    n_dict.finish();
    ap.finish();
    annot.finish();
}
