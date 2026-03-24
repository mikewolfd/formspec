//! Theme types — all derive Serialize/Deserialize with camelCase renaming.

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

/// ARIA-related presentation hints applied to a rendered element.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilityBlock {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub live_region: Option<String>,
}

/// Merged presentation directives for a single item.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PresentationBlock {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub widget: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub widget_config: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label_position: Option<LabelPosition>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub style: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accessibility: Option<AccessibilityBlock>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fallback: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub css_class: Option<CssClassValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub css_class_replace: Option<CssClassValue>,
}

/// CSS class value — either a single string or an array of strings.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum CssClassValue {
    Single(String),
    Multiple(Vec<String>),
}

impl CssClassValue {
    /// Normalize to a flat list of individual class names.
    pub fn to_vec(&self) -> Vec<String> {
        match self {
            CssClassValue::Single(s) => s
                .split_whitespace()
                .filter(|c| !c.is_empty())
                .map(String::from)
                .collect(),
            CssClassValue::Multiple(arr) => arr
                .iter()
                .flat_map(|s| s.split_whitespace())
                .filter(|c| !c.is_empty())
                .map(String::from)
                .collect(),
        }
    }
}

/// Label position.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum LabelPosition {
    Top,
    Start,
    Hidden,
}

/// CSS class merge strategy.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ClassStrategy {
    Union,
    TailwindMerge,
}

/// Item type for selector matching.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ItemType {
    Group,
    Field,
    Display,
}

/// Formspec data types recognized for selector matching and field definitions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FormspecDataType {
    String,
    Text,
    Integer,
    Decimal,
    Boolean,
    Date,
    DateTime,
    Time,
    Uri,
    Attachment,
    Choice,
    MultiChoice,
    Money,
}

/// Criteria for a theme selector rule.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SelectorMatch {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<ItemType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_type: Option<FormspecDataType>,
}

/// A theme selector rule pairing a match condition with a presentation block to apply.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ThemeSelector {
    pub r#match: SelectorMatch,
    pub apply: PresentationBlock,
}

/// A named layout region within a page.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Region {
    pub key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub span: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub responsive: Option<Map<String, Value>>,
}

/// A page definition within a theme.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Page {
    pub id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub regions: Option<Vec<Region>>,
}

/// Top-level theme document.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ThemeDocument {
    #[serde(rename = "$formspecTheme")]
    pub formspec_theme: String,
    pub version: String,
    pub target_definition: TargetDefinition,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tokens: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub defaults: Option<PresentationBlock>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selectors: Option<Vec<ThemeSelector>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub items: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pages: Option<Vec<Page>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub breakpoints: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stylesheets: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extensions: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub class_strategy: Option<ClassStrategy>,
}

/// Target definition reference.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TargetDefinition {
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compatible_versions: Option<String>,
}

/// Lightweight identifier for a definition item.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemDescriptor {
    pub key: String,
    pub item_type: ItemType,
    pub data_type: Option<FormspecDataType>,
}

/// Form-wide presentation hints from the definition.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FormPresentation {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label_position: Option<LabelPosition>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub density: Option<Density>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page_mode: Option<PageMode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_currency: Option<String>,
}

/// Per-item presentation hints (Tier 1).
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ItemPresentation {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub widget_hint: Option<String>,
}

/// Tier 1 hints from the definition.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tier1Hints {
    pub item_presentation: Option<ItemPresentation>,
    pub form_presentation: Option<FormPresentation>,
}

/// Density values.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Density {
    Compact,
    Comfortable,
    Spacious,
}

/// Page mode values.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PageMode {
    Single,
    Wizard,
    Tabs,
}
