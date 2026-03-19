//! PyO3 bindings for Formspec — FEL, linting, definition evaluation, registry, changelog, and mapping to Python.

/// PyO3 bindings for Formspec — exposes FEL evaluation, linting, evaluation,
/// registry parsing, changelog generation, and mapping execution to Python.
///
/// This replaces the pure-Python FEL implementation (src/formspec/fel/)
/// with native Rust performance while maintaining the same API surface.
use pyo3::prelude::*;
use pyo3::types::{PyBool, PyDict, PyList};

use rust_decimal::prelude::*;
use rust_decimal::Decimal;
use serde_json::Value;
use std::collections::HashMap;

use fel_core::{evaluate, extract_dependencies, parse, FelValue, MapEnvironment};
use formspec_core::{analyze_fel, detect_document_type, get_fel_dependencies};
use formspec_core::registry_client::{self, Registry};
use formspec_core::changelog;
use formspec_core::runtime_mapping;
use formspec_core::extension_analysis::RegistryEntryStatus;
use formspec_eval::evaluate_definition;
use formspec_lint::lint;

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
fn eval_fel(py: Python, expression: &str, fields: Option<&Bound<'_, PyDict>>) -> PyResult<PyObject> {
    let expr = parse(expression)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    let field_map = match fields {
        Some(dict) => pydict_to_field_map(py, dict)?,
        None => HashMap::new(),
    };

    let env = MapEnvironment::with_fields(field_map);
    let result = evaluate(&expr, &env);

    fel_to_python(py, &result.value)
}

/// Parse a FEL expression and return whether it's valid.
#[pyfunction]
fn parse_fel(expression: &str) -> bool {
    parse(expression).is_ok()
}

/// Extract field dependencies from a FEL expression.
///
/// Returns a list of field path strings.
#[pyfunction]
fn get_dependencies(expression: &str) -> Vec<String> {
    get_fel_dependencies(expression).into_iter().collect()
}

/// Extract full dependency info from a FEL expression.
///
/// Returns a dict with: fields, context_refs, instance_refs, mip_deps,
/// has_self_ref, has_wildcard, uses_prev_next.
#[pyfunction]
fn extract_deps(py: Python, expression: &str) -> PyResult<PyObject> {
    let expr = parse(expression)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;
    let deps = extract_dependencies(&expr);

    let dict = PyDict::new(py);
    dict.set_item("fields", deps.fields.iter().collect::<Vec<_>>())?;
    dict.set_item("context_refs", deps.context_refs.iter().collect::<Vec<_>>())?;
    dict.set_item("instance_refs", deps.instance_refs.iter().collect::<Vec<_>>())?;
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
fn analyze_expression(py: Python, expression: &str) -> PyResult<PyObject> {
    let result = analyze_fel(expression);

    let dict = PyDict::new(py);
    dict.set_item("valid", result.valid)?;
    dict.set_item("errors", result.errors.iter().map(|e| e.message.clone()).collect::<Vec<_>>())?;
    dict.set_item("references", result.references.into_iter().collect::<Vec<_>>())?;
    dict.set_item("variables", result.variables.into_iter().collect::<Vec<_>>())?;
    dict.set_item("functions", result.functions.into_iter().collect::<Vec<_>>())?;

    Ok(dict.into())
}

// ── Document Type Detection ─────────────────────────────────────

/// Detect the Formspec document type from a JSON string.
///
/// Returns the document type string or None.
#[pyfunction]
fn detect_type(json_str: &str) -> PyResult<Option<String>> {
    let doc: Value = serde_json::from_str(json_str)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("invalid JSON: {e}")))?;
    Ok(detect_document_type(&doc).map(|dt| dt.schema_key().to_string()))
}

// ── Linting ─────────────────────────────────────────────────────

/// Lint a Formspec document (7-pass static analysis).
///
/// Args:
///     json_str: JSON string of the Formspec document
///
/// Returns:
///     A dict with: document_type, valid, diagnostics (list of dicts)
#[pyfunction]
fn lint_document(py: Python, json_str: &str) -> PyResult<PyObject> {
    let doc: Value = serde_json::from_str(json_str)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("invalid JSON: {e}")))?;

    let result = lint(&doc);

    let diagnostics = PyList::empty(py);
    for d in &result.diagnostics {
        let diag = PyDict::new(py);
        diag.set_item("code", &d.code)?;
        diag.set_item("pass", d.pass)?;
        diag.set_item("severity", match d.severity {
            formspec_lint::LintSeverity::Error => "error",
            formspec_lint::LintSeverity::Warning => "warning",
            formspec_lint::LintSeverity::Info => "info",
        })?;
        diag.set_item("path", &d.path)?;
        diag.set_item("message", &d.message)?;
        diagnostics.append(diag)?;
    }

    let dict = PyDict::new(py);
    dict.set_item("document_type", result.document_type.map(|dt| dt.schema_key().to_string()))?;
    dict.set_item("valid", result.valid)?;
    dict.set_item("diagnostics", diagnostics)?;

    Ok(dict.into())
}

// ── Evaluation ──────────────────────────────────────────────────

/// Evaluate a Formspec definition against provided data.
///
/// Args:
///     definition_json: JSON string of the definition
///     data_json: JSON string of the data (field values)
///
/// Returns:
///     A dict with: values, validations, non_relevant
#[pyfunction]
fn evaluate_def(py: Python, definition_json: &str, data_json: &str) -> PyResult<PyObject> {
    let definition: Value = serde_json::from_str(definition_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("invalid definition JSON: {e}")))?;
    let data_val: Value = serde_json::from_str(data_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("invalid data JSON: {e}")))?;

    let data: HashMap<String, Value> = data_val.as_object()
        .map(|obj| obj.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
        .unwrap_or_default();

    let result = evaluate_definition(&definition, &data);

    let values = PyDict::new(py);
    for (k, v) in &result.values {
        values.set_item(k, json_to_python(py, v)?)?;
    }

    let validations = PyList::empty(py);
    for v in &result.validations {
        let entry = PyDict::new(py);
        entry.set_item("path", &v.path)?;
        entry.set_item("severity", &v.severity)?;
        entry.set_item("kind", &v.kind)?;
        entry.set_item("message", &v.message)?;
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

// ── Registry Client ──────────────────────────────────────────────

/// Parse a registry JSON document and return summary info.
///
/// Returns a dict with: publisher (dict), published (str), entry_count (int), validation_issues (list).
#[pyfunction]
fn parse_registry(py: Python, registry_json: &str) -> PyResult<PyObject> {
    let val: Value = serde_json::from_str(registry_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("invalid JSON: {e}")))?;

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
fn find_registry_entry(py: Python, registry_json: &str, name: &str, version_constraint: &str) -> PyResult<PyObject> {
    let val: Value = serde_json::from_str(registry_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("invalid JSON: {e}")))?;

    let registry = Registry::from_json(&val)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;

    let constraint = if version_constraint.is_empty() { None } else { Some(version_constraint) };
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
fn validate_lifecycle(from_status: &str, to_status: &str) -> PyResult<bool> {
    let from = parse_status_str(from_status)
        .ok_or_else(|| pyo3::exceptions::PyValueError::new_err(format!("unknown status: {from_status}")))?;
    let to = parse_status_str(to_status)
        .ok_or_else(|| pyo3::exceptions::PyValueError::new_err(format!("unknown status: {to_status}")))?;
    Ok(registry_client::validate_lifecycle_transition(from, to))
}

/// Construct the well-known registry URL for a base URL.
#[pyfunction]
fn well_known_url(base_url: &str) -> PyResult<String> {
    Ok(registry_client::well_known_url(base_url))
}

// ── Changelog ───────────────────────────────────────────────────

/// Diff two definition versions and produce a structured changelog.
///
/// Returns a dict with: definition_url, from_version, to_version, semver_impact, changes (list).
#[pyfunction]
fn generate_changelog(py: Python, old_def_json: &str, new_def_json: &str, definition_url: &str) -> PyResult<PyObject> {
    let old_def: Value = serde_json::from_str(old_def_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("invalid old definition JSON: {e}")))?;
    let new_def: Value = serde_json::from_str(new_def_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("invalid new definition JSON: {e}")))?;

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
        entry.set_item("before", c.before.as_ref().map(|v| json_to_python(py, v)).transpose()?)?;
        entry.set_item("after", c.after.as_ref().map(|v| json_to_python(py, v)).transpose()?)?;
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

// ── Mapping ─────────────────────────────────────────────────────

/// Execute a mapping document against source data.
///
/// Args:
///     doc_json: JSON string of the mapping document (with rules, defaults, autoMap)
///     source_json: JSON string of the source data
///     direction: "forward" or "reverse"
///
/// Returns a dict with: direction, output (dict), rules_applied (int), diagnostics (list).
#[pyfunction]
fn execute_mapping_doc(py: Python, doc_json: &str, source_json: &str, direction: &str) -> PyResult<PyObject> {
    let doc_val: Value = serde_json::from_str(doc_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("invalid mapping doc JSON: {e}")))?;
    let source: Value = serde_json::from_str(source_json)
        .map_err(|e| pyo3::exceptions::PyValueError::new_err(format!("invalid source JSON: {e}")))?;
    let dir = parse_direction(direction)?;

    let mapping_doc = parse_mapping_document(&doc_val)?;
    let result = runtime_mapping::execute_mapping_doc(&mapping_doc, &source, dir);

    let diagnostics = PyList::empty(py);
    for d in &result.diagnostics {
        let diag = PyDict::new(py);
        diag.set_item("rule_index", d.rule_index)?;
        diag.set_item("source_path", d.source_path.as_deref())?;
        diag.set_item("target_path", &d.target_path)?;
        diag.set_item("message", &d.message)?;
        diagnostics.append(diag)?;
    }

    let dict = PyDict::new(py);
    dict.set_item("direction", direction)?;
    dict.set_item("output", json_to_python(py, &result.output)?)?;
    dict.set_item("rules_applied", result.rules_applied)?;
    dict.set_item("diagnostics", diagnostics)?;

    Ok(dict.into())
}

// ── Python module ───────────────────────────────────────────────

/// formspec_rust — Native Rust implementation of Formspec processing.
#[pymodule]
fn formspec_rust(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(eval_fel, m)?)?;
    m.add_function(wrap_pyfunction!(parse_fel, m)?)?;
    m.add_function(wrap_pyfunction!(get_dependencies, m)?)?;
    m.add_function(wrap_pyfunction!(extract_deps, m)?)?;
    m.add_function(wrap_pyfunction!(analyze_expression, m)?)?;
    m.add_function(wrap_pyfunction!(detect_type, m)?)?;
    m.add_function(wrap_pyfunction!(lint_document, m)?)?;
    m.add_function(wrap_pyfunction!(evaluate_def, m)?)?;
    // Registry
    m.add_function(wrap_pyfunction!(parse_registry, m)?)?;
    m.add_function(wrap_pyfunction!(find_registry_entry, m)?)?;
    m.add_function(wrap_pyfunction!(validate_lifecycle, m)?)?;
    m.add_function(wrap_pyfunction!(well_known_url, m)?)?;
    // Changelog
    m.add_function(wrap_pyfunction!(generate_changelog, m)?)?;
    // Mapping
    m.add_function(wrap_pyfunction!(execute_mapping_doc, m)?)?;
    Ok(())
}

// ── Type conversion helpers ─────────────────────────────────────

fn pydict_to_field_map(py: Python, dict: &Bound<'_, PyDict>) -> PyResult<HashMap<String, FelValue>> {
    let mut map = HashMap::new();
    for (key, value) in dict.iter() {
        let k: String = key.extract()?;
        let v = python_to_fel(py, &value)?;
        map.insert(k, v);
    }
    Ok(map)
}

fn python_to_fel(py: Python, obj: &Bound<'_, PyAny>) -> PyResult<FelValue> {
    if obj.is_none() {
        return Ok(FelValue::Null);
    }
    if let Ok(b) = obj.extract::<bool>() {
        return Ok(FelValue::Boolean(b));
    }
    if let Ok(i) = obj.extract::<i64>() {
        return Ok(FelValue::Number(Decimal::from(i)));
    }
    if let Ok(f) = obj.extract::<f64>() {
        return Ok(FelValue::Number(
            Decimal::from_f64(f).unwrap_or(Decimal::ZERO),
        ));
    }
    if let Ok(s) = obj.extract::<String>() {
        return Ok(FelValue::String(s));
    }
    if let Ok(list) = obj.downcast::<PyList>() {
        let mut arr = Vec::new();
        for item in list.iter() {
            arr.push(python_to_fel(py, &item)?);
        }
        return Ok(FelValue::Array(arr));
    }
    if let Ok(dict) = obj.downcast::<PyDict>() {
        let mut entries = Vec::new();
        for (k, v) in dict.iter() {
            let key: String = k.extract()?;
            let val = python_to_fel(py, &v)?;
            entries.push((key, val));
        }
        return Ok(FelValue::Object(entries));
    }
    Ok(FelValue::Null)
}

fn fel_to_python(py: Python, val: &FelValue) -> PyResult<PyObject> {
    match val {
        FelValue::Null => Ok(py.None()),
        FelValue::Boolean(b) => Ok(PyBool::new(py, *b).to_owned().into_any().unbind()),
        FelValue::Number(n) => {
            if n.fract().is_zero() {
                if let Some(i) = n.to_i64() {
                    return Ok(i.into_pyobject(py)?.into_any().unbind());
                }
            }
            if let Some(f) = n.to_f64() {
                Ok(f.into_pyobject(py)?.into_any().unbind())
            } else {
                Ok(py.None())
            }
        }
        FelValue::String(s) => Ok(s.into_pyobject(py)?.into_any().unbind()),
        FelValue::Date(d) => Ok(d.format_iso().into_pyobject(py)?.into_any().unbind()),
        FelValue::Array(arr) => {
            let list = PyList::empty(py);
            for item in arr {
                list.append(fel_to_python(py, item)?)?;
            }
            Ok(list.into())
        }
        FelValue::Object(entries) => {
            let dict = PyDict::new(py);
            for (k, v) in entries {
                dict.set_item(k, fel_to_python(py, v)?)?;
            }
            Ok(dict.into())
        }
        FelValue::Money(m) => {
            let dict = PyDict::new(py);
            dict.set_item("amount", fel_to_python(py, &FelValue::Number(m.amount))?)?;
            dict.set_item("currency", &m.currency)?;
            Ok(dict.into())
        }
    }
}

fn json_to_python(py: Python, val: &Value) -> PyResult<PyObject> {
    match val {
        Value::Null => Ok(py.None()),
        Value::Bool(b) => Ok(PyBool::new(py, *b).to_owned().into_any().unbind()),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Ok(i.into_pyobject(py)?.into_any().unbind())
            } else if let Some(f) = n.as_f64() {
                Ok(f.into_pyobject(py)?.into_any().unbind())
            } else {
                Ok(py.None())
            }
        }
        Value::String(s) => Ok(s.into_pyobject(py)?.into_any().unbind()),
        Value::Array(arr) => {
            let list = PyList::empty(py);
            for item in arr {
                list.append(json_to_python(py, item)?)?;
            }
            Ok(list.into())
        }
        Value::Object(map) => {
            let dict = PyDict::new(py);
            for (k, v) in map {
                dict.set_item(k, json_to_python(py, v)?)?;
            }
            Ok(dict.into())
        }
    }
}

// ── Registry helpers ────────────────────────────────────────────

fn registry_entry_count(val: &Value) -> usize {
    val.get("entries")
        .and_then(|v| v.as_array())
        .map(|a| a.len())
        .unwrap_or(0)
}

fn parse_status_str(s: &str) -> Option<RegistryEntryStatus> {
    match s {
        "draft" => Some(RegistryEntryStatus::Draft),
        "stable" | "active" => Some(RegistryEntryStatus::Active),
        "deprecated" => Some(RegistryEntryStatus::Deprecated),
        "retired" => Some(RegistryEntryStatus::Retired),
        _ => None,
    }
}

fn status_str(s: RegistryEntryStatus) -> &'static str {
    match s {
        RegistryEntryStatus::Draft => "draft",
        RegistryEntryStatus::Active => "stable",
        RegistryEntryStatus::Deprecated => "deprecated",
        RegistryEntryStatus::Retired => "retired",
    }
}

fn category_str(c: registry_client::ExtensionCategory) -> &'static str {
    match c {
        registry_client::ExtensionCategory::DataType => "dataType",
        registry_client::ExtensionCategory::Function => "function",
        registry_client::ExtensionCategory::Constraint => "constraint",
        registry_client::ExtensionCategory::Property => "property",
        registry_client::ExtensionCategory::Namespace => "namespace",
    }
}

// ── Changelog helpers ───────────────────────────────────────────

fn change_type_str(ct: &changelog::ChangeType) -> &'static str {
    match ct {
        changelog::ChangeType::Added => "added",
        changelog::ChangeType::Removed => "removed",
        changelog::ChangeType::Modified => "modified",
    }
}

fn change_target_str(t: &changelog::ChangeTarget) -> &'static str {
    match t {
        changelog::ChangeTarget::Item => "item",
        changelog::ChangeTarget::Bind => "bind",
        changelog::ChangeTarget::Shape => "shape",
        changelog::ChangeTarget::OptionSet => "optionSet",
        changelog::ChangeTarget::DataSource => "dataSource",
        changelog::ChangeTarget::Screener => "screener",
        changelog::ChangeTarget::Migration => "migration",
        changelog::ChangeTarget::Metadata => "metadata",
    }
}

fn change_impact_str(i: changelog::ChangeImpact) -> &'static str {
    match i {
        changelog::ChangeImpact::Cosmetic => "cosmetic",
        changelog::ChangeImpact::Compatible => "compatible",
        changelog::ChangeImpact::Breaking => "breaking",
    }
}

fn semver_impact_str(i: changelog::SemverImpact) -> &'static str {
    match i {
        changelog::SemverImpact::Patch => "patch",
        changelog::SemverImpact::Minor => "minor",
        changelog::SemverImpact::Major => "major",
    }
}

// ── Mapping helpers ─────────────────────────────────────────────

fn parse_direction(s: &str) -> PyResult<runtime_mapping::MappingDirection> {
    match s {
        "forward" => Ok(runtime_mapping::MappingDirection::Forward),
        "reverse" => Ok(runtime_mapping::MappingDirection::Reverse),
        _ => Err(pyo3::exceptions::PyValueError::new_err(format!("invalid direction: {s}, expected 'forward' or 'reverse'"))),
    }
}

fn parse_mapping_document(val: &Value) -> PyResult<runtime_mapping::MappingDocument> {
    let obj = val.as_object()
        .ok_or_else(|| pyo3::exceptions::PyValueError::new_err("mapping doc must be an object"))?;

    let rules_val = obj.get("rules")
        .ok_or_else(|| pyo3::exceptions::PyValueError::new_err("mapping doc missing 'rules'"))?;
    let rules = parse_mapping_rules(rules_val)?;

    let defaults = obj.get("defaults")
        .and_then(|v| v.as_object())
        .cloned();

    let auto_map = obj.get("autoMap")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    Ok(runtime_mapping::MappingDocument {
        rules,
        defaults,
        auto_map,
    })
}

fn parse_mapping_rules(val: &Value) -> PyResult<Vec<runtime_mapping::MappingRule>> {
    let arr = val.as_array()
        .ok_or_else(|| pyo3::exceptions::PyValueError::new_err("rules must be an array"))?;

    let mut rules = Vec::new();
    for rule_val in arr {
        let obj = rule_val.as_object()
            .ok_or_else(|| pyo3::exceptions::PyValueError::new_err("rule must be an object"))?;

        let transform = match obj.get("transform").and_then(|v| v.as_str()).unwrap_or("preserve") {
            "preserve" => runtime_mapping::TransformType::Preserve,
            "drop" => runtime_mapping::TransformType::Drop,
            "constant" => runtime_mapping::TransformType::Constant(
                obj.get("value").cloned().unwrap_or(Value::Null),
            ),
            "coerce" => {
                let target = obj.get("coerce").and_then(|v| v.as_str()).unwrap_or("string");
                runtime_mapping::TransformType::Coerce(match target {
                    "number" => runtime_mapping::CoerceType::Number,
                    "integer" => runtime_mapping::CoerceType::Integer,
                    "boolean" => runtime_mapping::CoerceType::Boolean,
                    "date" => runtime_mapping::CoerceType::Date,
                    "datetime" => runtime_mapping::CoerceType::DateTime,
                    _ => runtime_mapping::CoerceType::String,
                })
            }
            "expression" => runtime_mapping::TransformType::Expression(
                obj.get("expression").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            ),
            "valueMap" => {
                let entries = obj.get("valueMap").and_then(|v| v.as_object());
                let forward: Vec<(Value, Value)> = entries
                    .map(|m| m.iter().map(|(k, v)| (Value::String(k.clone()), v.clone())).collect())
                    .unwrap_or_default();
                runtime_mapping::TransformType::ValueMap {
                    forward,
                    unmapped: match obj.get("unmapped").and_then(|v| v.as_str()) {
                        Some("error") => runtime_mapping::UnmappedStrategy::Error,
                        _ => runtime_mapping::UnmappedStrategy::PassThrough,
                    },
                }
            }
            "flatten" => runtime_mapping::TransformType::Flatten {
                separator: obj.get("separator").and_then(|v| v.as_str()).unwrap_or(".").to_string(),
            },
            "nest" => runtime_mapping::TransformType::Nest {
                separator: obj.get("separator").and_then(|v| v.as_str()).unwrap_or(".").to_string(),
            },
            "concat" => runtime_mapping::TransformType::Concat(
                obj.get("expression").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            ),
            "split" => runtime_mapping::TransformType::Split(
                obj.get("expression").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            ),
            other => return Err(pyo3::exceptions::PyValueError::new_err(format!("unknown transform type: {other}"))),
        };

        rules.push(runtime_mapping::MappingRule {
            source_path: obj.get("sourcePath").and_then(|v| v.as_str()).map(String::from),
            target_path: obj.get("targetPath").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            transform,
            condition: obj.get("condition").and_then(|v| v.as_str()).map(String::from),
            priority: obj.get("priority").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            reverse_priority: obj.get("reversePriority").and_then(|v| v.as_i64()).map(|n| n as i32),
            default: obj.get("default").cloned(),
            bidirectional: obj.get("bidirectional").and_then(|v| v.as_bool()).unwrap_or(true),
        });
    }
    Ok(rules)
}

// ── Tests ───────────────────────────────────────────────────────
//
// NOTE: PyO3 #[pyfunction] wrappers and type conversion helpers
// (python_to_fel, fel_to_python, json_to_python, pydict_to_field_map)
// require a live Python interpreter. They CANNOT be tested with `cargo test`.
// Those functions should be tested via Python-side integration tests in
// tests/conformance/ or tests/unit/ using `import formspec_rust`.
//
// What IS testable here: all pure-Rust helpers that do string↔enum mapping
// and serde_json::Value → domain struct parsing.
//
// Run with: cargo test -p formspec-py --no-default-features
// (The default "extension-module" feature disables Python linking for tests.)
//
// API surface gaps vs WASM sibling (crates/formspec-wasm):
// TODO: printFEL — pretty-print a parsed FEL AST back to source
// TODO: normalizeIndexedPath — normalize $field[0].sub paths
// TODO: lintDocumentWithRegistries — lint with registry context for extension resolution
// TODO: assembleDefinition — resolve $ref inclusions to produce self-contained definition
// TODO: executeMapping (rules-level) — execute raw MappingRule[] without document wrapper

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    // ── parse_status_str ────────────────────────────────────────

    /// Spec: extension-registry.llm.md line 25 — lifecycle states: draft, stable, deprecated, retired
    /// "draft" maps to Draft variant.
    #[test]
    fn parse_status_str_draft() {
        assert_eq!(parse_status_str("draft"), Some(RegistryEntryStatus::Draft));
    }

    /// Spec: extension-registry.llm.md line 25 — "stable" is the canonical wire name for Active
    #[test]
    fn parse_status_str_stable() {
        assert_eq!(parse_status_str("stable"), Some(RegistryEntryStatus::Active));
    }

    /// Spec: "active" is accepted as an alias for the Active/stable status.
    /// This is a binding-layer convenience — the spec uses "stable" but
    /// internal Rust enums use Active. Both wire names must resolve.
    #[test]
    fn parse_status_str_active_alias() {
        assert_eq!(parse_status_str("active"), Some(RegistryEntryStatus::Active));
    }

    /// Spec: extension-registry.llm.md line 25 — "deprecated" maps to Deprecated
    #[test]
    fn parse_status_str_deprecated() {
        assert_eq!(parse_status_str("deprecated"), Some(RegistryEntryStatus::Deprecated));
    }

    /// Spec: extension-registry.llm.md line 25 — "retired" maps to Retired
    #[test]
    fn parse_status_str_retired() {
        assert_eq!(parse_status_str("retired"), Some(RegistryEntryStatus::Retired));
    }

    /// Boundary: unknown status strings must return None (not panic).
    #[test]
    fn parse_status_str_unknown_returns_none() {
        assert_eq!(parse_status_str("experimental"), None);
        assert_eq!(parse_status_str(""), None);
        assert_eq!(parse_status_str("Draft"), None); // case-sensitive
        assert_eq!(parse_status_str("STABLE"), None);
    }

    // ── status_str (reverse of parse_status_str) ────────────────

    /// Spec: extension-registry.llm.md line 25 — Draft emits "draft"
    #[test]
    fn status_str_draft() {
        assert_eq!(status_str(RegistryEntryStatus::Draft), "draft");
    }

    /// Spec: Active emits "stable" (NOT "active") — this is the canonical wire name.
    /// Asymmetry: parse_status_str("active") → Active, but status_str(Active) → "stable".
    #[test]
    fn status_str_active_emits_stable() {
        assert_eq!(status_str(RegistryEntryStatus::Active), "stable");
    }

    /// Spec: Deprecated emits "deprecated"
    #[test]
    fn status_str_deprecated() {
        assert_eq!(status_str(RegistryEntryStatus::Deprecated), "deprecated");
    }

    /// Spec: Retired emits "retired"
    #[test]
    fn status_str_retired() {
        assert_eq!(status_str(RegistryEntryStatus::Retired), "retired");
    }

    /// Correctness: round-trip parse→emit for all canonical wire names.
    /// Documents the "active"→"stable" asymmetry: parse("active") → Active → "stable".
    #[test]
    fn status_roundtrip_canonical_names() {
        for name in &["draft", "stable", "deprecated", "retired"] {
            let parsed = parse_status_str(name).expect(name);
            assert_eq!(status_str(parsed), *name, "round-trip failed for {name}");
        }
    }

    /// Correctness: the "active" alias does NOT round-trip — it normalizes to "stable".
    #[test]
    fn status_active_alias_normalizes_to_stable() {
        let parsed = parse_status_str("active").unwrap();
        assert_eq!(status_str(parsed), "stable");
    }

    // ── category_str ────────────────────────────────────────────

    /// Spec: extension-registry.llm.md — registry entry categories
    #[test]
    fn category_str_all_variants() {
        assert_eq!(category_str(registry_client::ExtensionCategory::DataType), "dataType");
        assert_eq!(category_str(registry_client::ExtensionCategory::Function), "function");
        assert_eq!(category_str(registry_client::ExtensionCategory::Constraint), "constraint");
        assert_eq!(category_str(registry_client::ExtensionCategory::Property), "property");
        assert_eq!(category_str(registry_client::ExtensionCategory::Namespace), "namespace");
    }

    // ── change_type_str ─────────────────────────────────────────

    /// Spec: changelog-spec — change types: added, removed, modified
    #[test]
    fn change_type_str_all_variants() {
        assert_eq!(change_type_str(&changelog::ChangeType::Added), "added");
        assert_eq!(change_type_str(&changelog::ChangeType::Removed), "removed");
        assert_eq!(change_type_str(&changelog::ChangeType::Modified), "modified");
    }

    // ── change_target_str ───────────────────────────────────────

    /// Spec: changelog-spec — change targets cover all definition subsystems
    #[test]
    fn change_target_str_all_variants() {
        assert_eq!(change_target_str(&changelog::ChangeTarget::Item), "item");
        assert_eq!(change_target_str(&changelog::ChangeTarget::Bind), "bind");
        assert_eq!(change_target_str(&changelog::ChangeTarget::Shape), "shape");
        assert_eq!(change_target_str(&changelog::ChangeTarget::OptionSet), "optionSet");
        assert_eq!(change_target_str(&changelog::ChangeTarget::DataSource), "dataSource");
        assert_eq!(change_target_str(&changelog::ChangeTarget::Screener), "screener");
        assert_eq!(change_target_str(&changelog::ChangeTarget::Migration), "migration");
        assert_eq!(change_target_str(&changelog::ChangeTarget::Metadata), "metadata");
    }

    // ── change_impact_str ───────────────────────────────────────

    /// Spec: changelog-spec — impact levels for semver classification
    #[test]
    fn change_impact_str_all_variants() {
        assert_eq!(change_impact_str(changelog::ChangeImpact::Cosmetic), "cosmetic");
        assert_eq!(change_impact_str(changelog::ChangeImpact::Compatible), "compatible");
        assert_eq!(change_impact_str(changelog::ChangeImpact::Breaking), "breaking");
    }

    // ── semver_impact_str ───────────────────────────────────────

    /// Spec: changelog-spec — semver bump classification
    #[test]
    fn semver_impact_str_all_variants() {
        assert_eq!(semver_impact_str(changelog::SemverImpact::Patch), "patch");
        assert_eq!(semver_impact_str(changelog::SemverImpact::Minor), "minor");
        assert_eq!(semver_impact_str(changelog::SemverImpact::Major), "major");
    }

    // ── parse_direction ─────────────────────────────────────────

    /// Spec: mapping-spec.md §2 — forward mapping: Response → External
    #[test]
    fn parse_direction_forward() {
        let dir = parse_direction("forward").unwrap();
        assert!(matches!(dir, runtime_mapping::MappingDirection::Forward));
    }

    /// Spec: mapping-spec.md §2 — reverse mapping: External → Response
    #[test]
    fn parse_direction_reverse() {
        let dir = parse_direction("reverse").unwrap();
        assert!(matches!(dir, runtime_mapping::MappingDirection::Reverse));
    }

    /// Boundary: invalid direction strings must produce PyValueError
    #[test]
    fn parse_direction_invalid_returns_err() {
        assert!(parse_direction("").is_err());
        assert!(parse_direction("both").is_err());
        assert!(parse_direction("Forward").is_err()); // case-sensitive
    }

    /// Correctness: invalid direction returns Err (message inspection requires Python GIL)
    #[test]
    fn parse_direction_error_for_invalid_input() {
        // NOTE: Cannot inspect PyErr message without a live Python interpreter.
        // The error message formatting is tested via Python-side integration tests.
        assert!(parse_direction("sideways").is_err());
        assert!(parse_direction("backwards").is_err());
    }

    // ── registry_entry_count ────────────────────────────────────

    /// Correctness: counts entries array length from a registry JSON value
    #[test]
    fn registry_entry_count_with_entries() {
        let val = json!({
            "entries": [
                {"name": "x-ext-a"},
                {"name": "x-ext-b"},
                {"name": "x-ext-c"}
            ]
        });
        assert_eq!(registry_entry_count(&val), 3);
    }

    /// Boundary: missing "entries" key returns 0
    #[test]
    fn registry_entry_count_missing_key() {
        let val = json!({"publisher": {}});
        assert_eq!(registry_entry_count(&val), 0);
    }

    /// Boundary: "entries" is not an array returns 0
    #[test]
    fn registry_entry_count_not_array() {
        let val = json!({"entries": "not an array"});
        assert_eq!(registry_entry_count(&val), 0);
    }

    /// Boundary: empty entries array returns 0
    #[test]
    fn registry_entry_count_empty_array() {
        let val = json!({"entries": []});
        assert_eq!(registry_entry_count(&val), 0);
    }

    // ── parse_mapping_rules ─────────────────────────────────────

    /// Spec: mapping-spec.md §3.3 — minimal preserve rule with defaults
    #[test]
    fn parse_mapping_rules_minimal_preserve() {
        let rules_json = json!([{
            "sourcePath": "name",
            "targetPath": "full_name"
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        assert_eq!(rules.len(), 1);
        assert_eq!(rules[0].source_path.as_deref(), Some("name"));
        assert_eq!(rules[0].target_path, "full_name");
        assert!(matches!(rules[0].transform, runtime_mapping::TransformType::Preserve));
        // Defaults
        assert_eq!(rules[0].priority, 0);
        assert!(rules[0].reverse_priority.is_none());
        assert!(rules[0].default.is_none());
        assert!(rules[0].condition.is_none());
        assert!(rules[0].bidirectional); // default true per spec
    }

    /// Spec: mapping-spec.md — transform "drop" explicitly excludes a field
    #[test]
    fn parse_mapping_rules_drop_transform() {
        let rules_json = json!([{
            "sourcePath": "internal_id",
            "targetPath": "id",
            "transform": "drop"
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        assert!(matches!(rules[0].transform, runtime_mapping::TransformType::Drop));
    }

    /// Spec: mapping-spec.md — transform "constant" injects a literal value
    #[test]
    fn parse_mapping_rules_constant_transform() {
        let rules_json = json!([{
            "targetPath": "version",
            "transform": "constant",
            "value": "1.0"
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Constant(v) => {
                assert_eq!(v, &json!("1.0"));
            }
            other => panic!("expected Constant, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — constant with no "value" key defaults to null
    #[test]
    fn parse_mapping_rules_constant_missing_value_defaults_null() {
        let rules_json = json!([{
            "targetPath": "cleared",
            "transform": "constant"
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Constant(v) => {
                assert_eq!(v, &Value::Null);
            }
            other => panic!("expected Constant(Null), got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — coerce transform with each target type
    #[test]
    fn parse_mapping_rules_coerce_all_types() {
        let types_and_expected = [
            ("string", runtime_mapping::CoerceType::String),
            ("number", runtime_mapping::CoerceType::Number),
            ("integer", runtime_mapping::CoerceType::Integer),
            ("boolean", runtime_mapping::CoerceType::Boolean),
            ("date", runtime_mapping::CoerceType::Date),
            ("datetime", runtime_mapping::CoerceType::DateTime),
        ];
        for (coerce_str, expected) in &types_and_expected {
            let rules_json = json!([{
                "sourcePath": "val",
                "targetPath": "out",
                "transform": "coerce",
                "coerce": coerce_str
            }]);
            let rules = parse_mapping_rules(&rules_json).unwrap();
            match &rules[0].transform {
                runtime_mapping::TransformType::Coerce(ct) => {
                    assert_eq!(ct, expected, "coerce type mismatch for '{coerce_str}'");
                }
                other => panic!("expected Coerce for '{coerce_str}', got {:?}", other),
            }
        }
    }

    /// Boundary: coerce with unknown type falls back to String
    #[test]
    fn parse_mapping_rules_coerce_unknown_defaults_to_string() {
        let rules_json = json!([{
            "sourcePath": "val",
            "targetPath": "out",
            "transform": "coerce",
            "coerce": "timestamp"
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Coerce(ct) => {
                assert_eq!(*ct, runtime_mapping::CoerceType::String);
            }
            other => panic!("expected Coerce(String) fallback, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — expression transform with FEL expression
    #[test]
    fn parse_mapping_rules_expression_transform() {
        let rules_json = json!([{
            "sourcePath": "first",
            "targetPath": "greeting",
            "transform": "expression",
            "expression": "concat('Hello, ', $)"
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Expression(expr) => {
                assert_eq!(expr, "concat('Hello, ', $)");
            }
            other => panic!("expected Expression, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — valueMap transform with lookup table
    #[test]
    fn parse_mapping_rules_value_map_transform() {
        let rules_json = json!([{
            "sourcePath": "status",
            "targetPath": "code",
            "transform": "valueMap",
            "valueMap": {
                "active": "A",
                "inactive": "I"
            }
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::ValueMap { forward, unmapped } => {
                assert_eq!(forward.len(), 2);
                assert!(matches!(unmapped, runtime_mapping::UnmappedStrategy::PassThrough));
            }
            other => panic!("expected ValueMap, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — valueMap with unmapped: "error"
    #[test]
    fn parse_mapping_rules_value_map_unmapped_error() {
        let rules_json = json!([{
            "sourcePath": "status",
            "targetPath": "code",
            "transform": "valueMap",
            "valueMap": {"yes": "Y"},
            "unmapped": "error"
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::ValueMap { unmapped, .. } => {
                assert!(matches!(unmapped, runtime_mapping::UnmappedStrategy::Error));
            }
            other => panic!("expected ValueMap with Error strategy, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — flatten transform with separator
    #[test]
    fn parse_mapping_rules_flatten_transform() {
        let rules_json = json!([{
            "sourcePath": "address",
            "targetPath": "address_flat",
            "transform": "flatten",
            "separator": "_"
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Flatten { separator } => {
                assert_eq!(separator, "_");
            }
            other => panic!("expected Flatten, got {:?}", other),
        }
    }

    /// Boundary: flatten with no separator defaults to "."
    #[test]
    fn parse_mapping_rules_flatten_default_separator() {
        let rules_json = json!([{
            "sourcePath": "address",
            "targetPath": "address_flat",
            "transform": "flatten"
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Flatten { separator } => {
                assert_eq!(separator, ".");
            }
            other => panic!("expected Flatten with default separator, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — nest transform (inverse of flatten)
    #[test]
    fn parse_mapping_rules_nest_transform() {
        let rules_json = json!([{
            "sourcePath": "address_flat",
            "targetPath": "address",
            "transform": "nest",
            "separator": "_"
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Nest { separator } => {
                assert_eq!(separator, "_");
            }
            other => panic!("expected Nest, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — concat transform with FEL expression
    #[test]
    fn parse_mapping_rules_concat_transform() {
        let rules_json = json!([{
            "sourcePath": "parts",
            "targetPath": "full",
            "transform": "concat",
            "expression": "join($, ' ')"
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Concat(expr) => {
                assert_eq!(expr, "join($, ' ')");
            }
            other => panic!("expected Concat, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — split transform with FEL expression
    #[test]
    fn parse_mapping_rules_split_transform() {
        let rules_json = json!([{
            "sourcePath": "full",
            "targetPath": "parts",
            "transform": "split",
            "expression": "split($, ' ')"
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Split(expr) => {
                assert_eq!(expr, "split($, ' ')");
            }
            other => panic!("expected Split, got {:?}", other),
        }
    }

    /// Boundary: unknown transform type produces error
    #[test]
    fn parse_mapping_rules_unknown_transform_errors() {
        let rules_json = json!([{
            "sourcePath": "a",
            "targetPath": "b",
            "transform": "magic"
        }]);
        // NOTE: Cannot inspect PyErr message without a live Python interpreter.
        // The error content is tested via Python-side integration tests.
        assert!(parse_mapping_rules(&rules_json).is_err());
    }

    /// Boundary: rules must be an array
    #[test]
    fn parse_mapping_rules_not_array_errors() {
        let rules_json = json!({"not": "array"});
        assert!(parse_mapping_rules(&rules_json).is_err());
    }

    /// Boundary: each rule must be an object
    #[test]
    fn parse_mapping_rules_rule_not_object_errors() {
        let rules_json = json!(["not an object"]);
        assert!(parse_mapping_rules(&rules_json).is_err());
    }

    /// Correctness: all optional fields parsed when present
    #[test]
    fn parse_mapping_rules_full_rule_with_all_fields() {
        let rules_json = json!([{
            "sourcePath": "income",
            "targetPath": "annual_income",
            "transform": "preserve",
            "condition": "$income > 0",
            "priority": 10,
            "reversePriority": 5,
            "default": 0,
            "bidirectional": false
        }]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        let r = &rules[0];
        assert_eq!(r.source_path.as_deref(), Some("income"));
        assert_eq!(r.target_path, "annual_income");
        assert!(matches!(r.transform, runtime_mapping::TransformType::Preserve));
        assert_eq!(r.condition.as_deref(), Some("$income > 0"));
        assert_eq!(r.priority, 10);
        assert_eq!(r.reverse_priority, Some(5));
        assert_eq!(r.default, Some(json!(0)));
        assert!(!r.bidirectional);
    }

    /// Correctness: multiple rules parsed in order
    #[test]
    fn parse_mapping_rules_multiple_rules_preserved_order() {
        let rules_json = json!([
            {"sourcePath": "a", "targetPath": "x"},
            {"sourcePath": "b", "targetPath": "y"},
            {"sourcePath": "c", "targetPath": "z"}
        ]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        assert_eq!(rules.len(), 3);
        assert_eq!(rules[0].source_path.as_deref(), Some("a"));
        assert_eq!(rules[1].source_path.as_deref(), Some("b"));
        assert_eq!(rules[2].source_path.as_deref(), Some("c"));
    }

    /// Boundary: empty rules array is valid
    #[test]
    fn parse_mapping_rules_empty_array() {
        let rules_json = json!([]);
        let rules = parse_mapping_rules(&rules_json).unwrap();
        assert!(rules.is_empty());
    }

    // ── parse_mapping_document ──────────────────────────────────

    /// Spec: mapping-spec.md §3 — minimal valid mapping document
    #[test]
    fn parse_mapping_document_minimal() {
        let doc = json!({
            "rules": [
                {"sourcePath": "a", "targetPath": "b"}
            ]
        });
        let result = parse_mapping_document(&doc).unwrap();
        assert_eq!(result.rules.len(), 1);
        assert!(!result.auto_map); // default false
        assert!(result.defaults.is_none());
    }

    /// Spec: mapping-spec.md line 599 — autoMap: true generates synthetic preserve rules
    #[test]
    fn parse_mapping_document_with_auto_map() {
        let doc = json!({
            "rules": [],
            "autoMap": true
        });
        let result = parse_mapping_document(&doc).unwrap();
        assert!(result.auto_map);
    }

    /// Correctness: defaults object is preserved
    #[test]
    fn parse_mapping_document_with_defaults() {
        let doc = json!({
            "rules": [],
            "defaults": {
                "version": "2.0",
                "source": "formspec"
            }
        });
        let result = parse_mapping_document(&doc).unwrap();
        let defaults = result.defaults.as_ref().expect("defaults should be present");
        assert_eq!(defaults.get("version"), Some(&json!("2.0")));
        assert_eq!(defaults.get("source"), Some(&json!("formspec")));
    }

    /// Boundary: missing "rules" key produces error
    #[test]
    fn parse_mapping_document_missing_rules_errors() {
        let doc = json!({"autoMap": true});
        assert!(parse_mapping_document(&doc).is_err());
    }

    /// Boundary: non-object input produces error
    #[test]
    fn parse_mapping_document_not_object_errors() {
        let doc = json!("not an object");
        assert!(parse_mapping_document(&doc).is_err());
    }

    /// Boundary: defaults that is not an object is silently ignored (returns None)
    #[test]
    fn parse_mapping_document_defaults_not_object_ignored() {
        let doc = json!({
            "rules": [],
            "defaults": "not an object"
        });
        let result = parse_mapping_document(&doc).unwrap();
        assert!(result.defaults.is_none());
    }

    // ── Integration: parse_mapping_document + parse_mapping_rules ─

    /// Spec: mapping-spec.md §6 example — complete mapping document with mixed transforms
    #[test]
    fn parse_mapping_document_complex_example() {
        let doc = json!({
            "rules": [
                {
                    "sourcePath": "patient.name",
                    "targetPath": "full_name",
                    "transform": "preserve"
                },
                {
                    "sourcePath": "patient.dob",
                    "targetPath": "date_of_birth",
                    "transform": "coerce",
                    "coerce": "date"
                },
                {
                    "targetPath": "system_version",
                    "transform": "constant",
                    "value": "3.1"
                },
                {
                    "sourcePath": "patient.status",
                    "targetPath": "status_code",
                    "transform": "valueMap",
                    "valueMap": {
                        "active": "A",
                        "inactive": "I",
                        "deceased": "D"
                    },
                    "unmapped": "error"
                }
            ],
            "autoMap": false,
            "defaults": {
                "format": "HL7"
            }
        });
        let result = parse_mapping_document(&doc).unwrap();
        assert_eq!(result.rules.len(), 4);
        assert!(!result.auto_map);
        assert!(result.defaults.is_some());

        // Verify each rule parsed to the correct transform type
        assert!(matches!(result.rules[0].transform, runtime_mapping::TransformType::Preserve));
        assert!(matches!(result.rules[1].transform, runtime_mapping::TransformType::Coerce(runtime_mapping::CoerceType::Date)));
        assert!(matches!(result.rules[2].transform, runtime_mapping::TransformType::Constant(_)));
        assert!(matches!(result.rules[3].transform, runtime_mapping::TransformType::ValueMap { .. }));
    }

    // ────────────────────────────────────────────────────────────
    // Untestable functions — require Python interpreter
    // ────────────────────────────────────────────────────────────
    //
    // The following functions use PyO3 types (Python<'_>, PyObject, Bound<'_, PyDict>)
    // and cannot be tested without a live Python interpreter:
    //
    // python_to_fel(py, obj) → FelValue
    //   TODO: Test that bool is extracted BEFORE int (Python bool subclasses int).
    //         Test None → Null, int → Number(Decimal), float → Number(Decimal),
    //         str → String, list → Array, dict → Object, unknown → Null.
    //         Write as: `python3 -m pytest tests/unit/test_rust_bindings.py`
    //
    // fel_to_python(py, val) → PyObject
    //   TODO: Test Number with zero fract → int, non-zero fract → float,
    //         Date → ISO string, Money → dict with amount + currency,
    //         Array → list, Object → dict, Null → None.
    //
    // json_to_python(py, val) → PyObject
    //   TODO: Test all JSON types map correctly. Number edge cases:
    //         i64-representable → int, f64-representable → float, neither → None.
    //
    // pydict_to_field_map(py, dict) → HashMap<String, FelValue>
    //   TODO: Test mixed-type dict, empty dict, nested structures.
    //
    // All #[pyfunction]s (eval_fel, parse_fel, get_dependencies, extract_deps,
    // analyze_expression, detect_type, lint_document, evaluate_def,
    // parse_registry, find_registry_entry, validate_lifecycle, well_known_url,
    // generate_changelog, execute_mapping_doc):
    //   These are thin wrappers that delegate to sibling crates.
    //   The underlying logic is tested in those crates.
    //   Python-side tests should verify the binding boundary:
    //   correct argument passing, error propagation, and return type mapping.
}
