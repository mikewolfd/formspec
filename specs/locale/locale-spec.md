# Formspec Locale Specification v1.0

**Version:** 1.0.0-draft.1
**Date:** 2026-03-20
**Editors:** Formspec Working Group
**Companion to:** Formspec v1.0 — A JSON-Native Declarative Form Standard

---

## Status of This Document

This document is a **Draft** companion specification to the
[Formspec v1.0 Core Specification](../core/spec.md). It defines the Formspec
Locale Document format — a sidecar JSON document that provides
internationalized strings for a Formspec Definition.

## Conventions and Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and
"OPTIONAL" in this document are to be interpreted as described in
[BCP 14][rfc2119] [RFC 2119] [RFC 8174] when, and only when, they
appear in ALL CAPITALS, as shown here.

JSON syntax and data types are as defined in [RFC 8259]. URI syntax is
as defined in [RFC 3986].

Terms defined in the Formspec v1.0 core specification — including
*Definition*, *Item*, *Response*, *Bind*, *FEL*, and *conformant
processor* — retain their core-specification meanings throughout this
document unless explicitly redefined.

[rfc2119]: https://www.rfc-editor.org/rfc/rfc2119

---

## Bottom Line Up Front

<!-- bluf:start file=locale-spec.bluf.md -->
- This document defines the Locale Document — a sidecar JSON artifact for internationalizing Formspec Definitions.
- A valid locale requires `$formspecLocale`, `version`, `locale`, `targetDefinition`, and a non-empty `strings` object.
- String resolution uses a fallback cascade (regional → base → inline defaults) with FEL interpolation via `{{expression}}` syntax.
- This BLUF is governed by `schemas/locale.schema.json`; generated schema references are the canonical structural contract.
<!-- bluf:end -->

## 1. Introduction

### 1.1 Purpose

Formspec v1.0 defines form structure, behavior, and validation in a
single Definition document. Every Item has a `label`, optional
`description` and `hint` properties, and choice options with display
text. These inline strings serve as the default presentation language.

Real-world forms must be presented in multiple languages. A federal
grant application may need English, Spanish, and French versions. A
multinational survey may require dozens of locales with regional
variants. Without a standard localization mechanism, implementors must
either embed all translations inside the Definition (bloating it and
coupling translation to structural authoring) or build bespoke
translation infrastructure outside the spec.

This specification defines a **Locale Document** — a standalone JSON
artifact that provides localized strings for a Formspec Definition.
A Locale Document:

- References a Definition by URL and declares compatible versions.
- Maps item paths to localized strings via a flat key-value structure.
- Supports FEL interpolation for dynamic string content.
- Composes via a fallback cascade (regional → base → inline).
- Supports contextual variants (short, accessibility, pdf).

Authors who do not need internationalization change nothing. The
Definition's inline strings serve as the default locale.

### 1.2 Scope

This specification defines:

- The JSON structure for **Locale Documents** — standalone JSON
  documents that provide localized strings for a Formspec Definition.
- The **string key format** for addressing localizable properties of
  Items, choice options, and validation messages.
- The **FEL interpolation** syntax for embedding dynamic values in
  localized strings.
- The **fallback cascade** governing how string resolution walks the
  locale chain from regional to base to inline defaults.
- The **`locale()` FEL function** that exposes the active locale code
  to FEL expressions in the Definition.
- The **`plural()` FEL function** for expressing common pluralization
  patterns without ICU/CLDR data dependencies.

This specification does NOT define:

- Locale negotiation or `Accept-Language` parsing — this is a host
  application concern.
- Right-to-left layout or text direction — this is a Theme concern.
  Use a locale-specific Theme Document.
- Translation memory, machine translation, or translator tooling —
  these are external tooling concerns.
- Built-in plural tables, gender agreement tables, or number/date
  formatting patterns from CLDR — FEL expressions authored by the
  translator handle these cases.

### 1.3 Relationship to Other Specifications

The Formspec architecture defines concerns as composable sidecar
artifacts:

| Concern | Inline (Tier 1) | Sidecar artifact |
|---------|-----------------|------------------|
| Structure & behavior | Items, Binds, Shapes | Core Definition |
| Presentation | `presentation` hints | Theme Document |
| Interaction | `widgetHint` | Component Document |
| Data transform | `fieldMap` | Mapping Document |
| **Localization** | Inline string properties | **Locale Document** (this spec) |

The Locale Document follows the same sidecar pattern: the Definition
provides sensible defaults inline; the Locale Document overrides them
for a specific language. Multiple Locale Documents MAY target the same
Definition.

### 1.4 Terminology

| Term | Definition |
|------|------------|
| **Definition** | A Formspec Definition document (core spec §4). |
| **Locale Document** | A JSON document conforming to this specification. |
| **Locale code** | A BCP 47 language tag (e.g., `en`, `fr-CA`, `zh-Hans`). |
| **String key** | A dot-delimited path identifying a localizable string (§3.1). |
| **Cascade** | The fallback chain that determines the resolved string for a given key (§4). |
| **Interpolation** | Embedding FEL expressions in string values via `{{expression}}` syntax (§3.3). |

### 1.5 Notational Conventions

JSON examples use `//` comments for annotation; comments are not valid
JSON. Property names in monospace (`locale`) refer to JSON keys.
Section references (§N) refer to this document unless prefixed with
"core" (e.g., "core §4.2.5").

## 2. Locale Document Structure

A Formspec Locale Document is a JSON object. Conforming implementations
MUST recognize the following top-level properties and MUST reject any
Locale Document that omits a REQUIRED property.

```json
{
  "$formspecLocale": "1.0",
  "url": "https://agency.gov/forms/budget/locales/fr-CA",
  "version": "1.0.0",
  "name": "budget-fr-CA",
  "title": "Budget Form — Canadian French",
  "description": "French-Canadian localization for the annual budget form.",
  "locale": "fr-CA",
  "fallback": "fr",
  "targetDefinition": {
    "url": "https://agency.gov/forms/budget",
    "compatibleVersions": ">=1.0.0 <2.0.0"
  },
  "strings": {
    "projectName.label": "Nom du projet",
    "projectName.hint": "Entrez le nom officiel du projet",
    "budget.label": "Budget",
    "budget.description": "Section des informations budgétaires"
  }
}
```

### 2.1 Top-Level Properties

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecLocale` | string | **Yes** | Locale specification version. MUST be `"1.0"`. |
| `url` | string (URI) | No | Canonical URI identifier for this Locale Document. Stable across versions — the tuple (`url`, `version`) SHOULD be globally unique. |
| `version` | string | **Yes** | Version of this Locale Document. SemVer is RECOMMENDED. |
| `name` | string | No | Machine-friendly short identifier. |
| `title` | string | No | Human-readable display name. |
| `description` | string | No | Human-readable description of the locale's purpose. |
| `locale` | string | **Yes** | BCP 47 language tag identifying the locale this document provides strings for. |
| `fallback` | string | No | BCP 47 language tag of the locale to consult when a key is not found in this document's `strings`. See §4 for cascade rules. |
| `targetDefinition` | object | **Yes** | Binding to the target Definition. Same structure as Theme's `targetDefinition` (§2.2). |
| `strings` | object | **Yes** | Map of string keys to localized values. Keys follow the format defined in §3.1. Values are strings, optionally containing FEL interpolation (§3.3). MUST contain at least one entry. |
| `extensions` | object | No | Extension namespace. All keys MUST be `x-` prefixed. Processors MUST ignore unrecognized extensions. |

### 2.2 Target Definition Binding

The `targetDefinition` object binds this Locale Document to a specific
Definition.

| Property | Type | Cardinality | Description |
|---|---|---|---|
| `url` | string (URI) | **1..1** (REQUIRED) | Canonical URL of the target Definition (`url` property from the Definition). |
| `compatibleVersions` | string | **0..1** (OPTIONAL) | Semver range expression (e.g., `">=1.0.0 <2.0.0"`) describing which Definition versions this locale supports. When absent, the locale is assumed compatible with any version. |

When `compatibleVersions` is present, a processor SHOULD verify that
the Definition's `version` satisfies the range before applying the
Locale Document. A processor MUST NOT fail if the range is unsatisfied;
it SHOULD warn and MAY fall back to inline strings.

### 2.3 Locale Code

The `locale` property MUST be a valid BCP 47 language tag. Well-known
examples:

| Code | Language |
|------|----------|
| `en` | English |
| `en-US` | American English |
| `fr` | French |
| `fr-CA` | Canadian French |
| `es` | Spanish |
| `zh-Hans` | Simplified Chinese |
| `ar` | Arabic |

Processors MUST perform case-insensitive comparison of locale codes
(BCP 47 tags are case-insensitive). Processors SHOULD normalize
locale codes to lowercase language with title-case region
(e.g., `fr-CA`, not `FR-CA` or `fr-ca`).

## 3. String Keys and Values

### 3.1 String Key Format

String keys use dot-delimited paths that address localizable properties
of Items in the target Definition. The general format is:

```
<itemKey>.<property>
```

Where `<itemKey>` is the `key` of an Item in the Definition, and
`<property>` identifies which string property to localize.

#### 3.1.1 Item Properties

The following Item properties are localizable:

| Key pattern | Target property | Description |
|-------------|----------------|-------------|
| `<key>.label` | `Item.label` | Primary display label. |
| `<key>.description` | `Item.description` | Help text / tooltip. |
| `<key>.hint` | `Item.hint` | Instructional text alongside input. |

Examples:

```json
{
  "projectName.label": "Nom du projet",
  "projectName.hint": "Entrez le nom officiel",
  "budgetSection.label": "Section budgétaire",
  "budgetSection.description": "Détails du budget annuel"
}
```

#### 3.1.2 Context Labels

The Definition's `labels` object provides alternative display labels
keyed by context name (e.g., `short`, `pdf`, `accessibility`). Locale
Documents override these with a `@context` suffix:

```
<itemKey>.label@<context>
```

Examples:

```json
{
  "budgetSection.label": "Section budgétaire",
  "budgetSection.label@short": "Budget",
  "budgetSection.label@pdf": "Section III : Informations budgétaires",
  "budgetSection.label@accessibility": "Section du budget annuel détaillé"
}
```

When resolving a context label, the cascade is:

1. Locale Document key `<key>.label@<context>` (if present)
2. Locale Document key `<key>.label` (general label)
3. Definition `labels[context]` (inline context label)
4. Definition `label` (inline default)

#### 3.1.3 Choice Option Labels

Fields with `choices` have option display text that must be localized.
Options are addressed by their `value`:

```
<fieldKey>.options.<optionValue>.label
```

Examples:

```json
{
  "fundingStatus.options.yes.label": "Oui",
  "fundingStatus.options.no.label": "Non",
  "fundingStatus.options.na.label": "Sans objet"
}
```

When an option `value` contains characters that are not valid in a
dot-delimited key (`.`, `\`), those characters MUST be escaped with
a backslash: `\.` for a literal dot, `\\` for a literal backslash.

#### 3.1.4 Validation Messages

Custom validation error messages are addressed by the constraint kind:

```
<itemKey>.errors.<constraintKind>
```

Where `<constraintKind>` matches the `constraintKind` value from the
ValidationResult (e.g., `REQUIRED`, `CONSTRAINT`, `TYPE_MISMATCH`).

Examples:

```json
{
  "email.errors.REQUIRED": "L'adresse courriel est obligatoire",
  "email.errors.CONSTRAINT": "Veuillez entrer une adresse courriel valide",
  "budget.errors.TYPE_MISMATCH": "Le budget doit être un nombre"
}
```

#### 3.1.5 Form-Level Strings

Top-level Definition properties (`title`, `description`) use the
reserved key prefix `$form`:

```json
{
  "$form.title": "Rapport annuel sur les subventions",
  "$form.description": "Formulaire de rapport pour les bénéficiaires"
}
```

#### 3.1.6 Shape Rule Messages

Shape rules (cross-field validations) are addressed by the shape's
`id`:

```
$shape.<shapeId>.message
```

Example:

```json
{
  "$shape.budget-balance.message": "Le total du budget doit correspondre au financement demandé"
}
```

### 3.2 Key Resolution Rules

Processors MUST apply the following rules when resolving string keys:

1. Keys are **case-sensitive**. `projectName.label` and
   `ProjectName.label` are different keys.
2. A key that does not correspond to any Item, option, or shape in the
   target Definition SHOULD produce a **warning** but MUST NOT cause
   failure. This allows forward-compatible Locale Documents that
   include keys for items not yet present in older Definition versions.
3. A Locale Document MAY contain keys for a subset of localizable
   strings. Missing keys fall through the cascade (§4).
4. Duplicate keys within a single `strings` object are governed by
   JSON parsing rules (last value wins per RFC 8259 §4). Authoring
   tools SHOULD warn on duplicates.

### 3.3 FEL Interpolation

String values MAY contain FEL expressions delimited by double curly
braces:

```
{{<FEL expression>}}
```

The expression is evaluated in the binding context of the Item
identified by the string key's `<itemKey>` prefix. This gives the
expression access to:

- Field values via `$` references (e.g., `$budget`, `$projectName`)
- All FEL stdlib functions
- The `locale()` function (§5.1)
- The `plural()` function (§5.2)

Examples:

```json
{
  "itemCount.label": "Nombre d'articles : {{$itemCount}}",
  "budget.hint": "Maximum autorisé : {{format($maxBudget, '0,0.00')}} $",
  "lineItems.label": "Poste{{plural($count, '', 's')}}"
}
```

#### 3.3.1 Interpolation Processing

Processors MUST apply the following rules:

1. Literal `{{` that should NOT be interpreted as interpolation MUST
   be escaped as `\{\{`. Processors MUST replace `\{\{` with `{{`
   after interpolation.
2. An expression that fails to parse or evaluate MUST NOT cause the
   entire string resolution to fail. Processors MUST replace the
   failed expression with the literal text `{{<original expression>}}`
   and SHOULD emit a warning.
3. Expression results are coerced to strings. `null` becomes the
   empty string `""`. Booleans become `"true"` or `"false"`. Numbers
   use their default string representation.
4. Expressions MUST NOT have side effects. They are evaluated in the
   same read-only context as `calculate` expressions.
5. Interpolation is **not recursive** — the result of evaluating an
   expression is not scanned for further `{{...}}` sequences.

## 4. Fallback Cascade

When the engine resolves a localized string, it walks a fallback
chain from most-specific to least-specific:

### 4.1 Cascade Order

For a requested locale code (e.g., `fr-CA`) and string key
(e.g., `projectName.label`):

1. **Regional Locale Document** — Look up the key in the Locale
   Document whose `locale` matches `fr-CA`.
2. **Explicit fallback** — If not found and the Locale Document
   declares a `fallback` (e.g., `"fr"`), look up the key in the
   Locale Document whose `locale` matches `fr`.
3. **Implicit language fallback** — If not found and the locale code
   contains a region subtag, strip the region and look up the base
   language (`fr`). This step is skipped if step 2 already consulted
   the base language.
4. **Inline default** — Use the Definition's inline string property
   (`label`, `description`, `hint`, etc.).

A processor MUST walk the cascade in this order and MUST return the
first non-null result. If all steps produce no result, the processor
MUST return the empty string `""`.

### 4.2 Cascade Examples

Given these documents:

**Definition** (inline defaults):
```json
{
  "items": [
    { "key": "name", "type": "field", "label": "Name", "hint": "Enter your full name" }
  ]
}
```

**Locale Document (`fr`)**:
```json
{
  "locale": "fr",
  "strings": {
    "name.label": "Nom",
    "name.hint": "Entrez votre nom complet"
  }
}
```

**Locale Document (`fr-CA`)**:
```json
{
  "locale": "fr-CA",
  "fallback": "fr",
  "strings": {
    "name.hint": "Entrez votre nom au complet"
  }
}
```

Resolution for locale `fr-CA`:

| Key | `fr-CA` | `fr` | Inline | **Resolved** |
|-----|---------|------|--------|-------------|
| `name.label` | — | `"Nom"` | `"Name"` | **"Nom"** |
| `name.hint` | `"Entrez votre nom au complet"` | `"Entrez votre nom complet"` | `"Enter your full name"` | **"Entrez votre nom au complet"** |

### 4.3 Circular Fallback Detection

A processor MUST detect circular fallback chains (e.g., `fr-CA` →
`fr` → `fr-CA`) and MUST terminate the cascade, falling through to
inline defaults. Processors SHOULD emit a warning when a circular
fallback is detected.

### 4.4 Multiple Locale Documents

An engine MAY have multiple Locale Documents loaded simultaneously.
The engine maintains a locale cascade — an ordered list of Locale
Documents consulted during string resolution. The `setLocale()` call
(§6.2) determines which cascade is active.

## 5. FEL Functions

### 5.1 `locale()`

Returns the active locale code as a string.

**Signature:** `locale() → string`

Returns the BCP 47 language tag of the currently active locale. If no
locale is active (no Locale Document loaded), returns the empty
string `""`.

This function is available in all FEL evaluation contexts —
`calculate`, `relevant`, `constraint`, and `readonly` expressions.
This enables locale-aware logic in the Definition itself:

```json
{
  "key": "instructions",
  "type": "display",
  "label": "Instructions",
  "bind": {
    "relevant": "locale() = 'en' or locale() = ''"
  }
}
```

### 5.2 `plural(count, singular, plural)`

Returns `singular` or `plural` based on `count`.

**Signature:** `plural(count: number, singular: string, plural: string) → string`

- If `count` equals 1, returns `singular`.
- Otherwise, returns `plural`.

This covers the common two-form pluralization pattern used by English,
French, Spanish, Portuguese, German, and many other languages.

```json
{
  "lineItems.label": "{{$count}} ligne{{plural($count, '', 's')}}"
}
```

For languages with more than two plural forms (e.g., Arabic with six
forms, or Polish with three), authors MUST use FEL conditional
expressions:

```json
{
  "items.label": "{{$count}} {{$count = 0 ? 'elementów' : $count = 1 ? 'element' : ($count % 10 >= 2 and $count % 10 <= 4 and ($count % 100 < 10 or $count % 100 >= 20)) ? 'elementy' : 'elementów'}}"
}
```

### 5.3 `formatNumber(value, locale?)`

Formats a number according to locale conventions.

**Signature:** `formatNumber(value: number, locale?: string) → string`

- If `locale` is omitted, uses the active locale.
- Returns a locale-formatted string (e.g., `1234.5` → `"1 234,5"` for `fr`).
- Implementations SHOULD use the host platform's number formatting
  capabilities (e.g., `Intl.NumberFormat` in JavaScript,
  `locale.format_string` in Python).
- If the host platform does not support the requested locale, the
  implementation MUST fall back to the `"en"` format.

### 5.4 `formatDate(value, pattern?, locale?)`

Formats a date string according to locale conventions.

**Signature:** `formatDate(value: string, pattern?: string, locale?: string) → string`

- `value` is an ISO 8601 date string.
- `pattern` is one of: `"short"`, `"medium"`, `"long"`, `"full"`.
  Defaults to `"medium"`.
- If `locale` is omitted, uses the active locale.
- Implementations SHOULD use the host platform's date formatting
  capabilities.

## 6. Engine API

### 6.1 `loadLocale(document)`

Registers a Locale Document in the engine's locale store.

- `document` — a parsed Locale Document object conforming to this
  specification.
- Processors MUST validate the `$formspecLocale` version and
  `targetDefinition` binding before accepting the document.
- If a Locale Document with the same `locale` code is already loaded,
  the new document MUST replace it.
- Loading a Locale Document MUST NOT trigger reactive updates until
  `setLocale()` is called.

### 6.2 `setLocale(code)`

Activates a locale, triggering reactive string resolution.

- `code` — a BCP 47 language tag.
- The engine MUST build the fallback cascade (§4.1) and resolve all
  localized strings.
- If the requested locale code does not match any loaded Locale
  Document, the engine MUST fall back to inline defaults and SHOULD
  emit a warning.
- Changing the active locale MUST trigger reactive updates for all
  resolved strings. Implementations using reactive primitives (e.g.,
  signals) SHOULD propagate locale changes through the same
  notification mechanism as field value changes.

### 6.3 `resolveString(path, property, context?)`

Resolves a single localized string.

- `path` — the item path (e.g., `"projectName"`, `"budget[0].amount"`).
- `property` — the string property (e.g., `"label"`, `"hint"`,
  `"description"`).
- `context` — optional context name for alternative labels
  (e.g., `"short"`, `"pdf"`).
- Returns the resolved string after cascade lookup and FEL
  interpolation.
- Returns the empty string `""` if no string is found at any cascade
  level.

### 6.4 `getActiveLocale()`

Returns the currently active BCP 47 locale code, or the empty string
`""` if no locale is active.

## 7. Validation and Linting

### 7.1 Schema Validation

Locale Documents MUST validate against `schemas/locale.schema.json`.
The schema enforces:

- Required properties: `$formspecLocale`, `version`, `locale`,
  `targetDefinition`, `strings`.
- `strings` MUST be a non-empty object with string values.
- `locale` MUST match the BCP 47 pattern.
- `targetDefinition.url` MUST be a URI.

### 7.2 Cross-Reference Validation

A validator that has access to both a Locale Document and its target
Definition SHOULD perform the following cross-reference checks:

| Check | Severity | Description |
|-------|----------|-------------|
| Orphaned key | Warning | String key references an item key not present in the Definition. |
| Missing translation | Info | A localizable property in the Definition has no corresponding key in the Locale Document. |
| Invalid option reference | Warning | An `options.<value>` key references a choice value not present in the field's `choices`. |
| Invalid shape reference | Warning | A `$shape.<id>` key references a shape ID not present in the Definition. |
| Invalid property | Error | The property segment of a key is not a recognized localizable property. |
| Interpolation parse error | Warning | A `{{...}}` expression fails to parse as valid FEL. |
| Version mismatch | Warning | The Definition's version does not satisfy `compatibleVersions`. |

### 7.3 Linter Rules

The Python validator (`src/formspec/validator/`) SHOULD implement the
following locale-specific lint rules:

| Code | Description |
|------|-------------|
| L100 | Missing required top-level property. |
| L101 | Invalid BCP 47 locale code. |
| L200 | Orphaned string key — item not found in Definition. |
| L201 | Missing translation — localizable property has no key. |
| L202 | Invalid option value reference. |
| L203 | Invalid shape ID reference. |
| L300 | FEL interpolation parse error. |
| L301 | FEL interpolation references undefined variable. |
| L400 | Circular fallback chain detected. |
| L401 | Fallback locale not loaded. |

## 8. Processing Model

### 8.1 Integration with the Four-Phase Cycle

Locale string resolution is NOT part of the core four-phase processing
cycle (Rebuild → Recalculate → Revalidate → Notify). String resolution
is a **presentation concern** that runs after the core cycle completes.

The processing order is:

1. **Core cycle** — Rebuild, Recalculate, Revalidate, Notify.
2. **String resolution** — For each Item, resolve localized strings
   using the active locale cascade. FEL interpolation expressions
   are evaluated against the current (post-Recalculate) binding
   context.
3. **Theme cascade** — Apply the Theme Document's presentation
   overrides.
4. **Render** — The renderer uses resolved strings and themed
   presentation to produce the UI.

### 8.2 Reactivity

String resolution is reactive. When any of the following change, all
affected resolved strings MUST be re-evaluated:

- The active locale (via `setLocale()`).
- A field value referenced by an interpolation expression.
- The loaded Locale Documents (via `loadLocale()`).

Implementations using signals SHOULD create a computed signal for each
resolved string that depends on the active locale signal and any field
value signals referenced by interpolation expressions.

### 8.3 Repeat Group Paths

For items inside repeat groups, the string key uses the **template
path** (without instance indices):

```json
{
  "lineItems.amount.label": "Montant",
  "lineItems.description.label": "Description du poste"
}
```

The same localized string applies to all instances of the repeated
item. Per-instance string customization is not supported — use FEL
interpolation with `position()` if instance-specific text is needed:

```json
{
  "lineItems.label": "Poste {{position()}}"
}
```

## 9. Security Considerations

### 9.1 Content Injection

Localized strings are rendered as text content. Renderers MUST
sanitize string values before inserting them into HTML or other
markup contexts. FEL interpolation results MUST be treated as
untrusted text, not markup.

### 9.2 Expression Evaluation

FEL expressions in interpolated strings are evaluated in a read-only
context with the same security model as `calculate` expressions.
They MUST NOT have side effects and MUST NOT access host platform
APIs beyond those exposed by the FEL stdlib.

### 9.3 Locale Document Provenance

When loading Locale Documents from external sources, the host
application SHOULD verify document integrity and provenance using
the same mechanisms applied to other sidecar artifacts (Theme,
Mapping, Component Documents).

## 10. Conformance

### 10.1 Processor Conformance

A conformant locale processor MUST:

1. Parse and validate Locale Documents against the schema.
2. Implement the fallback cascade as defined in §4.
3. Evaluate FEL interpolation expressions as defined in §3.3.
4. Implement the `locale()` FEL function (§5.1).
5. Implement the `plural()` FEL function (§5.2).
6. Provide the `loadLocale()`, `setLocale()`, and `resolveString()`
   API surface (§6).

A conformant locale processor SHOULD:

1. Implement cross-reference validation (§7.2).
2. Implement `formatNumber()` and `formatDate()` functions (§5.3, §5.4).
3. Provide reactive string resolution (§8.2).

### 10.2 Authoring Conformance

A conformant Locale Document MUST:

1. Include all REQUIRED top-level properties (§2.1).
2. Use valid BCP 47 locale codes.
3. Use valid string key formats (§3.1).
4. Use valid FEL syntax in interpolation expressions.
