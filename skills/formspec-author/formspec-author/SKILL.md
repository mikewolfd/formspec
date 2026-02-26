---
name: formspec-author
description: >
  Helps write and edit Formspec definition files — the core JSON artifact that declares
  a form's structure, field types, bind logic (FEL expressions for calculate, relevant,
  constraint, readonly, required), cross-field validation shapes, repeatable groups, option
  sets, and variables. Use this skill whenever someone is: creating a new form definition,
  adding or modifying fields and groups, writing FEL expressions for form logic, setting up
  validation, working with repeatable sections, or asking what dataType or bind property to
  use. Trigger even if they just say "I want to create a form" or "add a field that calculates X."
---

# Formspec Author

You help people write Formspec **definition** files — the JSON document that declares what a
form collects and how it behaves. Everything else (rendering, theming, server validation,
mapping) flows from a well-authored definition.

## The three-layer mental model

```
Items    → What data is collected (fields, groups, structure)
Binds    → How it behaves (FEL expressions for logic)
Shapes   → Cross-field validation rules
```

Keep these layers separate. A field's data structure goes in items. Its reactive logic goes
in binds. Cross-field constraints go in shapes. This separation is what makes the same
definition drive web, mobile, server, and PDF renderers without modification.

## Required definition shell

```json
{
  "$formspec": "1.0",
  "url": "https://your-org.example/forms/form-name",
  "version": "1.0.0",
  "status": "draft",
  "title": "Your Form Title",
  "items": []
}
```

`url` is a stable logical identifier — doesn't change between versions. `(url, version)`
together form an immutable identity pair that responses get pinned to.

## Items: structure

Every item needs `key`, `type`, and `label`. Keys must be unique across the definition,
matching `^[a-zA-Z][a-zA-Z0-9_]*$`. camelCase by convention.

| type | Purpose | Required extra properties |
|------|---------|--------------------------|
| `field` | Captures data | `dataType` |
| `group` | Container, optionally repeatable | `children` |
| `display` | Read-only content (headings, instructions) | — |

### Field dataTypes

| dataType | Value shape | Use for |
|----------|-------------|---------|
| `string` | `"text"` | Short single-line text |
| `text` | `"long text"` | Multi-line prose |
| `integer` | `42` | Whole numbers |
| `decimal` | `3.14` | Decimal numbers |
| `boolean` | `true` / `false` | Yes/No, toggles |
| `date` | `"2024-01-15"` | Calendar dates (ISO 8601) |
| `dateTime` | `"2024-01-15T10:30:00Z"` | Date + time |
| `time` | `"14:30"` | Time of day (HH:MM) |
| `choice` | `"optionValue"` | Single-select (one string value) |
| `multiChoice` | `["a", "b"]` | Multi-select (array of strings) |
| `money` | `{"amount": "50.00", "currency": "USD"}` | Currency (exact decimal). For single-currency forms, set `formPresentation.defaultCurrency` and/or `currency` on the field item to lock the currency — users won't see a currency input. |
| `attachment` | `{"url":"...","contentType":"...","size":0}` | File uploads |
| `uri` | `"https://..."` | URLs/links |

### Inline bind shorthand

Fields accept bind properties directly when the logic is simple and field-specific:

```json
{
  "key": "ein",
  "type": "field",
  "dataType": "string",
  "label": "Employer Identification Number",
  "required": true,
  "constraint": "matches($, \"^\\d{2}-\\d{7}$\")",
  "constraintMessage": "EIN must be in format XX-XXXXXXX"
}
```

Use inline shorthand for straightforward single-field logic. Use top-level `binds[]` for
wildcard paths (`[*]`) or when grouping binds separately makes the definition clearer.

### Groups and repeatable sections

```json
{
  "key": "lineItems",
  "type": "group",
  "label": "Budget Line Items",
  "repeatable": true,
  "minRepeat": 1,
  "maxRepeat": 20,
  "children": [
    { "key": "category", "type": "field", "dataType": "choice",
      "label": "Category", "optionSet": "budgetCategories" },
    { "key": "quantity", "type": "field", "dataType": "integer", "label": "Quantity" },
    { "key": "unitCost", "type": "field", "dataType": "money", "label": "Unit Cost" },
    { "key": "subtotal", "type": "field", "dataType": "money", "label": "Subtotal",
      "readonly": true }
  ]
}
```

Inside a repeat group, FEL expressions using `$siblingKey` resolve within the same instance.
From outside: `$lineItems[*].subtotal` returns an array of all instances' values.
Set conditional sections by putting `relevant` on the group itself, not each child individually.

## Binds: behavior (FEL)

Top-level `binds[]` for wildcard paths and cross-instance logic:

```json
"binds": [
  {
    "path": "lineItems[*].subtotal",
    "calculate": "money(moneyAmount($unitCost) * $quantity, moneyCurrency($unitCost))",
    "readonly": true
  },
  {
    "path": "endDate",
    "constraint": "$endDate > $startDate",
    "constraintMessage": "End date must be after start date"
  },
  {
    "path": "indirectRate",
    "relevant": "$orgType != 'government'"
  }
]
```

| Bind property | FEL returns | Effect |
|---------------|-------------|--------|
| `calculate` | field's dataType | Computed value; field becomes implicitly readonly |
| `relevant` | boolean | `false` → field hidden and excluded from validation |
| `required` | boolean | `true` → must have a non-null, non-empty value |
| `readonly` | boolean | `true` → no user modification allowed |
| `constraint` | boolean | `false` → field invalid; pair with `constraintMessage` |

**Null degrades gracefully**: `relevant null → true` (show), `required null → false` (optional),
`readonly null → false` (editable), `constraint null → true` (passes). A bind that references
an empty field won't accidentally hide or lock things.

**Inheritance**: `relevant` is AND-inherited (non-relevant parent → children also non-relevant).
`readonly` is OR-inherited (readonly parent → children also readonly). `required` and
`constraint` are never inherited.

## FEL quick reference

FEL is a small, deterministic expression language — no statements, no loops, no side effects.
Strictly typed; no implicit coercion between types.

**Field references:**

| Syntax | Meaning |
|--------|---------|
| `$fieldKey` | Value of a field (resolved in nearest scope) |
| `$group.field` | Nested path through a group |
| `$` | Current field's own value (use in `constraint` binds) |
| `$repeat[*].field` | Array of all values across repeat instances |
| `$repeat[n].field` | Value at 1-based index n |
| `@index` | 1-based position in current repeat group |
| `@count` | Total instances in current repeat group |
| `@variableName` | Named variable value (see Variables section) |

**Operators** (lowest → highest precedence):

```
? :          ternary (right-associative)
or / and     logical (require boolean operands — no truthy/falsy)
= / !=       equality  (null = null is true)
< > <= >=    comparison
in / not in  membership (right operand must be array)
??           null-coalesce (returns right if left is null)
+ - &        add / subtract / string concat (& not + for strings)
* / %        multiply / divide / modulo
not / -      unary
.field [n]   postfix field access / indexing (tightest binding)
```

**Key functions:**

| Category | Functions |
|----------|-----------|
| Aggregates | `sum(arr)`, `count(arr)`, `avg(arr)`, `min(arr)`, `max(arr)`, `countWhere(arr, predicate)` |
| String | `length`, `contains`, `startsWith`, `endsWith`, `substring(s,start,len?)`, `replace`, `upper`, `lower`, `trim`, `matches(s,regex)`, `format(template,...args)` |
| Math | `round(n,precision?)`, `floor`, `ceil`, `abs`, `power(base,exp)` |
| Date | `today()`, `now()`, `year(d)`, `month(d)`, `day(d)`, `dateDiff(d1,d2,unit)`, `dateAdd(d,n,unit)`, `timeDiff(t1,t2)` |
| Logical | `if(cond,then,else)`, `coalesce(...args)`, `empty(val)`, `present(val)`, `selected(arr,val)` |
| Type | `isNumber`, `isString`, `isDate`, `isNull`, `typeOf`, `number()`, `string()`, `boolean()`, `date()` |
| Money | `money(amount,currency)`, `moneyAmount(m)`, `moneyCurrency(m)`, `moneyAdd(m1,m2)`, `moneySum(arr)` |
| MIP state | `valid($path)`, `relevant($path)`, `readonly($path)`, `required($path)` |
| Repeat nav | `prev()`, `next()`, `parent()` — only inside a repeat context |

For the full normative grammar (reserved words, conformance rules, edge cases), read:
→ `specs/fel/fel-grammar.llm.md`

## Shapes: cross-field validation

Shapes validate relationships between fields that a single `constraint` bind can't express:

```json
"shapes": [
  {
    "id": "budgetMatch",
    "target": "requestedAmount",
    "severity": "error",
    "constraint": "abs(moneyAmount($requestedAmount) - moneyAmount(@grandTotal)) < 1",
    "message": "Requested amount must match the calculated grand total (within $1).",
    "code": "BUDGET_MISMATCH"
  },
  {
    "id": "subcontractorCap",
    "target": "#",
    "severity": "error",
    "activeWhen": "$usesSubcontractors",
    "constraint": "moneyAmount(moneySum($subcontractors[*].subAmount)) <= moneyAmount(@grandTotal) * 0.49",
    "message": "Subcontractor costs may not exceed 49% of total budget.",
    "code": "SUBCONTRACTOR_CAP_EXCEEDED"
  }
]
```

| Property | Values | Notes |
|----------|--------|-------|
| `target` | field path or `"#"` | `"#"` = form-level result, no specific field |
| `severity` | `"error"`, `"warning"`, `"info"` | Only errors block form submission |
| `activeWhen` | FEL boolean | Shape skipped entirely when falsy |
| `timing` | `"continuous"`, `"submit"`, `"demand"` | Default: continuous (reactive) |

Shapes compose using `and`, `or`, `not`, `xone` arrays referencing other shape IDs.

## Option sets

Named, reusable option lists — define once, reference across fields and mapping:

```json
"optionSets": {
  "budgetCategories": {
    "options": [
      {"value": "personnel", "label": "Personnel"},
      {"value": "travel", "label": "Travel"},
      {"value": "equipment", "label": "Equipment"}
    ]
  }
}
```

Reference on a field: `"optionSet": "budgetCategories"`. Field must be `choice` or `multiChoice`.

## Variables

Named computed values available as `@name` in FEL, recalculated continuously:

```json
"variables": [
  {"name": "totalDirect", "scope": "#",
   "expression": "moneySum($lineItems[*].subtotal)"},
  {"name": "indirectCosts", "scope": "#",
   "expression": "money(moneyAmount(@totalDirect) * ($indirectRate / 100), moneyCurrency(@totalDirect))"},
  {"name": "grandTotal", "scope": "#",
   "expression": "moneyAdd(@totalDirect, @indirectCosts)"}
]
```

Use variables when the same computation appears in multiple shapes or binds — avoids
repeating expressions and prevents calculation drift if you need to change the formula.

## Common patterns

**Conditional field:** inline `"relevant": "$orgType != 'government'"`

**Computed readonly:** `"calculate": "dateDiff($startDate, $endDate, 'months')"` + `"readonly": true`

**Regex constraint:** `"constraint": "matches($, \"^\\\\d{2}-\\\\d{7}$\")"` (double-escape in JSON)

**Money arithmetic across repeat:** `money(moneyAmount($unitCost) * $quantity, moneyCurrency($unitCost))`

**Sum across a repeat group:** in variable or shape: `moneySum($lineItems[*].subtotal)`

**Conditional section:** `relevant` bind on the group, not on each child individually

**Single-currency form:** set `formPresentation.defaultCurrency: "USD"` (or any ISO 4217 code)
to lock all money fields to that currency — the currency input becomes a read-only badge.
Override per-field with `"currency": "EUR"` on a specific field item.

**Date range validation:** `"constraint": "$endDate > $startDate"` on the `endDate` field

## Reference files

Load these when you need authoritative answers on edge cases or advanced features:

- `specs/core/spec.llm.md` — Full core spec: the 4-phase processing model, versioning
  semantics, response pinning, modular composition via `$ref`, instance data sources,
  version migrations, screener routing
- `specs/fel/fel-grammar.llm.md` — Normative FEL grammar: all reserved words, complete
  operator precedence table, path syntax conformance rules
