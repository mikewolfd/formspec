//! Node height measurement — compute vertical space each EvaluatedNode needs.

use formspec_plan::{EvaluatedNode, NodeCategory};

use crate::fonts::{self, HELVETICA_BOLD_WIDTHS, HELVETICA_WIDTHS};
use crate::options::PdfConfig;

/// A measured layout node carrying its computed height.
pub struct MeasuredNode {
    /// Total height of this node in PDF points.
    pub height: f32,
    /// Index into the original node slice.
    pub node_index: usize,
}

/// Measure the height of a single node given the available column width.
pub fn measure_node(node: &EvaluatedNode, config: &PdfConfig, column_width: f32) -> f32 {
    if !node.relevant {
        return 0.0;
    }

    match node.category {
        NodeCategory::Layout => measure_layout_node(node, config, column_width),
        NodeCategory::Field => measure_field_node(node, config, column_width),
        NodeCategory::Display => measure_display_node(node, config, column_width),
        NodeCategory::Interactive => measure_interactive_node(node, config, column_width),
        NodeCategory::Special => measure_special_node(node, config, column_width),
    }
}

/// Measure a vec of top-level nodes, returning MeasuredNodes.
pub fn measure_trees(nodes: &[EvaluatedNode], config: &PdfConfig) -> Vec<MeasuredNode> {
    nodes
        .iter()
        .enumerate()
        .map(|(i, node)| {
            let height = measure_node(node, config, config.content_width);
            MeasuredNode {
                height,
                node_index: i,
            }
        })
        .collect()
}

fn child_column_width(child: &EvaluatedNode, config: &PdfConfig) -> f32 {
    let span = child.span.min(12).max(1);
    let col_unit = (config.content_width - config.column_gap * 11.0) / 12.0;
    span as f32 * col_unit + (span.saturating_sub(1)) as f32 * config.column_gap
}

/// Layout nodes (groups, pages, sections) sum their children heights + padding.
fn measure_layout_node(node: &EvaluatedNode, config: &PdfConfig, column_width: f32) -> f32 {
    let comp = node.component.as_str();

    // Heading height for groups/sections
    let heading_h = match comp {
        "page" | "group" | "section" => {
            let label = node
                .props
                .get("label")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if label.is_empty() {
                0.0
            } else {
                fonts::text_height(label, &HELVETICA_BOLD_WIDTHS, config.heading_font_size, column_width)
                    + config.field_padding
            }
        }
        _ => 0.0,
    };

    // Sum children using row-packing: children on the same row share vertical space.
    let children_h = measure_children_packed(node, config);

    heading_h + children_h + config.group_padding
}

/// Pack children into rows based on their span, and sum the row heights.
fn measure_children_packed(node: &EvaluatedNode, config: &PdfConfig) -> f32 {
    let mut total = 0.0f32;
    let mut row_max = 0.0f32;
    let mut row_cols = 0u32;

    for child in &node.children {
        if !child.relevant {
            continue;
        }
        let span = child.span.min(12).max(1);
        let col_w = child_column_width(child, config);
        let h = measure_node(child, config, col_w);

        if row_cols + span > 12 {
            // Flush current row.
            total += row_max;
            row_max = h;
            row_cols = span;
        } else {
            row_cols += span;
            row_max = row_max.max(h);
        }
    }
    total + row_max
}

/// Field nodes: label + field widget + optional hint + padding.
fn measure_field_node(node: &EvaluatedNode, config: &PdfConfig, column_width: f32) -> f32 {
    let mut h = 0.0f32;

    // Label
    let label = node
        .field_item
        .as_ref()
        .and_then(|fi| fi.label.as_deref())
        .unwrap_or("");
    if !label.is_empty() {
        h += fonts::text_height(label, &HELVETICA_WIDTHS, config.label_font_size, column_width);
        h += 2.0; // gap between label and field
    }

    // Field widget
    let comp = node.component.as_str();
    h += match comp {
        "textArea" | "textarea" => config.textarea_height,
        "choice" | "multiChoice" | "radio" | "checkboxGroup" => {
            let option_count = node
                .field_item
                .as_ref()
                .map(|fi| fi.options.len())
                .unwrap_or(1);
            option_count.max(1) as f32 * config.option_height
        }
        _ => config.field_height,
    };

    // Hint
    let hint = node
        .field_item
        .as_ref()
        .and_then(|fi| fi.hint.as_deref())
        .unwrap_or("");
    if !hint.is_empty() {
        h += fonts::text_height(hint, &HELVETICA_WIDTHS, config.hint_font_size, column_width);
    }

    h + config.field_padding
}

/// Display nodes: headings, help text, static output.
fn measure_display_node(node: &EvaluatedNode, config: &PdfConfig, column_width: f32) -> f32 {
    let text = node
        .props
        .get("text")
        .or_else(|| node.props.get("label"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let comp = node.component.as_str();
    let (widths, size) = match comp {
        "heading" => (&HELVETICA_BOLD_WIDTHS, config.heading_font_size),
        _ => (&HELVETICA_WIDTHS, config.field_font_size),
    };

    if text.is_empty() {
        config.field_padding
    } else {
        fonts::text_height(text, widths, size, column_width) + config.field_padding
    }
}

/// Interactive nodes (buttons, etc.) get a fixed field height.
fn measure_interactive_node(_node: &EvaluatedNode, config: &PdfConfig, _column_width: f32) -> f32 {
    config.field_height + config.field_padding
}

/// Special nodes: fallback to field height.
fn measure_special_node(_node: &EvaluatedNode, config: &PdfConfig, _column_width: f32) -> f32 {
    config.field_height + config.field_padding
}
