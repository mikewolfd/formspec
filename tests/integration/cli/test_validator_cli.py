"""Tests for the formspec.validate CLI (directory-based validator).

The old formspec.validator.__main__ single-file CLI has been replaced by
formspec.validate which auto-discovers and validates all Formspec JSON
artifacts in a directory.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from formspec.validate import main


def test_cli_valid_directory_returns_zero(tmp_path) -> None:
    """A directory with a valid definition should return exit code 0."""
    form_file = tmp_path / "definition.json"
    form_file.write_text(
        json.dumps(
            {
                "$formspec": "1.0",
                "url": "https://example.com/forms/x",
                "version": "1.0.0",
                "status": "draft",
                "title": "X",
                "items": [
                    {"key": "a", "type": "field", "label": "A", "dataType": "integer"}
                ],
            }
        )
    )

    code = main([str(tmp_path)])
    assert code == 0


def test_cli_nonexistent_directory_returns_2(tmp_path) -> None:
    """A nonexistent directory should return exit code 2."""
    code = main([str(tmp_path / "nonexistent")])
    assert code == 2


def test_cli_empty_directory_returns_zero(tmp_path) -> None:
    """An empty directory (no artifacts) should return exit code 0."""
    code = main([str(tmp_path)])
    assert code == 0


def test_cli_invalid_json_file_is_skipped(tmp_path) -> None:
    """Files that aren't valid JSON should be skipped (not crash)."""
    bad_file = tmp_path / "bad.json"
    bad_file.write_text("{not-json")

    code = main([str(tmp_path)])
    # Should not crash; bad JSON files are silently skipped
    assert code in (0, 1)  # may be 0 (no artifacts found) or 1 (report error)


# ── --json output format ─────────────────────────────────────────────────────


def _write_valid_definition(directory: Path) -> None:
    (directory / "definition.json").write_text(
        json.dumps(
            {
                "$formspec": "1.0",
                "url": "https://example.com/forms/ok",
                "version": "1.0.0",
                "status": "draft",
                "title": "OK",
                "items": [
                    {"key": "a", "type": "field", "label": "A", "dataType": "integer"}
                ],
            }
        )
    )


def _write_definition_with_lint_error(directory: Path) -> None:
    """Write a definition that triggers a bind-target lint error."""
    (directory / "definition.json").write_text(
        json.dumps(
            {
                "$formspec": "1.0",
                "url": "https://example.com/forms/bad",
                "version": "1.0.0",
                "status": "draft",
                "title": "Bad",
                "items": [
                    {"key": "a", "type": "field", "label": "A", "dataType": "integer"}
                ],
                "binds": [{"target": "does_not_exist", "required": True}],
            }
        )
    )


def test_cli_json_flag_emits_parseable_json_on_success(tmp_path, capsys) -> None:
    """`--json` on a clean directory produces a parseable JSON report with totals."""
    _write_valid_definition(tmp_path)

    code = main([str(tmp_path), "--json"])
    captured = capsys.readouterr()

    # Nothing should land on stderr in the success path.
    assert captured.err == ""
    report = json.loads(captured.out)

    assert report["valid"] is True
    assert report["totalErrors"] == 0
    assert report["title"] == tmp_path.name
    assert isinstance(report["passes"], list)
    assert code == 0


def test_cli_json_flag_emits_structured_diagnostics(tmp_path, capsys) -> None:
    """`--json` surfaces diagnostics with stable field names and authoring-loop metadata."""
    _write_definition_with_lint_error(tmp_path)

    code = main([str(tmp_path), "--json"])
    report = json.loads(capsys.readouterr().out)

    assert report["valid"] is False
    assert report["totalErrors"] >= 1

    # Dig into the first pass item that has diagnostics.
    diagnostics = [
        d
        for pass_ in report["passes"]
        for item in pass_["items"]
        for d in item["diagnostics"]
    ]
    assert diagnostics, "expected at least one lint diagnostic"

    sample = diagnostics[0]
    for field_name in ("code", "severity", "path", "message"):
        assert field_name in sample, f"diagnostic missing {field_name}"
    # Authoring-loop metadata is always present as keys (null when unpopulated) so
    # LLM consumers can rely on a stable shape rather than checking `in` everywhere.
    assert "suggestedFix" in sample
    assert "specRef" in sample

    assert code == 1


def test_cli_json_flag_suppresses_ansi_color_output(tmp_path, capsys) -> None:
    """`--json` must not interleave the human report's ANSI escapes with JSON."""
    _write_valid_definition(tmp_path)

    main([str(tmp_path), "--json"])
    out = capsys.readouterr().out

    assert "\033[" not in out, "ANSI escape leaked into --json output"
    # Sanity: still valid JSON.
    json.loads(out)
