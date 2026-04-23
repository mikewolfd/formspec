# Locale Specification Reference Map

> specs/locale/locale-spec.md -- 1263 lines, ~49K -- Companion: Internationalization, Sidecar Locale Documents, Fallback Cascade

## Overview

The Formspec Locale Specification defines the Locale Document -- a standalone sidecar JSON artifact that provides internationalized strings for a Formspec Definition. It covers dot-delimited string keys for all localizable properties (item labels, choice options, validation messages, form-level strings, shape messages, theme page titles, and component node text), FEL interpolation via `{{expression}}` with static-literal and null-coercion rules, a four-step fallback cascade (regional locale, explicit fallback chain, implicit language fallback, inline defaults) including cross-language explicit fallback behavior, and locale-tier FEL extensions (`locale()` is Locale Core; `formatNumber()` and `formatDate()` are Locale Extended). The spec defines two conformance levels and is a companion to the Formspec v1.0 Core Specification -- it does not alter core processing but adds a presentation-layer string resolution step.

## Section Map

### Front Matter and Introduction (Lines 1-158)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| -- | Status of This Document | Declares this is a draft companion specification to Formspec v1.0 Core. | draft, companion | Checking maturity/stability of the locale spec |
| -- | Conventions and Terminology | BCP 14 / RFC 2119 / RFC 8174 keyword definitions; JSON (RFC 8259) and URI (RFC 3986); core terms incorporated by reference. | RFC 2119, RFC 8174, RFC 8259, RFC 3986, BCP 14 | Understanding normative language conventions |
| -- | Bottom Line Up Front | Four bullets: sidecar JSON, required top-level fields, cascade + interpolation (including rule 3a for null without `$`/`@`), schema as canonical structural contract. | BLUF, rule 3a, schemas/locale.schema.json | Quick orientation before reading the full spec |
| S1 | 1. Introduction | Frames purpose and scope of the specification. | -- | High-level scope |
| S1.1 | 1.1 Purpose | Inline strings are defaults; Locale Document supplies translations without bloating the Definition or bespoke translation infra. | Locale Document, sidecar, FEL, fallback, contextual variants | Why the locale spec exists |
| S1.2 | 1.2 Scope | In-scope: document structure, keys, interpolation, cascade, `locale()`, `pluralCategory()`. Out-of-scope: negotiation, RTL, TM/MT, CLDR tables as built-ins. Cross-tier: `$page`, `$component`, `$optionSet`; MUST NOT alter non-string properties. | in-scope, out-of-scope, $page, $component, $optionSet | Whether a concern belongs here |
| S1.3 | 1.3 Relationship to Other Specifications | Table: structure/behavior (Definition), presentation (Theme), interaction (Component), transform (Mapping), localization (Locale). Multiple Locale Documents MAY target the same Definition. | sidecar, composable artifacts | How locale composes with other documents |
| S1.4 | 1.4 Terminology | Defines Definition, Locale Document, locale code (BCP 47), string key, cascade, interpolation. | terminology | Precise definitions |
| S1.5 | 1.5 Notational Conventions | JSON `//` in examples; monospace keys; § references (this doc vs core). | notation | Reading examples and cross-refs |

### Locale Document Structure (Lines 159-245)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S2 | 2. Locale Document Structure | JSON object; processors MUST reject documents missing REQUIRED properties; full example. | Locale Document structure | Authoring or parsing root object |
| S2.1 | 2.1 Top-Level Properties | Machine-generated schema-ref table for all root fields: `$formspecLocale`, `url`, `version`, `name`, `title`, `description`, `locale`, `fallback`, `targetDefinition`, `strings`, `extensions`. Extensions MUST be `x-` prefixed and MUST NOT alter resolution semantics. | schema-ref, extensions, critical | Validating or documenting root properties |
| S2.2 | 2.2 Target Definition Binding | `targetDefinition` binds by Definition `url`; optional `compatibleVersions` semver range; mismatch MUST NOT fail -- SHOULD warn, MAY fall back to inline. | compatibleVersions, semver | Version compatibility behavior |
| S2.3 | 2.3 Locale Code | `locale` MUST be valid BCP 47; SHOULD validate against IANA when available; MUST NOT fail on unknown subtags; case-insensitive comparison; SHOULD normalize (e.g. `fr-CA`). | BCP 47, IANA Language Subtag Registry | Parsing and comparing locale codes |

### String Keys and Values (Lines 246-735)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S3 | 3. String Keys and Values | Dot-delimited keys, interpolation, binding contexts. | string keys, FEL interpolation | Overall string system |
| S3.1 | 3.1 String Key Format | `<itemKey>.<property>`; with `$ref` + `keyPrefix`, keys MUST use post-assembly keys (core §6.6). | keyPrefix, post-assembly | Keys after modular composition |
| S3.1.1 | 3.1.1 Item Properties | Localizable: `<key>.label`, `.description`, `.hint`. | label, description, hint | Basic item text |
| S3.1.2 | 3.1.2 Context Labels | `@context` suffix; cascade for `label@context`; other properties skip Definition inline context step. | @context, labels, short, pdf, accessibility | Context-specific strings |
| S3.1.3 | 3.1.3 Choice Option Labels | `<fieldKey>.options.<optionValue>.label`; escape `.` and `\`; `$optionSet.<setName>.<value>.label`; field overrides OptionSet. | options, escaping, $optionSet | Choice / OptionSet labels |
| S3.1.4 | 3.1.4 Validation Messages | Per-code `<key>.errors.<code>` and per-item `<key>.constraintMessage` / `requiredMessage`; seven reserved codes; synthesis from `constraintKind`; precedence table. | REQUIRED, TYPE_MISMATCH, code synthesis, constraintKind | Localizing validation text |
| S3.1.5 | 3.1.5 Form-Level Strings | `$form.title`, `$form.description`; `$form` reserved. | $form | Form title/description |
| S3.1.6 | 3.1.6 Shape Rule Messages | `$shape.<shapeId>.message`; reserved prefix. | $shape, shapeId | Cross-field shape messages |
| S3.1.7 | 3.1.7 Page Layout Strings | `$page.<pageId>.title` / `.description`; ties to Theme `PageLayout` (theme spec §6.1); validators SHOULD warn on orphan page IDs. | $page, PageLayout | Theme page strings |
| S3.1.8 | 3.1.8 Component Node Strings | `$component.<nodeId>.<property>` with bracket indexing for arrays; only string-typed props; table lists 23 component types and localizable props; repeat templates share key, `{{}}` per instance. | $component, nodeId, bracket indexing | Component document strings |
| S3.2 | 3.2 Key Resolution Rules | Case-sensitive keys; orphaned keys → warning not failure; partial coverage; duplicate keys last-wins (RFC 8259 §4). | case-sensitive, orphaned keys, RFC 8259 | Edge cases in key lookup |
| S3.3 | 3.3 FEL Interpolation | `{{<FEL>}}` in values; binding context from key; stdlib, `locale()`, `pluralCategory()` (core §3.5). | double curly braces | Dynamic localized content |
| S3.3.1 | 3.3.1 Interpolation Processing | Rules: literal `{{` via `{{{{`; parse/eval failure preserves literal + warning (includes error-severity FEL diagnostics); null coercion; **rule 3a** preserves `{{…}}` when null, no `$`/`@`, and not interpolation static literal; static literal definition; no side effects; not recursive. | rule 3a, static literal, escape | Implementing interpolation evaluator |
| S3.3.2 | 3.3.2 Interpolation Binding Context | Table: item vs `$form` / `$shape` / `$page` / `$optionSet` / `$component` (global vs repeat instance); template path keys, instance evaluation. | binding context, @index, @count | Which scope applies to which key |

### Fallback Cascade (Lines 736-831)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S4 | 4. Fallback Cascade | Resolution walks most-specific to least-specific. | cascade, fallback | Overall cascade behavior |
| S4.1 | 4.1 Cascade Order | Four steps: regional match; explicit `fallback` chain (with §4.3 circular detection); implicit strip of region if base not already consulted in explicit chain; inline default. MUST return first non-null; else `""`. Note: explicit fallback to a *different* language still allows implicit strip of the *original* tag (e.g. `fr-CA` → `pt` then implicit `fr`). | regional, explicit, implicit, inline, empty string | Implementing resolution order |
| S4.2 | 4.2 Cascade Examples | Worked `fr-CA` / `fr` / inline example for `name.label` and `name.hint`. | fr-CA, fr | Verifying cascade |
| S4.3 | 4.3 Circular Fallback Detection | Cycles MUST terminate cascade to inline; SHOULD warn. | circular fallback | Cycle detection |
| S4.4 | 4.4 Multiple Locale Documents | Engine MAY load many; ordered cascade; `setLocale()` selects active chain. | multiple documents, setLocale | Multi-document engines |

### FEL Functions (Lines 832-936)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S5 | 5. FEL Functions | `locale()` = Locale Core; `formatNumber` / `formatDate` = Locale Extended (optional at that level). `pluralCategory()` is core. Extensions MUST NOT collide with core builtins; non-locale processors MUST NOT register locale extensions. | locale(), formatNumber(), formatDate(), conformance | Which functions to implement |
| S5.1 | 5.1 `locale()` | Active BCP 47 tag or `""`; non-deterministic like `now()` (core §3.1); available in calculate, relevant, constraint, readonly. | locale(), non-deterministic | Locale-aware Definition logic |
| S5.2 | 5.2 Pluralization via `pluralCategory()` | CLDR categories; combine with `if()`; French 0 as `one` example. | pluralCategory, CLDR | Plural forms in strings |
| S5.3 | 5.3 `formatNumber(value, locale?)` | Null in → null out; optional locale; SHOULD use platform Intl; MUST fall back to `en` if unsupported. | formatNumber, Intl.NumberFormat | Number formatting |
| S5.4 | 5.4 `formatDate(value, pattern?, locale?)` | ISO 8601 input; patterns short/medium/long/full; null handling; platform formatting. | formatDate, ISO 8601 | Date formatting |

### Processor Capabilities (Lines 937-990)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S6 | 6. Processor Capabilities | Four required capabilities; API names illustrative. | load, setLocale, resolve, query | Engine API surface |
| S6.1 | 6.1 Load a Locale Document | Validate version and target binding; same `locale` replaces prior; loading MUST NOT trigger reactive updates until active locale set. | load, replace semantics | Registration semantics |
| S6.2 | 6.2 Set the Active Locale | Build cascade; unknown locale → inline + SHOULD warn; MUST trigger reactive updates like field changes. | setLocale, reactive | Activation and reactivity |
| S6.3 | 6.3 Resolve a Localized String | Resolve by path, property, optional context; cascade + interpolation; `""` if nothing found. | resolve, path, property, context | Per-string API |
| S6.4 | 6.4 Query the Active Locale | Returns active tag or `""`. | query active locale | Reading current locale |

### Validation and Linting (Lines 991-1040)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S7 | 7. Validation and Linting | Schema, cross-reference checks, Python linter codes. | validation, linting | Validator implementation |
| S7.1 | 7.1 Schema Validation | MUST validate against `schemas/locale.schema.json`; lists enforced constraints. | locale.schema.json | Structural validation |
| S7.2 | 7.2 Cross-Reference Validation | Eleven checks with severities (orphaned key, missing translation, invalid option/shape/property, interpolation parse, version mismatch, orphaned `$page`/`$component`/`$optionSet`, brackets in item key). | cross-reference, severity | Cross-document validation |
| S7.3 | 7.3 Linter Rules | Python validator SHOULD implement L100–L401. | L100–L401 | Lint rule IDs |

### Processing Model (Lines 1041-1128)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S8 | 8. Processing Model | Where locale resolution sits relative to core and theme. | four-phase cycle, presentation | Architecture boundary |
| S8.1 | 8.1 Integration with the Four-Phase Cycle | String resolution NOT in Rebuild/Recalculate/Revalidate/Notify; layers: core → strings (post-Recalculate) → theme → render; strings and theme orthogonal (order not mandatory). | presentation concern, orthogonal | Pipeline ordering |
| S8.2 | 8.2 Validation Message Localization | Resolved at render time; `ValidationResult.message` stays inline/default; localized text is overlay. | ValidationResult, render-time | Validation + locale interaction |
| S8.3 | 8.3 Reactivity | Re-eval on locale change, interpolated field values, loaded documents; separate from Phase 4 Notify; SHOULD use computed signals per string. | reactive, signals | Reactive implementation |
| S8.4 | 8.4 Repeat Group Paths | Template paths without indices; per-instance via `@index` (1-based) in interpolation (core §3.2.2). | template path, repeat, @index | Repeat localization |

### Security Considerations (Lines 1129-1151)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S9 | 9. Security Considerations | Injection, expression model, provenance. | security | Threat model for locale |
| S9.1 | 9.1 Content Injection | MUST sanitize before HTML/markup; interpolation output is untrusted text. | XSS, sanitization | Safe rendering |
| S9.2 | 9.2 Expression Evaluation | Read-only like `calculate`; no side effects; no host APIs beyond stdlib. | read-only | Interpolation security |
| S9.3 | 9.3 Locale Document Provenance | SHOULD verify integrity/provenance like other sidecars. | integrity, provenance | Loading from untrusted sources |

### Conformance (Lines 1152-1191)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S10 | 10. Conformance | Levels and authoring rules. | Locale Core, Locale Extended | Conformance targets |
| S10.1 | 10.1 Conformance Levels | Core: cascade, interpolation, `locale()`. Extended: adds `formatNumber`/`formatDate`, cross-ref validation (§7.2), reactive resolution (§8.3). | conformance levels | Choosing a tier |
| S10.2 | 10.2 Locale Core Conformance | MUST: parse/validate, §4 cascade, §3.3 interpolation, §5.1 `locale()`, §6 capabilities. | Core requirements | Minimal processor |
| S10.3 | 10.3 Locale Extended Conformance | MUST satisfy Core plus §5.3–5.4, §7.2, §8.3. | Extended requirements | Full processor |
| S10.4 | 10.4 Authoring Conformance | Locale Document MUST: required props, valid BCP 47, valid keys, valid FEL in interpolations. | authoring | Authoring checklist |

### Appendix (Lines 1192-1263)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| App A | Appendix A: Complete Locale Document Example | Full grant-report example: `$form`, items, context labels, options, errors, shape, interpolation, repeat, `$page`, `$optionSet`, `$component`. | complete example | Copy-paste patterns |

## Cross-References

| Reference | Context | Location |
|-----------|---------|----------|
| Formspec v1.0 Core Specification (`../core/spec.md`) | Companion; Definition, Item, Response, Bind, FEL, conformant processor by reference. | Status, S1.3, S1.4, S3.1, S3.1.4, S3.3, S5, S8 |
| Core §3.1 (`now()`) | `locale()` non-determinism analogous to `now()`. | S5.1 |
| Core §3.2.2 | `@index` / repeat context in interpolation and §8.4. | S3.3.2, S8.4 |
| Core §3.5 (`pluralCategory()`) | Plural categories in interpolation; S5.2. | S1.2, S3.3, S5, S5.2 |
| Core §4 | Definition (terminology). | S1.4 |
| Core §4.3.1 (`constraintMessage`) | Bind-level messages in validation cascade. | S3.1.4 |
| Core §4.6 (OptionSet) | Shared sets; `$optionSet` keys. | S1.2, S3.1.3 |
| Core §6.6 (`$ref`, `keyPrefix`) | Post-assembly string keys. | S3.1 |
| Theme spec §6.1 (`PageLayout`) | `$page.<pageId>` addressing. | S3.1.7 |
| Component spec §3.1 (node `id`) | `$component.<nodeId>` addressing. | S3.1.8 |
| `schemas/locale.schema.json` | Canonical structure; BLUF; §2.1 schema-ref; §7.1. | BLUF, S2.1, S7.1 |
| `schemas/component/1.0#/$defs/TargetDefinition` | `targetDefinition` `$ref`. | S2.1 |
| `src/formspec/validator/` (Python) | Linter rules location (§7.3). | S7.3 |
| BCP 14 / RFC 2119 / RFC 8174 | Normative keywords. | Conventions |
| RFC 8259 (JSON) | Syntax; duplicate keys §4 (S3.2). | Conventions, S3.2 |
| RFC 3986 (URI) | URI syntax for URLs. | Conventions |
| BCP 47 / IANA Language Subtag Registry | Locale tags; optional validation. | S2.3 |
| CLDR | Plural categories for `pluralCategory()`. | S5.2 |
| Semantic Versioning | `version` / `compatibleVersions`. | S2.1, S2.2 |

## String Key Prefix Quick Reference

| Prefix | Target | Scope | Example |
|--------|--------|-------|---------|
| `<itemKey>.*` | Item properties | Item binding scope | `projectName.label` |
| `<itemKey>.options.<value>.*` | Choice option labels | Item binding scope | `status.options.yes.label` |
| `<itemKey>.errors.<CODE>` | Validation by code | Item binding scope | `email.errors.REQUIRED` |
| `<itemKey>.constraintMessage` | Bind constraint message | Item binding scope | `ssn.constraintMessage` |
| `<itemKey>.requiredMessage` | Required message | Item binding scope | `email.requiredMessage` |
| `$form.*` | Form title/description | Global | `$form.title` |
| `$shape.<id>.*` | Shape messages | Shape target scope | `$shape.budget-balance.message` |
| `$page.<id>.*` | Theme page strings | Global | `$page.info.title` |
| `$optionSet.<name>.*` | OptionSet option labels | Global | `$optionSet.yesNoNA.yes.label` |
| `$component.<id>.*` | Component string props | Global or repeat instance | `$component.submitBtn.label` |

## Reserved Validation Code Mapping

| `constraintKind` | Synthesized `code` |
|---|---|
| `required` | `REQUIRED` |
| `type` | `TYPE_MISMATCH` |
| `cardinality` | `MIN_REPEAT` or `MAX_REPEAT` |
| `constraint` | `CONSTRAINT_FAILED` |
| `shape` | `SHAPE_FAILED` |
| `external` | `EXTERNAL_FAILED` |

## Linter Rules Quick Reference

| Code | Description |
|------|-------------|
| L100 | Missing required top-level property |
| L101 | Invalid BCP 47 locale code |
| L200 | Orphaned string key -- item not found in Definition |
| L201 | Missing translation -- localizable property has no key |
| L202 | Invalid option value reference |
| L203 | Invalid shape ID reference |
| L300 | FEL interpolation parse error |
| L301 | FEL interpolation references undefined variable |
| L400 | Circular fallback chain detected |
| L401 | Fallback locale not loaded |

## Critical Behavioral Rules

1. **String resolution is a presentation concern, NOT part of the core four-phase cycle (§8.1).** It runs after Recalculate and is orthogonal to the Theme cascade. Locale changes are presentation-layer events, not core data events.

2. **The fallback cascade has four steps in strict order (§4.1).** Regional locale → explicit `fallback` chain (with circular detection) → implicit language fallback (strip region if the explicit chain has not already consulted that base language) → inline defaults. Processor MUST return the first non-null result; if all fail, return `""`. If explicit fallback targets a different language than the regional tag’s base (e.g. `fr-CA` with `fallback: "pt"`), implicit strip of the **original** requested locale to its base (`fr`) can still run after the explicit chain -- both explicit and implicit steps apply when they differ.

3. **Circular fallback chains MUST be detected and MUST terminate (§4.3).** Fall through to inline defaults; SHOULD warn.

4. **Interpolation rule 3a (§3.3.1):** When the result is `null`, the trimmed source has no `$` or `@`, and the expression is not an interpolation static literal, processors MUST preserve the literal `{{…}}` text (same as a failed eval). Distinguishes missing `$field` from typos / invalid expressions that evaluate to null.

5. **Interpolation failure MUST NOT break the entire string (§3.3.1 rule 2).** Failed expression → literal `{{<original>}}`; remainder resolves. Error-severity FEL diagnostics count as evaluation failure even if coerced value is null.

6. **Validation messages are localized at render time, not during Revalidate (§8.2).** `ValidationResult.message` always holds the inline/default-locale message; localized text is a presentation overlay.

7. **Locale codes are case-insensitive; string keys are case-sensitive (§2.3, §3.2).** Processors SHOULD normalize locale tags; keys like `projectName.label` vs `ProjectName.label` differ.

8. **Orphaned keys produce warnings, not errors (§3.2).** Forward-compatible locale documents for newer Definitions.

9. **Loading a Locale Document MUST NOT trigger reactive updates (§6.1).** Only `setLocale()` triggers cascade resolution and reactivity for strings.

10. **Repeat group keys use template paths -- no instance indices in keys (§8.4).** Per-instance text uses interpolation with `@index` (1-based). Bracket indices in non-`$component` keys are invalid (§7.2).

11. **`$page`, `$component`, and `$optionSet` keys imply cross-document dependencies (§3.1.7–3.1.8, §7.2).** Validators SHOULD warn on orphans against loaded Theme/Component/Definition.

12. **Field-level option keys override OptionSet-level keys (§3.1.3).** Cascade: field locale → `$optionSet` locale → inline option `label`.

13. **Definition version outside `compatibleVersions` MUST NOT fail (§2.2).** SHOULD warn; MAY use inline strings only.

14. **Interpolation is not recursive (§3.3.1 rule 6).** Output of `{{}}` is not scanned for nested interpolation.

15. **`locale()` is available in all FEL contexts (§5.1)** -- calculate, relevant, constraint, readonly -- not only inside locale string values.
