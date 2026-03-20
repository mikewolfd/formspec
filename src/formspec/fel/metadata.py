"""Rust-exported FEL metadata surfaced to Python consumers."""

from __future__ import annotations

from .runtime import builtin_function_catalog as _builtin_function_catalog


def builtin_function_catalog() -> list[dict[str, str]]:
    """Return builtin FEL function metadata from Rust."""

    return _builtin_function_catalog()


BUILTIN_NAMES: frozenset[str] = frozenset(
    entry["name"] for entry in builtin_function_catalog()
)
