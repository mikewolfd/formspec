"""FEL abstract syntax tree — frozen dataclass nodes produced by the parser, consumed by the evaluator.

Three categories: path segments (Dot/Index/Wildcard), expression nodes (literals,
refs, operators, calls, bindings), and the ``Expr`` union type.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Union

from .errors import SourcePos

# ---------------------------------------------------------------------------
# Path segments (used in FieldRef and postfix access)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class DotSegment:
    """Dot-notation path segment (``.name``)."""
    name: str

@dataclass(frozen=True)
class IndexSegment:
    """Bracket-index path segment (``[n]``, 1-based per FEL spec)."""
    index: int

@dataclass(frozen=True)
class WildcardSegment:
    """Wildcard projection segment (``[*]``) — broadcasts over array elements."""
    pass

PathSegment = Union[DotSegment, IndexSegment, WildcardSegment]
"""Union of all path segment types used in field references."""

# ---------------------------------------------------------------------------
# Expression nodes
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class NumberLiteral:
    """Numeric literal node (``42``, ``3.14``, ``1e10``)."""
    value: Decimal
    pos: SourcePos

@dataclass(frozen=True)
class StringLiteral:
    """String literal node — escape sequences already resolved by the parser."""
    value: str
    pos: SourcePos

@dataclass(frozen=True)
class BooleanLiteral:
    """Boolean literal node (``true`` / ``false``)."""
    value: bool
    pos: SourcePos

@dataclass(frozen=True)
class NullLiteral:
    """The ``null`` literal node."""
    pos: SourcePos

@dataclass(frozen=True)
class DateLiteral:
    """Date/datetime literal (``@2024-01-15``) — the ``@`` prefix distinguishes from context refs."""
    value: Union[date, datetime]
    pos: SourcePos

@dataclass(frozen=True)
class ArrayLiteral:
    """Array literal node (``[expr, ...]``)."""
    elements: tuple  # tuple[Expr, ...]
    pos: SourcePos

@dataclass(frozen=True)
class ObjectLiteral:
    """Object literal node (``{key: expr, ...}``) — duplicate keys rejected at parse time."""
    entries: tuple  # tuple[tuple[str, Expr], ...]
    pos: SourcePos

@dataclass(frozen=True)
class FieldRef:
    """Field reference (``$x.y``, ``$x[1]``, ``$x[*].y``). Empty segments = bare ``$`` (self-ref)."""
    segments: tuple  # tuple[PathSegment, ...]
    pos: SourcePos

@dataclass(frozen=True)
class ContextRef:
    """Context reference (``@current``, ``@index``, ``@instance('name').field``)."""
    name: str
    arg: Union[str, None]  # string argument for @instance('name')
    tail: tuple  # tuple[str, ...]  -- dot-chained identifiers
    pos: SourcePos

@dataclass(frozen=True)
class UnaryOp:
    """Unary operator node (``not`` or unary ``-``)."""
    op: str  # 'not' or '-'
    operand: object  # Expr
    pos: SourcePos

@dataclass(frozen=True)
class BinaryOp:
    """Binary operator node — arithmetic, comparison, concatenation (&), null coalescing (??), logical."""
    op: str  # +, -, *, /, %, &, =, !=, <, >, <=, >=, ??, and, or
    left: object  # Expr
    right: object  # Expr
    pos: SourcePos

@dataclass(frozen=True)
class TernaryOp:
    """Ternary conditional (``cond ? then : else``)."""
    condition: object  # Expr
    then_expr: object  # Expr
    else_expr: object  # Expr
    pos: SourcePos

@dataclass(frozen=True)
class IfThenElse:
    """Keyword conditional (``if cond then expr else expr``) — semantically identical to TernaryOp."""
    condition: object  # Expr
    then_expr: object  # Expr
    else_expr: object  # Expr
    pos: SourcePos

@dataclass(frozen=True)
class LetBinding:
    """Scoped variable binding (``let name = expr in body``)."""
    name: str
    value: object  # Expr
    body: object  # Expr
    pos: SourcePos

@dataclass(frozen=True)
class FunctionCall:
    """Function call node — also used for the ``if(cond, then, else)`` special form."""
    name: str
    args: tuple  # tuple[Expr, ...]
    pos: SourcePos

@dataclass(frozen=True)
class MembershipOp:
    """Membership test (``value in array`` / ``value not in array``)."""
    value: object  # Expr
    container: object  # Expr
    negated: bool
    pos: SourcePos

@dataclass(frozen=True)
class PostfixAccess:
    """Postfix path access on an expression result (``func().field``, ``expr[1].name``)."""
    expr: object  # Expr
    segments: tuple  # tuple[PathSegment, ...]
    pos: SourcePos


# Union type for all expression nodes
Expr = Union[
    NumberLiteral, StringLiteral, BooleanLiteral, NullLiteral, DateLiteral,
    ArrayLiteral, ObjectLiteral, FieldRef, ContextRef,
    UnaryOp, BinaryOp, TernaryOp, IfThenElse, LetBinding,
    FunctionCall, MembershipOp, PostfixAccess,
]
"""Union type covering all FEL expression AST nodes."""
