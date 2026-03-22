//! Document type detection, linting, definition evaluation, and screener bindings.

use std::collections::HashMap;

use pyo3::prelude::*;
use pyo3::types::{PyDict, PyList};
use serde_json::Value;

use formspec_core::detect_document_type;
use formspec_eval::{
    EvalTrigger, ExtensionConstraint, evaluate_definition_full_with_instances, evaluate_screener,
};
use formspec_lint::{LintMode, LintOptions, lint_with_options};

use crate::convert::{depythonize_json, json_object_to_string_map, json_to_python};
use crate::PyObject;

// ── Document Type Detection ─────────────────────────────────────

/// Detect the Formspec document type from a JSON string.
///
/// Returns the document type string or None.
#[pyfunction]
pub fn detect_type(document: &Bound<'_, PyAny>) -> PyResult<Option<String>> {
    let doc: Value = depythonize_json(document)?;
    Ok(detect_document_type(&doc).map(|dt| dt.schema_key().to_string()))
}

// ── Linting ─────────────────────────────────────────────────────

/// Lint a Formspec document (7-pass static analysis).
///
/// Args:
///     document: Python dict of the Formspec document
///     mode: Optional lint mode — "authoring", "strict", or "runtime" (default)
///     registry_documents: Optional list of registry document dicts for extension resolution
///     definition_document: Optional definition document dict for cross-artifact validation
///     schema_only: When true, run only schema-level validation (skip semantic passes)
///     no_fel: When true, skip FEL expression passes
///
/// Returns:
///     A dict with: document_type, valid, diagnostics (list of dicts)
#[pyfunction(signature = (document, mode=None, registry_documents=None, definition_document=None, schema_only=None, no_fel=None))]
pub fn lint_document(
    py: Python,
    document: &Bound<'_, PyAny>,
    mode: Option<&str>,
    registry_documents: Option<&Bound<'_, PyList>>,
    definition_document: Option<&Bound<'_, PyAny>>,
    schema_only: Option<bool>,
    no_fel: Option<bool>,
) -> PyResult<PyObject> {
    let doc: Value = depythonize_json(document)?;

    let lint_mode = match mode {
        Some("authoring") => LintMode::Authoring,
        Some("strict") => LintMode::Strict,
        _ => LintMode::Runtime,
    };

    let registry_docs: Vec<Value> = match registry_documents {
        Some(list) => {
            let mut docs = Vec::new();
            for item in list.iter() {
                docs.push(depythonize_json(&item)?);
            }
            docs
        }
        None => Vec::new(),
    };

    let def_doc: Option<Value> = match definition_document {
        Some(d) => Some(depythonize_json(d)?),
        None => None,
    };

    let options = LintOptions {
        mode: lint_mode,
        registry_documents: registry_docs,
        definition_document: def_doc,
        schema_only: schema_only.unwrap_or(false),
        no_fel: no_fel.unwrap_or(false),
    };

    let result = lint_with_options(&doc, &options);

    let diagnostics = PyList::empty(py);
    for d in &result.diagnostics {
        let diag = PyDict::new(py);
        diag.set_item("code", &d.code)?;
        diag.set_item("pass", d.pass)?;
        diag.set_item(
            "severity",
            match d.severity {
                formspec_lint::LintSeverity::Error => "error",
                formspec_lint::LintSeverity::Warning => "warning",
                formspec_lint::LintSeverity::Info => "info",
            },
        )?;
        diag.set_item("path", &d.path)?;
        diag.set_item("message", &d.message)?;
        diagnostics.append(diag)?;
    }

    let dict = PyDict::new(py);
    dict.set_item(
        "document_type",
        result.document_type.map(|dt| dt.schema_key().to_string()),
    )?;
    dict.set_item("valid", result.valid)?;
    dict.set_item("diagnostics", diagnostics)?;

    Ok(dict.into())
}

// ── Evaluation ──────────────────────────────────────────────────

/// Evaluate a Formspec definition against provided data.
///
/// Args:
///     definition: Python dict of the definition
///     data: Python dict of field values
///     trigger: Optional shape timing mode ("continuous", "submit", "disabled")
///     registry_documents: Optional list of registry document dicts
///
/// Returns:
///     A dict with: values, validations, non_relevant, variables
#[pyfunction(signature = (definition, data, trigger=None, registry_documents=None, instances=None))]
pub fn evaluate_def(
    py: Python,
    definition: &Bound<'_, PyAny>,
    data: &Bound<'_, PyAny>,
    trigger: Option<&str>,
    registry_documents: Option<&Bound<'_, PyList>>,
    instances: Option<&Bound<'_, PyAny>>,
) -> PyResult<PyObject> {
    let definition: Value = depythonize_json(definition)?;
    let data_val: Value = depythonize_json(data)?;

    let data = json_object_to_string_map(&data_val);

    let eval_trigger = match trigger {
        Some("submit") => EvalTrigger::Submit,
        Some("disabled") => EvalTrigger::Disabled,
        _ => EvalTrigger::Continuous,
    };

    // Extract extension constraints from registry documents
    let constraints = match registry_documents {
        Some(docs) => extract_extension_constraints(docs)?,
        None => Vec::new(),
    };

    // Parse instances into HashMap<String, Value>
    let instances_map: HashMap<String, Value> = match instances {
        Some(inst) => json_object_to_string_map(&depythonize_json(inst)?),
        None => HashMap::new(),
    };

    let result = evaluate_definition_full_with_instances(
        &definition,
        &data,
        eval_trigger,
        &constraints,
        &instances_map,
    );

    let values = PyDict::new(py);
    for (k, v) in &result.values {
        values.set_item(k, json_to_python(py, v)?)?;
    }

    let validations = PyList::empty(py);
    for v in &result.validations {
        let entry = PyDict::new(py);
        entry.set_item("path", &v.path)?;
        entry.set_item("severity", &v.severity)?;
        entry.set_item("constraintKind", &v.constraint_kind)?;
        entry.set_item("code", &v.code)?;
        entry.set_item("message", &v.message)?;
        entry.set_item("source", &v.source)?;
        if let Some(ref sid) = v.shape_id {
            entry.set_item("shapeId", sid)?;
        }
        if let Some(ref context) = v.context {
            entry.set_item("context", json_to_python(py, &serde_json::json!(context))?)?;
        }
        validations.append(entry)?;
    }

    let dict = PyDict::new(py);
    dict.set_item("values", values)?;
    dict.set_item("validations", validations)?;
    dict.set_item("non_relevant", &result.non_relevant)?;

    let variables = PyDict::new(py);
    for (k, v) in &result.variables {
        variables.set_item(k, json_to_python(py, v)?)?;
    }
    dict.set_item("variables", variables)?;

    Ok(dict.into())
}

/// Extract ExtensionConstraint structs from raw registry JSON documents.
fn extract_extension_constraints(docs: &Bound<'_, PyList>) -> PyResult<Vec<ExtensionConstraint>> {
    let mut constraints = Vec::new();

    for doc_any in docs.iter() {
        let doc_val: Value = depythonize_json(&doc_any)?;

        let entries = match doc_val.get("entries").and_then(|v| v.as_array()) {
            Some(arr) => arr,
            None => continue,
        };

        for entry in entries {
            let name = match entry.get("name").and_then(|v| v.as_str()) {
                Some(n) => n.to_string(),
                None => continue,
            };

            let status = entry
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("stable")
                .to_string();

            let display_name = entry
                .get("metadata")
                .and_then(|m| m.get("displayName"))
                .and_then(|v| v.as_str())
                .map(String::from);

            let base_type = entry
                .get("baseType")
                .and_then(|v| v.as_str())
                .map(String::from);

            let deprecation_notice = entry
                .get("deprecationNotice")
                .and_then(|v| v.as_str())
                .map(String::from);

            let compatibility_version = entry
                .get("compatibility")
                .and_then(|c| c.get("formspecVersion"))
                .and_then(|v| v.as_str())
                .map(String::from);

            // Extract constraint parameters
            let constraint_obj = entry.get("constraints");

            let pattern = constraint_obj
                .and_then(|c| c.get("pattern"))
                .and_then(|v| v.as_str())
                .map(String::from);

            let max_length = constraint_obj
                .and_then(|c| c.get("maxLength"))
                .and_then(|v| v.as_u64());

            let minimum = constraint_obj
                .and_then(|c| c.get("minimum"))
                .and_then(|v| v.as_f64());

            let maximum = constraint_obj
                .and_then(|c| c.get("maximum"))
                .and_then(|v| v.as_f64());

            constraints.push(ExtensionConstraint {
                name,
                display_name,
                pattern,
                max_length,
                minimum,
                maximum,
                base_type,
                status,
                deprecation_notice,
                compatibility_version,
            });
        }
    }

    Ok(constraints)
}

// ── Screener Evaluation ─────────────────────────────────────────

/// Evaluate screener routes and return the first matching route.
///
/// Args:
///     definition: Python dict of the definition (must contain a "screener" key)
///     answers: Python dict of screener answers
///
/// Returns:
///     A dict with: target, label, message — or None if no route matches.
#[pyfunction]
pub fn evaluate_screener_py(
    py: Python,
    definition: &Bound<'_, PyAny>,
    answers: &Bound<'_, PyAny>,
) -> PyResult<PyObject> {
    let def: Value = depythonize_json(definition)?;
    let ans_map = json_object_to_string_map(&depythonize_json(answers)?);

    match evaluate_screener(&def, &ans_map) {
        Some(route) => {
            let dict = PyDict::new(py);
            dict.set_item("target", &route.target)?;
            dict.set_item("label", route.label.as_deref())?;
            dict.set_item("message", route.message.as_deref())?;
            Ok(dict.into())
        }
        None => Ok(py.None()),
    }
}
