"""Mapping DSL transform implementations (§4).

Each transform is a function:
    (source_value, rule, context) -> target_value

Where context provides access to the full source document and FEL evaluation.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from ..fel import parse, Evaluator, Environment, build_default_registry
from ..fel.types import to_python, from_python, FelNull, is_null


class TransformContext:
    """Shared context passed to all transform functions."""

    def __init__(self, source_data: dict, target_data: dict | None = None):
        self.source_data = source_data
        self.target_data = target_data or {}

    def eval_fel(self, expression: str, dollar_value: Any = None) -> Any:
        """Evaluate a FEL expression with $ bound to dollar_value and @source to source_data."""
        data = dict(self.source_data) if self.source_data else {}
        data['source'] = self.source_data
        if self.target_data:
            data['target'] = self.target_data
        env = Environment(data=data)
        # Bind $ (bare field ref with empty path) to the source value via let-scope
        if dollar_value is not None:
            env.push_scope({'': from_python(dollar_value)})
        functions = build_default_registry()
        ev = Evaluator(env, functions)
        ast_node = parse(expression)
        result = ev.evaluate(ast_node)
        if dollar_value is not None:
            env.pop_scope()
        return to_python(result)


def transform_preserve(value: Any, rule: dict, ctx: TransformContext) -> Any:
    """§4.2 Preserve — copy source value unchanged."""
    if value is None and 'default' in rule:
        return rule['default']
    return value


def transform_drop(value: Any, rule: dict, ctx: TransformContext) -> Any:
    """§4.3 Drop — discard the value (returns sentinel)."""
    return _DROP_SENTINEL


def transform_expression(value: Any, rule: dict, ctx: TransformContext) -> Any:
    """§4.4 Expression — evaluate FEL expression."""
    expr = rule.get('expression', '')
    result = ctx.eval_fel(expr, dollar_value=value)
    if result is None and 'default' in rule:
        return rule['default']
    return result


def transform_coerce(value: Any, rule: dict, ctx: TransformContext) -> Any:
    """§4.5 Coerce — type conversion."""
    if value is None and 'default' in rule:
        return rule['default']
    if value is None:
        return None

    coerce_spec = rule.get('coerce', {})
    if isinstance(coerce_spec, str):
        target_type = coerce_spec
    else:
        target_type = coerce_spec.get('to', 'string')

    return _coerce_value(value, target_type)


def _coerce_value(value: Any, target_type: str) -> Any:
    """Coerce a value to the target type."""
    if target_type == 'string':
        if isinstance(value, bool):
            return 'true' if value else 'false'
        return str(value)
    elif target_type == 'number':
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    elif target_type == 'integer':
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None
    elif target_type == 'boolean':
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ('true', '1', 'yes')
        return bool(value)
    elif target_type == 'date':
        if isinstance(value, (date, datetime)):
            return value.isoformat()
        if isinstance(value, str):
            return value  # Pass through date strings
        return str(value)
    elif target_type == 'array':
        if isinstance(value, list):
            return value
        return [value]
    elif target_type == 'object':
        if isinstance(value, dict):
            return value
        return {'value': value}
    return value


def transform_value_map(value: Any, rule: dict, ctx: TransformContext) -> Any:
    """§4.6 ValueMap — lookup table translation."""
    if value is None and 'default' in rule:
        return rule['default']

    vm = rule.get('valueMap', {})

    # Normalize: shorthand flat object vs full form
    if 'forward' in vm:
        lookup = vm['forward']
        unmapped = vm.get('unmapped', 'error')
        default = vm.get('default')
    else:
        lookup = vm
        unmapped = 'error'
        default = None

    key = str(value) if value is not None else None
    if key in lookup:
        return lookup[key]

    # Unmapped handling
    if unmapped == 'passthrough':
        return value
    elif unmapped == 'drop':
        return _DROP_SENTINEL
    elif unmapped == 'default':
        return default
    elif unmapped == 'error':
        raise ValueError(f"No mapping found for value '{value}' in valueMap")
    return value


def transform_flatten(value: Any, rule: dict, ctx: TransformContext) -> Any:
    """§4.7 Flatten — convert nested object to flat string."""
    if value is None:
        return rule.get('default')
    separator = rule.get('separator', '.')
    if isinstance(value, dict):
        parts = []
        _flatten_dict(value, parts, separator)
        return separator.join(parts)
    if isinstance(value, list):
        return separator.join(str(v) for v in value)
    return str(value)


def _flatten_dict(obj: dict, parts: list, sep: str, prefix: str = '') -> None:
    for key, val in obj.items():
        full_key = f"{prefix}{sep}{key}" if prefix else key
        if isinstance(val, dict):
            _flatten_dict(val, parts, sep, full_key)
        else:
            parts.append(f"{full_key}={val}")


def transform_nest(value: Any, rule: dict, ctx: TransformContext) -> Any:
    """§4.8 Nest — convert flat string to nested object."""
    if value is None:
        return rule.get('default')
    separator = rule.get('separator', '.')
    if isinstance(value, str):
        # Split path and nest
        parts = value.split(separator)
        if len(parts) == 1:
            return value
        result = {}
        current = result
        for i, part in enumerate(parts[:-1]):
            current[part] = {}
            current = current[part]
        current[parts[-1]] = True  # leaf marker
        return result
    return value


def transform_constant(value: Any, rule: dict, ctx: TransformContext) -> Any:
    """§4.9 Constant — evaluate expression, ignoring source value."""
    expr = rule.get('expression', '')
    return ctx.eval_fel(expr)


def transform_concat(value: Any, rule: dict, ctx: TransformContext) -> Any:
    """§4.10 Concat — evaluate expression (expected to produce concatenated string)."""
    expr = rule.get('expression', '')
    return ctx.eval_fel(expr, dollar_value=value)


def transform_split(value: Any, rule: dict, ctx: TransformContext) -> Any:
    """§4.11 Split — evaluate expression (expected to split value into parts)."""
    expr = rule.get('expression', '')
    return ctx.eval_fel(expr, dollar_value=value)


# Sentinel for "drop this field entirely"
class _DropSentinel:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __repr__(self):
        return '<DROP>'


_DROP_SENTINEL = _DropSentinel()

# Registry mapping transform type name -> function
TRANSFORMS = {
    'preserve': transform_preserve,
    'drop': transform_drop,
    'expression': transform_expression,
    'coerce': transform_coerce,
    'valueMap': transform_value_map,
    'flatten': transform_flatten,
    'nest': transform_nest,
    'constant': transform_constant,
    'concat': transform_concat,
    'split': transform_split,
}
