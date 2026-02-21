"""Tests for FEL built-in functions."""

import pytest
from decimal import Decimal
from datetime import date

from fel import evaluate, FelNull, FelNumber, FelString, FelArray, is_null


def val(expr, data=None):
    return evaluate(expr, data).value


def pv(expr, data=None):
    v = val(expr, data)
    if isinstance(v, FelNumber): return v.value
    if isinstance(v, FelString): return v.value
    from fel import FelBoolean, FelDate
    if isinstance(v, FelBoolean): return v.value
    if isinstance(v, FelDate): return v.value
    if is_null(v): return None
    return v


class TestAggregates:
    def test_sum_basic(self):
        assert pv('sum([1, 2, 3])') == Decimal('6')

    def test_sum_empty(self):
        assert pv('sum([])') == Decimal('0')

    def test_sum_nulls_skipped(self):
        assert pv('sum([1, null, 3])') == Decimal('4')

    def test_count_basic(self):
        assert pv('count([1, 2, 3])') == Decimal('3')

    def test_count_empty(self):
        assert pv('count([])') == Decimal('0')

    def test_count_skips_nulls(self):
        assert pv('count([1, null, 3])') == Decimal('2')

    def test_avg_basic(self):
        assert pv('avg([10, 20])') == Decimal('15')

    def test_avg_empty_is_null(self):
        """avg([]) signals error → null."""
        assert is_null(val('avg([])'))

    def test_avg_skips_nulls(self):
        assert pv('avg([null, 10, null, 20])') == Decimal('15')

    def test_min_basic(self):
        assert pv('min([3, 1, 2])') == Decimal('1')

    def test_min_empty_is_null(self):
        assert is_null(val('min([])'))

    def test_max_basic(self):
        assert pv('max([3, 1, 2])') == Decimal('3')

    def test_max_empty_is_null(self):
        assert is_null(val('max([])'))


class TestStringFunctions:
    def test_length(self):
        assert pv("length('hello')") == Decimal('5')

    def test_length_null(self):
        assert pv('length(null)') == Decimal('0')

    def test_contains(self):
        assert pv("contains('hello world', 'world')") is True

    def test_startsWith(self):
        assert pv("startsWith('hello', 'hel')") is True

    def test_endsWith(self):
        assert pv("endsWith('hello', 'llo')") is True

    def test_substring(self):
        assert pv("substring('hello', 2, 3)") == 'ell'

    def test_substring_no_length(self):
        assert pv("substring('hello', 2)") == 'ello'

    def test_replace(self):
        assert pv("replace('aXbXc', 'X', '-')") == 'a-b-c'

    def test_upper(self):
        assert pv("upper('hello')") == 'HELLO'

    def test_lower(self):
        assert pv("lower('HELLO')") == 'hello'

    def test_trim(self):
        assert pv("trim('  hi  ')") == 'hi'

    def test_matches(self):
        assert pv("matches('abc123', '[0-9]+')") is True

    def test_matches_no_match(self):
        assert pv("matches('abc', '^[0-9]+$')") is False

    def test_format(self):
        assert pv("format('{0} of {1}', 3, 10)") == '3 of 10'


class TestNumericFunctions:
    def test_round_default(self):
        assert pv('round(3.7)') == Decimal('4')

    def test_round_precision(self):
        assert pv('round(3.456, 2)') == Decimal('3.46')

    def test_round_bankers_even(self):
        """Banker's rounding: half rounds to even."""
        assert pv('round(2.5)') == Decimal('2')
        assert pv('round(3.5)') == Decimal('4')

    def test_floor(self):
        assert pv('floor(3.7)') == Decimal('3')

    def test_ceil(self):
        assert pv('ceil(3.2)') == Decimal('4')

    def test_abs(self):
        assert pv('abs(0 - 5)') == Decimal('5')

    def test_power(self):
        assert pv('power(2, 10)') == Decimal('1024')


class TestDateFunctions:
    def test_year(self):
        assert pv('year(@2025-07-10)') == Decimal('2025')

    def test_month(self):
        assert pv('month(@2025-07-10)') == Decimal('7')

    def test_day(self):
        assert pv('day(@2025-07-10)') == Decimal('10')

    def test_dateDiff_days(self):
        assert pv("dateDiff(@2025-01-10, @2025-01-01, 'days')") == Decimal('9')

    def test_dateDiff_years(self):
        assert pv("dateDiff(@2025-07-10, @2000-07-10, 'years')") == Decimal('25')

    def test_dateAdd_days(self):
        assert pv("dateAdd(@2025-01-01, 10, 'days')") == date(2025, 1, 11)

    def test_dateAdd_months_overflow(self):
        """Jan 31 + 1 month = Feb 28."""
        assert pv("dateAdd(@2025-01-31, 1, 'months')") == date(2025, 2, 28)

    def test_hours(self):
        assert pv("hours('14:30:00')") == Decimal('14')

    def test_minutes(self):
        assert pv("minutes('14:30:00')") == Decimal('30')

    def test_seconds(self):
        assert pv("seconds('14:30:00')") == Decimal('0')

    def test_time_construct(self):
        assert pv('time(14, 30, 0)') == '14:30:00'

    def test_timeDiff(self):
        assert pv("timeDiff('14:30:00', '13:00:00')") == Decimal('5400')


class TestLogicalFunctions:
    def test_if_true(self):
        assert pv("if(true, 'yes', 'no')") == 'yes'

    def test_if_false(self):
        assert pv("if(false, 'yes', 'no')") == 'no'

    def test_if_null_condition_error(self):
        r = evaluate('if(null, 1, 2)')
        assert is_null(r.value)
        assert len(r.diagnostics) >= 1

    def test_coalesce(self):
        assert pv('coalesce(null, null, 42)') == Decimal('42')

    def test_coalesce_all_null(self):
        assert is_null(val('coalesce(null, null)'))

    def test_empty_null(self):
        assert pv('empty(null)') is True

    def test_empty_string(self):
        assert pv("empty('')") is True

    def test_empty_array(self):
        assert pv('empty([])') is True

    def test_empty_non_empty(self):
        assert pv("empty('hi')") is False

    def test_present(self):
        assert pv("present('hi')") is True
        assert pv('present(null)') is False


class TestTypeFunctions:
    def test_isNumber(self):
        assert pv('isNumber(42)') is True
        assert pv("isNumber('x')") is False

    def test_isString(self):
        assert pv("isString('hello')") is True

    def test_isNull(self):
        assert pv('isNull(null)') is True
        assert pv('isNull(0)') is False

    def test_typeOf(self):
        assert pv('typeOf(42)') == 'number'
        assert pv("typeOf('x')") == 'string'
        assert pv('typeOf(true)') == 'boolean'
        assert pv('typeOf(null)') == 'null'


class TestCastFunctions:
    def test_number_from_string(self):
        assert pv("number('42')") == Decimal('42')

    def test_number_from_bool(self):
        assert pv('number(true)') == Decimal('1')
        assert pv('number(false)') == Decimal('0')

    def test_number_from_null(self):
        assert is_null(val('number(null)'))

    def test_string_from_number(self):
        assert pv('string(42)') == '42'

    def test_string_from_bool(self):
        assert pv('string(true)') == 'true'

    def test_string_from_null(self):
        """string(null) → '' (not null)."""
        assert pv('string(null)') == ''

    def test_boolean_from_string(self):
        assert pv("boolean('true')") is True
        assert pv("boolean('false')") is False

    def test_boolean_from_number(self):
        assert pv('boolean(0)') is False
        assert pv('boolean(1)') is True

    def test_boolean_from_null(self):
        assert pv('boolean(null)') is False

    def test_date_from_string(self):
        assert pv("date('2025-07-10')") == date(2025, 7, 10)

    def test_date_from_null(self):
        assert is_null(val('date(null)'))


class TestMoneyFunctions:
    def test_money_construct(self):
        from fel import FelMoney
        r = val("money(100, 'USD')")
        assert isinstance(r, FelMoney)
        assert r.amount == Decimal('100') and r.currency == 'USD'

    def test_moneyAmount(self):
        assert pv("moneyAmount(money(50, 'USD'))") == Decimal('50')

    def test_moneyCurrency(self):
        assert pv("moneyCurrency(money(50, 'USD'))") == 'USD'

    def test_moneyAdd(self):
        from fel import FelMoney
        r = val("moneyAdd(money(10, 'USD'), money(20, 'USD'))")
        assert isinstance(r, FelMoney)
        assert r.amount == Decimal('30')

    def test_moneyAdd_currency_mismatch(self):
        assert is_null(val("moneyAdd(money(10, 'USD'), money(20, 'EUR'))"))
