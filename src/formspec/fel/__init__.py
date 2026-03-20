"""Public FEL runtime API for Python.

The Python package now exposes the Rust-backed runtime contract rather than the
legacy parser/evaluator internals. Parsing returns an opaque handle used only
for syntax validation; evaluation and dependency extraction remain the primary
entry points.
"""

from __future__ import annotations

from .keywords import RESERVED_WORDS
from .metadata import BUILTIN_NAMES, builtin_function_catalog
from .runtime import (
    DependencySet,
    EvalResult,
    FelRuntime,
    ParsedExpression,
    RustFelRuntime,
    default_fel_runtime,
)
from .types import (
    FelArray,
    FelBoolean,
    FelDate,
    FelFalse,
    FelMoney,
    FelNull,
    FelNumber,
    FelObject,
    FelString,
    FelTrue,
    FelValue,
    fel_bool,
    from_python,
    is_null,
    to_python,
    typeof,
)
from .errors import (
    Diagnostic,
    FelDefinitionError,
    FelError,
    FelEvaluationError,
    FelSyntaxError,
    Severity,
    SourcePos,
)

__version__ = "1.0.0"


def parse(source: str) -> ParsedExpression:
    """Validate FEL syntax and return an opaque parsed handle."""

    return default_fel_runtime().parse(source)


def evaluate(
    source: str,
    data: dict | None = None,
    *,
    instances: dict[str, dict] | None = None,
    mip_states: dict[str, object] | None = None,
    extensions: dict[str, object] | None = None,
    variables: dict[str, FelValue] | None = None,
) -> EvalResult:
    """Evaluate a FEL expression through the Rust runtime."""

    return default_fel_runtime().evaluate(
        source,
        data,
        instances=instances,
        mip_states=mip_states,
        extensions=extensions,
        variables=variables,
    )


def extract_dependencies(source: str) -> DependencySet:
    """Extract static dependencies from a FEL expression."""

    return default_fel_runtime().extract_dependencies(source)


__all__ = [
    "BUILTIN_NAMES",
    "DependencySet",
    "Diagnostic",
    "EvalResult",
    "FelArray",
    "FelBoolean",
    "FelDate",
    "FelDefinitionError",
    "FelError",
    "FelEvaluationError",
    "FelFalse",
    "FelMoney",
    "FelNull",
    "FelNumber",
    "FelObject",
    "FelRuntime",
    "FelString",
    "FelSyntaxError",
    "FelTrue",
    "FelValue",
    "ParsedExpression",
    "RESERVED_WORDS",
    "RustFelRuntime",
    "Severity",
    "SourcePos",
    "builtin_function_catalog",
    "default_fel_runtime",
    "evaluate",
    "extract_dependencies",
    "fel_bool",
    "from_python",
    "is_null",
    "parse",
    "to_python",
    "typeof",
]
