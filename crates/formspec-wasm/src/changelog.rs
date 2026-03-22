//! Changelog generation (`wasm_bindgen`).

use formspec_core::changelog;
use formspec_core::{JsonWireStyle, changelog_to_json_value};
use serde_json::Value;
use wasm_bindgen::prelude::*;

use crate::json_host::{parse_value_str, to_json_string};

/// Diff two Formspec definition versions and produce a structured changelog.
/// Returns JSON with camelCase keys.
#[wasm_bindgen(js_name = "generateChangelog")]
pub fn generate_changelog_wasm(
    old_def_json: &str,
    new_def_json: &str,
    definition_url: &str,
) -> Result<String, JsError> {
    generate_changelog_inner(old_def_json, new_def_json, definition_url)
        .map_err(|e| JsError::new(&e))
}

pub(crate) fn generate_changelog_inner(
    old_def_json: &str,
    new_def_json: &str,
    definition_url: &str,
) -> Result<String, String> {
    let old_def: Value = parse_value_str(old_def_json, "old definition JSON")?;
    let new_def: Value = parse_value_str(new_def_json, "new definition JSON")?;

    let result = changelog::generate_changelog(&old_def, &new_def, definition_url);
    let json = changelog_to_json_value(&result, JsonWireStyle::JsCamel);
    to_json_string(&json)
}
