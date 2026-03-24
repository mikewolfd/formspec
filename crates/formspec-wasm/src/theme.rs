//! WASM exports for formspec-theme — cascade resolution and token resolution.

use wasm_bindgen::prelude::*;

/// Resolve the effective PresentationBlock for a single item via the 6-level cascade.
///
/// Input: JSON strings for theme, item descriptor, and tier1 hints.
/// Output: JSON string of the resolved PresentationBlock.
#[wasm_bindgen(js_name = "resolvePresentation")]
pub fn resolve_presentation(
    theme_json: &str,
    item_json: &str,
    tier1_json: &str,
) -> Result<String, JsError> {
    let theme: Option<formspec_theme::ThemeDocument> = if theme_json == "null" || theme_json.is_empty() {
        None
    } else {
        Some(serde_json::from_str(theme_json).map_err(|e| JsError::new(&e.to_string()))?)
    };

    let item: formspec_theme::ItemDescriptor = serde_json::from_str(item_json)
        .map_err(|e| JsError::new(&format!("Invalid item descriptor: {}", e)))?;

    let tier1: Option<formspec_theme::Tier1Hints> = if tier1_json == "null" || tier1_json.is_empty() {
        None
    } else {
        Some(serde_json::from_str(tier1_json).map_err(|e| JsError::new(&e.to_string()))?)
    };

    let result = formspec_theme::resolve_presentation(
        theme.as_ref(),
        &item,
        tier1.as_ref(),
        None,
    );

    serde_json::to_string(&result).map_err(|e| JsError::new(&e.to_string()))
}

/// Resolve a $token.key reference against component tokens and theme tokens.
///
/// Returns the resolved JSON value, or "null" if unresolved.
#[wasm_bindgen(js_name = "resolveToken")]
pub fn resolve_token(
    value: &str,
    component_tokens_json: &str,
    theme_tokens_json: &str,
) -> Result<String, JsError> {
    let component_tokens: Option<serde_json::Map<String, serde_json::Value>> =
        if component_tokens_json == "null" || component_tokens_json.is_empty() {
            None
        } else {
            Some(serde_json::from_str(component_tokens_json).map_err(|e| JsError::new(&e.to_string()))?)
        };

    let theme_tokens: Option<serde_json::Map<String, serde_json::Value>> =
        if theme_tokens_json == "null" || theme_tokens_json.is_empty() {
            None
        } else {
            Some(serde_json::from_str(theme_tokens_json).map_err(|e| JsError::new(&e.to_string()))?)
        };

    let result = formspec_theme::resolve_token(
        value,
        component_tokens.as_ref(),
        theme_tokens.as_ref(),
    );

    match result {
        Some(v) => serde_json::to_string(&v).map_err(|e| JsError::new(&e.to_string())),
        None => Ok("null".to_string()),
    }
}
