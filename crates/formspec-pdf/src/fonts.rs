//! Standard 14 font metrics — Helvetica glyph width arrays and text measurement.

/// Helvetica glyph widths for ASCII 32..126 (95 glyphs), in units of 1/1000 em.
pub const HELVETICA_WIDTHS: [u16; 95] = [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333,
    389, 584, 278, 333, 278, 278, 556, 556, 556, 556,
    556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
    584, 556, 1015, 667, 667, 722, 722, 667, 611, 778,
    722, 278, 500, 667, 556, 833, 722, 778, 667, 778,
    722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
    278, 278, 469, 556, 333, 556, 556, 500, 556, 556,
    278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
    500, 334, 260, 334, 584,
];

/// Helvetica-Bold glyph widths for ASCII 32..126 (95 glyphs), in units of 1/1000 em.
pub const HELVETICA_BOLD_WIDTHS: [u16; 95] = [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333,
    389, 584, 278, 333, 278, 278, 556, 556, 556, 556,
    556, 556, 556, 556, 556, 556, 333, 333, 584, 584,
    584, 611, 975, 722, 722, 722, 722, 667, 611, 778,
    722, 278, 556, 722, 611, 833, 722, 778, 667, 778,
    722, 667, 611, 722, 667, 944, 667, 667, 611, 333,
    278, 333, 584, 556, 333, 556, 611, 556, 611, 556,
    333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
    611, 611, 389, 556, 333, 611, 556, 778, 556, 556,
    500, 389, 280, 389, 584,
];

/// Compute the width of a text string in PDF points.
///
/// Characters outside ASCII 32..126 are treated as having the width of space (index 0).
pub fn text_width(text: &str, widths: &[u16; 95], font_size: f32) -> f32 {
    let mut total: u32 = 0;
    for ch in text.chars() {
        let code = ch as u32;
        let idx = if (32..=126).contains(&code) {
            (code - 32) as usize
        } else {
            0 // fallback to space width
        };
        total += widths[idx] as u32;
    }
    total as f32 * font_size / 1000.0
}

/// Compute the number of lines needed to wrap `text` at `max_width` PDF points.
///
/// Uses greedy word wrapping. Returns at least 1 for non-empty text, 0 for empty.
pub fn wrap_text(text: &str, widths: &[u16; 95], font_size: f32, max_width: f32) -> usize {
    if text.is_empty() {
        return 0;
    }

    let mut lines = 1usize;
    let mut line_width: f32 = 0.0;
    let space_w = widths[0] as f32 * font_size / 1000.0;

    for word in text.split_whitespace() {
        let word_w = text_width(word, widths, font_size);

        if line_width == 0.0 {
            // First word on the line — always place it.
            line_width = word_w;
        } else if line_width + space_w + word_w > max_width {
            // Wrap to next line.
            lines += 1;
            line_width = word_w;
        } else {
            line_width += space_w + word_w;
        }
    }

    lines
}

/// Compute the total height (in PDF points) of `text` when wrapped to `max_width`.
///
/// Uses a line height of 1.2x the font size.
pub fn text_height(text: &str, widths: &[u16; 95], font_size: f32, max_width: f32) -> f32 {
    let line_count = wrap_text(text, widths, font_size, max_width);
    if line_count == 0 {
        return 0.0;
    }
    line_count as f32 * font_size * 1.2
}
