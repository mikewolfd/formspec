#[cfg(test)]
mod tests {
    use crate::convert::{category_str, parse_status_str, status_str};
    use formspec_core::changelog::{
        Change, ChangeImpact, ChangeTarget, ChangeType, Changelog, SemverImpact,
    };
    use formspec_core::extension_analysis::RegistryEntryStatus;
    use formspec_core::registry_client;
    use formspec_core::registry_client::registry_entry_count_from_raw;
    use formspec_core::runtime_mapping;
    use formspec_core::{JsonWireStyle, changelog_to_json_value};
    use formspec_core::{
        MappingDirection, parse_coerce_type, parse_mapping_direction_wire,
        parse_mapping_document_from_value as parse_mapping_document_inner,
        parse_mapping_rules_from_value as parse_mapping_rules_inner,
    };
    use serde_json::{Value, json};

    // ── parse_status_str ────────────────────────────────────────

    /// Spec: extension-registry.llm.md line 25 — lifecycle states: draft, stable, deprecated, retired
    /// "draft" maps to Draft variant.
    #[test]
    fn parse_status_str_draft() {
        assert_eq!(parse_status_str("draft"), Some(RegistryEntryStatus::Draft));
    }

    /// Spec: extension-registry.llm.md line 25 — "stable" is the canonical wire name for Active
    #[test]
    fn parse_status_str_stable() {
        assert_eq!(
            parse_status_str("stable"),
            Some(RegistryEntryStatus::Active)
        );
    }

    /// Spec: "active" is accepted as an alias for the Active/stable status.
    /// This is a binding-layer convenience — the spec uses "stable" but
    /// internal Rust enums use Active. Both wire names must resolve.
    #[test]
    fn parse_status_str_active_alias() {
        assert_eq!(
            parse_status_str("active"),
            Some(RegistryEntryStatus::Active)
        );
    }

    /// Spec: extension-registry.llm.md line 25 — "deprecated" maps to Deprecated
    #[test]
    fn parse_status_str_deprecated() {
        assert_eq!(
            parse_status_str("deprecated"),
            Some(RegistryEntryStatus::Deprecated)
        );
    }

    /// Spec: extension-registry.llm.md line 25 — "retired" maps to Retired
    #[test]
    fn parse_status_str_retired() {
        assert_eq!(
            parse_status_str("retired"),
            Some(RegistryEntryStatus::Retired)
        );
    }

    /// Boundary: unknown status strings must return None (not panic).
    #[test]
    fn parse_status_str_unknown_returns_none() {
        assert_eq!(parse_status_str("experimental"), None);
        assert_eq!(parse_status_str(""), None);
        assert_eq!(parse_status_str("Draft"), None); // case-sensitive
        assert_eq!(parse_status_str("STABLE"), None);
    }

    // ── status_str (reverse of parse_status_str) ────────────────

    /// Spec: extension-registry.llm.md line 25 — Draft emits "draft"
    #[test]
    fn status_str_draft() {
        assert_eq!(status_str(RegistryEntryStatus::Draft), "draft");
    }

    /// Spec: Active emits "stable" (NOT "active") — this is the canonical wire name.
    /// Asymmetry: parse_status_str("active") → Active, but status_str(Active) → "stable".
    #[test]
    fn status_str_active_emits_stable() {
        assert_eq!(status_str(RegistryEntryStatus::Active), "stable");
    }

    /// Spec: Deprecated emits "deprecated"
    #[test]
    fn status_str_deprecated() {
        assert_eq!(status_str(RegistryEntryStatus::Deprecated), "deprecated");
    }

    /// Spec: Retired emits "retired"
    #[test]
    fn status_str_retired() {
        assert_eq!(status_str(RegistryEntryStatus::Retired), "retired");
    }

    /// Correctness: round-trip parse→emit for all canonical wire names.
    /// Documents the "active"→"stable" asymmetry: parse("active") → Active → "stable".
    #[test]
    fn status_roundtrip_canonical_names() {
        for name in &["draft", "stable", "deprecated", "retired"] {
            let parsed = parse_status_str(name).expect(name);
            assert_eq!(status_str(parsed), *name, "round-trip failed for {name}");
        }
    }

    /// Correctness: the "active" alias does NOT round-trip — it normalizes to "stable".
    #[test]
    fn status_active_alias_normalizes_to_stable() {
        let parsed = parse_status_str("active").unwrap();
        assert_eq!(status_str(parsed), "stable");
    }

    // ── category_str ────────────────────────────────────────────

    /// Spec: extension-registry.llm.md — registry entry categories
    #[test]
    fn category_str_all_variants() {
        assert_eq!(
            category_str(registry_client::ExtensionCategory::DataType),
            "dataType"
        );
        assert_eq!(
            category_str(registry_client::ExtensionCategory::Function),
            "function"
        );
        assert_eq!(
            category_str(registry_client::ExtensionCategory::Constraint),
            "constraint"
        );
        assert_eq!(
            category_str(registry_client::ExtensionCategory::Property),
            "property"
        );
        assert_eq!(
            category_str(registry_client::ExtensionCategory::Namespace),
            "namespace"
        );
    }

    fn sample_changelog() -> Changelog {
        Changelog {
            definition_url: "https://example.com/def".to_string(),
            from_version: "1.0.0".to_string(),
            to_version: "1.0.1".to_string(),
            semver_impact: SemverImpact::Patch,
            changes: vec![Change {
                change_type: ChangeType::Added,
                target: ChangeTarget::Item,
                path: "items.0".to_string(),
                impact: ChangeImpact::Compatible,
                key: None,
                description: None,
                before: None,
                after: None,
                migration_hint: None,
            }],
        }
    }

    /// Spec: changelog JSON (Python snake) — top-level keys and change object strings
    #[test]
    fn changelog_to_json_python_snake_shape() {
        let v = changelog_to_json_value(&sample_changelog(), JsonWireStyle::PythonSnake);
        assert_eq!(v["definition_url"], json!("https://example.com/def"));
        assert_eq!(v["from_version"], json!("1.0.0"));
        assert_eq!(v["to_version"], json!("1.0.1"));
        assert_eq!(v["semver_impact"], json!("patch"));
        let changes = v["changes"].as_array().unwrap();
        let c0 = &changes[0];
        assert_eq!(c0["change_type"], json!("added"));
        assert_eq!(c0["target"], json!("item"));
        assert_eq!(c0["impact"], json!("compatible"));
    }

    /// Spec: changelog JSON (JS camel) — `type` key and camel top-level fields
    #[test]
    fn changelog_to_json_js_camel_shape() {
        let v = changelog_to_json_value(&sample_changelog(), JsonWireStyle::JsCamel);
        assert_eq!(v["definitionUrl"], json!("https://example.com/def"));
        assert_eq!(v["semverImpact"], json!("patch"));
        let changes = v["changes"].as_array().unwrap();
        assert_eq!(changes[0]["type"], json!("added"));
    }

    // ── parse_mapping_direction_wire ────────────────────────────

    /// Spec: mapping-spec.md §2 — forward mapping: Response → External
    #[test]
    fn parse_mapping_direction_wire_forward() {
        let dir = parse_mapping_direction_wire("forward").unwrap();
        assert!(matches!(dir, MappingDirection::Forward));
    }

    /// Spec: mapping-spec.md §2 — reverse mapping: External → Response
    #[test]
    fn parse_mapping_direction_wire_reverse() {
        let dir = parse_mapping_direction_wire("reverse").unwrap();
        assert!(matches!(dir, MappingDirection::Reverse));
    }

    #[test]
    fn parse_mapping_direction_wire_invalid() {
        assert!(parse_mapping_direction_wire("").is_err());
        assert!(parse_mapping_direction_wire("both").is_err());
        assert!(parse_mapping_direction_wire("Forward").is_err());
        assert!(parse_mapping_direction_wire("sideways").is_err());
    }

    // ── registry_entry_count ────────────────────────────────────

    /// Correctness: counts entries array length from a registry JSON value
    #[test]
    fn registry_entry_count_with_entries() {
        let val = json!({
            "entries": [
                {"name": "x-ext-a"},
                {"name": "x-ext-b"},
                {"name": "x-ext-c"}
            ]
        });
        assert_eq!(registry_entry_count_from_raw(&val), 3);
    }

    /// Boundary: missing "entries" key returns 0
    #[test]
    fn registry_entry_count_missing_key() {
        let val = json!({"publisher": {}});
        assert_eq!(registry_entry_count_from_raw(&val), 0);
    }

    /// Boundary: "entries" is not an array returns 0
    #[test]
    fn registry_entry_count_not_array() {
        let val = json!({"entries": "not an array"});
        assert_eq!(registry_entry_count_from_raw(&val), 0);
    }

    /// Boundary: empty entries array returns 0
    #[test]
    fn registry_entry_count_empty_array() {
        let val = json!({"entries": []});
        assert_eq!(registry_entry_count_from_raw(&val), 0);
    }

    // ── parse_mapping_rules ─────────────────────────────────────

    /// Spec: mapping-spec.md §3.3 — minimal preserve rule with defaults
    #[test]
    fn parse_mapping_rules_minimal_preserve() {
        let rules_json = json!([{
            "sourcePath": "name",
            "targetPath": "full_name",
            "transform": "preserve"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        assert_eq!(rules.len(), 1);
        assert_eq!(rules[0].source_path.as_deref(), Some("name"));
        assert_eq!(rules[0].target_path, "full_name");
        assert!(matches!(
            rules[0].transform,
            runtime_mapping::TransformType::Preserve
        ));
        // Defaults
        assert_eq!(rules[0].priority, 0);
        assert!(rules[0].reverse_priority.is_none());
        assert!(rules[0].default.is_none());
        assert!(rules[0].condition.is_none());
        assert!(rules[0].bidirectional); // default true per spec
    }

    /// Spec: mapping-spec.md — transform "drop" explicitly excludes a field
    #[test]
    fn parse_mapping_rules_drop_transform() {
        let rules_json = json!([{
            "sourcePath": "internal_id",
            "targetPath": "id",
            "transform": "drop"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        assert!(matches!(
            rules[0].transform,
            runtime_mapping::TransformType::Drop
        ));
    }

    /// Spec: mapping-spec.md — transform "constant" injects a literal value
    #[test]
    fn parse_mapping_rules_constant_transform() {
        let rules_json = json!([{
            "targetPath": "version",
            "transform": "constant",
            "expression": "1.0"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        // Constant transform maps to Expression to evaluate FEL at runtime
        match &rules[0].transform {
            runtime_mapping::TransformType::Expression(expr) => {
                assert_eq!(expr, "1.0");
            }
            other => panic!("expected Expression (from constant), got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — constant with no "value" key defaults to null
    /// Spec: mapping.schema.json — constant transform requires 'expression'
    #[test]
    fn parse_mapping_rules_constant_missing_expression_errors() {
        let rules_json = json!([{
            "targetPath": "cleared",
            "transform": "constant"
        }]);
        assert!(parse_mapping_rules_inner(&rules_json).is_err());
    }

    /// Spec: mapping-spec.md — coerce transform with each target type
    #[test]
    fn parse_mapping_rules_coerce_all_types() {
        let types_and_expected = [
            ("string", runtime_mapping::CoerceType::String),
            ("number", runtime_mapping::CoerceType::Number),
            ("integer", runtime_mapping::CoerceType::Integer),
            ("boolean", runtime_mapping::CoerceType::Boolean),
            ("date", runtime_mapping::CoerceType::Date),
            ("datetime", runtime_mapping::CoerceType::DateTime),
        ];
        for (coerce_str, expected) in &types_and_expected {
            let rules_json = json!([{
                "sourcePath": "val",
                "targetPath": "out",
                "transform": "coerce",
                "coerce": coerce_str
            }]);
            let rules = parse_mapping_rules_inner(&rules_json).unwrap();
            match &rules[0].transform {
                runtime_mapping::TransformType::Coerce(ct) => {
                    assert_eq!(ct, expected, "coerce type mismatch for '{coerce_str}'");
                }
                other => panic!("expected Coerce for '{coerce_str}', got {:?}", other),
            }
        }
    }

    /// Boundary: coerce with unknown type falls back to String
    /// Spec: mapping.schema.json — unknown coerce type is an error
    #[test]
    fn parse_mapping_rules_coerce_unknown_type_errors() {
        let rules_json = json!([{
            "sourcePath": "val",
            "targetPath": "out",
            "transform": "coerce",
            "coerce": "timestamp"
        }]);
        assert!(parse_mapping_rules_inner(&rules_json).is_err());
    }

    /// Spec: mapping-spec.md — expression transform with FEL expression
    #[test]
    fn parse_mapping_rules_expression_transform() {
        let rules_json = json!([{
            "sourcePath": "first",
            "targetPath": "greeting",
            "transform": "expression",
            "expression": "concat('Hello, ', $)"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Expression(expr) => {
                assert_eq!(expr, "concat('Hello, ', $)");
            }
            other => panic!("expected Expression, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — valueMap transform with lookup table
    #[test]
    fn parse_mapping_rules_value_map_transform() {
        let rules_json = json!([{
            "sourcePath": "status",
            "targetPath": "code",
            "transform": "valueMap",
            "valueMap": {
                "active": "A",
                "inactive": "I"
            }
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::ValueMap { forward, unmapped } => {
                assert_eq!(forward.len(), 2);
                assert!(matches!(
                    unmapped,
                    runtime_mapping::UnmappedStrategy::PassThrough
                ));
            }
            other => panic!("expected ValueMap, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — valueMap with unmapped: "error"
    #[test]
    fn parse_mapping_rules_value_map_unmapped_error() {
        let rules_json = json!([{
            "sourcePath": "status",
            "targetPath": "code",
            "transform": "valueMap",
            "valueMap": {"forward": {"yes": "Y"}, "unmapped": "error"}
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::ValueMap { unmapped, .. } => {
                assert!(matches!(unmapped, runtime_mapping::UnmappedStrategy::Error));
            }
            other => panic!("expected ValueMap with Error strategy, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — flatten transform with separator
    #[test]
    fn parse_mapping_rules_flatten_transform() {
        let rules_json = json!([{
            "sourcePath": "address",
            "targetPath": "address_flat",
            "transform": "flatten",
            "separator": "_"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Flatten { separator } => {
                assert_eq!(separator, "_");
            }
            other => panic!("expected Flatten, got {:?}", other),
        }
    }

    /// Boundary: flatten with no separator defaults to "" (arrays: positional keys; objects ignore it).
    #[test]
    fn parse_mapping_rules_flatten_default_separator() {
        let rules_json = json!([{
            "sourcePath": "address",
            "targetPath": "address_flat",
            "transform": "flatten"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Flatten { separator } => {
                assert_eq!(separator, "");
            }
            other => panic!("expected Flatten with default separator, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — nest transform (inverse of flatten)
    #[test]
    fn parse_mapping_rules_nest_transform() {
        let rules_json = json!([{
            "sourcePath": "address_flat",
            "targetPath": "address",
            "transform": "nest",
            "separator": "_"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Nest { separator } => {
                assert_eq!(separator, "_");
            }
            other => panic!("expected Nest, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — concat transform with FEL expression
    #[test]
    fn parse_mapping_rules_concat_transform() {
        let rules_json = json!([{
            "sourcePath": "parts",
            "targetPath": "full",
            "transform": "concat",
            "expression": "join($, ' ')"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Concat(expr) => {
                assert_eq!(expr, "join($, ' ')");
            }
            other => panic!("expected Concat, got {:?}", other),
        }
    }

    /// Spec: mapping-spec.md — split transform with FEL expression
    #[test]
    fn parse_mapping_rules_split_transform() {
        let rules_json = json!([{
            "sourcePath": "full",
            "targetPath": "parts",
            "transform": "split",
            "expression": "split($, ' ')"
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        match &rules[0].transform {
            runtime_mapping::TransformType::Split(expr) => {
                assert_eq!(expr, "split($, ' ')");
            }
            other => panic!("expected Split, got {:?}", other),
        }
    }

    /// Boundary: unknown transform type produces error
    #[test]
    fn parse_mapping_rules_unknown_transform_errors() {
        let rules_json = json!([{
            "sourcePath": "a",
            "targetPath": "b",
            "transform": "magic"
        }]);
        // NOTE: Cannot inspect PyErr message without a live Python interpreter.
        // The error content is tested via Python-side integration tests.
        assert!(parse_mapping_rules_inner(&rules_json).is_err());
    }

    /// Boundary: rules must be an array
    #[test]
    fn parse_mapping_rules_not_array_errors() {
        let rules_json = json!({"not": "array"});
        assert!(parse_mapping_rules_inner(&rules_json).is_err());
    }

    /// Boundary: each rule must be an object
    #[test]
    fn parse_mapping_rules_rule_not_object_errors() {
        let rules_json = json!(["not an object"]);
        assert!(parse_mapping_rules_inner(&rules_json).is_err());
    }

    /// Correctness: all optional fields parsed when present
    #[test]
    fn parse_mapping_rules_full_rule_with_all_fields() {
        let rules_json = json!([{
            "sourcePath": "income",
            "targetPath": "annual_income",
            "transform": "preserve",
            "condition": "$income > 0",
            "priority": 10,
            "reversePriority": 5,
            "default": 0,
            "bidirectional": false
        }]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        let r = &rules[0];
        assert_eq!(r.source_path.as_deref(), Some("income"));
        assert_eq!(r.target_path, "annual_income");
        assert!(matches!(
            r.transform,
            runtime_mapping::TransformType::Preserve
        ));
        assert_eq!(r.condition.as_deref(), Some("$income > 0"));
        assert_eq!(r.priority, 10);
        assert_eq!(r.reverse_priority, Some(5));
        assert_eq!(r.default, Some(json!(0)));
        assert!(!r.bidirectional);
    }

    /// Correctness: multiple rules parsed in order
    #[test]
    fn parse_mapping_rules_multiple_rules_preserved_order() {
        let rules_json = json!([
            {"sourcePath": "a", "targetPath": "x", "transform": "preserve"},
            {"sourcePath": "b", "targetPath": "y", "transform": "preserve"},
            {"sourcePath": "c", "targetPath": "z", "transform": "preserve"}
        ]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        assert_eq!(rules.len(), 3);
        assert_eq!(rules[0].source_path.as_deref(), Some("a"));
        assert_eq!(rules[1].source_path.as_deref(), Some("b"));
        assert_eq!(rules[2].source_path.as_deref(), Some("c"));
    }

    /// Boundary: empty rules array is valid
    #[test]
    fn parse_mapping_rules_empty_array() {
        let rules_json = json!([]);
        let rules = parse_mapping_rules_inner(&rules_json).unwrap();
        assert!(rules.is_empty());
    }

    // NOTE: parse_mapping_document tests require PyO3 (uses PyResult/PyValueError).
    // These must be tested via Python-side integration tests.
    // TODO: Extract parse_mapping_document_inner for native testability.
    // Untestable functions — require Python interpreter
    // ────────────────────────────────────────────────────────────
    //
    // The following functions use PyO3 types (Python<'_>, PyObject, Bound<'_, PyDict>)
    // and cannot be tested without a live Python interpreter:
    //
    // python_to_fel(py, obj) → FelValue
    //   TODO: Test that bool is extracted BEFORE int (Python bool subclasses int).
    //         Test None → Null, int → Number(Decimal), float → Number(Decimal),
    //         str → String, list → Array, dict → Object, unknown → Null.
    //         Write as: `python3 -m pytest tests/unit/test_rust_bindings.py`
    //
    // fel_to_python(py, val) → PyObject
    //   TODO: Test Number with zero fract → int, non-zero fract → float,
    //         Date → ISO string, Money → dict with amount + currency,
    //         Array → list, Object → dict, Null → None.
    //
    // json_to_python(py, val) → PyObject
    //   TODO: Test all JSON types map correctly. Number edge cases:
    //         i64-representable → int, f64-representable → float, neither → None.
    //
    // pydict_to_field_map(py, dict) → HashMap<String, FelValue>
    //   TODO: Test mixed-type dict, empty dict, nested structures.
    //
    // All #[pyfunction]s (eval_fel, parse_fel, get_dependencies, extract_deps,
    // analyze_expression, detect_type, lint_document, evaluate_def,
    // parse_registry, find_registry_entry, validate_lifecycle, well_known_url,
    // generate_changelog, execute_mapping_doc):
    //   These are thin wrappers that delegate to sibling crates.
    //   The underlying logic is tested in those crates.
    //   Python-side tests should verify the binding boundary:
    //   correct argument passing, error propagation, and return type mapping.

    // ── Validation: required fields (spec: mapping.schema.json) ──
    // Tests call parse_mapping_rules_inner directly (returns Result<_, String>)
    // to avoid FFI (PyO3) dependencies in native test builds.

    fn expect_err(rules: Value, substring: &str) {
        let err = parse_mapping_rules_inner(&rules).unwrap_err();
        assert!(
            err.contains(substring),
            "expected error containing {substring:?}, got: {err}"
        );
    }

    // ── Required field: transform ────────────────────────────────

    #[test]
    fn rejects_rule_missing_transform() {
        expect_err(
            json!([{"sourcePath": "a", "targetPath": "b"}]),
            "missing required field 'transform'",
        );
    }

    #[test]
    fn accepts_valid_preserve_rule() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "preserve"}]);
        assert_eq!(parse_mapping_rules_inner(&rules).unwrap().len(), 1);
    }

    // ── Required field: expression (for expression/constant/concat/split) ──

    #[test]
    fn rejects_expression_transform_missing_expression() {
        expect_err(
            json!([{"sourcePath": "a", "targetPath": "b", "transform": "expression"}]),
            "requires 'expression'",
        );
    }

    #[test]
    fn rejects_constant_transform_missing_expression() {
        expect_err(
            json!([{"targetPath": "b", "transform": "constant"}]),
            "requires 'expression'",
        );
    }

    #[test]
    fn rejects_concat_transform_missing_expression() {
        expect_err(
            json!([{"sourcePath": "a", "targetPath": "b", "transform": "concat"}]),
            "requires 'expression'",
        );
    }

    #[test]
    fn rejects_split_transform_missing_expression() {
        expect_err(
            json!([{"sourcePath": "a", "targetPath": "b", "transform": "split"}]),
            "requires 'expression'",
        );
    }

    #[test]
    fn accepts_expression_transform_with_expression() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "expression", "expression": "$ + 1"}]);
        assert_eq!(parse_mapping_rules_inner(&rules).unwrap().len(), 1);
    }

    #[test]
    fn accepts_constant_transform_with_expression() {
        let rules = json!([{"targetPath": "b", "transform": "constant", "expression": "'hello'"}]);
        assert_eq!(parse_mapping_rules_inner(&rules).unwrap().len(), 1);
    }

    // ── Required field: coerce (for coerce transform) ────────────

    #[test]
    fn rejects_coerce_transform_missing_coerce() {
        expect_err(
            json!([{"sourcePath": "a", "targetPath": "b", "transform": "coerce"}]),
            "requires 'coerce'",
        );
    }

    #[test]
    fn accepts_coerce_transform_with_string_shorthand() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "coerce", "coerce": "number"}]);
        assert_eq!(parse_mapping_rules_inner(&rules).unwrap().len(), 1);
    }

    #[test]
    fn accepts_coerce_transform_with_object_form() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "coerce", "coerce": {"from": "date", "to": "string"}}]);
        assert_eq!(parse_mapping_rules_inner(&rules).unwrap().len(), 1);
    }

    // ── Required: at least one of sourcePath/targetPath ──────────

    #[test]
    fn rejects_rule_missing_both_paths() {
        expect_err(
            json!([{"transform": "preserve"}]),
            "at least one of 'sourcePath' or 'targetPath'",
        );
    }

    #[test]
    fn accepts_rule_with_only_source_path() {
        let rules = json!([{"sourcePath": "a", "transform": "drop"}]);
        assert_eq!(parse_mapping_rules_inner(&rules).unwrap().len(), 1);
    }

    #[test]
    fn accepts_rule_with_only_target_path() {
        let rules = json!([{"targetPath": "b", "transform": "constant", "expression": "'v1'"}]);
        assert_eq!(parse_mapping_rules_inner(&rules).unwrap().len(), 1);
    }

    // ── Error messages include rule index ────────────────────────

    #[test]
    fn error_message_includes_rule_index() {
        let rules = json!([
            {"sourcePath": "a", "targetPath": "b", "transform": "preserve"},
            {"sourcePath": "c"}
        ]);
        let err = parse_mapping_rules_inner(&rules).unwrap_err();
        assert!(err.contains("rule[1]"));
    }

    // ── Unknown transform type ───────────────────────────────────

    #[test]
    fn rejects_unknown_transform_type() {
        expect_err(
            json!([{"sourcePath": "a", "targetPath": "b", "transform": "magic"}]),
            "unknown transform type: magic",
        );
    }

    // ── Finding 78: parse_coerce_type ───────────────────────────

    /// Spec: mapping/mapping-spec.md §3.3.2 — String shorthand for known coerce types.
    #[test]
    fn parse_coerce_type_string_shorthand_known() {
        assert_eq!(
            parse_coerce_type(&json!("string")),
            Some(runtime_mapping::CoerceType::String)
        );
        assert_eq!(
            parse_coerce_type(&json!("number")),
            Some(runtime_mapping::CoerceType::Number)
        );
        assert_eq!(
            parse_coerce_type(&json!("integer")),
            Some(runtime_mapping::CoerceType::Integer)
        );
        assert_eq!(
            parse_coerce_type(&json!("boolean")),
            Some(runtime_mapping::CoerceType::Boolean)
        );
        assert_eq!(
            parse_coerce_type(&json!("date")),
            Some(runtime_mapping::CoerceType::Date)
        );
        assert_eq!(
            parse_coerce_type(&json!("datetime")),
            Some(runtime_mapping::CoerceType::DateTime)
        );
    }

    /// Spec: mapping/mapping-spec.md §3.3.2 — Unknown string shorthand returns None.
    #[test]
    fn parse_coerce_type_unknown_string_returns_none() {
        assert_eq!(parse_coerce_type(&json!("uuid")), None);
        assert_eq!(parse_coerce_type(&json!("money")), None);
        assert_eq!(parse_coerce_type(&json!("")), None);
    }

    /// Spec: mapping/mapping-spec.md §3.3.2 — Object form with valid "to" key.
    #[test]
    fn parse_coerce_type_object_form_with_to() {
        assert_eq!(
            parse_coerce_type(&json!({"from": "date", "to": "string", "format": "MM/DD/YYYY"})),
            Some(runtime_mapping::CoerceType::String)
        );
        assert_eq!(
            parse_coerce_type(&json!({"from": "string", "to": "number"})),
            Some(runtime_mapping::CoerceType::Number)
        );
    }

    /// Spec: mapping/mapping-spec.md §3.3.2 — Object form missing "to" key returns None.
    #[test]
    fn parse_coerce_type_object_missing_to_returns_none() {
        assert_eq!(parse_coerce_type(&json!({"from": "string"})), None);
        assert_eq!(parse_coerce_type(&json!({})), None);
    }

    /// Spec: mapping/mapping-spec.md §3.3.2 — Object form with unknown "to" value returns None.
    #[test]
    fn parse_coerce_type_object_unknown_to_returns_none() {
        assert_eq!(
            parse_coerce_type(&json!({"from": "string", "to": "uuid"})),
            None
        );
    }

    /// Spec: mapping/mapping-spec.md §3.3.2 — Non-string, non-object input returns None.
    #[test]
    fn parse_coerce_type_non_string_non_object_returns_none() {
        assert_eq!(parse_coerce_type(&json!(42)), None);
        assert_eq!(parse_coerce_type(&json!(null)), None);
        assert_eq!(parse_coerce_type(&json!([])), None);
        assert_eq!(parse_coerce_type(&json!(true)), None);
    }

    /// Spec: mapping/mapping-spec.md §3.3.2 — Object form "from" field is ignored.
    /// The "from" field is accepted but has no effect on the returned CoerceType.
    #[test]
    fn parse_coerce_type_object_from_field_ignored() {
        // Same "to" regardless of "from" value
        let with_from = parse_coerce_type(&json!({"from": "date", "to": "string"}));
        let without_from = parse_coerce_type(&json!({"to": "string"}));
        assert_eq!(with_from, without_from);
        assert_eq!(with_from, Some(runtime_mapping::CoerceType::String));
    }

    // ── Finding 79: parse_mapping_document_inner ────────────────

    /// Spec: mapping/mapping-spec.md §3.1 — Valid mapping document with autoMap and rules.
    #[test]
    fn parse_mapping_document_inner_valid_with_automap_and_rules() {
        let doc = json!({
            "rules": [
                {"sourcePath": "name", "targetPath": "fullName", "transform": "preserve"}
            ],
            "autoMap": true
        });
        let result = parse_mapping_document_inner(&doc).unwrap();
        assert_eq!(result.rules.len(), 1);
        assert!(result.auto_map);
        assert!(result.defaults.is_none());
    }

    /// Spec: mapping/mapping-spec.md §3.1 — Minimal document with empty rules.
    #[test]
    fn parse_mapping_document_inner_minimal_empty_rules() {
        let doc = json!({"rules": []});
        let result = parse_mapping_document_inner(&doc).unwrap();
        assert_eq!(result.rules.len(), 0);
        assert!(!result.auto_map);
        assert!(result.defaults.is_none());
    }

    /// Spec: mapping/mapping-spec.md §3.1 — Non-object input returns error.
    #[test]
    fn parse_mapping_document_inner_non_object_rejected() {
        assert!(parse_mapping_document_inner(&json!("string")).is_err());
        assert!(parse_mapping_document_inner(&json!(42)).is_err());
        assert!(parse_mapping_document_inner(&json!(null)).is_err());
        assert!(parse_mapping_document_inner(&json!([])).is_err());
    }

    /// Spec: mapping/mapping-spec.md §3.1 — Document with defaults.
    #[test]
    fn parse_mapping_document_inner_with_defaults() {
        let doc = json!({
            "rules": [],
            "defaults": {"separator": ".", "unmapped": "error"}
        });
        let result = parse_mapping_document_inner(&doc).unwrap();
        let defaults = result.defaults.unwrap();
        assert_eq!(defaults.get("separator").unwrap(), ".");
        assert_eq!(defaults.get("unmapped").unwrap(), "error");
    }

    /// Spec: mapping/mapping-spec.md §3.1 — Missing "rules" key returns error.
    #[test]
    fn parse_mapping_document_inner_missing_rules_rejected() {
        let doc = json!({"autoMap": true});
        assert!(parse_mapping_document_inner(&doc).is_err());
    }

    // ── Finding 79: parse_mapping_rules_inner ───────────────────

    /// Spec: mapping/mapping-spec.md §3.1 — Rules array parse with multiple transforms.
    #[test]
    fn parse_mapping_rules_inner_multiple_transforms() {
        let rules = json!([
            {"sourcePath": "a", "targetPath": "b", "transform": "preserve"},
            {"targetPath": "c", "transform": "drop"},
            {"sourcePath": "d", "targetPath": "e", "transform": "coerce", "coerce": "number"}
        ]);
        let result = parse_mapping_rules_inner(&rules).unwrap();
        assert_eq!(result.len(), 3);
        assert!(matches!(
            result[0].transform,
            runtime_mapping::TransformType::Preserve
        ));
        assert!(matches!(
            result[1].transform,
            runtime_mapping::TransformType::Drop
        ));
        assert!(matches!(
            result[2].transform,
            runtime_mapping::TransformType::Coerce(runtime_mapping::CoerceType::Number)
        ));
    }

    /// Spec: mapping/mapping-spec.md §3.1 — Non-array input returns error.
    #[test]
    fn parse_mapping_rules_inner_non_array_rejected() {
        assert!(parse_mapping_rules_inner(&json!({})).is_err());
        assert!(parse_mapping_rules_inner(&json!("rules")).is_err());
        assert!(parse_mapping_rules_inner(&json!(null)).is_err());
    }

    /// Spec: mapping/mapping-spec.md §3.1 — Rule with unknown transform returns error.
    #[test]
    fn parse_mapping_rules_inner_unknown_transform_rejected() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b", "transform": "magical"}]);
        assert!(parse_mapping_rules_inner(&rules).is_err());
    }

    /// Spec: mapping.schema.json §3.3 — Transform is required on every rule.
    #[test]
    fn parse_mapping_rules_inner_missing_transform_rejected() {
        let rules = json!([{"sourcePath": "a", "targetPath": "b"}]);
        assert!(parse_mapping_rules_inner(&rules).is_err());
    }

    // ── Finding 80: UnmappedStrategy parsing ────────────────────

    /// Spec: mapping/mapping-spec.md §4.6 — All four unmapped strategies parse correctly.
    #[test]
    fn parse_mapping_rules_inner_all_unmapped_strategies() {
        for (strategy_str, expected) in [
            ("error", runtime_mapping::UnmappedStrategy::Error),
            ("drop", runtime_mapping::UnmappedStrategy::Drop),
            ("default", runtime_mapping::UnmappedStrategy::Default),
            (
                "passthrough",
                runtime_mapping::UnmappedStrategy::PassThrough,
            ),
        ] {
            let rules = json!([{
                "sourcePath": "a",
                "targetPath": "b",
                "transform": "valueMap",
                "valueMap": {"forward": {"x": 1}, "unmapped": strategy_str}
            }]);
            let result = parse_mapping_rules_inner(&rules).unwrap();
            if let runtime_mapping::TransformType::ValueMap { unmapped, .. } = &result[0].transform
            {
                assert_eq!(
                    *unmapped, expected,
                    "strategy '{strategy_str}' did not match"
                );
            } else {
                panic!("expected ValueMap transform");
            }
        }
    }

    /// Spec: mapping/mapping-spec.md §4.6 — Unknown unmapped strategy defaults to passthrough.
    #[test]
    fn parse_mapping_rules_inner_unknown_unmapped_defaults_to_passthrough() {
        let rules = json!([{
            "sourcePath": "a",
            "targetPath": "b",
            "transform": "valueMap",
            "valueMap": {"forward": {"x": 1}, "unmapped": "nonexistent"}
        }]);
        let result = parse_mapping_rules_inner(&rules).unwrap();
        if let runtime_mapping::TransformType::ValueMap { unmapped, .. } = &result[0].transform {
            assert_eq!(*unmapped, runtime_mapping::UnmappedStrategy::PassThrough);
        } else {
            panic!("expected ValueMap transform");
        }
    }

    /// Spec: mapping/mapping-spec.md §3.3.2 — Coerce with object form parsed through rules.
    #[test]
    fn parse_mapping_rules_inner_coerce_object_form() {
        let rules = json!([{
            "sourcePath": "dob",
            "targetPath": "dob_str",
            "transform": "coerce",
            "coerce": {"from": "date", "to": "string", "format": "MM/DD/YYYY"}
        }]);
        let result = parse_mapping_rules_inner(&rules).unwrap();
        assert!(matches!(
            result[0].transform,
            runtime_mapping::TransformType::Coerce(runtime_mapping::CoerceType::String)
        ));
    }

    // ── Theme cascade resolution ────────────────────────────────

    /// Spec: theme-spec SS5.5 — resolve_presentation with no theme returns default block.
    #[test]
    fn resolve_presentation_no_theme_returns_default() {
        use formspec_theme::{ItemDescriptor, ItemType, resolve_presentation};

        let item = ItemDescriptor {
            key: "name".to_string(),
            item_type: ItemType::Field,
            data_type: None,
        };
        let result = resolve_presentation(None, &item, None, None);
        // Default PresentationBlock has no widget
        assert!(result.widget.is_none());
    }

    /// Spec: theme-spec SS5.5 — theme defaults propagate when no selectors/items match.
    #[test]
    fn resolve_presentation_theme_defaults_apply() {
        use formspec_theme::{
            ItemDescriptor, ItemType, PresentationBlock, TargetDefinition, ThemeDocument,
            resolve_presentation,
        };

        let theme = ThemeDocument {
            formspec_theme: "1.0".to_string(),
            version: "1.0.0".to_string(),
            target_definition: TargetDefinition {
                url: "test".to_string(),
                compatible_versions: None,
            },
            url: None,
            name: None,
            title: None,
            description: None,
            platform: None,
            tokens: None,
            defaults: Some(PresentationBlock {
                widget: Some("custom-input".to_string()),
                ..Default::default()
            }),
            selectors: None,
            items: None,
            pages: None,
            breakpoints: None,
            stylesheets: None,
            extensions: None,
            class_strategy: None,
        };

        let item = ItemDescriptor {
            key: "email".to_string(),
            item_type: ItemType::Field,
            data_type: None,
        };

        let result = resolve_presentation(Some(&theme), &item, None, None);
        assert_eq!(result.widget.as_deref(), Some("custom-input"));
    }

    /// Spec: theme-spec SS3.3 — resolve_token resolves component tokens first.
    #[test]
    fn resolve_token_component_wins() {
        use formspec_theme::resolve_token;
        use serde_json::Map;

        let mut comp = Map::new();
        comp.insert("primary".to_string(), json!("#ff0000"));
        let mut theme = Map::new();
        theme.insert("primary".to_string(), json!("#0000ff"));

        let result = resolve_token("$token.primary", Some(&comp), Some(&theme));
        assert_eq!(result, Some(json!("#ff0000")));
    }

    /// Spec: theme-spec SS3.3 — resolve_token falls back to theme tokens.
    #[test]
    fn resolve_token_theme_fallback() {
        use formspec_theme::resolve_token;
        use serde_json::Map;

        let mut theme = Map::new();
        theme.insert("secondary".to_string(), json!("#00ff00"));

        let result = resolve_token("$token.secondary", None, Some(&theme));
        assert_eq!(result, Some(json!("#00ff00")));
    }

    /// Spec: theme-spec SS3.3 — resolve_token returns None for non-token strings.
    #[test]
    fn resolve_token_non_token_returns_none() {
        use formspec_theme::resolve_token;

        let result = resolve_token("not-a-token", None, None);
        assert!(result.is_none());
    }

    /// Spec: theme-spec SS3.3 — resolve_token returns None for unknown keys.
    #[test]
    fn resolve_token_unknown_key_returns_none() {
        use formspec_theme::resolve_token;
        use serde_json::Map;

        let comp = Map::new();
        let result = resolve_token("$token.missing", Some(&comp), None);
        assert!(result.is_none());
    }

    // ── Layout planner ──────────────────────────────────────────

    /// Spec: plan_component_tree produces a LayoutNode with correct component type.
    #[test]
    fn plan_component_tree_simple_stack() {
        use formspec_plan::{
            NodeCategory, PlanContext, plan_component_tree, reset_node_id_counter,
        };

        reset_node_id_counter();

        let tree = json!({
            "component": "Stack",
            "children": []
        });

        let ctx = PlanContext {
            items: vec![],
            form_presentation: None,
            component_document: None,
            theme: None,
            viewport_width: None,
            find_item: Box::new(|_| None),
            is_component_available: None,
        };

        let result = plan_component_tree(&tree, &ctx);
        assert_eq!(result.component, "Stack");
        assert_eq!(result.category, NodeCategory::Layout);
        assert!(result.children.is_empty());
    }

    /// Spec: plan_definition_fallback wraps items into layout nodes.
    #[test]
    fn plan_definition_fallback_produces_nodes() {
        use formspec_plan::{PlanContext, plan_definition_fallback, reset_node_id_counter};

        reset_node_id_counter();

        let items = vec![
            json!({ "key": "name", "dataType": "string", "label": "Name" }),
            json!({ "key": "age", "dataType": "integer", "label": "Age" }),
        ];

        let items_clone = items.clone();
        let ctx = PlanContext {
            items: items.clone(),
            form_presentation: None,
            component_document: None,
            theme: None,
            viewport_width: None,
            find_item: Box::new(move |key: &str| {
                items_clone
                    .iter()
                    .find(|i| i.get("key").and_then(|k| k.as_str()) == Some(key))
                    .cloned()
            }),
            is_component_available: None,
        };

        let result = plan_definition_fallback(&items, &ctx);
        assert_eq!(result.len(), 2);
        // Each item becomes a field node
        assert!(result[0].bind_path.is_some());
        assert!(result[1].bind_path.is_some());
    }

    /// Spec: PlanContextJson deserializes and converts to PlanContext.
    #[test]
    fn plan_context_json_round_trip() {
        use formspec_plan::PlanContextJson;

        let ctx_json = json!({
            "itemsByPath": {
                "name": { "key": "name", "dataType": "string" }
            },
            "formPresentation": null,
            "componentDocument": null,
            "theme": null,
            "viewportWidth": 1024,
            "availableComponents": ["TextInput", "Stack"]
        });

        let parsed: PlanContextJson = serde_json::from_value(ctx_json).unwrap();
        assert_eq!(parsed.items_by_path.len(), 1);
        assert_eq!(parsed.viewport_width, Some(1024));
        assert_eq!(parsed.available_components.len(), 2);
    }

    // ── PDF / XFDF ─────────────────────────────────────────────

    /// Spec: generate_xfdf produces valid XML with sorted keys.
    #[test]
    fn generate_xfdf_sorted_keys() {
        use formspec_pdf::generate_xfdf;
        use std::collections::HashMap;

        let mut fields = HashMap::new();
        fields.insert("zeta".to_string(), json!("last"));
        fields.insert("alpha".to_string(), json!("first"));

        let xml = generate_xfdf(&fields);
        let alpha_pos = xml.find("alpha").unwrap();
        let zeta_pos = xml.find("zeta").unwrap();
        assert!(alpha_pos < zeta_pos, "keys should be sorted alphabetically");
    }

    /// Spec: parse_xfdf round-trips with generate_xfdf.
    #[test]
    fn xfdf_round_trip() {
        use formspec_pdf::{generate_xfdf, parse_xfdf};
        use std::collections::HashMap;

        let mut fields = HashMap::new();
        fields.insert("name".to_string(), json!("Alice"));
        fields.insert("score".to_string(), json!(42));
        fields.insert("active".to_string(), json!(true));

        let xml = generate_xfdf(&fields);
        let parsed = parse_xfdf(&xml).unwrap();

        assert_eq!(parsed.get("name"), Some(&json!("Alice")));
        assert_eq!(parsed.get("score"), Some(&json!(42)));
        assert_eq!(parsed.get("active"), Some(&json!(true)));
    }

    /// Spec: parse_xfdf returns error for malformed input gracefully.
    #[test]
    fn parse_xfdf_empty_is_ok() {
        use formspec_pdf::parse_xfdf;

        let result = parse_xfdf("<xfdf><fields></fields></xfdf>");
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    /// Spec: render_pdf produces non-empty bytes with PDF header.
    #[test]
    fn render_pdf_produces_valid_header() {
        use formspec_pdf::{PdfOptions, render_pdf};
        use formspec_plan::EvaluatedNode;

        // Render with an empty tree — should still produce a valid PDF structure.
        let nodes: Vec<EvaluatedNode> = vec![];
        let options = PdfOptions::default();
        let bytes = render_pdf(&nodes, &options);

        assert!(!bytes.is_empty(), "PDF output should not be empty");
        assert!(
            bytes.starts_with(b"%PDF"),
            "PDF output should start with %PDF header"
        );
    }

    /// Spec: PdfOptions default values match US Letter (612x792 pt).
    #[test]
    fn pdf_options_default_values() {
        use formspec_pdf::PdfOptions;

        let opts = PdfOptions::default();
        // US Letter dimensions in points
        assert_eq!(opts.paper_width, 612.0);
        assert_eq!(opts.paper_height, 792.0);
        // 1-inch margins
        assert_eq!(opts.margin_top, 72.0);
        assert_eq!(opts.margin_bottom, 72.0);
        assert_eq!(opts.margin_left, 72.0);
        assert_eq!(opts.margin_right, 72.0);
    }

    /// Spec: EvaluatedNode serializes with camelCase field names.
    #[test]
    fn evaluated_node_camel_case_serialization() {
        use formspec_plan::{EvaluatedNode, NodeCategory};
        use serde_json::Map;

        let node = EvaluatedNode {
            id: "field-0".to_string(),
            component: "TextInput".to_string(),
            category: NodeCategory::Field,
            props: Map::new(),
            style: None,
            css_classes: vec![],
            accessibility: None,
            presentation: None,
            label_position: None,
            bind_path: Some("name".to_string()),
            field_item: None,
            value: Some(json!("test")),
            relevant: true,
            required: false,
            readonly: false,
            validations: vec![],
            span: 12,
            col_start: 0,
            children: vec![],
            repeat_group: None,
        };

        let json = serde_json::to_value(&node).unwrap();
        // camelCase keys
        assert!(json.get("bindPath").is_some());
        assert!(json.get("colStart").is_some());
        assert!(json.get("repeatGroup").is_none()); // None → skipped
    }

    // ── assemble_response ──────────────────────────────────────

    /// Flat fields (no dots or brackets) stay as top-level keys.
    #[test]
    fn assemble_response_flat_fields() {
        let mut fields = std::collections::HashMap::new();
        fields.insert("name".to_string(), json!("Alice"));
        fields.insert("age".to_string(), json!(30));

        let result = formspec_pdf::assemble_response(&fields);

        assert_eq!(result.get("name"), Some(&json!("Alice")));
        assert_eq!(result.get("age"), Some(&json!(30)));
    }

    /// Dotted paths unflatten into nested objects.
    #[test]
    fn assemble_response_nested_paths() {
        let mut fields = std::collections::HashMap::new();
        fields.insert("address.street".to_string(), json!("123 Main St"));
        fields.insert("address.city".to_string(), json!("Springfield"));

        let result = formspec_pdf::assemble_response(&fields);

        let address = result.get("address").expect("missing 'address'");
        assert_eq!(address.get("street"), Some(&json!("123 Main St")));
        assert_eq!(address.get("city"), Some(&json!("Springfield")));
    }

    /// Bracket indices create arrays; sparse indices are gap-filled.
    #[test]
    fn assemble_response_repeat_groups() {
        let mut fields = std::collections::HashMap::new();
        fields.insert("items[0].name".to_string(), json!("Widget"));
        fields.insert("items[0].qty".to_string(), json!(5));
        fields.insert("items[1].name".to_string(), json!("Gadget"));

        let result = formspec_pdf::assemble_response(&fields);

        let items = result.get("items").expect("missing 'items'").as_array().expect("not array");
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].get("name"), Some(&json!("Widget")));
        assert_eq!(items[0].get("qty"), Some(&json!(5)));
        assert_eq!(items[1].get("name"), Some(&json!("Gadget")));
    }
}
