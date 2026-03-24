//! WASM exports for formspec-plan — layout planning functions.

use wasm_bindgen::prelude::*;

/// Plan a component tree node into a LayoutNode tree.
///
/// Input: JSON strings for the component tree node and PlanContextJson.
/// Output: JSON string of the planned LayoutNode.
#[wasm_bindgen(js_name = "planComponentTree")]
pub fn plan_component_tree(
    tree_json: &str,
    context_json: &str,
) -> Result<String, JsError> {
    let tree: serde_json::Value = serde_json::from_str(tree_json)
        .map_err(|e| JsError::new(&format!("Invalid tree: {}", e)))?;

    let ctx_json: formspec_plan::PlanContextJson = serde_json::from_str(context_json)
        .map_err(|e| JsError::new(&format!("Invalid context: {}", e)))?;

    let ctx: formspec_plan::PlanContext = ctx_json.into();
    let result = formspec_plan::plan_component_tree(&tree, &ctx);

    serde_json::to_string(&result).map_err(|e| JsError::new(&e.to_string()))
}

/// Plan definition items into LayoutNode trees (fallback when no component document).
///
/// Input: JSON strings for the items array and PlanContextJson.
/// Output: JSON string of the LayoutNode array.
#[wasm_bindgen(js_name = "planDefinitionFallback")]
pub fn plan_definition_fallback(
    items_json: &str,
    context_json: &str,
) -> Result<String, JsError> {
    let items: Vec<serde_json::Value> = serde_json::from_str(items_json)
        .map_err(|e| JsError::new(&format!("Invalid items: {}", e)))?;

    let ctx_json: formspec_plan::PlanContextJson = serde_json::from_str(context_json)
        .map_err(|e| JsError::new(&format!("Invalid context: {}", e)))?;

    let ctx: formspec_plan::PlanContext = ctx_json.into();
    let result = formspec_plan::plan_definition_fallback(&items, &ctx);

    serde_json::to_string(&result).map_err(|e| JsError::new(&e.to_string()))
}

/// Reset the node ID counter (for deterministic testing).
#[wasm_bindgen(js_name = "resetNodeIdCounter")]
pub fn reset_node_id_counter() {
    formspec_plan::reset_node_id_counter();
}
