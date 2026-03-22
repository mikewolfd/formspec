//! Mapping document parsing and `execute_mapping_doc` PyO3 binding.

use pyo3::prelude::*;
use pyo3::types::{PyDict, PyList};
use serde_json::Value;

use formspec_core::runtime_mapping;

use crate::convert::{depythonize_json, json_to_python};
use crate::PyObject;

pub(crate) fn parse_direction(s: &str) -> PyResult<runtime_mapping::MappingDirection> {
    match s {
        "forward" => Ok(runtime_mapping::MappingDirection::Forward),
        "reverse" => Ok(runtime_mapping::MappingDirection::Reverse),
        _ => Err(pyo3::exceptions::PyValueError::new_err(format!(
            "invalid direction: {s}, expected 'forward' or 'reverse'"
        ))),
    }
}

pub(crate) fn parse_mapping_document(val: &Value) -> PyResult<runtime_mapping::MappingDocument> {
    parse_mapping_document_inner(val).map_err(pyo3::exceptions::PyValueError::new_err)
}

// ── Testable inner functions (no PyO3 dependency) ───────────────

/// Parse a coerce type from a JSON value.
///
/// Accepts both string shorthand (`"number"`) and object form (`{"from": "string", "to": "number"}`).
/// Returns `None` for unknown type strings, non-string/non-object inputs, or object form missing `"to"`.
///
/// Note: The object form `"from"` field is accepted but ignored — coercion target is all that matters
/// for the runtime. The `from` field is informational for documentation/validation purposes only.
pub(crate) fn parse_coerce_type(val: &Value) -> Option<runtime_mapping::CoerceType> {
    match val {
        Value::String(s) => coerce_type_from_str(s),
        Value::Object(obj) => obj
            .get("to")
            .and_then(|v| v.as_str())
            .and_then(coerce_type_from_str),
        _ => None,
    }
}

/// Map a coerce type name string to the enum variant.
fn coerce_type_from_str(s: &str) -> Option<runtime_mapping::CoerceType> {
    match s {
        "string" => Some(runtime_mapping::CoerceType::String),
        "number" => Some(runtime_mapping::CoerceType::Number),
        "integer" => Some(runtime_mapping::CoerceType::Integer),
        "boolean" => Some(runtime_mapping::CoerceType::Boolean),
        "date" => Some(runtime_mapping::CoerceType::Date),
        "datetime" => Some(runtime_mapping::CoerceType::DateTime),
        "array" => Some(runtime_mapping::CoerceType::Array),
        _ => None,
    }
}

/// Parse a mapping document from a JSON value. Returns `Err(String)` on failure.
pub(crate) fn parse_mapping_document_inner(val: &Value) -> Result<runtime_mapping::MappingDocument, String> {
    let obj = val
        .as_object()
        .ok_or_else(|| "mapping doc must be an object".to_string())?;

    let rules_val = obj
        .get("rules")
        .ok_or_else(|| "mapping doc missing 'rules'".to_string())?;
    let rules = parse_mapping_rules_inner(rules_val)?;

    let defaults = obj.get("defaults").and_then(|v| v.as_object()).cloned();

    let auto_map = obj
        .get("autoMap")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    Ok(runtime_mapping::MappingDocument {
        rules,
        defaults,
        auto_map,
    })
}

/// Parse an array descriptor from a rule object.
fn parse_array_descriptor(
    obj: &serde_json::Map<String, Value>,
    rule_idx: usize,
) -> Result<Option<runtime_mapping::ArrayDescriptor>, String> {
    let arr_val = match obj.get("array") {
        Some(v) => v,
        None => return Ok(None),
    };
    let arr_obj = arr_val
        .as_object()
        .ok_or_else(|| format!("rule[{rule_idx}]: 'array' must be an object"))?;

    let mode = match arr_obj.get("mode").and_then(|v| v.as_str()) {
        Some("each") => runtime_mapping::ArrayMode::Each,
        Some("indexed") => runtime_mapping::ArrayMode::Indexed,
        Some("whole") | None => runtime_mapping::ArrayMode::Whole,
        Some(other) => {
            return Err(format!(
                "rule[{rule_idx}]: unknown array mode: {other}"
            ))
        }
    };

    let inner_rules = if let Some(inner_val) = arr_obj.get("innerRules") {
        parse_inner_rules(inner_val, rule_idx, mode)?
    } else {
        vec![]
    };

    Ok(Some(runtime_mapping::ArrayDescriptor { mode, inner_rules }))
}

/// Parse innerRules for array descriptors — reuses the main rule parser,
/// then patches indexed-mode rules to use `index` as sourcePath.
fn parse_inner_rules(
    val: &Value,
    _parent_idx: usize,
    mode: runtime_mapping::ArrayMode,
) -> Result<Vec<runtime_mapping::MappingRule>, String> {
    let mut rules = parse_mapping_rules_inner(val)?;
    if mode == runtime_mapping::ArrayMode::Indexed {
        let empty = vec![];
        let arr = val.as_array().unwrap_or(&empty);
        for (i, rule) in rules.iter_mut().enumerate() {
            if let Some(idx) = arr.get(i)
                .and_then(|v| v.as_object())
                .and_then(|obj| obj.get("index"))
                .and_then(|v| v.as_u64())
            {
                // Combine index with existing sourcePath: "0.phaseName"
                rule.source_path = match &rule.source_path {
                    Some(sp) if !sp.is_empty() => Some(format!("{idx}.{sp}")),
                    _ => Some(idx.to_string()),
                };
            }
        }
    }
    Ok(rules)
}

/// Parse a reverse-direction transform override from a rule object.
fn parse_reverse_override(
    obj: &serde_json::Map<String, Value>,
    rule_idx: usize,
) -> Result<Option<Box<runtime_mapping::ReverseOverride>>, String> {
    let rev_val = match obj.get("reverse") {
        Some(v) => v,
        None => return Ok(None),
    };
    let rev_obj = rev_val
        .as_object()
        .ok_or_else(|| format!("rule[{rule_idx}]: 'reverse' must be an object"))?;

    let transform_str = rev_obj
        .get("transform")
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("rule[{rule_idx}]: reverse override requires 'transform'"))?;

    let transform = match transform_str {
        "expression" => {
            let expr = rev_obj
                .get("expression")
                .and_then(|v| v.as_str())
                .ok_or_else(|| {
                    format!("rule[{rule_idx}]: reverse 'expression' transform requires 'expression'")
                })?;
            runtime_mapping::TransformType::Expression(expr.to_string())
        }
        "preserve" => runtime_mapping::TransformType::Preserve,
        "constant" => {
            let expr = rev_obj
                .get("expression")
                .and_then(|v| v.as_str())
                .ok_or_else(|| {
                    format!("rule[{rule_idx}]: reverse 'constant' transform requires 'expression'")
                })?;
            runtime_mapping::TransformType::Expression(expr.to_string())
        }
        "valueMap" => {
            let vm = rev_obj.get("valueMap").and_then(|v| v.as_object());
            let (forward, unmapped_strategy) = if let Some(m) = vm {
                if let Some(fwd_val) = m.get("forward") {
                    let fwd: Vec<(Value, Value)> = fwd_val
                        .as_object()
                        .map(|fwd_map| {
                            fwd_map.iter()
                                .map(|(k, v)| (Value::String(k.clone()), v.clone()))
                                .collect()
                        })
                        .unwrap_or_default();
                    let strategy = match m.get("unmapped").and_then(|v| v.as_str()) {
                        Some("error") => runtime_mapping::UnmappedStrategy::Error,
                        Some("drop") => runtime_mapping::UnmappedStrategy::Drop,
                        Some("default") => runtime_mapping::UnmappedStrategy::Default,
                        _ => runtime_mapping::UnmappedStrategy::PassThrough,
                    };
                    (fwd, strategy)
                } else {
                    let fwd: Vec<(Value, Value)> = m.iter()
                        .map(|(k, v)| (Value::String(k.clone()), v.clone()))
                        .collect();
                    (fwd, runtime_mapping::UnmappedStrategy::PassThrough)
                }
            } else {
                (vec![], runtime_mapping::UnmappedStrategy::PassThrough)
            };
            runtime_mapping::TransformType::ValueMap { forward, unmapped: unmapped_strategy }
        }
        "coerce" => {
            let coerce_val = rev_obj.get("coerce").ok_or_else(|| {
                format!("rule[{rule_idx}]: reverse 'coerce' requires 'coerce' property")
            })?;
            let coerce_type = parse_coerce_type(coerce_val)
                .ok_or_else(|| format!("rule[{rule_idx}]: invalid reverse coerce value"))?;
            runtime_mapping::TransformType::Coerce(coerce_type)
        }
        "concat" => {
            let expr = rev_obj
                .get("expression")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("rule[{rule_idx}]: reverse 'concat' requires 'expression'"))?;
            runtime_mapping::TransformType::Concat(expr.to_string())
        }
        "split" => {
            let expr = rev_obj
                .get("expression")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("rule[{rule_idx}]: reverse 'split' requires 'expression'"))?;
            runtime_mapping::TransformType::Split(expr.to_string())
        }
        "flatten" => runtime_mapping::TransformType::Flatten {
            separator: rev_obj
                .get("separator")
                .and_then(|v| v.as_str())
                .unwrap_or(".")
                .to_string(),
        },
        "nest" => runtime_mapping::TransformType::Nest {
            separator: rev_obj
                .get("separator")
                .and_then(|v| v.as_str())
                .unwrap_or(".")
                .to_string(),
        },
        "drop" => runtime_mapping::TransformType::Drop,
        other => {
            return Err(format!(
                "rule[{rule_idx}]: unsupported reverse transform: {other}"
            ))
        }
    };

    Ok(Some(Box::new(runtime_mapping::ReverseOverride { transform })))
}

/// Core mapping-rule parser returning `Result<_, String>` for testability without FFI.
pub(crate) fn parse_mapping_rules_inner(val: &Value) -> Result<Vec<runtime_mapping::MappingRule>, String> {
    let arr = val
        .as_array()
        .ok_or_else(|| "rules must be an array".to_string())?;

    let mut rules = Vec::new();
    for (i, rule_val) in arr.iter().enumerate() {
        let obj = rule_val
            .as_object()
            .ok_or_else(|| format!("rule[{i}]: must be an object"))?;

        // transform is REQUIRED (mapping.schema.json FieldRule.required)
        let transform_str = obj
            .get("transform")
            .and_then(|v| v.as_str())
            .ok_or_else(|| format!("rule[{i}]: missing required field 'transform'"))?;

        // Extra default from full-form valueMap (populated in the valueMap arm)
        let mut vm_default: Option<Value> = None;

        let transform = match transform_str {
            "preserve" => runtime_mapping::TransformType::Preserve,
            "drop" => runtime_mapping::TransformType::Drop,
            "constant" => {
                let expr = obj
                    .get("expression")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| {
                        format!("rule[{i}]: transform 'constant' requires 'expression'")
                    })?;
                // Evaluate the expression at runtime via Expression transform,
                // since Constant(Value) returns the value literally.
                runtime_mapping::TransformType::Expression(expr.to_string())
            }
            "coerce" => {
                let coerce_val = obj.get("coerce").ok_or_else(|| {
                    format!("rule[{i}]: transform 'coerce' requires 'coerce' property")
                })?;
                let coerce_type = parse_coerce_type(coerce_val)
                    .ok_or_else(|| format!("rule[{i}]: invalid coerce value"))?;
                runtime_mapping::TransformType::Coerce(coerce_type)
            }
            "expression" => {
                let expr = obj
                    .get("expression")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| {
                        format!("rule[{i}]: transform 'expression' requires 'expression'")
                    })?;
                runtime_mapping::TransformType::Expression(expr.to_string())
            }
            "valueMap" => {
                let vm = obj.get("valueMap").and_then(|v| v.as_object());
                // Detect full-form valueMap (has a "forward" key) vs shorthand (flat map)
                let (forward, unmapped_strategy) = if let Some(m) = vm {
                    if let Some(fwd_val) = m.get("forward") {
                        // Full-form: { "forward": {...}, "unmapped": "...", "default": "..." }
                        let fwd: Vec<(Value, Value)> = fwd_val
                            .as_object()
                            .map(|fwd_map| {
                                fwd_map
                                    .iter()
                                    .map(|(k, v)| (Value::String(k.clone()), v.clone()))
                                    .collect()
                            })
                            .unwrap_or_default();
                        let strategy = match m.get("unmapped").and_then(|v| v.as_str()) {
                            Some("error") => runtime_mapping::UnmappedStrategy::Error,
                            Some("drop") => runtime_mapping::UnmappedStrategy::Drop,
                            Some("default") => runtime_mapping::UnmappedStrategy::Default,
                            Some("passthrough") => runtime_mapping::UnmappedStrategy::PassThrough,
                            _ => runtime_mapping::UnmappedStrategy::PassThrough,
                        };
                        (fwd, strategy)
                    } else {
                        // Shorthand: flat key-value map
                        let fwd: Vec<(Value, Value)> = m
                            .iter()
                            .map(|(k, v)| (Value::String(k.clone()), v.clone()))
                            .collect();
                        (fwd, runtime_mapping::UnmappedStrategy::PassThrough)
                    }
                } else {
                    (vec![], runtime_mapping::UnmappedStrategy::PassThrough)
                };
                // Full-form may have a default value for unmapped strategy
                vm_default = vm
                    .and_then(|m| m.get("default"))
                    .cloned();
                runtime_mapping::TransformType::ValueMap {
                    forward,
                    unmapped: unmapped_strategy,
                }
            }
            "flatten" => runtime_mapping::TransformType::Flatten {
                separator: obj
                    .get("separator")
                    .and_then(|v| v.as_str())
                    .unwrap_or(".")
                    .to_string(),
            },
            "nest" => runtime_mapping::TransformType::Nest {
                separator: obj
                    .get("separator")
                    .and_then(|v| v.as_str())
                    .unwrap_or(".")
                    .to_string(),
            },
            "concat" => {
                let expr = obj
                    .get("expression")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| {
                        format!("rule[{i}]: transform 'concat' requires 'expression'")
                    })?;
                runtime_mapping::TransformType::Concat(expr.to_string())
            }
            "split" => {
                let expr = obj
                    .get("expression")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| format!("rule[{i}]: transform 'split' requires 'expression'"))?;
                runtime_mapping::TransformType::Split(expr.to_string())
            }
            other => return Err(format!("rule[{i}]: unknown transform type: {other}")),
        };

        // At least one of sourcePath or targetPath MUST be present (mapping.schema.json FieldRule.anyOf)
        let source_path = obj
            .get("sourcePath")
            .and_then(|v| v.as_str())
            .map(String::from);
        let target_path = obj
            .get("targetPath")
            .and_then(|v| v.as_str())
            .map(String::from);
        if source_path.is_none() && target_path.is_none() {
            return Err(format!(
                "rule[{i}]: at least one of 'sourcePath' or 'targetPath' must be present"
            ));
        }

        rules.push(runtime_mapping::MappingRule {
            source_path,
            target_path: target_path.unwrap_or_default(),
            transform,
            condition: obj
                .get("condition")
                .and_then(|v| v.as_str())
                .map(String::from),
            priority: obj
                .get("priority")
                .and_then(|v| v.as_i64())
                .and_then(|n| i32::try_from(n).ok())
                .unwrap_or(0),
            reverse_priority: obj
                .get("reversePriority")
                .and_then(|v| v.as_i64())
                .map(|n| n as i32),
            default: obj.get("default").cloned().or(vm_default),
            bidirectional: obj
                .get("bidirectional")
                .and_then(|v| v.as_bool())
                .unwrap_or(true),
            array: parse_array_descriptor(obj, i)?,
            reverse: parse_reverse_override(obj, i)?,
        });
    }
    Ok(rules)
}

#[pyfunction]
pub fn execute_mapping_doc(
    py: Python,
    doc_obj: &Bound<'_, PyAny>,
    source_obj: &Bound<'_, PyAny>,
    direction: &str,
) -> PyResult<PyObject> {
    let doc_val: Value = depythonize_json(doc_obj)?;
    let source: Value = depythonize_json(source_obj)?;
    let dir = parse_direction(direction)?;

    let mapping_doc = parse_mapping_document(&doc_val)?;
    let result = runtime_mapping::execute_mapping_doc(&mapping_doc, &source, dir);

    let diagnostics = PyList::empty(py);
    for d in &result.diagnostics {
        let diag = PyDict::new(py);
        diag.set_item("rule_index", d.rule_index)?;
        diag.set_item("source_path", d.source_path.as_deref())?;
        diag.set_item("target_path", &d.target_path)?;
        diag.set_item("error_code", d.error_code.as_str())?;
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
