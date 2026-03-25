"""PyO3 integration tests for theme cascade, layout planner, and PDF bindings.

Tests the actual Python↔Rust boundary (serialization, error mapping) — not
just the underlying Rust functions.
"""

import pytest
import formspec_rust


# ── Theme cascade ──────────────────────────────────────────────────


def test_resolve_presentation_with_theme():
    """Theme defaults flow through the cascade into the resolved block."""
    theme = {
        "$formspecTheme": "1.0",
        "version": "1.0.0",
        "targetDefinition": {"url": "test://def"},
        "defaults": {
            "labelPosition": "top",
            "widget": "text-input",
        },
    }
    item = {"key": "name", "itemType": "field", "dataType": "string"}

    result = formspec_rust.resolve_presentation_py(theme, item)

    assert isinstance(result, dict)
    assert result.get("labelPosition") == "top"
    assert result.get("widget") == "text-input"


def test_resolve_token_cascade():
    """Component tokens take precedence over theme tokens."""
    component_tokens = {"primary": "#FF0000"}
    theme_tokens = {"primary": "#0000FF", "secondary": "#00FF00"}

    # Component wins for "primary"
    resolved = formspec_rust.resolve_token_py(
        "$token.primary",
        component_tokens=component_tokens,
        theme_tokens=theme_tokens,
    )
    assert resolved == "#FF0000"

    # Theme provides "secondary" (no component override)
    resolved = formspec_rust.resolve_token_py(
        "$token.secondary",
        component_tokens=component_tokens,
        theme_tokens=theme_tokens,
    )
    assert resolved == "#00FF00"

    # Non-token strings pass through as None
    resolved = formspec_rust.resolve_token_py("plain-value")
    assert resolved is None


# ── Layout planner ─────────────────────────────────────────────────


def test_plan_component_tree_basic():
    """A Stack with two Field children produces a layout node with children."""
    tree = {
        "type": "Stack",
        "children": [
            {"type": "Field", "bindPath": "firstName"},
            {"type": "Field", "bindPath": "lastName"},
        ],
    }
    context = {
        "itemsByPath": {
            "firstName": {
                "type": "field",
                "key": "firstName",
                "dataType": "string",
            },
            "lastName": {
                "type": "field",
                "key": "lastName",
                "dataType": "string",
            },
        },
    }

    result = formspec_rust.plan_component_tree_py(tree, context)

    assert isinstance(result, dict)
    assert result.get("component") == "Stack"
    assert result.get("category") == "layout"
    children = result.get("children", [])
    assert len(children) == 2
    # Field bindPaths land inside props when the planner doesn't recognize
    # "Field" as a registered component — it preserves them as properties.
    bind_paths = [c.get("bindPath") or c.get("props", {}).get("bindPath")
                  for c in children]
    assert "firstName" in bind_paths
    assert "lastName" in bind_paths


def test_plan_definition_fallback_basic():
    """Definition fallback produces field nodes with bindPaths from items."""
    items = [
        {"type": "field", "key": "email", "dataType": "string"},
        {"type": "field", "key": "age", "dataType": "integer"},
    ]
    context = {
        "itemsByPath": {
            "email": items[0],
            "age": items[1],
        },
    }

    result = formspec_rust.plan_definition_fallback_py(items, context)

    assert isinstance(result, list)
    assert len(result) >= 2
    bind_paths = [n.get("bindPath") for n in result if n.get("bindPath")]
    assert "email" in bind_paths
    assert "age" in bind_paths


# ── PDF rendering ──────────────────────────────────────────────────


def _minimal_evaluated_node(bind_path="name", label="Name", value="Alice"):
    """Build a minimal EvaluatedNode dict that passes deserialization."""
    return {
        "id": "node-1",
        "component": "TextInput",
        "category": "field",
        "props": {"label": label},
        "bindPath": bind_path,
        "currentValue": value,
    }


def test_render_pdf_produces_valid_bytes():
    """render_pdf returns bytes starting with the PDF magic header."""
    tree = [_minimal_evaluated_node()]

    result = formspec_rust.render_pdf_py(tree)

    assert isinstance(result, bytes)
    assert result[:5] == b"%PDF-"


def test_render_pdf_with_options():
    """Custom PdfOptions (A4 paper) still produces a valid PDF."""
    tree = [_minimal_evaluated_node()]
    options = {
        "paperWidth": 595.0,   # A4 width in points
        "paperHeight": 842.0,  # A4 height in points
    }

    result = formspec_rust.render_pdf_py(tree, options=options)

    assert isinstance(result, bytes)
    assert result[:5] == b"%PDF-"
    # A4 PDF should differ in size from the default (Letter) — at minimum it's valid
    assert len(result) > 0


def test_xfdf_round_trip():
    """generate_xfdf → parse_xfdf preserves field values."""
    fields = {"firstName": "Ada", "lastName": "Lovelace", "age": "36"}

    xfdf_xml = formspec_rust.generate_xfdf_py(fields)

    assert isinstance(xfdf_xml, str)
    assert "xfdf" in xfdf_xml.lower()
    assert "Ada" in xfdf_xml

    parsed = formspec_rust.parse_xfdf_py(xfdf_xml)

    assert isinstance(parsed, dict)
    assert parsed.get("firstName") == "Ada"
    assert parsed.get("lastName") == "Lovelace"
    # XFDF parse_xfdf returns serde_json::Value, which coerces numeric
    # strings to numbers during JSON round-trip.
    assert parsed.get("age") in ("36", 36)


# ── Error handling ─────────────────────────────────────────────────


def test_plan_component_tree_invalid_json():
    """Malformed context raises ValueError."""
    tree = {"type": "Stack", "children": []}
    bad_context = "not-a-dict"

    with pytest.raises((TypeError, ValueError)):
        formspec_rust.plan_component_tree_py(tree, bad_context)


def test_render_pdf_invalid_tree():
    """Non-array evaluated tree raises ValueError."""
    with pytest.raises((TypeError, ValueError)):
        formspec_rust.render_pdf_py({"not": "an array"})
