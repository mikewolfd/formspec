//! Responsive prop resolution — cumulative ascending breakpoint merge.

use serde_json::{Map, Value};

/// Structural keys forbidden in responsive overrides per Component spec SS9.4.
const RESPONSIVE_FORBIDDEN_KEYS: &[&str] = &[
    "component", "children", "bind", "when", "responsive", "minWidth",
];

/// Resolve responsive overrides on a component Value.
///
/// Per spec, responsive overrides are cumulative ascending: all breakpoints
/// where `minWidth <= viewport_width` are applied in ascending `minWidth` order.
/// Each matching breakpoint's properties are shallow-merged onto the component.
/// Structural keys (`component`, `children`, `bind`, `when`, `responsive`) are
/// forbidden in overrides per SS9.4 and silently dropped.
///
/// Returns a new Value with responsive overrides applied (the `responsive` key is removed).
pub fn resolve_responsive_props(
    component: &Value,
    viewport_width: u32,
    _breakpoints: Option<&Map<String, Value>>,
) -> Value {
    let obj = match component.as_object() {
        Some(o) => o,
        None => return component.clone(),
    };

    let responsive = match obj.get("responsive") {
        Some(Value::Object(r)) => r,
        _ => return component.clone(),
    };

    // Collect breakpoints with their minWidth values
    let mut entries: Vec<(u32, &Map<String, Value>)> = Vec::new();
    for (_name, bp_val) in responsive {
        if let Some(bp_obj) = bp_val.as_object() {
            let min_width = bp_obj
                .get("minWidth")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as u32;
            if min_width <= viewport_width {
                entries.push((min_width, bp_obj));
            }
        }
    }

    // Sort ascending by minWidth for cumulative merge
    entries.sort_by_key(|(mw, _)| *mw);

    // Start with the base component (without `responsive`)
    let mut result = obj.clone();
    result.remove("responsive");

    // Merge each matching breakpoint's props (dropping forbidden structural keys)
    for (_min_width, bp_obj) in entries {
        for (key, val) in bp_obj {
            if RESPONSIVE_FORBIDDEN_KEYS.contains(&key.as_str()) {
                continue;
            }
            result.insert(key.clone(), val.clone());
        }
    }

    Value::Object(result)
}
