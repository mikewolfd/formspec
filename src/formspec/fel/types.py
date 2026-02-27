"""FEL runtime value types — frozen dataclass wrappers for every value the evaluator can produce.

Decimal-backed numerics with banker's rounding, singleton null/boolean, and
from_python/to_python for bridging JSON-native Python values to the FEL type system.
"""

from __future__ import annotations

import decimal
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Union

# Configure decimal context: 34-digit precision, banker's rounding
_FEL_CONTEXT = decimal.Context(prec=34, rounding=decimal.ROUND_HALF_EVEN)


def fel_decimal(value) -> Decimal:
    """Create a Decimal under the FEL arithmetic context (34-digit, ROUND_HALF_EVEN)."""
    if isinstance(value, Decimal):
        return value
    return _FEL_CONTEXT.create_decimal(value)


class _FelNullType:
    """Singleton null type — the only instance is the module-level ``FelNull`` constant."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __repr__(self):
        return 'FelNull'

    def __bool__(self):
        return False


FelNull = _FelNullType()
"""The singleton FEL null value. Use ``is_null(val)`` for type-safe null checks."""


@dataclass(frozen=True)
class FelNumber:
    """Decimal-backed numeric value — all FEL arithmetic uses this wrapper."""
    value: Decimal

    def __repr__(self):
        return f'FelNumber({self.value})'


@dataclass(frozen=True)
class FelString:
    """FEL string value wrapper."""
    value: str

    def __repr__(self):
        return f'FelString({self.value!r})'


@dataclass(frozen=True)
class FelBoolean:
    """FEL boolean — use the ``FelTrue``/``FelFalse`` singletons, not the constructor."""
    value: bool

    def __repr__(self):
        return f'FelBoolean({self.value})'


FelTrue = FelBoolean(True)
"""Singleton true boolean. Use ``is FelTrue`` for identity checks."""

FelFalse = FelBoolean(False)
"""Singleton false boolean. Use ``is FelFalse`` for identity checks."""


def fel_bool(val: bool) -> FelBoolean:
    """Map a Python bool to the ``FelTrue``/``FelFalse`` singleton."""
    return FelTrue if val else FelFalse


@dataclass(frozen=True)
class FelDate:
    """FEL date/datetime value — both map to the single FEL 'date' type."""
    value: Union[date, datetime]

    def __repr__(self):
        return f'FelDate({self.value})'


@dataclass(frozen=True)
class FelArray:
    """Immutable ordered sequence of FelValues, backed by a tuple."""
    elements: tuple

    def __repr__(self):
        return f'FelArray({list(self.elements)})'

    def __len__(self):
        return len(self.elements)


@dataclass(frozen=True)
class FelMoney:
    """Monetary amount with ISO 4217 currency code (e.g. ``FelMoney(Decimal('100'), 'USD')``)."""
    amount: Decimal
    currency: str

    def __repr__(self):
        return f'FelMoney({self.amount}, {self.currency!r})'


@dataclass(frozen=True)
class FelObject:
    """Internal structured value for repeat row contexts and @instance() data — not first-class in FEL."""
    fields: dict

    def __repr__(self):
        return f'FelObject({self.fields})'


FelValue = Union[
    _FelNullType, FelNumber, FelString, FelBoolean, FelDate,
    FelArray, FelMoney, FelObject,
]
"""Union type covering all possible FEL runtime values."""


def typeof(val: FelValue) -> str:
    """Return the spec-defined type name for a FEL value ('number', 'string', 'null', etc.)."""
    if isinstance(val, _FelNullType):
        return 'null'
    if isinstance(val, FelNumber):
        return 'number'
    if isinstance(val, FelString):
        return 'string'
    if isinstance(val, FelBoolean):
        return 'boolean'
    if isinstance(val, FelDate):
        return 'date'
    if isinstance(val, FelArray):
        return 'array'
    if isinstance(val, FelMoney):
        return 'money'
    if isinstance(val, FelObject):
        return 'object'
    return 'unknown'


def is_null(val) -> bool:
    """Test whether a value is the FelNull singleton."""
    return isinstance(val, _FelNullType)


def to_python(val: FelValue):
    """Convert a FelValue to a JSON-serializable Python native (None, Decimal, str, bool, list, dict).

    Dates become ISO 8601 strings; money becomes ``{'amount': str, 'currency': str}``.
    """
    if is_null(val):
        return None
    if isinstance(val, FelNumber):
        return val.value
    if isinstance(val, FelString):
        return val.value
    if isinstance(val, FelBoolean):
        return val.value
    if isinstance(val, FelDate):
        return val.value.isoformat()
    if isinstance(val, FelArray):
        return [to_python(e) for e in val.elements]
    if isinstance(val, FelMoney):
        return {'amount': str(val.amount), 'currency': val.currency}
    if isinstance(val, FelObject):
        return {k: to_python(v) for k, v in val.fields.items()}
    return val


def from_python(val) -> FelValue:
    """Convert a JSON-native Python value to its FelValue equivalent.

    Auto-detects money dicts (exactly ``{'amount', 'currency'}``).
    Bool is checked before int to avoid Python's bool-is-int trap.
    Returns FelNull for unsupported types.
    """
    if val is None:
        return FelNull
    if isinstance(val, bool):
        return FelTrue if val else FelFalse
    if isinstance(val, (int, float)):
        return FelNumber(fel_decimal(val))
    if isinstance(val, Decimal):
        return FelNumber(val)
    if isinstance(val, str):
        return FelString(val)
    if isinstance(val, datetime):
        return FelDate(val)
    if isinstance(val, date):
        return FelDate(val)
    if isinstance(val, (list, tuple)):
        return FelArray(tuple(from_python(e) for e in val))
    if isinstance(val, dict):
        # Check if it's a money value
        if 'amount' in val and 'currency' in val and len(val) == 2:
            try:
                return FelMoney(fel_decimal(val['amount']), val['currency'])
            except (decimal.InvalidOperation, TypeError, ValueError):
                pass  # Fall through to object
        return FelObject({k: from_python(v) for k, v in val.items()})
    return FelNull
