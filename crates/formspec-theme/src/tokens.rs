//! Token resolution: $token.key references against component > theme > renderer defaults.
//! Non-recursive — detects circular references and returns None.

use serde_json::{Map, Value};

const TOKEN_PREFIX: &str = "$token.";

/// Resolve a `$token.key` reference against component tokens, theme tokens,
/// and renderer defaults. Non-recursive. Returns None if unresolved.
pub fn resolve_token(
    value: &str,
    component_tokens: Option<&Map<String, Value>>,
    theme_tokens: Option<&Map<String, Value>>,
) -> Option<Value> {
    if !value.starts_with(TOKEN_PREFIX) {
        return None;
    }

    let key = &value[TOKEN_PREFIX.len()..];
    if key.is_empty() {
        return None;
    }

    // Component tokens have highest priority
    if let Some(ct) = component_tokens {
        if let Some(v) = ct.get(key) {
            // Non-recursive: if the resolved value is itself a token ref, warn and stop
            if let Some(s) = v.as_str() {
                if s.starts_with(TOKEN_PREFIX) {
                    // Recursive token detected — return None
                    return None;
                }
            }
            return Some(v.clone());
        }
    }

    // Theme tokens
    if let Some(tt) = theme_tokens {
        if let Some(v) = tt.get(key) {
            if let Some(s) = v.as_str() {
                if s.starts_with(TOKEN_PREFIX) {
                    return None;
                }
            }
            return Some(v.clone());
        }
    }

    None
}

/// Resolve all $token references in a style map.
pub fn resolve_style_tokens(
    style: &Map<String, Value>,
    component_tokens: Option<&Map<String, Value>>,
    theme_tokens: Option<&Map<String, Value>>,
) -> Map<String, Value> {
    let mut resolved = Map::new();
    for (key, val) in style {
        if let Some(s) = val.as_str() {
            if let Some(resolved_val) = resolve_token(s, component_tokens, theme_tokens) {
                resolved.insert(key.clone(), resolved_val);
                continue;
            }
        }
        resolved.insert(key.clone(), val.clone());
    }
    resolved
}
