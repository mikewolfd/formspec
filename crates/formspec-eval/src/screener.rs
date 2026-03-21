//! Screener evaluation — evaluate screener routes and return the first matching route.

use serde_json::Value;
use std::collections::HashMap;

use fel_core::{FormspecEnvironment, evaluate, json_to_fel, parse};

/// Result of evaluating screener routes.
#[derive(Debug, Clone, PartialEq)]
pub struct ScreenerRouteResult {
    pub target: String,
    pub label: Option<String>,
    pub message: Option<String>,
}

/// Evaluate screener routes and return the first matching route.
///
/// Screener answers are evaluated in an isolated environment —
/// they never pollute the main form data.
pub fn evaluate_screener(
    definition: &Value,
    answers: &HashMap<String, Value>,
) -> Option<ScreenerRouteResult> {
    let routes = definition.get("screener")?.get("routes")?.as_array()?;

    let mut env = FormspecEnvironment::new();
    for (k, v) in answers {
        env.set_field(k, json_to_fel(v));
    }

    for route in routes {
        let condition = match route.get("condition").and_then(|v| v.as_str()) {
            Some(c) => c,
            None => continue,
        };
        let expr = match parse(condition) {
            Ok(e) => e,
            Err(_) => continue,
        };
        let result = evaluate(&expr, &env);
        if result.value.is_truthy() {
            return Some(ScreenerRouteResult {
                target: route
                    .get("target")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                label: route
                    .get("label")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                message: route
                    .get("message")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
            });
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn screener_def() -> Value {
        json!({
            "$formspec": "1.0",
            "url": "https://example.org/screener",
            "version": "1.0.0",
            "status": "active",
            "title": "Test",
            "items": [
                { "type": "field", "key": "name", "dataType": "string" }
            ],
            "screener": {
                "items": [
                    { "type": "field", "key": "orgType", "dataType": "choice" }
                ],
                "routes": [
                    {
                        "condition": "$orgType = 'nonprofit'",
                        "target": "https://example.org/forms/new|1.0.0",
                        "label": "New"
                    },
                    {
                        "condition": "true",
                        "target": "https://example.org/forms/general|1.0.0",
                        "label": "General"
                    }
                ]
            }
        })
    }

    #[test]
    fn screener_returns_first_matching_route() {
        let def = screener_def();
        let mut answers = HashMap::new();
        answers.insert("orgType".to_string(), json!("nonprofit"));
        let result = evaluate_screener(&def, &answers);
        assert!(result.is_some());
        let route = result.unwrap();
        assert_eq!(route.target, "https://example.org/forms/new|1.0.0");
        assert_eq!(route.label, Some("New".to_string()));
    }

    #[test]
    fn screener_returns_fallback_when_no_specific_match() {
        let def = screener_def();
        let mut answers = HashMap::new();
        answers.insert("orgType".to_string(), json!("forprofit"));
        let result = evaluate_screener(&def, &answers);
        assert!(result.is_some());
        let route = result.unwrap();
        assert_eq!(route.target, "https://example.org/forms/general|1.0.0");
    }

    #[test]
    fn screener_returns_none_without_screener_section() {
        let def = json!({
            "items": [{ "key": "x", "dataType": "string" }]
        });
        let answers = HashMap::new();
        assert!(evaluate_screener(&def, &answers).is_none());
    }
}
