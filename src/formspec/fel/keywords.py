"""Reserved FEL keywords mirrored from the Rust parser contract."""

from __future__ import annotations


RESERVED_WORDS: frozenset[str] = frozenset(
    {
        "true",
        "false",
        "null",
        "and",
        "or",
        "not",
        "in",
        "if",
        "then",
        "else",
        "let",
    }
)
