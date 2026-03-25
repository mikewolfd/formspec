//! Unit tests for the layout planner.

use serde_json::{json, Map, Value};

use crate::defaults::get_default_component;
use crate::params::interpolate_params;
use crate::planner::{
    build_field_item_snapshot, build_tier1_hints, classify_component,
    plan_component_tree, plan_definition_fallback, plan_theme_pages,
    plan_unbound_required, reset_node_id_counter,
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
    assert_eq!(get_default_component("money"), "MoneyInput");
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
    assert_eq!(classify_component("Grid"), NodeCategory::Layout);
    assert_eq!(classify_component("Row"), NodeCategory::Layout);
    assert_eq!(classify_component("Column"), NodeCategory::Layout);
    assert_eq!(classify_component("Collapsible"), NodeCategory::Layout);
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
    assert_eq!(classify_component("Textarea"), NodeCategory::Field);
    assert_eq!(classify_component("RichText"), NodeCategory::Field);
}

#[test]
fn classify_display_components() {
    assert_eq!(classify_component("Heading"), NodeCategory::Display);
    assert_eq!(classify_component("Text"), NodeCategory::Display);
    assert_eq!(classify_component("Divider"), NodeCategory::Display);
    assert_eq!(classify_component("Alert"), NodeCategory::Display);
    assert_eq!(classify_component("Image"), NodeCategory::Display);
    assert_eq!(classify_component("Html"), NodeCategory::Display);
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

#[test]
fn responsive_drops_forbidden_structural_keys() {
    let comp = json!({
        "component": "Stack",
        "columns": 1,
        "responsive": {
            "md": {
                "minWidth": 768,
                "columns": 2,
                "component": "Grid",
                "children": [{"x": 1}],
                "bind": "foo",
                "when": "true"
            }
        }
    });
    let result = resolve_responsive_props(&comp, 1000, None);
    // Allowed key should be applied
    assert_eq!(result.get("columns").unwrap().as_u64().unwrap(), 2);
    // Forbidden keys should be dropped (original preserved)
    assert_eq!(result.get("component").unwrap().as_str().unwrap(), "Stack");
    assert!(result.get("children").is_none(), "children is forbidden in responsive overrides");
    assert!(result.get("bind").is_none(), "bind is forbidden in responsive overrides");
    assert!(result.get("when").is_none(), "when is forbidden in responsive overrides");
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
fn fallback_money_field_uses_money_input() {
    reset_node_id_counter();
    let items = vec![json!({
        "key": "amount",
        "label": "Total Amount",
        "dataType": "money"
    })];
    let ctx = make_simple_ctx(items.clone());
    let nodes = plan_definition_fallback(&items, &ctx);

    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].component, "MoneyInput");
    assert_eq!(nodes[0].category, NodeCategory::Field);
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

#[test]
fn fallback_tabs_page_mode() {
    reset_node_id_counter();
    let items = vec![
        json!({"key": "a", "dataType": "string"}),
        json!({"key": "b", "dataType": "string"}),
    ];
    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation: Some(json!({"pageMode": "tabs"})),
        component_document: None,
        theme: None,
        viewport_width: None,
        find_item: Box::new(move |key: &str| {
            items_clone.iter().find(|i| i.get("key").and_then(|v| v.as_str()) == Some(key)).cloned()
        }),
        is_component_available: None,
    };
    let nodes = plan_definition_fallback(&items, &ctx);

    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].component, "Tabs");
    assert_eq!(nodes[0].category, NodeCategory::Interactive);
    assert_eq!(nodes[0].children.len(), 2);
}

#[test]
fn fallback_repeatable_group_detected() {
    reset_node_id_counter();
    let items = vec![json!({
        "key": "contacts",
        "type": "group",
        "label": "Contacts",
        "repeatable": true,
        "items": [
            {"key": "name", "dataType": "string"},
            {"key": "email", "dataType": "string"}
        ]
    })];
    let ctx = make_simple_ctx(items.clone());
    let nodes = plan_definition_fallback(&items, &ctx);

    assert_eq!(nodes.len(), 1);
    let group = &nodes[0];
    assert_eq!(group.repeat_group.as_deref(), Some("contacts"));
    assert_eq!(group.is_repeat_template, Some(true));
    assert_eq!(group.children.len(), 2);
}

#[test]
fn fallback_relevant_condition_from_bind() {
    reset_node_id_counter();
    let items = vec![json!({
        "key": "extra",
        "dataType": "string",
        "bind": {"relevant": "$showExtra = true"}
    })];
    let ctx = make_simple_ctx(items.clone());
    let nodes = plan_definition_fallback(&items, &ctx);

    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].when.as_deref(), Some("$showExtra = true"));
}

// ---------------------------------------------------------------------------
// plan_component_tree
// ---------------------------------------------------------------------------

fn make_tree_ctx(items: Vec<Value>, comp_doc: Option<Value>) -> PlanContext {
    let items_clone = items.clone();
    PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: comp_doc,
        theme: None,
        viewport_width: None,
        find_item: Box::new(move |key: &str| {
            items_clone.iter().find(|i| {
                i.get("key").and_then(|v| v.as_str()) == Some(key)
            }).cloned()
        }),
        is_component_available: None,
    }
}

#[test]
fn plan_component_tree_simple_stack() {
    reset_node_id_counter();
    let tree = json!({
        "component": "Stack",
        "children": [
            {"component": "TextInput", "bind": "name"},
            {"component": "NumberInput", "bind": "age"}
        ]
    });
    let items = vec![
        json!({"key": "name", "dataType": "string", "label": "Name"}),
        json!({"key": "age", "dataType": "integer", "label": "Age"}),
    ];
    let ctx = make_tree_ctx(items, None);
    let node = plan_component_tree(&tree, &ctx);

    assert_eq!(node.component, "Stack");
    assert_eq!(node.category, NodeCategory::Layout);
    assert_eq!(node.children.len(), 2);
    assert_eq!(node.children[0].component, "TextInput");
    assert_eq!(node.children[0].bind_path.as_deref(), Some("name"));
    assert_eq!(node.children[1].component, "NumberInput");
    assert_eq!(node.children[1].bind_path.as_deref(), Some("age"));
}

#[test]
fn plan_component_tree_with_when() {
    reset_node_id_counter();
    let tree = json!({
        "component": "TextInput",
        "bind": "extra",
        "when": "$showExtra = true"
    });
    let items = vec![json!({"key": "extra", "dataType": "string"})];
    let ctx = make_tree_ctx(items, None);
    let node = plan_component_tree(&tree, &ctx);

    assert_eq!(node.when.as_deref(), Some("$showExtra = true"));
}

#[test]
fn plan_component_tree_conditional_group_fallback() {
    reset_node_id_counter();
    let tree = json!({
        "component": "ConditionalGroup",
        "when": "$budget.usesSubcontractors",
        "fallback": "No subcontractors are needed.",
        "children": [{"component": "Text", "text": "List them"}]
    });
    let ctx = make_tree_ctx(vec![], None);
    let node = plan_component_tree(&tree, &ctx);

    assert_eq!(node.when.as_deref(), Some("$budget.usesSubcontractors"));
    assert_eq!(
        node.fallback_text.as_deref(),
        Some("No subcontractors are needed.")
    );
    assert_eq!(node.widget_fallback, None);
}

#[test]
fn plan_component_tree_field_binding_resolves_snapshot() {
    reset_node_id_counter();
    let tree = json!({"component": "Select", "bind": "color"});
    let items = vec![json!({
        "key": "color",
        "dataType": "choice",
        "label": "Favorite Color",
        "hint": "Pick one",
        "options": [
            {"value": "red", "label": "Red"},
            {"value": "blue", "label": "Blue"}
        ]
    })];
    let ctx = make_tree_ctx(items, None);
    let node = plan_component_tree(&tree, &ctx);

    assert!(node.field_item.is_some());
    let fi = node.field_item.as_ref().unwrap();
    assert_eq!(fi.key, "color");
    assert_eq!(fi.label.as_deref(), Some("Favorite Color"));
    assert_eq!(fi.hint.as_deref(), Some("Pick one"));
    assert_eq!(fi.data_type.as_deref(), Some("choice"));
    assert_eq!(fi.options.len(), 2);
    assert_eq!(fi.options[0].label.as_deref(), Some("Red"));
}

#[test]
fn plan_component_tree_custom_component_expansion() {
    reset_node_id_counter();
    let tree = json!({
        "component": "AddressBlock",
        "params": {"prefix": "home"}
    });
    let comp_doc = json!({
        "components": {
            "AddressBlock": {
                "template": {
                    "component": "Stack",
                    "children": [
                        {"component": "TextInput", "label": "{prefix} Street"},
                        {"component": "TextInput", "label": "{prefix} City"}
                    ]
                }
            }
        }
    });
    let ctx = make_tree_ctx(vec![], Some(comp_doc));
    let node = plan_component_tree(&tree, &ctx);

    assert_eq!(node.component, "Stack");
    assert_eq!(node.children.len(), 2);
    // Params should have been interpolated
    assert_eq!(
        node.children[0].props.get("label").and_then(|v| v.as_str()),
        Some("home Street")
    );
}

#[test]
fn plan_component_tree_custom_cycle_detection() {
    reset_node_id_counter();
    // CycleA references CycleA — should not infinite-loop
    let tree = json!({"component": "CycleA"});
    let comp_doc = json!({
        "components": {
            "CycleA": {
                "template": {"component": "CycleA"}
            }
        }
    });
    let ctx = make_tree_ctx(vec![], Some(comp_doc));
    let node = plan_component_tree(&tree, &ctx);

    // Should produce a node (not crash). The second expansion is prevented
    // because CycleA is already in the expanding set.
    assert!(!node.id.is_empty());
}

#[test]
fn plan_component_tree_max_depth() {
    reset_node_id_counter();
    // Build a chain that exceeds MAX_TOTAL_DEPTH (20)
    // A -> B -> C -> D (custom depth 3 = MAX_CUSTOM_DEPTH)
    // After that, D just renders as-is since custom expansion stops
    let comp_doc = json!({
        "components": {
            "A": { "template": {"component": "B"} },
            "B": { "template": {"component": "C"} },
            "C": { "template": {"component": "D"} },
            "D": { "template": {"component": "Stack"} }
        }
    });
    let tree = json!({"component": "A"});
    let ctx = make_tree_ctx(vec![], Some(comp_doc));
    let node = plan_component_tree(&tree, &ctx);

    // Should produce output without crashing. After 3 custom expansions,
    // the 4th custom component (D) is not expanded further.
    assert!(!node.id.is_empty());
}

#[test]
fn plan_component_tree_repeat_detected() {
    reset_node_id_counter();
    let tree = json!({
        "component": "Stack",
        "bind": "contacts"
    });
    let items = vec![json!({
        "key": "contacts",
        "type": "group",
        "repeatable": true,
        "items": []
    })];
    let ctx = make_tree_ctx(items, None);
    let node = plan_component_tree(&tree, &ctx);

    assert_eq!(node.repeat_group.as_deref(), Some("contacts"));
    assert_eq!(node.is_repeat_template, Some(true));
}

#[test]
fn plan_component_tree_datatable_repeatable_not_repeat_template() {
    reset_node_id_counter();
    let tree = json!({
        "component": "DataTable",
        "bind": "lineItems",
        "columns": [
            {"header": "Description", "bind": "desc"}
        ]
    });
    let items = vec![json!({
        "key": "lineItems",
        "type": "group",
        "repeatable": true,
        "items": [
            {"key": "desc", "dataType": "string", "label": "Description"}
        ]
    })];
    let ctx = make_tree_ctx(items, None);
    let node = plan_component_tree(&tree, &ctx);

    assert_eq!(node.component, "DataTable");
    assert_eq!(node.repeat_group.as_deref(), Some("lineItems"));
    assert_eq!(node.is_repeat_template, None);
    assert!(node.props.get("columns").is_some());
}

#[test]
fn plan_component_tree_accordion_repeatable_not_repeat_template_or_scope() {
    reset_node_id_counter();
    let tree = json!({
        "component": "Accordion",
        "bind": "members",
        "children": [{"component": "TextInput", "bind": "memberName"}]
    });
    let items = vec![json!({
        "key": "members",
        "type": "group",
        "repeatable": true,
        "items": [
            {"key": "memberName", "dataType": "string", "label": "Member Name"}
        ]
    })];
    let ctx = make_tree_ctx(items, None);
    let node = plan_component_tree(&tree, &ctx);

    assert_eq!(node.component, "Accordion");
    assert_eq!(node.repeat_group.as_deref(), Some("members"));
    assert_eq!(node.is_repeat_template, None);
    assert_eq!(node.scope_change, None);
    assert_eq!(node.children.len(), 1);
}

#[test]
fn plan_component_tree_cascade_resolves_widget_for_unspecified_component() {
    reset_node_id_counter();
    // A tree node with bind but NO explicit "component" key.
    // The cascade should resolve the widget from the item's dataType.
    let tree = json!({"bind": "color"});
    let items = vec![json!({
        "key": "color",
        "dataType": "choice",
        "label": "Color",
        "options": [{"value": "red", "label": "Red"}]
    })];
    let ctx = make_tree_ctx(items, None);
    let node = plan_component_tree(&tree, &ctx);

    // Without the fix, this would remain "Stack" (the default when component is absent).
    // With the fix, the cascade resolves the default for "choice" → "Select".
    assert_eq!(node.component, "Select");
    assert_eq!(node.category, NodeCategory::Field);
}

// ---------------------------------------------------------------------------
// build_field_item_snapshot
// ---------------------------------------------------------------------------

#[test]
fn field_item_snapshot_from_full_item() {
    let item = json!({
        "key": "email",
        "label": "Email Address",
        "hint": "user@example.com",
        "dataType": "string",
        "optionSet": "emailDomains",
        "options": [
            {"value": "work", "label": "Work"},
            {"value": "personal", "label": "Personal"}
        ]
    });
    let snap = build_field_item_snapshot(&item);

    assert_eq!(snap.key, "email");
    assert_eq!(snap.label.as_deref(), Some("Email Address"));
    assert_eq!(snap.hint.as_deref(), Some("user@example.com"));
    assert_eq!(snap.data_type.as_deref(), Some("string"));
    assert_eq!(snap.option_set.as_deref(), Some("emailDomains"));
    assert_eq!(snap.options.len(), 2);
}

#[test]
fn field_item_snapshot_minimal() {
    let item = json!({"key": "bare"});
    let snap = build_field_item_snapshot(&item);

    assert_eq!(snap.key, "bare");
    assert!(snap.label.is_none());
    assert!(snap.hint.is_none());
    assert!(snap.data_type.is_none());
    assert!(snap.option_set.is_none());
    assert!(snap.options.is_empty());
}

#[test]
fn field_item_snapshot_uses_path_fallback() {
    let item = json!({"path": "alt.key"});
    let snap = build_field_item_snapshot(&item);
    assert_eq!(snap.key, "alt.key");
}

// ---------------------------------------------------------------------------
// find_item_recursive
// ---------------------------------------------------------------------------

#[test]
fn find_item_recursive_top_level() {
    use crate::planner::find_item_recursive;

    let items = vec![
        json!({"key": "name", "dataType": "string"}),
        json!({"key": "age", "dataType": "integer"}),
    ];
    let found = find_item_recursive(&items, "age");
    assert!(found.is_some());
    assert_eq!(found.unwrap().get("key").unwrap().as_str(), Some("age"));
}

#[test]
fn find_item_recursive_nested_in_group() {
    use crate::planner::find_item_recursive;

    let items = vec![json!({
        "key": "address",
        "type": "group",
        "items": [
            {"key": "street", "dataType": "string"},
            {"key": "city", "dataType": "string"}
        ]
    })];
    let found = find_item_recursive(&items, "city");
    assert!(found.is_some());
    assert_eq!(found.unwrap().get("key").unwrap().as_str(), Some("city"));
}

#[test]
fn find_item_recursive_deeply_nested() {
    use crate::planner::find_item_recursive;

    let items = vec![json!({
        "key": "outer",
        "type": "group",
        "items": [{
            "key": "inner",
            "type": "group",
            "items": [{"key": "deep", "dataType": "string"}]
        }]
    })];
    let found = find_item_recursive(&items, "deep");
    assert!(found.is_some());
    assert_eq!(found.unwrap().get("key").unwrap().as_str(), Some("deep"));
}

#[test]
fn find_item_recursive_not_found() {
    use crate::planner::find_item_recursive;

    let items = vec![json!({"key": "name", "dataType": "string"})];
    assert!(find_item_recursive(&items, "missing").is_none());
}

// ---------------------------------------------------------------------------
// build_tier1_hints
// ---------------------------------------------------------------------------

#[test]
fn tier1_hints_with_widget_hint() {
    let item = json!({
        "key": "color",
        "presentation": {"widgetHint": "radio"}
    });
    let hints = build_tier1_hints(&item, None);

    assert!(hints.item_presentation.is_some());
    assert_eq!(
        hints.item_presentation.unwrap().widget_hint.as_deref(),
        Some("radio")
    );
}

#[test]
fn tier1_hints_with_form_presentation() {
    let item = json!({"key": "name"});
    let fp = json!({"labelPosition": "start", "pageMode": "wizard"});
    let hints = build_tier1_hints(&item, Some(&fp));

    assert!(hints.form_presentation.is_some());
    let fp = hints.form_presentation.unwrap();
    assert_eq!(fp.label_position, Some(formspec_theme::LabelPosition::Start));
    assert_eq!(fp.page_mode, Some(formspec_theme::PageMode::Wizard));
}

#[test]
fn tier1_hints_empty() {
    let item = json!({"key": "name"});
    let hints = build_tier1_hints(&item, None);
    assert!(hints.item_presentation.is_none());
    assert!(hints.form_presentation.is_none());
}

// ---------------------------------------------------------------------------
// PlanContextJson conversion
// ---------------------------------------------------------------------------

#[test]
fn plan_context_json_items_by_path_lookup() {
    use crate::types::PlanContextJson;
    use serde_json::Map;

    let mut items_by_path = Map::new();
    items_by_path.insert("name".to_string(), json!({"key": "name", "dataType": "string"}));
    items_by_path.insert("age".to_string(), json!({"key": "age", "dataType": "integer"}));

    let ctx_json = PlanContextJson {
        items_by_path,
        form_presentation: None,
        component_document: None,
        theme: None,
        viewport_width: None,
        available_components: vec![],
    };

    let ctx: crate::types::PlanContext = ctx_json.into();
    let found = (ctx.find_item)("name");
    assert!(found.is_some());
    assert_eq!(found.unwrap().get("key").unwrap().as_str(), Some("name"));

    let not_found = (ctx.find_item)("missing");
    assert!(not_found.is_none());
}

// ---------------------------------------------------------------------------
// Responsive: edge cases
// ---------------------------------------------------------------------------

#[test]
fn responsive_zero_min_width_always_applies() {
    let comp = json!({
        "component": "Stack",
        "columns": 1,
        "responsive": {
            "base": { "minWidth": 0, "columns": 2 }
        }
    });
    let result = resolve_responsive_props(&comp, 0, None);
    assert_eq!(result.get("columns").unwrap().as_u64().unwrap(), 2);
}

#[test]
fn responsive_non_object_input_returns_clone() {
    let comp = json!("not an object");
    let result = resolve_responsive_props(&comp, 800, None);
    assert_eq!(result, json!("not an object"));
}

#[test]
fn responsive_multiple_props_merged() {
    let comp = json!({
        "component": "Grid",
        "columns": 1,
        "gap": 4,
        "responsive": {
            "md": { "minWidth": 768, "columns": 2, "gap": 8 }
        }
    });
    let result = resolve_responsive_props(&comp, 800, None);
    assert_eq!(result.get("columns").unwrap().as_u64().unwrap(), 2);
    assert_eq!(result.get("gap").unwrap().as_u64().unwrap(), 8);
}

// ---------------------------------------------------------------------------
// Helper: make a ThemeDocument with pages
// ---------------------------------------------------------------------------

use formspec_theme::{Page, Region, TargetDefinition, ThemeDocument};

fn make_theme_with_pages(pages: Vec<Page>) -> ThemeDocument {
    ThemeDocument {
        formspec_theme: "1.0".to_string(),
        version: "1.0.0".to_string(),
        target_definition: TargetDefinition {
            url: "test".to_string(),
            compatible_versions: None,
        },
        url: None,
        name: None,
        title: None,
        description: None,
        platform: None,
        tokens: None,
        defaults: None,
        selectors: None,
        items: None,
        pages: Some(pages),
        breakpoints: None,
        stylesheets: None,
        extensions: None,
        class_strategy: None,
    }
}

fn make_ctx_with_theme(items: Vec<Value>, theme: ThemeDocument) -> PlanContext {
    let items_clone = items.clone();
    PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: None,
        theme: Some(theme),
        viewport_width: None,
        find_item: Box::new(move |key: &str| {
            crate::planner::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    }
}

// ---------------------------------------------------------------------------
// plan_theme_pages — SS6.1-6.3
// ---------------------------------------------------------------------------

#[test]
fn theme_pages_single_page_two_regions() {
    reset_node_id_counter();
    let items = vec![
        json!({"key": "firstName", "dataType": "string", "label": "First Name"}),
        json!({"key": "lastName", "dataType": "string", "label": "Last Name"}),
    ];
    let theme = make_theme_with_pages(vec![Page {
        id: "info".to_string(),
        title: "Info".to_string(),
        description: None,
        regions: Some(vec![
            Region { key: "firstName".to_string(), span: Some(6), start: None, responsive: None },
            Region { key: "lastName".to_string(), span: Some(6), start: None, responsive: None },
        ]),
    }]);
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    // Should produce one Page node
    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].component, "Page");
    assert_eq!(nodes[0].props.get("title").and_then(|v| v.as_str()), Some("Info"));
    assert_eq!(nodes[0].props.get("pageId").and_then(|v| v.as_str()), Some("info"));

    // Page should contain a Grid with two children (regions)
    assert_eq!(nodes[0].children.len(), 1);
    let grid = &nodes[0].children[0];
    assert_eq!(grid.component, "Grid");
    assert_eq!(grid.props.get("columns").and_then(|v| v.as_u64()), Some(12));

    // Each region wraps its item
    assert_eq!(grid.children.len(), 2);
    assert_eq!(grid.children[0].component, "Column");
    assert_eq!(grid.children[0].props.get("span").and_then(|v| v.as_u64()), Some(6));
    assert_eq!(grid.children[0].children.len(), 1);
    assert_eq!(grid.children[0].children[0].bind_path.as_deref(), Some("firstName"));

    assert_eq!(grid.children[1].component, "Column");
    assert_eq!(grid.children[1].props.get("span").and_then(|v| v.as_u64()), Some(6));
    assert_eq!(grid.children[1].children.len(), 1);
    assert_eq!(grid.children[1].children[0].bind_path.as_deref(), Some("lastName"));
}

#[test]
fn theme_pages_region_default_span_is_12() {
    reset_node_id_counter();
    let items = vec![json!({"key": "email", "dataType": "string"})];
    let theme = make_theme_with_pages(vec![Page {
        id: "p1".to_string(),
        title: "Page 1".to_string(),
        description: None,
        regions: Some(vec![
            Region { key: "email".to_string(), span: None, start: None, responsive: None },
        ]),
    }]);
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    let grid = &nodes[0].children[0];
    assert_eq!(grid.children[0].props.get("span").and_then(|v| v.as_u64()), Some(12));
}

#[test]
fn theme_pages_region_with_start_position() {
    reset_node_id_counter();
    let items = vec![json!({"key": "sidebar", "dataType": "string"})];
    let theme = make_theme_with_pages(vec![Page {
        id: "p1".to_string(),
        title: "Page 1".to_string(),
        description: None,
        regions: Some(vec![
            Region { key: "sidebar".to_string(), span: Some(3), start: Some(10), responsive: None },
        ]),
    }]);
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    let col = &nodes[0].children[0].children[0];
    assert_eq!(col.props.get("span").and_then(|v| v.as_u64()), Some(3));
    assert_eq!(col.props.get("start").and_then(|v| v.as_u64()), Some(10));
}

#[test]
fn theme_pages_group_key_includes_subtree() {
    reset_node_id_counter();
    let items = vec![json!({
        "key": "address",
        "type": "group",
        "label": "Address",
        "items": [
            {"key": "street", "dataType": "string"},
            {"key": "city", "dataType": "string"}
        ]
    })];
    let theme = make_theme_with_pages(vec![Page {
        id: "p1".to_string(),
        title: "Page 1".to_string(),
        description: None,
        regions: Some(vec![
            Region { key: "address".to_string(), span: Some(12), start: None, responsive: None },
        ]),
    }]);
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    // The group region should contain the full group node with its children
    let col = &nodes[0].children[0].children[0];
    assert_eq!(col.children.len(), 1);
    let group_node = &col.children[0];
    assert_eq!(group_node.component, "Stack");
    assert_eq!(group_node.bind_path.as_deref(), Some("address"));
    assert_eq!(group_node.children.len(), 2);
}

#[test]
fn theme_pages_unknown_region_key_skipped_gracefully() {
    reset_node_id_counter();
    let items = vec![json!({"key": "name", "dataType": "string"})];
    let theme = make_theme_with_pages(vec![Page {
        id: "p1".to_string(),
        title: "Page 1".to_string(),
        description: None,
        regions: Some(vec![
            Region { key: "nonexistent".to_string(), span: Some(6), start: None, responsive: None },
            Region { key: "name".to_string(), span: Some(6), start: None, responsive: None },
        ]),
    }]);
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    // Unknown region should be skipped, only the valid region produces output
    let grid = &nodes[0].children[0];
    assert_eq!(grid.children.len(), 1);
    assert_eq!(grid.children[0].children[0].bind_path.as_deref(), Some("name"));
}

#[test]
fn theme_pages_multiple_pages() {
    reset_node_id_counter();
    let items = vec![
        json!({"key": "name", "dataType": "string"}),
        json!({"key": "email", "dataType": "string"}),
        json!({"key": "age", "dataType": "integer"}),
    ];
    let theme = make_theme_with_pages(vec![
        Page {
            id: "basic".to_string(),
            title: "Basic Info".to_string(),
            description: Some("Enter your name and email.".to_string()),
            regions: Some(vec![
                Region { key: "name".to_string(), span: Some(6), start: None, responsive: None },
                Region { key: "email".to_string(), span: Some(6), start: None, responsive: None },
            ]),
        },
        Page {
            id: "details".to_string(),
            title: "Details".to_string(),
            description: None,
            regions: Some(vec![
                Region { key: "age".to_string(), span: Some(12), start: None, responsive: None },
            ]),
        },
    ]);
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    assert_eq!(nodes.len(), 2);
    assert_eq!(nodes[0].props.get("title").and_then(|v| v.as_str()), Some("Basic Info"));
    assert_eq!(nodes[0].props.get("description").and_then(|v| v.as_str()), Some("Enter your name and email."));
    assert_eq!(nodes[0].children[0].children.len(), 2);

    assert_eq!(nodes[1].props.get("title").and_then(|v| v.as_str()), Some("Details"));
    assert_eq!(nodes[1].children[0].children.len(), 1);
}

// ---------------------------------------------------------------------------
// Unassigned items after all pages — SS6.3
// ---------------------------------------------------------------------------

#[test]
fn theme_pages_unassigned_items_appended_after_pages() {
    reset_node_id_counter();
    let items = vec![
        json!({"key": "name", "dataType": "string"}),
        json!({"key": "email", "dataType": "string"}),
        json!({"key": "notes", "dataType": "text"}),
    ];
    let theme = make_theme_with_pages(vec![Page {
        id: "p1".to_string(),
        title: "Page 1".to_string(),
        description: None,
        regions: Some(vec![
            Region { key: "name".to_string(), span: Some(12), start: None, responsive: None },
        ]),
    }]);
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    // Page + unassigned items container
    assert_eq!(nodes.len(), 2);
    assert_eq!(nodes[0].component, "Page");

    // The second node is a Stack containing the unassigned items in definition order
    assert_eq!(nodes[1].component, "Stack");
    assert_eq!(nodes[1].children.len(), 2);
    assert_eq!(nodes[1].children[0].bind_path.as_deref(), Some("email"));
    assert_eq!(nodes[1].children[1].bind_path.as_deref(), Some("notes"));
}

#[test]
fn theme_pages_all_items_assigned_no_extra_node() {
    reset_node_id_counter();
    let items = vec![
        json!({"key": "name", "dataType": "string"}),
        json!({"key": "email", "dataType": "string"}),
    ];
    let theme = make_theme_with_pages(vec![Page {
        id: "p1".to_string(),
        title: "Page 1".to_string(),
        description: None,
        regions: Some(vec![
            Region { key: "name".to_string(), span: Some(6), start: None, responsive: None },
            Region { key: "email".to_string(), span: Some(6), start: None, responsive: None },
        ]),
    }]);
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    // Only the page, no unassigned items node
    assert_eq!(nodes.len(), 1);
}

#[test]
fn theme_pages_nested_items_in_group_counted_as_assigned() {
    reset_node_id_counter();
    let items = vec![
        json!({
            "key": "address",
            "type": "group",
            "items": [
                {"key": "street", "dataType": "string"},
                {"key": "city", "dataType": "string"}
            ]
        }),
        json!({"key": "notes", "dataType": "text"}),
    ];
    // Only reference the group key — the nested items should count as assigned
    let theme = make_theme_with_pages(vec![Page {
        id: "p1".to_string(),
        title: "Page 1".to_string(),
        description: None,
        regions: Some(vec![
            Region { key: "address".to_string(), span: Some(12), start: None, responsive: None },
        ]),
    }]);
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    // Page + unassigned "notes"
    assert_eq!(nodes.len(), 2);
    assert_eq!(nodes[1].children.len(), 1);
    assert_eq!(nodes[1].children[0].bind_path.as_deref(), Some("notes"));
}

// ---------------------------------------------------------------------------
// Responsive region overrides — SS6.4
// ---------------------------------------------------------------------------

#[test]
fn theme_pages_responsive_region_span_override() {
    reset_node_id_counter();
    let items = vec![json!({"key": "sidebar", "dataType": "string"})];

    let mut responsive = Map::new();
    responsive.insert("md".to_string(), json!({"span": 4}));
    responsive.insert("lg".to_string(), json!({"span": 3}));

    let mut breakpoints = Map::new();
    breakpoints.insert("md".to_string(), json!(768));
    breakpoints.insert("lg".to_string(), json!(1024));

    let mut theme = make_theme_with_pages(vec![Page {
        id: "p1".to_string(),
        title: "Page 1".to_string(),
        description: None,
        regions: Some(vec![Region {
            key: "sidebar".to_string(),
            span: Some(12),
            start: None,
            responsive: Some(responsive),
        }]),
    }]);
    theme.breakpoints = Some(breakpoints);

    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: None,
        theme: Some(theme),
        viewport_width: Some(900),
        find_item: Box::new(move |key: &str| {
            crate::planner::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    };
    let nodes = plan_theme_pages(&items, &ctx);

    // At viewport 900: md (768) applies, lg (1024) doesn't
    let col = &nodes[0].children[0].children[0];
    assert_eq!(col.props.get("span").and_then(|v| v.as_u64()), Some(4));
}

#[test]
fn theme_pages_responsive_region_hidden() {
    reset_node_id_counter();
    let items = vec![
        json!({"key": "sidebar", "dataType": "string"}),
        json!({"key": "main", "dataType": "string"}),
    ];

    let mut responsive = Map::new();
    responsive.insert("sm".to_string(), json!({"hidden": true}));

    let mut breakpoints = Map::new();
    breakpoints.insert("sm".to_string(), json!(576));

    let mut theme = make_theme_with_pages(vec![Page {
        id: "p1".to_string(),
        title: "Page 1".to_string(),
        description: None,
        regions: Some(vec![
            Region {
                key: "sidebar".to_string(),
                span: Some(3),
                start: None,
                responsive: Some(responsive),
            },
            Region { key: "main".to_string(), span: Some(9), start: None, responsive: None },
        ]),
    }]);
    theme.breakpoints = Some(breakpoints);

    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: None,
        theme: Some(theme),
        viewport_width: Some(700),
        find_item: Box::new(move |key: &str| {
            crate::planner::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    };
    let nodes = plan_theme_pages(&items, &ctx);

    // At viewport 700: sm (576) applies, sidebar should be hidden
    let grid = &nodes[0].children[0];
    assert_eq!(grid.children.len(), 1);
    assert_eq!(grid.children[0].children[0].bind_path.as_deref(), Some("main"));
}

// ---------------------------------------------------------------------------
// plan_unbound_required — Component SS4.5
// ---------------------------------------------------------------------------

#[test]
fn unbound_required_items_appended_after_tree() {
    reset_node_id_counter();
    let items = vec![
        json!({"key": "name", "dataType": "string", "bind": {"required": "true()"}}),
        json!({"key": "email", "dataType": "string", "bind": {"required": "true()"}}),
        json!({"key": "age", "dataType": "integer"}),
    ];
    // Component tree only binds "name"
    let tree = json!({
        "component": "Stack",
        "children": [{"component": "TextInput", "bind": "name"}]
    });
    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: None,
        theme: None,
        viewport_width: None,
        find_item: Box::new(move |key: &str| {
            crate::planner::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    };
    let tree_node = plan_component_tree(&tree, &ctx);
    let unbound = plan_unbound_required(&tree_node, &items, &ctx);

    // "email" is required and unbound — should be in fallback
    // "age" is not required — should NOT be in fallback
    assert_eq!(unbound.len(), 1);
    assert_eq!(unbound[0].bind_path.as_deref(), Some("email"));
}

#[test]
fn unbound_required_all_bound_returns_empty() {
    reset_node_id_counter();
    let items = vec![
        json!({"key": "name", "dataType": "string", "bind": {"required": "true()"}}),
    ];
    let tree = json!({
        "component": "Stack",
        "children": [{"component": "TextInput", "bind": "name"}]
    });
    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: None,
        theme: None,
        viewport_width: None,
        find_item: Box::new(move |key: &str| {
            crate::planner::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    };
    let tree_node = plan_component_tree(&tree, &ctx);
    let unbound = plan_unbound_required(&tree_node, &items, &ctx);

    assert!(unbound.is_empty());
}

#[test]
fn unbound_required_in_definition_order() {
    reset_node_id_counter();
    let items = vec![
        json!({"key": "c", "dataType": "string", "bind": {"required": "true()"}}),
        json!({"key": "a", "dataType": "string", "bind": {"required": "true()"}}),
        json!({"key": "b", "dataType": "string", "bind": {"required": "true()"}}),
    ];
    let tree = json!({"component": "Stack", "children": []});
    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: None,
        theme: None,
        viewport_width: None,
        find_item: Box::new(move |key: &str| {
            crate::planner::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    };
    let tree_node = plan_component_tree(&tree, &ctx);
    let unbound = plan_unbound_required(&tree_node, &items, &ctx);

    // Should be in definition order: c, a, b
    assert_eq!(unbound.len(), 3);
    assert_eq!(unbound[0].bind_path.as_deref(), Some("c"));
    assert_eq!(unbound[1].bind_path.as_deref(), Some("a"));
    assert_eq!(unbound[2].bind_path.as_deref(), Some("b"));
}

#[test]
fn theme_pages_page_with_no_regions_produces_empty_page() {
    reset_node_id_counter();
    let items = vec![json!({"key": "name", "dataType": "string"})];
    let theme = make_theme_with_pages(vec![Page {
        id: "empty".to_string(),
        title: "Empty Page".to_string(),
        description: None,
        regions: None,
    }]);
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    // Page node still appears, grid has no children
    // Plus unassigned items
    assert_eq!(nodes.len(), 2);
    assert_eq!(nodes[0].component, "Page");
    assert_eq!(nodes[0].children[0].children.len(), 0);

    // "name" is unassigned
    assert_eq!(nodes[1].children.len(), 1);
    assert_eq!(nodes[1].children[0].bind_path.as_deref(), Some("name"));
}

#[test]
fn theme_pages_no_pages_falls_back_to_definition() {
    reset_node_id_counter();
    let items = vec![
        json!({"key": "name", "dataType": "string"}),
    ];
    // Theme with no pages array
    let mut theme = make_theme_with_pages(vec![]);
    theme.pages = None;
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    // Falls back to plan_definition_fallback
    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].component, "TextInput");
    assert_eq!(nodes[0].bind_path.as_deref(), Some("name"));
}

#[test]
fn theme_pages_empty_pages_array_falls_back() {
    reset_node_id_counter();
    let items = vec![json!({"key": "x", "dataType": "string"})];
    let theme = make_theme_with_pages(vec![]);
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].component, "TextInput");
}

#[test]
fn theme_pages_responsive_cumulative_ascending() {
    // When multiple breakpoints match, later (higher) ones override earlier ones
    reset_node_id_counter();
    let items = vec![json!({"key": "field", "dataType": "string"})];

    let mut responsive = Map::new();
    responsive.insert("sm".to_string(), json!({"span": 6}));
    responsive.insert("md".to_string(), json!({"span": 4}));
    responsive.insert("lg".to_string(), json!({"span": 3}));

    let mut breakpoints = Map::new();
    breakpoints.insert("sm".to_string(), json!(576));
    breakpoints.insert("md".to_string(), json!(768));
    breakpoints.insert("lg".to_string(), json!(1024));

    let mut theme = make_theme_with_pages(vec![Page {
        id: "p1".to_string(),
        title: "Page 1".to_string(),
        description: None,
        regions: Some(vec![Region {
            key: "field".to_string(),
            span: Some(12),
            start: None,
            responsive: Some(responsive),
        }]),
    }]);
    theme.breakpoints = Some(breakpoints);

    // At viewport 1200: all three apply, lg (span=3) is the final winner
    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: None,
        theme: Some(theme),
        viewport_width: Some(1200),
        find_item: Box::new(move |key: &str| {
            crate::planner::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    };
    let nodes = plan_theme_pages(&items, &ctx);

    let col = &nodes[0].children[0].children[0];
    assert_eq!(col.props.get("span").and_then(|v| v.as_u64()), Some(3));
}

#[test]
fn theme_pages_responsive_hidden_then_shown_at_higher_breakpoint() {
    reset_node_id_counter();
    let items = vec![json!({"key": "sidebar", "dataType": "string"})];

    let mut responsive = Map::new();
    responsive.insert("sm".to_string(), json!({"hidden": true}));
    responsive.insert("lg".to_string(), json!({"hidden": false, "span": 3}));

    let mut breakpoints = Map::new();
    breakpoints.insert("sm".to_string(), json!(576));
    breakpoints.insert("lg".to_string(), json!(1024));

    let mut theme = make_theme_with_pages(vec![Page {
        id: "p1".to_string(),
        title: "Page 1".to_string(),
        description: None,
        regions: Some(vec![Region {
            key: "sidebar".to_string(),
            span: Some(4),
            start: None,
            responsive: Some(responsive),
        }]),
    }]);
    theme.breakpoints = Some(breakpoints);

    // At viewport 1200: sm hides, then lg un-hides with span=3
    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: None,
        theme: Some(theme),
        viewport_width: Some(1200),
        find_item: Box::new(move |key: &str| {
            crate::planner::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    };
    let nodes = plan_theme_pages(&items, &ctx);

    let grid = &nodes[0].children[0];
    assert_eq!(grid.children.len(), 1); // sidebar is visible
    assert_eq!(grid.children[0].props.get("span").and_then(|v| v.as_u64()), Some(3));
}

#[test]
fn theme_pages_no_viewport_uses_base_values() {
    reset_node_id_counter();
    let items = vec![json!({"key": "field", "dataType": "string"})];

    let mut responsive = Map::new();
    responsive.insert("sm".to_string(), json!({"span": 6}));

    let mut breakpoints = Map::new();
    breakpoints.insert("sm".to_string(), json!(576));

    let mut theme = make_theme_with_pages(vec![Page {
        id: "p1".to_string(),
        title: "Page 1".to_string(),
        description: None,
        regions: Some(vec![Region {
            key: "field".to_string(),
            span: Some(8),
            start: Some(3),
            responsive: Some(responsive),
        }]),
    }]);
    theme.breakpoints = Some(breakpoints);

    // No viewport width → base values should be used
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    let col = &nodes[0].children[0].children[0];
    assert_eq!(col.props.get("span").and_then(|v| v.as_u64()), Some(8));
    assert_eq!(col.props.get("start").and_then(|v| v.as_u64()), Some(3));
}

#[test]
fn theme_pages_nested_item_referenced_directly() {
    // A region can reference a nested item key — it renders standalone at grid position
    reset_node_id_counter();
    let items = vec![json!({
        "key": "address",
        "type": "group",
        "items": [
            {"key": "street", "dataType": "string", "label": "Street"},
            {"key": "city", "dataType": "string", "label": "City"}
        ]
    })];

    let theme = make_theme_with_pages(vec![Page {
        id: "p1".to_string(),
        title: "Page 1".to_string(),
        description: None,
        regions: Some(vec![
            Region { key: "street".to_string(), span: Some(8), start: None, responsive: None },
            Region { key: "city".to_string(), span: Some(4), start: None, responsive: None },
        ]),
    }]);
    let ctx = make_ctx_with_theme(items.clone(), theme);
    let nodes = plan_theme_pages(&items, &ctx);

    let grid = &nodes[0].children[0];
    assert_eq!(grid.children.len(), 2);
    // street and city are rendered standalone, not inside a group
    assert_eq!(grid.children[0].children[0].bind_path.as_deref(), Some("street"));
    assert_eq!(grid.children[1].children[0].bind_path.as_deref(), Some("city"));

    // The "address" group itself is unassigned (only its children were referenced)
    assert_eq!(nodes.len(), 2);
    assert_eq!(nodes[1].children[0].bind_path.as_deref(), Some("address"));
}

#[test]
fn unbound_required_nested_items_detected() {
    reset_node_id_counter();
    let items = vec![json!({
        "key": "contact",
        "type": "group",
        "items": [
            {"key": "phone", "dataType": "string", "bind": {"required": "true()"}},
            {"key": "fax", "dataType": "string"}
        ]
    })];
    let tree = json!({"component": "Stack", "children": []});
    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: None,
        theme: None,
        viewport_width: None,
        find_item: Box::new(move |key: &str| {
            crate::planner::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    };
    let tree_node = plan_component_tree(&tree, &ctx);
    let unbound = plan_unbound_required(&tree_node, &items, &ctx);

    // phone is required+unbound, fax is not required
    assert_eq!(unbound.len(), 1);
    assert_eq!(unbound[0].bind_path.as_deref(), Some("phone"));
}

#[test]
fn unbound_required_deeply_nested_in_tree_still_detected_as_bound() {
    reset_node_id_counter();
    let items = vec![
        json!({"key": "name", "dataType": "string", "bind": {"required": "true()"}}),
    ];
    // name is bound deep in the tree
    let tree = json!({
        "component": "Stack",
        "children": [{
            "component": "Card",
            "children": [{
                "component": "TextInput",
                "bind": "name"
            }]
        }]
    });
    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: None,
        theme: None,
        viewport_width: None,
        find_item: Box::new(move |key: &str| {
            crate::planner::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    };
    let tree_node = plan_component_tree(&tree, &ctx);
    let unbound = plan_unbound_required(&tree_node, &items, &ctx);

    assert!(unbound.is_empty());
}

// ---------------------------------------------------------------------------
// Cross-planner conformance fixtures
// ---------------------------------------------------------------------------

/// Validate a planned node against an expected fixture node.
/// Checks component, category, bindPath, childCount, props, fieldItem, and recurses on children.
fn assert_node_matches(actual: &LayoutNode, expected: &Value, path: &str) {
    if let Some(comp) = expected.get("component").and_then(|v| v.as_str()) {
        assert_eq!(
            actual.component, comp,
            "{}: component mismatch: got '{}', expected '{}'",
            path, actual.component, comp
        );
    }
    if let Some(cat) = expected.get("category").and_then(|v| v.as_str()) {
        let actual_cat = serde_json::to_value(&actual.category).unwrap();
        assert_eq!(
            actual_cat.as_str().unwrap(),
            cat,
            "{}: category mismatch",
            path
        );
    }
    if let Some(bp) = expected.get("bindPath").and_then(|v| v.as_str()) {
        assert_eq!(
            actual.bind_path.as_deref(),
            Some(bp),
            "{}: bindPath mismatch",
            path
        );
    }
    if let Some(cc) = expected.get("childCount").and_then(|v| v.as_u64()) {
        assert_eq!(
            actual.children.len() as u64,
            cc,
            "{}: childCount mismatch (got {}, expected {})",
            path,
            actual.children.len(),
            cc
        );
    }
    if let Some(props) = expected.get("props").and_then(|v| v.as_object()) {
        for (k, v) in props {
            let actual_val = actual.props.get(k);
            assert_eq!(
                actual_val,
                Some(v),
                "{}: props.{} mismatch (got {:?}, expected {:?})",
                path,
                k,
                actual_val,
                v
            );
        }
    }
    if let Some(fi_expected) = expected.get("fieldItem").and_then(|v| v.as_object()) {
        let fi = actual
            .field_item
            .as_ref()
            .unwrap_or_else(|| panic!("{}: expected fieldItem", path));
        if let Some(key) = fi_expected.get("key").and_then(|v| v.as_str()) {
            assert_eq!(fi.key, key, "{}: fieldItem.key mismatch", path);
        }
        if let Some(label) = fi_expected.get("label").and_then(|v| v.as_str()) {
            assert_eq!(
                fi.label.as_deref(),
                Some(label),
                "{}: fieldItem.label mismatch",
                path
            );
        }
        if let Some(dt) = fi_expected.get("dataType").and_then(|v| v.as_str()) {
            assert_eq!(
                fi.data_type.as_deref(),
                Some(dt),
                "{}: fieldItem.dataType mismatch",
                path
            );
        }
    }
    if let Some(children) = expected.get("children").and_then(|v| v.as_array()) {
        for (i, child_expected) in children.iter().enumerate() {
            assert!(
                i < actual.children.len(),
                "{}: expected child {} but only {} children",
                path,
                i,
                actual.children.len()
            );
            assert_node_matches(
                &actual.children[i],
                child_expected,
                &format!("{}.children[{}]", path, i),
            );
        }
    }
}

fn load_fixture(name: &str) -> Value {
    let path = format!(
        "{}/tests/conformance/layout/{}",
        env!("CARGO_MANIFEST_DIR").replace("/crates/formspec-plan", ""),
        name
    );
    let content = std::fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("Failed to read fixture {}: {}", path, e));
    serde_json::from_str(&content).unwrap_or_else(|e| panic!("Failed to parse {}: {}", path, e))
}

fn ctx_from_fixture(fixture: &Value) -> (Vec<Value>, PlanContext) {
    let input = &fixture["input"];
    let items: Vec<Value> = input["items"].as_array().cloned().unwrap_or_default();

    let form_presentation = if input["formPresentation"].is_null() {
        None
    } else {
        Some(input["formPresentation"].clone())
    };

    let component_document = if input["componentDocument"].is_null() {
        None
    } else {
        Some(input["componentDocument"].clone())
    };

    let theme: Option<formspec_theme::ThemeDocument> = if input["theme"].is_null() {
        None
    } else {
        serde_json::from_value(input["theme"].clone()).ok()
    };

    let viewport_width = input["viewportWidth"].as_u64().map(|v| v as u32);

    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation,
        component_document,
        theme,
        viewport_width,
        find_item: Box::new(move |key: &str| {
            crate::planner::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    };

    (items, ctx)
}

#[test]
fn conformance_definition_fallback_basic() {
    reset_node_id_counter();
    let fixture = load_fixture("definition-fallback-basic.json");
    let (items, ctx) = ctx_from_fixture(&fixture);
    let nodes = plan_definition_fallback(&items, &ctx);

    let expected = &fixture["expected"];
    assert_eq!(nodes.len(), expected["nodeCount"].as_u64().unwrap() as usize);

    for (i, exp) in expected["nodes"].as_array().unwrap().iter().enumerate() {
        assert_node_matches(&nodes[i], exp, &format!("nodes[{}]", i));
    }
}

#[test]
fn conformance_definition_fallback_wizard() {
    reset_node_id_counter();
    let fixture = load_fixture("definition-fallback-wizard.json");
    let (items, ctx) = ctx_from_fixture(&fixture);
    let nodes = plan_definition_fallback(&items, &ctx);

    let expected = &fixture["expected"];
    assert_eq!(nodes.len(), expected["nodeCount"].as_u64().unwrap() as usize);

    for (i, exp) in expected["nodes"].as_array().unwrap().iter().enumerate() {
        assert_node_matches(&nodes[i], exp, &format!("nodes[{}]", i));
    }
}

#[test]
fn conformance_theme_pages_two_column() {
    reset_node_id_counter();
    let fixture = load_fixture("theme-pages-two-column.json");
    let (items, ctx) = ctx_from_fixture(&fixture);
    let nodes = plan_theme_pages(&items, &ctx);

    let expected = &fixture["expected"];
    assert_eq!(nodes.len(), expected["nodeCount"].as_u64().unwrap() as usize);

    for (i, exp) in expected["nodes"].as_array().unwrap().iter().enumerate() {
        assert_node_matches(&nodes[i], exp, &format!("nodes[{}]", i));
    }
}

#[test]
fn conformance_theme_pages_unassigned() {
    reset_node_id_counter();
    let fixture = load_fixture("theme-pages-unassigned.json");
    let (items, ctx) = ctx_from_fixture(&fixture);
    let nodes = plan_theme_pages(&items, &ctx);

    let expected = &fixture["expected"];
    assert_eq!(nodes.len(), expected["nodeCount"].as_u64().unwrap() as usize);

    for (i, exp) in expected["nodes"].as_array().unwrap().iter().enumerate() {
        assert_node_matches(&nodes[i], exp, &format!("nodes[{}]", i));
    }
}

#[test]
fn conformance_theme_pages_responsive_hidden() {
    reset_node_id_counter();
    let fixture = load_fixture("theme-pages-responsive-hidden.json");
    let (items, ctx) = ctx_from_fixture(&fixture);
    let nodes = plan_theme_pages(&items, &ctx);

    let expected = &fixture["expected"];
    assert_eq!(nodes.len(), expected["nodeCount"].as_u64().unwrap() as usize);

    for (i, exp) in expected["nodes"].as_array().unwrap().iter().enumerate() {
        assert_node_matches(&nodes[i], exp, &format!("nodes[{}]", i));
    }
}

#[test]
fn conformance_component_tree_basic() {
    reset_node_id_counter();
    let fixture = load_fixture("component-tree-basic.json");
    let input = &fixture["input"];
    let items: Vec<Value> = input["items"].as_array().cloned().unwrap_or_default();
    let tree = &input["componentDocument"]["tree"];
    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: None,
        theme: None,
        viewport_width: None,
        find_item: Box::new(move |key: &str| {
            crate::planner::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    };
    let node = plan_component_tree(tree, &ctx);

    let expected = &fixture["expected"]["root"];
    assert_node_matches(&node, expected, "root");
}

#[test]
fn conformance_unbound_required() {
    reset_node_id_counter();
    let fixture = load_fixture("unbound-required-items.json");
    let input = &fixture["input"];
    let items: Vec<Value> = input["items"].as_array().cloned().unwrap_or_default();
    let tree_val = &input["componentDocument"]["tree"];
    let items_clone = items.clone();
    let ctx = PlanContext {
        items: items.clone(),
        form_presentation: None,
        component_document: None,
        theme: None,
        viewport_width: None,
        find_item: Box::new(move |key: &str| {
            crate::planner::find_item_recursive(&items_clone, key)
        }),
        is_component_available: None,
    };
    let tree_node = plan_component_tree(tree_val, &ctx);
    let unbound = plan_unbound_required(&tree_node, &items, &ctx);

    let expected = fixture["expected"]["unboundRequired"].as_array().unwrap();
    assert_eq!(unbound.len(), expected.len());
    for (i, exp) in expected.iter().enumerate() {
        assert_node_matches(&unbound[i], exp, &format!("unboundRequired[{}]", i));
    }
}
