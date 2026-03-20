"""Rust-backed FEL runtime contract for Python.

The pure-Python parser/evaluator stack has been decommissioned. Python now
depends on the ``formspec_rust`` PyO3 module for FEL parsing, evaluation, and
dependency extraction.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol, runtime_checkable

import formspec_rust

from .errors import Diagnostic, FelSyntaxError, Severity
from .types import (
    FelArray,
    FelBoolean,
    FelDate,
    FelMoney,
    FelNumber,
    FelObject,
    FelString,
    FelValue,
    fel_decimal,
    from_python,
    is_null,
    to_python,
)


@dataclass(frozen=True, slots=True)
class ParsedExpression:
    """Opaque parsed FEL handle.

    The Rust backend validates syntax but does not expose an AST to Python.
    Consumers must treat this as an opaque token.
    """

    source: str


@dataclass(slots=True)
class EvalResult:
    """Value + diagnostics bundle returned by the FEL runtime."""

    value: FelValue
    diagnostics: list[Diagnostic] = field(default_factory=list)


@dataclass(slots=True)
class DependencySet:
    """Static references extracted from a FEL expression."""

    fields: set[str] = field(default_factory=set)
    instance_refs: set[str] = field(default_factory=set)
    context_refs: set[str] = field(default_factory=set)
    mip_deps: set[str] = field(default_factory=set)
    has_self_ref: bool = False
    has_wildcard: bool = False
    uses_prev_next: bool = False


@runtime_checkable
class FelRuntime(Protocol):
    """Pluggable FEL runtime interface."""

    def parse(self, source: str) -> ParsedExpression:
        ...

    def evaluate(
        self,
        source: str,
        data: dict | None = None,
        *,
        instances: dict[str, dict] | None = None,
        mip_states: dict[str, Any] | None = None,
        extensions: dict[str, Any] | None = None,
        variables: dict[str, FelValue] | None = None,
    ) -> EvalResult:
        ...

    def extract_dependencies(self, source: str) -> DependencySet:
        ...

    def register_function(self, name: str, impl: Any, meta: dict | None = None) -> None:
        ...


class RustFelRuntime:
    """FEL runtime backed by the mandatory ``formspec_rust`` module."""

    def register_function(self, name: str, impl: Any, meta: dict | None = None) -> None:
        raise NotImplementedError(
            "Dynamic Python FEL extensions were removed with the pure-Python evaluator. "
            "Use the Rust builtin catalog or add the function in Rust."
        )

    def parse(self, source: str) -> ParsedExpression:
        valid = formspec_rust.parse_fel(source)
        if not valid:
            raise FelSyntaxError(f"FEL parse error: {source!r}")
        return ParsedExpression(source=source)

    def evaluate(
        self,
        source: str,
        data: dict | None = None,
        *,
        instances: dict[str, dict] | None = None,
        mip_states: dict[str, Any] | None = None,
        extensions: dict[str, Any] | None = None,
        variables: dict[str, FelValue] | None = None,
    ) -> EvalResult:
        if extensions:
            raise NotImplementedError(
                "Dynamic Python FEL extensions are no longer supported by the Rust runtime."
            )

        payload = formspec_rust.eval_fel_detailed(
            source,
            data or {},
            instances or None,
            _serialize_mip_states(mip_states),
            _serialize_variables(data or {}, variables),
            datetime.now().isoformat(timespec="seconds"),
        )
        value = _deserialize_value(payload.get("value"))
        diagnostics = [
            Diagnostic(
                message=_normalize_diagnostic_message(str(raw.get("message", ""))),
                pos=None,
                severity=_severity_from_str(raw.get("severity")),
            )
            for raw in payload.get("diagnostics", [])
            if isinstance(raw, dict)
        ]
        return EvalResult(value=value, diagnostics=diagnostics)

    def extract_dependencies(self, source: str) -> DependencySet:
        raw = formspec_rust.extract_deps(source)
        return DependencySet(
            fields={field.replace("[*]", "") for field in raw.get("fields", [])},
            instance_refs=set(raw.get("instance_refs", [])),
            context_refs={_normalize_context_ref(ref) for ref in raw.get("context_refs", [])},
            mip_deps=set(raw.get("mip_deps", [])),
            has_self_ref=bool(raw.get("has_self_ref", False)),
            has_wildcard=bool(raw.get("has_wildcard", False)),
            uses_prev_next=bool(raw.get("uses_prev_next", False)),
        )


_default_runtime: RustFelRuntime | None = None


def default_fel_runtime() -> RustFelRuntime:
    """Return the shared Rust FEL runtime instance."""

    global _default_runtime
    if _default_runtime is None:
        _default_runtime = RustFelRuntime()
    return _default_runtime


def builtin_function_catalog() -> list[dict[str, str]]:
    """Return Rust-exported builtin function metadata."""

    return list(formspec_rust.list_builtin_functions())


def _serialize_variables(
    data: dict[str, Any],
    variables: dict[str, FelValue] | None,
) -> dict[str, Any] | None:
    serialized: dict[str, Any] = {}
    if variables:
        serialized.update(
            {
                name: _serialize_value(value)
                for name, value in variables.items()
            }
        )

    # Preserve the legacy Python behavior where @source/@target could be supplied
    # via the primary data payload.
    for contextual_name in ("source", "target"):
        if contextual_name in data and contextual_name not in serialized:
            serialized[contextual_name] = data[contextual_name]

    return serialized or None


def _serialize_mip_states(mip_states: dict[str, Any] | None) -> dict[str, dict[str, bool]] | None:
    if not mip_states:
        return None

    serialized: dict[str, dict[str, bool]] = {}
    for path, state in mip_states.items():
        if isinstance(state, dict):
            serialized[path] = {
                "valid": bool(state.get("valid", True)),
                "relevant": bool(state.get("relevant", True)),
                "readonly": bool(state.get("readonly", False)),
                "required": bool(state.get("required", False)),
            }
            continue
        serialized[path] = {
            "valid": bool(getattr(state, "valid", True)),
            "relevant": bool(getattr(state, "relevant", True)),
            "readonly": bool(getattr(state, "readonly", False)),
            "required": bool(getattr(state, "required", False)),
        }
    return serialized


def _severity_from_str(raw: str | None) -> Severity:
    match raw:
        case "warning":
            return Severity.WARNING
        case "info":
            return Severity.WARNING
        case _:
            return Severity.ERROR


def _serialize_value(value: Any) -> Any:
    if is_null(value) or isinstance(
        value,
        (FelNumber, FelString, FelBoolean, FelDate, FelArray, FelMoney, FelObject),
    ):
        return to_python(value)
    return value


def _deserialize_value(value: Any) -> FelValue:
    if isinstance(value, dict) and "__fel_type__" in value:
        tagged_type = value["__fel_type__"]
        if tagged_type == "number":
            return FelNumber(fel_decimal(value.get("value")))
        if tagged_type in {"date", "datetime"}:
            return from_python(_parse_iso_date_like(value.get("value")))
        if tagged_type == "money":
            return from_python(
                {
                    "amount": value.get("amount"),
                    "currency": value.get("currency"),
                }
            )
    if isinstance(value, list):
        return from_python([to_python(_deserialize_value(item)) for item in value])
    if isinstance(value, dict):
        return from_python({key: to_python(_deserialize_value(item)) for key, item in value.items()})
    return from_python(value)


def _parse_iso_date_like(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    if "T" in value:
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return value
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        return value


def _normalize_context_ref(ref: str) -> str:
    if "." in ref:
        return ref.split(".", 1)[0]
    return ref


def _normalize_diagnostic_message(message: str) -> str:
    if message.startswith("undefined function: "):
        return "Undefined function: " + message.split(": ", 1)[1]
    return message
