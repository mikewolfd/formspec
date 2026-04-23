# FEL Grammar Specification Reference Map

> specs/fel/fel-grammar.md -- 395 lines, ~14K -- Companion: Normative FEL Grammar (PEG)

## Overview

This document defines the **normative Parsing Expression Grammar (PEG)** for the Formspec Expression Language (FEL). It is the authoritative syntax companion to Formspec v1.0 §3 and supersedes the informative grammar in Formspec §3.7. It defines syntax only; evaluation, typing, coercion, and function behavior live in Formspec §§3.2–3.12. A conformant parser MUST accept exactly this language and reject everything else, with diagnostics on failure.

## Section Map

### Document header and §§1–2 -- Introduction and notation (Lines 1–44)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| -- | Title / version | Names FEL normative grammar, v1.0, status as companion to Formspec v1.0 §3. | Normative companion, v1.0 | Confirming document role and version |
| 1 | Introduction | Establishes this grammar as the normative PEG for FEL; companion to Formspec §3; supersedes informative grammar in Formspec §3.7; semantics delegated to Formspec §§3.2–3.12. | MUST accept exactly this language, syntax vs semantics | Authoritative grammar vs core prose; what this file does not define |
| 2 | Notation | PEG conventions: literals, classes, sequence, ordered choice `/`, repetition, `!` / `&` lookahead, grouping, `{n}` exact repetition, `.` any char; `PascalCase` non-terminals; `←` rule arrow; Ford PEG (unambiguous by construction). | PEG operators, ordered choice, lookahead, non-consuming predicates | Reading any production; implementing or reviewing a PEG parser |

### §3 -- Lexical grammar (Lines 46–169)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 3 | Lexical Grammar | Token layer referenced by §4; whitespace, identifiers, literals, reserved words, index integers. | Tokens, lexical rules, expression grammar reference | Tokenizer design before expression rules |
| 3.1 | Whitespace and Comments | `_` = optional whitespace/comments between tokens; insignificant outside strings. `//` line comments; `/* */` block comments **do not nest**; example shows tail tokens after malformed nesting. | `_`, LineComment, BlockComment, LineTerminator, non-nesting | Comment/whitespace skipping; nested `/*` pitfalls |
| 3.2 | Identifiers | ASCII `Identifier ← !ReservedWord [a-zA-Z_][a-zA-Z0-9_]*`. Must not be a reserved word when used as a function name; `$` field paths exempt. *(Body cites “§3.5” for reserved words; the reserved list in this file is §3.3.)* | Identifier, `!ReservedWord`, `$` sigil exemption | Function names vs field keys; ASCII-only ids |
| 3.3 | Reserved Words | Eleven reserved words; trailing `![a-zA-Z0-9_]` so `notify`, `informal` are not split. MUST NOT be function names (built-in or extension). | ReservedWord, word-boundary lookahead, `true`…`let` | Keyword vs identifier; function naming |
| 3.4 | String Literals | `StringSQ` / `StringDQ`; escapes `\\` `\'` `\"` `\n` `\r` `\t` `\u` + 4 hex; other escapes are syntax errors. | StringLiteral, EscapeSeq, HexDigit, unrecognised escape | String tokenization and validation |
| 3.5 | Number Literals | Optional leading `-`, `IntegerPart`, optional fraction, optional exponent; no leading `.` or trailing `.`; bare `-` is unary but grammar allows signed numeric literal token. | NumberLiteral, IntegerPart, Exponent, `.5` / `5.` invalid | Numeric literals vs negation operator |
| 3.6 | Date and DateTime Literals | `@YYYY-MM-DD` and `@…T…` with optional `TimeZone`; `Digit`; **ordered choice**: try `DateTimeLiteral` before `DateLiteral`. | `@`, DateLiteral, DateTimeLiteral, TimeZone, Z / offset | `@` disambiguation vs context refs; partial date match |
| 3.7 | Boolean and Null Literals | `true` / `false` / `null`; same tokens as reserved words with `!IdContinue` / reserved lookahead so `trueValue` stays an identifier. | BooleanLiteral, NullLiteral, IdContinue | Literal vs longer identifier |
| 3.8 | Integer (Array Index) | `[0-9]+` only in path index position; not a general signed decimal literal. | Integer, array index, path | `$repeat[n]` subscripts |

### §4 -- Expression grammar (Lines 171–297)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 4 | Expression Grammar | Full expression syntax; precedence encoded structurally (lower precedence higher in tree). `Expression ← _ LetExpr _`. `LetValue` omits `Membership` to avoid clash with `let … in`. | Expression, LetExpr, LetValue, IfExpr, Ternary through Atom, IdContinue | Parser structure; precedence; `let`/`in` ambiguity |
| 4.1 | Function Calls | `IfCall` for `if(…)`; `if` reserved so not `Identifier`; MUST try `IfCall` before `FunctionCall`; `(` disambiguates from `if … then … else`. | IfCall, FunctionCall, ArgList | Built-in `if(cond,a,b)` vs keyword conditional |
| 4.2 | Object Literals | `{` entries `key: expr`; keys = `Identifier` or `StringLiteral`; duplicate keys = syntax error. | ObjectLiteral, ObjectEntry, ObjectKey | Object syntax and key rules |
| 4.3 | Array Literals | `[` comma-separated `Expression` list `]`; homogeneous element types enforced at type-check, not parse time. | ArrayLiteral | Arrays vs grammar-only acceptance |
| 4.4 | Literals | Ordered: `DateTimeLiteral` / `DateLiteral` / numbers / strings / booleans+`!IdContinue` / null+`!IdContinue`; datetime before date. | Literal, ordered choice | Literal parsing order |

### §5 -- Operator precedence (Lines 299–321)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 5 | Operator Precedence Table | Normative table: precedence 0–10, categories, associativity, examples; matches §4 structure; parenthesised sub-expressions override; postfix `.` / `[]` tighter than all prefixes. | `let`/`if`, `?:`, `or`, `and`, `=` `!=`, comparisons, `in`/`not in`, `??`, `+`-`&`, `* / %`, unary `not`/`!`/`-` | Quick precedence lookup; parser vs table parity |

### §6 -- Path expressions (Lines 323–369)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 6 | Path Expressions | Instance path syntax; atoms only -- not arbitrary expressions inside `$`/`@` forms. PEG: `FieldRef`, `PathTail`, `ContextRef`. | FieldRef, PathTail, ContextRef, `$`, `@` | Path parsing vs general expressions |
| 6.1 | Reference Forms | Table of field forms (`$`, `$ident`, nested, `[n]`, `[*]`, combinations) and context forms (`@current`, `@index`, `@count`, `@name`, `@instance('…')`, `@source`, `@target`). | Self-reference, wildcard, 1-based index, mapping DSL | Authoring and implementing every path shape |
| 6.2 | Path Resolution Rules | Lexical scope in repeats; index bounds → evaluation error; `@instance('name')` must match declared Data Source or definition error; chaining after `[]` / `[*]` including multiple subscripts. | Scope, 1-based, out-of-bounds, instance validation, `$a[1].nested[*].value` | Runtime path semantics (still specified here normatively) |

### §7 -- Conformance (Lines 371–395)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 7 | Conformance | Seven MUST/SHOULD rules: accept valid `Expression`, reject invalid with approximate position, insignificant whitespace/comments, all §3.4 escapes + reject unknown, reserved words not as function names, `\|>` pipe sequence syntax error in v1.0, SHOULD preserve precedence/associativity in AST (evaluation order per Formspec §3.3 and §§3.8–3.10). | Conformance, diagnostic, `\|>` reserved, parse tree | Certification, error reporting, future pipe token |

## Cross-References

### Formspec v1.0 (core specification)

- **§3** -- Companion target; semantics for FEL live alongside this grammar’s scope (header, §1).
- **§3.7** -- Informative grammar superseded by this document (§1).
- **§§3.2–3.12** -- Semantics for each syntactic construct (§1).
- **§3.3** -- Parse tree / evaluation ordering, cited from conformance item 7 together with §§3.8–3.10 (lines 390–391). *(Here “§3.3” names the **Formspec** specification, not §3.3 of this grammar file.)*
- **§§3.8–3.10** -- Evaluation order relative to parse tree (conformance 7; Formspec spec).

### Within `fel-grammar.md` (internal section pointers)

- **§4** -- Expression grammar references lexical tokens from §3 (line 49).
- **§3.3** -- Reserved words: `if` disambiguation (§4.1); boolean/null literals listed under `ReservedWord` (§3.7); conformance reserved-word rule (line 384).
- **§3.4** -- Escape sequences required by conformance rule 4 (line 382).
- **§3.5** -- Cited from §3.2 line 77 for “reserved word” when naming function identifiers; in **this** document §3.5 is **Number literals** -- use **§3.3** for the reserved-word list when implementing.
- **§4** -- Precedence table must match structural encoding (line 302).

### External standard

- **Bryan Ford, “Parsing Expression Grammars: A Recognition-Based Syntactic Foundation” (POPL 2004)** -- PEG formalism (§2).

### Schemas

- None cited in this grammar document.

## Operator Precedence Table

From lowest to highest precedence (normative; mirrors §5 / §4):

| Prec. | Operator(s) | Category | Assoc. | Example |
|:-----:|-------------|----------|:------:|---------|
| 0 | `let … = … in …` | Binding | Right | `let x = 1 in x + 2` |
| 0 | `if … then … else …` | Conditional | Right | `if $a then 'yes' else 'no'` |
| 1 | `? :` | Ternary | Right | `$a > 0 ? 'pos' : 'neg'` |
| 2 | `or` | Logical OR | Left | `$a or $b` |
| 3 | `and` | Logical AND | Left | `$a and $b` |
| 4 | `=` `!=` | Equality | Left | `$x = 5` |
| 5 | `<` `>` `<=` `>=` | Comparison | Left | `$age >= 18` |
| 6 | `in` `not in` | Membership | Non | `$s in ['a','b']` |
| 7 | `??` | Null-coalescing | Left | `$x ?? 0` |
| 8 | `+` `-` `&` | Add / Concat | Left | `$a + $b`, `$s & '!'` |
| 9 | `*` `/` `%` | Multiply | Left | `$a * $b` |
| 10 | `not` / `!` (prefix), `-` (negate) | Unary | Right | `not $flag`, `!$flag`, `-$x` |

Parenthesised sub-expressions override precedence. Postfix (`.field`, `[index]`) binds tighter than all prefix operators.

## Path Reference Forms

### Field references (`$`)

| Syntax | Description | Example |
|--------|-------------|---------|
| `$` | Current context node (self-reference). | `$ > 0` |
| `$ident` | Field reference from nearest scope. | `$firstName` |
| `$a.b.c` | Nested path through groups. | `$address.city` |
| `$a[n]` | 1-based index into a repeat collection. | `$items[1].name` |
| `$a[*]` | Wildcard -- all values across instances. | `sum($items[*].amt)` |
| `$a[n].b` | Field inside indexed instance. | `$items[2].qty` |
| `$a[*].b` | Field across all instances (array). | `$items[*].qty` |

### Context references (`@`)

| Syntax | Description | Example |
|--------|-------------|---------|
| `@current` | Current repeat instance. | `@current.amount` |
| `@index` | 1-based position in repeat. | `@index = 1` |
| `@count` | Instance count in collection. | `@count >= 1` |
| `@name` | Named variable from `variables` (pattern: `@` + identifier). | `@total` |
| `@instance('n')` | Secondary data-source instance. | `@instance('prior').income` |
| `@source` | Mapping DSL source binding. | `@source.fieldA` |
| `@target` | Mapping DSL target binding. | `@target.fieldB` |

### Grammar productions (paths)

```peg
FieldRef    <- '$' Identifier PathTail*
             / '$'
             / ContextRef

PathTail    <- '.' Identifier
             / '[' _ ( Integer / '*' ) _ ']'

ContextRef  <- '@' Identifier ('(' _ StringLiteral _ ')')? ('.' Identifier)*
```

## Critical Behavioral Rules

1. **Authority** -- This PEG is normative syntax; Formspec §§3.2–3.12 define semantics.
2. **Supersedes** -- Informative grammar in Formspec §3.7 is superseded by this document.
3. **Reserved words (11)** -- `true`, `false`, `null`, `and`, `or`, `not`, `in`, `if`, `then`, `else`, `let`; not usable as function names; `$` paths exempt; trailing `![a-zA-Z0-9_]` avoids prefix false positives (`notify`).
4. **Let vs `in`** -- `LetValue` omits bare `Membership`; use `let x = (1 in $arr) in …` (parenthesize membership in bound value).
5. **`if` calls** -- Try `IfCall` before `FunctionCall`; `(` after `if` distinguishes `if(a,b,c)` from `if … then … else`.
6. **String escapes** -- Only `\\`, `\'`, `\"`, `\n`, `\r`, `\t`, `\uXXXX`; any other escape is a **syntax error** (spec §3.4: unrecognised escape).
7. **Numbers** -- No `.5` or `5.`; optional `-` and exponent on literals; bare `-` is unary negation.
8. **Date / datetime** -- In `Literal` and at token level, try **DateTimeLiteral before DateLiteral** (ordered choice).
9. **Equality** -- Single `=` for equality, `!=` for inequality; no assignment operator outside `let` binding `=`.
10. **Membership** -- Precedence 6, **non-associative**; `not in` is two tokens.
11. **Block comments** -- Do **not** nest; `/* a /* b */ c */` leaves `c`, `*`, `/` outside the comment.
12. **Objects** -- Duplicate keys in one object literal → syntax error.
13. **Arrays** -- Homogeneous element types: type-check time, not grammar.
14. **`|>`** -- MUST be a syntax error in v1.0 (reserved).
15. **Rejections** -- Invalid input MUST produce a diagnostic with approximate error position.
16. **Indices** -- Path `Integer` indices are **1-based**; `n < 1` or `n` greater than instance count → evaluation error.
17. **`@instance('name')`** -- Must match a declared Data Source; else definition error.
18. **Postfix** -- `.field` and `[…]` bind tighter than all unary prefix operators (`not`, `!`, `-`).
19. **Conformance 7** -- SHOULD: AST preserves precedence/associativity; evaluation order follows **Formspec** §3.3 and §§3.8–3.10 (not the grammar file’s §3.3).
20. **§3.2 cross-pointer** -- Line 77 cites “§3.5” for reserved words; the reserved-word production in **this** file is **§3.3** -- do not treat §3.5 (numbers) as the reserved-word section.
