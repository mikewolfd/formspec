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

/// Render a PDF from an evaluated layout node tree.
pub fn render_pdf(evaluated_tree: &[EvaluatedNode], options: &PdfOptions) -> Vec<u8> {
    let config = options.to_pdf_config();
    // Flatten navigation/page/stack containers so the paginator can break
    // between individual fields and sections.
    let flat = flatten_for_pdf(evaluated_tree);
    let measured = measure::measure_trees(&flat, &config);
    let pages = paginate::paginate(&measured, &config);
    render::render_document(&pages, &flat, &config)
}

/// Containers that should be dissolved at the TOP level — their children
/// become individually paginated items.
fn should_dissolve_top(node: &EvaluatedNode) -> bool {
    matches!(
        node.component.as_str(),
        "Wizard" | "wizard" | "Tabs" | "tabs"
            | "Page" | "page" | "Stack" | "stack"
    ) && !node.children.is_empty()
}

/// Containers that should be dissolved when NESTED inside other containers.
/// More conservative — don't dissolve Stacks inside Columns/Grids.
fn should_dissolve_nested(node: &EvaluatedNode) -> bool {
    matches!(
        node.component.as_str(),
        "Wizard" | "wizard" | "Tabs" | "tabs"
    ) && !node.children.is_empty()
}

/// Convert a dissolved Page/Section into a Heading display node that renders
/// its title. The heading becomes a separate paginated item.
fn to_heading(node: &EvaluatedNode) -> Option<EvaluatedNode> {
    let title = node
        .props
        .get("title")
        .or_else(|| node.props.get("label"))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())?;

    let mut props = serde_json::Map::new();
    props.insert("text".into(), serde_json::Value::String(title.to_string()));
    Some(EvaluatedNode {
        id: format!("{}-heading", node.id),
        component: "Heading".into(),
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

/// Flatten the tree for PDF pagination. Navigation wrappers, Pages, and
/// top-level Stacks are dissolved so their children become individual items.
/// Pages emit a heading node before their children.
fn flatten_for_pdf(nodes: &[EvaluatedNode]) -> Vec<EvaluatedNode> {
    let mut out = Vec::new();
    for node in nodes {
        if should_dissolve_top(node) {
            if let Some(h) = to_heading(node) {
                out.push(h);
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
/// Only dissolves navigation wrappers (not Stacks/Pages) to preserve
/// column/grid structure.
fn flatten_children(children: &[EvaluatedNode]) -> Vec<EvaluatedNode> {
    let mut out = Vec::new();
    for child in children {
        if should_dissolve_nested(child) {
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
