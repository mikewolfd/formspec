//! Widget vocabulary and fallback chain resolution per Theme spec SS4.3.

use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;

use crate::types::PresentationBlock;

/// All known component type names.
pub static KNOWN_COMPONENT_TYPES: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "TextInput", "NumberInput", "Select", "Toggle", "Checkbox",
        "DatePicker", "RadioGroup", "CheckboxGroup", "Slider", "Rating",
        "FileUpload", "Signature", "MoneyInput",
        "Stack", "Card", "Accordion", "Collapsible",
        "Heading", "Text", "Divider", "Alert",
        "Wizard", "Tabs", "Page",
    ]
    .into_iter()
    .collect()
});

/// Spec-normative Tier 1 widgetHint → Tier 3 component name.
/// Keys are always lowercase (normalized).
pub static SPEC_WIDGET_TO_COMPONENT: LazyLock<HashMap<&'static str, &'static str>> =
    LazyLock::new(|| {
        [
            ("textinput", "TextInput"),
            ("textarea", "TextInput"),
            ("richtext", "TextInput"),
            ("password", "TextInput"),
            ("color", "TextInput"),
            ("numberinput", "NumberInput"),
            ("stepper", "NumberInput"),
            ("slider", "Slider"),
            ("rating", "Rating"),
            ("checkbox", "Checkbox"),
            ("toggle", "Toggle"),
            ("yesno", "Toggle"),
            ("datepicker", "DatePicker"),
            ("datetimepicker", "DatePicker"),
            ("timepicker", "DatePicker"),
            ("dateinput", "TextInput"),
            ("datetimeinput", "TextInput"),
            ("timeinput", "TextInput"),
            ("dropdown", "Select"),
            ("radio", "RadioGroup"),
            ("autocomplete", "Select"),
            ("segmented", "RadioGroup"),
            ("likert", "RadioGroup"),
            ("checkboxgroup", "CheckboxGroup"),
            ("multiselect", "CheckboxGroup"),
            ("fileupload", "FileUpload"),
            ("camera", "FileUpload"),
            ("signature", "Signature"),
            ("moneyinput", "MoneyInput"),
            ("urlinput", "TextInput"),
            ("section", "Stack"),
            ("card", "Card"),
            ("accordion", "Accordion"),
            ("tab", "Stack"),
            ("heading", "Heading"),
            ("paragraph", "Text"),
            ("divider", "Divider"),
            ("banner", "Alert"),
        ]
        .into_iter()
        .collect()
    });

/// Reverse map: PascalCase component → canonical camelCase hint.
pub static COMPONENT_TO_HINT: LazyLock<HashMap<&'static str, &'static str>> =
    LazyLock::new(|| {
        [
            ("TextInput", "textInput"),
            ("NumberInput", "numberInput"),
            ("Checkbox", "checkbox"),
            ("Toggle", "toggle"),
            ("DatePicker", "datePicker"),
            ("Select", "dropdown"),
            ("RadioGroup", "radio"),
            ("CheckboxGroup", "checkboxGroup"),
            ("Slider", "slider"),
            ("Rating", "rating"),
            ("FileUpload", "fileUpload"),
            ("Signature", "signature"),
            ("MoneyInput", "moneyInput"),
            ("Stack", "section"),
            ("Card", "card"),
            ("Accordion", "accordion"),
            ("Collapsible", "accordion"),
            ("Heading", "heading"),
            ("Text", "paragraph"),
            ("Divider", "divider"),
            ("Alert", "banner"),
        ]
        .into_iter()
        .collect()
    });

/// Widget compatibility matrix: dataType → ordered list of compatible components.
/// First entry is the default widget for that dataType.
pub static COMPATIBILITY_MATRIX: LazyLock<HashMap<&'static str, Vec<&'static str>>> =
    LazyLock::new(|| {
        [
            ("string", vec!["TextInput", "Select", "RadioGroup"]),
            ("text", vec!["TextInput"]),
            ("decimal", vec!["NumberInput", "Slider", "Rating", "TextInput"]),
            ("integer", vec!["NumberInput", "Slider", "Rating", "TextInput"]),
            ("boolean", vec!["Toggle", "Checkbox"]),
            ("date", vec!["DatePicker", "TextInput"]),
            ("dateTime", vec!["DatePicker", "TextInput"]),
            ("time", vec!["DatePicker", "TextInput"]),
            ("uri", vec!["TextInput"]),
            ("choice", vec!["Select", "RadioGroup", "TextInput"]),
            ("multiChoice", vec!["CheckboxGroup"]),
            ("attachment", vec!["FileUpload", "Signature"]),
            ("money", vec!["MoneyInput", "NumberInput", "TextInput"]),
        ]
        .into_iter()
        .collect()
    });

/// Normalize a widget token for lookup (strip whitespace/dashes/underscores, lowercase).
fn normalize_widget_token(widget: &str) -> String {
    widget
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '_' && *c != '-')
        .flat_map(|c| c.to_lowercase())
        .collect()
}

/// Convert a Tier 1 / theme widget token into a concrete component type.
///
/// Accepts both spec vocabulary (`radio`, `dropdown`) and PascalCase component names
/// (`RadioGroup`, `Select`). Returns `None` if unrecognized.
pub fn widget_token_to_component(widget: &str) -> Option<&'static str> {
    if widget.is_empty() {
        return None;
    }
    // Extension components pass through
    if widget.starts_with("x-") {
        return None; // caller handles extension components
    }
    // Known PascalCase component names
    if KNOWN_COMPONENT_TYPES.contains(widget) {
        // Return the static str from the set
        return KNOWN_COMPONENT_TYPES.get(widget).copied();
    }
    // Spec vocabulary lookup
    let normalized = normalize_widget_token(widget);
    SPEC_WIDGET_TO_COMPONENT.get(normalized.as_str()).copied()
}

/// Select the best available widget from a presentation block's preference
/// and fallback chain.
///
/// Tries the preferred `widget` first, then each entry in `fallback` in order.
/// Returns `None` if no widget is specified or none are available.
pub fn resolve_widget(
    presentation: &PresentationBlock,
    is_available: &dyn Fn(&str) -> bool,
) -> Option<String> {
    let widget = presentation.widget.as_deref()?;

    // Try preferred widget first
    if let Some(component) = widget_token_to_component(widget) {
        if is_available(component) {
            return Some(component.to_string());
        }
    }
    // Also try the raw widget name (for extension components)
    if widget.starts_with("x-") && is_available(widget) {
        return Some(widget.to_string());
    }

    // Try fallback chain
    if let Some(ref fallbacks) = presentation.fallback {
        for fb in fallbacks {
            if let Some(component) = widget_token_to_component(fb) {
                if is_available(component) {
                    return Some(component.to_string());
                }
            }
            if fb.starts_with("x-") && is_available(fb) {
                return Some(fb.to_string());
            }
        }
    }

    None
}
