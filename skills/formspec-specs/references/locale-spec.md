# Locale Specification Reference Map

> specs/locale/locale-spec.md -- 1230 lines, ~46K -- Companion: Internationalization and Localization

## Overview

The Locale Specification defines a standalone sidecar JSON document (Locale Document) that provides internationalized strings for a Formspec Definition. It follows the same sidecar pattern as Theme, Component, and References documents: the Definition provides sensible inline defaults, and the Locale Document overrides them for a specific language. The spec covers string key formats for addressing all localizable properties across all tiers (items, choices, validation messages, pages, components), FEL interpolation in localized strings, a multi-step fallback cascade (regional -> base language -> inline defaults), and four new FEL functions. Locale Documents are a presentation concern and MUST NOT affect data capture, validation logic, or the processing model.

## Section Map

### Front Matter and Introduction (Lines 1-151)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| Status | Status of This Document | Draft companion specification to Formspec v1.0. | draft, companion | Checking spec maturity |
| Conventions | Conventions and Terminology | RFC 2119/8174 keywords, references to core spec definitions. | MUST/SHOULD/MAY, conformant processor | Interpreting normative language |
| BLUF | Bottom Line Up Front | Four-bullet summary: valid locale requires `$formspecLocale`, `version`, `locale`, `targetDefinition`, `strings`; fallback cascade; FEL interpolation; governed by `schemas/locale.schema.json`. | Required fields, cascade, interpolation | Quick orientation |
| S1 | 1. Introduction | Purpose and positioning of locale support in Formspec. | -- | Orienting to the spec |
| S1.1 | 1.1 Purpose | Explains why a Locale Document exists: real-world forms need multiple languages; without a standard mechanism, implementors embed translations in the Definition or build bespoke infrastructure. Defines a Locale Document as a standalone JSON artifact. | Locale Document, sidecar pattern | Understanding why the spec exists |
| S1.2 | 1.2 Scope | Six things defined (Locale Document structure, string key format, FEL interpolation, fallback cascade, `locale()` function, `plural()` function) and six things excluded (locale negotiation, RTL layout, translation tooling, CLDR, modifying non-string properties). Addresses cross-tier string localization: `$page.*` for Theme pages, `$component.*` for Component nodes, `$optionSet.*` for shared option sets. | In-scope vs out-of-scope, cross-tier addressing | Determining if something belongs in this spec |
| S1.3 | 1.3 Relationship to Other Specifications | Table showing the sidecar pattern across concerns: Structure (Definition), Presentation (Theme), Interaction (Component), Data transform (Mapping), Localization (Locale Document). | Sidecar architecture | Understanding how locale fits in the spec suite |
| S1.4 | 1.4 Terminology | Defines six key terms: Definition, Locale Document, locale code (BCP 47), string key, cascade, interpolation. | Key terms | Looking up term definitions |
| S1.5 | 1.5 Notational Conventions | JSON comment style, `§N` section references. | -- | Reading examples correctly |

### Document Structure (Lines 152-240)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S2 | 2. Locale Document Structure | Top-level JSON structure with full example. Conforming implementations MUST recognize all defined properties and MUST reject documents missing REQUIRED properties. | Locale Document structure | Creating or validating a Locale Document |
| S2.1 | 2.1 Top-Level Properties | Full property table: `$formspecLocale` (const "1.0", required), `url` (URI, optional), `version` (required), `name` (optional), `title` (optional), `description` (optional), `locale` (BCP 47, required), `fallback` (BCP 47, optional), `targetDefinition` (required), `strings` (required), `extensions` (x-prefixed, optional). `additionalProperties: false`. | Required: $formspecLocale, version, locale, targetDefinition, strings | Authoring locale documents; understanding required vs optional |
| S2.2 | 2.2 Target Definition Binding | `url` (required) + `compatibleVersions` (optional semver range). Processor SHOULD verify version range; MUST NOT fail on mismatch (warn + fallback). | targetDefinition, compatibleVersions | Binding locale to a specific Definition |
| S2.3 | 2.3 Locale Code | BCP 47 language tags. Case-insensitive comparison. Normalize to lowercase language + title-case region (`fr-CA`). | BCP 47, case-insensitive | Validating locale codes |

### String Keys and Values (Lines 241-706)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S3 | 3. String Keys and Values | Overview of the string key system: dot-delimited paths addressing localizable properties. | String key format | Understanding the key addressing system |
| S3.1 | 3.1 String Key Format | General format: `<itemKey>.<property>`. Post-assembly keys when `$ref` with `keyPrefix` is used. | Key format, post-assembly keys, keyPrefix | Writing string keys |
| S3.1.1 | 3.1.1 Item Properties | Three localizable properties: `<key>.label`, `<key>.description`, `<key>.hint`. | label, description, hint | Localizing basic item strings |
| S3.1.2 | 3.1.2 Context Labels | Alternative display labels via `@context` suffix: `<key>.label@<context>`. Cascade: Locale `@context` -> Locale general -> Definition `labels[context]` -> Definition `label`. `@context` works on any localizable property, not just `label`. | Context labels, @context suffix, cascade for context | Providing context-specific translations (short, pdf, accessibility) |
| S3.1.3 | 3.1.3 Choice Option Labels | `<fieldKey>.options.<optionValue>.label`. Only `label` is localizable. Also `$optionSet.<setName>.<value>.label` for shared option sets. Backslash escaping for values with dots. | Choice localization, optionSet localization | Localizing choice/multiChoice option display text |
| S3.1.4 | 3.1.4 Validation Messages | Per constraint code: `<key>.errors.<CODE>` (e.g., `email.errors.REQUIRED`). Per bind: `<key>.constraintMessage`, `<key>.requiredMessage`. Resolution precedence: locale per-code -> locale per-bind -> bind property -> processor default. Code synthesis from `constraintKind` when `code` is absent. | Validation message localization, error codes, precedence | Localizing error messages |
| S3.1.5 | 3.1.5 Form-Level Strings | `$form.title`, `$form.description`. | Form-level localization | Localizing the form's own title/description |
| S3.1.6 | 3.1.6 Shape Rule Messages | `$shape.<shapeId>.message`. | Shape message localization | Localizing cross-field validation messages |
| S3.1.7 | 3.1.7 Page Layout Strings | `$page.<pageId>.title`, `$page.<pageId>.description`. Addresses Theme-tier page layout constructs. | Page localization, cross-tier | Localizing wizard/page titles |
| S3.1.8 | 3.1.8 Component Node Strings | `$component.<nodeId>.<prop>`. Addresses Component-tier node properties. Requires component nodes to have an `id`. Array properties use bracket indexing (`$component.tabs.tabLabels[0]`). Repeat template nodes share the same locale key across instances. | Component localization, cross-tier, repeat templates | Localizing component text (button labels, tab labels, etc.) |
| S3.2 | 3.2 Key Resolution Rules | Four rules: case-sensitive keys; orphaned keys produce warning not failure; subset coverage allowed; duplicate keys follow JSON last-value-wins. | Case sensitivity, forward compatibility | Understanding key matching and error handling |
| S3.3 | 3.3 FEL Interpolation | `{{<FEL expression>}}` syntax in string values. Expression evaluated in item's binding context. | Interpolation syntax, binding context | Adding dynamic content to localized strings |
| S3.3.1 | 3.3.1 Interpolation Processing | Five rules: literal `{{` via `{{{{`, failed expression -> literal text + warning, results coerced to string (null -> ""), no side effects, not recursive. | Escape, error handling, null coercion | Implementing interpolation evaluation |
| S3.3.2 | 3.3.2 Interpolation Binding Context | Table mapping key prefix to binding context: item keys -> item scope, `$form.*` -> global, `$shape.*` -> shape target scope, `$page.*` -> global, `$component.*` -> varies by repeat context. Repeat instance evaluation gives access to `@index` and `@count`. | Binding scope per key type, repeat context | Understanding FEL evaluation context for interpolated strings |

### Fallback Cascade (Lines 708-800)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S4 | 4. Fallback Cascade | Multi-step cascade from most-specific to least-specific locale. | Fallback cascade | Understanding string resolution order |
| S4.1 | 4.1 Cascade Order | Four steps: (1) regional locale document, (2) explicit `fallback` chain, (3) implicit language fallback (strip region subtag), (4) inline default. MUST return first non-null result. If all steps produce nothing, return `""`. | Regional -> explicit fallback -> implicit language -> inline | Implementing locale resolution |
| S4.2 | 4.2 Cascade Examples | Worked examples with `fr-CA` falling back to `fr` falling back to Definition inline defaults. | Cascade examples | Seeing how cascade resolution works in practice |
| S4.3 | 4.3 Circular Fallback Detection | Processors MUST detect circular chains (e.g., `fr-CA` -> `fr` -> `fr-CA`) and terminate, falling through to inline defaults. SHOULD emit warning. | Circular detection | Handling degenerate fallback configurations |
| S4.4 | 4.4 Multiple Locale Documents | Multiple documents may be loaded simultaneously. `setLocale()` determines active cascade. | Multiple documents | Loading multiple locales |

### FEL Functions (Lines 801-902)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S5 | 5. FEL Functions | Four new FEL functions. `locale()` and `plural()` are Locale Core conformance. `formatNumber()` and `formatDate()` are Locale Extended. MUST NOT collide with core built-in names. | New FEL functions | Understanding locale-specific FEL functions |
| S5.1 | 5.1 `locale()` | Returns active BCP 47 locale code. No arguments. Non-deterministic (like `now()`). Returns `""` if no locale active. Available in all FEL contexts (calculate, relevant, constraint, readonly). | locale() function, non-deterministic | Writing locale-aware FEL expressions |
| S5.2 | 5.2 `plural(count, singular, plural)` | Returns singular or plural form based on count. null -> null. count=1 -> singular. Otherwise -> plural. Covers two-form pluralization (EN, FR, ES, DE, etc.). Complex plural forms require FEL conditional expressions. | plural() function, two-form pluralization | Pluralizing labels in localized strings |
| S5.3 | 5.3 `formatNumber(value, locale?)` | Locale-formatted number string. null -> null. Falls back to "en" format if host doesn't support requested locale. Locale Extended conformance. | formatNumber() function | Formatting numbers per locale conventions |
| S5.4 | 5.4 `formatDate(value, pattern?, locale?)` | Locale-formatted date string. Pattern: short/medium/long/full (default: medium). null -> null. Locale Extended conformance. | formatDate() function | Formatting dates per locale conventions |

### Processor Capabilities and Processing Model (Lines 903-1094)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S6 | 6. Processor Capabilities | Four required capabilities for conformant locale processors. Method names are illustrative. | Processor API | Implementing a locale processor |
| S6.1 | 6.1 Load a Locale Document | Register a Locale Document. Validate `$formspecLocale` and `targetDefinition`. Same-locale replaces. MUST NOT trigger reactive updates until active locale set. | Load, validation, replacement | Loading locale documents |
| S6.2 | 6.2 Set the Active Locale | Activate a locale by BCP 47 tag. Build cascade, resolve all strings. Missing locale -> fallback to inline + warning. MUST trigger reactive updates. | setLocale, reactivity | Switching active locale |
| S6.3 | 6.3 Resolve a Localized String | Resolve by path + property + optional context. Returns resolved string after cascade + interpolation. Returns `""` if nothing found. | String resolution API | Programmatic string lookup |
| S6.4 | 6.4 Query the Active Locale | Return active BCP 47 code or `""` if none. | Active locale query | Querying current locale |
| S7 | 7. Validation and Linting | Schema validation and cross-reference checks. | Validation | Implementing locale validation |
| S7.1 | 7.1 Schema Validation | Validate against `schemas/locale.schema.json`. Required: `$formspecLocale`, `version`, `locale`, `targetDefinition`, `strings`. | Schema validation | Validating locale documents |
| S7.2 | 7.2 Cross-Reference Validation | Table of 10 cross-reference checks (orphaned key, missing translation, invalid option, invalid shape, invalid property, interpolation parse error, version mismatch, orphaned `$page`/`$component`/`$optionSet` keys, brackets in item key). | Cross-reference validation | Implementing linting for locale documents |
| S7.3 | 7.3 Linter Rules | 10 lint codes: L100-L401 covering structure, keys, interpolation, fallback. | Linter codes | Implementing locale linting |
| S8 | 8. Processing Model | How locale resolution integrates with the four-phase core cycle. | Processing model integration | Understanding when locale resolution happens |
| S8.1 | 8.1 Integration with the Four-Phase Cycle | Locale resolution is NOT part of the core cycle. It is a presentation concern. Conceptual layers: core cycle -> string resolution -> theme cascade -> render. String resolution and theme cascade are orthogonal. | Presentation concern, not core cycle | Understanding locale's position in the processing pipeline |
| S8.2 | 8.2 Validation Message Localization | Localized validation messages resolved at render time, not during Revalidate. Core produces `ValidationResult` with inline message; renderer resolves localized message via cascade. Three-step lookup: locale per-code -> locale per-bind -> `ValidationResult.message`. | Render-time message resolution | Implementing localized validation messages |
| S8.3 | 8.3 Reactivity | String resolution is reactive. Changes to active locale, field values in interpolation, or loaded documents trigger re-evaluation. Locale notifications are presentation-layer events, not core Phase 4 Notify. | Reactive resolution, signals | Implementing reactive locale updates |
| S8.4 | 8.4 Repeat Group Paths | Keys use template paths (no instance indices). Same string for all instances. Per-instance customization via `{{@index}}`. `@index` is 1-based. | Template paths, @index | Localizing labels in repeatable groups |

### Security, Conformance, and Appendix (Lines 1095-1230)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S9 | 9. Security Considerations | Content injection sanitization, expression evaluation security model (read-only, no side effects), document provenance verification. | Security | Implementing secure locale handling |
| S10 | 10. Conformance | Two conformance levels. | Conformance | Implementing a conformant processor |
| S10.1 | 10.1 Conformance Levels | Locale Core (minimum viable) and Locale Extended (full support). | Core vs Extended | Choosing conformance level |
| S10.2 | 10.2 Locale Core Conformance | Six requirements: parse/validate, fallback cascade, FEL interpolation, `locale()`, `plural()`, processor capabilities (load, setLocale, resolve, query). | Core requirements | Building minimum locale support |
| S10.3 | 10.3 Locale Extended Conformance | Core + `formatNumber()`, `formatDate()`, cross-reference validation, reactive resolution. | Extended requirements | Building full locale support |
| S10.4 | 10.4 Authoring Conformance | Four requirements: required properties, valid BCP 47 codes, valid key formats, valid FEL in interpolation. | Authoring conformance | Validating authored locale documents |
| Appendix A | Appendix A: Complete Locale Document Example | Full example demonstrating all key patterns: form-level, item labels, context labels, choice options, shared option sets, validation messages, shape messages, FEL interpolation, repeat groups, page titles, component strings. | Complete example | Learning by example |

## Cross-References

| Referenced Spec | Context |
|-----------------|---------|
| Formspec v1.0 Core Specification | Items (S4.2), Binds (S4.3), validation messages (S5), processing model (S2.4), option sets (S4.6), variables (S4.5), modular composition/keyPrefix (S6.6) |
| Formspec Theme Specification | Page layout (S6.1) for `$page.*` string keys |
| Formspec Component Specification | Component nodes with `id` for `$component.*` string keys |
| `schemas/locale.schema.json` | Structural contract for Locale Documents |
| `schemas/component.schema.json` | `$defs/TargetDefinition` shared type |
| FEL Normative Grammar | Syntax for `{{expression}}` interpolation |
| BCP 47 / IANA Language Subtag Registry | Locale code format |

## Key Schemas Defined

| Schema | Location | Purpose |
|--------|----------|---------|
| Locale Document (top-level) | S2.1, `schemas/locale.schema.json` | Top-level structure with all required/optional properties |
| TargetDefinition | S2.2, shared from component schema | Definition binding with optional version range |
| String keys | S3.1 (spec prose only) | Dot-delimited path format for addressing localizable properties |

## Critical Behavioral Rules

1. **Locale is a presentation concern, NOT part of the core processing cycle (S8.1).** String resolution happens after the core four-phase cycle (Rebuild/Recalculate/Revalidate/Notify). Changing locale does NOT trigger Rebuild or Recalculate — it triggers a separate presentation-layer update.

2. **Fallback cascade has four steps, in strict order (S4.1).** Regional locale -> explicit `fallback` chain -> implicit language fallback (strip region) -> inline default. Processors MUST walk all four steps and return the first non-null result. Empty string `""` is the final fallback.

3. **Validation messages are localized at render time, not during Revalidate (S8.2).** `ValidationResult.message` always contains the inline/default-locale message. Localized messages are a presentation overlay, not a mutation of the validation result.

4. **String keys use template paths for repeat groups (S8.4).** No instance indices in keys. Use `{{@index}}` interpolation for per-instance text. `@index` is 1-based.

5. **FEL interpolation failure is non-fatal (S3.3.1).** Failed expressions are replaced with the literal expression text and a warning is emitted. The string still resolves — the interpolation placeholder is visible but not catastrophic.

6. **`locale()` is non-deterministic like `now()` (S5.1).** Its return value changes when `setLocale()` is called. It is available in ALL FEL contexts (calculate, relevant, constraint, readonly), enabling locale-aware behavior logic in the Definition.

7. **Context labels cascade through four levels (S3.1.2).** Locale `key.label@context` -> Locale `key.label` -> Definition `labels[context]` -> Definition `label`. The `@context` suffix works on any localizable property, not just `label`.

8. **Circular fallback chains MUST be detected (S4.3).** A circular chain (e.g., `fr-CA` -> `fr` -> `fr-CA`) must terminate with a warning, falling through to inline defaults. Infinite loops are non-conformant.

9. **`$page.*` and `$component.*` keys cross tier boundaries (S1.2, S3.1.7, S3.1.8).** A Locale Document using these keys depends on both the target Definition and the associated Theme/Component Document. Validators SHOULD warn on orphaned cross-tier keys.

10. **Interpolation is not recursive (S3.3.1, rule 5).** The result of evaluating `{{expression}}` is not scanned for further `{{...}}` sequences. This prevents injection attacks and simplifies implementation.

11. **Null interpolation results become empty string (S3.3.1, rule 3).** `null` -> `""`, booleans -> `"true"/"false"`, numbers -> default string representation. No special formatting unless `formatNumber()`/`formatDate()` is used.

12. **Same-locale loading replaces, not merges (S6.1).** Loading a Locale Document with the same `locale` code as an already-loaded document MUST replace the previous one entirely. There is no merge semantics between same-locale documents.
