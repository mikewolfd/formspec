"""Legacy extension hook retained only to emit the decommissioned contract."""

from __future__ import annotations

from .errors import FelDefinitionError
from .keywords import RESERVED_WORDS
from .metadata import BUILTIN_NAMES


_PROHIBITED_NAMES: frozenset[str] = RESERVED_WORDS | BUILTIN_NAMES


def register_extension(
    registry: dict[str, object],
    name: str,
    impl,
    min_args: int,
    max_args: int | None = None,
) -> None:
    """Reject dynamic Python extensions now that Rust is the only FEL backend."""

    if name in _PROHIBITED_NAMES:
        raise FelDefinitionError(
            f"Extension function name '{name}' collides with a reserved word or built-in function"
        )
    raise NotImplementedError(
        "Dynamic Python FEL extensions were removed with the pure-Python evaluator. "
        "Add extension functions in Rust instead."
    )
