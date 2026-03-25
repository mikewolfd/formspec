//! Formspec PDF renderer — AcroForm fields + tagged PDF/UA structure from LayoutNode trees.

mod acroform;
mod appearance;
mod compress;
mod fonts;
mod layout;
mod measure;
mod options;
mod paginate;
mod render;
mod tagged;
mod xfdf;

pub use options::PdfOptions;
pub use xfdf::{assemble_response, generate_xfdf, parse_xfdf};

use formspec_plan::EvaluatedNode;

/// Render a PDF from an evaluated layout node tree.
pub fn render_pdf(evaluated_tree: &[EvaluatedNode], options: &PdfOptions) -> Vec<u8> {
    let config = options.to_pdf_config();
    // Flatten navigation/page containers so the paginator can break
    // between sections independently — no single node taller than a page.
    let flat = flatten_for_pdf(evaluated_tree);
    let measured = measure::measure_trees(&flat, &config);
    let pages = paginate::paginate(&measured, &config);
    render::render_document(&pages, &flat, &config)
}

/// Web-only navigation wrappers that should be dissolved for PDF.
/// Pages are NOT dissolved — they render as layout sections with headings.
fn should_dissolve(node: &EvaluatedNode) -> bool {
    matches!(
        node.component.as_str(),
        "Wizard" | "wizard" | "Tabs" | "tabs"
    ) && !node.children.is_empty()
}

/// Unwrap navigation containers so each child becomes a paginated item.
fn flatten_for_pdf(nodes: &[EvaluatedNode]) -> Vec<EvaluatedNode> {
    let mut out = Vec::new();
    for node in nodes {
        if should_dissolve(node) {
            // Promote children (Wizard→Pages, Tabs→panels)
            out.extend(flatten_for_pdf(&node.children));
        } else {
            let mut n = node.clone();
            if !n.children.is_empty() {
                n.children = flatten_children(&n.children);
            }
            out.push(n);
        }
    }
    out
}

/// Recursively flatten dissolved containers within a children list.
fn flatten_children(children: &[EvaluatedNode]) -> Vec<EvaluatedNode> {
    let mut out = Vec::new();
    for child in children {
        if should_dissolve(child) {
            out.extend(flatten_for_pdf(&child.children));
        } else {
            let mut c = child.clone();
            if !c.children.is_empty() {
                c.children = flatten_children(&c.children);
            }
            out.push(c);
        }
    }
    out
}

#[cfg(test)]
mod tests;
