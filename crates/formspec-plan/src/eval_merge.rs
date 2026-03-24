//! Merge evaluated runtime state into LayoutNode trees, producing EvaluatedNode trees.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::HashMap;

use crate::types::{FieldItemSnapshot, LayoutNode, NodeCategory};
use formspec_theme::{AccessibilityBlock, LabelPosition, PresentationBlock};

/// A layout node merged with evaluated runtime state (values, relevance, validation, etc.).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvaluatedNode {
    // ── Identity ──
    pub id: String,
    pub component: String,
    pub category: NodeCategory,

    // ── Theme / presentation ──
    #[serde(default, skip_serializing_if = "Map::is_empty")]
    pub props: Map<String, Value>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub style: Option<Map<String, Value>>,

    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub css_classes: Vec<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub accessibility: Option<AccessibilityBlock>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub presentation: Option<PresentationBlock>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub label_position: Option<LabelPosition>,

    // ── Field binding ──
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bind_path: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub field_item: Option<FieldItemSnapshot>,

    // ── Evaluated runtime state ──
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<Value>,

    #[serde(default = "default_true")]
    pub relevant: bool,

    #[serde(default)]
    pub required: bool,

    #[serde(default)]
    pub readonly: bool,

    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub validations: Vec<FieldValidation>,

    // ── Layout grid ──
    /// Column span in a 12-column grid (default 12 = full width).
    #[serde(default = "default_span")]
    pub span: u32,

    /// Column start position (0-based).
    #[serde(default)]
    pub col_start: u32,

    // ── Children ──
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<EvaluatedNode>,

    // ── Repeat ──
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repeat_group: Option<String>,
}

/// A single validation result attached to a field.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FieldValidation {
    pub severity: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
}

fn default_true() -> bool {
    true
}

fn default_span() -> u32 {
    12
}

/// Merge an EvaluationResult into a LayoutNode tree, producing an EvaluatedNode tree.
pub fn evaluate_and_merge(
    layout_nodes: &[LayoutNode],
    values: &HashMap<String, Value>,
    non_relevant: &[String],
    required: &HashMap<String, bool>,
    readonly: &HashMap<String, bool>,
    validations_by_path: &HashMap<String, Vec<FieldValidation>>,
) -> Vec<EvaluatedNode> {
    layout_nodes
        .iter()
        .map(|node| merge_single(node, values, non_relevant, required, readonly, validations_by_path))
        .collect()
}

/// Convenience wrapper that takes a `formspec_eval::EvaluationResult` directly.
///
/// Decomposes the result and delegates to [`evaluate_and_merge`].
/// Validation results are grouped by path into `FieldValidation` entries.
pub fn evaluate_and_merge_from_eval_result(
    layout_nodes: &[LayoutNode],
    eval_result: &formspec_eval::EvaluationResult,
    _definition: &Value,
) -> Vec<EvaluatedNode> {
    // Group validations by path
    let mut validations_by_path: HashMap<String, Vec<FieldValidation>> = HashMap::new();
    for vr in &eval_result.validations {
        validations_by_path
            .entry(vr.path.clone())
            .or_default()
            .push(FieldValidation {
                severity: vr.severity.clone(),
                message: vr.message.clone(),
                code: Some(vr.code.clone()),
            });
    }

    evaluate_and_merge(
        layout_nodes,
        &eval_result.values,
        &eval_result.non_relevant,
        &eval_result.required,
        &eval_result.readonly,
        &validations_by_path,
    )
}

fn merge_single(
    node: &LayoutNode,
    values: &HashMap<String, Value>,
    non_relevant: &[String],
    required: &HashMap<String, bool>,
    readonly: &HashMap<String, bool>,
    validations_by_path: &HashMap<String, Vec<FieldValidation>>,
) -> EvaluatedNode {
    let bind_path = node.bind_path.as_deref();

    let value = bind_path.and_then(|p| values.get(p).cloned());
    let relevant = bind_path.map_or(true, |p| !non_relevant.contains(&p.to_string()));
    let is_required = bind_path.and_then(|p| required.get(p).copied()).unwrap_or(false);
    let is_readonly = bind_path.and_then(|p| readonly.get(p).copied()).unwrap_or(false);
    let field_validations = bind_path
        .and_then(|p| validations_by_path.get(p).cloned())
        .unwrap_or_default();

    // Extract span from props or style
    let span = node
        .props
        .get("span")
        .and_then(|v| v.as_u64())
        .unwrap_or(12) as u32;
    let col_start = node
        .props
        .get("colStart")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;

    let children = evaluate_and_merge(
        &node.children,
        values,
        non_relevant,
        required,
        readonly,
        validations_by_path,
    );

    EvaluatedNode {
        id: node.id.clone(),
        component: node.component.clone(),
        category: node.category,
        props: node.props.clone(),
        style: node.style.clone(),
        css_classes: node.css_classes.clone(),
        accessibility: node.accessibility.clone(),
        presentation: node.presentation.clone(),
        label_position: node.label_position,
        bind_path: node.bind_path.clone(),
        field_item: node.field_item.clone(),
        value,
        relevant,
        required: is_required,
        readonly: is_readonly,
        validations: field_validations,
        span,
        col_start,
        children,
        repeat_group: node.repeat_group.clone(),
    }
}
