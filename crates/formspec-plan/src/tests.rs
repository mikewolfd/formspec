//! Unit tests for the layout planner.

use serde_json::{json, Map, Value};

use crate::defaults::get_default_component;
use crate::params::interpolate_params;
use crate::planner::{
    build_field_item_snapshot, build_tier1_hints, classify_component,
    plan_component_tree, plan_definition_fallback, reset_node_id_counter,
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
