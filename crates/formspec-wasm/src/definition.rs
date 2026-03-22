//! Definition assembly (`$ref` resolution) for `wasm_bindgen`.

use formspec_core::{JsonWireStyle, MapResolver, assemble_definition, assembly_result_to_json_value};
use serde_json::Value;
use wasm_bindgen::prelude::*;

use crate::json_host::{parse_value_str, to_json_string};

#[wasm_bindgen(js_name = "assembleDefinition")]
pub fn assemble_definition_wasm(
    definition_json: &str,
    fragments_json: &str,
) -> Result<String, JsError> {
    let definition: Value =
        parse_value_str(definition_json, "definition JSON").map_err(|e| JsError::new(&e))?;
    let fragments: Value =
        parse_value_str(fragments_json, "fragments JSON").map_err(|e| JsError::new(&e))?;

    let mut resolver = MapResolver::new();
    resolver.merge_from_json_object(&fragments);

    let result = assemble_definition(&definition, &resolver);
    let json = assembly_result_to_json_value(&result, JsonWireStyle::JsCamel);
    to_json_string(&json).map_err(|e| JsError::new(&e))
}
