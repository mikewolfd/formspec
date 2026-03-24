//! Appearance stream generation for AcroForm fields.
//!
//! Generates the /AP normal appearance XObject content for text fields,
//! checkboxes, and radio buttons using pdf-writer's Content builder.

use pdf_writer::{Content, Name, Str};

/// Build the normal appearance stream for a single-line text field.
pub fn build_text_field_appearance(value: &str, width: f32, height: f32, font_size: f32) -> Vec<u8> {
    let mut content = Content::new();

    // Background
    content.save_state();
    content.set_fill_rgb(1.0, 1.0, 1.0);
    content.rect(0.0, 0.0, width, height);
    content.fill_nonzero();
    content.restore_state();

    // Border
    content.save_state();
    content.set_stroke_rgb(0.6, 0.6, 0.6);
    content.set_line_width(0.5);
    content.rect(0.25, 0.25, width - 0.5, height - 0.5);
    content.stroke();
    content.restore_state();

    // Text
    if !value.is_empty() {
        content.save_state();
        content.begin_text();
        content.set_font(Name(b"Helv"), font_size);
        content.set_fill_rgb(0.0, 0.0, 0.0);
        let text_y = (height - font_size) / 2.0;
        content.set_text_matrix([1.0, 0.0, 0.0, 1.0, 2.0, text_y]);
        content.show(Str(value.as_bytes()));
        content.end_text();
        content.restore_state();
    }

    content.finish()
}

/// Build the normal appearance stream for a multiline text field.
pub fn build_multiline_text_appearance(
    value: &str,
    width: f32,
    height: f32,
    font_size: f32,
) -> Vec<u8> {
    let mut content = Content::new();

    // Background
    content.save_state();
    content.set_fill_rgb(1.0, 1.0, 1.0);
    content.rect(0.0, 0.0, width, height);
    content.fill_nonzero();
    content.restore_state();

    // Border
    content.save_state();
    content.set_stroke_rgb(0.6, 0.6, 0.6);
    content.set_line_width(0.5);
    content.rect(0.25, 0.25, width - 0.5, height - 0.5);
    content.stroke();
    content.restore_state();

    // Text — render each line
    if !value.is_empty() {
        content.save_state();
        content.begin_text();
        content.set_font(Name(b"Helv"), font_size);
        content.set_fill_rgb(0.0, 0.0, 0.0);
        let leading = font_size * 1.2;
        let mut y = height - font_size - 2.0;
        for line in value.lines() {
            if y < 0.0 {
                break;
            }
            content.set_text_matrix([1.0, 0.0, 0.0, 1.0, 2.0, y]);
            content.show(Str(line.as_bytes()));
            y -= leading;
        }
        content.end_text();
        content.restore_state();
    }

    content.finish()
}

/// Build the "on" appearance for a checkbox (checkmark).
pub fn build_checkmark_appearance(width: f32, height: f32) -> Vec<u8> {
    let mut content = Content::new();

    // Box background
    content.save_state();
    content.set_fill_rgb(1.0, 1.0, 1.0);
    content.rect(0.0, 0.0, width, height);
    content.fill_nonzero();
    content.restore_state();

    // Border
    content.save_state();
    content.set_stroke_rgb(0.0, 0.0, 0.0);
    content.set_line_width(1.0);
    content.rect(0.5, 0.5, width - 1.0, height - 1.0);
    content.stroke();
    content.restore_state();

    // Checkmark using ZapfDingbats character 4 (checkmark)
    content.save_state();
    content.begin_text();
    content.set_font(Name(b"ZaDb"), height * 0.7);
    content.set_fill_rgb(0.0, 0.0, 0.0);
    content.set_text_matrix([1.0, 0.0, 0.0, 1.0, width * 0.15, height * 0.2]);
    content.show(Str(b"4")); // ZapfDingbats checkmark
    content.end_text();
    content.restore_state();

    content.finish()
}

/// Build the "off" appearance for a checkbox (empty box).
pub fn build_empty_box_appearance(width: f32, height: f32) -> Vec<u8> {
    let mut content = Content::new();

    // White background
    content.save_state();
    content.set_fill_rgb(1.0, 1.0, 1.0);
    content.rect(0.0, 0.0, width, height);
    content.fill_nonzero();
    content.restore_state();

    // Border
    content.save_state();
    content.set_stroke_rgb(0.0, 0.0, 0.0);
    content.set_line_width(1.0);
    content.rect(0.5, 0.5, width - 1.0, height - 1.0);
    content.stroke();
    content.restore_state();

    content.finish()
}

/// Build the "on" appearance for a radio button (filled circle).
pub fn build_radio_on_appearance(width: f32, height: f32) -> Vec<u8> {
    let mut content = Content::new();
    let cx = width / 2.0;
    let cy = height / 2.0;
    let r = (width.min(height) / 2.0) - 1.0;

    // Outer circle (approximated with bezier curves)
    content.save_state();
    content.set_stroke_rgb(0.0, 0.0, 0.0);
    content.set_line_width(1.0);
    draw_circle(&mut content, cx, cy, r);
    content.stroke();
    content.restore_state();

    // Inner filled circle
    let inner_r = r * 0.5;
    content.save_state();
    content.set_fill_rgb(0.0, 0.0, 0.0);
    draw_circle(&mut content, cx, cy, inner_r);
    content.fill_nonzero();
    content.restore_state();

    content.finish()
}

/// Build the "off" appearance for a radio button (empty circle).
pub fn build_radio_off_appearance(width: f32, height: f32) -> Vec<u8> {
    let mut content = Content::new();
    let cx = width / 2.0;
    let cy = height / 2.0;
    let r = (width.min(height) / 2.0) - 1.0;

    // Outer circle
    content.save_state();
    content.set_stroke_rgb(0.0, 0.0, 0.0);
    content.set_line_width(1.0);
    draw_circle(&mut content, cx, cy, r);
    content.stroke();
    content.restore_state();

    content.finish()
}

/// Draw a circle approximation using four cubic bezier curves.
/// Uses the kappa constant (4/3)(sqrt(2)-1) ~= 0.5523 for the best cubic approximation.
fn draw_circle(content: &mut Content, cx: f32, cy: f32, r: f32) {
    let k: f32 = 0.5523;
    let kr = k * r;

    content.move_to(cx + r, cy);
    content.cubic_to(cx + r, cy + kr, cx + kr, cy + r, cx, cy + r);
    content.cubic_to(cx - kr, cy + r, cx - r, cy + kr, cx - r, cy);
    content.cubic_to(cx - r, cy - kr, cx - kr, cy - r, cx, cy - r);
    content.cubic_to(cx + kr, cy - r, cx + r, cy - kr, cx + r, cy);
}
