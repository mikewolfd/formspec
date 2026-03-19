//! Formspec Linter — 7-pass static analysis and validation pipeline.
//!
//! Pass 1 (E100): Document type detection
//! Pass 2 (E200/E201): Tree indexing, duplicate key/path detection
//! Pass 3 (E300/E301/E302/W300): Reference validation — bind paths, shape targets, optionSets
//! Pass 3b (E600/E601/E602): Extension resolution against registry documents
//! Pass 4 (E400): FEL expression compilation
//! Pass 5 (E500): Dependency cycle detection
//! Pass 6 (W700-W711/E710): Theme — token validation, reference integrity, page semantics
//! Pass 7 (E800-E807/W800-W804): Components — tree validation, type compatibility, bind resolution

mod types;

pub mod component_matrix;
pub mod tree;
pub mod expressions;
pub mod dependencies;
pub mod references;
pub mod extensions;
pub mod pass_theme;
pub mod pass_component;

use serde_json::Value;

use formspec_core::{detect_document_type, DocumentType};

// Re-export public types
pub use types::{
    sort_diagnostics, LintDiagnostic, LintMode, LintOptions, LintResult, LintSeverity,
};

// ── Lint pipeline ───────────────────────────────────────────────

/// Run the full lint pipeline on a Formspec document with default options.
pub fn lint(doc: &Value) -> LintResult {
    lint_with_options(doc, &LintOptions::default())
}

/// Run the full lint pipeline with explicit options.
pub fn lint_with_options(doc: &Value, options: &LintOptions) -> LintResult {
    let mut diagnostics = Vec::new();

    // ── Pass 1: Document type detection ─────────────────────────
    let doc_type = detect_document_type(doc);

    if doc_type.is_none() {
        diagnostics.push(LintDiagnostic::error("E100", 1, "$", "Cannot determine document type"));
        return LintResult { document_type: None, diagnostics, valid: false };
    }

    let doc_type = doc_type.unwrap();

    // ── Definition passes (2–5) ─────────────────────────────────
    if doc_type == DocumentType::Definition {
        // Pass 2: Tree indexing (E200/E201)
        let mut tree_index = tree::build_item_index(doc);
        diagnostics.append(&mut tree_index.diagnostics);

        // Pass gating: stop if structural errors exist from pass 2
        if diagnostics.iter().any(|d| d.severity == LintSeverity::Error) {
            sort_diagnostics(&mut diagnostics);
            diagnostics.retain(|d| !d.suppressed_in(options.mode));
            return LintResult { document_type: Some(doc_type), diagnostics, valid: false };
        }

        // Pass 3: Reference validation (E300/E301/E302/W300)
        diagnostics.extend(references::check_references(doc, &tree_index));

        // Pass 3b: Extension resolution (E600/E601/E602)
        diagnostics.extend(extensions::check_extensions(doc, &options.registry_documents));

        // Pass 4: Expression compilation (E400)
        let compilation = expressions::compile_expressions(doc);
        diagnostics.extend(compilation.diagnostics);

        // Pass 5: Dependency cycle detection (E500)
        diagnostics.extend(dependencies::analyze_dependencies(&compilation.compiled));
    }

    // ── Theme pass (6) ──────────────────────────────────────────
    if doc_type == DocumentType::Theme {
        diagnostics.extend(pass_theme::lint_theme(doc, options.definition_document.as_ref()));
    }

    // ── Component pass (7) ──────────────────────────────────────
    if doc_type == DocumentType::Component {
        diagnostics.extend(pass_component::lint_component(doc, options.definition_document.as_ref()));
    }

    // Sort and filter
    sort_diagnostics(&mut diagnostics);
    diagnostics.retain(|d| !d.suppressed_in(options.mode));

    let valid = diagnostics.iter().all(|d| d.severity != LintSeverity::Error);
    LintResult { document_type: Some(doc_type), diagnostics, valid }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    // ── Integration tests ──────────────────────────────────────────
    //
    // These tests exercise the full `lint()` / `lint_with_options()` pipeline.
    // Each one verifies cross-pass behaviour that module-level unit tests
    // cannot: document-type routing, pass gating, diagnostic sorting/filtering,
    // lint-mode suppression, and multi-pass diagnostic merging.
    //
    // Single-pass behaviour (E302, W300, E301, wildcard binds, extension
    // details) is tested exhaustively in the per-module tests. Duplicating
    // those here would add maintenance cost without additional confidence.

    /// Spec: spec.md §2.1 — "$formspec" key identifies a valid definition document
    #[test]
    fn valid_definition_passes_all_passes() {
        let def = json!({
            "$formspec": "1.0",
            "title": "Test",
            "items": [{ "key": "name", "dataType": "string" }],
            "binds": { "name": { "required": "true" } }
        });
        let result = lint(&def);
        assert!(result.valid);
        assert_eq!(result.document_type, Some(DocumentType::Definition));
    }

    /// Spec: spec.md §2.1 — unrecognized document types emit E100 and halt
    #[test]
    fn unknown_document_emits_e100_and_halts() {
        let doc = json!({ "random": "data" });
        let result = lint(&doc);
        assert!(!result.valid);
        assert!(result.diagnostics.iter().any(|d| d.code == "E100"));
        assert_eq!(result.diagnostics.len(), 1, "Should halt after E100");
    }

    /// Spec: spec.md §7.2 — structural errors in pass 2 prevent passes 3-5
    #[test]
    fn pass_gating_stops_on_structural_errors() {
        let def = json!({
            "$formspec": "1.0",
            "items": [{ "key": "name" }, { "key": "name" }],
            "binds": {
                "nonexistent": { "required": "true" },
                "name": { "calculate": "invalid ++" }
            }
        });
        let result = lint(&def);
        assert!(result.diagnostics.iter().any(|d| d.code == "E201"));
        assert_eq!(
            result.diagnostics.iter().filter(|d| d.pass >= 3).count(), 0,
            "No diagnostics from pass 3+ when pass 2 has structural errors"
        );
    }

    /// Spec: spec.md §7 — diagnostics sorted by (pass, severity, path)
    #[test]
    fn diagnostic_sorting_uses_lexicographic_tuple() {
        let def = json!({
            "$formspec": "1.0",
            "items": [
                { "key": "name", "dataType": "string" },
                { "key": "color", "dataType": "boolean", "optionSet": "missing_set" }
            ],
            "binds": { "name": { "calculate": "invalid ++" } }
        });
        let result = lint(&def);
        assert!(result.diagnostics.len() >= 2);
        for window in result.diagnostics.windows(2) {
            let (a, b) = (&window[0], &window[1]);
            assert!(
                (a.pass, a.severity, &a.path) <= (b.pass, b.severity, &b.path),
                "Diagnostics not sorted: ({}, {:?}, {}) should come before ({}, {:?}, {})",
                a.pass, a.severity, a.path, b.pass, b.severity, b.path,
            );
        }
    }

    /// Spec: spec.md §7 — LintMode::Authoring suppresses W300 and W802
    #[test]
    fn lint_mode_authoring_suppresses_w300() {
        let def = json!({
            "$formspec": "1.0",
            "items": [{ "key": "f", "dataType": "boolean", "optionSet": "opts" }],
            "optionSets": { "opts": { "options": [{ "value": "yes" }] } }
        });
        let rt = lint_with_options(&def, &LintOptions { mode: LintMode::Runtime, ..Default::default() });
        assert_eq!(rt.diagnostics.iter().filter(|d| d.code == "W300").count(), 1);
        let auth = lint_with_options(&def, &LintOptions { mode: LintMode::Authoring, ..Default::default() });
        assert_eq!(auth.diagnostics.iter().filter(|d| d.code == "W300").count(), 0);
    }

    /// Spec: spec.md §9 — screener integration spans passes 3+4
    #[test]
    fn screener_integration_spans_passes() {
        let def = json!({
            "$formspec": "1.0",
            "items": [{ "key": "age", "dataType": "integer" }],
            "screener": {
                "routes": [
                    { "condition": "$age >= 18", "target": "adult" },
                    { "condition": "invalid ++ expr", "target": "error" }
                ]
            }
        });
        let result = lint(&def);
        let e400 = result.diagnostics.iter()
            .filter(|d| d.code == "E400" && d.path.contains("screener"))
            .collect::<Vec<_>>();
        assert_eq!(e400.len(), 1);
        assert!(e400[0].path.contains("routes[1]"));
    }

    /// Spec: extension-registry.md §3 — extension resolution via registry documents
    #[test]
    fn extension_resolution_cross_pass_integration() {
        let def = json!({
            "$formspec": "1.0",
            "items": [{
                "key": "email", "dataType": "string",
                "extensions": { "x-formspec-url": true, "x-unknown-ext": true }
            }]
        });
        let registry = json!({ "entries": [{ "name": "x-formspec-url", "status": "active" }] });
        let result = lint_with_options(&def, &LintOptions {
            registry_documents: vec![registry], ..Default::default()
        });
        let e600 = result.diagnostics.iter().filter(|d| d.code == "E600").collect::<Vec<_>>();
        assert_eq!(e600.len(), 1);
        assert!(e600[0].message.contains("x-unknown-ext"));
    }

    /// Spec: extension-registry.md §3 — no registries means no extension checking
    #[test]
    fn no_registries_skips_extension_pass() {
        let def = json!({
            "$formspec": "1.0",
            "items": [{ "key": "e", "extensions": { "x-formspec-url": true } }]
        });
        let result = lint(&def);
        assert_eq!(result.diagnostics.iter().filter(|d| d.code == "E600").count(), 0);
    }

    /// Spec: theme-spec.md §1 — "$formspecTheme" routes to pass 6
    #[test]
    fn theme_document_routes_to_pass_6() {
        let theme = json!({
            "$formspecTheme": "1.0",
            "tokens": { "primary": "#000" },
            "selectors": [{
                "match": "*",
                "properties": { "color": "$token.primary", "bg": "$token.missing" }
            }]
        });
        let result = lint(&theme);
        assert_eq!(result.document_type, Some(DocumentType::Theme));
        assert!(result.diagnostics.iter().any(|d| d.code == "W704"));
        assert_eq!(result.diagnostics.len(), 1);
    }

    /// Spec: component-spec.md §1 — "$formspecComponent" routes to pass 7
    #[test]
    fn component_document_routes_to_pass_7() {
        let comp = json!({ "$formspecComponent": "1.0", "tree": { "children": [] } });
        let result = lint(&comp);
        assert_eq!(result.document_type, Some(DocumentType::Component));
        assert!(result.diagnostics.iter().any(|d| d.code == "E800"));
    }

    /// Cross-pass integration: definition with errors across passes 3, 4, and 5
    /// verifies that all passes run and diagnostics merge correctly.
    #[test]
    fn multi_pass_definition_collects_all_diagnostics() {
        let def = json!({
            "$formspec": "1.0",
            "items": [{ "key": "a" }, { "key": "b" }],
            "binds": {
                "ghost": { "required": "true" },
                "a": { "calculate": "$b + 1" },
                "b": { "calculate": "$a + 1" }
            },
            "shapes": [{ "target": "phantom", "constraint": "true" }]
        });
        let result = lint(&def);
        assert!(result.diagnostics.iter().any(|d| d.code == "E300"), "Should have E300");
        assert!(result.diagnostics.iter().any(|d| d.code == "E301"), "Should have E301");
        assert!(result.diagnostics.iter().any(|d| d.code == "E500"), "Should have E500");
        // Verify monotonic pass ordering
        let passes: Vec<u8> = result.diagnostics.iter().map(|d| d.pass).collect();
        for w in passes.windows(2) {
            assert!(w[0] <= w[1], "Passes should be non-decreasing");
        }
    }
}
