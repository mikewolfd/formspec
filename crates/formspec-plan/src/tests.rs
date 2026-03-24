//! Unit tests for the layout planner.

use serde_json::{json, Map, Value};

use crate::defaults::get_default_component;
use crate::params::interpolate_params;
use crate::planner::{
    classify_component, plan_definition_fallback, reset_node_id_counter,
};
use crate::responsive::resolve_responsive_props;
use crate::types::*;

// ---------------------------------------------------------------------------
// get_default_component
// ---------------------------------------------------------------------------

#[test]
fn default_component_string() {
    assert_eq!(get_default_component("string"), "TextInput");
}

#[test]
fn default_component_text() {
    assert_eq!(get_default_component("text"), "TextInput");
}

#[test]
fn default_component_integer() {
    assert_eq!(get_default_component("integer"), "NumberInput");
}

#[test]
fn default_component_decimal() {
    assert_eq!(get_default_component("decimal"), "NumberInput");
}

#[test]
fn default_component_number() {
    assert_eq!(get_default_component("number"), "NumberInput");
}

#[test]
fn default_component_boolean() {
    assert_eq!(get_default_component("boolean"), "Toggle");
}

#[test]
fn default_component_date() {
    assert_eq!(get_default_component("date"), "DatePicker");
}

#[test]
fn default_component_date_time() {
    assert_eq!(get_default_component("dateTime"), "DatePicker");
}

#[test]
fn default_component_time() {
    assert_eq!(get_default_component("time"), "DatePicker");
}

#[test]
fn default_component_uri() {
    assert_eq!(get_default_component("uri"), "TextInput");
}

#[test]
fn default_component_choice() {
    assert_eq!(get_default_component("choice"), "Select");
}

#[test]
fn default_component_multi_choice() {
    assert_eq!(get_default_component("multiChoice"), "CheckboxGroup");
}

#[test]
fn default_component_attachment() {
    assert_eq!(get_default_component("attachment"), "FileUpload");
}

#[test]
fn default_component_money() {
    assert_eq!(get_default_component("money"), "NumberInput");
}

#[test]
fn default_component_unknown_falls_back_to_text_input() {
    assert_eq!(get_default_component("unknown"), "TextInput");
    assert_eq!(get_default_component(""), "TextInput");
}

// ---------------------------------------------------------------------------
// classify_component
// ---------------------------------------------------------------------------

#[test]
fn classify_layout_components() {
    assert_eq!(classify_component("Stack"), NodeCategory::Layout);
    assert_eq!(classify_component("Card"), NodeCategory::Layout);
    assert_eq!(classify_component("Accordion"), NodeCategory::Layout);
    assert_eq!(classify_component("Page"), NodeCategory::Layout);
}

#[test]
fn classify_field_components() {
    assert_eq!(classify_component("TextInput"), NodeCategory::Field);
    assert_eq!(classify_component("NumberInput"), NodeCategory::Field);
    assert_eq!(classify_component("Select"), NodeCategory::Field);
    assert_eq!(classify_component("Toggle"), NodeCategory::Field);
    assert_eq!(classify_component("Checkbox"), NodeCategory::Field);
    assert_eq!(classify_component("DatePicker"), NodeCategory::Field);
    assert_eq!(classify_component("RadioGroup"), NodeCategory::Field);
    assert_eq!(classify_component("CheckboxGroup"), NodeCategory::Field);
    assert_eq!(classify_component("Slider"), NodeCategory::Field);
    assert_eq!(classify_component("Rating"), NodeCategory::Field);
    assert_eq!(classify_component("FileUpload"), NodeCategory::Field);
    assert_eq!(classify_component("Signature"), NodeCategory::Field);
    assert_eq!(classify_component("MoneyInput"), NodeCategory::Field);
}

#[test]
fn classify_display_components() {
    assert_eq!(classify_component("Heading"), NodeCategory::Display);
    assert_eq!(classify_component("Text"), NodeCategory::Display);
    assert_eq!(classify_component("Divider"), NodeCategory::Display);
    assert_eq!(classify_component("Alert"), NodeCategory::Display);
}

#[test]
fn classify_interactive_components() {
    assert_eq!(classify_component("Wizard"), NodeCategory::Interactive);
    assert_eq!(classify_component("Tabs"), NodeCategory::Interactive);
}

#[test]
fn classify_unknown_components() {
    assert_eq!(classify_component("x-custom"), NodeCategory::Special);
    assert_eq!(classify_component("MyWidget"), NodeCategory::Special);
}

// ---------------------------------------------------------------------------
// resolve_responsive_props
// ---------------------------------------------------------------------------

#[test]
fn responsive_no_overrides_returns_original() {
    let comp = json!({
        "component": "TextInput",
        "label": "Name"
    });
    let result = resolve_responsive_props(&comp, 800, None);
    assert_eq!(result.get("component").unwrap().as_str().unwrap(), "TextInput");
    assert_eq!(result.get("label").unwrap().as_str().unwrap(), "Name");
}

#[test]
fn responsive_applies_matching_breakpoints_cumulatively() {
    let comp = json!({
        "component": "Stack",
        "columns": 1,
        "responsive": {
            "sm": { "minWidth": 600, "columns": 2 },
            "md": { "minWidth": 900, "columns": 3 },
            "lg": { "minWidth": 1200, "columns": 4 }
        }
    });

    // Viewport 800: sm applies (600 <= 800), md doesn't (900 > 800)
    let result = resolve_responsive_props(&comp, 800, None);
    assert_eq!(result.get("columns").unwrap().as_u64().unwrap(), 2);
    assert!(result.get("responsive").is_none(), "responsive key should be removed");

    // Viewport 1000: sm and md both apply
    let result = resolve_responsive_props(&comp, 1000, None);
    assert_eq!(result.get("columns").unwrap().as_u64().unwrap(), 3);

    // Viewport 1500: all apply, lg wins (last)
    let result = resolve_responsive_props(&comp, 1500, None);
    assert_eq!(result.get("columns").unwrap().as_u64().unwrap(), 4);
}

#[test]
fn responsive_below_all_breakpoints() {
    let comp = json!({
        "component": "Stack",
        "columns": 1,
        "responsive": {
            "md": { "minWidth": 768, "columns": 2 }
        }
    });
    let result = resolve_responsive_props(&comp, 400, None);
    assert_eq!(result.get("columns").unwrap().as_u64().unwrap(), 1);
}

// ---------------------------------------------------------------------------
// interpolate_params
// ---------------------------------------------------------------------------

#[test]
fn interpolate_simple_string_param() {
    let params: Map<String, Value> = [("name".to_string(), json!("World"))]
        .into_iter()
        .collect();
    let mut tree = json!("Hello {name}!");
    interpolate_params(&mut tree, &params);
    assert_eq!(tree.as_str().unwrap(), "Hello World!");
}

#[test]
fn interpolate_exact_param_replaces_with_value() {
    let params: Map<String, Value> = [("count".to_string(), json!(42))]
        .into_iter()
        .collect();
    let mut tree = json!("{count}");
    interpolate_params(&mut tree, &params);
    assert_eq!(tree, json!(42));
}

#[test]
fn interpolate_nested_objects() {
    let params: Map<String, Value> = [("label".to_string(), json!("Name"))]
        .into_iter()
        .collect();
    let mut tree = json!({
        "component": "TextInput",
        "label": "{label}",
        "children": [{"hint": "Enter {label}"}]
    });
    interpolate_params(&mut tree, &params);
    assert_eq!(tree["label"].as_str().unwrap(), "Name");
    assert_eq!(tree["children"][0]["hint"].as_str().unwrap(), "Enter Name");
}

#[test]
fn interpolate_no_match_leaves_unchanged() {
    let params: Map<String, Value> = Map::new();
    let mut tree = json!("No {params} here");
    interpolate_params(&mut tree, &params);
    assert_eq!(tree.as_str().unwrap(), "No {params} here");
}

// ---------------------------------------------------------------------------
// Node ID generation and reset
// ---------------------------------------------------------------------------

#[test]
fn node_id_counter_reset() {
    reset_node_id_counter();
    let id1 = crate::planner::next_id_for_test("test");
    assert_eq!(id1, "test-0");
    let id2 = crate::planner::next_id_for_test("test");
    assert_eq!(id2, "test-1");
    reset_node_id_counter();
    let id3 = crate::planner::next_id_for_test("test");
    assert_eq!(id3, "test-0");
}

// ---------------------------------------------------------------------------
// plan_definition_fallback
// ---------------------------------------------------------------------------

fn make_simple_ctx(items: Vec<Value>) -> PlanContext {
    let items_clone = items.clone();
    PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: None,
        theme: None,
        viewport_width: None,
        find_item: Box::new(move |key: &str| {
            items_clone
                .iter()
                .find(|item| {
                    item.get("key")
                        .and_then(|v| v.as_str())
                        .map_or(false, |k| k == key)
                })
                .cloned()
        }),
        is_component_available: None,
    }
}

#[test]
fn fallback_simple_string_field() {
    reset_node_id_counter();
    let items = vec![json!({
        "key": "name",
        "label": "Full Name",
        "dataType": "string"
    })];
    let ctx = make_simple_ctx(items.clone());
    let nodes = plan_definition_fallback(&items, &ctx);

    assert_eq!(nodes.len(), 1);
    let node = &nodes[0];
    assert_eq!(node.component, "TextInput");
    assert_eq!(node.category, NodeCategory::Field);
    assert_eq!(node.bind_path.as_deref(), Some("name"));
    assert!(node.field_item.is_some());
    let fi = node.field_item.as_ref().unwrap();
    assert_eq!(fi.key, "name");
    assert_eq!(fi.label.as_deref(), Some("Full Name"));
    assert_eq!(fi.data_type.as_deref(), Some("string"));
}

#[test]
fn fallback_multiple_data_types() {
    reset_node_id_counter();
    let items = vec![
        json!({"key": "name", "dataType": "string"}),
        json!({"key": "age", "dataType": "integer"}),
        json!({"key": "active", "dataType": "boolean"}),
        json!({"key": "dob", "dataType": "date"}),
        json!({"key": "color", "dataType": "choice"}),
    ];
    let ctx = make_simple_ctx(items.clone());
    let nodes = plan_definition_fallback(&items, &ctx);

    assert_eq!(nodes.len(), 5);
    assert_eq!(nodes[0].component, "TextInput");
    assert_eq!(nodes[1].component, "NumberInput");
    assert_eq!(nodes[2].component, "Toggle");
    assert_eq!(nodes[3].component, "DatePicker");
    assert_eq!(nodes[4].component, "Select");
}

#[test]
fn fallback_group_with_children() {
    reset_node_id_counter();
    let items = vec![json!({
        "key": "address",
        "type": "group",
        "label": "Address",
        "items": [
            {"key": "street", "dataType": "string", "label": "Street"},
            {"key": "city", "dataType": "string", "label": "City"}
        ]
    })];
    let ctx = make_simple_ctx(items.clone());
    let nodes = plan_definition_fallback(&items, &ctx);

    assert_eq!(nodes.len(), 1);
    let group = &nodes[0];
    assert_eq!(group.component, "Stack");
    assert_eq!(group.category, NodeCategory::Layout);
    assert_eq!(group.children.len(), 2);
    assert_eq!(group.scope_change.as_deref(), Some("address"));
    assert_eq!(group.children[0].component, "TextInput");
    assert_eq!(group.children[1].component, "TextInput");
}

#[test]
fn fallback_wizard_page_mode() {
    reset_node_id_counter();
    let items = vec![
        json!({"key": "name", "dataType": "string"}),
        json!({"key": "age", "dataType": "integer"}),
    ];
    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation: Some(json!({"pageMode": "wizard"})),
        component_document: None,
        theme: None,
        viewport_width: None,
        find_item: Box::new(move |key: &str| {
            items_clone
                .iter()
                .find(|item| {
                    item.get("key")
                        .and_then(|v| v.as_str())
                        .map_or(false, |k| k == key)
                })
                .cloned()
        }),
        is_component_available: None,
    };
    let nodes = plan_definition_fallback(&items, &ctx);

    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].component, "Wizard");
    assert_eq!(nodes[0].category, NodeCategory::Interactive);
    assert_eq!(nodes[0].children.len(), 2);
}

#[test]
fn fallback_display_item() {
    reset_node_id_counter();
    let items = vec![json!({
        "key": "info",
        "type": "display",
        "content": "Please fill in all fields."
    })];
    let ctx = make_simple_ctx(items.clone());
    let nodes = plan_definition_fallback(&items, &ctx);

    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].component, "Text");
    assert_eq!(nodes[0].category, NodeCategory::Display);
    assert_eq!(
        nodes[0].props.get("content").and_then(|v| v.as_str()),
        Some("Please fill in all fields.")
    );
}
