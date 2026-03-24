//! Unit tests for formspec-pdf.

use crate::fonts::{text_width, wrap_text, text_height, HELVETICA_WIDTHS, HELVETICA_BOLD_WIDTHS};
use crate::options::{PdfConfig, PdfOptions};
use crate::layout::{grid_to_rect, content_y_to_pdf_y};

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
    // "The quick brown fox" at 10pt should wrap at narrow width
    let lines = wrap_text("The quick brown fox jumps over the lazy dog", &HELVETICA_WIDTHS, 10.0, 100.0);
    assert!(lines > 1, "Expected multiple lines, got {}", lines);
}

#[test]
fn text_height_returns_lines_times_leading() {
    let h = text_height("Hello World", &HELVETICA_WIDTHS, 10.0, 500.0);
    // Single line at 10pt with 1.2 leading = 12.0
    assert!((h - 12.0).abs() < 0.01, "Expected 12.0, got {}", h);
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
    // 6 columns out of 12: half the content width minus half the inter-column gaps
    let col_w = (config.content_width - config.column_gap * 11.0) / 12.0;
    let expected_width = 6.0 * col_w + 5.0 * config.column_gap;
    assert!((rect.width - expected_width).abs() < 0.5, "Expected ~{}, got {}", expected_width, rect.width);
}

#[test]
fn content_y_flips_axis() {
    let config = PdfOptions::default().to_pdf_config();
    let pdf_y = content_y_to_pdf_y(0.0, &config);
    let expected = config.page_height - config.margin_top - config.header_height;
    assert!((pdf_y - expected).abs() < 0.01);
}

// ── Appearance Streams ──

#[test]
fn text_field_appearance_nonempty() {
    let bytes = crate::appearance::build_text_field_appearance("hello", 200.0, 22.0, 10.0);
    assert!(!bytes.is_empty());
}

#[test]
fn checkbox_appearances_nonempty() {
    let on = crate::appearance::build_checkmark_appearance(14.0, 14.0);
    let off = crate::appearance::build_empty_box_appearance(14.0, 14.0);
    assert!(!on.is_empty());
    assert!(!off.is_empty());
}

#[test]
fn radio_appearances_nonempty() {
    let on = crate::appearance::build_radio_on_appearance(14.0, 14.0);
    let off = crate::appearance::build_radio_off_appearance(14.0, 14.0);
    assert!(!on.is_empty());
    assert!(!off.is_empty());
}
