//! WASM bindings for Formspec — exposes FEL, linting, evaluation, assembly, mapping to TS.

/// WASM bindings for Formspec — thin layer exposing all Rust crates to TypeScript.
///
/// All functions accept/return JSON strings for complex types.
/// The binding layer handles type conversion only — no business logic here.
use wasm_bindgen::prelude::*;

use rust_decimal::prelude::*;
use rust_decimal::Decimal;
use serde_json::Value;
use std::collections::HashMap;

use fel_core::{
    evaluate, extract_dependencies, parse, print_expr, Dependencies, FelValue, MapEnvironment,
};
use formspec_core::{
    analyze_fel, assemble_definition, detect_document_type, execute_mapping, execute_mapping_doc,
    get_fel_dependencies, normalize_indexed_path, MapResolver, MappingDocument,
};
use formspec_core::changelog;
use formspec_core::registry_client::{self, Registry};
use formspec_eval::evaluate_definition;
use formspec_lint::{lint, lint_with_options, LintOptions};

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
pub fn parse_fel(expression: &str) -> bool {
    parse(expression).is_ok()
}

/// Print a FEL expression AST back to normalized source string.
/// Useful for round-tripping after AST transformations.
#[wasm_bindgen(js_name = "printFEL")]
pub fn print_fel(expression: &str) -> Result<String, JsError> {
    let expr = parse(expression).map_err(|e| JsError::new(&e.to_string()))?;
    Ok(print_expr(&expr))
}

/// Extract field dependencies from a FEL expression.
/// Returns a JSON array of field path strings.
#[wasm_bindgen(js_name = "getFELDependencies")]
pub fn get_fel_deps(expression: &str) -> Result<String, JsError> {
    let deps = get_fel_dependencies(expression);
    let arr: Vec<&str> = deps.iter().map(|s| s.as_str()).collect();
    serde_json::to_string(&arr).map_err(|e| JsError::new(&e.to_string()))
}

/// Extract full dependency info from a FEL expression.
/// Returns a JSON object with dependency details.
#[wasm_bindgen(js_name = "extractDependencies")]
pub fn extract_deps(expression: &str) -> Result<String, JsError> {
    let expr = parse(expression).map_err(|e| JsError::new(&e.to_string()))?;
    let deps = extract_dependencies(&expr);
    let json = deps_to_json(&deps);
    serde_json::to_string(&json).map_err(|e| JsError::new(&e.to_string()))
}

// ── FEL Analysis ────────────────────────────────────────────────

/// Analyze a FEL expression and return structural info.
/// Returns JSON: { valid, errors, references, variables, functions }
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

// ── Linting ─────────────────────────────────────────────────────

/// Lint a Formspec document (7-pass static analysis).
/// Returns JSON: { documentType, valid, diagnostics: [...] }
#[wasm_bindgen(js_name = "lintDocument")]
pub fn lint_document(doc_json: &str) -> Result<String, JsError> {
    let doc: Value = serde_json::from_str(doc_json)
        .map_err(|e| JsError::new(&format!("invalid JSON: {e}")))?;
    let result = lint(&doc);
    let json = lint_result_to_json(&result);
    serde_json::to_string(&json).map_err(|e| JsError::new(&e.to_string()))
}

/// Lint with registry documents for extension resolution.
/// registries_json is a JSON array of registry documents.
#[wasm_bindgen(js_name = "lintDocumentWithRegistries")]
pub fn lint_document_with_registries(doc_json: &str, registries_json: &str) -> Result<String, JsError> {
    let doc: Value = serde_json::from_str(doc_json)
        .map_err(|e| JsError::new(&format!("invalid doc JSON: {e}")))?;
    let registries: Vec<Value> = serde_json::from_str(registries_json)
        .map_err(|e| JsError::new(&format!("invalid registries JSON: {e}")))?;

    let result = lint_with_options(&doc, &LintOptions {
        registry_documents: registries,
        ..Default::default()
    });
    let json = lint_result_to_json(&result);
    serde_json::to_string(&json).map_err(|e| JsError::new(&e.to_string()))
}

// ── Definition Evaluation ───────────────────────────────────────

/// Evaluate a Formspec definition against provided data (4-phase batch processor).
/// Returns JSON: { values, validations, nonRelevant, variables }
#[wasm_bindgen(js_name = "evaluateDefinition")]
pub fn evaluate_definition_wasm(definition_json: &str, data_json: &str) -> Result<String, JsError> {
    let definition: Value = serde_json::from_str(definition_json)
        .map_err(|e| JsError::new(&format!("invalid definition JSON: {e}")))?;
    let data_val: Value = serde_json::from_str(data_json)
        .map_err(|e| JsError::new(&format!("invalid data JSON: {e}")))?;

    let data: HashMap<String, Value> = data_val
        .as_object()
        .map(|obj| obj.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
        .unwrap_or_default();

    let result = evaluate_definition(&definition, &data);

    let json = serde_json::json!({
        "values": result.values,
        "validations": result.validations.iter().map(|v| serde_json::json!({
            "path": v.path,
            "severity": v.severity,
            "kind": v.kind,
            "message": v.message,
        })).collect::<Vec<_>>(),
        "nonRelevant": result.non_relevant,
        "variables": result.variables,
    });
    serde_json::to_string(&json).map_err(|e| JsError::new(&e.to_string()))
}

// ── Assembly ────────────────────────────────────────────────────

/// Assemble a definition by resolving $ref inclusions.
/// fragments_json is a JSON object mapping URI → fragment definition.
/// Returns JSON: { definition, warnings, errors }
#[wasm_bindgen(js_name = "assembleDefinition")]
pub fn assemble_definition_wasm(definition_json: &str, fragments_json: &str) -> Result<String, JsError> {
    let definition: Value = serde_json::from_str(definition_json)
        .map_err(|e| JsError::new(&format!("invalid definition JSON: {e}")))?;
    let fragments: Value = serde_json::from_str(fragments_json)
        .map_err(|e| JsError::new(&format!("invalid fragments JSON: {e}")))?;

    let mut resolver = MapResolver::new();
    if let Some(obj) = fragments.as_object() {
        for (uri, fragment) in obj {
            resolver.add(uri, fragment.clone());
        }
    }

    let result = assemble_definition(&definition, &resolver);
    let json = serde_json::json!({
        "definition": result.definition,
        "warnings": result.warnings,
        "errors": result.errors.iter().map(|e| e.to_string()).collect::<Vec<_>>(),
    });
    serde_json::to_string(&json).map_err(|e| JsError::new(&e.to_string()))
}

// ── Runtime Mapping ─────────────────────────────────────────────

/// Execute a mapping transform (forward or reverse).
/// Returns JSON: { direction, output, rulesApplied, diagnostics }
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

// ── Registry Client ─────────────────────────────────────────────

/// Parse a registry JSON document, validate it, return summary JSON.
/// Returns: { publisher, published, entryCount, validationIssues }
#[wasm_bindgen(js_name = "parseRegistry")]
pub fn parse_registry(registry_json: &str) -> Result<String, JsError> {
    let val: Value = serde_json::from_str(registry_json)
        .map_err(|e| JsError::new(&format!("invalid JSON: {e}")))?;
    let registry = Registry::from_json(&val)
        .map_err(|e| JsError::new(&e.to_string()))?;
    let issues = registry.validate();
    let entry_count = val.get("entries").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0);
    let json = serde_json::json!({
        "publisher": {
            "name": registry.publisher.name,
            "url": registry.publisher.url,
            "contact": registry.publisher.contact,
        },
        "published": registry.published,
        "entryCount": entry_count,
        "validationIssues": issues,
    });
    serde_json::to_string(&json).map_err(|e| JsError::new(&e.to_string()))
}

/// Find the highest-version registry entry matching name + version constraint.
/// Returns entry JSON or "null" if not found.
#[wasm_bindgen(js_name = "findRegistryEntry")]
pub fn find_registry_entry(registry_json: &str, name: &str, version_constraint: &str) -> Result<String, JsError> {
    let val: Value = serde_json::from_str(registry_json)
        .map_err(|e| JsError::new(&format!("invalid JSON: {e}")))?;
    let registry = Registry::from_json(&val)
        .map_err(|e| JsError::new(&e.to_string()))?;

    let constraint = if version_constraint.is_empty() { None } else { Some(version_constraint) };
    let entry = registry.find_one(name, constraint);

    match entry {
        Some(e) => {
            let json = serde_json::json!({
                "name": e.name,
                "category": category_to_str(e.category),
                "version": e.version,
                "status": status_to_str(e.status),
                "description": e.description,
                "deprecationNotice": e.deprecation_notice,
                "baseType": e.base_type,
                "parameters": e.parameters.as_ref().map(|params| {
                    params.iter().map(|p| serde_json::json!({
                        "name": p.name,
                        "type": p.param_type,
                        "description": p.description,
                    })).collect::<Vec<_>>()
                }),
                "returns": e.returns,
            });
            serde_json::to_string(&json).map_err(|e| JsError::new(&e.to_string()))
        }
        None => Ok("null".to_string()),
    }
}

/// Check whether a lifecycle transition is valid per the registry spec.
#[wasm_bindgen(js_name = "validateLifecycleTransition")]
pub fn validate_lifecycle_transition_wasm(from: &str, to: &str) -> bool {
    let from_status = match parse_status_str(from) {
        Some(s) => s,
        None => return false,
    };
    let to_status = match parse_status_str(to) {
        Some(s) => s,
        None => return false,
    };
    registry_client::validate_lifecycle_transition(from_status, to_status)
}

/// Construct the well-known registry URL for a base URL.
#[wasm_bindgen(js_name = "wellKnownRegistryUrl")]
pub fn well_known_registry_url(base_url: &str) -> String {
    registry_client::well_known_url(base_url)
}

// ── Changelog ───────────────────────────────────────────────────

/// Diff two Formspec definition versions and produce a structured changelog.
/// Returns JSON with camelCase keys.
#[wasm_bindgen(js_name = "generateChangelog")]
pub fn generate_changelog_wasm(old_def_json: &str, new_def_json: &str, definition_url: &str) -> Result<String, JsError> {
    let old_def: Value = serde_json::from_str(old_def_json)
        .map_err(|e| JsError::new(&format!("invalid old definition JSON: {e}")))?;
    let new_def: Value = serde_json::from_str(new_def_json)
        .map_err(|e| JsError::new(&format!("invalid new definition JSON: {e}")))?;

    let result = changelog::generate_changelog(&old_def, &new_def, definition_url);

    let json = serde_json::json!({
        "definitionUrl": result.definition_url,
        "fromVersion": result.from_version,
        "toVersion": result.to_version,
        "semverImpact": match result.semver_impact {
            changelog::SemverImpact::Patch => "patch",
            changelog::SemverImpact::Minor => "minor",
            changelog::SemverImpact::Major => "major",
        },
        "changes": result.changes.iter().map(|c| serde_json::json!({
            "type": match c.change_type {
                changelog::ChangeType::Added => "added",
                changelog::ChangeType::Removed => "removed",
                changelog::ChangeType::Modified => "modified",
            },
            "target": match c.target {
                changelog::ChangeTarget::Item => "item",
                changelog::ChangeTarget::Bind => "bind",
                changelog::ChangeTarget::Shape => "shape",
                changelog::ChangeTarget::OptionSet => "optionSet",
                changelog::ChangeTarget::DataSource => "dataSource",
                changelog::ChangeTarget::Screener => "screener",
                changelog::ChangeTarget::Migration => "migration",
                changelog::ChangeTarget::Metadata => "metadata",
            },
            "path": c.path,
            "impact": match c.impact {
                changelog::ChangeImpact::Cosmetic => "cosmetic",
                changelog::ChangeImpact::Compatible => "compatible",
                changelog::ChangeImpact::Breaking => "breaking",
            },
            "key": c.key,
            "description": c.description,
            "before": c.before,
            "after": c.after,
            "migrationHint": c.migration_hint,
        })).collect::<Vec<_>>(),
    });
    serde_json::to_string(&json).map_err(|e| JsError::new(&e.to_string()))
}

// ── Mapping Document ────────────────────────────────────────────

/// Execute a full mapping document (rules + defaults + autoMap).
/// Returns JSON: { direction, output, rulesApplied, diagnostics }
#[wasm_bindgen(js_name = "executeMappingDoc")]
pub fn execute_mapping_doc_wasm(doc_json: &str, source_json: &str, direction: &str) -> Result<String, JsError> {
    let doc_val: Value = serde_json::from_str(doc_json)
        .map_err(|e| JsError::new(&format!("invalid mapping document JSON: {e}")))?;
    let source: Value = serde_json::from_str(source_json)
        .map_err(|e| JsError::new(&format!("invalid source JSON: {e}")))?;
    let dir = match direction {
        "forward" => formspec_core::MappingDirection::Forward,
        "reverse" => formspec_core::MappingDirection::Reverse,
        _ => return Err(JsError::new(&format!("invalid direction: {direction}"))),
    };

    let doc = parse_mapping_document(&doc_val)?;
    let result = execute_mapping_doc(&doc, &source, dir);

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

fn lint_result_to_json(result: &formspec_lint::LintResult) -> Value {
    serde_json::json!({
        "documentType": result.document_type.map(|dt| dt.schema_key().to_string()),
        "valid": result.valid,
        "diagnostics": result.diagnostics.iter().map(|d| serde_json::json!({
            "code": d.code,
            "pass": d.pass,
            "severity": match d.severity {
                formspec_lint::LintSeverity::Error => "error",
                formspec_lint::LintSeverity::Warning => "warning",
                formspec_lint::LintSeverity::Info => "info",
            },
            "path": d.path,
            "message": d.message,
        })).collect::<Vec<_>>(),
    })
}

fn parse_mapping_rules(val: &Value) -> Result<Vec<formspec_core::MappingRule>, JsError> {
    parse_mapping_rules_inner(val).map_err(|e| JsError::new(&e))
}

/// Core mapping-rule parser returning `Result<_, String>` for testability without FFI.
fn parse_mapping_rules_inner(val: &Value) -> Result<Vec<formspec_core::MappingRule>, String> {
    let arr = val.as_array().ok_or_else(|| "rules must be an array".to_string())?;
    let mut rules = Vec::new();
    for (i, rule_val) in arr.iter().enumerate() {
        let obj = rule_val.as_object().ok_or_else(|| format!("rule[{i}]: must be an object"))?;

        // transform is REQUIRED (mapping.schema.json FieldRule.required)
        let transform_str = obj.get("transform").and_then(|v| v.as_str())
            .ok_or_else(|| format!("rule[{i}]: missing required field 'transform'"))?;

        let transform = match transform_str {
            "preserve" => formspec_core::TransformType::Preserve,
            "drop" => formspec_core::TransformType::Drop,
            "constant" => {
                let expr = obj.get("expression").and_then(|v| v.as_str())
                    .ok_or_else(|| format!("rule[{i}]: transform 'constant' requires 'expression'"))?;
                formspec_core::TransformType::Constant(Value::String(expr.to_string()))
            }
            "coerce" => {
                let coerce_val = obj.get("coerce")
                    .ok_or_else(|| format!("rule[{i}]: transform 'coerce' requires 'coerce' property"))?;
                let coerce_type = parse_coerce_type(coerce_val)
                    .ok_or_else(|| format!("rule[{i}]: invalid coerce value"))?;
                formspec_core::TransformType::Coerce(coerce_type)
            }
            "expression" => {
                let expr = obj.get("expression").and_then(|v| v.as_str())
                    .ok_or_else(|| format!("rule[{i}]: transform 'expression' requires 'expression'"))?;
                formspec_core::TransformType::Expression(expr.to_string())
            }
            "valueMap" => {
                let entries = obj.get("valueMap").and_then(|v| v.as_object());
                let forward: Vec<(Value, Value)> = entries.map(|m| {
                    m.iter().map(|(k, v)| (Value::String(k.clone()), v.clone())).collect()
                }).unwrap_or_default();
                formspec_core::TransformType::ValueMap {
                    forward,
                    unmapped: match obj.get("unmapped").and_then(|v| v.as_str()) {
                        Some("error") => formspec_core::UnmappedStrategy::Error,
                        _ => formspec_core::UnmappedStrategy::PassThrough,
                    },
                }
            }
            "flatten" => formspec_core::TransformType::Flatten {
                separator: obj.get("separator").and_then(|v| v.as_str()).unwrap_or(".").to_string(),
            },
            "nest" => formspec_core::TransformType::Nest {
                separator: obj.get("separator").and_then(|v| v.as_str()).unwrap_or(".").to_string(),
            },
            "concat" => {
                let expr = obj.get("expression").and_then(|v| v.as_str())
                    .ok_or_else(|| format!("rule[{i}]: transform 'concat' requires 'expression'"))?;
                formspec_core::TransformType::Concat(expr.to_string())
            }
            "split" => {
                let expr = obj.get("expression").and_then(|v| v.as_str())
                    .ok_or_else(|| format!("rule[{i}]: transform 'split' requires 'expression'"))?;
                formspec_core::TransformType::Split(expr.to_string())
            }
            other => return Err(format!("rule[{i}]: unknown transform type: {other}")),
        };

        // At least one of sourcePath or targetPath MUST be present (mapping.schema.json FieldRule.anyOf)
        let source_path = obj.get("sourcePath").and_then(|v| v.as_str()).map(String::from);
        let target_path = obj.get("targetPath").and_then(|v| v.as_str()).map(String::from);
        if source_path.is_none() && target_path.is_none() {
            return Err(format!("rule[{i}]: at least one of 'sourcePath' or 'targetPath' must be present"));
        }

        rules.push(formspec_core::MappingRule {
            source_path,
            target_path: target_path.unwrap_or_default(),
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

/// Parse a coerce value — either a shorthand string or an object with from/to.
fn parse_coerce_type(val: &Value) -> Option<formspec_core::CoerceType> {
    if let Some(s) = val.as_str() {
        return match s {
            "string" => Some(formspec_core::CoerceType::String),
            "number" => Some(formspec_core::CoerceType::Number),
            "integer" => Some(formspec_core::CoerceType::Integer),
            "boolean" => Some(formspec_core::CoerceType::Boolean),
            "date" => Some(formspec_core::CoerceType::Date),
            "datetime" => Some(formspec_core::CoerceType::DateTime),
            _ => None,
        };
    }
    if let Some(obj) = val.as_object() {
        let to = obj.get("to").and_then(|v| v.as_str())?;
        return match to {
            "string" => Some(formspec_core::CoerceType::String),
            "number" => Some(formspec_core::CoerceType::Number),
            "integer" => Some(formspec_core::CoerceType::Integer),
            "boolean" => Some(formspec_core::CoerceType::Boolean),
            "date" => Some(formspec_core::CoerceType::Date),
            "datetime" => Some(formspec_core::CoerceType::DateTime),
            _ => None,
        };
    }
    None
}

fn parse_mapping_document(val: &Value) -> Result<MappingDocument, JsError> {
    let obj = val.as_object().ok_or_else(|| JsError::new("mapping document must be an object"))?;
    let rules_val = obj.get("rules").cloned().unwrap_or(Value::Array(vec![]));
    let rules = parse_mapping_rules(&rules_val)?;
    let defaults = obj.get("defaults").and_then(|v| v.as_object()).cloned();
    let auto_map = obj.get("autoMap").and_then(|v| v.as_bool()).unwrap_or(false);
    Ok(MappingDocument {
        rules,
        defaults,
        auto_map,
    })
}

fn parse_status_str(s: &str) -> Option<formspec_core::RegistryEntryStatus> {
    match s {
        "draft" => Some(formspec_core::RegistryEntryStatus::Draft),
        "stable" | "active" => Some(formspec_core::RegistryEntryStatus::Active),
        "deprecated" => Some(formspec_core::RegistryEntryStatus::Deprecated),
        "retired" => Some(formspec_core::RegistryEntryStatus::Retired),
        _ => None,
    }
}

fn status_to_str(s: formspec_core::RegistryEntryStatus) -> &'static str {
    match s {
        formspec_core::RegistryEntryStatus::Draft => "draft",
        formspec_core::RegistryEntryStatus::Active => "stable",
        formspec_core::RegistryEntryStatus::Deprecated => "deprecated",
        formspec_core::RegistryEntryStatus::Retired => "retired",
    }
}

fn category_to_str(c: registry_client::ExtensionCategory) -> &'static str {
    match c {
        registry_client::ExtensionCategory::DataType => "dataType",
        registry_client::ExtensionCategory::Function => "function",
        registry_client::ExtensionCategory::Constraint => "constraint",
        registry_client::ExtensionCategory::Property => "property",
        registry_client::ExtensionCategory::Namespace => "namespace",
    }
}

// ── Tests ───────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use fel_core::{FelDate, FelMoney};
    use serde_json::json;

    // ── PRIORITY 1: Serialization round-trips ────────────────────

    // ── json_to_fel / fel_to_json ────────────────────────────────

    /// Correctness: json_to_fel round-trip preserves Null variant
    #[test]
    fn json_fel_roundtrip_null() {
        let json_val = Value::Null;
        let fel = json_to_fel(&json_val);
        assert_eq!(fel, FelValue::Null);
        let back = fel_to_json(&fel);
        assert_eq!(back, Value::Null);
    }

    /// Correctness: json_to_fel round-trip preserves Boolean true
    #[test]
    fn json_fel_roundtrip_bool_true() {
        let json_val = json!(true);
        let fel = json_to_fel(&json_val);
        assert_eq!(fel, FelValue::Boolean(true));
        let back = fel_to_json(&fel);
        assert_eq!(back, json!(true));
    }

    /// Correctness: json_to_fel round-trip preserves Boolean false
    #[test]
    fn json_fel_roundtrip_bool_false() {
        let json_val = json!(false);
        let fel = json_to_fel(&json_val);
        assert_eq!(fel, FelValue::Boolean(false));
        let back = fel_to_json(&fel);
        assert_eq!(back, json!(false));
    }

    /// Correctness: json_to_fel round-trip preserves String values
    #[test]
    fn json_fel_roundtrip_string() {
        let json_val = json!("hello world");
        let fel = json_to_fel(&json_val);
        assert_eq!(fel, FelValue::String("hello world".to_string()));
        let back = fel_to_json(&fel);
        assert_eq!(back, json!("hello world"));
    }

    /// Correctness: json_to_fel round-trip preserves empty string
    #[test]
    fn json_fel_roundtrip_empty_string() {
        let json_val = json!("");
        let fel = json_to_fel(&json_val);
        assert_eq!(fel, FelValue::String(String::new()));
        let back = fel_to_json(&fel);
        assert_eq!(back, json!(""));
    }

    /// Correctness: json_to_fel round-trip preserves integer numbers
    #[test]
    fn json_fel_roundtrip_integer() {
        let json_val = json!(42);
        let fel = json_to_fel(&json_val);
        assert_eq!(fel, FelValue::Number(Decimal::from(42)));
        // fel_to_json should emit integers without fractional part
        let back = fel_to_json(&fel);
        assert_eq!(back, json!(42));
    }

    /// Correctness: json_to_fel round-trip preserves decimal numbers
    #[test]
    fn json_fel_roundtrip_decimal() {
        let json_val = json!(3.14);
        let fel = json_to_fel(&json_val);
        // Should be a Number variant (exact Decimal depends on f64 conversion)
        if let FelValue::Number(d) = &fel {
            let f = d.to_f64().unwrap();
            assert!((f - 3.14).abs() < 1e-10, "expected ~3.14, got {f}");
        } else {
            panic!("expected FelValue::Number, got {:?}", fel);
        }
        let back = fel_to_json(&fel);
        // Round-trip through f64 should produce approximately 3.14
        assert!(back.as_f64().unwrap() - 3.14 < 1e-10);
    }

    /// Correctness: json_to_fel round-trip preserves negative numbers
    #[test]
    fn json_fel_roundtrip_negative() {
        let json_val = json!(-7);
        let fel = json_to_fel(&json_val);
        assert_eq!(fel, FelValue::Number(Decimal::from(-7)));
        let back = fel_to_json(&fel);
        assert_eq!(back, json!(-7));
    }

    /// Correctness: json_to_fel round-trip preserves zero
    #[test]
    fn json_fel_roundtrip_zero() {
        let json_val = json!(0);
        let fel = json_to_fel(&json_val);
        assert_eq!(fel, FelValue::Number(Decimal::ZERO));
        let back = fel_to_json(&fel);
        assert_eq!(back, json!(0));
    }

    /// Correctness: json_to_fel round-trip preserves arrays
    #[test]
    fn json_fel_roundtrip_array() {
        let json_val = json!([1, "two", null, true]);
        let fel = json_to_fel(&json_val);
        if let FelValue::Array(arr) = &fel {
            assert_eq!(arr.len(), 4);
            assert_eq!(arr[0], FelValue::Number(Decimal::from(1)));
            assert_eq!(arr[1], FelValue::String("two".to_string()));
            assert_eq!(arr[2], FelValue::Null);
            assert_eq!(arr[3], FelValue::Boolean(true));
        } else {
            panic!("expected FelValue::Array, got {:?}", fel);
        }
        let back = fel_to_json(&fel);
        assert_eq!(back, json!([1, "two", null, true]));
    }

    /// Correctness: json_to_fel round-trip preserves empty array
    #[test]
    fn json_fel_roundtrip_empty_array() {
        let json_val = json!([]);
        let fel = json_to_fel(&json_val);
        assert_eq!(fel, FelValue::Array(vec![]));
        let back = fel_to_json(&fel);
        assert_eq!(back, json!([]));
    }

    /// Correctness: json_to_fel round-trip preserves objects
    #[test]
    fn json_fel_roundtrip_object() {
        let json_val = json!({"name": "Alice", "age": 30});
        let fel = json_to_fel(&json_val);
        if let FelValue::Object(entries) = &fel {
            assert_eq!(entries.len(), 2);
            // Object is a Vec of pairs — order may vary from JSON parsing
            let names: Vec<&str> = entries.iter().map(|(k, _)| k.as_str()).collect();
            assert!(names.contains(&"name"));
            assert!(names.contains(&"age"));
        } else {
            panic!("expected FelValue::Object, got {:?}", fel);
        }
        let back = fel_to_json(&fel);
        assert_eq!(back["name"], json!("Alice"));
        assert_eq!(back["age"], json!(30));
    }

    /// Correctness: json_to_fel round-trip preserves empty object
    #[test]
    fn json_fel_roundtrip_empty_object() {
        let json_val = json!({});
        let fel = json_to_fel(&json_val);
        assert_eq!(fel, FelValue::Object(vec![]));
        let back = fel_to_json(&fel);
        assert_eq!(back, json!({}));
    }

    /// Correctness: json_to_fel round-trip preserves nested arrays and objects
    #[test]
    fn json_fel_roundtrip_nested() {
        let json_val = json!({
            "items": [{"id": 1}, {"id": 2}],
            "meta": {"nested": {"deep": true}}
        });
        let fel = json_to_fel(&json_val);
        let back = fel_to_json(&fel);
        assert_eq!(back["items"][0]["id"], json!(1));
        assert_eq!(back["items"][1]["id"], json!(2));
        assert_eq!(back["meta"]["nested"]["deep"], json!(true));
    }

    /// Edge case: very large integer converts through Decimal without data loss
    #[test]
    fn json_fel_roundtrip_large_integer() {
        // i64::MAX = 9223372036854775807
        let json_val = json!(9223372036854775807_i64);
        let fel = json_to_fel(&json_val);
        // This goes through as_f64().unwrap_or(0.0) then Decimal::from_f64
        // Large integers may lose precision through f64
        if let FelValue::Number(d) = &fel {
            // At least it should be a Number, not Null
            assert!(d.to_f64().is_some());
        } else {
            panic!("expected FelValue::Number, got {:?}", fel);
        }
    }

    /// Edge case: very small decimal converts through Decimal
    #[test]
    fn json_fel_roundtrip_small_decimal() {
        let json_val = json!(0.000001);
        let fel = json_to_fel(&json_val);
        if let FelValue::Number(d) = &fel {
            let f = d.to_f64().unwrap();
            assert!((f - 0.000001).abs() < 1e-12);
        } else {
            panic!("expected FelValue::Number, got {:?}", fel);
        }
    }

    /// Correctness: fel_to_json serializes FelDate as ISO string
    #[test]
    fn fel_to_json_date_serializes_iso() {
        let date = FelValue::Date(FelDate::Date {
            year: 2026,
            month: 3,
            day: 19,
        });
        let json = fel_to_json(&date);
        assert_eq!(json, json!("2026-03-19"));
    }

    /// Correctness: fel_to_json serializes FelMoney as structured object
    /// Spec: Money types serialize to { amount, currency }
    #[test]
    fn fel_to_json_money_structured_shape() {
        let money = FelValue::Money(FelMoney {
            amount: Decimal::new(1999, 2), // 19.99
            currency: "USD".to_string(),
        });
        let json = fel_to_json(&money);
        assert!(json.is_object(), "Money should serialize to JSON object");
        assert_eq!(json["currency"], json!("USD"));
        // amount 19.99 has fractional part, should serialize as float
        let amount = json["amount"].as_f64().unwrap();
        assert!((amount - 19.99).abs() < 1e-10);
    }

    /// Correctness: fel_to_json serializes integer Decimal to JSON integer (no .0)
    #[test]
    fn fel_to_json_integer_decimal_is_json_integer() {
        let val = FelValue::Number(Decimal::from(100));
        let json = fel_to_json(&val);
        // Should be an integer, not 100.0
        assert!(json.is_i64() || json.is_u64(), "expected JSON integer, got {:?}", json);
        assert_eq!(json.as_i64().unwrap(), 100);
    }

    /// Edge case: Decimal NaN or special values that can't become f64 produce Null
    #[test]
    fn fel_to_json_unconvertible_decimal_produces_null() {
        // Decimal::MAX might overflow f64 — test the fallback path
        let huge = Decimal::MAX;
        let val = FelValue::Number(huge);
        let json = fel_to_json(&val);
        // Either a number or null, depending on f64 conversion
        // The point is: no panic
        assert!(json.is_number() || json.is_null());
    }

    // ── json_to_field_map ────────────────────────────────────────

    /// Correctness: json_to_field_map builds HashMap from JSON object
    #[test]
    fn json_to_field_map_basic() {
        let val = json!({"x": 10, "y": "hello", "z": null});
        let map = json_to_field_map(&val);
        assert_eq!(map.len(), 3);
        assert_eq!(map["x"], FelValue::Number(Decimal::from(10)));
        assert_eq!(map["y"], FelValue::String("hello".to_string()));
        assert_eq!(map["z"], FelValue::Null);
    }

    /// Correctness: json_to_field_map returns empty map for non-object input
    #[test]
    fn json_to_field_map_non_object_returns_empty() {
        let val = json!([1, 2, 3]);
        let map = json_to_field_map(&val);
        assert!(map.is_empty());
    }

    /// Correctness: json_to_field_map returns empty map for empty object
    #[test]
    fn json_to_field_map_empty_object() {
        let val = json!({});
        let map = json_to_field_map(&val);
        assert!(map.is_empty());
    }

    // ── parse_mapping_rules ──────────────────────────────────────

    /// Correctness: parse_mapping_rules parses a complete rule with all fields
    /// Spec: mapping-spec — each rule has sourcePath, targetPath, transform, condition, priority, etc.
    #[test]
    fn parse_mapping_rules_complete_rule() {
        let rules_json = json!([{
            "sourcePath": "firstName",
            "targetPath": "first_name",
            "transform": "preserve",
            "condition": "$age > 18",
            "priority": 5,
            "reversePriority": 3,
            "default": "unknown",
            "bidirectional": false
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        assert_eq!(rules.len(), 1);
        let r = &rules[0];
        assert_eq!(r.source_path.as_deref(), Some("firstName"));
        assert_eq!(r.target_path, "first_name");
        assert!(matches!(r.transform, formspec_core::TransformType::Preserve));
        assert_eq!(r.condition.as_deref(), Some("$age > 18"));
        assert_eq!(r.priority, 5);
        assert_eq!(r.reverse_priority, Some(3));
        assert_eq!(r.default, Some(json!("unknown")));
        assert_eq!(r.bidirectional, false);
    }

    /// Spec: mapping.schema.json — transform is required, missing it is an error
    #[test]
    fn parse_mapping_rules_minimal_rejects_missing_transform() {
        let rules_json = json!([{}]);
        let err = parse_mapping_rules_inner(&rules_json).unwrap_err();
        assert!(err.contains("missing required field 'transform'"));
    }

    /// Correctness: parse_mapping_rules parses "constant" transform with expression
    #[test]
    fn parse_mapping_rules_constant_transform() {
        let rules_json = json!([{
            "targetPath": "status",
            "transform": "constant",
            "expression": "active"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        if let formspec_core::TransformType::Constant(v) = &rules[0].transform {
            assert_eq!(*v, json!("active"));
        } else {
            panic!("expected Constant transform");
        }
    }

    /// Spec: mapping.schema.json — constant transform requires expression field
    #[test]
    fn parse_mapping_rules_constant_missing_expression_errors() {
        let rules_json = json!([{
            "targetPath": "x",
            "transform": "constant"
        }]);
        let err = parse_mapping_rules_inner(&rules_json).unwrap_err();
        assert!(err.contains("requires 'expression'"));
    }

    /// Correctness: parse_mapping_rules parses "expression" transform
    #[test]
    fn parse_mapping_rules_expression_transform() {
        let rules_json = json!([{
            "sourcePath": "a",
            "targetPath": "b",
            "transform": "expression",
            "expression": "$a + $b"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        if let formspec_core::TransformType::Expression(expr) = &rules[0].transform {
            assert_eq!(expr, "$a + $b");
        } else {
            panic!("expected Expression transform");
        }
    }

    /// Correctness: parse_mapping_rules parses "coerce" transform with all target types
    #[test]
    fn parse_mapping_rules_coerce_all_types() {
        let types_and_expected = vec![
            ("number", formspec_core::CoerceType::Number),
            ("integer", formspec_core::CoerceType::Integer),
            ("boolean", formspec_core::CoerceType::Boolean),
            ("date", formspec_core::CoerceType::Date),
            ("datetime", formspec_core::CoerceType::DateTime),
            ("string", formspec_core::CoerceType::String),
        ];
        for (coerce_str, expected_type) in types_and_expected {
            let rules_json = json!([{
                "sourcePath": "x",
                "targetPath": "y",
                "transform": "coerce",
                "coerce": coerce_str
            }]);
            let rules = parse_mapping_rules_inner(&rules_json).unwrap();
            if let formspec_core::TransformType::Coerce(ct) = &rules[0].transform {
                assert_eq!(*ct, expected_type, "coerce type mismatch for '{coerce_str}'");
            } else {
                panic!("expected Coerce transform for '{coerce_str}'");
            }
        }
    }

    /// Correctness: parse_mapping_rules parses "valueMap" transform
    #[test]
    fn parse_mapping_rules_valuemap_transform() {
        let rules_json = json!([{
            "sourcePath": "status",
            "targetPath": "code",
            "transform": "valueMap",
            "valueMap": {"active": 1, "inactive": 0},
            "unmapped": "error"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        if let formspec_core::TransformType::ValueMap { forward, unmapped } = &rules[0].transform {
            assert_eq!(forward.len(), 2);
            assert!(matches!(unmapped, formspec_core::UnmappedStrategy::Error));
        } else {
            panic!("expected ValueMap transform");
        }
    }

    /// Correctness: parse_mapping_rules valueMap defaults unmapped to PassThrough
    #[test]
    fn parse_mapping_rules_valuemap_default_unmapped() {
        let rules_json = json!([{
            "sourcePath": "x",
            "targetPath": "y",
            "transform": "valueMap",
            "valueMap": {"a": "b"}
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        if let formspec_core::TransformType::ValueMap { unmapped, .. } = &rules[0].transform {
            assert!(matches!(unmapped, formspec_core::UnmappedStrategy::PassThrough));
        } else {
            panic!("expected ValueMap transform");
        }
    }

    /// Correctness: parse_mapping_rules parses "flatten" transform with separator
    #[test]
    fn parse_mapping_rules_flatten_transform() {
        let rules_json = json!([{
            "sourcePath": "address",
            "targetPath": "flat",
            "transform": "flatten",
            "separator": "_"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        if let formspec_core::TransformType::Flatten { separator } = &rules[0].transform {
            assert_eq!(separator, "_");
        } else {
            panic!("expected Flatten transform");
        }
    }

    /// Correctness: parse_mapping_rules flatten defaults separator to "."
    #[test]
    fn parse_mapping_rules_flatten_default_separator() {
        let rules_json = json!([{
            "sourcePath": "x",
            "targetPath": "y",
            "transform": "flatten"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        if let formspec_core::TransformType::Flatten { separator } = &rules[0].transform {
            assert_eq!(separator, ".");
        } else {
            panic!("expected Flatten transform");
        }
    }

    /// Correctness: parse_mapping_rules parses "nest" transform
    #[test]
    fn parse_mapping_rules_nest_transform() {
        let rules_json = json!([{
            "sourcePath": "flat_key",
            "targetPath": "nested",
            "transform": "nest",
            "separator": "/"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        if let formspec_core::TransformType::Nest { separator } = &rules[0].transform {
            assert_eq!(separator, "/");
        } else {
            panic!("expected Nest transform");
        }
    }

    /// Correctness: parse_mapping_rules parses "concat" transform
    #[test]
    fn parse_mapping_rules_concat_transform() {
        let rules_json = json!([{
            "sourcePath": "parts",
            "targetPath": "full",
            "transform": "concat",
            "expression": " "
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        if let formspec_core::TransformType::Concat(sep) = &rules[0].transform {
            assert_eq!(sep, " ");
        } else {
            panic!("expected Concat transform");
        }
    }

    /// Correctness: parse_mapping_rules parses "split" transform
    #[test]
    fn parse_mapping_rules_split_transform() {
        let rules_json = json!([{
            "sourcePath": "full",
            "targetPath": "parts",
            "transform": "split",
            "expression": ","
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        if let formspec_core::TransformType::Split(sep) = &rules[0].transform {
            assert_eq!(sep, ",");
        } else {
            panic!("expected Split transform");
        }
    }

    /// Correctness: parse_mapping_rules parses "drop" transform
    #[test]
    fn parse_mapping_rules_drop_transform() {
        let rules_json = json!([{
            "sourcePath": "internal",
            "targetPath": "",
            "transform": "drop"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        assert!(matches!(rules[0].transform, formspec_core::TransformType::Drop));
    }

    /// Error: parse_mapping_rules rejects unknown transform type
    #[test]
    fn parse_mapping_rules_unknown_transform_errors() {
        let rules_json = json!([{
            "sourcePath": "x",
            "targetPath": "y",
            "transform": "teleport"
        }]);
        assert!(parse_mapping_rules_inner(&rules_json).is_err());
    }

    /// Error: parse_mapping_rules rejects non-array input
    #[test]
    fn parse_mapping_rules_rejects_non_array() {
        let rules_json = json!({"not": "an array"});
        assert!(parse_mapping_rules_inner(&rules_json).is_err());
    }

    /// Error: parse_mapping_rules rejects non-object element
    #[test]
    fn parse_mapping_rules_rejects_non_object_element() {
        let rules_json = json!([42]);
        assert!(parse_mapping_rules_inner(&rules_json).is_err());
    }

    /// Correctness: parse_mapping_rules handles empty array
    #[test]
    fn parse_mapping_rules_empty_array() {
        let rules_json = json!([]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        assert!(rules.is_empty());
    }

    /// Correctness: parse_mapping_rules handles multiple rules
    #[test]
    fn parse_mapping_rules_multiple_rules() {
        let rules_json = json!([
            {"sourcePath": "a", "targetPath": "x", "transform": "preserve"},
            {"sourcePath": "b", "targetPath": "y", "transform": "drop"},
            {"targetPath": "z", "transform": "constant", "expression": "99"}
        ]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        assert_eq!(rules.len(), 3);
        assert!(matches!(rules[0].transform, formspec_core::TransformType::Preserve));
        assert!(matches!(rules[1].transform, formspec_core::TransformType::Drop));
        assert!(matches!(rules[2].transform, formspec_core::TransformType::Constant(_)));
    }

    // ── parse_mapping_document ───────────────────────────────────

    /// Correctness: parse_mapping_document with autoMap and missing rules
    #[test]
    fn parse_mapping_document_auto_map_no_rules() {
        let doc = json!({"autoMap": true});
        let result = parse_mapping_document(&doc).unwrap();
        assert!(result.rules.is_empty());
        assert_eq!(result.auto_map, true);
        assert!(result.defaults.is_none());
    }

    /// Correctness: parse_mapping_document with defaults
    #[test]
    fn parse_mapping_document_with_defaults() {
        let doc = json!({
            "rules": [],
            "defaults": {"status": "pending", "count": 0}
        });
        let result = parse_mapping_document(&doc).unwrap();
        let defaults = result.defaults.unwrap();
        assert_eq!(defaults["status"], json!("pending"));
        assert_eq!(defaults["count"], json!(0));
    }

    /// Correctness: parse_mapping_document minimal valid document
    #[test]
    fn parse_mapping_document_minimal() {
        let doc = json!({});
        let result = parse_mapping_document(&doc).unwrap();
        assert!(result.rules.is_empty());
        assert_eq!(result.auto_map, false);
        assert!(result.defaults.is_none());
    }

    /// Error: parse_mapping_document rejects non-object
    #[test]
    #[should_panic(expected = "cannot call wasm-bindgen imported functions on non-wasm targets")]
    fn parse_mapping_document_rejects_non_object() {
        let doc = json!("not an object");
        // Panics because JsError::new() can't run outside WASM — proves error path is reached
        let _ = parse_mapping_document(&doc);
    }

    // ── PRIORITY 2: JSON output shape contract tests ─────────────

    /// Contract: deps_to_json produces the expected JSON shape with all fields
    #[test]
    fn deps_to_json_shape() {
        let deps = Dependencies {
            fields: ["firstName".to_string(), "lastName".to_string()].into_iter().collect(),
            context_refs: ["@current".to_string()].into_iter().collect(),
            instance_refs: ["group1".to_string()].into_iter().collect(),
            mip_deps: Default::default(),
            has_self_ref: true,
            has_wildcard: false,
            uses_prev_next: true,
        };
        let json = deps_to_json(&deps);

        // Verify all expected keys exist and have correct types
        assert!(json["fields"].is_array(), "fields should be array");
        assert!(json["contextRefs"].is_array(), "contextRefs should be array");
        assert!(json["instanceRefs"].is_array(), "instanceRefs should be array");
        assert!(json["mipDeps"].is_array(), "mipDeps should be array");
        assert_eq!(json["hasSelfRef"], json!(true));
        assert_eq!(json["hasWildcard"], json!(false));
        assert_eq!(json["usesPrevNext"], json!(true));

        // Verify content
        let fields: Vec<&str> = json["fields"].as_array().unwrap()
            .iter().map(|v| v.as_str().unwrap()).collect();
        assert!(fields.contains(&"firstName"));
        assert!(fields.contains(&"lastName"));
    }

    /// Contract: deps_to_json with empty dependencies
    #[test]
    fn deps_to_json_empty() {
        let deps = Dependencies::default();
        let json = deps_to_json(&deps);
        assert_eq!(json["fields"].as_array().unwrap().len(), 0);
        assert_eq!(json["hasSelfRef"], json!(false));
        assert_eq!(json["hasWildcard"], json!(false));
        assert_eq!(json["usesPrevNext"], json!(false));
    }

    // ── PRIORITY 3: parse_status_str / status_to_str ─────────────

    /// Correctness: parse_status_str accepts "draft"
    #[test]
    fn parse_status_draft() {
        assert!(matches!(parse_status_str("draft"), Some(formspec_core::RegistryEntryStatus::Draft)));
    }

    /// Correctness: parse_status_str accepts "stable" as Active
    #[test]
    fn parse_status_stable() {
        assert!(matches!(parse_status_str("stable"), Some(formspec_core::RegistryEntryStatus::Active)));
    }

    /// Correctness: parse_status_str accepts "active" as Active (alias)
    #[test]
    fn parse_status_active_alias() {
        assert!(matches!(parse_status_str("active"), Some(formspec_core::RegistryEntryStatus::Active)));
    }

    /// Correctness: parse_status_str accepts "deprecated"
    #[test]
    fn parse_status_deprecated() {
        assert!(matches!(parse_status_str("deprecated"), Some(formspec_core::RegistryEntryStatus::Deprecated)));
    }

    /// Correctness: parse_status_str accepts "retired"
    #[test]
    fn parse_status_retired() {
        assert!(matches!(parse_status_str("retired"), Some(formspec_core::RegistryEntryStatus::Retired)));
    }

    /// Correctness: parse_status_str returns None for unknown status
    #[test]
    fn parse_status_unknown() {
        assert!(parse_status_str("invalid").is_none());
        assert!(parse_status_str("").is_none());
        assert!(parse_status_str("Active").is_none(), "status parsing is case-sensitive");
    }

    /// Asymmetry: parse_status_str("active") → Active, but status_to_str(Active) → "stable"
    /// This means "active" is accepted as input but never produced as output.
    /// Documenting this asymmetry — parse_status_str accepts both "active" and "stable"
    /// but status_to_str always emits "stable" for the Active variant.
    #[test]
    fn status_str_asymmetry_active_vs_stable() {
        // "active" parses to Active
        let status = parse_status_str("active").unwrap();
        // Active serializes to "stable"
        let output = status_to_str(status);
        assert_eq!(output, "stable", "Active variant serializes as 'stable', not 'active'");

        // "stable" also parses to Active
        let status2 = parse_status_str("stable").unwrap();
        let output2 = status_to_str(status2);
        assert_eq!(output2, "stable");
    }

    /// Correctness: status_to_str covers all variants
    #[test]
    fn status_to_str_all_variants() {
        assert_eq!(status_to_str(formspec_core::RegistryEntryStatus::Draft), "draft");
        assert_eq!(status_to_str(formspec_core::RegistryEntryStatus::Active), "stable");
        assert_eq!(status_to_str(formspec_core::RegistryEntryStatus::Deprecated), "deprecated");
        assert_eq!(status_to_str(formspec_core::RegistryEntryStatus::Retired), "retired");
    }

    // ── category_to_str ──────────────────────────────────────────

    /// Correctness: category_to_str covers all ExtensionCategory variants
    #[test]
    fn category_to_str_all_variants() {
        assert_eq!(category_to_str(registry_client::ExtensionCategory::DataType), "dataType");
        assert_eq!(category_to_str(registry_client::ExtensionCategory::Function), "function");
        assert_eq!(category_to_str(registry_client::ExtensionCategory::Constraint), "constraint");
        assert_eq!(category_to_str(registry_client::ExtensionCategory::Property), "property");
        assert_eq!(category_to_str(registry_client::ExtensionCategory::Namespace), "namespace");
    }

    // ── lint_result_to_json ──────────────────────────────────────

    /// Contract: lint_result_to_json produces the expected { documentType, valid, diagnostics } shape
    #[test]
    fn lint_result_to_json_shape() {
        let result = formspec_lint::LintResult {
            document_type: None,
            valid: true,
            diagnostics: vec![],
        };
        let json = lint_result_to_json(&result);
        assert_eq!(json["valid"], json!(true));
        assert!(json["documentType"].is_null());
        assert_eq!(json["diagnostics"].as_array().unwrap().len(), 0);
    }

    /// Contract: lint_result_to_json serializes diagnostics with correct severity strings
    #[test]
    fn lint_result_to_json_diagnostic_severities() {
        let result = formspec_lint::LintResult {
            document_type: None,
            valid: false,
            diagnostics: vec![
                formspec_lint::LintDiagnostic {
                    code: "E001".to_string(),
                    pass: 1,
                    severity: formspec_lint::LintSeverity::Error,
                    path: "/items/0".to_string(),
                    message: "test error".to_string(),
                },
                formspec_lint::LintDiagnostic {
                    code: "W001".to_string(),
                    pass: 2,
                    severity: formspec_lint::LintSeverity::Warning,
                    path: String::new(),
                    message: "test warning".to_string(),
                },
                formspec_lint::LintDiagnostic {
                    code: "I001".to_string(),
                    pass: 3,
                    severity: formspec_lint::LintSeverity::Info,
                    path: String::new(),
                    message: "test info".to_string(),
                },
            ],
        };
        let json = lint_result_to_json(&result);
        let diags = json["diagnostics"].as_array().unwrap();
        assert_eq!(diags.len(), 3);

        assert_eq!(diags[0]["severity"], json!("error"));
        assert_eq!(diags[0]["code"], json!("E001"));
        assert_eq!(diags[0]["path"], json!("/items/0"));
        assert_eq!(diags[0]["message"], json!("test error"));
        assert_eq!(diags[0]["pass"], json!(1));

        assert_eq!(diags[1]["severity"], json!("warning"));
        assert_eq!(diags[1]["path"], json!(""), "empty path serializes as empty string");

        assert_eq!(diags[2]["severity"], json!("info"));
    }

    // ── Validation: required fields (spec: mapping.schema.json) ──

    #[test]
    fn rejects_rule_missing_transform() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b"}]);
        let err = parse_mapping_rules_inner(&rules).unwrap_err();
        assert!(err.contains("missing required field 'transform'"));
    }

    #[test]
    fn accepts_valid_preserve_rule() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "preserve"}]);
        let result = parse_mapping_rules_inner(&rules).unwrap();
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn rejects_expression_transform_missing_expression() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "expression"}]);
        let err = parse_mapping_rules_inner(&rules).unwrap_err();
        assert!(err.contains("requires 'expression'"));
    }

    #[test]
    fn rejects_constant_transform_missing_expression() {
        let rules = json!([{"targetPath": "b", "transform": "constant"}]);
        let err = parse_mapping_rules_inner(&rules).unwrap_err();
        assert!(err.contains("requires 'expression'"));
    }

    #[test]
    fn rejects_concat_transform_missing_expression() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "concat"}]);
        let err = parse_mapping_rules_inner(&rules).unwrap_err();
        assert!(err.contains("requires 'expression'"));
    }

    #[test]
    fn rejects_split_transform_missing_expression() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "split"}]);
        let err = parse_mapping_rules_inner(&rules).unwrap_err();
        assert!(err.contains("requires 'expression'"));
    }

    #[test]
    fn accepts_expression_transform_with_expression() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "expression", "expression": "$ + 1"}]);
        let result = parse_mapping_rules_inner(&rules).unwrap();
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn accepts_constant_transform_with_expression() {
        let rules = json!([{"targetPath": "b", "transform": "constant", "expression": "'hello'"}]);
        let result = parse_mapping_rules_inner(&rules).unwrap();
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn rejects_coerce_transform_missing_coerce() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "coerce"}]);
        let err = parse_mapping_rules_inner(&rules).unwrap_err();
        assert!(err.contains("requires 'coerce'"));
    }

    #[test]
    fn accepts_coerce_transform_with_string_shorthand() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "coerce", "coerce": "number"}]);
        let result = parse_mapping_rules_inner(&rules).unwrap();
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn accepts_coerce_transform_with_object_form() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "coerce", "coerce": {"from": "date", "to": "string"}}]);
        let result = parse_mapping_rules_inner(&rules).unwrap();
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn rejects_rule_missing_both_paths() {
        let rules = json!([{"transform": "preserve"}]);
        let err = parse_mapping_rules_inner(&rules).unwrap_err();
        assert!(err.contains("at least one of 'sourcePath' or 'targetPath'"));
    }

    #[test]
    fn accepts_rule_with_only_source_path() {
        let rules = json!([{"sourcePath": "a", "transform": "drop"}]);
        let result = parse_mapping_rules_inner(&rules).unwrap();
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn accepts_rule_with_only_target_path() {
        let rules = json!([{"targetPath": "b", "transform": "constant", "expression": "'v1'"}]);
        let result = parse_mapping_rules_inner(&rules).unwrap();
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn error_message_includes_rule_index() {
        let rules = json!([
            {"sourcePath": "a", "targetPath": "b", "transform": "preserve"},
            {"sourcePath": "c"}
        ]);
        let err = parse_mapping_rules_inner(&rules).unwrap_err();
        assert!(err.contains("rule[1]"));
    }

    #[test]
    fn rejects_unknown_transform_type() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "magic"}]);
        let err = parse_mapping_rules_inner(&rules).unwrap_err();
        assert!(err.contains("unknown transform type: magic"));
    }
}
