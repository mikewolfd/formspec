"""Tests for the _rust bridge module — verifies Python↔Rust boundary."""

import pytest
from formspec._rust import (
    parse,
    ParsedExpression,
    evaluate,
    extract_dependencies,
    EvalResult,
    DependencySet,
    lint,
    detect_document_type,
    LintDiagnostic,
    evaluate_definition,
    ProcessingResult,
    execute_mapping,
    MappingResult,
    parse_registry,
    RegistryInfo,
    find_registry_entry,
    validate_lifecycle_transition,
    well_known_registry_url,
    generate_changelog,
    canonical_item_path,
)
from formspec.fel.errors import FelSyntaxError
from formspec.fel.types import FelNumber, FelString, is_null


# ── FEL parse ────────────────────────────────────────────────────


def test_parse_valid_expression():
    result = parse("1 + 2")
    assert isinstance(result, ParsedExpression)
    assert result.source == "1 + 2"


def test_parse_invalid_expression_raises():
    with pytest.raises(FelSyntaxError):
        parse("1 +")


# ── FEL evaluate ─────────────────────────────────────────────────


def test_evaluate_simple_arithmetic():
    result = evaluate("1 + 2")
    assert isinstance(result, EvalResult)
    assert isinstance(result.value, FelNumber)
    assert float(result.value.value) == 3.0


def test_evaluate_with_data():
    result = evaluate("$x + $y", {"x": 10, "y": 20})
    assert isinstance(result.value, FelNumber)
    assert float(result.value.value) == 30.0


def test_evaluate_null_field():
    result = evaluate("$missing", {})
    assert is_null(result.value)


def test_evaluate_string():
    result = evaluate("'hello'")
    assert isinstance(result.value, FelString)
    assert result.value.value == "hello"


# ── FEL extract_dependencies ─────────────────────────────────────


def test_extract_dependencies_fields():
    deps = extract_dependencies("$x + $y")
    assert isinstance(deps, DependencySet)
    assert "x" in deps.fields
    assert "y" in deps.fields


def test_extract_dependencies_variables():
    deps = extract_dependencies("@myVar")
    assert "myVar" in deps.context_refs


# ── Linting ──────────────────────────────────────────────────────


def test_detect_document_type_definition():
    doc = {"$formspec": "1.0", "url": "test://def", "version": "1.0.0", "items": []}
    assert detect_document_type(doc) == "definition"


def test_detect_document_type_unknown():
    assert detect_document_type({"random": True}) is None


def test_lint_valid_definition():
    doc = {
        "url": "test://example",
        "version": "1.0.0",
        "items": [{"type": "field", "key": "name", "dataType": "string"}],
    }
    results = lint(doc)
    assert isinstance(results, list)
    assert all(isinstance(d, LintDiagnostic) for d in results)


def test_lint_returns_diagnostics_for_bad_doc():
    doc = {"url": "test://bad"}  # missing required fields
    results = lint(doc)
    assert len(results) > 0
    assert any(d.severity == "error" for d in results)


# ── Evaluation ───────────────────────────────────────────────────


def test_evaluate_definition_simple():
    definition = {
        "url": "test://eval",
        "version": "1.0.0",
        "items": [{"type": "field", "key": "name", "dataType": "string"}],
    }
    result = evaluate_definition(definition, {"name": "Alice"})
    assert isinstance(result, ProcessingResult)
    assert isinstance(result.valid, bool)
    assert isinstance(result.data, dict)


# ── Mapping ──────────────────────────────────────────────────────


def test_execute_mapping_forward():
    mapping_doc = {
        "rules": [
            {
                "sourcePath": "name",
                "targetPath": "fullName",
                "transform": "preserve",
            }
        ]
    }
    result = execute_mapping(mapping_doc, {"name": "Alice"}, "forward")
    assert isinstance(result, MappingResult)
    assert result.direction == "forward"
    assert result.output.get("fullName") == "Alice"


# ── Registry ─────────────────────────────────────────────────────


def test_validate_lifecycle_valid():
    assert validate_lifecycle_transition("draft", "stable") is True


def test_validate_lifecycle_invalid():
    assert validate_lifecycle_transition("retired", "draft") is False


def test_well_known_registry_url():
    url = well_known_registry_url("https://example.com")
    assert isinstance(url, str)
    assert "example.com" in url


# ── Changelog ────────────────────────────────────────────────────


def test_generate_changelog_returns_dict():
    old_def = {"url": "test://def", "version": "1.0.0", "items": []}
    new_def = {
        "url": "test://def",
        "version": "2.0.0",
        "items": [{"type": "field", "key": "name", "dataType": "string"}],
    }
    result = generate_changelog(old_def, new_def, "test://def")
    assert isinstance(result, dict)


# ── Path utility ─────────────────────────────────────────────────


def test_canonical_item_path():
    assert canonical_item_path("$.foo.bar") == "foo.bar"
    assert canonical_item_path("/foo/bar") == "foo.bar"
    assert canonical_item_path("foo.bar") == "foo.bar"
