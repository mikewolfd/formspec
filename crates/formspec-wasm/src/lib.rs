/// WASM bindings for Formspec — thin layer exposing fel-core and formspec-core to TypeScript.
///
/// All functions accept/return JSON strings or JsValue for complex types.
/// The binding layer handles type conversion only — no business logic here.
use wasm_bindgen::prelude::*;

use rust_decimal::prelude::*;
use rust_decimal::Decimal;
use serde_json::Value;
use std::collections::HashMap;

use fel_core::{
    evaluate, parse, Dependencies, FelValue, MapEnvironment,
    extract_dependencies,
};
use formspec_core::{
    analyze_fel, detect_document_type, execute_mapping, get_fel_dependencies,
    normalize_indexed_path,
};

// ── FEL Evaluation ──────────────────────────────────────────────

/// Parse and evaluate a FEL expression with optional field values (JSON object).
/// Returns the result as a JSON string.
#[wasm_bindgen(js_name = "evalFEL")]
pub fn eval_fel(expression: &str, fields_json: &str) -> Result<String, JsError> {
    let expr = parse(expression).map_err(|e| JsError::new(&e.to_string()))?;

    let fields: HashMap<String, FelValue> = if fields_json.is_empty() || fields_json == "{}" {
        HashMap::new()
    } else {
        let json_val: Value = serde_json::from_str(fields_json)
            .map_err(|e| JsError::new(&format!("invalid fields JSON: {e}")))?;
        json_to_field_map(&json_val)
    };

    let env = MapEnvironment::with_fields(fields);
    let result = evaluate(&expr, &env);

    let json = fel_to_json(&result.value);
    serde_json::to_string(&json).map_err(|e| JsError::new(&e.to_string()))
}

/// Parse a FEL expression and return whether it's valid.
#[wasm_bindgen(js_name = "parseFEL")]
pub fn parse_fel(expression: &str) -> Result<bool, JsError> {
    match parse(expression) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Extract field dependencies from a FEL expression.
/// Returns a JSON array of field path strings.
#[wasm_bindgen(js_name = "getFELDependencies")]
pub fn get_fel_deps(expression: &str) -> Result<String, JsError> {
    let deps = get_fel_dependencies(expression);
    let arr: Vec<&str> = deps.iter().map(|s| s.as_str()).collect();
    serde_json::to_string(&arr).map_err(|e| JsError::new(&e.to_string()))
}

/// Extract full dependency info from a FEL expression (fields, context refs, wildcards, etc.).
/// Returns a JSON object with dependency details.
#[wasm_bindgen(js_name = "extractDependencies")]
pub fn extract_deps(expression: &str) -> Result<String, JsError> {
    let expr = parse(expression).map_err(|e| JsError::new(&e.to_string()))?;
    let deps = extract_dependencies(&expr);
    let json = deps_to_json(&deps);
    serde_json::to_string(&json).map_err(|e| JsError::new(&e.to_string()))
}

// ── FEL Analysis ────────────────────────────────────────────────

/// Analyze a FEL expression and return structural info (references, variables, functions).
/// Returns a JSON object with the analysis result.
#[wasm_bindgen(js_name = "analyzeFEL")]
pub fn analyze_fel_wasm(expression: &str) -> Result<String, JsError> {
    let result = analyze_fel(expression);
    let json = serde_json::json!({
        "valid": result.valid,
        "errors": result.errors.iter().map(|e| &e.message).collect::<Vec<_>>(),
        "references": result.references.iter().collect::<Vec<_>>(),
        "variables": result.variables.iter().collect::<Vec<_>>(),
        "functions": result.functions.iter().collect::<Vec<_>>(),
    });
    serde_json::to_string(&json).map_err(|e| JsError::new(&e.to_string()))
}

// ── Path Utils ──────────────────────────────────────────────────

/// Normalize a dotted path by stripping repeat indices.
#[wasm_bindgen(js_name = "normalizeIndexedPath")]
pub fn normalize_path(path: &str) -> String {
    normalize_indexed_path(path)
}

// ── Schema Validation ───────────────────────────────────────────

/// Detect the document type of a Formspec JSON document.
/// Returns the document type string or null.
#[wasm_bindgen(js_name = "detectDocumentType")]
pub fn detect_doc_type(doc_json: &str) -> Result<JsValue, JsError> {
    let doc: Value = serde_json::from_str(doc_json)
        .map_err(|e| JsError::new(&format!("invalid JSON: {e}")))?;
    match detect_document_type(&doc) {
        Some(dt) => Ok(JsValue::from_str(dt.schema_key())),
        None => Ok(JsValue::NULL),
    }
}

// ── Runtime Mapping ─────────────────────────────────────────────

/// Execute a mapping transform (forward or reverse).
/// Takes rules JSON, source JSON, and direction string.
/// Returns the mapping result as JSON.
#[wasm_bindgen(js_name = "executeMapping")]
pub fn execute_mapping_wasm(
    rules_json: &str,
    source_json: &str,
    direction: &str,
) -> Result<String, JsError> {
    let rules_val: Value = serde_json::from_str(rules_json)
        .map_err(|e| JsError::new(&format!("invalid rules JSON: {e}")))?;
    let source: Value = serde_json::from_str(source_json)
        .map_err(|e| JsError::new(&format!("invalid source JSON: {e}")))?;
    let dir = match direction {
        "forward" => formspec_core::MappingDirection::Forward,
        "reverse" => formspec_core::MappingDirection::Reverse,
        _ => return Err(JsError::new(&format!("invalid direction: {direction}"))),
    };

    // Parse rules from JSON array
    let rules = parse_mapping_rules(&rules_val)?;
    let result = execute_mapping(&rules, &source, dir);

    let json = serde_json::json!({
        "direction": direction,
        "output": result.output,
        "rulesApplied": result.rules_applied,
        "diagnostics": result.diagnostics.iter().map(|d| serde_json::json!({
            "ruleIndex": d.rule_index,
            "sourcePath": d.source_path,
            "targetPath": d.target_path,
            "message": d.message,
        })).collect::<Vec<_>>(),
    });
    serde_json::to_string(&json).map_err(|e| JsError::new(&e.to_string()))
}

// ── Helpers ─────────────────────────────────────────────────────

fn json_to_field_map(val: &Value) -> HashMap<String, FelValue> {
    let mut map = HashMap::new();
    if let Some(obj) = val.as_object() {
        for (k, v) in obj {
            map.insert(k.clone(), json_to_fel(v));
        }
    }
    map
}

fn json_to_fel(val: &Value) -> FelValue {
    match val {
        Value::Null => FelValue::Null,
        Value::Bool(b) => FelValue::Boolean(*b),
        Value::Number(n) => {
            if let Some(d) = Decimal::from_f64(n.as_f64().unwrap_or(0.0)) {
                FelValue::Number(d)
            } else {
                FelValue::Null
            }
        }
        Value::String(s) => FelValue::String(s.clone()),
        Value::Array(arr) => FelValue::Array(arr.iter().map(json_to_fel).collect()),
        Value::Object(map) => FelValue::Object(
            map.iter().map(|(k, v)| (k.clone(), json_to_fel(v))).collect(),
        ),
    }
}

fn fel_to_json(val: &FelValue) -> Value {
    match val {
        FelValue::Null => Value::Null,
        FelValue::Boolean(b) => Value::Bool(*b),
        FelValue::Number(n) => {
            if n.fract().is_zero() {
                if let Some(i) = n.to_i64() {
                    return Value::Number(serde_json::Number::from(i));
                }
            }
            n.to_f64()
                .and_then(serde_json::Number::from_f64)
                .map(Value::Number)
                .unwrap_or(Value::Null)
        }
        FelValue::String(s) => Value::String(s.clone()),
        FelValue::Date(d) => Value::String(d.format_iso()),
        FelValue::Array(arr) => Value::Array(arr.iter().map(fel_to_json).collect()),
        FelValue::Object(entries) => {
            let map: serde_json::Map<String, Value> = entries.iter()
                .map(|(k, v)| (k.clone(), fel_to_json(v)))
                .collect();
            Value::Object(map)
        }
        FelValue::Money(m) => {
            let mut map = serde_json::Map::new();
            map.insert("amount".to_string(), fel_to_json(&FelValue::Number(m.amount)));
            map.insert("currency".to_string(), Value::String(m.currency.clone()));
            Value::Object(map)
        }
    }
}

fn deps_to_json(deps: &Dependencies) -> Value {
    serde_json::json!({
        "fields": deps.fields.iter().collect::<Vec<_>>(),
        "contextRefs": deps.context_refs.iter().collect::<Vec<_>>(),
        "instanceRefs": deps.instance_refs.iter().collect::<Vec<_>>(),
        "mipDeps": deps.mip_deps.iter().collect::<Vec<_>>(),
        "hasSelfRef": deps.has_self_ref,
        "hasWildcard": deps.has_wildcard,
        "usesPrevNext": deps.uses_prev_next,
    })
}

fn parse_mapping_rules(val: &Value) -> Result<Vec<formspec_core::MappingRule>, JsError> {
    let arr = val.as_array().ok_or_else(|| JsError::new("rules must be an array"))?;
    let mut rules = Vec::new();
    for rule_val in arr {
        let obj = rule_val.as_object().ok_or_else(|| JsError::new("rule must be an object"))?;
        let transform = match obj.get("transform").and_then(|v| v.as_str()).unwrap_or("preserve") {
            "preserve" => formspec_core::TransformType::Preserve,
            "drop" => formspec_core::TransformType::Drop,
            "constant" => formspec_core::TransformType::Constant(
                obj.get("value").cloned().unwrap_or(Value::Null),
            ),
            "coerce" => {
                let target = obj.get("coerceType").and_then(|v| v.as_str()).unwrap_or("string");
                formspec_core::TransformType::Coerce(match target {
                    "number" => formspec_core::CoerceType::Number,
                    "integer" => formspec_core::CoerceType::Integer,
                    "boolean" => formspec_core::CoerceType::Boolean,
                    "date" => formspec_core::CoerceType::Date,
                    "datetime" => formspec_core::CoerceType::DateTime,
                    _ => formspec_core::CoerceType::String,
                })
            }
            "expression" => formspec_core::TransformType::Expression(
                obj.get("expression").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            ),
            "valueMap" => {
                let entries = obj.get("map").and_then(|v| v.as_object());
                let forward: Vec<(Value, Value)> = entries.map(|m| {
                    m.iter().map(|(k, v)| (Value::String(k.clone()), v.clone())).collect()
                }).unwrap_or_default();
                formspec_core::TransformType::ValueMap {
                    forward,
                    unmapped: match obj.get("unmapped").and_then(|v| v.as_str()) {
                        Some("null") => formspec_core::UnmappedStrategy::Null,
                        Some("error") => formspec_core::UnmappedStrategy::Error,
                        _ => formspec_core::UnmappedStrategy::PassThrough,
                    },
                }
            }
            other => return Err(JsError::new(&format!("unknown transform type: {other}"))),
        };

        rules.push(formspec_core::MappingRule {
            source_path: obj.get("sourcePath").and_then(|v| v.as_str()).map(String::from),
            target_path: obj.get("targetPath").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            transform,
            condition: obj.get("condition").and_then(|v| v.as_str()).map(String::from),
            priority: obj.get("priority").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            reverse_priority: obj.get("reversePriority").and_then(|v| v.as_i64()).map(|n| n as i32),
        });
    }
    Ok(rules)
}
