"""Formspec protocols — abstraction layer for swappable backends.

Defines Protocol classes for the major Formspec subsystems so that both
the built-in Python implementations and future Rust/PyO3 backends can
satisfy the same contracts.

Usage::

    from formspec.protocols import FormProcessor, FormValidator, MappingProcessor

    def submit(processor: FormProcessor, data: dict) -> bool:
        result = processor.process(data)
        return result.valid
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from .fel.types import FelValue
from .fel.runtime import FelRuntime


# ── Result types ────────────────────────────────────────────────────


# ProcessingResult and LintDiagnostic are imported from their canonical
# locations rather than re-defined here, to avoid duplication.


# ── FormProcessor ───────────────────────────────────────────────────


@runtime_checkable
class FormProcessor(Protocol):
    """Server-side form processor interface.

    Implementations:
    - ``DefinitionEvaluator`` — built-in 4-phase batch processor
    - (future) Rust/PyO3 backend
    """

    def process(self, data: dict, *, mode: str = 'submit') -> Any:
        """Run all processing phases and return a ProcessingResult.

        Returns an object with at least: valid (bool), results (list[dict]),
        data (dict), variables (dict), counts (dict).
        """
        ...

    def validate(self, data: dict, *, mode: str = 'submit') -> list[dict]:
        """Convenience: return just the validation results."""
        ...

    def evaluate_screener(self, answers: dict) -> dict[str, object] | None:
        """Evaluate screener routes against answers. Returns matching route or None."""
        ...

    def evaluate_variables(self, data: dict) -> dict[str, FelValue]:
        """Evaluate definition-wide variables in dependency order."""
        ...

    def inject_external_validation(self, results: list[dict]) -> None:
        """Inject external validation results (e.g. from server-side). Spec S5.7.1 (MUST)."""
        ...

    def clear_external_validation(self, path: str | None = None) -> None:
        """Clear external validation results, optionally for a specific path. Spec S5.7.2."""
        ...


# ── FormValidator ───────────────────────────────────────────────────


@runtime_checkable
class FormValidator(Protocol):
    """Static lint/validation interface for Formspec documents.

    Implementations:
    - ``FormspecLinter`` — built-in multi-pass lint orchestrator
    - (future) Rust/PyO3 backend
    """

    def lint(
        self,
        document: Any,
        *,
        schema_only: bool = False,
        no_fel: bool = False,
        component_definition: dict[str, Any] | None = None,
        registry_documents: list[dict[str, Any]] | None = None,
    ) -> list[Any]:
        """Run linting passes and return sorted diagnostics."""
        ...


# ── MappingProcessor ────────────────────────────────────────────────


@runtime_checkable
class MappingProcessor(Protocol):
    """Bidirectional data mapping interface.

    Implementations:
    - ``MappingEngine`` — built-in rule-based mapper
    - (future) Rust/PyO3 backend
    """

    def forward(self, source_data: dict) -> dict:
        """Transform Formspec response data to external target format."""
        ...

    def reverse(self, target_data: dict) -> dict:
        """Transform external data back to Formspec response format."""
        ...


# ── Adapter ─────────────────────────────────────────────────────────
# The adapters already have an ABC in adapters/base.py.
# This protocol mirrors it for structural typing (no ABC inheritance needed).


@runtime_checkable
class DataAdapter(Protocol):
    """Wire format serializer/deserializer interface.

    Implementations:
    - ``JsonAdapter``, ``XmlAdapter``, ``CsvAdapter`` — built-in adapters
    - (future) Rust/PyO3 backend
    """

    def serialize(self, value: Any) -> bytes:
        """Encode a value tree to wire-format bytes."""
        ...

    def deserialize(self, data: bytes) -> Any:
        """Decode wire-format bytes into a value tree."""
        ...
