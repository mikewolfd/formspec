"""Compatibility namespace for `python -m formspec.validator`."""

from validator import FormspecLinter, LintDiagnostic, LintPolicy, lint, make_policy

__all__ = ["FormspecLinter", "LintDiagnostic", "LintPolicy", "make_policy", "lint"]
