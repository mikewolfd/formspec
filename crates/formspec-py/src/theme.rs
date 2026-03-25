//! Theme cascade resolution PyO3 bindings.

use pyo3::prelude::*;
use serde_json::Value;

use formspec_theme::{
    ItemDescriptor, PresentationBlock, ThemeDocument, Tier1Hints, resolve_presentation,
    resolve_token,
};

use crate::PyObject;
use crate::convert::{depythonize_json, json_to_python};

/// Resolve the 6-level theme cascade for a single item.
///
/// Args:
///     theme: Optional theme document dict
///     item: Item descriptor dict with `key`, `itemType`, optional `dataType`
///     tier1: Optional Tier1 hints dict with `itemPresentation`, `formPresentation`
///
/// Returns:
///     Resolved PresentationBlock as a Python dict.
#[pyfunction(signature = (theme, item, tier1=None))]
pub fn resolve_presentation_py(
    py: Python,
    theme: &Bound<'_, PyAny>,
    item: &Bound<'_, PyAny>,
    tier1: Option<&Bound<'_, PyAny>>,
) -> PyResult<PyObject> {
    let theme_val: Value = depythonize_json(theme)?;
    let theme_doc: Option<ThemeDocument> = if theme_val.is_null() {
        None
    } else {
        Some(serde_json::from_value(theme_val).map_err(|e| {
            pyo3::exceptions::PyValueError::new_err(format!("invalid theme document: {e}"))
        })?)
    };

    let item_desc: ItemDescriptor = serde_json::from_value(depythonize_json(item)?).map_err(
        |e| pyo3::exceptions::PyValueError::new_err(format!("invalid item descriptor: {e}")),
    )?;

    let tier1_hints: Option<Tier1Hints> = match tier1 {
        Some(t) => {
            let v: Value = depythonize_json(t)?;
            if v.is_null() {
                None
            } else {
                Some(serde_json::from_value(v).map_err(|e| {
                    pyo3::exceptions::PyValueError::new_err(format!("invalid tier1 hints: {e}"))
                })?)
            }
        }
        None => None,
    };

    let result: PresentationBlock =
        resolve_presentation(theme_doc.as_ref(), &item_desc, tier1_hints.as_ref(), None);

    let json = serde_json::to_value(&result).map_err(|e| {
        pyo3::exceptions::PyRuntimeError::new_err(format!("serialization failed: {e}"))
    })?;
    json_to_python(py, &json)
}

/// Resolve a `$token.key` reference through the 3-tier token cascade.
///
/// Args:
///     value: The token reference string (e.g. "$token.primary")
///     component_tokens: Optional dict of component-level tokens
///     theme_tokens: Optional dict of theme-level tokens
///
/// Returns:
///     Resolved value as a Python object, or None if unresolved.
#[pyfunction(signature = (value, component_tokens=None, theme_tokens=None))]
pub fn resolve_token_py(
    py: Python,
    value: &str,
    component_tokens: Option<&Bound<'_, PyAny>>,
    theme_tokens: Option<&Bound<'_, PyAny>>,
) -> PyResult<PyObject> {
    let comp_val: Option<Value> = match component_tokens {
        Some(ct) => {
            let v: Value = depythonize_json(ct)?;
            if v.is_null() { None } else { Some(v) }
        }
        None => None,
    };
    let theme_val: Option<Value> = match theme_tokens {
        Some(tt) => {
            let v: Value = depythonize_json(tt)?;
            if v.is_null() { None } else { Some(v) }
        }
        None => None,
    };

    let comp_map = comp_val.as_ref().and_then(|v| v.as_object());
    let theme_map = theme_val.as_ref().and_then(|v| v.as_object());

    match resolve_token(value, comp_map, theme_map) {
        Some(resolved) => json_to_python(py, &resolved),
        None => Ok(py.None()),
    }
}
