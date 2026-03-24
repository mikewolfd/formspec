//! Unit tests for formspec-theme.

use serde_json::{json, Map};

use crate::cascade::resolve_presentation;
use crate::tokens::resolve_token;
use crate::types::*;
use crate::widgets::{resolve_widget, widget_token_to_component};

fn make_theme(defaults: Option<PresentationBlock>) -> ThemeDocument {
    ThemeDocument {
        formspec_theme: "1.0".to_string(),
        version: "1.0.0".to_string(),
        target_definition: TargetDefinition {
            url: "test.json".to_string(),
            compatible_versions: None,
        },
        url: None,
        name: None,
        title: None,
        description: None,
        platform: None,
        tokens: None,
        defaults,
        selectors: None,
        items: None,
        pages: None,
        breakpoints: None,
        stylesheets: None,
        extensions: None,
        class_strategy: None,
    }
}

fn field_item(key: &str, data_type: Option<FormspecDataType>) -> ItemDescriptor {
    ItemDescriptor {
        key: key.to_string(),
        item_type: ItemType::Field,
        data_type,
    }
}

// ── Cascade Tests ──

#[test]
fn empty_block_no_theme() {
    let result = resolve_presentation(None, &field_item("name", None), None, None);
    assert_eq!(result, PresentationBlock::default());
}

#[test]
fn theme_defaults_applied() {
    let theme = make_theme(Some(PresentationBlock {
        widget: Some("TextInput".to_string()),
        label_position: Some(LabelPosition::Top),
        ..Default::default()
    }));
    let result = resolve_presentation(Some(&theme), &field_item("name", None), None, None);
    assert_eq!(result.widget, Some("TextInput".to_string()));
    assert_eq!(result.label_position, Some(LabelPosition::Top));
}

#[test]
fn selector_matches_type_and_data_type() {
    let mut theme = make_theme(None);
    theme.selectors = Some(vec![ThemeSelector {
        r#match: SelectorMatch {
            r#type: Some(ItemType::Field),
            data_type: Some(FormspecDataType::String),
        },
        apply: PresentationBlock {
            widget: Some("TextInput".to_string()),
            ..Default::default()
        },
    }]);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", Some(FormspecDataType::String)),
        None,
        None,
    );
    assert_eq!(result.widget, Some("TextInput".to_string()));
}

#[test]
fn selector_no_match_wrong_type() {
    let mut theme = make_theme(None);
    theme.selectors = Some(vec![ThemeSelector {
        r#match: SelectorMatch {
            r#type: Some(ItemType::Group),
            data_type: None,
        },
        apply: PresentationBlock {
            widget: Some("Stack".to_string()),
            ..Default::default()
        },
    }]);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        None,
        None,
    );
    assert_eq!(result.widget, None);
}

#[test]
fn per_item_overrides_highest_priority() {
    let mut theme = make_theme(Some(PresentationBlock {
        widget: Some("TextInput".to_string()),
        ..Default::default()
    }));
    let mut items = Map::new();
    items.insert(
        "name".to_string(),
        serde_json::to_value(PresentationBlock {
            widget: Some("Select".to_string()),
            ..Default::default()
        })
        .unwrap(),
    );
    theme.items = Some(items);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        None,
        None,
    );
    assert_eq!(result.widget, Some("Select".to_string()));
}

#[test]
fn css_class_union_across_levels() {
    let mut theme = make_theme(Some(PresentationBlock {
        css_class: Some(CssClassValue::Single("base-class".to_string())),
        ..Default::default()
    }));
    theme.selectors = Some(vec![ThemeSelector {
        r#match: SelectorMatch {
            r#type: Some(ItemType::Field),
            data_type: None,
        },
        apply: PresentationBlock {
            css_class: Some(CssClassValue::Single("selector-class".to_string())),
            ..Default::default()
        },
    }]);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        None,
        None,
    );

    let classes = result.css_class.unwrap().to_vec();
    assert!(classes.contains(&"base-class".to_string()));
    assert!(classes.contains(&"selector-class".to_string()));
}

#[test]
fn css_class_replace_removes_by_prefix() {
    let mut theme = make_theme(Some(PresentationBlock {
        css_class: Some(CssClassValue::Multiple(vec![
            "p-4".to_string(),
            "m-2".to_string(),
        ])),
        ..Default::default()
    }));
    theme.selectors = Some(vec![ThemeSelector {
        r#match: SelectorMatch {
            r#type: Some(ItemType::Field),
            data_type: None,
        },
        apply: PresentationBlock {
            css_class_replace: Some(CssClassValue::Single("p-8".to_string())),
            ..Default::default()
        },
    }]);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        None,
        None,
    );

    let classes = result.css_class.unwrap().to_vec();
    assert!(!classes.contains(&"p-4".to_string()), "p-4 should be replaced");
    assert!(classes.contains(&"p-8".to_string()));
    assert!(classes.contains(&"m-2".to_string()));
}

#[test]
fn css_class_replace_stripped_from_output() {
    let mut theme = make_theme(None);
    theme.selectors = Some(vec![ThemeSelector {
        r#match: SelectorMatch {
            r#type: Some(ItemType::Field),
            data_type: None,
        },
        apply: PresentationBlock {
            css_class_replace: Some(CssClassValue::Single("p-8".to_string())),
            ..Default::default()
        },
    }]);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        None,
        None,
    );
    assert!(result.css_class_replace.is_none());
}

#[test]
fn none_sentinel_suppresses_widget() {
    let theme = make_theme(Some(PresentationBlock {
        widget: Some("none".to_string()),
        ..Default::default()
    }));

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        None,
        None,
    );
    assert_eq!(result.widget, None);
}

#[test]
fn tier1_form_presentation_applied() {
    let tier1 = Tier1Hints {
        form_presentation: Some(FormPresentation {
            label_position: Some(LabelPosition::Start),
            ..Default::default()
        }),
        item_presentation: None,
    };

    let result = resolve_presentation(
        None,
        &field_item("name", None),
        Some(&tier1),
        None,
    );
    assert_eq!(result.label_position, Some(LabelPosition::Start));
}

#[test]
fn tier1_item_widget_hint() {
    let tier1 = Tier1Hints {
        form_presentation: None,
        item_presentation: Some(ItemPresentation {
            widget_hint: Some("radio".to_string()),
        }),
    };

    let result = resolve_presentation(
        None,
        &field_item("name", None),
        Some(&tier1),
        None,
    );
    assert_eq!(result.widget, Some("radio".to_string()));
}

#[test]
fn renderer_defaults_lowest_priority() {
    let rd = PresentationBlock {
        widget: Some("TextInput".to_string()),
        label_position: Some(LabelPosition::Top),
        ..Default::default()
    };
    let theme = make_theme(Some(PresentationBlock {
        label_position: Some(LabelPosition::Start),
        ..Default::default()
    }));

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        None,
        Some(&rd),
    );
    // Theme defaults override renderer defaults
    assert_eq!(result.label_position, Some(LabelPosition::Start));
    // Widget from renderer defaults preserved since theme doesn't set it
    assert_eq!(result.widget, Some("TextInput".to_string()));
}

#[test]
fn all_matching_selectors_applied() {
    let mut theme = make_theme(None);
    theme.selectors = Some(vec![
        ThemeSelector {
            r#match: SelectorMatch {
                r#type: Some(ItemType::Field),
                data_type: None,
            },
            apply: PresentationBlock {
                label_position: Some(LabelPosition::Top),
                ..Default::default()
            },
        },
        ThemeSelector {
            r#match: SelectorMatch {
                r#type: Some(ItemType::Field),
                data_type: Some(FormspecDataType::String),
            },
            apply: PresentationBlock {
                widget: Some("TextInput".to_string()),
                ..Default::default()
            },
        },
    ]);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", Some(FormspecDataType::String)),
        None,
        None,
    );
    assert_eq!(result.label_position, Some(LabelPosition::Top));
    assert_eq!(result.widget, Some("TextInput".to_string()));
}

// ── Token Tests ──

#[test]
fn component_token_resolved() {
    let mut ct = Map::new();
    ct.insert("gap".to_string(), json!(16));
    let result = resolve_token("$token.gap", Some(&ct), None);
    assert_eq!(result, Some(json!(16)));
}

#[test]
fn theme_token_fallback() {
    let mut tt = Map::new();
    tt.insert("gap".to_string(), json!(8));
    let result = resolve_token("$token.gap", None, Some(&tt));
    assert_eq!(result, Some(json!(8)));
}

#[test]
fn component_takes_precedence() {
    let mut ct = Map::new();
    ct.insert("gap".to_string(), json!(16));
    let mut tt = Map::new();
    tt.insert("gap".to_string(), json!(8));
    let result = resolve_token("$token.gap", Some(&ct), Some(&tt));
    assert_eq!(result, Some(json!(16)));
}

#[test]
fn non_token_returns_none() {
    let result = resolve_token("not-a-token", None, None);
    assert_eq!(result, None);
}

#[test]
fn recursive_token_detected() {
    let mut ct = Map::new();
    ct.insert("gap".to_string(), json!("$token.otherGap"));
    let result = resolve_token("$token.gap", Some(&ct), None);
    assert_eq!(result, None);
}

// ── Widget Tests ──

#[test]
fn widget_token_spec_vocabulary() {
    assert_eq!(widget_token_to_component("radio"), Some("RadioGroup"));
    assert_eq!(widget_token_to_component("dropdown"), Some("Select"));
    assert_eq!(widget_token_to_component("checkbox"), Some("Checkbox"));
}

#[test]
fn widget_token_pascal_case() {
    assert_eq!(widget_token_to_component("TextInput"), Some("TextInput"));
    assert_eq!(widget_token_to_component("RadioGroup"), Some("RadioGroup"));
}

#[test]
fn widget_token_unknown() {
    assert_eq!(widget_token_to_component("unknown"), None);
}

#[test]
fn resolve_widget_preferred() {
    let pres = PresentationBlock {
        widget: Some("TextInput".to_string()),
        ..Default::default()
    };
    let result = resolve_widget(&pres, &|t| t == "TextInput");
    assert_eq!(result, Some("TextInput".to_string()));
}

#[test]
fn resolve_widget_fallback_chain() {
    let pres = PresentationBlock {
        widget: Some("Slider".to_string()),
        fallback: Some(vec!["NumberInput".to_string()]),
        ..Default::default()
    };
    // Slider not available, NumberInput is
    let result = resolve_widget(&pres, &|t| t == "NumberInput");
    assert_eq!(result, Some("NumberInput".to_string()));
}

#[test]
fn resolve_widget_none_available() {
    let pres = PresentationBlock {
        widget: Some("Slider".to_string()),
        fallback: Some(vec!["Rating".to_string()]),
        ..Default::default()
    };
    let result = resolve_widget(&pres, &|_| false);
    assert_eq!(result, None);
}

#[test]
fn resolve_widget_no_preference() {
    let pres = PresentationBlock::default();
    let result = resolve_widget(&pres, &|_| true);
    assert_eq!(result, None);
}

// ── Serde Round-trip ──

#[test]
fn theme_document_serde_roundtrip() {
    let json_str = r#"{
        "$formspecTheme": "1.0",
        "version": "1.0.0",
        "targetDefinition": { "url": "test.json" },
        "defaults": {
            "widget": "TextInput",
            "labelPosition": "top"
        },
        "selectors": [{
            "match": { "type": "field", "dataType": "string" },
            "apply": { "widget": "TextInput" }
        }]
    }"#;
    let theme: ThemeDocument = serde_json::from_str(json_str).unwrap();
    assert_eq!(theme.formspec_theme, "1.0");
    assert!(theme.defaults.is_some());
    assert_eq!(theme.selectors.as_ref().unwrap().len(), 1);

    // Round-trip
    let serialized = serde_json::to_string(&theme).unwrap();
    let _: ThemeDocument = serde_json::from_str(&serialized).unwrap();
}

#[test]
fn presentation_block_serde() {
    let json_str = r#"{
        "widget": "Select",
        "labelPosition": "start",
        "cssClass": ["a", "b"],
        "fallback": ["TextInput"]
    }"#;
    let block: PresentationBlock = serde_json::from_str(json_str).unwrap();
    assert_eq!(block.widget, Some("Select".to_string()));
    assert_eq!(block.label_position, Some(LabelPosition::Start));
    assert_eq!(block.fallback, Some(vec!["TextInput".to_string()]));
    let classes = block.css_class.unwrap().to_vec();
    assert_eq!(classes, vec!["a", "b"]);
}
