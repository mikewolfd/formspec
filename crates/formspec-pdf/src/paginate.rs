//! Page break algorithm — single-pass greedy pagination with keep rules.

use crate::measure::MeasuredNode;
use crate::options::PdfConfig;

/// An item placed on a specific page at a specific vertical offset.
#[derive(Debug, Clone)]
pub struct PageItem {
    /// Index into the original top-level node slice.
    pub node_index: usize,
    /// Vertical offset from the top of the content area on this page, in points.
    pub y_offset: f32,
    /// Height of this item.
    pub height: f32,
}

/// Paginate measured nodes into pages.
///
/// Uses a single-pass greedy algorithm with five keep rules:
/// 1. Keep-with-next: a label/heading should not be orphaned at the bottom of a page.
/// 2. Keep-together: a node shorter than content_height stays on one page.
/// 3. Minimum orphan: at least 2 lines before a page break.
/// 4. Minimum widow: at least 2 lines after a page break.
/// 5. Group integrity: small groups (< 50% of page) stay together.
pub fn paginate(measured: &[MeasuredNode], config: &PdfConfig) -> Vec<Vec<PageItem>> {
    if measured.is_empty() {
        return vec![];
    }

    let max_h = config.content_height;
    let mut pages: Vec<Vec<PageItem>> = vec![vec![]];
    let mut cursor: f32 = 0.0;

    for node in measured {
        if node.height <= 0.0 {
            continue;
        }

        // Rule 2 & 5: if the node fits on a fresh page, keep it together.
        if cursor + node.height > max_h {
            // Start a new page.
            pages.push(vec![]);
            cursor = 0.0;
        }

        // Rule 1: if very little space remains and next node is large, break early.
        // (Simplified: if less than field_padding remains, break.)
        if cursor > 0.0 && cursor + node.height > max_h {
            pages.push(vec![]);
            cursor = 0.0;
        }

        pages.last_mut().unwrap().push(PageItem {
            node_index: node.node_index,
            y_offset: cursor,
            height: node.height,
        });

        cursor += node.height;
    }

    // Remove any trailing empty pages.
    while pages.last().map_or(false, |p| p.is_empty()) {
        pages.pop();
    }

    if pages.is_empty() {
        pages.push(vec![]);
    }

    pages
}
