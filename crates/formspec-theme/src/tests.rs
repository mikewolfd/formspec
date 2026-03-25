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

// ── Cascade: Nested Object Replacement ──

#[test]
fn widget_config_replaced_as_whole_by_higher_level() {
    // Per SS5.5: nested objects are replaced as a whole, not deep-merged.
    let mut lower_cfg = Map::new();
    lower_cfg.insert("maxLength".to_string(), json!(100));
    lower_cfg.insert("placeholder".to_string(), json!("Enter..."));

    let mut higher_cfg = Map::new();
    higher_cfg.insert("maxLength".to_string(), json!(50));
    // Note: higher does NOT have "placeholder"

    let mut theme = make_theme(Some(PresentationBlock {
        widget_config: Some(lower_cfg),
        ..Default::default()
    }));
    // Selector overrides widgetConfig
    theme.selectors = Some(vec![ThemeSelector {
        r#match: SelectorMatch {
            r#type: Some(ItemType::Field),
            data_type: None,
        },
        apply: PresentationBlock {
            widget_config: Some(higher_cfg),
            ..Default::default()
        },
    }]);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        None,
        None,
    );

    let wc = result.widget_config.unwrap();
    assert_eq!(wc.get("maxLength"), Some(&json!(50)));
    // Replace-as-whole: lower "placeholder" is NOT preserved — entire widgetConfig replaced
    assert_eq!(wc.get("placeholder"), None);
}

#[test]
fn style_replaced_as_whole_by_higher_level() {
    // Per SS5.5: style is replaced as a whole, not deep-merged.
    let mut lower_style = Map::new();
    lower_style.insert("color".to_string(), json!("red"));
    lower_style.insert("fontSize".to_string(), json!("12px"));

    let mut higher_style = Map::new();
    higher_style.insert("color".to_string(), json!("blue"));

    let mut theme = make_theme(Some(PresentationBlock {
        style: Some(lower_style),
        ..Default::default()
    }));
    theme.selectors = Some(vec![ThemeSelector {
        r#match: SelectorMatch {
            r#type: Some(ItemType::Field),
            data_type: None,
        },
        apply: PresentationBlock {
            style: Some(higher_style),
            ..Default::default()
        },
    }]);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        None,
        None,
    );

    let s = result.style.unwrap();
    assert_eq!(s.get("color"), Some(&json!("blue")), "higher overrides lower");
    // Replace-as-whole: lower "fontSize" is NOT preserved
    assert_eq!(s.get("fontSize"), None, "lower fontSize dropped — style replaced as whole");
}

#[test]
fn accessibility_replaced_as_whole_by_higher_level() {
    // Per SS5.5: accessibility is replaced as a whole, not deep-merged.
    let mut theme = make_theme(Some(PresentationBlock {
        accessibility: Some(AccessibilityBlock {
            role: Some("textbox".to_string()),
            description: Some("Enter your name".to_string()),
            live_region: None,
        }),
        ..Default::default()
    }));
    theme.selectors = Some(vec![ThemeSelector {
        r#match: SelectorMatch {
            r#type: Some(ItemType::Field),
            data_type: None,
        },
        apply: PresentationBlock {
            accessibility: Some(AccessibilityBlock {
                role: None,
                description: Some("Updated description".to_string()),
                live_region: Some("polite".to_string()),
            }),
            ..Default::default()
        },
    }]);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        None,
        None,
    );

    let acc = result.accessibility.unwrap();
    // Replace-as-whole: lower "role" is NOT preserved — entire accessibility block replaced
    assert_eq!(acc.role, None, "lower role dropped — accessibility replaced as whole");
    assert_eq!(acc.description, Some("Updated description".to_string()), "higher description");
    assert_eq!(acc.live_region, Some("polite".to_string()), "higher live_region");
}

// ── Cascade: Full 6-Level Priority ──

#[test]
fn full_six_level_cascade_priority() {
    // Set different properties at each level to verify priority order
    let renderer_defaults = PresentationBlock {
        widget: Some("renderer-widget".to_string()),
        label_position: Some(LabelPosition::Top),
        fallback: Some(vec!["RendererFallback".to_string()]),
        ..Default::default()
    };

    let tier1 = Tier1Hints {
        form_presentation: Some(FormPresentation {
            label_position: Some(LabelPosition::Start),
            ..Default::default()
        }),
        item_presentation: Some(ItemPresentation {
            widget_hint: Some("tier1-widget".to_string()),
        }),
    };

    let mut theme = make_theme(Some(PresentationBlock {
        fallback: Some(vec!["DefaultFallback".to_string()]),
        ..Default::default()
    }));
    theme.selectors = Some(vec![ThemeSelector {
        r#match: SelectorMatch {
            r#type: Some(ItemType::Field),
            data_type: None,
        },
        apply: PresentationBlock {
            label_position: Some(LabelPosition::Hidden),
            ..Default::default()
        },
    }]);
    let mut items = Map::new();
    items.insert(
        "name".to_string(),
        serde_json::to_value(PresentationBlock {
            widget: Some("items-widget".to_string()),
            ..Default::default()
        })
        .unwrap(),
    );
    theme.items = Some(items);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        Some(&tier1),
        Some(&renderer_defaults),
    );

    // Level 3 (items) overrides all lower levels for widget
    assert_eq!(result.widget, Some("items-widget".to_string()));
    // Level 2 (selectors) overrides level -1 (formPresentation) for labelPosition
    assert_eq!(result.label_position, Some(LabelPosition::Hidden));
    // Level 1 (defaults) overrides level -2 (renderer defaults) for fallback
    assert_eq!(result.fallback, Some(vec!["DefaultFallback".to_string()]));
}

// ── Cascade: Selector Document Order ──

#[test]
fn selector_document_order_last_wins() {
    let mut theme = make_theme(None);
    theme.selectors = Some(vec![
        ThemeSelector {
            r#match: SelectorMatch {
                r#type: Some(ItemType::Field),
                data_type: None,
            },
            apply: PresentationBlock {
                widget: Some("First".to_string()),
                ..Default::default()
            },
        },
        ThemeSelector {
            r#match: SelectorMatch {
                r#type: Some(ItemType::Field),
                data_type: None,
            },
            apply: PresentationBlock {
                widget: Some("Second".to_string()),
                ..Default::default()
            },
        },
    ]);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        None,
        None,
    );
    // Both selectors match; since they're applied in order, last one wins
    assert_eq!(result.widget, Some("Second".to_string()));
}

// ── Cascade: CSS Class Deduplication ──

#[test]
fn css_class_deduplication() {
    let mut theme = make_theme(Some(PresentationBlock {
        css_class: Some(CssClassValue::Multiple(vec![
            "shared".to_string(),
            "base".to_string(),
        ])),
        ..Default::default()
    }));
    theme.selectors = Some(vec![ThemeSelector {
        r#match: SelectorMatch {
            r#type: Some(ItemType::Field),
            data_type: None,
        },
        apply: PresentationBlock {
            css_class: Some(CssClassValue::Multiple(vec![
                "shared".to_string(),
                "extra".to_string(),
            ])),
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
    // "shared" should appear only once (deduplication)
    assert_eq!(
        classes.iter().filter(|c| *c == "shared").count(),
        1,
        "duplicate classes should be removed"
    );
    assert!(classes.contains(&"base".to_string()));
    assert!(classes.contains(&"extra".to_string()));
}

// ── Cascade: Group Item Type ──

#[test]
fn selector_matches_group_type() {
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

    let group_item = ItemDescriptor {
        key: "address".to_string(),
        item_type: ItemType::Group,
        data_type: None,
    };

    let result = resolve_presentation(Some(&theme), &group_item, None, None);
    assert_eq!(result.widget, Some("Stack".to_string()));
}

// ── Cascade: Selector with Empty Match ──

#[test]
fn selector_empty_match_does_not_apply() {
    let mut theme = make_theme(None);
    theme.selectors = Some(vec![ThemeSelector {
        r#match: SelectorMatch {
            r#type: None,
            data_type: None,
        },
        apply: PresentationBlock {
            widget: Some("ShouldNotMatch".to_string()),
            ..Default::default()
        },
    }]);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        None,
        None,
    );
    // Empty match should not match any item
    assert_eq!(result.widget, None);
}

// ── Cascade: x-classes Additive Merge ──

#[test]
fn widget_config_x_classes_replaced_as_whole() {
    // Per SS5.5: widgetConfig is replaced as a whole. x-classes within it
    // are NOT additively merged — the entire widgetConfig from the higher
    // cascade level replaces the lower one.
    let mut lower_cfg = Map::new();
    let mut lower_slots = Map::new();
    lower_slots.insert("root".to_string(), json!("p-4"));
    lower_slots.insert("label".to_string(), json!("text-sm"));
    lower_cfg.insert("x-classes".to_string(), serde_json::Value::Object(lower_slots));

    let mut higher_cfg = Map::new();
    let mut higher_slots = Map::new();
    higher_slots.insert("root".to_string(), json!("p-8")); // override
    higher_slots.insert("input".to_string(), json!("border")); // new slot
    higher_cfg.insert("x-classes".to_string(), serde_json::Value::Object(higher_slots));

    let mut theme = make_theme(Some(PresentationBlock {
        widget_config: Some(lower_cfg),
        ..Default::default()
    }));
    theme.selectors = Some(vec![ThemeSelector {
        r#match: SelectorMatch {
            r#type: Some(ItemType::Field),
            data_type: None,
        },
        apply: PresentationBlock {
            widget_config: Some(higher_cfg),
            ..Default::default()
        },
    }]);

    let result = resolve_presentation(
        Some(&theme),
        &field_item("name", None),
        None,
        None,
    );

    let wc = result.widget_config.unwrap();
    let x_classes = wc.get("x-classes").unwrap().as_object().unwrap();
    assert_eq!(x_classes.get("root"), Some(&json!("p-8")), "higher root slot");
    // Replace-as-whole: lower "label" is NOT preserved
    assert_eq!(x_classes.get("label"), None, "lower label dropped — widgetConfig replaced as whole");
    assert_eq!(x_classes.get("input"), Some(&json!("border")), "higher input slot");
}

// ── Token Tests: Edge Cases ──

#[test]
fn token_empty_key_returns_none() {
    let result = resolve_token("$token.", None, None);
    assert_eq!(result, None);
}

#[test]
fn token_unresolved_returns_none() {
    let mut ct = Map::new();
    ct.insert("gap".to_string(), json!(16));
    let result = resolve_token("$token.missing", Some(&ct), None);
    assert_eq!(result, None);
}

#[test]
fn token_recursive_in_theme_layer() {
    let mut tt = Map::new();
    tt.insert("gap".to_string(), json!("$token.gap"));
    let result = resolve_token("$token.gap", None, Some(&tt));
    assert_eq!(result, None, "self-referencing token should be detected");
}

#[test]
fn resolve_style_tokens_replaces_token_refs() {
    use crate::tokens::resolve_style_tokens;

    let mut style = Map::new();
    style.insert("gap".to_string(), json!("$token.spacing"));
    style.insert("color".to_string(), json!("red")); // not a token

    let mut tt = Map::new();
    tt.insert("spacing".to_string(), json!(16));

    let resolved = resolve_style_tokens(&style, None, Some(&tt));
    assert_eq!(resolved.get("gap"), Some(&json!(16)));
    assert_eq!(resolved.get("color"), Some(&json!("red")));
}

#[test]
fn resolve_style_tokens_leaves_unresolved() {
    use crate::tokens::resolve_style_tokens;

    let mut style = Map::new();
    style.insert("gap".to_string(), json!("$token.missing"));

    let resolved = resolve_style_tokens(&style, None, None);
    assert_eq!(resolved.get("gap"), Some(&json!("$token.missing")), "unresolved left as-is");
}

// ── Widget Tests: Edge Cases ──

#[test]
fn widget_token_empty_returns_none() {
    assert_eq!(widget_token_to_component(""), None);
}

#[test]
fn widget_token_extension_returns_none() {
    assert_eq!(widget_token_to_component("x-custom"), None);
}

#[test]
fn resolve_widget_extension_component_available() {
    let pres = PresentationBlock {
        widget: Some("x-custom-slider".to_string()),
        ..Default::default()
    };
    let result = resolve_widget(&pres, &|t| t == "x-custom-slider");
    assert_eq!(result, Some("x-custom-slider".to_string()));
}

#[test]
fn resolve_widget_extension_fallback() {
    let pres = PresentationBlock {
        widget: Some("x-unavailable".to_string()),
        fallback: Some(vec!["TextInput".to_string()]),
        ..Default::default()
    };
    let result = resolve_widget(&pres, &|t| t == "TextInput");
    assert_eq!(result, Some("TextInput".to_string()));
}

#[test]
fn resolve_widget_via_spec_vocabulary() {
    // "radio" is spec vocabulary, resolves to "RadioGroup"
    let pres = PresentationBlock {
        widget: Some("radio".to_string()),
        ..Default::default()
    };
    let result = resolve_widget(&pres, &|t| t == "RadioGroup");
    assert_eq!(result, Some("RadioGroup".to_string()));
}

#[test]
fn resolve_widget_fallback_uses_spec_vocabulary() {
    let pres = PresentationBlock {
        widget: Some("Slider".to_string()),
        fallback: Some(vec!["dropdown".to_string()]), // spec vocab for Select
        ..Default::default()
    };
    let result = resolve_widget(&pres, &|t| t == "Select");
    assert_eq!(result, Some("Select".to_string()));
}

// ── LabelPosition "none" ──

#[test]
fn label_position_none_deserializes() {
    let json_str = r#"{"labelPosition": "none"}"#;
    let block: PresentationBlock = serde_json::from_str(json_str).unwrap();
    assert_eq!(block.label_position, Some(LabelPosition::LabelNone));
}

#[test]
fn label_position_none_serializes_to_none_string() {
    let block = PresentationBlock {
        label_position: Some(LabelPosition::LabelNone),
        ..Default::default()
    };
    let json_str = serde_json::to_string(&block).unwrap();
    assert!(json_str.contains(r#""labelPosition":"none""#));
}

#[test]
fn none_sentinel_suppresses_label_position() {
    let theme = make_theme(Some(PresentationBlock {
        label_position: Some(LabelPosition::Top),
        ..Default::default()
    }));

    let tier1 = Tier1Hints {
        form_presentation: None,
        item_presentation: None,
    };

    // Selector applies labelPosition: "none" at higher priority
    let mut theme_with_selector = theme;
    theme_with_selector.selectors = Some(vec![ThemeSelector {
        r#match: SelectorMatch {
            r#type: Some(ItemType::Field),
            data_type: None,
        },
        apply: PresentationBlock {
            label_position: Some(LabelPosition::LabelNone),
            ..Default::default()
        },
    }]);

    let result = resolve_presentation(
        Some(&theme_with_selector),
        &field_item("name", None),
        Some(&tier1),
        None,
    );
    // "none" should suppress the inherited label position
    assert_eq!(result.label_position, None);
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

#[test]
fn formspec_data_type_deserializes_number_as_decimal_alias() {
    let v: FormspecDataType = serde_json::from_value(json!("number")).unwrap();
    assert_eq!(v, FormspecDataType::Decimal);
}

#[test]
fn item_descriptor_json_accepts_number_data_type() {
    let j = json!({"key": "k", "itemType": "field", "dataType": "number"});
    let d: ItemDescriptor = serde_json::from_value(j).unwrap();
    assert_eq!(d.data_type, Some(FormspecDataType::Decimal));
}
