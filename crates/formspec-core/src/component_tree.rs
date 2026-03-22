//! Pre-order traversal for component/theme JSON nodes (`component` + `children`).

use serde_json::Value;

/// Visit each object node that has a string `component` field, then recurse into `children`.
///
/// `child_path(parent, index)` selects JSON Pointer (`/tree/children/0`) vs JSONPath-style
/// (`$.tree.children[0]`) paths for diagnostics.
pub fn visit_component_subtree<F>(
    node: &Value,
    path: &str,
    child_path: &F,
    visit: &mut impl FnMut(&Value, &str),
) where
    F: Fn(&str, usize) -> String,
{
    let Some(obj) = node.as_object() else {
        return;
    };
    if obj.get("component").and_then(Value::as_str).is_none() {
        return;
    }

    visit(node, path);

    let Some(children) = obj.get("children").and_then(Value::as_array) else {
        return;
    };
    for (i, child) in children.iter().enumerate() {
        let cpath = child_path(path, i);
        visit_component_subtree(child, &cpath, child_path, visit);
    }
}
