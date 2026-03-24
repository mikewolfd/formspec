//! WASM exports for formspec-pdf — PDF rendering and XFDF round-trip.

use std::collections::HashMap;
use wasm_bindgen::prelude::*;

/// Render a PDF from a definition, theme, component document, response data, and options.
///
/// Returns PDF bytes as a Vec<u8>.
#[wasm_bindgen(js_name = "renderPDF")]
pub fn render_pdf(
    definition_json: &str,
    theme_json: &str,
    component_document_json: &str,
    response_json: &str,
    options_json: &str,
) -> Result<Vec<u8>, JsError> {
    let definition: serde_json::Value = serde_json::from_str(definition_json)
        .map_err(|e| JsError::new(&format!("Invalid definition: {}", e)))?;

    let options: formspec_pdf::PdfOptions = if options_json == "null" || options_json == "{}" || options_json.is_empty() {
        formspec_pdf::PdfOptions::default()
    } else {
        serde_json::from_str(options_json)
            .map_err(|e| JsError::new(&format!("Invalid options: {}", e)))?
    };

    // Build plan context
    let items = definition
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let form_presentation = definition.get("formPresentation").cloned();

    let theme: Option<formspec_theme::ThemeDocument> = if theme_json == "null" || theme_json.is_empty() {
        None
    } else {
        serde_json::from_str(theme_json).ok()
    };

    let component_document: Option<serde_json::Value> = if component_document_json == "null" || component_document_json.is_empty() {
        None
    } else {
        serde_json::from_str(component_document_json).ok()
    };

    // Build item lookup (recursive — finds items nested inside groups)
    let items_clone = items.clone();
    let ctx = formspec_plan::PlanContext {
        items: items.clone(),
        form_presentation,
        component_document: component_document.clone(),
        theme,
        viewport_width: None,
        find_item: Box::new(move |key: &str| {
            formspec_plan::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    };

    // Plan: use component tree when available, then theme pages, then definition fallback.
    // Per SS4.5/SS11.4, when using a component tree, append unbound required items.
    let layout_nodes = if let Some(ref comp_doc) = component_document {
        if let Some(tree) = comp_doc.get("tree") {
            let tree_node = formspec_plan::plan_component_tree(tree, &ctx);
            let unbound = formspec_plan::plan_unbound_required(&tree_node, &items, &ctx);
            let mut nodes = vec![tree_node];
            nodes.extend(unbound);
            nodes
        } else {
            formspec_plan::plan_theme_pages(&items, &ctx)
        }
    } else {
        formspec_plan::plan_theme_pages(&items, &ctx)
    };

    // Evaluate
    let response: HashMap<String, serde_json::Value> = if response_json == "null" || response_json == "{}" || response_json.is_empty() {
        HashMap::new()
    } else {
        serde_json::from_str(response_json).unwrap_or_default()
    };

    let eval_result = formspec_eval::evaluate_definition(&definition, &response);

    // Merge
    let validations_by_path: HashMap<String, Vec<formspec_plan::FieldValidation>> = eval_result
        .validations
        .iter()
        .fold(HashMap::new(), |mut acc, v| {
            acc.entry(v.path.clone())
                .or_default()
                .push(formspec_plan::FieldValidation {
                    severity: v.severity.clone(),
                    message: v.message.clone(),
                    code: Some(v.code.clone()),
                });
            acc
        });

    let evaluated = formspec_plan::evaluate_and_merge(
        &layout_nodes,
        &eval_result.values,
        &eval_result.non_relevant,
        &eval_result.required,
        &eval_result.readonly,
        &validations_by_path,
    );

    // Render PDF
    let pdf_bytes = formspec_pdf::render_pdf(&evaluated, &options);
    Ok(pdf_bytes)
}

/// Generate XFDF XML from evaluated field values.
///
/// Input: JSON string of {bindPath: value} map.
/// Output: XFDF XML string.
#[wasm_bindgen(js_name = "generateXFDF")]
pub fn generate_xfdf(fields_json: &str) -> Result<String, JsError> {
    let fields: HashMap<String, serde_json::Value> = serde_json::from_str(fields_json)
        .map_err(|e| JsError::new(&format!("Invalid fields: {}", e)))?;

    Ok(formspec_pdf::generate_xfdf(&fields))
}

/// Parse XFDF XML into a {bindPath: value} JSON map.
///
/// Input: XFDF XML string.
/// Output: JSON string of the parsed field values.
#[wasm_bindgen(js_name = "parseXFDF")]
pub fn parse_xfdf(xfdf_xml: &str) -> Result<String, JsError> {
    let fields = formspec_pdf::parse_xfdf(xfdf_xml)
        .map_err(|e| JsError::new(&e))?;

    serde_json::to_string(&fields).map_err(|e| JsError::new(&e.to_string()))
}
