//! Layout planner PyO3 bindings.

use pyo3::prelude::*;
use serde_json::Value;

use formspec_plan::{
    PlanContextJson, plan_component_tree, plan_definition_fallback, reset_node_id_counter,
};

use crate::PyObject;
use crate::convert::{depythonize_json, json_to_python};

/// Plan a single component tree node into a LayoutNode tree.
///
/// Args:
///     tree: Component tree node dict
///     context: PlanContext JSON dict with `itemsByPath`, optional `theme`, `componentDocument`, etc.
///
/// Returns:
///     Planned LayoutNode tree as a Python dict.
#[pyfunction]
pub fn plan_component_tree_py(
    py: Python,
    tree: &Bound<'_, PyAny>,
    context: &Bound<'_, PyAny>,
) -> PyResult<PyObject> {
    let tree_val: Value = depythonize_json(tree)?;

    let ctx_json: PlanContextJson =
        serde_json::from_value(depythonize_json(context)?).map_err(|e| {
            pyo3::exceptions::PyValueError::new_err(format!("invalid plan context: {e}"))
        })?;
    let ctx = ctx_json.into();

    // Reset counter for deterministic output across calls.
    reset_node_id_counter();

    let result = plan_component_tree(&tree_val, &ctx);
    let json = serde_json::to_value(&result).map_err(|e| {
        pyo3::exceptions::PyRuntimeError::new_err(format!("serialization failed: {e}"))
    })?;
    json_to_python(py, &json)
}

/// Plan a definition-fallback layout from items when no component document is available.
///
/// Args:
///     items: Array of definition item dicts
///     context: PlanContext JSON dict
///
/// Returns:
///     Array of LayoutNode trees as a Python list.
#[pyfunction]
pub fn plan_definition_fallback_py(
    py: Python,
    items: &Bound<'_, PyAny>,
    context: &Bound<'_, PyAny>,
) -> PyResult<PyObject> {
    let items_val: Value = depythonize_json(items)?;
    let items_arr = items_val
        .as_array()
        .ok_or_else(|| pyo3::exceptions::PyTypeError::new_err("items must be an array"))?;

    let ctx_json: PlanContextJson =
        serde_json::from_value(depythonize_json(context)?).map_err(|e| {
            pyo3::exceptions::PyValueError::new_err(format!("invalid plan context: {e}"))
        })?;
    let ctx = ctx_json.into();

    // Reset counter for deterministic output across calls.
    reset_node_id_counter();

    let result = plan_definition_fallback(items_arr, &ctx);
    let json = serde_json::to_value(&result).map_err(|e| {
        pyo3::exceptions::PyRuntimeError::new_err(format!("serialization failed: {e}"))
    })?;
    json_to_python(py, &json)
}
