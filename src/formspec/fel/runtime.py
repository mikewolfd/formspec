"""FEL runtime protocol — abstraction layer for swappable FEL backends.

Defines Protocol classes that both the built-in Python FEL implementation and
future Rust/PyO3 implementations can satisfy, enabling seamless backend swaps
while keeping the same test infrastructure and consumer code.

Usage::

    from formspec.fel.runtime import FelRuntime, default_fel_runtime

    # Use the default (Python) runtime
    rt = default_fel_runtime()
    result = rt.evaluate("1 + 2", {"x": 10})

    # Or inject a custom runtime (e.g. Rust/PyO3)
    evaluator = DefinitionEvaluator(definition, fel_runtime=custom_runtime)
"""

from __future__ import annotations

from typing import Any, Callable, Protocol, runtime_checkable

from .evaluator import EvalResult
from .dependencies import DependencySet
from .types import FelValue


@runtime_checkable
class FelRuntime(Protocol):
    """Pluggable FEL runtime — the single abstraction consumers depend on.

    Implementations:
    - ``DefaultFelRuntime`` — built-in Python parser + evaluator
    - (future) Rust/PyO3 backend
    """

    def parse(self, source: str) -> Any:
        """Parse a FEL expression into an AST (opaque to consumers).

        Raises:
            FelSyntaxError: If the expression cannot be parsed.
        """
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
        """Parse and evaluate a FEL expression in one call.

        Raises:
            FelSyntaxError: If the expression cannot be parsed.
        """
        ...

    def extract_dependencies(self, source: str) -> DependencySet:
        """Parse and statically extract all referenced dependencies.

        Raises:
            FelSyntaxError: If the expression cannot be parsed.
        """
        ...

    def register_function(
        self,
        name: str,
        impl: Callable,
        meta: dict | None = None,
    ) -> None:
        """Register an extension function into the runtime.

        Spec S3.12, S8.1: runtime-extensible function catalog.
        """
        ...


class DefaultFelRuntime:
    """FEL runtime backed by the built-in Python parser and evaluator."""

    def __init__(self) -> None:
        self._extension_functions: dict[str, Callable] = {}

    def register_function(
        self,
        name: str,
        impl: Callable,
        meta: dict | None = None,
    ) -> None:
        """Register an extension function into the runtime."""
        self._extension_functions[name] = impl

    def parse(self, source: str) -> Any:
        from .parser import parse as _parse
        return _parse(source)

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
        from .parser import parse as _parse
        from .evaluator import Evaluator
        from .environment import Environment
        from .functions import build_default_registry

        ast = _parse(source)
        env = Environment(
            data=data,
            instances=instances,
            mip_states=mip_states,
            variables=variables,
        )
        functions = build_default_registry()
        if self._extension_functions:
            functions.update(self._extension_functions)
        if extensions:
            functions.update(extensions)
        ev = Evaluator(env, functions)
        value = ev.evaluate(ast)
        return EvalResult(value=value, diagnostics=ev.diagnostics)

    def extract_dependencies(self, source: str) -> DependencySet:
        from .parser import parse as _parse
        from .dependencies import extract_dependencies as _extract

        ast = _parse(source)
        return _extract(ast)


# Singleton
_default_runtime: DefaultFelRuntime | None = None


def default_fel_runtime() -> DefaultFelRuntime:
    """Return the shared default FEL runtime instance."""
    global _default_runtime
    if _default_runtime is None:
        _default_runtime = DefaultFelRuntime()
    return _default_runtime
