"""Registration of user-defined extension functions into a FEL function registry.

Extensions are always null-propagating, never special-forms, and cannot shadow
reserved words or built-in names. This is the sole entry point for adding custom
functions to the evaluator.
"""

from __future__ import annotations

from .errors import FelDefinitionError
from .functions import FuncDef, BUILTIN_NAMES
from .parser import RESERVED_WORDS


_PROHIBITED_NAMES: frozenset[str] = RESERVED_WORDS | BUILTIN_NAMES
"""Union of parser reserved words and built-in function names that extensions cannot shadow."""


def register_extension(
    registry: dict[str, FuncDef],
    name: str,
    impl,
    min_args: int,
    max_args: int | None = None,
) -> None:
    """Add a user-defined function to a FEL registry, always null-propagating and non-special-form.

    Raises FelDefinitionError if ``name`` collides with a reserved word or built-in.
    ``impl`` receives pre-evaluated FelValue args and must return a FelValue.
    """
    if name in _PROHIBITED_NAMES:
        raise FelDefinitionError(
            f"Extension function name '{name}' collides with a "
            f"reserved word or built-in function"
        )
    registry[name] = FuncDef(
        name=name,
        impl=impl,
        min_args=min_args,
        max_args=max_args,
        propagate_null=True,
        special_form=False,
    )
