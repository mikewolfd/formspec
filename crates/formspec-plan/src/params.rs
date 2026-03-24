//! Parameter interpolation for custom component templates.

use serde_json::{Map, Value};

/// Replace `{param}` patterns in string values within a JSON tree.
///
/// Mutates `tree` in-place, substituting occurrences of `{key}` with
/// the corresponding value from `params`. String params are inlined as text;
/// non-string params replace the entire value if the string is exactly `{key}`.
pub fn interpolate_params(tree: &mut Value, params: &Map<String, Value>) {
    match tree {
        Value::String(s) => {
            // Check if the entire string is a single `{param}` reference
            if s.starts_with('{') && s.ends_with('}') && s.len() > 2 {
                let inner = &s[1..s.len() - 1];
                // Only match if no nested braces
                if !inner.contains('{') && !inner.contains('}') {
                    if let Some(replacement) = params.get(inner) {
                        *tree = replacement.clone();
                        return;
                    }
                }
            }

            // Partial replacement: substitute all {key} occurrences with string values
            let mut result = s.clone();
            for (key, val) in params {
                let pattern = format!("{{{}}}", key);
                if result.contains(&pattern) {
                    let replacement_str = match val {
                        Value::String(sv) => sv.clone(),
                        Value::Number(n) => n.to_string(),
                        Value::Bool(b) => b.to_string(),
                        Value::Null => "null".to_string(),
                        _ => continue, // skip objects/arrays for partial replacement
                    };
                    result = result.replace(&pattern, &replacement_str);
                }
            }
            if &result != s {
                *s = result;
            }
        }
        Value::Array(arr) => {
            for item in arr.iter_mut() {
                interpolate_params(item, params);
            }
        }
        Value::Object(map) => {
            for (_key, val) in map.iter_mut() {
                interpolate_params(val, params);
            }
        }
        _ => {}
    }
}
