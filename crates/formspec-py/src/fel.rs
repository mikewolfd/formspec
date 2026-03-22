//! FEL evaluation, parse, and dependency PyO3 bindings.

use std::collections::HashMap;

use pyo3::prelude::*;
use pyo3::types::{PyDict, PyList};

use fel_core::{evaluate, extract_dependencies, parse, MapEnvironment};
use formspec_core::{analyze_fel, get_fel_dependencies};

use crate::convert::{
    build_formspec_env, builtin_function_to_dict, fel_to_python, fel_to_python_tagged,
    parse_fel_expr, pydict_to_field_map, severity_str,
};
use crate::PyObject;

// ── FEL Evaluation ──────────────────────────────────────────────

/// Parse and evaluate a FEL expression with optional field values.
///
/// Args:
///     expression: FEL expression string
///     fields: Optional dict of field name → value
///
/// Returns:
///     The evaluated result as a Python value (None, bool, int, float, str, list, dict)
#[pyfunction]
pub fn eval_fel(
    py: Python,
    expression: &str,
    fields: Option<&Bound<'_, PyDict>>,
) -> PyResult<PyObject> {
    let expr = parse_fel_expr(expression)?;

    let field_map = match fields {
        Some(dict) => pydict_to_field_map(py, dict)?,
        None => HashMap::new(),
    };

    let env = MapEnvironment::with_fields(field_map);
    let result = evaluate(&expr, &env);

    fel_to_python(py, &result.value)
}

/// Parse and evaluate a FEL expression with full Formspec context.
///
/// Args:
///     expression: FEL expression string
///     fields: Optional dict of field name → value
///     instances: Optional dict of instance name → value
///     mip_states: Optional dict of field path → {valid, relevant, readonly, required}
///     variables: Optional dict of variable name → value
///
/// Returns:
///     A dict with: value, diagnostics
#[pyfunction(signature = (expression, fields=None, instances=None, mip_states=None, variables=None, now_iso=None))]
pub fn eval_fel_detailed(
    py: Python,
    expression: &str,
    fields: Option<&Bound<'_, PyDict>>,
    instances: Option<&Bound<'_, PyDict>>,
    mip_states: Option<&Bound<'_, PyDict>>,
    variables: Option<&Bound<'_, PyDict>>,
    now_iso: Option<&str>,
) -> PyResult<PyObject> {
    let expr = parse_fel_expr(expression)?;
    let env = build_formspec_env(py, fields, instances, mip_states, variables, now_iso)?;
    let result = evaluate(&expr, &env);

    let diagnostics = PyList::empty(py);
    for diagnostic in &result.diagnostics {
        let entry = PyDict::new(py);
        entry.set_item("message", &diagnostic.message)?;
        entry.set_item("severity", severity_str(diagnostic.severity))?;
        diagnostics.append(entry)?;
    }

    let payload = PyDict::new(py);
    payload.set_item("value", fel_to_python_tagged(py, &result.value)?)?;
    payload.set_item("diagnostics", diagnostics)?;
    Ok(payload.into())
}

/// Parse a FEL expression and return whether it's valid.
#[pyfunction]
pub fn parse_fel(expression: &str) -> bool {
    parse(expression).is_ok()
}

/// Extract field dependencies from a FEL expression.
///
/// Returns a list of field path strings.
#[pyfunction]
pub fn get_dependencies(expression: &str) -> Vec<String> {
    get_fel_dependencies(expression).into_iter().collect()
}

/// Extract full dependency info from a FEL expression.
///
/// Returns a dict with: fields, context_refs, instance_refs, mip_deps,
/// has_self_ref, has_wildcard, uses_prev_next.
#[pyfunction]
pub fn extract_deps(py: Python, expression: &str) -> PyResult<PyObject> {
    let expr = parse_fel_expr(expression)?;
    let deps = extract_dependencies(&expr);

    let dict = PyDict::new(py);
    dict.set_item("fields", deps.fields.iter().collect::<Vec<_>>())?;
    dict.set_item("context_refs", deps.context_refs.iter().collect::<Vec<_>>())?;
    dict.set_item(
        "instance_refs",
        deps.instance_refs.iter().collect::<Vec<_>>(),
    )?;
    dict.set_item("mip_deps", deps.mip_deps.iter().collect::<Vec<_>>())?;
    dict.set_item("has_self_ref", deps.has_self_ref)?;
    dict.set_item("has_wildcard", deps.has_wildcard)?;
    dict.set_item("uses_prev_next", deps.uses_prev_next)?;

    Ok(dict.into())
}

// ── FEL Analysis ────────────────────────────────────────────────

/// Analyze a FEL expression, extracting references, variables, and functions.
///
/// Returns a dict with: valid, errors, references, variables, functions.
#[pyfunction]
pub fn analyze_expression(py: Python, expression: &str) -> PyResult<PyObject> {
    let result = analyze_fel(expression);

    let dict = PyDict::new(py);
    dict.set_item("valid", result.valid)?;
    dict.set_item(
        "errors",
        result
            .errors
            .iter()
            .map(|e| e.message.clone())
            .collect::<Vec<_>>(),
    )?;
    dict.set_item(
        "references",
        result.references.into_iter().collect::<Vec<_>>(),
    )?;
    dict.set_item(
        "variables",
        result.variables.into_iter().collect::<Vec<_>>(),
    )?;
    dict.set_item(
        "functions",
        result.functions.into_iter().collect::<Vec<_>>(),
    )?;

    Ok(dict.into())
}

/// Return builtin FEL function metadata for Python tooling surfaces.
#[pyfunction]
pub fn list_builtin_functions(py: Python) -> PyResult<PyObject> {
    let entries = PyList::empty(py);
    for entry in fel_core::builtin_function_catalog() {
        entries.append(builtin_function_to_dict(py, entry)?)?;
    }
    Ok(entries.into())
}
