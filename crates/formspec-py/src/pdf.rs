//! PDF rendering and XFDF round-trip PyO3 bindings.

use std::collections::HashMap;

use pyo3::prelude::*;
use pyo3::types::PyBytes;
use serde_json::Value;

use formspec_pdf::{PdfOptions, generate_xfdf, parse_xfdf, render_pdf};
use formspec_plan::EvaluatedNode;

use crate::PyObject;
use crate::convert::{depythonize_json, json_to_python};

/// Render a PDF from an evaluated node tree.
///
/// Args:
///     evaluated_tree: Array of EvaluatedNode dicts (already planned + merged with eval state)
///     options: Optional PdfOptions dict
///
/// Returns:
///     PDF file contents as bytes.
#[pyfunction(signature = (evaluated_tree, options=None))]
pub fn render_pdf_py(
    py: Python,
    evaluated_tree: &Bound<'_, PyAny>,
    options: Option<&Bound<'_, PyAny>>,
) -> PyResult<Py<PyBytes>> {
    let tree_val: Value = depythonize_json(evaluated_tree)?;
    let nodes: Vec<EvaluatedNode> = serde_json::from_value(tree_val).map_err(|e| {
        pyo3::exceptions::PyValueError::new_err(format!("invalid evaluated tree: {e}"))
    })?;

    let pdf_options: PdfOptions = match options {
        Some(opts) => serde_json::from_value(depythonize_json(opts)?).map_err(|e| {
            pyo3::exceptions::PyValueError::new_err(format!("invalid PDF options: {e}"))
        })?,
        None => PdfOptions::default(),
    };

    let bytes = render_pdf(&nodes, &pdf_options);
    Ok(PyBytes::new(py, &bytes).unbind())
}

/// Generate XFDF XML from field name→value pairs.
///
/// Args:
///     fields: Dict of field name → value
///
/// Returns:
///     XFDF XML string.
#[pyfunction]
pub fn generate_xfdf_py(fields: &Bound<'_, PyAny>) -> PyResult<String> {
    let val: Value = depythonize_json(fields)?;
    let map: HashMap<String, Value> = match val {
        Value::Object(obj) => obj.into_iter().collect(),
        _ => {
            return Err(pyo3::exceptions::PyTypeError::new_err(
                "fields must be a dict",
            ));
        }
    };
    Ok(generate_xfdf(&map))
}

/// Parse XFDF XML into field name→value pairs.
///
/// Args:
///     xfdf_xml: XFDF XML string
///
/// Returns:
///     Dict of field name → value.
#[pyfunction]
pub fn parse_xfdf_py(py: Python, xfdf_xml: &str) -> PyResult<PyObject> {
    let fields = parse_xfdf(xfdf_xml)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("XFDF parse error: {e}")))?;
    let json = serde_json::to_value(&fields).map_err(|e| {
        pyo3::exceptions::PyRuntimeError::new_err(format!("serialization failed: {e}"))
    })?;
    json_to_python(py, &json)
}
