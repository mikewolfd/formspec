//! LayoutNode and PlanContext types for the layout planner.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use formspec_theme::{
    AccessibilityBlock, LabelPosition, PresentationBlock, ThemeDocument,
};

/// Category of a layout node.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NodeCategory {
    Layout,
    Field,
    Display,
    Interactive,
    Special,
}

/// Snapshot of field-level metadata extracted from a definition item.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FieldItemSnapshot {
    pub key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_type: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub options: Vec<FieldOption>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub option_set: Option<String>,
}

/// A single option in a choice/multiChoice field.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FieldOption {
    pub value: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

/// A node in the planned layout tree.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LayoutNode {
    pub id: String,
    pub component: String,
    pub category: NodeCategory,

    #[serde(default, skip_serializing_if = "Map::is_empty")]
    pub props: Map<String, Value>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub style: Option<Map<String, Value>>,

    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub css_classes: Vec<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub accessibility: Option<AccessibilityBlock>,

    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<LayoutNode>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub bind_path: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub field_item: Option<FieldItemSnapshot>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub presentation: Option<PresentationBlock>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub label_position: Option<LabelPosition>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub when: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub when_prefix: Option<String>,

    /// ConditionalGroup display text when the condition is false.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fallback_text: Option<String>,

    /// Theme cascade widget fallback chain (list of widget type names).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub widget_fallback: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub repeat_group: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub repeat_path: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_repeat_template: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_change: Option<String>,
}

/// Runtime context for the layout planner.
pub struct PlanContext {
    /// Definition items array.
    pub items: Vec<Value>,
    /// Form-wide presentation from the definition.
    pub form_presentation: Option<Value>,
    /// Component document (Tier 3).
    pub component_document: Option<Value>,
    /// Theme document (Tier 2).
    pub theme: Option<ThemeDocument>,
    /// Current viewport width for responsive resolution.
    pub viewport_width: Option<u32>,
    /// Lookup function: given a path/key, returns the definition item.
    pub find_item: Box<dyn Fn(&str) -> Option<Value>>,
    /// Predicate: is a given component type available in the renderer?
    pub is_component_available: Option<Box<dyn Fn(&str) -> bool>>,
}

/// JSON-serializable version of PlanContext for deserialization from external callers.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanContextJson {
    /// Items indexed by path/key.
    #[serde(default)]
    pub items_by_path: Map<String, Value>,
    /// Form-wide presentation from the definition.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub form_presentation: Option<Value>,
    /// Component document.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub component_document: Option<Value>,
    /// Theme document.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub theme: Option<ThemeDocument>,
    /// Viewport width.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub viewport_width: Option<u32>,
    /// Set of available component type names.
    #[serde(default)]
    pub available_components: Vec<String>,
}

impl From<PlanContextJson> for PlanContext {
    fn from(json: PlanContextJson) -> Self {
        let items: Vec<Value> = json.items_by_path.values().cloned().collect();

        let items_map: Map<String, Value> = json.items_by_path.clone();
        let find_item: Box<dyn Fn(&str) -> Option<Value>> =
            Box::new(move |key: &str| items_map.get(key).cloned());

        let available: std::collections::HashSet<String> =
            json.available_components.into_iter().collect();
        let is_available: Option<Box<dyn Fn(&str) -> bool>> = if available.is_empty() {
            None
        } else {
            Some(Box::new(move |comp: &str| available.contains(comp)))
        };

        PlanContext {
            items,
            form_presentation: json.form_presentation,
            component_document: json.component_document,
            theme: json.theme,
            viewport_width: json.viewport_width,
            find_item,
            is_component_available: is_available,
        }
    }
}
