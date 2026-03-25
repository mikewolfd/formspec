# FEL Grammar Specification Reference Map

> specs/fel/fel-grammar.md -- 394 lines, ~14K -- Companion: Normative FEL Grammar (PEG)

## Overview

This document defines the **normative Parsing Expression Grammar (PEG)** for the Formspec Expression Language (FEL). It is the authoritative syntax specification, superseding the informative grammar in Formspec v1.0 section 3.7. It defines syntax only -- all semantics (evaluation rules, type coercion, function behavior) are specified in sections 3.2-3.12 of the core Formspec specification. A conformant parser MUST accept exactly this language and reject everything else.

## Section Map

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 1 | Introduction | Establishes this grammar as the normative PEG companion to Formspec v1.0 section 3. States it supersedes the informative grammar in section 3.7. | PEG formalism, normative vs informative, companion spec | Determining which grammar document is authoritative; understanding relationship to core spec |
| 2 | Notation | Explains the PEG notation conventions used throughout the grammar: literal matching, character classes, sequence, ordered choice, repetition, lookahead, grouping. | PEG operators (`/` ordered choice, `!` negative lookahead, `&` positive lookahead, `{n}` exact repetition), PascalCase non-terminals, `<-` rule arrow | Reading or writing any grammar production rule; understanding what PEG operators mean |
| 3 | Lexical Grammar | Introduces the low-level token definitions that the expression grammar (section 4) references. Parent section for all token types. | Tokens, lexical rules | Understanding the tokenization layer before expression parsing |
| 3.1 | Whitespace and Comments | Defines whitespace (`_` production) as insignificant between tokens. Supports `//` line comments and `/* */` block comments. Block comments do NOT nest. | `_` production, LineComment, BlockComment, non-nesting block comments | Implementing tokenizer whitespace/comment skipping; debugging comment-related parse issues |
| 3.2 | Identifiers | Identifiers are ASCII-only: `[a-zA-Z_][a-zA-Z0-9_]*`. Must not collide with reserved words when used as function names. `$`-prefixed field references are exempt from reserved word restriction. | Identifier production, ASCII-only restriction, `$` sigil exemption | Validating function names; understanding why `$true` is valid but `true()` is not |
| 3.3 | Reserved Words | Lists all 11 reserved words: `true`, `false`, `null`, `and`, `or`, `not`, `in`, `if`, `then`, `else`, `let`. Uses trailing `![a-zA-Z0-9_]` lookahead to prevent matching prefixes of longer identifiers. | ReservedWord production, word-boundary lookahead, 11 reserved words | Checking if a new function name is valid; understanding why `notify` parses as an identifier |
| 3.4 | String Literals | Supports single-quoted and double-quoted strings. Defines 7 escape sequences: `\\`, `\'`, `\"`, `\n`, `\r`, `\t`, `\uXXXX`. Unrecognized escape sequences are syntax errors. | StringSQ, StringDQ, EscapeSeq, `\uXXXX` unicode escapes, unrecognized escape = error | Implementing string parsing; handling escape sequences; debugging string literal errors |
| 3.5 | Number Literals | Defines numeric syntax: optional leading `-`, integer or decimal, optional exponent. No leading dot (`.5` invalid), no trailing dot (`5.` invalid). Leading `-` allowed on literals but is also the unary negation operator. | NumberLiteral, IntegerPart, Exponent, no leading/trailing dot | Implementing number tokenization; understanding why `.5` is rejected; distinguishing negation from negative literal |
| 3.6 | Date and DateTime Literals | Defines `@YYYY-MM-DD` date literals and `@YYYY-MM-DDThh:mm:ss[Z/+-hh:mm]` datetime literals. `DateTimeLiteral` MUST be tried before `DateLiteral` (ordered choice) to avoid partial match. | DateLiteral, DateTimeLiteral, TimeZone, `@` prefix, ordered choice requirement | Implementing date/datetime tokenization; debugging partial date matches; understanding the `@` prefix on dates vs `@` on context refs |
| 3.7 | Boolean and Null Literals | `true`, `false`, `null` -- subject to the reserved word trailing lookahead. `trueValue` parses as identifier, not `true` + `Value`. | BooleanLiteral, NullLiteral, word-boundary disambiguation | Understanding literal parsing; debugging identifier vs keyword conflicts |
| 3.8 | Integer (Array Index) | `[0-9]+` -- used exclusively in array-index position within path expressions (e.g., `$items[1]`). | Integer production, array index context | Implementing path subscript parsing; understanding difference from NumberLiteral |
| 4 | Expression Grammar | Defines the full expression syntax with operator precedence encoded structurally (lower precedence = higher in grammar). Contains the complete PEG from `Expression` start symbol down through `Atom`. | Expression start symbol, precedence encoding, LetExpr, IfExpr, Ternary, LogicalOr/And, Equality, Comparison, Membership, NullCoalesce, Addition, Multiplication, Unary, Postfix, Atom, IdContinue | Implementing the expression parser; understanding precedence; tracing parse ambiguities |
| 4.1 | Function Calls | `IfCall` handles `if(cond, a, b)` as a special production (since `if` is reserved and won't match `Identifier`). All other functions use `Identifier '(' ArgList? ')'`. Parser MUST try `IfCall` before `FunctionCall`. | IfCall, FunctionCall, ArgList, `if()` disambiguation from `if...then...else` | Implementing function call parsing; understanding why `if` gets special treatment; adding new built-in functions |
| 4.2 | Object Literals | `{ key: value, ... }` syntax. Keys are bare identifiers or string literals. Duplicate keys within a single object literal are a syntax error. | ObjectLiteral, ObjectEntry, ObjectKey, duplicate key prohibition | Implementing object literal parsing; validating object keys |
| 4.3 | Array Literals | `[expr, expr, ...]` syntax. All elements MUST be the same type (enforced during type checking, not grammar). | ArrayLiteral, homogeneous type constraint | Implementing array literal parsing; understanding type-check vs parse-time constraints |
| 4.4 | Literals | Ordered choice over all literal types. `DateTimeLiteral` MUST be tried before `DateLiteral`. Boolean and null literals require `!IdContinue` lookahead. | Literal production, ordered choice priority | Understanding literal parse priority; debugging ambiguous literal matches |
| 5 | Operator Precedence Table | Normative table listing all operators from lowest (0) to highest (10) precedence with associativity. Postfix (`.field`, `[index]`) binds tighter than all prefix operators. | 11 precedence levels, associativity rules, postfix tightest binding | Quick-reference for precedence questions; verifying parser correctness; understanding expression grouping |
| 6 | Path Expressions | Defines `FieldRef` (`$ident` paths), `PathTail` (`.ident` and `[n]`/`[*]` subscripts), and `ContextRef` (`@ident` references). Not general expressions -- they are atoms. | FieldRef, PathTail, ContextRef, `$` field sigil, `@` context sigil, `[*]` wildcard, `[n]` indexed | Implementing path reference parsing; understanding field/variable/instance resolution |
| 6.1 | Reference Forms | Complete table of all 14 reference syntaxes: `$`, `$ident`, `$a.b.c`, `$a[n]`, `$a[*]`, `$a[n].b`, `$a[*].b`, `@current`, `@index`, `@count`, `@name`, `@instance('n')`, `@source`, `@target`. | Self-reference `$`, nested paths, 1-based indexing, wildcard arrays, repeat context vars, named variables, instance lookup, mapping bindings | Quick-reference for all path forms; implementing path resolution; understanding what each `@` context variable means |
| 6.2 | Path Resolution Rules | Four normative rules: (1) lexical scoping inside repeat groups, (2) index bounds checking (1-based, error on out-of-bounds), (3) `@instance('name')` must match declared Data Source, (4) dot-segment chaining after subscripts. | Lexical scoping, 1-based indexing, out-of-bounds = error, instance lookup validation, multi-subscript chaining | Implementing path resolution logic; debugging scope issues in repeating groups; handling index errors |
| 7 | Conformance | Seven normative MUST/SHOULD requirements for a conformant FEL parser: accept valid input, reject invalid with diagnostics, insignificant whitespace, all escape sequences, reserved word enforcement, `\|>` pipe reserved for future use, precedence-preserving parse tree. | Conformance checklist, `\|>` pipe reservation, diagnostic requirement | Verifying parser conformance; understanding what "compliant" means; checking future-reserved tokens |

## Cross-References

| Reference | Context |
|-----------|---------|
| Formspec v1.0 section 3 | This grammar is a companion to the FEL section of the core spec. All semantics are defined there. |
| Formspec v1.0 section 3.7 | The informative grammar in the core spec that this document supersedes. |
| Formspec v1.0 sections 3.2-3.12 | Semantics of each construct (evaluation, type rules, functions, etc.) |
| Formspec v1.0 sections 3.3, 3.8-3.10 | Parse tree structure determines evaluation order as specified in these sections |
| Bryan Ford, "Parsing Expression Grammars" (POPL 2004) | The formalism this grammar is based on; cited in section 2 |

## Operator Precedence Table

From lowest to highest precedence (normative):

| Prec. | Operator(s) | Category | Assoc. | Example |
|:-----:|-------------|----------|:------:|---------|
| 0 | `let ... = ... in ...` | Binding | Right | `let x = 1 in x + 2` |
| 0 | `if ... then ... else ...` | Conditional | Right | `if $a then 'yes' else 'no'` |
| 1 | `? :` | Ternary | Right | `$a > 0 ? 'pos' : 'neg'` |
| 2 | `or` | Logical OR | Left | `$a or $b` |
| 3 | `and` | Logical AND | Left | `$a and $b` |
| 4 | `=` `!=` | Equality | Left | `$x = 5` |
| 5 | `<` `>` `<=` `>=` | Comparison | Left | `$age >= 18` |
| 6 | `in` `not in` | Membership | Non | `$s in ['a','b']` |
| 7 | `??` | Null-coalescing | Left | `$x ?? 0` |
| 8 | `+` `-` `&` | Add / Concat | Left | `$a + $b`, `$s & '!'` |
| 9 | `*` `/` `%` | Multiply | Left | `$a * $b` |
| 10 | `not` (prefix), `-` (negate) | Unary | Right | `not $flag`, `-$x` |

Postfix operators (`.field`, `[index]`) bind tighter than all prefix operators. Parenthesized sub-expressions override precedence.

## Path Reference Forms

### Field References (`$` sigil)

| Syntax | Description | Example |
|--------|-------------|---------|
| `$` | Current context node (self-reference) | `$ > 0` |
| `$ident` | Field reference resolved from nearest scope | `$firstName` |
| `$a.b.c` | Nested field path through groups | `$address.city` |
| `$a[n]` | 1-based index into a repeat collection | `$items[1].name` |
| `$a[*]` | Wildcard -- array of all values across repeat instances | `sum($items[*].amt)` |
| `$a[n].b` | Field within indexed repeat instance | `$items[2].qty` |
| `$a[*].b` | Field across all repeat instances (produces array) | `$items[*].qty` |

### Context References (`@` sigil)

| Syntax | Description | Example |
|--------|-------------|---------|
| `@current` | Explicit reference to the current repeat instance | `@current.amount` |
| `@index` | 1-based position of current repeat instance | `@index = 1` |
| `@count` | Total instances in current repeat collection | `@count >= 1` |
| `@name` | Value of a named variable declared in `variables` | `@total` |
| `@instance('n')` | Secondary data-source instance | `@instance('prior').income` |
| `@source` | Source binding in mapping DSL | `@source.fieldA` |
| `@target` | Target binding in mapping DSL | `@target.fieldB` |

### Grammar Productions

```
FieldRef    <- '$' Identifier PathTail*
             / '$'
             / ContextRef

PathTail    <- '.' Identifier
             / '[' _ ( Integer / '*' ) _ ']'

ContextRef  <- '@' Identifier ('(' _ StringLiteral _ ')')? ('.' Identifier)*
```

## Critical Behavioral Rules

### Reserved Words
- 11 reserved words: `true`, `false`, `null`, `and`, `or`, `not`, `in`, `if`, `then`, `else`, `let`.
- Reserved words MUST NOT be used as function names (built-in or extension).
- `$`-prefixed field references are exempt: `$true` is a valid field reference because the `$` sigil disambiguates.
- Trailing lookahead `![a-zA-Z0-9_]` prevents matching reserved word prefixes in longer identifiers (e.g., `notify` is NOT parsed as `not` + `ify`).

### Null Propagation
- Semantics for null are defined in core spec sections 3.2-3.12, not in this grammar.
- The `??` null-coalescing operator at precedence 7 is the grammar-level mechanism for null handling.

### String Escaping
- 7 recognized escape sequences: `\\`, `\'`, `\"`, `\n`, `\r`, `\t`, `\uXXXX`.
- Unrecognized escape sequences (e.g., `\a`, `\b`, `\0`) are **syntax errors**, not pass-through.
- Both single-quoted and double-quoted strings are supported with identical escape handling.

### Date Literal Format
- Dates use `@` prefix: `@2024-01-15` (date), `@2024-01-15T09:30:00Z` (datetime).
- The `@` prefix is shared with context references (`@current`, `@index`, etc.) -- the parser disambiguates by what follows.
- `DateTimeLiteral` MUST be tried before `DateLiteral` in ordered choice to avoid partial matching.
- Timezone is optional: `Z` for UTC, or `+HH:MM` / `-HH:MM` offset.

### Number Format Restrictions
- No leading dot: `.5` is invalid (write `0.5`).
- No trailing dot: `5.` is invalid (write `5` or `5.0`).
- Leading `-` is allowed on number literals in literal position but is also the unary negation operator.
- Exponent notation supported: `1e10`, `2.5E-3`.

### Equality Operator
- FEL uses single `=` for equality (not `==`). Inequality is `!=`.
- There is no assignment operator in FEL expressions (assignment is only in `let` bindings using `=`).

### Let Binding Restriction
- The `in` membership operator is NOT available as a bare operator in let-value position due to ambiguity with the `let ... in` keyword.
- Workaround: parenthesize the membership test: `let x = (1 in $arr) in ...`.

### Block Comments
- Block comments `/* ... */` do NOT nest.
- `/* a /* b */ c */` parses as the comment `/* a /* b */` followed by tokens `c`, `*`, `/`.

### Membership Operator
- `in` and `not in` are **non-associative** at precedence 6 (only one per expression level).
- The `not in` form is two keywords: `not` followed by `in`.

### Array Type Homogeneity
- All elements of an array literal MUST be of the same type -- but this is enforced at type-check time, not parse time.

### Object Literal Keys
- Duplicate keys within a single object literal are a syntax error.
- Keys can be bare identifiers or string literals.

### Future Reserved Token
- The `|>` (pipe) character sequence MUST be rejected as a syntax error in v1.0. It is reserved for future use.

### Indexing
- Array/repeat indices are **1-based** (not 0-based).
- Out-of-bounds index (`n < 1` or `n > instance count`) MUST signal an evaluation error.
- Wildcard `[*]` produces an array of all values across repeat instances.

### Postfix Binding
- Postfix operators (`.field`, `[index]`) bind tighter than ALL prefix operators.
- This enables patterns like `prev().field` and `(expr).field`.

### Conformance Diagnostics
- Rejection of invalid input MUST include a diagnostic indicating the approximate position of the syntax error -- silent failure is non-conformant.
