//! Main PDF rendering pipeline — wires measurement, pagination, layout, AcroForm, and tagging.

use pdf_writer::types::TabOrder;
use pdf_writer::{Content, Filter, Finish, Name, Pdf, Ref, Str, TextStr};

use formspec_plan::{EvaluatedNode, NodeCategory};

use crate::acroform::AcroFormBuilder;
use crate::compress::zlib_compress;
use crate::fonts::{self, HELVETICA_BOLD_WIDTHS, HELVETICA_WIDTHS};
use crate::layout;
use crate::options::PdfConfig;
use crate::paginate::PageItem;
use crate::tagged::TaggingContext;

/// Render a complete PDF document from paginated content.
pub fn render_document(
    pages: &[Vec<PageItem>],
    nodes: &[EvaluatedNode],
    config: &PdfConfig,
) -> Vec<u8> {
    let mut pdf = Pdf::new();

    // Reserve refs: catalog, page tree, font resources, acroform
    let catalog_ref = Ref::new(1);
    let page_tree_ref = Ref::new(2);
    let helvetica_ref = Ref::new(3);
    let helvetica_bold_ref = Ref::new(4);
    let zapf_ref = Ref::new(5);
    let acroform_ref = Ref::new(6);
    let mut next_ref = 7i32;

    // Pre-allocate page refs
    let page_count = pages.len().max(1);
    let page_refs: Vec<Ref> = (0..page_count)
        .map(|_| {
            let r = Ref::new(next_ref);
            next_ref += 1;
            r
        })
        .collect();
    let content_refs: Vec<Ref> = (0..page_count)
        .map(|_| {
            let r = Ref::new(next_ref);
            next_ref += 1;
            r
        })
        .collect();

    // Page tree (written first; catalog is deferred until we know field refs)
    let mut page_tree = pdf.pages(page_tree_ref);
    page_tree.count(page_count as i32);
    page_tree.kids(page_refs.iter().copied());
    // Set up default font resources on the page tree
    page_tree
        .resources()
        .fonts()
        .pair(Name(b"Helv"), helvetica_ref)
        .pair(Name(b"HeBo"), helvetica_bold_ref)
        .pair(Name(b"ZaDb"), zapf_ref);
    page_tree.finish();

    // Standard 14 font dictionaries (Type1, no embedding needed)
    write_standard_font(&mut pdf, helvetica_ref, "Helvetica");
    write_standard_font(&mut pdf, helvetica_bold_ref, "Helvetica-Bold");
    write_standard_font(&mut pdf, zapf_ref, "ZapfDingbats");

    // Tagging context — start refs well above the page/content ref range
    // to avoid collisions with AcroForm field refs allocated during rendering.
    let mut tag_ctx = TaggingContext::new(Ref::new(next_ref + 50000));

    // Offset annotation StructParent keys so they don't collide with
    // page entries (0..page_count-1) in the ParentTree.
    tag_ctx.set_annotation_key_offset(page_count);

    // Render each page
    let mut acroform = AcroFormBuilder::new();

    // Phase 1: Generate content streams and register fields (but don't write pages yet,
    // because radio/checkbox-group widget refs aren't known until write_fields).
    let mut page_content_bytes: Vec<Vec<u8>> = Vec::new();

    if pages.is_empty() {
        let content = Content::new();
        page_content_bytes.push(content.finish().into_vec());
    } else {
        for (page_idx, page_items) in pages.iter().enumerate() {
            if page_idx > 0 {
                tag_ctx.new_page();
            }

            let content_bytes = render_page_content(
                page_items,
                nodes,
                config,
                page_idx,
                &mut acroform,
                &page_refs,
                &mut next_ref,
                &mut tag_ctx,
            );
            page_content_bytes.push(content_bytes);
        }
    }

    // Phase 2: Build parent map and write field annotations (populates extra_annot_refs).
    let parent_map = acroform.build_parent_map(&mut next_ref);
    acroform.write_fields(
        &mut pdf,
        nodes,
        &page_refs,
        config,
        &mut next_ref,
        &mut tag_ctx,
        &parent_map,
    );

    // Phase 3: Write page objects (now annot_refs_for_page includes radio widget refs).
    for (page_idx, content_bytes) in page_content_bytes.iter().enumerate() {
        let annot_refs = acroform.annot_refs_for_page(page_idx);
        let has_widgets = !annot_refs.is_empty();
        let has_tags = page_idx < tag_ctx.page_mcid_maps().len()
            && !tag_ctx.page_mcid_maps()[page_idx].is_empty();
        write_page(
            &mut pdf,
            page_refs[page_idx],
            page_tree_ref,
            content_refs[page_idx],
            content_bytes,
            config,
            &annot_refs,
            has_widgets,
            has_tags,
            page_idx as i32,
        );
    }

    // Write AcroForm dictionary if there are interactive fields.
    // Use hierarchical refs to build proper /Parent chains for repeat group paths.
    let field_refs = acroform.field_refs_hierarchical(&mut pdf, &mut next_ref);
    if !field_refs.is_empty() {
        let mut acroform_dict = pdf.indirect(acroform_ref).dict();
        acroform_dict
            .insert(Name(b"Fields"))
            .array()
            .items(field_refs.iter().copied());
        // Default appearance for fields without their own /DA
        let da = format!("/Helv {} Tf 0 0 0 rg", config.field_font_size);
        acroform_dict
            .insert(Name(b"DA"))
            .primitive(Str(da.as_bytes()));
        // /DR (default resources) — reference the same fonts as pages
        let mut dr = acroform_dict.insert(Name(b"DR")).dict();
        dr.insert(Name(b"Font"))
            .dict()
            .pair(Name(b"Helv"), helvetica_ref)
            .pair(Name(b"HeBo"), helvetica_bold_ref)
            .pair(Name(b"ZaDb"), zapf_ref);
        dr.finish();
        acroform_dict.finish();
    }

    // Write the structure tree
    let struct_tree_ref = tag_ctx.write_structure_tree(&mut pdf, &page_refs, page_count);

    // Document catalog (written last so we know whether to include /AcroForm)
    let mut catalog = pdf.catalog(catalog_ref);
    catalog.pages(page_tree_ref);
    catalog
        .insert(Name(b"MarkInfo"))
        .dict()
        .pair(Name(b"Marked"), true);
    catalog
        .insert(Name(b"Lang"))
        .primitive(TextStr(&config.language));
    if !field_refs.is_empty() {
        catalog.insert(Name(b"AcroForm")).primitive(acroform_ref);
    }
    catalog
        .insert(Name(b"StructTreeRoot"))
        .primitive(struct_tree_ref);
    catalog.finish();

    pdf.finish()
}

/// Write a Standard 14 font dictionary.
fn write_standard_font(pdf: &mut Pdf, font_ref: Ref, name: &str) {
    let mut font = pdf.type1_font(font_ref);
    font.base_font(Name(name.as_bytes()));
    font.finish();
}

/// Write a single page object.
fn write_page(
    pdf: &mut Pdf,
    page_ref: Ref,
    page_tree_ref: Ref,
    content_ref: Ref,
    content_bytes: &[u8],
    config: &PdfConfig,
    annot_refs: &[Ref],
    has_widgets: bool,
    has_tags: bool,
    struct_parents_key: i32,
) {
    let media_box = pdf_writer::Rect::new(0.0, 0.0, config.page_width, config.page_height);

    let mut page = pdf.page(page_ref);
    page.parent(page_tree_ref);
    page.media_box(media_box);
    page.contents(content_ref);
    if !annot_refs.is_empty() {
        page.annotations(annot_refs.iter().copied());
    }
    // PDF/UA: /Tabs /S on pages with widget annotations
    if has_widgets {
        page.tab_order(TabOrder::StructureOrder);
    }
    // PDF/UA: /StructParents on pages with tagged content
    if has_tags || has_widgets {
        page.struct_parents(struct_parents_key);
    }
    page.finish();

    // Write content stream with compression
    let result = zlib_compress(content_bytes);
    let mut stream = pdf.stream(content_ref, result.as_bytes());
    if result.is_compressed() {
        stream.filter(Filter::FlateDecode);
    }
    stream.finish();
}

/// Render the content stream for a single page.
fn render_page_content(
    page_items: &[PageItem],
    nodes: &[EvaluatedNode],
    config: &PdfConfig,
    page_idx: usize,
    acroform: &mut AcroFormBuilder,
    page_refs: &[Ref],
    alloc: &mut i32,
    tag_ctx: &mut TaggingContext,
) -> Vec<u8> {
    let mut content = Content::new();

    // Header (artifact with Pagination type)
    if let Some(ref header) = config.header_text {
        render_header(&mut content, header, config);
    }

    // Footer (artifact with Pagination type)
    if let Some(ref footer) = config.footer_text {
        render_footer(&mut content, footer, config, page_idx + 1);
    }

    // Content area — render each item
    for item in page_items {
        if item.node_index < nodes.len() {
            render_node(
                &mut content,
                &nodes[item.node_index],
                item.y_offset,
                config.content_width,
                config,
                acroform,
                page_idx,
                page_refs,
                alloc,
                tag_ctx,
            );
        }
    }

    content.finish().into_vec()
}

/// Render a header as a PDF artifact (not part of structure tree).
/// Uses /Type /Pagination artifact properties per PDF/UA.
fn render_header(content: &mut Content, text: &str, config: &PdfConfig) {
    let y = config.page_height - config.margin_top + 8.0;
    content.save_state();
    content
        .begin_marked_content_with_properties(Name(b"Artifact"))
        .properties()
        .pair(Name(b"Type"), Name(b"Pagination"))
        .pair(Name(b"Subtype"), Name(b"Header"));
    content.begin_text();
    content.set_font(Name(b"HeBo"), 9.0);
    content.set_fill_rgb(0.3, 0.3, 0.3);
    content.set_text_matrix([1.0, 0.0, 0.0, 1.0, config.margin_left, y]);
    content.show(Str(text.as_bytes()));
    content.end_text();
    content.end_marked_content();
    content.restore_state();
}

/// Render a footer as a PDF artifact with Pagination type.
fn render_footer(content: &mut Content, text: &str, config: &PdfConfig, page_num: usize) {
    let y = config.margin_bottom - 16.0;
    let footer_text = text.replace("{page}", &page_num.to_string());

    content.save_state();
    content
        .begin_marked_content_with_properties(Name(b"Artifact"))
        .properties()
        .pair(Name(b"Type"), Name(b"Pagination"))
        .pair(Name(b"Subtype"), Name(b"Footer"));
    content.begin_text();
    content.set_font(Name(b"Helv"), 8.0);
    content.set_fill_rgb(0.4, 0.4, 0.4);
    content.set_text_matrix([1.0, 0.0, 0.0, 1.0, config.margin_left, y]);
    content.show(Str(footer_text.as_bytes()));
    content.end_text();
    content.end_marked_content();
    content.restore_state();
}

/// Render a single EvaluatedNode at the given y_offset.
fn render_node(
    content: &mut Content,
    node: &EvaluatedNode,
    y_offset: f32,
    available_width: f32,
    config: &PdfConfig,
    acroform: &mut AcroFormBuilder,
    page_idx: usize,
    page_refs: &[Ref],
    alloc: &mut i32,
    tag_ctx: &mut TaggingContext,
) {
    if !node.relevant {
        return;
    }

    match node.category {
        NodeCategory::Field => {
            render_field_node(
                content,
                node,
                y_offset,
                available_width,
                config,
                acroform,
                page_idx,
                alloc,
                tag_ctx,
            );
        }
        NodeCategory::Layout => {
            render_layout_node(
                content,
                node,
                y_offset,
                available_width,
                config,
                acroform,
                page_idx,
                page_refs,
                alloc,
                tag_ctx,
            );
        }
        NodeCategory::Display => {
            render_display_node(content, node, y_offset, available_width, config);
        }
        NodeCategory::Interactive | NodeCategory::Special => {
            // FileUpload renders as a static placeholder — no AcroForm field
            if node.component == "FileUpload" {
                render_file_upload_placeholder(content, node, y_offset, available_width, config);
            } else {
                render_display_node(content, node, y_offset, available_width, config);
            }
        }
    }
}

/// Render a field node — label + AcroForm field registration + hint.
fn render_field_node(
    content: &mut Content,
    node: &EvaluatedNode,
    y_offset: f32,
    available_width: f32,
    config: &PdfConfig,
    acroform: &mut AcroFormBuilder,
    page_idx: usize,
    alloc: &mut i32,
    tag_ctx: &mut TaggingContext,
) {
    let mut cursor_y = y_offset;
    let x = config.margin_left + node.col_start as f32 * (available_width / 12.0);

    // Render label
    let label = node
        .field_item
        .as_ref()
        .and_then(|fi| fi.label.as_deref())
        .unwrap_or("");

    if !label.is_empty() {
        // Tag the label with a <P> struct element via marked content
        let mcid = tag_ctx.tag_label(tag_ctx.default_sect_ref);
        let pdf_y = layout::content_y_to_pdf_y(cursor_y + config.label_font_size, config);
        content.save_state();
        content
            .begin_marked_content_with_properties(Name(b"P"))
            .properties()
            .identify(mcid);
        content.begin_text();
        content.set_font(Name(b"Helv"), config.label_font_size);
        content.set_fill_rgb(0.2, 0.2, 0.2);
        content.set_text_matrix([1.0, 0.0, 0.0, 1.0, x, pdf_y]);
        content.show(Str(label.as_bytes()));
        content.end_text();
        content.end_marked_content();
        content.restore_state();

        cursor_y += fonts::text_height(
            label,
            &HELVETICA_WIDTHS,
            config.label_font_size,
            available_width,
        ) + 2.0;
    }

    // Determine field height by component type
    let comp = node.component.as_str();
    let field_h = match comp {
        "textArea" | "textarea" => config.textarea_height,
        _ => config.field_height,
    };

    // Register AcroForm field
    let field_ref = Ref::new(*alloc);
    *alloc += 1;

    let rect = crate::layout::Rect {
        x,
        y: layout::content_y_to_pdf_y(cursor_y + field_h, config),
        width: available_width,
        height: field_h,
    };
    acroform.add_field(node, field_ref, &rect, page_idx);

    // Tag the field immediately after the label so structure tree order is interleaved
    // (label, field, label, field) rather than grouped (all labels, then all fields).
    let tooltip = node
        .field_item
        .as_ref()
        .and_then(|fi| fi.hint.as_deref().or(fi.label.as_deref()))
        .unwrap_or("");
    let sp_key = tag_ctx.tag_field(field_ref, tag_ctx.default_sect_ref, tooltip);
    // Store on FieldInfo so write_fields uses this pre-assigned key.
    acroform.fields.last_mut().unwrap().struct_parent_key = Some(sp_key);

    cursor_y += field_h;

    // Render hint if present
    if let Some(ref fi) = node.field_item {
        if let Some(ref hint) = fi.hint {
            let pdf_y = layout::content_y_to_pdf_y(cursor_y + config.hint_font_size, config);
            content.save_state();
            content.begin_text();
            content.set_font(Name(b"Helv"), config.hint_font_size);
            content.set_fill_rgb(0.5, 0.5, 0.5);
            content.set_text_matrix([1.0, 0.0, 0.0, 1.0, x, pdf_y]);
            content.show(Str(hint.as_bytes()));
            content.end_text();
            content.restore_state();
        }
    }
}

/// Render a layout/group node — heading + children.
fn render_layout_node(
    content: &mut Content,
    node: &EvaluatedNode,
    y_offset: f32,
    available_width: f32,
    config: &PdfConfig,
    acroform: &mut AcroFormBuilder,
    page_idx: usize,
    page_refs: &[Ref],
    alloc: &mut i32,
    tag_ctx: &mut TaggingContext,
) {
    let mut cursor_y = y_offset;
    let x = config.margin_left;

    let title = node
        .props
        .get("label")
        .or_else(|| node.props.get("title"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if !title.is_empty() {
        // Tag the group heading with a <P> struct element
        let mcid = tag_ctx.tag_label(tag_ctx.default_sect_ref);
        let pdf_y = layout::content_y_to_pdf_y(cursor_y + config.heading_font_size, config);
        content.save_state();
        content
            .begin_marked_content_with_properties(Name(b"P"))
            .properties()
            .identify(mcid);
        content.begin_text();
        content.set_font(Name(b"HeBo"), config.heading_font_size);
        content.set_fill_rgb(0.1, 0.1, 0.1);
        content.set_text_matrix([1.0, 0.0, 0.0, 1.0, x, pdf_y]);
        content.show(Str(title.as_bytes()));
        content.end_text();
        content.end_marked_content();
        content.restore_state();

        // Underline
        let line_y = pdf_y - 3.0;
        content.save_state();
        content.set_stroke_rgb(0.7, 0.7, 0.7);
        content.set_line_width(0.5);
        content.move_to(x, line_y);
        content.line_to(x + config.content_width, line_y);
        content.stroke();
        content.restore_state();

        cursor_y += fonts::text_height(
            title,
            &HELVETICA_BOLD_WIDTHS,
            config.heading_font_size,
            available_width,
        ) + config.field_padding;
    }

    // Render children with row packing
    let mut row_y = cursor_y;
    let mut row_cols = 0u32;
    let mut row_max_h = 0.0f32;

    for child in &node.children {
        if !child.relevant {
            continue;
        }
        let span = child.span.min(12).max(1);
        if row_cols + span > 12 {
            row_y += row_max_h;
            row_cols = 0;
            row_max_h = 0.0;
        }

        let col_width = child_column_width(child, config);
        let child_h = crate::measure::measure_node(child, config, col_width);
        render_node(
            content, child, row_y, col_width, config, acroform, page_idx, page_refs, alloc, tag_ctx,
        );
        row_cols += span;
        row_max_h = row_max_h.max(child_h);
    }
}

/// Render a display node — text content or divider line.
fn render_display_node(
    content: &mut Content,
    node: &EvaluatedNode,
    y_offset: f32,
    available_width: f32,
    config: &PdfConfig,
) {
    // Divider: horizontal line across the content width
    if node.component == "Divider" || node.component == "divider" {
        render_divider(content, y_offset, available_width, config);
        return;
    }

    let text = node
        .props
        .get("text")
        .or_else(|| node.props.get("content"))
        .or_else(|| node.props.get("label"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if text.is_empty() {
        return;
    }

    let x = config.margin_left + node.col_start as f32 * (available_width / 12.0);
    let (font_name, font_size) = match node.component.as_str() {
        "heading" | "Heading" => (Name(b"HeBo"), config.heading_font_size),
        _ => (Name(b"Helv"), config.field_font_size),
    };

    let pdf_y = layout::content_y_to_pdf_y(y_offset + font_size, config);

    content.save_state();
    content.begin_text();
    content.set_font(font_name, font_size);
    content.set_fill_rgb(0.0, 0.0, 0.0);
    content.set_text_matrix([1.0, 0.0, 0.0, 1.0, x, pdf_y]);
    content.show(Str(text.as_bytes()));
    content.end_text();
    content.restore_state();
}

/// Render a horizontal divider line centered vertically in the divider's 12pt height.
fn render_divider(content: &mut Content, y_offset: f32, available_width: f32, config: &PdfConfig) {
    let x = config.margin_left;
    // Center the line vertically within the 12pt divider height
    let line_y = layout::content_y_to_pdf_y(y_offset + 6.0, config);

    content.save_state();
    content.set_stroke_rgb(0.75, 0.75, 0.75);
    content.set_line_width(0.5);
    content.move_to(x, line_y);
    content.line_to(x + available_width, line_y);
    content.stroke();
    content.restore_state();
}

/// Render a FileUpload component as static placeholder text.
/// No AcroForm field is created — file upload is not supported in PDF.
fn render_file_upload_placeholder(
    content: &mut Content,
    node: &EvaluatedNode,
    y_offset: f32,
    available_width: f32,
    config: &PdfConfig,
) {
    let x = config.margin_left + node.col_start as f32 * (available_width / 12.0);
    let font_size = config.field_font_size;
    let pdf_y = layout::content_y_to_pdf_y(y_offset + font_size, config);

    content.save_state();
    content.begin_text();
    content.set_font(Name(b"Helv"), font_size);
    content.set_fill_rgb(0.5, 0.5, 0.5);
    content.set_text_matrix([1.0, 0.0, 0.0, 1.0, x, pdf_y]);
    content.show(Str(b"(File upload not available in PDF)"));
    content.end_text();
    content.restore_state();
}

fn child_column_width(child: &EvaluatedNode, config: &PdfConfig) -> f32 {
    let span = child.span.min(12).max(1);
    let col_unit = (config.content_width - config.column_gap * 11.0) / 12.0;
    span as f32 * col_unit + (span.saturating_sub(1)) as f32 * config.column_gap
}
