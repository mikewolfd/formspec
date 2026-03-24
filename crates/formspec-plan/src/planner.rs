//! Layout planner — builds LayoutNode trees from definition items, themes, and component documents.

use std::collections::HashSet;
use std::sync::atomic::{AtomicU64, Ordering};

use serde_json::{json, Map, Value};

use formspec_theme::{
    resolve_presentation, resolve_widget, widget_token_to_component, FormPresentation,
    FormspecDataType, ItemDescriptor, ItemPresentation, ItemType, Tier1Hints,
};

use crate::defaults::get_default_component;
use crate::params::interpolate_params;
use crate::responsive::resolve_responsive_props;
use crate::types::*;

// ---------------------------------------------------------------------------
// Node ID generation
// ---------------------------------------------------------------------------

static NODE_ID_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Reset the global node ID counter (useful for deterministic tests).
pub fn reset_node_id_counter() {
    NODE_ID_COUNTER.store(0, Ordering::SeqCst);
}

fn next_id(prefix: &str) -> String {
    let n = NODE_ID_COUNTER.fetch_add(1, Ordering::SeqCst);
    format!("{}-{}", prefix, n)
}

/// Test-only accessor for next_id.
#[cfg(test)]
pub(crate) fn next_id_for_test(prefix: &str) -> String {
    next_id(prefix)
}

// ---------------------------------------------------------------------------
// Component classification
// ---------------------------------------------------------------------------

/// Structural keys excluded from component props extraction.
const STRUCTURAL_KEYS: &[&str] = &[
    "component",
    "children",
    "when",
    "responsive",
    "bind",
    "style",
    "cssClass",
    "accessibility",
    "params",
];

/// Classify a component type string into a NodeCategory.
pub fn classify_component(component: &str) -> NodeCategory {
    match component {
        // Layout containers
        "Stack" | "Card" | "Accordion" | "Collapsible" | "Page" | "Grid" | "Row" | "Column" => {
            NodeCategory::Layout
        }
        // Display-only
        "Heading" | "Text" | "Divider" | "Alert" | "Image" | "Html" => NodeCategory::Display,
        // Interactive navigation
        "Wizard" | "Tabs" => NodeCategory::Interactive,
        // Field inputs
        "TextInput" | "NumberInput" | "Select" | "Toggle" | "Checkbox" | "DatePicker"
        | "RadioGroup" | "CheckboxGroup" | "Slider" | "Rating" | "FileUpload" | "Signature"
        | "MoneyInput" | "Textarea" | "RichText" => NodeCategory::Field,
        // Unknown / custom
        _ => NodeCategory::Special,
    }
}

/// Extract component props from a tree node, excluding structural keys.
pub fn extract_props(comp: &Value) -> Map<String, Value> {
    let mut props = Map::new();
    if let Some(obj) = comp.as_object() {
        for (key, val) in obj {
            if !STRUCTURAL_KEYS.contains(&key.as_str()) {
                props.insert(key.clone(), val.clone());
            }
        }
    }
    props
}

// ---------------------------------------------------------------------------
// Style token resolution
// ---------------------------------------------------------------------------

/// Resolve `$token` references in a style map against the theme's token map.
pub fn resolve_style_tokens_map(
    style: &Map<String, Value>,
    ctx: &PlanContext,
) -> Map<String, Value> {
    let tokens = ctx
        .theme
        .as_ref()
        .and_then(|t| t.tokens.as_ref());

    let mut resolved = Map::new();
    for (key, val) in style {
        let resolved_val = match val.as_str() {
            Some(s) if s.starts_with('$') => {
                let token_name = &s[1..];
                tokens
                    .and_then(|t| t.get(token_name))
                    .cloned()
                    .unwrap_or_else(|| val.clone())
            }
            _ => val.clone(),
        };
        resolved.insert(key.clone(), resolved_val);
    }
    resolved
}

// ---------------------------------------------------------------------------
// Field item snapshot
// ---------------------------------------------------------------------------

/// Build a FieldItemSnapshot from a definition item Value.
pub fn build_field_item_snapshot(item: &Value) -> FieldItemSnapshot {
    let key = item
        .get("key")
        .or_else(|| item.get("path"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let label = item.get("label").and_then(|v| v.as_str()).map(String::from);
    let hint = item.get("hint").and_then(|v| v.as_str()).map(String::from);
    let data_type = item
        .get("dataType")
        .and_then(|v| v.as_str())
        .map(String::from);

    let options = item
        .get("options")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|opt| {
                    Some(FieldOption {
                        value: opt.get("value")?.clone(),
                        label: opt.get("label").and_then(|l| l.as_str()).map(String::from),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    let option_set = item
        .get("optionSet")
        .and_then(|v| v.as_str())
        .map(String::from);

    FieldItemSnapshot {
        key,
        label,
        hint,
        data_type,
        options,
        option_set,
    }
}

// ---------------------------------------------------------------------------
// Tier 1 hints
// ---------------------------------------------------------------------------

fn parse_data_type(s: &str) -> Option<FormspecDataType> {
    match s {
        "string" => Some(FormspecDataType::String),
        "text" => Some(FormspecDataType::Text),
        "integer" => Some(FormspecDataType::Integer),
        "decimal" => Some(FormspecDataType::Decimal),
        "boolean" => Some(FormspecDataType::Boolean),
        "date" => Some(FormspecDataType::Date),
        "dateTime" => Some(FormspecDataType::DateTime),
        "time" => Some(FormspecDataType::Time),
        "uri" => Some(FormspecDataType::Uri),
        "attachment" => Some(FormspecDataType::Attachment),
        "choice" => Some(FormspecDataType::Choice),
        "multiChoice" => Some(FormspecDataType::MultiChoice),
        "money" => Some(FormspecDataType::Money),
        _ => None,
    }
}

fn classify_item_type(item: &Value) -> ItemType {
    if item.get("items").is_some() {
        return ItemType::Group;
    }
    let item_type_str = item.get("type").and_then(|v| v.as_str()).unwrap_or("");
    match item_type_str {
        "group" => ItemType::Group,
        "display" => ItemType::Display,
        _ => {
            // If it has a dataType, it's a field
            if item.get("dataType").is_some() {
                ItemType::Field
            } else if item.get("content").is_some() || item.get("html").is_some() {
                ItemType::Display
            } else {
                ItemType::Field
            }
        }
    }
}

/// Build Tier1Hints from a definition item and optional form presentation.
pub fn build_tier1_hints(item: &Value, form_presentation: Option<&Value>) -> Tier1Hints {
    let item_presentation = item
        .get("presentation")
        .and_then(|p| p.get("widgetHint"))
        .and_then(|v| v.as_str())
        .map(|wh| ItemPresentation {
            widget_hint: Some(wh.to_string()),
        });

    let form_pres = form_presentation.and_then(|fp| {
        serde_json::from_value::<FormPresentation>(fp.clone()).ok()
    });

    Tier1Hints {
        item_presentation,
        form_presentation: form_pres,
    }
}

/// Build an ItemDescriptor for theme cascade resolution.
fn build_item_descriptor(item: &Value) -> ItemDescriptor {
    let key = item
        .get("key")
        .or_else(|| item.get("path"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let item_type = classify_item_type(item);

    let data_type = item
        .get("dataType")
        .and_then(|v| v.as_str())
        .and_then(parse_data_type);

    ItemDescriptor {
        key,
        item_type,
        data_type,
    }
}

// ---------------------------------------------------------------------------
// Component tree planning
// ---------------------------------------------------------------------------

/// Maximum custom component expansion depth.
const MAX_CUSTOM_DEPTH: usize = 3;
/// Maximum total recursion depth.
const MAX_TOTAL_DEPTH: usize = 20;

/// Plan a single component tree node into a LayoutNode, recursing on children.
pub fn plan_component_tree(tree: &Value, ctx: &PlanContext) -> LayoutNode {
    plan_component_tree_inner(tree, ctx, &mut HashSet::new(), 0, 0)
}

fn plan_component_tree_inner(
    tree: &Value,
    ctx: &PlanContext,
    expanding: &mut HashSet<String>,
    custom_depth: usize,
    total_depth: usize,
) -> LayoutNode {
    if total_depth >= MAX_TOTAL_DEPTH {
        return LayoutNode {
            id: next_id("err"),
            component: "Text".to_string(),
            category: NodeCategory::Display,
            props: {
                let mut m = Map::new();
                m.insert("content".to_string(), json!("Max recursion depth exceeded"));
                m
            },
            style: None,
            css_classes: Vec::new(),
            accessibility: None,
            children: Vec::new(),
            bind_path: None,
            field_item: None,
            presentation: None,
            label_position: None,
            when: None,
            when_prefix: None,
            fallback: None,
            repeat_group: None,
            repeat_path: None,
            is_repeat_template: None,
            scope_change: None,
        };
    }

    let obj = match tree.as_object() {
        Some(o) => o,
        None => {
            return LayoutNode {
                id: next_id("node"),
                component: "Text".to_string(),
                category: NodeCategory::Display,
                props: Map::new(),
                style: None,
                css_classes: Vec::new(),
                accessibility: None,
                children: Vec::new(),
                bind_path: None,
                field_item: None,
                presentation: None,
                label_position: None,
                when: None,
                when_prefix: None,
                fallback: None,
                repeat_group: None,
                repeat_path: None,
                is_repeat_template: None,
                scope_change: None,
            };
        }
    };

    // 1. Resolve responsive props
    let resolved_tree = if ctx.viewport_width.is_some() && obj.contains_key("responsive") {
        let breakpoints = ctx
            .theme
            .as_ref()
            .and_then(|t| t.breakpoints.as_ref());
        resolve_responsive_props(tree, ctx.viewport_width.unwrap(), breakpoints)
    } else {
        tree.clone()
    };
    let obj = resolved_tree.as_object().unwrap();

    // 2. Get component type
    let mut component_type = obj
        .get("component")
        .and_then(|v| v.as_str())
        .unwrap_or("Stack")
        .to_string();

    // 3. Check for custom component in componentDocument.components
    if let Some(ref comp_doc) = ctx.component_document {
        if let Some(components) = comp_doc.get("components").and_then(|c| c.as_object()) {
            if let Some(custom_def) = components.get(&component_type) {
                if custom_depth < MAX_CUSTOM_DEPTH && !expanding.contains(&component_type) {
                    // Deep-clone the template
                    let template = custom_def
                        .get("template")
                        .cloned()
                        .unwrap_or_else(|| custom_def.clone());
                    let mut expanded = template.clone();

                    // Interpolate params
                    if let Some(params) = obj.get("params").and_then(|p| p.as_object()) {
                        interpolate_params(&mut expanded, params);
                    }

                    // Track cycle detection
                    expanding.insert(component_type.clone());
                    let result = plan_component_tree_inner(
                        &expanded,
                        ctx,
                        expanding,
                        custom_depth + 1,
                        total_depth + 1,
                    );
                    expanding.remove(&component_type);
                    return result;
                }
            }
        }
    }

    // 5. Extract props (non-structural keys)
    let mut props = extract_props(&resolved_tree);

    // 6. Handle field binding
    let bind_path = obj.get("bind").and_then(|v| v.as_str()).map(String::from);
    let mut field_item = None;
    let mut presentation = None;
    let mut label_position = None;
    let mut fallback = None;

    if let Some(ref path) = bind_path {
        if let Some(item) = (ctx.find_item)(path) {
            // Build tier1 hints
            let tier1 = build_tier1_hints(&item, ctx.form_presentation.as_ref());
            let descriptor = build_item_descriptor(&item);

            // Run theme cascade
            let pres = resolve_presentation(
                ctx.theme.as_ref(),
                &descriptor,
                Some(&tier1),
                None, // no renderer defaults
            );

            // Select widget: cascade widget → default from dataType
            let resolved_component = if let Some(ref w) = pres.widget {
                widget_token_to_component(w)
                    .map(String::from)
                    .unwrap_or_else(|| w.clone())
            } else {
                let dt = item
                    .get("dataType")
                    .and_then(|v| v.as_str())
                    .unwrap_or("string");
                get_default_component(dt).to_string()
            };

            // Merge widgetConfig into props
            if let Some(ref wc) = pres.widget_config {
                for (k, v) in wc {
                    props.insert(k.clone(), v.clone());
                }
            }

            label_position = pres.label_position;
            fallback = pres.fallback.clone();

            field_item = Some(build_field_item_snapshot(&item));
            presentation = Some(pres);

            // Override component type if cascade resolved a different widget.
            // Only if the tree didn't explicitly specify a component.
            if !obj.contains_key("component") {
                component_type = resolved_component;
            }
        }
    }

    // 4. Classify component (after cascade may have changed component_type)
    let category = classify_component(&component_type);

    // 7. Copy when, style, cssClass, accessibility
    let when = obj.get("when").and_then(|v| v.as_str()).map(String::from);
    let when_prefix = obj
        .get("whenPrefix")
        .and_then(|v| v.as_str())
        .map(String::from);

    let style = obj.get("style").and_then(|v| v.as_object()).map(|s| {
        resolve_style_tokens_map(s, ctx)
    });

    let css_classes = obj
        .get("cssClass")
        .map(|v| match v {
            Value::String(s) => s.split_whitespace().map(String::from).collect(),
            Value::Array(arr) => arr
                .iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect(),
            _ => Vec::new(),
        })
        .unwrap_or_default();

    // Merge cascade css_class into classes
    let mut all_classes = css_classes;
    if let Some(ref pres) = presentation {
        if let Some(ref cc) = pres.css_class {
            for c in cc.to_vec() {
                if !all_classes.contains(&c) {
                    all_classes.push(c);
                }
            }
        }
    }

    let accessibility = obj
        .get("accessibility")
        .and_then(|v| serde_json::from_value(v.clone()).ok());

    // 8. Recurse on children
    let children_val = obj.get("children").and_then(|v| v.as_array());
    let children: Vec<LayoutNode> = children_val
        .map(|arr| {
            arr.iter()
                .map(|child| {
                    plan_component_tree_inner(child, ctx, expanding, custom_depth, total_depth + 1)
                })
                .collect()
        })
        .unwrap_or_default();

    // 9. Detect repeat groups
    let mut repeat_group = None;
    let mut is_repeat_template = None;

    if let Some(ref path) = bind_path {
        if let Some(item) = (ctx.find_item)(path) {
            if item.get("repeatable").and_then(|v| v.as_bool()) == Some(true) {
                repeat_group = Some(path.clone());
                is_repeat_template = Some(true);
            }
        }
    }

    // 10. Detect scope change for groups
    let scope_change = if category == NodeCategory::Layout {
        bind_path.clone()
    } else {
        None
    };

    LayoutNode {
        id: next_id("node"),
        component: component_type,
        category,
        props,
        style,
        css_classes: all_classes,
        accessibility,
        children,
        bind_path,
        field_item,
        presentation,
        label_position,
        when,
        when_prefix,
        fallback,
        repeat_group,
        repeat_path: None,
        is_repeat_template,
        scope_change,
    }
}

// ---------------------------------------------------------------------------
// Definition fallback planning
// ---------------------------------------------------------------------------

/// Fallback planner: when no component document is provided, walk definition items
/// and produce a layout tree using theme cascade + default component mapping.
pub fn plan_definition_fallback(items: &[Value], ctx: &PlanContext) -> Vec<LayoutNode> {
    let form_pres = ctx.form_presentation.as_ref();

    // Check for page mode
    let page_mode = form_pres
        .and_then(|fp| fp.get("pageMode"))
        .and_then(|v| v.as_str());

    let nodes: Vec<LayoutNode> = items
        .iter()
        .map(|item| plan_single_item(item, ctx))
        .collect();

    // Wrap in wizard/tabs if page mode is set
    match page_mode {
        Some("wizard") => {
            let wrapper = LayoutNode {
                id: next_id("wizard"),
                component: "Wizard".to_string(),
                category: NodeCategory::Interactive,
                props: Map::new(),
                style: None,
                css_classes: Vec::new(),
                accessibility: None,
                children: nodes,
                bind_path: None,
                field_item: None,
                presentation: None,
                label_position: None,
                when: None,
                when_prefix: None,
                fallback: None,
                repeat_group: None,
                repeat_path: None,
                is_repeat_template: None,
                scope_change: None,
            };
            vec![wrapper]
        }
        Some("tabs") => {
            let wrapper = LayoutNode {
                id: next_id("tabs"),
                component: "Tabs".to_string(),
                category: NodeCategory::Interactive,
                props: Map::new(),
                style: None,
                css_classes: Vec::new(),
                accessibility: None,
                children: nodes,
                bind_path: None,
                field_item: None,
                presentation: None,
                label_position: None,
                when: None,
                when_prefix: None,
                fallback: None,
                repeat_group: None,
                repeat_path: None,
                is_repeat_template: None,
                scope_change: None,
            };
            vec![wrapper]
        }
        _ => nodes,
    }
}

/// Plan a single definition item into a LayoutNode.
fn plan_single_item(item: &Value, ctx: &PlanContext) -> LayoutNode {
    let key = item
        .get("key")
        .or_else(|| item.get("path"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let item_type = classify_item_type(item);

    match item_type {
        ItemType::Group => plan_group_item(item, &key, ctx),
        ItemType::Display => plan_display_item(item, &key, ctx),
        ItemType::Field => plan_field_item(item, &key, ctx),
    }
}

fn plan_field_item(item: &Value, key: &str, ctx: &PlanContext) -> LayoutNode {
    let tier1 = build_tier1_hints(item, ctx.form_presentation.as_ref());
    let descriptor = build_item_descriptor(item);

    let pres = resolve_presentation(ctx.theme.as_ref(), &descriptor, Some(&tier1), None);

    // Determine component: cascade widget → resolve → default
    let component = if let Some(ref widget) = pres.widget {
        let is_avail = |comp: &str| ctx.component_available(comp);
        resolve_widget(&pres, &is_avail)
            .unwrap_or_else(|| {
                widget_token_to_component(widget)
                    .map(String::from)
                    .unwrap_or_else(|| {
                        let dt = item
                            .get("dataType")
                            .and_then(|v| v.as_str())
                            .unwrap_or("string");
                        get_default_component(dt).to_string()
                    })
            })
    } else {
        let dt = item
            .get("dataType")
            .and_then(|v| v.as_str())
            .unwrap_or("string");
        get_default_component(dt).to_string()
    };

    let category = classify_component(&component);
    let field_snapshot = build_field_item_snapshot(item);

    let label_position = pres.label_position;
    let fallback = pres.fallback.clone();

    // Build props from widgetConfig
    let mut props = Map::new();
    if let Some(ref wc) = pres.widget_config {
        for (k, v) in wc {
            props.insert(k.clone(), v.clone());
        }
    }

    // CSS classes from cascade
    let css_classes = pres
        .css_class
        .as_ref()
        .map(|cc| cc.to_vec())
        .unwrap_or_default();

    // Style from cascade
    let style = pres.style.clone();

    // Accessibility from cascade
    let accessibility = pres.accessibility.clone();

    // Relevance condition from bind
    let when = item
        .get("bind")
        .and_then(|b| b.get("relevant"))
        .and_then(|v| v.as_str())
        .map(String::from);

    // Repeat
    let is_repeatable = item.get("repeatable").and_then(|v| v.as_bool()) == Some(true);
    let repeat_group = if is_repeatable {
        Some(key.to_string())
    } else {
        None
    };
    let is_repeat_template = if is_repeatable { Some(true) } else { None };

    LayoutNode {
        id: next_id("field"),
        component,
        category,
        props,
        style,
        css_classes,
        accessibility,
        children: Vec::new(),
        bind_path: Some(key.to_string()),
        field_item: Some(field_snapshot),
        presentation: Some(pres),
        label_position,
        when,
        when_prefix: None,
        fallback,
        repeat_group,
        repeat_path: None,
        is_repeat_template,
        scope_change: None,
    }
}

fn plan_group_item(item: &Value, key: &str, ctx: &PlanContext) -> LayoutNode {
    let sub_items = item
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let children: Vec<LayoutNode> = sub_items
        .iter()
        .map(|child| plan_single_item(child, ctx))
        .collect();

    let label = item.get("label").and_then(|v| v.as_str()).map(String::from);

    let mut props = Map::new();
    if let Some(l) = &label {
        props.insert("title".to_string(), json!(l));
    }

    // Relevance condition
    let when = item
        .get("bind")
        .and_then(|b| b.get("relevant"))
        .and_then(|v| v.as_str())
        .map(String::from);

    // Repeat detection
    let is_repeatable = item.get("repeatable").and_then(|v| v.as_bool()) == Some(true);
    let repeat_group = if is_repeatable {
        Some(key.to_string())
    } else {
        None
    };
    let is_repeat_template = if is_repeatable { Some(true) } else { None };

    LayoutNode {
        id: next_id("group"),
        component: "Stack".to_string(),
        category: NodeCategory::Layout,
        props,
        style: None,
        css_classes: Vec::new(),
        accessibility: None,
        children,
        bind_path: Some(key.to_string()),
        field_item: None,
        presentation: None,
        label_position: None,
        when,
        when_prefix: None,
        fallback: None,
        repeat_group,
        repeat_path: None,
        is_repeat_template,
        scope_change: Some(key.to_string()),
    }
}

fn plan_display_item(item: &Value, key: &str, _ctx: &PlanContext) -> LayoutNode {
    let content = item
        .get("content")
        .or_else(|| item.get("html"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let component = if item.get("html").is_some() {
        "Html"
    } else {
        "Text"
    };

    let mut props = Map::new();
    props.insert("content".to_string(), json!(content));

    LayoutNode {
        id: next_id("display"),
        component: component.to_string(),
        category: NodeCategory::Display,
        props,
        style: None,
        css_classes: Vec::new(),
        accessibility: None,
        children: Vec::new(),
        bind_path: if key.is_empty() {
            None
        } else {
            Some(key.to_string())
        },
        field_item: None,
        presentation: None,
        label_position: None,
        when: None,
        when_prefix: None,
        fallback: None,
        repeat_group: None,
        repeat_path: None,
        is_repeat_template: None,
        scope_change: None,
    }
}

impl PlanContext {
    /// Default `is_component_available` — returns true for all components.
    pub fn component_available(&self, component: &str) -> bool {
        match &self.is_component_available {
            Some(f) => f(component),
            None => true,
        }
    }
}
