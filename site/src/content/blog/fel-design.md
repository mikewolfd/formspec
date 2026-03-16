---
title: "Designing FEL: Why Formspec has its own expression language"
description: "FEL (Formspec Expression Language) is a small, deterministic, side-effect-free language built specifically for form logic. We evaluated CEL, JSONLogic, and JEXL before building it. Here's the honest tradeoff."
date: 2026-02-10
tags: ["specification", "fel", "deep-dive"]
author: "Formspec Team"
---

One of the more unusual decisions in Formspec's design is that it ships its own expression language — FEL, the Formspec Expression Language. When we describe this to people, the first question is usually: *why not just use an existing one?*

It's a fair question. The honest answer involves tradeoffs we chose to make, not requirements that forced our hand.

## What we needed

Form definitions in Formspec need to do three things with expressions:

1. **Calculate values** — monthly budget = total amount / duration
2. **Express conditions** — show the EIN field only when org_type is 'nonprofit'
3. **Validate** — flag if duration exceeds 36 months

These expressions need to run in two places: the **browser** (TypeScript engine, live as the user fills the form) and the **server** (Python evaluator, re-validating before storage). The same expression must produce the same result in both environments.

We also needed expressions to be:
- **Deterministic** — same inputs always produce the same output
- **Side-effect-free** — no I/O, no mutation, no network calls
- **Statically analyzable** — a linter should be able to extract field dependencies from an expression without running it
- **Safe to store in JSON** — no eval, no code execution concerns

Raw JavaScript is out — no sandbox, no determinism guarantees, and you'd need a JS evaluator in Python. But JavaScript was never the real alternative. The real question was whether an existing expression language could do the job.

## The alternatives we considered

### CEL (Common Expression Language)

[CEL](https://cel.dev/) is Google's expression language, designed for exactly this class of problem — safe, deterministic, multi-language evaluation for declarative configurations. It powers Firebase Security Rules, Kubernetes policies, and Istio authorization. It has official implementations in Go, Java, and C++, plus community implementations in JavaScript and Python.

CEL satisfies all four of our requirements. It's deterministic, side-effect-free, statically analyzable (its type-checking phase produces dependency metadata), and stores as strings in JSON. It supports list comprehensions, custom function declarations, and variable binding.

CEL was the strongest alternative. We seriously considered it.

### JSONLogic

[JSONLogic](https://jsonlogic.com/) is JSON-native by design — expressions are JSON objects, not strings. It has implementations in 17+ languages and is trivially walkable for dependency extraction.

But JSONLogic's verbosity is a dealbreaker for form authors. Compare:

```
// FEL
sum(items[*].amount)

// JSONLogic
{"reduce": [{"map": [{"var": "items"}, {"var": "amount"}]}, {"+": [{"var": "current"}, {"var": "accumulator"}]}, 0]}
```

Form definitions are authored by program directors and compliance officers, not just developers. JSONLogic's syntax is hostile to that audience.

### JEXL

[JEXL](https://github.com/TomFrost/Jexl) is a JavaScript expression language with a clean syntax and Python ports. It supports custom transforms and context-based variable resolution. It's lightweight and well-maintained.

JEXL comes closest to what we wanted syntactically, but it lacks a formal specification, its static analysis story is limited, and the Python implementations lag behind the JavaScript version.

## What we chose and why

We built FEL. Here's the honest accounting of why.

**The real reason is syntax.** FEL was designed for people who build forms, not people who write code. The `$field_id` prefix makes field references visually distinct from function names. The `[*]` wildcard makes repeatable group iteration read like a spreadsheet formula, not a list comprehension. `sum(items[*].amount)` is more accessible than CEL's `items.map(item, item.amount).reduce(0, (a, b) -> a + b)`.

This matters because form definitions are configuration artifacts, not source code. The people writing `relevant` expressions and `calculate` bindings are often the same people who wrote the policy requirements — they shouldn't need to learn a programming language's iteration model to express "sum up all the line item amounts."

**The second reason is control.** FEL's spec is under our control. When we needed `[*]` wildcards, `@current`/`@index` context references inside repeat groups, or MIP query functions like `valid($field)` and `relevant($field)`, we added them as first-class language features — not as custom extensions bolted onto someone else's grammar. With CEL, every domain-specific feature would be a custom function declaration that lives outside the language spec.

**The third reason is coupling.** FEL's `DependencyVisitor` walks the parse tree to extract field references and wire them directly into the FormEngine's reactive signal graph. This is tightly integrated — the same CST that the interpreter evaluates is the one the dependency extractor analyzes. With an external language, we'd be walking someone else's AST representation, which is possible but fragile across library versions.

## What it cost

Let's be honest about the price:

- ~2,300 lines of TypeScript (Chevrotain lexer, parser, interpreter, dependency visitor)
- ~3,000 lines of Python (hand-written recursive descent parser, AST, evaluator, stdlib)
- ~400 lines of formal grammar specification
- ~2,500 lines of conformance tests
- Two implementations to maintain, debug, and keep in sync

With CEL plus ~14 custom domain functions, we estimate this would have been ~1,500 lines total. We chose to write 3-5x more code in exchange for syntax we control and ergonomics we believe matter for our audience.

That's a real cost. Whether it was the right call depends on whether form-author ergonomics justify custom infrastructure. We think they do, but reasonable people can disagree.

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

About three-quarters of those stdlib functions are generic (arithmetic, strings, dates, type checking) — the kind of thing CEL or JEXL already provides. The remaining quarter is domain-specific: MIP queries (`valid`, `relevant`, `readonly`, `required`), repeat navigation (`prev`, `next`, `parent`), and money operations. Those are the functions that justify owning the language. The generic ones are the tax.

## Two independent implementations

The TypeScript implementation uses [Chevrotain](https://github.com/Chevrotain/chevrotain) for lexing and parsing, producing a CST that a CstVisitor evaluates. Reactive dependencies are extracted from the same CST by a DependencyVisitor — this is how field values wire up to computed signals automatically.

The Python implementation is a hand-written recursive descent parser with a separate AST and evaluator. It was written from the specification, not from the TypeScript source — this matters because it proves the specification is precise enough to independently implement.

Both implementations pass the same conformance suite. When they diverge, the debugging process is straightforward: read the spec, determine which implementation is wrong, fix it. The spec already settled what the behavior should be.

## Static analysis

Because FEL expressions are data (strings inside JSON), they can be linted before the form runs. The static linter checks:

- Undefined field references (referencing a field not in the definition)
- Type mismatches (where detectable statically)
- Circular dependencies (a calculated field that depends on itself, directly or transitively)
- Aggregate functions called on non-group paths

This means form authors get errors at definition authoring time, not at user submission time. CEL offers similar static analysis through its type-checking phase — this is not unique to FEL, but it is a property we needed regardless of which language we chose.

## What FEL is not

FEL is not a general-purpose scripting language. You cannot write arbitrary logic. You cannot call external services. You cannot define new functions.

This is a feature, not a limitation. The constraint is what makes FEL safe to store in JSON, safe to evaluate on a server, and safe to analyze statically. A form definition that contains a FEL expression is auditable — a reviewer can read the expression and know exactly what it does.

CEL shares most of these properties. The difference is in the syntax, not the safety model.

---

FEL is one of the more carefully considered decisions in Formspec — and one of the most debatable. If you're evaluating Formspec and wondering whether the custom language is a red flag or a feature, the answer is: it's a deliberate tradeoff. We chose author ergonomics and language control over ecosystem leverage. The conformance suite and dual implementations are how we manage the cost.

If you have questions about a specific function or edge case, the specification is the canonical reference: `specs/fel/fel-grammar.md`.
