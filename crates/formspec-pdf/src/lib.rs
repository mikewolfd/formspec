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

use formspec_plan::{EvaluatedNode, NodeCategory};
use serde_json::Map;

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

/// Components that should be dissolved: web-only navigation wrappers,
/// page containers, and pure layout stacks at the top level.
fn should_dissolve(node: &EvaluatedNode) -> bool {
    matches!(
        node.component.as_str(),
        "Wizard" | "wizard" | "Tabs" | "tabs" | "Page" | "page"
            | "Stack" | "stack"
    ) && !node.children.is_empty()
}

/// More conservative dissolution for nested contexts — don't dissolve
/// stacks inside columns/grids since that would break column layout.
fn should_dissolve_nested(node: &EvaluatedNode) -> bool {
    matches!(
        node.component.as_str(),
        "Wizard" | "wizard" | "Tabs" | "tabs" | "Page" | "page"
    ) && !node.children.is_empty()
}

/// Create a synthetic heading node from a dissolved container's title/label.
fn make_section_heading(node: &EvaluatedNode) -> Option<EvaluatedNode> {
    let title = node
        .props
        .get("title")
        .or_else(|| node.props.get("label"))
        .and_then(|v| v.as_str());
    let title = title?;
    if title.is_empty() {
        return None;
    }
    let mut props = Map::new();
    props.insert("text".to_string(), serde_json::Value::String(title.to_string()));
    Some(EvaluatedNode {
        id: format!("{}-heading", node.id),
        component: "Heading".to_string(),
        category: NodeCategory::Display,
        props,
        style: None,
        css_classes: Vec::new(),
        accessibility: None,
        presentation: None,
        label_position: None,
        bind_path: None,
        field_item: None,
        value: Some(serde_json::Value::Null),
        relevant: true,
        required: false,
        readonly: false,
        validations: Vec::new(),
        repeat_group: None,
        children: Vec::new(),
        span: 12,
        col_start: 0,
    })
}

/// Unwrap navigation/page containers so each child becomes a paginated item.
fn flatten_for_pdf(nodes: &[EvaluatedNode]) -> Vec<EvaluatedNode> {
    let mut out = Vec::new();
    for node in nodes {
        if should_dissolve(node) {
            // Emit a heading for the section title, then promote children
            if let Some(heading) = make_section_heading(node) {
                out.push(heading);
            }
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
/// Uses conservative dissolution to preserve column/grid structure.
fn flatten_children(children: &[EvaluatedNode]) -> Vec<EvaluatedNode> {
    let mut out = Vec::new();
    for child in children {
        if should_dissolve_nested(child) {
            if let Some(heading) = make_section_heading(child) {
                out.push(heading);
            }
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
