"""Tests for FEL public API, dependencies, extensions, conformance."""

import pytest
from decimal import Decimal

import fel
from fel import (
    parse, evaluate, extract_dependencies,
    FelNull, FelNumber, FelString, FelTrue, FelFalse,
    is_null, EvalResult, DependencySet,
)
from fel.errors import FelSyntaxError, FelDefinitionError
from fel.extensions import register_extension
from fel.functions import build_default_registry, BUILTIN_NAMES
from fel.parser import RESERVED_WORDS


class TestPublicAPI:
    def test_parse_returns_ast(self):
        ast = parse('1 + 2')
        from fel.ast_nodes import BinaryOp
        assert isinstance(ast, BinaryOp)

    def test_evaluate_returns_eval_result(self):
        r = evaluate('1 + 2')
        assert isinstance(r, EvalResult)
        assert isinstance(r.value, FelNumber)
        assert r.diagnostics == []

    def test_evaluate_with_data(self):
        r = evaluate('$x + $y', {'x': 10, 'y': 20})
        assert r.value.value == Decimal('30')

    def test_evaluate_with_instances(self):
        r = evaluate(
            "@instance('prior').income",
            instances={'prior': {'income': 50000}}
        )
        assert r.value.value == Decimal('50000')

    def test_extract_dependencies_returns_set(self):
        d = extract_dependencies('$a + $b.c')
        assert isinstance(d, DependencySet)
        assert d.fields == {'a', 'b.c'}


class TestDependencies:
    def test_simple_fields(self):
        d = extract_dependencies('$price * $quantity')
        assert d.fields == {'price', 'quantity'}

    def test_nested_fields(self):
        d = extract_dependencies('$address.city')
        assert d.fields == {'address.city'}

    def test_wildcard_detected(self):
        d = extract_dependencies('sum($items[*].amount)')
        assert d.has_wildcard
        assert 'items.amount' in d.fields

    def test_context_ref(self):
        d = extract_dependencies('@current.amount')
        assert '@current' in d.context_refs

    def test_instance_ref(self):
        d = extract_dependencies("@instance('prior').income")
        assert 'prior' in d.instance_refs

    def test_self_ref(self):
        d = extract_dependencies('$ > 0')
        assert d.has_self_ref

    def test_let_binding_excluded(self):
        d = extract_dependencies('let x = $a in x + $b')
        assert d.fields == {'a', 'b'}

    def test_mip_deps(self):
        d = extract_dependencies('valid($ein)')
        assert 'ein' in d.mip_deps

    def test_prev_next_flag(self):
        d = extract_dependencies('prev()')
        assert d.uses_prev_next


class TestExtensions:
    def test_register_extension(self):
        reg = build_default_registry()
        def bmi(w, h):
            return FelNumber((w.value / ((h.value / 100) ** 2)).quantize(Decimal('0.1')))
        register_extension(reg, 'bmi', bmi, 2, 2)
        assert 'bmi' in reg

    def test_extension_name_collision_reserved(self):
        reg = build_default_registry()
        with pytest.raises(FelDefinitionError, match='collides'):
            register_extension(reg, 'and', lambda: None, 0)

    def test_extension_name_collision_builtin(self):
        reg = build_default_registry()
        with pytest.raises(FelDefinitionError, match='collides'):
            register_extension(reg, 'sum', lambda: None, 1)

    def test_extension_function_called(self):
        from fel.functions import FuncDef
        def double(x):
            return FelNumber(x.value * 2)
        ext = {'double': FuncDef('double', double, 1, 1, True, False)}
        r = evaluate('double(21)', extensions=ext)
        assert r.value.value == Decimal('42')


class TestConformanceGrammar:
    """Conformance points from fel-grammar.md §7."""

    def test_point1_accept_valid(self):
        """MUST accept all valid expressions."""
        valid = [
            '42', "'hello'", 'true', 'false', 'null',
            '$x + $y', '$a and $b', 'not $flag',
            'if(true, 1, 2)', "if $a then 'y' else 'n'",
            'let x = 1 in x + 2',
            "$x ?? 0", "'a' & 'b'",
            '$items[*].amount', '$items[1].name',
            '@current.amount', '@index', '@count',
            "@instance('x').field",
            '@2025-07-10', '@2025-07-10T14:30:00Z',
            'sum($a)', 'today()', 'round($x, 2)',
            '{a: 1, b: 2}', '[1, 2, 3]',
            '$x in [1, 2]', '$x not in [1, 2]',
            'prev().field', 'parent().total',
        ]
        for expr in valid:
            parse(expr)  # Should not raise

    def test_point2_reject_invalid(self):
        """MUST reject invalid input with diagnostic."""
        invalid = [
            '', '+ +', '1 1', '(()', '}}',
        ]
        for expr in invalid:
            with pytest.raises(FelSyntaxError):
                parse(expr)

    def test_point3_whitespace_insignificant(self):
        assert parse('1+2').op == parse('  1  +  2  ').op

    def test_point4_escape_sequences(self):
        assert parse(r"'\n'").value == '\n'
        assert parse(r"'\t'").value == '\t'
        assert parse(r"'\\'").value == '\\'
        with pytest.raises(FelSyntaxError):
            parse(r"'\a'")

    def test_point5_reserved_words_not_function_names(self):
        for word in RESERVED_WORDS:
            if word in ('true', 'false', 'null', 'if'):
                continue  # These have special handling
            with pytest.raises(FelSyntaxError):
                parse(f'{word}()')

    def test_point6_pipe_rejected(self):
        with pytest.raises(FelSyntaxError, match='reserved for future'):
            parse('$a |> $b')

    def test_point7_precedence_preserved(self):
        ast = parse('1 + 2 * 3')
        from fel.ast_nodes import BinaryOp
        assert ast.op == '+'
        assert ast.right.op == '*'


class TestConformanceSemantics:
    """Semantic conformance from spec.md §3."""

    def test_no_implicit_coercion(self):
        """Type mismatches produce errors, not coercions."""
        r = evaluate("'hello' + 5")
        assert is_null(r.value)
        assert len(r.diagnostics) >= 1

    def test_division_by_zero_null(self):
        r = evaluate('1 / 0')
        assert is_null(r.value)
        assert any('zero' in d.message.lower() for d in r.diagnostics)

    def test_short_circuit_and(self):
        """false and <error> should not evaluate right side."""
        r = evaluate("false and ('x' + 1 = 2)")
        assert r.value.value is False
        assert len(r.diagnostics) == 0  # No type error

    def test_short_circuit_or(self):
        r = evaluate("true or ('x' + 1 = 2)")
        assert r.value.value is True
        assert len(r.diagnostics) == 0

    def test_null_equals_null_true(self):
        assert evaluate('null = null').value is FelTrue

    def test_null_not_truthy(self):
        """0 is not false, '' is not false, null is not false."""
        r = evaluate('0 and true')
        assert is_null(r.value)  # Type error: 0 is not boolean


class TestSpecExamples:
    """Examples directly from spec.md §3."""

    def test_field_ref_example(self):
        assert evaluate('$firstName', {'firstName': 'Ada'}).value.value == 'Ada'

    def test_nested_field_ref(self):
        data = {'demographics': {'dob': '1815-12-10'}}
        assert evaluate('$demographics.dob', data).value.value == '1815-12-10'

    def test_string_concat_example(self):
        data = {'firstName': 'Ada', 'lastName': 'Lovelace'}
        r = evaluate("$firstName & ' ' & $lastName", data)
        assert r.value.value == 'Ada Lovelace'

    def test_null_coalesce_example(self):
        r = evaluate("$middleName ?? 'N/A'", {'middleName': None})
        assert r.value.value == 'N/A'

    def test_membership_example(self):
        r = evaluate("$status in ['active', 'pending']", {'status': 'active'})
        assert r.value is FelTrue

    def test_if_function_example(self):
        data = {'a': True}
        r = evaluate("if($a, 'yes', 'no')", data)
        assert r.value.value == 'yes'

    def test_line_item_sum(self):
        data = {'lineItems': [
            {'quantity': 2, 'unitPrice': 10.00},
            {'quantity': 5, 'unitPrice': 3.50},
            {'quantity': 1, 'unitPrice': 25.00},
        ]}
        r = evaluate(
            'sum($lineItems[*].quantity * $lineItems[*].unitPrice)',
            data
        )
        assert r.value.value == Decimal('62.5')

    def test_today_returns_date(self):
        from datetime import date
        from fel import FelDate
        r = evaluate('today()')
        assert isinstance(r.value, FelDate)

    def test_decimal_precision(self):
        """0.1 + 0.2 = 0.3 (spec §3.4.1 rationale)."""
        r = evaluate('0.1 + 0.2')
        assert r.value.value == Decimal('0.3')
