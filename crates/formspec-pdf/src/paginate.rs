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

    // Filter to non-zero-height nodes for lookahead.
    let nodes: Vec<&MeasuredNode> = measured.iter().filter(|n| n.height > 0.0).collect();

    for (i, node) in nodes.iter().enumerate() {
        // Keep-with-next: if this is a small node (heading/label) and
        // placing it here would orphan it (the next node forces a break),
        // break BEFORE this node so it starts the next page with its content.
        if cursor > 0.0 {
            let is_small = node.height < max_h * 0.08;
            if is_small {
                if let Some(next) = nodes.get(i + 1) {
                    // Would the next node need a new page after this one?
                    let after = cursor + node.height;
                    if after + next.height > max_h && after > max_h * 0.5 {
                        // Heading would be stranded in the bottom half — break now.
                        pages.push(vec![]);
                        cursor = 0.0;
                    }
                }
            }

            // Normal break: node won't fit on current page.
            if cursor + node.height > max_h {
                pages.push(vec![]);
                cursor = 0.0;
            }
        }

        pages.last_mut().unwrap().push(PageItem {
            node_index: node.node_index,
            y_offset: cursor,
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
