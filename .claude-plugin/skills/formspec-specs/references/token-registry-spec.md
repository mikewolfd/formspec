# Token Registry Specification Reference Map

> specs/theme/token-registry-spec.md -- 516 lines, ~35 KiB -- Tier 2 (presentation); companion to Theme; tooling artifact for token metadata, not runtime rendering.

## Overview

This draft companion spec defines the **Token Registry** JSON format: a structured catalog of design tokens (`$formspecTokenRegistry`, `categories`, per-token entries) so tooling can answer what tokens exist, their semantic **types**, defaults, dark counterparts, and custom theme extensions via **`tokenMeta`**. Renderers continue to use only the flat `tokens` map from Theme (and Component) documents; the registry is optional at runtime and advisory for validation.

## Section Map

### Front matter and §1 Introduction (Lines 3–57)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| -- | Status of This Document | Marks the doc as **Draft** companion to Theme; states scope (registry format for tooling/validation/studio). | Draft, companion specification | Confirm document status or normative weight. |
| -- | Conventions and Terminology | RFC 2119 keywords apply to requirements language in this spec. | MUST, SHOULD, MAY, RFC 2119 | Interpreting normative language. |
| 1.1 | Purpose and Scope | Contrasts Theme’s flat token map (enough for renderers) with registry needs: inventory, typing, defaults, dark pairing, custom tokens; registry is dev/tooling; **renderers MUST NOT require it**. | Token Registry, flat tokens map, tooling vs renderer | Why the registry exists; runtime boundary. |
| 1.2 | Relationship to Other Specifications | Registry describes keys/values in Theme `tokens`; adds metadata only. Component `tokens` may appear in registry or `tokenMeta`; metadata resolution is separate from value overrides. Core: not directly related; Tier 2. | Theme Specification, Component Specification, Tier 2 | Cross-tier placement; component token metadata. |
| 1.3 | Registry Discovery | How the platform registry is found is **implementation-defined** (SDK bundle, package export, project config). | platform registry, discovery | Where to load registry from in an implementation. |

### §2 Registry Format (Lines 59–172)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 2.1 | Top-Level Structure | JSON object: **`$formspecTokenRegistry`** (REQUIRED, MUST be `"1.0"`), optional `description`, REQUIRED **`categories`**. Processors MUST reject unknown registry versions. | $formspecTokenRegistry, 1.0, categories | Parsing/validating a standalone registry document. |
| 2.2 | Categories | Keys are **category prefixes**; values are Category objects: optional `description`, REQUIRED **`type`** (§3), optional **`darkPrefix`** (SHOULD only for `color`), REQUIRED **`tokens`** (≥1 entry). **Dark key derivation:** `P.<suffix>` + `darkPrefix` `D` → `D.<suffix>`; `dark` is not a separate registry row but maps to separate keys in Theme `tokens` (Theme §3.6). Consumers emitting CSS SHOULD emit light + derived dark custom properties. Registry prefixes need not match Theme §3.2’s RECOMMENDED list only. | darkPrefix, suffix, Category object, CSS custom properties | Dark-mode token keys; category layout. |
| 2.3 | Token Entries | Full dot key → entry: optional `description`, optional **`type`** (overrides category), RECOMMENDED **`default`**, optional **`dark`**, optional **`examples`**. Type inherits from category if omitted. **`dark` without category `darkPrefix`:** MUST ignore `dark`, SHOULD warn. **Token key uniqueness:** same key MUST NOT appear in two categories. | type inheritance, default, dark, examples, token key uniqueness | Authoring entries; dark without prefix bug. |

### §3 Token Types (Lines 174–205)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 3.1 | Type Vocabulary | Enumerates semantic types for tooling: `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `opacity`, `shadow`, `number` with examples. Types do **not** change CSS emission -- values pass through as-is. | color, dimension, fontFamily, fontWeight, duration, opacity, shadow, number | Picking types for editors/validators. |
| 3.2 | Type Validation | Validators SHOULD check values vs type; validation is RECOMMENDED. **Validators MUST NOT reject a theme** solely for type mismatch -- registry is **advisory**. | advisory validation, tooling only | Whether type errors can fail CI vs warn. |

### §4 Theme-Level Extension (Lines 207–297)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 4.1 | The `tokenMeta` Property | Theme MAY add **`tokenMeta.categories`** using the **same Category schema as §2.2**, not the full registry top-level (no `$formspecTokenRegistry` in `tokenMeta`). Schema note: `theme.schema.json` must be updated for `tokenMeta` to validate. Example shows `x-` custom tokens with mixed types in one category; optional `darkPrefix` for custom colors. | tokenMeta, categories, theme.schema.json | Extending themes with custom token metadata. |
| 4.2 | Extension Rules | Custom tokens SHOULD use **`x-` prefix** (Theme §3.5). **`tokenMeta` MUST NOT redefine** platform registry tokens (values can override in `tokens`; metadata stays from platform). Non-`x-` custom prefixes risk future collision. | x- prefix, platform registry precedence | Avoiding duplicate metadata for platform keys. |
| 4.3 | Resolution Order | Tooling SHOULD merge: (1) **platform registry** -- always; (2) **theme `tokenMeta`** -- custom; (3) **unregistered** -- raw KV, no type. Later sources **do not override** earlier for the same key -- platform wins even if §4.2 violated. | merge order, unregistered tokens | Implementing metadata resolution in Studio/validators. |

### §5 Consumption Model (Lines 299–332)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 5.1 | Studio | SHOULD: load platform registry, merge `tokenMeta`, group by category, type-specific editors, defaults + reset, dark alongside light for colors, “Other” for unregistered. | Studio, grouped tokens, reset-to-default | Studio UX expectations. |
| 5.2 | Renderers | **MUST NOT depend on registry at runtime**; emission from flat `tokens` only. | runtime independence, Theme Document, Component Document | Renderer architecture guardrails. |
| 5.3 | Validators | MAY warn: non-`x-*` tokens not in platform registry; type mismatches; registry keys missing from theme. **MUST NOT reject** theme on registry checks -- advisory only. | warnings, incomplete themes | Validator severity rules. |

### §6 Conformance and Appendix (Lines 334–516)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 6.1 | Registry Documents | Conformant registry: version `1.0`, ≥1 category, each category has `type` + `tokens` (≥1), every token key starts with `category.` prefix, no duplicate keys across categories. | conformance, category prefix rule | Validating registry JSON. |
| 6.2 | Theme Documents | If `tokenMeta` present: `tokenMeta.categories` matches Category schema; MUST NOT redefine platform token metadata -- validators SHOULD warn, MUST NOT reject. Omitting `tokenMeta` is conformant. | tokenMeta conformance, warn not reject | Theme authoring + validation policy. |
| 6.3 | Registry Consumers | Consumers MUST: parse §2 format, respect type inheritance (§2.3), follow §4.3 merge order. | registry consumer obligations | Building tools that consume registry + theme. |
| App. A | Complete Platform Registry Example | Full JSON example: `color` with `darkPrefix`, `spacing`, `radius`, `font` categories and representative entries. | example registry | Copy-paste structure for platform catalogs. |

## Cross-References

- **specs/theme/theme-spec.md** (Theme Specification) -- companion target; Theme §3.1 (tokens as flat map); §3.2 (RECOMMENDED category prefixes vs shipped registry); §3.5 (`x-` custom prefix); §3.6 (dark tokens in flat `tokens` map); token value resolution vs metadata resolution.
- **specs/component/component-spec.md** (Component Specification) -- Component Documents carry `tokens`; component tokens MAY be described in platform registry or theme `tokenMeta`; platform registry metadata applies to token key even when component overrides value.
- **Formspec Core Specification** -- explicitly not directly related; registry is presentation tier.
- **RFC 2119** (`https://www.ietf.org/rfc/rfc2119.txt`) -- normative keyword definitions.
- **schemas/theme.schema.json** -- must be updated to allow `tokenMeta` on Theme Documents for schema validation to pass (§4.1 schema note).

## Quick Reference Tables

### Registry top-level (§2.1)

| Property | Required | Notes |
|----------|----------|--------|
| `$formspecTokenRegistry` | Yes | MUST be `"1.0"` |
| `description` | No | Human-readable |
| `categories` | Yes | Prefix-keyed Category objects |

### Category object (§2.2)

| Property | Required | Notes |
|----------|----------|--------|
| `description` | RECOMMENDED | |
| `type` | Yes | Default type for entries; see §3 |
| `darkPrefix` | No | SHOULD use only when `type` is `color` |
| `tokens` | Yes | ≥1 full key → Token Entry |

### Token entry (§2.3)

| Property | Required | Notes |
|----------|----------|--------|
| `description` | RECOMMENDED | |
| `type` | No | Overrides category |
| `default` | RECOMMENDED | Platform default |
| `dark` | No | Ignored without category `darkPrefix` |
| `examples` | No | Docs/tooling hints |

### Token type vocabulary (§3.1)

| Type | Role |
|------|------|
| `color` | CSS color |
| `dimension` | Length with unit |
| `fontFamily` | font-family |
| `fontWeight` | weight keyword/number |
| `duration` | time value |
| `opacity` | 0–1 |
| `shadow` | box-shadow |
| `number` | unitless number |

### Metadata resolution merge (§4.3)

| Order | Source | Overrides same key? |
|-------|--------|----------------------|
| 1 | Platform registry | Base |
| 2 | Theme `tokenMeta` | No override of (1) |
| 3 | Unregistered | Raw, no type |

## Critical Behavioral Rules

1. **Renderers MUST NOT require the registry at runtime** -- CSS custom property emission uses only the flat `tokens` map (Theme and Component documents).
2. **`$formspecTokenRegistry` MUST be `"1.0"`** for this spec; processors MUST reject unrecognized versions.
3. **Each category’s `tokens` MUST have at least one entry**; each token key MUST match `categoryPrefix.*` for its category key.
4. **A token key MUST NOT appear in more than one category** in the same registry or `tokenMeta` document.
5. **Dark registry entries are not duplicate keys** -- `dark` on an entry pairs with `darkPrefix` to derive the runtime dark key (`D.<suffix>` from `P.<suffix>`); Theme still stores actual dark values under those keys per Theme §3.6.
6. **If `dark` is set but the category has no `darkPrefix`, processors MUST ignore `dark` and SHOULD warn** -- silent misuse is forbidden.
7. **`tokenMeta` uses the Category schema only** -- no `$formspecTokenRegistry` version field inside theme `tokenMeta`.
8. **`tokenMeta` MUST NOT redefine metadata for platform registry tokens** -- platform registry wins on merge (§4.3); theme overrides values in `tokens`, not metadata in `tokenMeta`.
9. **Metadata merge is “first wins”** -- platform, then `tokenMeta`; same-key metadata from theme extensions does not override platform catalog.
10. **Type validation is advisory** -- validators MUST NOT reject a theme document solely because values fail registry-declared types (§3.2, §5.3).
11. **Registry-based validator output is warnings-only** -- including missing keys, out-of-catalog names, §4.2 violations (SHOULD warn, MUST NOT reject).
12. **Custom token keys SHOULD use `x-` prefix** (Theme §3.5); other prefixes risk future platform collision.
13. **Discovery of the platform registry is implementation-defined** -- spec does not mandate a single URL or path.
14. **Token types do not alter emitted CSS** -- they drive editors, grouping, and optional checks only.
