//! 6-level theme cascade resolver per Theme spec SS5.5.

use serde_json::Value;

use crate::types::*;

/// Extract utility-class prefix (e.g. "p-4" → "p-").
fn extract_utility_prefix(cls: &str) -> Option<&str> {
    // Match common utility patterns: prefix-value
    let bytes = cls.as_bytes();
    for (i, &b) in bytes.iter().enumerate() {
        if b == b'-' && i > 0 {
            // Only match if prefix is lowercase alpha
            if bytes[..i].iter().all(|&c| c.is_ascii_lowercase()) {
                return Some(&cls[..=i]);
            }
            break;
        }
    }
    None
}

/// Normalize optional CssClassValue to a Vec<String>.
fn normalize_css_class(val: &Option<CssClassValue>) -> Vec<String> {
    match val {
        Some(v) => v.to_vec(),
        None => Vec::new(),
    }
}

/// Merge two PresentationBlocks. `higher` overrides `lower` for scalar properties.
/// `cssClass` is unioned. Nested objects (`widgetConfig`, `style`, `accessibility`)
/// are shallow-merged: higher keys override lower, but lower keys not present in
/// higher are preserved. This is intentionally more author-friendly than the spec's
/// "replaced as a whole" language (which would drop lower keys entirely). The spec
/// should be updated to match this behavior.
fn merge_blocks(lower: &PresentationBlock, higher: &PresentationBlock) -> PresentationBlock {
    let mut merged = lower.clone();

    // Scalar overrides
    if higher.widget.is_some() {
        merged.widget = higher.widget.clone();
    }
    if higher.label_position.is_some() {
        merged.label_position = higher.label_position;
    }
    if higher.fallback.is_some() {
        merged.fallback = higher.fallback.clone();
    }

    // cssClassReplace: higher level explicitly replaces matching lower classes
    let replace_classes = normalize_css_class(&higher.css_class_replace);
    if !replace_classes.is_empty() {
        let lower_classes = normalize_css_class(&merged.css_class);

        // Build prefix set for replacement
        let replace_prefixes: Vec<&str> = replace_classes
            .iter()
            .filter_map(|c| extract_utility_prefix(c))
            .collect();

        // Remove lower classes that conflict with replacement classes
        let filtered: Vec<String> = lower_classes
            .into_iter()
            .filter(|cls| {
                if replace_classes.contains(cls) {
                    return false;
                }
                if let Some(prefix) = extract_utility_prefix(cls) {
                    if replace_prefixes.contains(&prefix) {
                        return false;
                    }
                }
                true
            })
            .collect();

        // Union filtered + replacements
        let mut union = filtered;
        for rc in &replace_classes {
            if !union.contains(rc) {
                union.push(rc.clone());
            }
        }
        merged.css_class = Some(CssClassValue::Multiple(union));

        // Track accumulated replacements
        let mut lower_replace = normalize_css_class(&merged.css_class_replace);
        for rc in &replace_classes {
            if !lower_replace.contains(rc) {
                lower_replace.push(rc.clone());
            }
        }
        merged.css_class_replace = Some(CssClassValue::Multiple(lower_replace));
    }

    // cssClass: union across cascade levels
    let lower_classes = normalize_css_class(&merged.css_class);
    let higher_classes = normalize_css_class(&higher.css_class);
    if !higher_classes.is_empty() {
        let mut union = lower_classes;
        for hc in &higher_classes {
            if !union.contains(hc) {
                union.push(hc.clone());
            }
        }
        merged.css_class = Some(CssClassValue::Multiple(union));
    }

    // Replace-as-whole for nested objects per spec SS5.5:
    // "Nested objects (widgetConfig, style, accessibility) are replaced as a whole,
    // not deep-merged. This avoids the complexity of recursive merge semantics."
    if higher.widget_config.is_some() {
        merged.widget_config = higher.widget_config.clone();
    }

    if higher.style.is_some() {
        merged.style = higher.style.clone();
    }

    if higher.accessibility.is_some() {
        merged.accessibility = higher.accessibility.clone();
    }

    merged
}

/// Check if a selector matches an item descriptor.
fn selector_matches(m: &SelectorMatch, item: &ItemDescriptor) -> bool {
    if m.r#type.is_none() && m.data_type.is_none() {
        return false;
    }
    if let Some(ref t) = m.r#type {
        if *t != item.item_type {
            return false;
        }
    }
    if let Some(ref dt) = m.data_type {
        if Some(*dt) != item.data_type {
            return false;
        }
    }
    true
}

/// Resolve the effective PresentationBlock for a single item.
/// Implements the 6-level cascade per Theme spec SS5.5:
///
/// -2. Renderer defaults (optional)
/// -1. Tier 1 form-wide presentation hints
///  0. Tier 1 per-item presentation hints
///  1. Theme defaults
///  2. Theme selectors (document order)
///  3. Theme items\[key\] (highest)
///
/// `"none"` sentinel suppresses inherited `widget` and `labelPosition` (SS5.6).
pub fn resolve_presentation(
    theme: Option<&ThemeDocument>,
    item: &ItemDescriptor,
    tier1: Option<&Tier1Hints>,
    renderer_defaults: Option<&PresentationBlock>,
) -> PresentationBlock {
    let mut result = PresentationBlock::default();

    // Level -2: Renderer defaults
    if let Some(rd) = renderer_defaults {
        result = merge_blocks(&result, rd);
    }

    // Level -1: Tier 1 form-wide hints
    if let Some(t1) = tier1 {
        if let Some(ref fp) = t1.form_presentation {
            if let Some(lp) = fp.label_position {
                let mut fp_block = PresentationBlock::default();
                fp_block.label_position = Some(lp);
                result = merge_blocks(&result, &fp_block);
            }
        }
    }

    // Level 0: Tier 1 per-item hints
    if let Some(t1) = tier1 {
        if let Some(ref ip) = t1.item_presentation {
            if let Some(ref wh) = ip.widget_hint {
                let mut ip_block = PresentationBlock::default();
                ip_block.widget = Some(wh.clone());
                result = merge_blocks(&result, &ip_block);
            }
        }
    }

    let theme = match theme {
        Some(t) => t,
        None => {
            apply_none_sentinel(&mut result);
            return result;
        }
    };

    // Level 1: Theme defaults
    if let Some(ref defaults) = theme.defaults {
        result = merge_blocks(&result, defaults);
    }

    // Level 2: Theme selectors (all matching, document order)
    if let Some(ref selectors) = theme.selectors {
        for selector in selectors {
            if selector_matches(&selector.r#match, item) {
                result = merge_blocks(&result, &selector.apply);
            }
        }
    }

    // Level 3: Theme items[key]
    if let Some(ref items) = theme.items {
        if let Some(item_val) = items.get(&item.key) {
            if let Ok(item_block) = serde_json::from_value::<PresentationBlock>(item_val.clone()) {
                result = merge_blocks(&result, &item_block);
            }
        }
    }

    // Post-process: apply classStrategy if configured
    if let Some(ClassStrategy::TailwindMerge) = theme.class_strategy {
        // In Rust, we implement prefix-based dedup natively (no JS callback).
        // For now, just pass through — full tailwind-merge is done by injected function.
    }

    // Check extensions for x-classStrategy
    if theme.class_strategy.is_none() {
        if let Some(ref exts) = theme.extensions {
            if let Some(val) = exts.get("x-classStrategy") {
                if val.as_str() == Some("tailwind-merge") {
                    // Prefix-based native dedup would go here
                }
            }
        }
    }

    // Strip internal cssClassReplace from final output
    result.css_class_replace = None;

    // Apply "none" sentinel
    apply_none_sentinel(&mut result);

    result
}

/// "none" sentinel suppresses inherited widget and labelPosition (SS5.6).
fn apply_none_sentinel(block: &mut PresentationBlock) {
    if block.widget.as_deref() == Some("none") {
        block.widget = None;
    }
    if block.label_position == Some(LabelPosition::LabelNone) {
        block.label_position = None;
    }
}

