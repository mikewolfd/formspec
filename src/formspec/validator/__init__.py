"""Formspec static linter: multi-pass pipeline (schema, tree, references, FEL, dependencies, theme, component) with policy-driven severity."""

from .diagnostic import LintDiagnostic
from .linter import FormspecLinter, lint
from .policy import LintPolicy, make_policy

__all__ = ["FormspecLinter", "LintDiagnostic", "LintPolicy", "make_policy", "lint"]
