---
title: "Designing FEL: Why Formspec has its own expression language"
description: "FEL (Formspec Expression Language) is a small, deterministic, side-effect-free language built specifically for form logic. Here's why we built it instead of using JavaScript, and how it works."
date: 2026-02-10
tags: ["specification", "fel", "deep-dive"]
author: "Formspec Team"
---

One of the more unusual decisions in Formspec's design is that it ships its own expression language — FEL, the Formspec Expression Language. When we describe this to people, the first question is usually: *why not just use JavaScript?*

It's a fair question. Here's the full answer.

## The requirements that JavaScript fails

Form definitions in Formspec need to do three things with expressions:

1. **Calculate values** — monthly budget = total amount / duration
2. **Express conditions** — show the EIN field only when org_type is 'nonprofit'
3. **Validate** — flag if duration exceeds 36 months

These expressions need to run in two places: the **browser** (TypeScript engine, live as the user fills the form) and the **server** (Python evaluator, re-validating before storage). The same expression must produce the same result in both environments.

If we used JavaScript expressions, we'd need:
- A JavaScript evaluator in Python (a significant dependency, security surface, and maintenance burden)
- Or a custom parser in both languages anyway — in which case, why JavaScript syntax?

We also needed expressions to be:
- **Deterministic** — same inputs always produce the same output
- **Side-effect-free** — no I/O, no mutation, no network calls
- **Statically analyzable** — a linter should be able to extract field dependencies from an expression without running it
- **Safe to store in JSON** — no eval, no code execution concerns

JavaScript expressions don't give you any of these guarantees by default. You get them through constraints that amount to defining a subset — at which point you've defined a language.

## What FEL looks like

FEL is a small, infix expression language. Here are some examples from real form definitions:

```
# Conditional relevance
$org_type = 'nonprofit'

# Calculated value
$amount / $duration

# Validation constraint
$duration <= 36

# String operations
concat($first_name, ' ', $last_name)

# Aggregate over a repeatable group
sum(items[*].amount)

# Date arithmetic
datediff($end_date, $start_date, 'days') >= 30
```

Field references use `$field_id` syntax. The `[*]` wildcard syntax iterates over repeatable groups. Functions are prefix-called with standard argument lists.

## The grammar

FEL has a formal grammar defined in the specification. The grammar is intentionally small:

- Arithmetic: `+`, `-`, `*`, `/`
- Comparison: `=`, `!=`, `<`, `<=`, `>`, `>=`
- Logical: `and`, `or`, `not`
- String concatenation via `concat()`
- Conditionals via `if(condition, then, else)`
- Path expressions for field references and group iteration
- ~40 standard library functions (math, strings, dates, aggregates, type checking)

No assignment. No mutation. No loops (iteration is handled by aggregate functions like `sum`, `count`, `all`, `any`). No I/O.

## Two independent implementations

The TypeScript implementation uses [Chevrotain](https://github.com/Chevrotain/chevrotain) for lexing and parsing, producing a CST that a CstVisitor evaluates. Reactive dependencies are extracted from the same CST by a DependencyVisitor — this is how field values wire up to computed signals automatically.

The Python implementation is a hand-written recursive descent parser with a separate AST and evaluator. It was written from the specification, not from the TypeScript source — this matters because it proves the specification is precise enough to independently implement.

Both implementations pass the same conformance suite.

## Static analysis

Because FEL expressions are data (strings inside JSON), they can be linted before the form runs. The static linter in `formspec.validator` checks:

- Undefined field references (E601: reference to a field not in the definition)
- Type mismatches (where detectable statically)
- Circular dependencies (a calculated field that depends on itself, directly or transitively)
- Aggregate functions called on non-group paths

This means form authors get errors at definition authoring time, not at user submission time.

## What FEL is not

FEL is not a general-purpose scripting language. You cannot write arbitrary logic. You cannot call external services. You cannot define new functions.

This is a feature, not a limitation. The constraint is what makes FEL safe to store in JSON, safe to evaluate on a server, and safe to analyze statically. A form definition that contains a FEL expression is auditable — a reviewer can read the expression and know exactly what it does.

## The conformance suite

Every FEL function and operator has test cases in `tests/test_fel_evaluator.py`. The suite covers:
- Basic arithmetic and comparison
- String operations
- Date arithmetic and formatting
- Aggregate functions over groups
- Conditional expressions
- Edge cases: null handling, type coercion, division by zero

The TypeScript engine runs the same logical test cases via Playwright. When the Python and TypeScript results diverge, it's a spec ambiguity we need to resolve — the implementations serve as a cross-check on the specification itself.

---

FEL is one of the more carefully designed parts of Formspec. If you have questions about a specific function or edge case, the specification is the canonical reference: `specs/fel/fel-grammar.md`.
