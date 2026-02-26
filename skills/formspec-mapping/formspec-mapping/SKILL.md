---
name: formspec-mapping
description: >
  Helps write Formspec Mapping documents — the bidirectional JSON DSL for transforming form
  response data to/from external schemas (JSON, XML, CSV). Use this skill whenever someone
  needs to: map form submission data to a backend API or database format, rename fields to
  snake_case or camelCase, transform option values to external codes, extract money objects
  to separate fields, conditionally include data blocks, set up server-side data
  transformation with Python MappingEngine, or define a reverse mapping from external data
  back into a form response.
---

# Formspec Mapping

You help people write **Mapping documents** — the JSON DSL that transforms form response data
to/from external schemas. Think of it as a declarative ETL layer between the form and your
backend, with optional bidirectional support.

## Document structure

```json
{
  "version": "1.0.0",
  "definitionRef": "https://example.org/forms/grant-application",
  "definitionVersion": ">=1.0.0 <2.0.0",
  "targetSchema": { "name": "grants-management-api", "version": "2.0" },
  "autoMap": false,
  "rules": []
}
```

`autoMap: true` copies source fields not covered by any rule. Keep it `false` for explicit
control over what reaches the external schema.

## Rules

Each rule maps `sourcePath → targetPath` with a transform:

```json
{
  "sourcePath": "orgType",
  "targetPath": "organization_type",
  "transform": "valueMap",
  "valueMap": {
    "nonprofit": "NPO",
    "university": "EDU",
    "government": "GOV",
    "forprofit": "FP"
  },
  "unmapped": "error",
  "priority": 10
}
```

Higher `priority` executes first. Same-priority rules follow document order. Paths use
dot-notation with bracket indices: `lineItems[0].amount`, `lineItems[*].amount`.

## Transform types

| Transform | What it does |
|-----------|-------------|
| `preserve` | Copy as-is; optionally set `default` for missing values |
| `drop` | Discard the field entirely — don't include in output |
| `valueMap` | Lookup table; `unmapped: "error"/"passthrough"/"drop"/"default"` |
| `coerce` | Type conversion: `"string"`, `"number"`, `"boolean"`, `"date"` |
| `expression` | FEL expression; `$source` is the source value, `$target` is current target |
| `constant` | Fixed value (FEL expression, source ignored) |
| `concat` | FEL expression combining multiple source values into one |
| `split` | FEL expression splitting one source value into multiple targets |
| `flatten` | Nested object → flat string |
| `nest` | Flat string → nested object |

## Common patterns

**Rename with snake_case:**
```json
{ "sourcePath": "orgName", "targetPath": "organization_name", "transform": "preserve" }
```

**Extract amount and currency from a money object:**
```json
{ "sourcePath": "requestedAmount", "targetPath": "requested_amount",
  "transform": "expression", "expression": "string(moneyAmount($source))" },
{ "sourcePath": "requestedAmount", "targetPath": "currency",
  "transform": "expression", "expression": "moneyCurrency($source)" }
```

**Transform option values to external codes:**
```json
{ "sourcePath": "orgType", "targetPath": "org_code",
  "transform": "valueMap",
  "valueMap": { "nonprofit": "NPO", "university": "EDU" },
  "unmapped": "passthrough" }
```

**Conditional inclusion — only include when present:**
```json
{ "sourcePath": "subcontractors", "targetPath": "sub_contracts",
  "transform": "preserve",
  "condition": "present($subcontractors)" }
```

**Add a suffix:**
```json
{ "sourcePath": "indirectRate", "targetPath": "indirect_rate_pct",
  "transform": "expression", "expression": "string($source) & '%'" }
```

**Rename keys within an array of objects:**
```json
{ "sourcePath": "lineItems", "targetPath": "budget_lines",
  "transform": "preserve",
  "arrayDescriptor": { "mode": "each" } }
```

**Coerce a string to a number:**
```json
{ "sourcePath": "durationDays", "targetPath": "duration",
  "transform": "coerce", "coercion": "number" }
```

## Condition guards

`condition` is evaluated before applying the transform. If falsy, the rule is skipped and
the target path is not written.

```json
"condition": "present($subcontractors)"
"condition": "source.orgType = 'government'"
"condition": "$source != null"
```

Conditions use FEL with `$source` referencing the source value for the rule's path.

## Array descriptor modes

| Mode | Behavior |
|------|----------|
| `whole` | Treat entire array as a single value |
| `each` | Apply the transform per element |
| `indexed` | Map by positional index |

## Reverse direction

By default, rules apply forward (form data → external). For bidirectional mapping, add a
`reverse` override on rules that need different behavior going back:

```json
{
  "sourcePath": "orgType",
  "targetPath": "org_code",
  "transform": "valueMap",
  "valueMap": { "nonprofit": "NPO", "university": "EDU" },
  "reverse": {
    "transform": "valueMap",
    "valueMap": { "NPO": "nonprofit", "EDU": "university" }
  }
}
```

`valueMap` auto-inverts for reverse if no explicit `reverse` is provided — useful for
clean 1:1 bidirectional code mappings.

Mark transforms that can't round-trip as non-reversible to prevent silent data loss:
```json
{ "transform": "expression", "expression": "...", "reversible": false }
```

## Using MappingEngine (Python)

```python
from formspec.mapping import MappingEngine
import json

with open("mapping.json") as f:
    mapping_doc = json.load(f)

engine = MappingEngine(mapping_doc)

# Forward: form response data → external schema
target = engine.forward(response["data"])

# Reverse: external data → form response shape
source = engine.reverse(external_data)
```

The engine applies defaults, then executes eligible rules in priority/document order,
evaluating condition guards before each transform.

## Reference files

Load this when you need the full transform type semantics, array handling detail, adapter
behavior (XML/CSV), or the complete error taxonomy:

→ `specs/mapping/mapping-spec.llm.md`
