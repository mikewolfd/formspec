//! Changelog generation binding.

use pyo3::prelude::*;
use pyo3::types::{PyDict, PyList};
use serde_json::Value;

use formspec_core::changelog;

use crate::convert::{
    change_impact_str, change_target_str, change_type_str, depythonize_json, json_to_python,
    semver_impact_str,
};
use crate::PyObject;

// ── Changelog ───────────────────────────────────────────────────

/// Diff two definition versions and produce a structured changelog.
///
/// Returns a dict with: definition_url, from_version, to_version, semver_impact, changes (list).
#[pyfunction]
pub fn generate_changelog(
    py: Python,
    old_def_obj: &Bound<'_, PyAny>,
    new_def_obj: &Bound<'_, PyAny>,
    definition_url: &str,
) -> PyResult<PyObject> {
    let old_def: Value = depythonize_json(old_def_obj)?;
    let new_def: Value = depythonize_json(new_def_obj)?;

    let result = changelog::generate_changelog(&old_def, &new_def, definition_url);

    let changes = PyList::empty(py);
    for c in &result.changes {
        let entry = PyDict::new(py);
        entry.set_item("change_type", change_type_str(&c.change_type))?;
        entry.set_item("target", change_target_str(&c.target))?;
        entry.set_item("path", &c.path)?;
        entry.set_item("impact", change_impact_str(c.impact))?;
        entry.set_item("key", c.key.as_deref())?;
        entry.set_item("description", c.description.as_deref())?;
        entry.set_item(
            "before",
            c.before
                .as_ref()
                .map(|v| json_to_python(py, v))
                .transpose()?,
        )?;
        entry.set_item(
            "after",
            c.after
                .as_ref()
                .map(|v| json_to_python(py, v))
                .transpose()?,
        )?;
        entry.set_item("migration_hint", c.migration_hint.as_deref())?;
        changes.append(entry)?;
    }

    let dict = PyDict::new(py);
    dict.set_item("definition_url", &result.definition_url)?;
    dict.set_item("from_version", &result.from_version)?;
    dict.set_item("to_version", &result.to_version)?;
    dict.set_item("semver_impact", semver_impact_str(result.semver_impact))?;
    dict.set_item("changes", changes)?;

    Ok(dict.into())
}
