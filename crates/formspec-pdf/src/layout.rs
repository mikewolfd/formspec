//! 12-column grid to physical PDF coordinate mapping.

use crate::options::PdfConfig;

/// A rectangle in PDF coordinate space (origin bottom-left).
#[derive(Debug, Clone, Copy)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

/// Map a 12-column grid position to a physical PDF rectangle.
///
/// `span` is the number of columns (1..=12).
/// `start` is the 0-based column start position.
/// `y_offset` is the content-relative Y offset from the top of the content area (increases downward).
/// `height` is the height of the element in points.
// Not yet wired into the render pipeline; tested and ready for Phase 4d.
#[allow(dead_code)]
pub fn grid_to_rect(span: u32, start: u32, y_offset: f32, height: f32, config: &PdfConfig) -> Rect {
    let col_width = (config.content_width - config.column_gap * 11.0) / 12.0;
    let x = config.margin_left + start as f32 * (col_width + config.column_gap);
    let width = span as f32 * col_width + (span.saturating_sub(1)) as f32 * config.column_gap;
    let y = content_y_to_pdf_y(y_offset + height, config);

    Rect { x, y, width, height }
}

/// Convert a content-area Y offset (top-down, 0 = top of content area) to PDF Y coordinate
/// (bottom-up, 0 = bottom of page).
pub fn content_y_to_pdf_y(y_offset: f32, config: &PdfConfig) -> f32 {
    config.page_height - config.margin_top - config.header_height - y_offset
}
