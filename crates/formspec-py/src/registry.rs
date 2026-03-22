//! Registry document parsing and entry lookup bindings.

use pyo3::prelude::*;
use pyo3::types::{PyDict, PyList};
use serde_json::Value;

use formspec_core::registry_client::{self, Registry};

use crate::convert::{
    category_str, depythonize_json, parse_status_str, registry_entry_count, status_str,
};
use crate::PyObject;

// ── Registry Client ──────────────────────────────────────────────

/// Parse a registry JSON document and return summary info.
///
/// Returns a dict with: publisher (dict), published (str), entry_count (int), validation_issues (list).
#[pyfunction]
pub fn parse_registry(py: Python, registry: &Bound<'_, PyAny>) -> PyResult<PyObject> {
    let val: Value = depythonize_json(registry)?;

    let registry = Registry::from_json(&val)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    let issues = registry.validate();

    let publisher = PyDict::new(py);
    publisher.set_item("name", &registry.publisher.name)?;
    publisher.set_item("url", &registry.publisher.url)?;
    publisher.set_item("contact", registry.publisher.contact.as_deref())?;

    let dict = PyDict::new(py);
    dict.set_item("publisher", publisher)?;
    dict.set_item("published", &registry.published)?;
    dict.set_item("entry_count", registry_entry_count(&val))?;
    dict.set_item("validation_issues", issues)?;

    Ok(dict.into())
}

/// Find a registry entry by name and optional version constraint.
///
/// Returns a Python dict of the entry or None.
#[pyfunction]
pub fn find_registry_entry(
    py: Python,
    registry: &Bound<'_, PyAny>,
    name: &str,
    version_constraint: &str,
) -> PyResult<PyObject> {
    let val: Value = depythonize_json(registry)?;

    let registry = Registry::from_json(&val)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    let constraint = if version_constraint.is_empty() {
        None
    } else {
        Some(version_constraint)
    };
    let entry = registry.find_one(name, constraint);

    match entry {
        None => Ok(py.None()),
        Some(e) => {
            let dict = PyDict::new(py);
            dict.set_item("name", &e.name)?;
            dict.set_item("category", category_str(e.category))?;
            dict.set_item("version", &e.version)?;
            dict.set_item("status", status_str(e.status))?;
            dict.set_item("description", &e.description)?;
            dict.set_item("deprecation_notice", e.deprecation_notice.as_deref())?;
            dict.set_item("base_type", e.base_type.as_deref())?;
            dict.set_item("returns", e.returns.as_deref())?;

            if let Some(ref params) = e.parameters {
                let param_list = PyList::empty(py);
                for p in params {
                    let pd = PyDict::new(py);
                    pd.set_item("name", &p.name)?;
                    pd.set_item("type", &p.param_type)?;
                    pd.set_item("description", p.description.as_deref())?;
                    param_list.append(pd)?;
                }
                dict.set_item("parameters", param_list)?;
            } else {
                dict.set_item("parameters", py.None())?;
            }

            Ok(dict.into())
        }
    }
}

/// Check whether a lifecycle status transition is valid.
#[pyfunction]
pub fn validate_lifecycle(from_status: &str, to_status: &str) -> PyResult<bool> {
    let from = parse_status_str(from_status).ok_or_else(|| {
        pyo3::exceptions::PyValueError::new_err(format!("unknown status: {from_status}"))
    })?;
    let to = parse_status_str(to_status).ok_or_else(|| {
        pyo3::exceptions::PyValueError::new_err(format!("unknown status: {to_status}"))
    })?;
    Ok(registry_client::validate_lifecycle_transition(from, to))
}

/// Construct the well-known registry URL for a base URL.
#[pyfunction]
pub fn well_known_url(base_url: &str) -> PyResult<String> {
    Ok(registry_client::well_known_url(base_url))
}
