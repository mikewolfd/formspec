//! Unit tests for formspec-pdf.

use serde_json::{Map, json};
use std::collections::HashMap;

use formspec_plan::{EvaluatedNode, FieldItemSnapshot, NodeCategory};

use crate::fonts::{HELVETICA_BOLD_WIDTHS, HELVETICA_WIDTHS, text_height, text_width, wrap_text};
use crate::layout::{content_y_to_pdf_y, grid_to_rect};
use crate::measure::{measure_node, measure_trees};
use crate::options::{PdfConfig, PdfOptions};
use crate::paginate::paginate;

// ── Helpers ──

fn default_config() -> PdfConfig {
    PdfOptions::default().to_pdf_config()
}

fn make_field_node(component: &str, bind: &str, label: &str) -> EvaluatedNode {
    EvaluatedNode {
        id: bind.to_string(),
        component: component.to_string(),
        category: NodeCategory::Field,
        props: Map::new(),
        style: None,
        css_classes: Vec::new(),
        accessibility: None,
        presentation: None,
        label_position: None,
        bind_path: Some(bind.to_string()),
        field_item: Some(FieldItemSnapshot {
            key: bind.to_string(),
            label: Some(label.to_string()),
            hint: None,
            data_type: Some("string".to_string()),
            options: Vec::new(),
            option_set: None,
        }),
        value: None,
        relevant: true,
        required: false,
        readonly: false,
        validations: Vec::new(),
        span: 12,
        col_start: 0,
        children: Vec::new(),
        repeat_group: None,
    }
}

fn make_group_node(label: &str, children: Vec<EvaluatedNode>) -> EvaluatedNode {
    let mut props = Map::new();
    props.insert("label".to_string(), json!(label));
    EvaluatedNode {
        id: format!("group-{}", label),
        component: "group".to_string(),
        category: NodeCategory::Layout,
        props,
        style: None,
        css_classes: Vec::new(),
        accessibility: None,
        presentation: None,
        label_position: None,
        bind_path: None,
        field_item: None,
        value: None,
        relevant: true,
        required: false,
        readonly: false,
        validations: Vec::new(),
        span: 12,
        col_start: 0,
        children,
        repeat_group: None,
    }
}

// ── Font Metrics ──

#[test]
fn text_width_space() {
    // Space width in Helvetica at 10pt = 278 * 10 / 1000 = 2.78
    let w = text_width(" ", &HELVETICA_WIDTHS, 10.0);
    assert!((w - 2.78).abs() < 0.01, "Expected ~2.78, got {}", w);
}

#[test]
fn text_width_hello() {
    // H=722, e=556, l=222, l=222, o=556  = 2278
    // At 10pt: 2278 * 10 / 1000 = 22.78
    let w = text_width("Hello", &HELVETICA_WIDTHS, 10.0);
    assert!((w - 22.78).abs() < 0.01, "Expected ~22.78, got {}", w);
}

#[test]
fn text_width_bold_differs() {
    let regular = text_width("Test", &HELVETICA_WIDTHS, 12.0);
    let bold = text_width("Test", &HELVETICA_BOLD_WIDTHS, 12.0);
    assert!(bold > regular, "Bold should be wider than regular");
}

#[test]
fn text_width_non_ascii_uses_space() {
    // Non-ASCII characters should use space width as fallback
    let w_space = text_width(" ", &HELVETICA_WIDTHS, 10.0);
    let w_emoji = text_width("\u{263A}", &HELVETICA_WIDTHS, 10.0); // smiley
    assert!(
        (w_emoji - w_space).abs() < 0.01,
        "Non-ASCII should use space width"
    );
}

#[test]
fn text_width_scales_with_font_size() {
    let w10 = text_width("A", &HELVETICA_WIDTHS, 10.0);
    let w20 = text_width("A", &HELVETICA_WIDTHS, 20.0);
    assert!(
        (w20 - w10 * 2.0).abs() < 0.01,
        "Width should scale linearly with size"
    );
}

#[test]
fn wrap_text_single_word() {
    let lines = wrap_text("Hello", &HELVETICA_WIDTHS, 10.0, 100.0);
    assert_eq!(lines, 1);
}

#[test]
fn wrap_text_empty() {
    let lines = wrap_text("", &HELVETICA_WIDTHS, 10.0, 100.0);
    assert_eq!(lines, 0);
}

#[test]
fn wrap_text_multiple_lines() {
    let lines = wrap_text(
        "The quick brown fox jumps over the lazy dog",
        &HELVETICA_WIDTHS,
        10.0,
        100.0,
    );
    assert!(lines > 1, "Expected multiple lines, got {}", lines);
}

#[test]
fn wrap_text_exact_fit_no_wrap() {
    // A single word that fits exactly should be 1 line
    let w = text_width("Hello", &HELVETICA_WIDTHS, 10.0);
    let lines = wrap_text("Hello", &HELVETICA_WIDTHS, 10.0, w + 1.0);
    assert_eq!(lines, 1);
}

#[test]
fn wrap_text_long_word_never_split() {
    // A single very long "word" that exceeds max_width should still be 1 line
    // (greedy wrapping doesn't break within words)
    let lines = wrap_text("superlongword", &HELVETICA_WIDTHS, 10.0, 5.0);
    assert_eq!(lines, 1);
}

#[test]
fn text_height_returns_lines_times_leading() {
    let h = text_height("Hello World", &HELVETICA_WIDTHS, 10.0, 500.0);
    // Single line at 10pt with 1.2 leading = 12.0
    assert!((h - 12.0).abs() < 0.01, "Expected 12.0, got {}", h);
}

#[test]
fn text_height_empty_is_zero() {
    let h = text_height("", &HELVETICA_WIDTHS, 10.0, 500.0);
    assert!((h - 0.0).abs() < 0.01, "Empty text height should be 0");
}

#[test]
fn text_height_multi_line() {
    // Force 2 lines by using a very narrow width
    let lines = wrap_text("Hello World", &HELVETICA_WIDTHS, 10.0, 30.0);
    assert!(lines >= 2, "Expected at least 2 lines, got {}", lines);
    let h = text_height("Hello World", &HELVETICA_WIDTHS, 10.0, 30.0);
    let expected = lines as f32 * 10.0 * 1.2;
    assert!(
        (h - expected).abs() < 0.01,
        "Expected {}, got {}",
        expected,
        h
    );
}

// ── PdfConfig ──

#[test]
fn pdf_config_defaults() {
    let opts = PdfOptions::default();
    let config = opts.to_pdf_config();

    assert!((config.page_width - 612.0).abs() < 0.01);
    assert!((config.page_height - 792.0).abs() < 0.01);
    assert!((config.content_width - 468.0).abs() < 0.01);
    // content_height = 792 - 72 - 72 - 36 - 24 = 588
    assert!((config.content_height - 588.0).abs() < 0.01);
    assert_eq!(config.language, "en-US");
}

#[test]
fn pdf_config_custom_margins() {
    let opts = PdfOptions {
        margin_left: 36.0,
        margin_right: 36.0,
        ..Default::default()
    };
    let config = opts.to_pdf_config();
    // content_width = 612 - 36 - 36 = 540
    assert!((config.content_width - 540.0).abs() < 0.01);
}

#[test]
fn pdf_config_custom_language() {
    let opts = PdfOptions {
        language: Some("de-DE".to_string()),
        ..Default::default()
    };
    let config = opts.to_pdf_config();
    assert_eq!(config.language, "de-DE");
}

#[test]
fn pdf_config_serde_roundtrip() {
    let json_str = r#"{"paperWidth":595.0,"paperHeight":842.0,"marginTop":50.0,"marginBottom":50.0,"marginLeft":50.0,"marginRight":50.0,"headerHeight":30.0,"footerHeight":20.0,"fontSize":11.0}"#;
    let opts: PdfOptions = serde_json::from_str(json_str).unwrap();
    assert!((opts.paper_width - 595.0).abs() < 0.01, "A4 width");
    assert!((opts.paper_height - 842.0).abs() < 0.01, "A4 height");
}

// ── Layout Coordinates ──

#[test]
fn grid_span_full_width() {
    let config = PdfOptions::default().to_pdf_config();
    let rect = grid_to_rect(12, 0, 0.0, 22.0, &config);
    assert!((rect.width - config.content_width).abs() < 0.01);
    assert!((rect.x - config.margin_left).abs() < 0.01);
}

#[test]
fn grid_half_width() {
    let config = PdfOptions::default().to_pdf_config();
    let rect = grid_to_rect(6, 0, 0.0, 22.0, &config);
    let col_w = (config.content_width - config.column_gap * 11.0) / 12.0;
    let expected_width = 6.0 * col_w + 5.0 * config.column_gap;
    assert!(
        (rect.width - expected_width).abs() < 0.5,
        "Expected ~{}, got {}",
        expected_width,
        rect.width
    );
}

#[test]
fn grid_single_column() {
    let config = default_config();
    let rect = grid_to_rect(1, 0, 0.0, 22.0, &config);
    let col_w = (config.content_width - config.column_gap * 11.0) / 12.0;
    assert!((rect.width - col_w).abs() < 0.5);
}

#[test]
fn grid_offset_start_position() {
    let config = default_config();
    let rect0 = grid_to_rect(6, 0, 0.0, 22.0, &config);
    let rect6 = grid_to_rect(6, 6, 0.0, 22.0, &config);
    assert!(rect6.x > rect0.x, "offset column should be further right");
}

#[test]
fn content_y_flips_axis() {
    let config = PdfOptions::default().to_pdf_config();
    let pdf_y = content_y_to_pdf_y(0.0, &config);
    let expected = config.page_height - config.margin_top - config.header_height;
    assert!((pdf_y - expected).abs() < 0.01);
}

#[test]
fn content_y_increases_downward_decreases_pdf_y() {
    let config = default_config();
    let y0 = content_y_to_pdf_y(0.0, &config);
    let y100 = content_y_to_pdf_y(100.0, &config);
    assert!(y0 > y100, "moving down in content should decrease PDF y");
    assert!((y0 - y100 - 100.0).abs() < 0.01);
}

// ── Appearance Streams ──

#[test]
fn text_field_appearance_nonempty() {
    let bytes = crate::appearance::build_text_field_appearance("hello", 200.0, 22.0, 10.0);
    assert!(!bytes.is_empty());
}

#[test]
fn text_field_appearance_empty_value() {
    let bytes = crate::appearance::build_text_field_appearance("", 200.0, 22.0, 10.0);
    // Should still produce background+border even without text
    assert!(!bytes.is_empty());
}

#[test]
fn multiline_appearance_nonempty() {
    let bytes = crate::appearance::build_multiline_text_appearance(
        "Line one\nLine two\nLine three",
        200.0,
        60.0,
        10.0,
    );
    assert!(!bytes.is_empty());
}

#[test]
fn checkbox_appearances_nonempty() {
    let on = crate::appearance::build_checkmark_appearance(14.0, 14.0);
    let off = crate::appearance::build_empty_box_appearance(14.0, 14.0);
    assert!(!on.is_empty());
    assert!(!off.is_empty());
    // On state should be longer (has checkmark drawing in addition to box)
    assert!(
        on.len() > off.len(),
        "checkmark should produce more bytes than empty box"
    );
}

#[test]
fn radio_appearances_nonempty() {
    let on = crate::appearance::build_radio_on_appearance(14.0, 14.0);
    let off = crate::appearance::build_radio_off_appearance(14.0, 14.0);
    assert!(!on.is_empty());
    assert!(!off.is_empty());
    assert!(
        on.len() > off.len(),
        "filled circle should produce more bytes than empty circle"
    );
}

// ── Measurement ──

#[test]
fn measure_field_node_positive_height() {
    let config = default_config();
    let node = make_field_node("TextInput", "name", "Full Name");
    let h = measure_node(&node, &config, config.content_width);
    assert!(h > 0.0, "Field node should have positive height");
    // Should include label + field + padding
    assert!(
        h >= config.field_height + config.field_padding,
        "Should be at least field_height + padding"
    );
}

#[test]
fn measure_textarea_taller_than_text_input() {
    let config = default_config();
    let text_node = make_field_node("TextInput", "name", "Name");
    let textarea_node = make_field_node("textArea", "notes", "Notes");

    let h_text = measure_node(&text_node, &config, config.content_width);
    let h_textarea = measure_node(&textarea_node, &config, config.content_width);
    assert!(
        h_textarea > h_text,
        "Textarea ({}) should be taller than TextInput ({})",
        h_textarea,
        h_text
    );
}

#[test]
fn measure_non_relevant_node_zero_height() {
    let config = default_config();
    let mut node = make_field_node("TextInput", "name", "Name");
    node.relevant = false;
    let h = measure_node(&node, &config, config.content_width);
    assert!(
        (h - 0.0).abs() < 0.01,
        "Non-relevant nodes should have zero height"
    );
}

#[test]
fn measure_group_includes_children() {
    let config = default_config();
    let child1 = make_field_node("TextInput", "name", "Name");
    let child2 = make_field_node("NumberInput", "age", "Age");
    let h1 = measure_node(&child1, &config, config.content_width);
    let h2 = measure_node(&child2, &config, config.content_width);

    let group = make_group_node("Personal Info", vec![child1, child2]);
    let h_group = measure_node(&group, &config, config.content_width);

    // Group height should be >= sum of children
    assert!(
        h_group >= h1 + h2,
        "Group ({}) should be >= children sum ({} + {} = {})",
        h_group,
        h1,
        h2,
        h1 + h2
    );
}

#[test]
fn measure_trees_produces_one_per_node() {
    let config = default_config();
    let nodes = vec![
        make_field_node("TextInput", "a", "A"),
        make_field_node("TextInput", "b", "B"),
        make_field_node("TextInput", "c", "C"),
    ];
    let measured = measure_trees(&nodes, &config);
    assert_eq!(measured.len(), 3);
    for m in &measured {
        assert!(m.height > 0.0);
    }
}

// ── Pagination ──

#[test]
fn paginate_empty_input() {
    let config = default_config();
    let pages = paginate(&[], &config);
    assert!(pages.is_empty());
}

#[test]
fn paginate_single_node_fits_on_one_page() {
    let config = default_config();
    let nodes = vec![make_field_node("TextInput", "name", "Name")];
    let measured = measure_trees(&nodes, &config);
    let pages = paginate(&measured, &config);

    assert_eq!(pages.len(), 1);
    assert_eq!(pages[0].len(), 1);
    assert!((pages[0][0].y_offset - 0.0).abs() < 0.01);
}

#[test]
fn paginate_multiple_nodes_fit_on_one_page() {
    let config = default_config();
    let nodes: Vec<EvaluatedNode> = (0..5)
        .map(|i| make_field_node("TextInput", &format!("f{}", i), &format!("Field {}", i)))
        .collect();
    let measured = measure_trees(&nodes, &config);
    let pages = paginate(&measured, &config);

    // 5 fields should easily fit on one page (each is ~30-40pt, page is ~588pt)
    assert_eq!(pages.len(), 1);
    assert_eq!(pages[0].len(), 5);

    // Y offsets should be monotonically increasing
    for i in 1..pages[0].len() {
        assert!(
            pages[0][i].y_offset > pages[0][i - 1].y_offset,
            "y_offset should increase"
        );
    }
}

#[test]
fn paginate_overflows_to_second_page() {
    let config = default_config();
    // Create enough fields to overflow one page (~588pt content height)
    // Each field is roughly 30-40pt, so 20+ should overflow
    let nodes: Vec<EvaluatedNode> = (0..25)
        .map(|i| make_field_node("TextInput", &format!("f{}", i), &format!("Field {}", i)))
        .collect();
    let measured = measure_trees(&nodes, &config);
    let pages = paginate(&measured, &config);

    assert!(
        pages.len() >= 2,
        "25 fields should need at least 2 pages, got {}",
        pages.len()
    );
    // First page should have items
    assert!(!pages[0].is_empty());
    // Second page should have items
    assert!(!pages[1].is_empty());
    // Second page starts at y_offset 0
    assert!((pages[1][0].y_offset - 0.0).abs() < 0.01);
}

// ── PDF Generation Smoke Test ──

#[test]
fn render_pdf_produces_valid_header() {
    let nodes = vec![
        make_field_node("TextInput", "name", "Full Name"),
        make_field_node("NumberInput", "age", "Age"),
    ];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    assert!(!pdf_bytes.is_empty(), "PDF output should not be empty");
    // Valid PDF starts with %PDF-
    let header = std::str::from_utf8(&pdf_bytes[..5]).unwrap();
    assert_eq!(header, "%PDF-", "Should start with PDF header");
}

#[test]
fn render_pdf_empty_form() {
    let nodes: Vec<EvaluatedNode> = vec![];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    // Even an empty form should produce a valid PDF with at least one page
    assert!(!pdf_bytes.is_empty());
    let header = std::str::from_utf8(&pdf_bytes[..5]).unwrap();
    assert_eq!(header, "%PDF-");
}

#[test]
fn render_pdf_with_header_and_footer() {
    let nodes = vec![make_field_node("TextInput", "name", "Name")];
    let opts = PdfOptions {
        header_text: Some("My Form".to_string()),
        footer_text: Some("Page {page}".to_string()),
        ..Default::default()
    };
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    assert!(!pdf_bytes.is_empty());
    let header = std::str::from_utf8(&pdf_bytes[..5]).unwrap();
    assert_eq!(header, "%PDF-");
}

#[test]
fn render_pdf_with_readonly_and_values() {
    let mut node = make_field_node("TextInput", "name", "Full Name");
    node.value = Some(json!("John Doe"));
    node.readonly = true;
    let nodes = vec![node];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    assert!(!pdf_bytes.is_empty());
    let header = std::str::from_utf8(&pdf_bytes[..5]).unwrap();
    assert_eq!(header, "%PDF-");
}

#[test]
fn render_pdf_with_checkbox() {
    let mut node = make_field_node("checkbox", "agree", "I agree");
    node.value = Some(json!(true));
    let nodes = vec![node];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    assert!(!pdf_bytes.is_empty());
    let header = std::str::from_utf8(&pdf_bytes[..5]).unwrap();
    assert_eq!(header, "%PDF-");
}

#[test]
fn render_pdf_with_group_and_children() {
    let child1 = make_field_node("TextInput", "name", "Name");
    let child2 = make_field_node("TextInput", "email", "Email");
    let group = make_group_node("Contact Info", vec![child1, child2]);
    let nodes = vec![group];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    assert!(!pdf_bytes.is_empty());
    let header = std::str::from_utf8(&pdf_bytes[..5]).unwrap();
    assert_eq!(header, "%PDF-");
}

// ── AcroForm Select/ComboBox Fields ──

#[test]
fn render_pdf_with_select_field() {
    let mut node = make_field_node("Select", "color", "Favorite Color");
    node.field_item = Some(FieldItemSnapshot {
        key: "color".to_string(),
        label: Some("Favorite Color".to_string()),
        hint: None,
        data_type: Some("choice".to_string()),
        options: vec![
            formspec_plan::FieldOption {
                value: json!("red"),
                label: Some("Red".to_string()),
            },
            formspec_plan::FieldOption {
                value: json!("blue"),
                label: Some("Blue".to_string()),
            },
            formspec_plan::FieldOption {
                value: json!("green"),
                label: Some("Green".to_string()),
            },
        ],
        option_set: None,
    });
    node.value = Some(json!("blue"));
    let nodes = vec![node];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    let pdf_str = String::from_utf8_lossy(&pdf_bytes);
    // Should contain /Ch (choice field type) for select fields
    assert!(pdf_str.contains("/Ch"), "Select fields should be /Ch type");
    // Should contain the selected value
    assert!(
        pdf_str.contains("blue"),
        "Selected value should appear in PDF"
    );
}

// ── AcroForm Catalog Entry ──

#[test]
fn render_pdf_contains_acroform_entry() {
    let mut node = make_field_node("TextInput", "name", "Full Name");
    node.value = Some(json!("Alice"));
    let nodes = vec![node];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    let pdf_str = String::from_utf8_lossy(&pdf_bytes);
    // The PDF must contain /AcroForm with a /Fields array
    assert!(
        pdf_str.contains("/AcroForm"),
        "PDF must contain /AcroForm catalog entry for interactive fields"
    );
    assert!(
        pdf_str.contains("/Fields"),
        "AcroForm must contain /Fields array"
    );
}

#[test]
fn render_pdf_no_acroform_when_no_fields() {
    // A display-only node should not produce an AcroForm entry
    let mut props = Map::new();
    props.insert("content".to_string(), json!("Hello World"));
    let node = EvaluatedNode {
        id: "display-1".to_string(),
        component: "Text".to_string(),
        category: NodeCategory::Display,
        props,
        style: None,
        css_classes: Vec::new(),
        accessibility: None,
        presentation: None,
        label_position: None,
        bind_path: None,
        field_item: None,
        value: None,
        relevant: true,
        required: false,
        readonly: false,
        validations: Vec::new(),
        span: 12,
        col_start: 0,
        children: Vec::new(),
        repeat_group: None,
    };
    let nodes = vec![node];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    let pdf_str = String::from_utf8_lossy(&pdf_bytes);
    assert!(
        !pdf_str.contains("/AcroForm"),
        "PDF without fields should not contain /AcroForm"
    );
}

// ── AcroForm Value Display ──

#[test]
fn value_to_display_string_handles_numbers() {
    use crate::acroform::value_to_display_string;

    assert_eq!(value_to_display_string(&json!(42)), "42");
    assert_eq!(value_to_display_string(&json!(3.14)), "3.14");
}

#[test]
fn value_to_display_string_handles_booleans() {
    use crate::acroform::value_to_display_string;

    assert_eq!(value_to_display_string(&json!(true)), "true");
    assert_eq!(value_to_display_string(&json!(false)), "false");
}

#[test]
fn value_to_display_string_handles_strings() {
    use crate::acroform::value_to_display_string;

    assert_eq!(value_to_display_string(&json!("hello")), "hello");
}

#[test]
fn value_to_display_string_handles_null() {
    use crate::acroform::value_to_display_string;

    assert_eq!(value_to_display_string(&json!(null)), "");
}

#[test]
fn render_pdf_with_numeric_value_produces_valid_pdf() {
    let mut node = make_field_node("NumberInput", "age", "Age");
    node.value = Some(json!(42));
    let nodes = vec![node];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    assert!(!pdf_bytes.is_empty());
    let header = std::str::from_utf8(&pdf_bytes[..5]).unwrap();
    assert_eq!(header, "%PDF-");
    // The value "42" should appear in the PDF bytes (as part of the /V entry)
    let pdf_str = String::from_utf8_lossy(&pdf_bytes);
    assert!(
        pdf_str.contains("42"),
        "Numeric value should appear in PDF output"
    );
}

// ── XFDF Round-trip (re-exported from xfdf module) ──

#[test]
fn xfdf_roundtrip_basic() {
    use crate::xfdf::{generate_xfdf, parse_xfdf};

    let mut fields = HashMap::new();
    fields.insert("name".to_string(), json!("Alice"));
    fields.insert("age".to_string(), json!(30));
    fields.insert("active".to_string(), json!(true));

    let xml = generate_xfdf(&fields);
    let parsed = parse_xfdf(&xml).unwrap();

    assert_eq!(parsed.get("name"), Some(&json!("Alice")));
    assert_eq!(parsed.get("age"), Some(&json!(30)));
    assert_eq!(parsed.get("active"), Some(&json!(true)));
}

#[test]
fn xfdf_roundtrip_xml_special_chars() {
    use crate::xfdf::{generate_xfdf, parse_xfdf};

    let mut fields = HashMap::new();
    fields.insert("org".to_string(), json!("A & B <Corp>"));

    let xml = generate_xfdf(&fields);
    assert!(xml.contains("A &amp; B &lt;Corp&gt;"));

    let parsed = parse_xfdf(&xml).unwrap();
    assert_eq!(parsed.get("org"), Some(&json!("A & B <Corp>")));
}

#[test]
fn xfdf_deterministic_key_order() {
    use crate::xfdf::generate_xfdf;

    let mut fields = HashMap::new();
    fields.insert("z_field".to_string(), json!("last"));
    fields.insert("a_field".to_string(), json!("first"));
    fields.insert("m_field".to_string(), json!("middle"));

    let xml = generate_xfdf(&fields);
    let a_pos = xml.find("a_field").unwrap();
    let m_pos = xml.find("m_field").unwrap();
    let z_pos = xml.find("z_field").unwrap();
    assert!(a_pos < m_pos, "keys should be sorted alphabetically");
    assert!(m_pos < z_pos, "keys should be sorted alphabetically");
}

// ── Radio Group AcroForm Fields ──

#[test]
fn render_pdf_radio_group_produces_btn_type() {
    let mut node = make_field_node("RadioGroup", "color", "Favorite Color");
    node.field_item = Some(FieldItemSnapshot {
        key: "color".to_string(),
        label: Some("Favorite Color".to_string()),
        hint: None,
        data_type: Some("choice".to_string()),
        options: vec![
            formspec_plan::FieldOption {
                value: json!("red"),
                label: Some("Red".to_string()),
            },
            formspec_plan::FieldOption {
                value: json!("blue"),
                label: Some("Blue".to_string()),
            },
            formspec_plan::FieldOption {
                value: json!("green"),
                label: Some("Green".to_string()),
            },
        ],
        option_set: None,
    });
    node.value = Some(json!("blue"));
    let nodes = vec![node];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    let pdf_str = String::from_utf8_lossy(&pdf_bytes);
    // Radio groups must be /Btn (button), NOT /Ch (choice)
    assert!(
        pdf_str.contains("/Btn"),
        "Radio group must use /Btn field type, not /Ch"
    );
}

#[test]
fn render_pdf_radio_group_has_three_annotations() {
    let mut node = make_field_node("RadioGroup", "color", "Favorite Color");
    node.field_item = Some(FieldItemSnapshot {
        key: "color".to_string(),
        label: Some("Favorite Color".to_string()),
        hint: None,
        data_type: Some("choice".to_string()),
        options: vec![
            formspec_plan::FieldOption {
                value: json!("red"),
                label: Some("Red".to_string()),
            },
            formspec_plan::FieldOption {
                value: json!("blue"),
                label: Some("Blue".to_string()),
            },
            formspec_plan::FieldOption {
                value: json!("green"),
                label: Some("Green".to_string()),
            },
        ],
        option_set: None,
    });
    node.value = Some(json!("blue"));
    let nodes = vec![node];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    let pdf_str = String::from_utf8_lossy(&pdf_bytes);
    // Each option gets its own widget annotation — 3 options = 3 Widget subtypes
    let widget_count = pdf_str.matches("/Subtype /Widget").count();
    assert!(
        widget_count >= 3,
        "Radio group with 3 options should produce at least 3 widget annotations, got {}",
        widget_count
    );
}

#[test]
fn render_pdf_radio_group_has_radio_ff_bits() {
    let mut node = make_field_node("RadioGroup", "color", "Favorite Color");
    node.field_item = Some(FieldItemSnapshot {
        key: "color".to_string(),
        label: Some("Favorite Color".to_string()),
        hint: None,
        data_type: Some("choice".to_string()),
        options: vec![
            formspec_plan::FieldOption {
                value: json!("red"),
                label: Some("Red".to_string()),
            },
            formspec_plan::FieldOption {
                value: json!("blue"),
                label: Some("Blue".to_string()),
            },
        ],
        option_set: None,
    });
    let nodes = vec![node];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    let pdf_str = String::from_utf8_lossy(&pdf_bytes);
    // /Ff bits 15 (Radio=1<<14=16384) + 16 (NoToggleToOff=1<<15=32768) = 49152
    assert!(
        pdf_str.contains("/Ff 49152"),
        "Radio group must have /Ff with Radio+NoToggleToOff bits (49152), PDF:\n{}",
        &pdf_str[..pdf_str.len().min(2000)]
    );
}

// ── Signature Field ──

fn make_signature_node(bind: &str) -> EvaluatedNode {
    EvaluatedNode {
        id: bind.to_string(),
        component: "Signature".to_string(),
        category: NodeCategory::Field,
        props: Map::new(),
        style: None,
        css_classes: Vec::new(),
        accessibility: None,
        presentation: None,
        label_position: None,
        bind_path: Some(bind.to_string()),
        field_item: Some(FieldItemSnapshot {
            key: bind.to_string(),
            label: Some("Signature".to_string()),
            hint: None,
            data_type: Some("string".to_string()),
            options: Vec::new(),
            option_set: None,
        }),
        value: None,
        relevant: true,
        required: false,
        readonly: false,
        validations: Vec::new(),
        span: 12,
        col_start: 0,
        children: Vec::new(),
        repeat_group: None,
    }
}

#[test]
fn render_pdf_signature_field_is_sig_type() {
    let nodes = vec![make_signature_node("applicant_sig")];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    let pdf_str = String::from_utf8_lossy(&pdf_bytes);
    assert!(
        pdf_str.contains("/Sig"),
        "Signature field must use /FT /Sig"
    );
}

#[test]
fn render_pdf_signature_field_has_no_value() {
    let nodes = vec![make_signature_node("applicant_sig")];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    let pdf_str = String::from_utf8_lossy(&pdf_bytes);
    // Signature placeholders should not have /V (unsigned)
    // Search for /V after /Sig to make sure the sig field specifically has no value
    let sig_pos = pdf_str.find("/Sig").expect("/Sig must exist");
    // Find the end of this object (next "endobj" or similar boundary)
    let after_sig = &pdf_str[sig_pos..];
    assert!(
        !after_sig.starts_with("/Sig\n/V") && !after_sig.contains("/V "),
        "Signature placeholder should not have /V entry"
    );
}

// ── FileUpload Placeholder ──

fn make_file_upload_node(bind: &str) -> EvaluatedNode {
    EvaluatedNode {
        id: bind.to_string(),
        component: "FileUpload".to_string(),
        category: NodeCategory::Interactive,
        props: Map::new(),
        style: None,
        css_classes: Vec::new(),
        accessibility: None,
        presentation: None,
        label_position: None,
        bind_path: Some(bind.to_string()),
        field_item: Some(FieldItemSnapshot {
            key: bind.to_string(),
            label: Some("Upload Document".to_string()),
            hint: None,
            data_type: Some("binary".to_string()),
            options: Vec::new(),
            option_set: None,
        }),
        value: None,
        relevant: true,
        required: false,
        readonly: false,
        validations: Vec::new(),
        span: 12,
        col_start: 0,
        children: Vec::new(),
        repeat_group: None,
    }
}

#[test]
fn render_pdf_file_upload_no_acroform_annotation() {
    let nodes = vec![make_file_upload_node("resume")];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    let pdf_str = String::from_utf8_lossy(&pdf_bytes);
    // FileUpload should NOT produce any AcroForm field
    assert!(
        !pdf_str.contains("/AcroForm"),
        "FileUpload should not create any AcroForm entry"
    );
}

#[test]
fn render_pdf_file_upload_has_placeholder_text() {
    let nodes = vec![make_file_upload_node("resume")];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    let pdf_str = String::from_utf8_lossy(&pdf_bytes);
    assert!(
        pdf_str.contains("File upload not available in PDF"),
        "FileUpload should render placeholder text"
    );
}

// ── Hierarchical Field Naming (Repeat Groups) ──

#[test]
fn render_pdf_hierarchical_naming_top_level_fields() {
    // For repeat group paths like "items[0].name", the /Fields array
    // should contain only the top-level parent "items", not individual widgets
    let mut node0 = make_field_node("TextInput", "items[0].name", "Name");
    node0.bind_path = Some("items[0].name".to_string());
    let mut node1 = make_field_node("TextInput", "items[1].name", "Name");
    node1.bind_path = Some("items[1].name".to_string());

    let nodes = vec![node0, node1];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    let pdf_str = String::from_utf8_lossy(&pdf_bytes);

    // Should have hierarchical /T entries — the segments "items", "[0]"/"[1]", "name"
    assert!(pdf_str.contains("/AcroForm"), "Should have AcroForm dict");

    // The terminal widget fields should have /T (name) — just the last segment
    // Count terminal /T entries for "name"
    let name_count = pdf_str.matches("(name)").count();
    assert!(
        name_count >= 2,
        "Should have at least 2 terminal fields named 'name', got {}",
        name_count
    );
}

#[test]
fn render_pdf_hierarchical_parent_chain() {
    // items[0].name → parent chain: items → [0] → name (terminal widget)
    let mut node = make_field_node("TextInput", "items[0].name", "Name");
    node.bind_path = Some("items[0].name".to_string());

    let nodes = vec![node];
    let opts = PdfOptions::default();
    let pdf_bytes = crate::render_pdf(&nodes, &opts);

    let pdf_str = String::from_utf8_lossy(&pdf_bytes);

    // Parent non-terminal fields should exist with /T for each segment
    assert!(
        pdf_str.contains("(items)"),
        "Should have parent field 'items'"
    );
    // The index segment as a partial name
    assert!(
        pdf_str.contains("(0)") || pdf_str.contains("([0])"),
        "Should have index segment in parent chain"
    );
}
