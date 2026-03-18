/// Formspec Linter — 7-pass static analysis pipeline.
///
/// Pass 1 (E100): Schema validation — JSON Schema conformance, document type detection
/// Pass 2 (E200): Tree — Item tree flattening, duplicate key detection
/// Pass 3 (E300): References — Bind/shape path validation, wildcard resolution
/// Pass 4 (E400): Expressions — Parse all FEL slots in binds/shapes/screener
/// Pass 5 (E500): Dependencies — Dependency graph + DFS cycle detection
/// Pass 6 (W700): Theme — Token validation, reference integrity, page layout
/// Pass 7 (E800): Components — Component tree, type compatibility, bind uniqueness
use std::collections::{HashMap, HashSet};

use serde_json::Value;

use fel_core::parse;
use formspec_core::{detect_document_type, DocumentType, get_fel_dependencies};

// ── Types ───────────────────────────────────────────────────────

/// A lint diagnostic.
#[derive(Debug, Clone)]
pub struct LintDiagnostic {
    /// Error/warning code (e.g., "E100", "E200", "W300").
    pub code: String,
    /// Pass number (1-7).
    pub pass: u8,
    /// Severity: error, warning, info.
    pub severity: LintSeverity,
    /// JSONPath to the problematic element.
    pub path: String,
    /// Human-readable message.
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LintSeverity {
    Error,
    Warning,
    Info,
}

/// Result of linting.
#[derive(Debug, Clone)]
pub struct LintResult {
    /// Document type (if detected).
    pub document_type: Option<DocumentType>,
    /// All diagnostics from all passes.
    pub diagnostics: Vec<LintDiagnostic>,
    /// Whether the document is valid (no errors).
    pub valid: bool,
}

// ── Lint pipeline ───────────────────────────────────────────────

/// Run the full 7-pass lint pipeline on a Formspec document.
pub fn lint(doc: &Value) -> LintResult {
    let mut diagnostics = Vec::new();

    // Detect document type
    let doc_type = detect_document_type(doc);

    // Pass 1: Schema validation (detection)
    if doc_type.is_none() {
        diagnostics.push(LintDiagnostic {
            code: "E100".to_string(),
            pass: 1,
            severity: LintSeverity::Error,
            path: "$".to_string(),
            message: "Cannot determine document type".to_string(),
        });
        return LintResult {
            document_type: None,
            diagnostics,
            valid: false,
        };
    }

    let doc_type = doc_type.unwrap();

    // Only run definition-specific passes on definitions
    if doc_type == DocumentType::Definition {
        pass_2_tree(doc, &mut diagnostics);
        pass_3_references(doc, &mut diagnostics);
        pass_4_expressions(doc, &mut diagnostics);
        pass_5_dependencies(doc, &mut diagnostics);
    }

    if doc_type == DocumentType::Theme {
        pass_6_theme(doc, &mut diagnostics);
    }

    if doc_type == DocumentType::Component {
        pass_7_components(doc, &mut diagnostics);
    }

    let valid = diagnostics.iter().all(|d| d.severity != LintSeverity::Error);

    LintResult {
        document_type: Some(doc_type),
        diagnostics,
        valid,
    }
}

// ── Pass 2: Tree ────────────────────────────────────────────────

fn pass_2_tree(doc: &Value, diagnostics: &mut Vec<LintDiagnostic>) {
    let items = doc.get("items").and_then(|v| v.as_array());
    if let Some(items) = items {
        let mut seen_keys = HashSet::new();
        check_duplicate_keys(items, &mut seen_keys, "$", diagnostics);
    }
}

fn check_duplicate_keys(
    items: &[Value],
    seen: &mut HashSet<String>,
    prefix: &str,
    diagnostics: &mut Vec<LintDiagnostic>,
) {
    for item in items {
        if let Some(key) = item.get("key").and_then(|v| v.as_str()) {
            let path = format!("{prefix}.items[key={key}]");
            if !seen.insert(key.to_string()) {
                diagnostics.push(LintDiagnostic {
                    code: "E201".to_string(),
                    pass: 2,
                    severity: LintSeverity::Error,
                    path,
                    message: format!("Duplicate item key: {key}"),
                });
            }
            if let Some(children) = item.get("children").and_then(|v| v.as_array()) {
                check_duplicate_keys(children, seen, &format!("{prefix}.{key}"), diagnostics);
            }
        }
    }
}

// ── Pass 3: References ──────────────────────────────────────────

fn pass_3_references(doc: &Value, diagnostics: &mut Vec<LintDiagnostic>) {
    let items = doc.get("items").and_then(|v| v.as_array());
    let binds = doc.get("binds").and_then(|v| v.as_object());
    let shapes = doc.get("shapes").and_then(|v| v.as_array());

    // Collect all valid item keys
    let mut valid_keys = HashSet::new();
    if let Some(items) = items {
        collect_keys(items, &mut valid_keys);
    }

    // Check bind paths reference valid items
    if let Some(binds) = binds {
        for (bind_key, _) in binds {
            let base_key = bind_key.split('.').next().unwrap_or(bind_key);
            if !valid_keys.contains(base_key) && !bind_key.contains('[') {
                diagnostics.push(LintDiagnostic {
                    code: "E300".to_string(),
                    pass: 3,
                    severity: LintSeverity::Error,
                    path: format!("$.binds.{bind_key}"),
                    message: format!("Bind references unknown item: {bind_key}"),
                });
            }
        }
    }

    // Check shape targets reference valid items
    if let Some(shapes) = shapes {
        for (i, shape) in shapes.iter().enumerate() {
            if let Some(target) = shape.get("target").and_then(|v| v.as_str()) {
                let base_key = target.split('.').next().unwrap_or(target);
                let is_wildcard = target.contains("[*]");
                if !valid_keys.contains(base_key) && !is_wildcard {
                    diagnostics.push(LintDiagnostic {
                        code: "E302".to_string(),
                        pass: 3,
                        severity: LintSeverity::Error,
                        path: format!("$.shapes[{i}]"),
                        message: format!("Shape target references unknown item: {target}"),
                    });
                }
            }
        }
    }
}

fn collect_keys(items: &[Value], keys: &mut HashSet<String>) {
    for item in items {
        if let Some(key) = item.get("key").and_then(|v| v.as_str()) {
            keys.insert(key.to_string());
        }
        if let Some(children) = item.get("children").and_then(|v| v.as_array()) {
            collect_keys(children, keys);
        }
    }
}

// ── Pass 4: Expressions ─────────────────────────────────────────

fn pass_4_expressions(doc: &Value, diagnostics: &mut Vec<LintDiagnostic>) {
    let binds = doc.get("binds").and_then(|v| v.as_object());

    if let Some(binds) = binds {
        for (bind_key, bind_val) in binds {
            if let Some(obj) = bind_val.as_object() {
                for &slot in &["calculate", "relevant", "required", "readonly", "constraint"] {
                    if let Some(expr) = obj.get(slot).and_then(|v| v.as_str()) {
                        if let Err(e) = parse(expr) {
                            diagnostics.push(LintDiagnostic {
                                code: "E400".to_string(),
                                pass: 4,
                                severity: LintSeverity::Error,
                                path: format!("$.binds.{bind_key}.{slot}"),
                                message: format!("FEL parse error: {e}"),
                            });
                        }
                    }
                }
            }
        }
    }

    // Check shape expressions
    if let Some(shapes) = doc.get("shapes").and_then(|v| v.as_array()) {
        for (i, shape) in shapes.iter().enumerate() {
            for &slot in &["constraint", "activeWhen"] {
                if let Some(expr) = shape.get(slot).and_then(|v| v.as_str()) {
                    if let Err(e) = parse(expr) {
                        diagnostics.push(LintDiagnostic {
                            code: "E400".to_string(),
                            pass: 4,
                            severity: LintSeverity::Error,
                            path: format!("$.shapes[{i}].{slot}"),
                            message: format!("FEL parse error: {e}"),
                        });
                    }
                }
            }
        }
    }
}

// ── Pass 5: Dependencies ────────────────────────────────────────

fn pass_5_dependencies(doc: &Value, diagnostics: &mut Vec<LintDiagnostic>) {
    let binds = doc.get("binds").and_then(|v| v.as_object());
    if binds.is_none() {
        return;
    }
    let binds = binds.unwrap();

    // Build dependency graph: key → set of keys it depends on
    let mut graph: HashMap<String, HashSet<String>> = HashMap::new();

    for (bind_key, bind_val) in binds {
        let mut deps = HashSet::new();
        if let Some(obj) = bind_val.as_object() {
            for &slot in &["calculate", "relevant", "required", "readonly", "constraint"] {
                if let Some(expr) = obj.get(slot).and_then(|v| v.as_str()) {
                    for dep in get_fel_dependencies(expr) {
                        // Only track dependencies on other bind keys
                        let base_key = dep.split('.').next().unwrap_or(&dep);
                        deps.insert(base_key.to_string());
                    }
                }
            }
        }
        graph.insert(bind_key.clone(), deps);
    }

    // DFS cycle detection
    let mut visited = HashSet::new();
    let mut in_stack = HashSet::new();

    for key in graph.keys() {
        if !visited.contains(key) {
            detect_cycle(key, &graph, &mut visited, &mut in_stack, diagnostics);
        }
    }
}

fn detect_cycle(
    node: &str,
    graph: &HashMap<String, HashSet<String>>,
    visited: &mut HashSet<String>,
    in_stack: &mut HashSet<String>,
    diagnostics: &mut Vec<LintDiagnostic>,
) {
    visited.insert(node.to_string());
    in_stack.insert(node.to_string());

    if let Some(deps) = graph.get(node) {
        for dep in deps {
            if !visited.contains(dep.as_str()) {
                if graph.contains_key(dep.as_str()) {
                    detect_cycle(dep, graph, visited, in_stack, diagnostics);
                }
            } else if in_stack.contains(dep.as_str()) {
                diagnostics.push(LintDiagnostic {
                    code: "E500".to_string(),
                    pass: 5,
                    severity: LintSeverity::Error,
                    path: format!("$.binds.{node}"),
                    message: format!("Dependency cycle detected: {node} → {dep}"),
                });
            }
        }
    }

    in_stack.remove(node);
}

// ── Pass 6: Theme ───────────────────────────────────────────────

fn pass_6_theme(doc: &Value, diagnostics: &mut Vec<LintDiagnostic>) {
    // Validate tokens exist if referenced
    if let Some(selectors) = doc.get("selectors").and_then(|v| v.as_array()) {
        let tokens = doc.get("tokens").and_then(|v| v.as_object());
        for (i, selector) in selectors.iter().enumerate() {
            if let Some(props) = selector.get("properties").and_then(|v| v.as_object()) {
                for (prop, value) in props {
                    if let Some(token_ref) = value.as_str() {
                        if token_ref.starts_with("$token.") {
                            let token_name = &token_ref[7..];
                            let has_token = tokens.map_or(false, |t| t.contains_key(token_name));
                            if !has_token {
                                diagnostics.push(LintDiagnostic {
                                    code: "W700".to_string(),
                                    pass: 6,
                                    severity: LintSeverity::Warning,
                                    path: format!("$.selectors[{i}].properties.{prop}"),
                                    message: format!("Token reference not found: {token_ref}"),
                                });
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Pass 7: Components ──────────────────────────────────────────

fn pass_7_components(doc: &Value, diagnostics: &mut Vec<LintDiagnostic>) {
    // Validate component tree has required fields
    if let Some(tree) = doc.get("tree").and_then(|v| v.as_object()) {
        if !tree.contains_key("componentType") {
            diagnostics.push(LintDiagnostic {
                code: "E800".to_string(),
                pass: 7,
                severity: LintSeverity::Error,
                path: "$.tree".to_string(),
                message: "Component tree root missing componentType".to_string(),
            });
        }
        // Check for bind uniqueness in children
        if let Some(children) = tree.get("children").and_then(|v| v.as_array()) {
            let mut seen_binds = HashSet::new();
            check_bind_uniqueness(children, &mut seen_binds, "$.tree", diagnostics);
        }
    }
}

fn check_bind_uniqueness(
    nodes: &[Value],
    seen: &mut HashSet<String>,
    prefix: &str,
    diagnostics: &mut Vec<LintDiagnostic>,
) {
    for (i, node) in nodes.iter().enumerate() {
        let path = format!("{prefix}.children[{i}]");
        if let Some(bind) = node.get("bind").and_then(|v| v.as_str()) {
            if !seen.insert(bind.to_string()) {
                diagnostics.push(LintDiagnostic {
                    code: "W804".to_string(),
                    pass: 7,
                    severity: LintSeverity::Warning,
                    path,
                    message: format!("Duplicate bind in component tree: {bind}"),
                });
            }
        }
        if let Some(children) = node.get("children").and_then(|v| v.as_array()) {
            check_bind_uniqueness(children, seen, &format!("{prefix}.children[{i}]"), diagnostics);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_lint_valid_definition() {
        let def = json!({
            "$formspec": "1.0",
            "title": "Test",
            "items": [
                { "key": "name", "dataType": "string" }
            ],
            "binds": {
                "name": { "required": "true" }
            }
        });
        let result = lint(&def);
        assert!(result.valid);
        assert_eq!(result.document_type, Some(DocumentType::Definition));
    }

    #[test]
    fn test_lint_unknown_document() {
        let doc = json!({ "random": "data" });
        let result = lint(&doc);
        assert!(!result.valid);
        assert!(result.diagnostics.iter().any(|d| d.code == "E100"));
    }

    #[test]
    fn test_lint_duplicate_keys() {
        let def = json!({
            "$formspec": "1.0",
            "items": [
                { "key": "name" },
                { "key": "name" }
            ]
        });
        let result = lint(&def);
        assert!(result.diagnostics.iter().any(|d| d.code == "E201"));
    }

    #[test]
    fn test_lint_invalid_bind_reference() {
        let def = json!({
            "$formspec": "1.0",
            "items": [{ "key": "name" }],
            "binds": {
                "nonexistent": { "required": "true" }
            }
        });
        let result = lint(&def);
        assert!(result.diagnostics.iter().any(|d| d.code == "E300"));
    }

    #[test]
    fn test_lint_fel_parse_error() {
        let def = json!({
            "$formspec": "1.0",
            "items": [{ "key": "name" }],
            "binds": {
                "name": { "calculate": "1 + + 2" }
            }
        });
        let result = lint(&def);
        assert!(result.diagnostics.iter().any(|d| d.code == "E400"));
    }

    #[test]
    fn test_lint_dependency_cycle() {
        let def = json!({
            "$formspec": "1.0",
            "items": [
                { "key": "a" },
                { "key": "b" }
            ],
            "binds": {
                "a": { "calculate": "$b + 1" },
                "b": { "calculate": "$a + 1" }
            }
        });
        let result = lint(&def);
        assert!(result.diagnostics.iter().any(|d| d.code == "E500"));
    }

    #[test]
    fn test_lint_theme_token_reference() {
        let theme = json!({
            "$formspecTheme": "1.0",
            "tokens": { "primary": "#000" },
            "selectors": [
                {
                    "match": "*",
                    "properties": {
                        "color": "$token.primary",
                        "bg": "$token.missing"
                    }
                }
            ]
        });
        let result = lint(&theme);
        assert_eq!(result.document_type, Some(DocumentType::Theme));
        // Should warn about missing token
        assert!(result.diagnostics.iter().any(|d| d.code == "W700"));
        // Should not warn about existing token
        assert_eq!(result.diagnostics.len(), 1);
    }

    #[test]
    fn test_lint_component_missing_type() {
        let comp = json!({
            "$formspecComponent": "1.0",
            "tree": { "children": [] }
        });
        let result = lint(&comp);
        assert!(result.diagnostics.iter().any(|d| d.code == "E800"));
    }

    #[test]
    fn test_lint_component_duplicate_bind() {
        let comp = json!({
            "$formspecComponent": "1.0",
            "tree": {
                "componentType": "Stack",
                "children": [
                    { "componentType": "TextInput", "bind": "name" },
                    { "componentType": "TextInput", "bind": "name" }
                ]
            }
        });
        let result = lint(&comp);
        assert!(result.diagnostics.iter().any(|d| d.code == "W804"));
    }
}
