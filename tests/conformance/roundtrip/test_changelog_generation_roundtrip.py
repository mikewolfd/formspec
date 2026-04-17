"""Round-trip conformance: generated changelog → detect_document_type → lint.

Regression coverage for E100 ("Cannot determine document type") on
`generate_changelog` output. The generator previously emitted the body
fields (`definitionUrl` / `fromVersion` / …) without the
`$formspecChangelog` envelope marker the linter's pass-1 detection keys
off, so `_pass_changelog_generation` in `validate.py` tripped E100 on
every generated changelog.

See: thoughts/plans/2026-04-17-changelog-generation-fails-doctype-detection.md
"""

from __future__ import annotations

from formspec._rust import detect_document_type, generate_changelog, lint
from formspec.validate import _changelog_snake_to_camel


def _def(version: str, *items: dict) -> dict:
    return {
        "$formspec": "1.0",
        "url": "https://example.org/form",
        "version": version,
        "title": "Round-trip Form",
        "items": list(items),
    }


class TestChangelogEnvelopeMarker:
    def test_generated_changelog_has_formspec_changelog_marker(self):
        old = _def("1.0.0")
        new = _def("1.1.0", {
            "key": "name", "type": "field", "dataType": "string", "label": "Name"
        })
        cl = generate_changelog(old, new, "https://example.org/form")
        assert cl.get("$formspecChangelog") == "1.0", (
            "generate_changelog must emit the $formspecChangelog envelope marker"
        )


class TestDetectDocumentTypeRoundTrip:
    def test_detect_document_type_classifies_generated_changelog(self):
        old = _def("1.0.0")
        new = _def("2.0.0")  # version-only change → cosmetic/patch
        cl = generate_changelog(old, new, "https://example.org/form")
        assert detect_document_type(cl) == "changelog", (
            "generated changelog must be detectable as 'changelog' "
            "(otherwise lint() pass-1 emits E100)"
        )


class TestLintRoundTrip:
    def test_lint_of_translated_changelog_has_no_schema_errors(self):
        """After snake→camel translation, the generated document passes
        schema validation (no E100, no E101 from `additionalProperties: false`).
        """
        old = _def("1.0.0")
        new = _def("1.1.0", {
            "key": "name", "type": "field", "dataType": "string", "label": "Name"
        })
        cl = generate_changelog(old, new, "https://example.org/form")
        diags = lint(_changelog_snake_to_camel(cl))
        errors = [d for d in diags if d.severity == "error"]
        assert errors == [], (
            "generated changelog should validate cleanly after snake→camel "
            f"translation, got: {[(d.code, d.message) for d in errors]}"
        )

    def test_lint_does_not_emit_e100_on_generated_changelog(self):
        """Direct regression test: the generator output itself (before any
        translation) must at least not trip E100. E101 may still fire on
        snake-style keys, but the document-type detector must succeed.
        """
        old = _def("1.0.0")
        new = _def("1.1.0", {
            "key": "x", "type": "field", "dataType": "string", "label": "X"
        })
        cl = generate_changelog(old, new, "https://example.org/form")
        diags = lint(cl)
        e100 = [d for d in diags if d.code == "E100"]
        assert e100 == [], (
            f"E100 fired on generated changelog: {[d.message for d in e100]}"
        )
