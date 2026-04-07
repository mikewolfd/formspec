//! Money-aware and date-aware JSON normalization for FEL field/variable loading (shared across pipeline stages).
//!
//! Spec S2.1.3: `dataType: "date"` maps to FEL type `date`. When response values
//! enter the evaluation context, date-typed fields must be resolved as FEL `date`
//! values, not raw JSON strings.
#![allow(clippy::missing_docs_in_private_items)]

use fel_core::{FelValue, json_to_fel, parse_date_literal, parse_datetime_literal};
use serde_json::Value;

fn normalize_money_like_json(value: &Value) -> Value {
    match value {
        Value::Array(array) => Value::Array(array.iter().map(normalize_money_like_json).collect()),
        Value::Object(object) => {
            let mut normalized: serde_json::Map<String, Value> = object
                .iter()
                .map(|(key, value)| (key.clone(), normalize_money_like_json(value)))
                .collect();
            if !normalized.contains_key("$type")
                && normalized.contains_key("amount")
                && normalized.contains_key("currency")
            {
                normalized.insert("$type".to_string(), Value::String("money".to_string()));
            }
            Value::Object(normalized)
        }
        _ => value.clone(),
    }
}

/// Convert response JSON to `FelValue` with the same money inference as recalculation and validation.
pub(crate) fn json_to_runtime_fel(value: &Value) -> FelValue {
    json_to_fel(&normalize_money_like_json(value))
}

/// Convert response JSON to `FelValue` with type-aware coercion.
///
/// When `data_type` is `"date"` or `"dateTime"`, ISO date strings are coerced
/// to `FelValue::Date` at context entry (spec S2.1.3). This keeps the FEL
/// evaluator type-strict while ensuring date comparisons work correctly.
pub(crate) fn json_to_runtime_fel_typed(value: &Value, data_type: Option<&str>) -> FelValue {
    match data_type {
        Some("date") => {
            if let Some(s) = value.as_str() {
                if let Some(date) = parse_date_literal(&format!("@{s}")) {
                    return FelValue::Date(date);
                }
            }
        }
        Some("dateTime") => {
            if let Some(s) = value.as_str() {
                if let Some(dt) = parse_datetime_literal(&format!("@{s}")) {
                    return FelValue::Date(dt);
                }
                // Fall back to date-only parse for dateTime fields with date-only strings
                if let Some(date) = parse_date_literal(&format!("@{s}")) {
                    return FelValue::Date(date);
                }
            }
        }
        _ => {}
    }
    json_to_runtime_fel(value)
}
