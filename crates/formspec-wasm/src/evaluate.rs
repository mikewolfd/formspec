//! Definition batch evaluation and screener (`wasm_bindgen`).

use std::collections::HashMap;

use formspec_core::json_object_to_string_map;
use formspec_eval::{
    EvalContext, EvalTrigger, eval_host_context_from_json_map, evaluate_definition_full_with_instances_and_context,
    evaluate_screener, evaluation_result_to_json_value, screener_route_to_json_value,
};
use serde_json::Value;
use wasm_bindgen::prelude::*;

use crate::json_host::{parse_value_str, to_json_string};

// ── Definition Evaluation ───────────────────────────────────────

/// Evaluate a Formspec definition against provided data (4-phase batch processor).
/// Returns JSON: { values, validations, nonRelevant, variables, required, readonly }
#[wasm_bindgen(js_name = "evaluateDefinition")]
pub fn evaluate_definition_wasm(
    definition_json: &str,
    data_json: &str,
    context_json: Option<String>,
) -> Result<String, JsError> {
    evaluate_definition_inner(definition_json, data_json, context_json)
        .map_err(|e| JsError::new(&e))
}

pub(crate) fn evaluate_definition_inner(
    definition_json: &str,
    data_json: &str,
    context_json: Option<String>,
) -> Result<String, String> {
    let definition: Value = parse_value_str(definition_json, "definition JSON")?;
    let data_val: Value = parse_value_str(data_json, "data JSON")?;

    let data = json_object_to_string_map(&data_val);

    let (context, trigger, instances, constraints) = match context_json {
        Some(context_json) => {
            let ctx: Value = parse_value_str(&context_json, "context JSON")?;
            let ctx_obj = ctx.as_object().ok_or("context must be a JSON object")?;
            let bundle = eval_host_context_from_json_map(ctx_obj)?;
            (
                bundle.context,
                bundle.trigger,
                bundle.instances,
                bundle.constraints,
            )
        }
        None => (
            EvalContext::default(),
            EvalTrigger::Continuous,
            HashMap::new(),
            Vec::new(),
        ),
    };

    let result = evaluate_definition_full_with_instances_and_context(
        &definition,
        &data,
        trigger,
        &constraints,
        &instances,
        &context,
    );

    let json = evaluation_result_to_json_value(&result);
    to_json_string(&json)
}

/// Evaluate screener routes for an isolated answer payload.
#[wasm_bindgen(js_name = "evaluateScreener")]
pub fn evaluate_screener_wasm(
    definition_json: &str,
    answers_json: &str,
) -> Result<String, JsError> {
    let definition: Value =
        parse_value_str(definition_json, "definition JSON").map_err(|e| JsError::new(&e))?;
    let answers_val: Value =
        parse_value_str(answers_json, "answers JSON").map_err(|e| JsError::new(&e))?;

    let answers = json_object_to_string_map(&answers_val);

    let route = evaluate_screener(&definition, &answers);
    let json = screener_route_to_json_value(route.as_ref());
    to_json_string(&json).map_err(|e| JsError::new(&e))
}
