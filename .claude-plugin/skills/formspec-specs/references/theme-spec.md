# Theme Specification Reference Map

> specs/theme/theme-spec.md -- 1222 lines, ~47K -- Tier 2: Design Tokens, Widget Catalog, Selector Cascade, Page Layout

## Overview

The Formspec Theme Specification defines the **sidecar theme document** format -- a separate JSON file that controls how a Formspec Definition is visually presented. It occupies Tier 2 of the three-layer architecture (Structure, Behavior, Presentation): Tier 1 inline hints in the Definition are baseline; themes override them via `defaults`, `selectors`, and `items`, assign widgets with `widgetConfig` and `fallback`, define `pages` on a 12-column grid, and supply flat `tokens` (plus optional `tokenMeta` for registry-oriented tooling). Multiple themes MAY target the same Definition for platform-specific rendering without changing the Definition.

## Section Map

### Preamble, Introduction, and BLUF (Lines 1-88)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| (frontmatter) | Document metadata | YAML title, version, date, draft status for this companion spec. | draft, companion spec | Checking document identity or draft maturity |
| (preamble) | Status of This Document | Declares Draft companion status to Formspec v1.0 Core; theme format is a sidecar controlling rendering. | Draft, companion spec | Normative status of the theme spec |
| (preamble) | Conventions and Terminology | RFC 2119 interpretation for MUST/SHOULD/MAY language. | RFC 2119, MUST, SHOULD | Reading normative requirements |
| 1 | Introduction | Frames the theme document and its role relative to Core (what vs how vs presentation). | Theme document, sidecar | Why themes exist |
| 1.1 | Purpose and Scope | Theme references Definition by URL; selector cascade overrides inline hints; widgets with config and fallbacks; 12-column pages; design tokens; multiple themes per Definition. | selector cascade, 12-column grid, tokens | Scope of theme vs Definition |
| 1.2 | Relationship to Formspec Core | Three layers: Items/Binds/Shapes vs Tier 1 presentation vs this spec (Tier 2); cascade in §5. | Tier 1 hints, Tier 2, precedence | How theme interacts with Core |
| 1.3 | Terminology | Definition, Theme, Tier 1 hints, Renderer, Token, Widget, Cascade. | formPresentation, presentation | Formal term lookup |
| 1.4 | Notational Conventions | Examples use `//` comments (non-JSON); monospace keys; § refs are this doc unless "core §". | JSON comments, cross-references | Reading examples |
| (BLUF) | Bottom Line Up Front | Valid theme needs `$formspecTheme`, `version`, `targetDefinition`; cascade `defaults` → `selectors` → `items`; BLUF governed by `schemas/theme.schema.json`. | required fields, cascade order | Quick orientation |

### Theme Document Structure (Lines 89-211)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 2 | Theme Document Structure | Top-level JSON object; conforming processors MUST recognize listed properties and reject themes missing REQUIRED fields; canonical example JSON. | $formspecTheme, targetDefinition, version | Authoring or validating root shape |
| 2.1 | Top-Level Properties | Schema-generated table: REQUIRED `$formspecTheme`, `version`, `targetDefinition`; optional `url`, `name`, `title`, `description`, `platform`, `stylesheets`, `tokens`, `tokenMeta`, `defaults`, `selectors`, `items`, `pages`, `breakpoints`, `extensions`. | tokenMeta, Token Registry, PresentationBlock | Implementing parsers/validators |
| 2.2 | Target Definition Binding | `targetDefinition.url` REQUIRED; `compatibleVersions` OPTIONAL semver range; processor MUST NOT fail on mismatch; SHOULD warn; MAY null-theme. | compatibleVersions, semver, null theme | Binding and version policy |
| 2.3 | Platform Declaration | Open string; well-known web, mobile, pdf, print, kiosk, universal; unrecognized values SHOULD still apply theme. | platform | Platform targeting |
| 2.4 | Theme Versioning | `version` free-form; SemVer RECOMMENDED; (`url`, `version`) SHOULD be unique. | version, SemVer | Theme identity and releases |
| 2.5 | External Stylesheets | URI array; load order = CSS precedence; MUST NOT fail on load error; non-web MAY ignore; CSP/CORS. | stylesheets, load order | External CSS integration |

### Design Tokens (Lines 212-346)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 3 | Design Tokens | Named values for consistency; referenced via `$token.` in styles and widgetConfig. | design tokens, $token. | Any token work |
| 3.1 | Token Structure | Flat map; dot-delimited keys; values MUST be strings or numbers only; no nesting, arrays, booleans, null. | flat map, DTCG (informative) | Defining token values |
| 3.2 | Token Categories | RECOMMENDED prefixes: `color.`, `spacing.`, `font.`, `radius.`, `typography.`, `border.`, `elevation.`, `x-`; links to Token Registry spec for structured catalog. | font., radius., x-, token-registry-spec | Naming and interoperability |
| 3.3 | Token Reference Syntax | `$token.<key>` in `style`, `widgetConfig`, Tier 3; resolved at application time; reserved cross-tier; `{param}` in Tier 3 does not conflict. | $token., resolution time | Writing references |
| 3.4 | Token Resolution | Lookup in `tokens`; if missing use platform default and SHOULD warn; no recursion; recursive treated as unresolved. | platform default, no recursion | Resolver implementation |
| 3.5 | Custom Token Groups | `x-` keys for vendor tokens; processors MUST NOT assign semantics unless recognized. | x- tokens | Custom/vendor tokens |
| 3.6 | Color Scheme Variants | Optional `color.dark.*` mirrors `color.*`; renderers SHOULD emit CSS custom properties; dark stylesheets use fallbacks; `prefers-color-scheme` etc. MAY drive activation. | color.dark.*, dark mode, CSS variables | Light/dark token pairing |

### Widget Catalog (Lines 347-499)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 4 | Widget Catalog | Same vocabulary as Core `widgetHint`; theme adds typed `widgetConfig` and `fallback`. | widgetHint, widgetConfig, fallback | Widget assignment overall |
| 4.1 | Relationship to Tier 1 widgetHint | `widget` in PresentationBlock accepts any valid Tier 1 `widgetHint`; theme adds config + fallback chains. | shared vocabulary | Aligning Tier 1 and Tier 2 |
| 4.2 | Typed widgetConfig Objects | Open object per widget tables; SHOULD support listed keys; MUST ignore unknown keys; Required vs Progressive widgets; group/display widgets have no config. | Required widgets, Progressive widgets | Per-widget configuration |
| 4.3 | Fallback Chains | Ordered `fallback`; first supported wins; else default widget per core §4.2.5.1; **widgetConfig does not carry** to fallbacks. | fallback, no config inheritance | Degradation and config |
| 4.4 | Widget Rendering Requirements | MUST support required; SHOULD support progressive and declare; MUST resolve fallback; MUST ignore unknown widgetConfig; `x-` custom widgets MUST NOT fail processor. | x- widgets, conformance | Renderer requirements |

### Selector Cascade (Lines 500-718)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 5 | Selector Cascade | Combines Tier 1, theme defaults, selectors, item overrides into effective PresentationBlock per item. | effective presentation, PresentationBlock | End-to-end presentation resolution |
| 5.1 | Overview | Levels 3..-2: items, selectors, defaults, Tier 1 presentation, formPresentation, renderer defaults; higher overrides lower. | cascade levels, null theme | Priority mental model |
| 5.2 | Level 1: Defaults | `defaults` PresentationBlock before selectors/items; form-wide baseline. | defaults | Baseline styling |
| 5.3 | Level 2: Selectors | `match` + `apply`; `type` and/or `dataType` with AND semantics; at least one criterion; **all** matching selectors merge in document order. | selectors, match, apply, AND | Type/datatype rules |
| 5.4 | Level 3: Item Key Overrides | `items` map key → PresentationBlock; unknown keys SHOULD warn, MUST NOT fail. | items, per-item override | Highest theme specificity |
| 5.5 | Cascade Resolution Algorithm | Pseudocode merge order; **shallow** per-property merge; nested objects replaced whole; **cssClass** union across levels with dedup and order. | merge, shallow merge, cssClass union | Implementing merge correctly |
| 5.6 | Interaction with Tier 1 Hints | Level 0/−1; no theme = null theme; `"none"` suppresses supported properties; JSON `null` forbidden; property name alignment table (`widget`↔`widgetHint`, etc.). | none sentinel, property alignment | Tier 1 vs Tier 2 property names |

### Page Layout System (Lines 719-860)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 6 | Page Layout System | `pages`, regions, 12-column grid, `breakpoints`, responsive overrides. | pages, regions, grid | Multi-page layout |
| 6.1 | Pages Array | Page objects: `id` (REQUIRED, regex), `title` (REQUIRED), `description`, `regions`; absent pages → walk Definition tree with cascade. | Page id regex | Defining pages |
| 6.2 | 12-Column Grid Model | Region `key`, `span` (1–12, default 12), `start`, `responsive`. | span, start, flow | Grid placement |
| 6.3 | Regions and Item Keys | Group key pulls subtree; repeatable groups; nested key standalone; unknown key SHOULD warn; unassigned items after pages or hidden if exhaustive. | group subtree, repeatable, unassigned | Region semantics |
| 6.4 | Responsive Breakpoints | Top-level `breakpoints` name → min-width px; region `responsive` can override `span`, `start`, `hidden`. | breakpoints, hidden | Responsive layout |
| 6.5 | Default Layout (No Pages) | Absent/empty `pages`: tree order + cascade; `formPresentation.pageMode` guides pagination (core §4.1.1). | pageMode, no pages | Behavior without theme pages |

### Processing Model (Lines 861-929)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 7 | Processing Model | Load, validate, compatibility, token resolution, per-item cascade, layout, emit presentation. | processing pipeline | End-to-end processor design |
| 7.1 | Theme Loading and Validation | Parse JSON; validate `theme.schema.json`; verify `$formspecTheme`; reject if REQUIRED missing. | schema validation | Loader strictness |
| 7.2 | Target Definition Compatibility Check | URL match; semver check if `compatibleVersions`; MUST NOT fail; SHOULD warn; MAY null theme. | compatibility | Runtime binding |
| 7.3 | Full Resolution Algorithm | Ordered steps: load, compatibility, token refs, per-item cascade + token pass + widget/datatype + fallback, layout/pages, emit. | resolution order | Orchestrating resolution |
| 7.4 | Error Handling | Table: unknown keys (warn), incompatible widget (fallback), unresolved token, recursive token, version mismatch, bad `$formspecTheme` (reject), x- widget (fallback), unknown widgetConfig (ignore). | error table | Error policy matrix |
| 7.5 | Null Theme (Default Rendering) | No theme: formPresentation + inline presentation + renderer defaults; conforming renderer MUST produce usable form from Tier 1 alone. | null theme, Tier 1 only | Baseline without Tier 2 |

### Extensibility (Lines 930-980)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 8 | Extensibility | Custom widgets, tokens, root `extensions`. | x- prefix | Vendor extensions |
| 8.1 | Custom Widgets via x- Prefix | Custom names; MUST end fallback chain on a standard widget. | x-map-picker, fallback chain | Custom controls |
| 8.2 | Custom Token Groups | `x-` token keys reserved for custom/vendor. | x- tokens | Brand-specific tokens |
| 8.3 | Platform-Specific Extensions | Root `extensions` with `x-` keys; processors MUST ignore unrecognized. | extensions, analytics, x-pdf | Platform metadata |

### Security and Accessibility (Lines 981-1021)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 9 | Security and Accessibility Considerations | **Informative** -- URLs, a11y, RTL. | informative | Non-normative guidance |
| 9.1 | Theme URL Resolution Security | SHOULD validate URIs, prefer `https:`, CSP, timeouts; mentions future `extends`. | URI validation, CSP | Hardening loaders/renderers |
| 9.2 | Accessibility Guidance | WCAG 2.2 contrast (informative); `labelPosition: "hidden"` MUST keep SR-accessible labels; sparing `liveRegion: "assertive"`. | WCAG 2.2, hidden labels | Accessible theming |
| 9.3 | RTL / Bidirectional Layout | `"start"` = leading edge; grid logical columns; SHOULD mirror in RTL. | RTL, bidirectional | Direction-aware layout |

### Appendices (Lines 1022-1222)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| Appendix A | Complete Theme Document Example | Informative full JSON: tokens, defaults, selectors, items, pages, responsive. | worked example | Copy-paste starting point |
| Appendix B | Widget–DataType Compatibility Table | **Normative** matrix: Required/Progressive/--, dataTypes, default fallbacks for group/display widgets. | 33 widgets, compatibility | Authoring fallbacks and support matrices |
| Appendix C | Token Quick Reference | Informative patterns and example values; ends with `$token.` resolution reminder. | token patterns | Quick token naming lookup |

## Cross-References

| Reference | Context |
|-----------|---------|
| Core `spec.md` -- Items (§4.2) | What data is collected; theme targets items by key |
| Core `spec.md` -- Binds (§4.3), Shapes (§5) | Behavior independent of theme |
| Core `spec.md` -- §4.1.1 `formPresentation` | Cascade level −1 |
| Core `spec.md` -- §4.2.5 `presentation` | Cascade level 0; Tier 1 hints |
| Core `spec.md` -- §4.2.5.1 `widgetHint` | Shared widget vocabulary with theme `widget` |
| `schemas/theme.schema.json` | Theme MUST validate; BLUF notes generated tables as canonical structural reference |
| `token-registry-spec.md` | Token Registry: structured catalog, `tokenMeta`, category schema; referenced §2.1, §3.2 |
| Tier 3 Component specifications | `{param}` interpolation; does not conflict with `$token.` |
| [Design Tokens Community Group (DTCG)](https://design-tokens.github.io/community-group/format/) | Informative: inspired flat token map vs nested DTCG |
| [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) | Normative keyword meanings |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Informative contrast/size guidance §9.2 |

## Key Schemas Defined

| Schema / Structure | Section | Description |
|--------------------|---------|-------------|
| Theme Document (root) | 2.1 | REQUIRED `$formspecTheme`, `version`, `targetDefinition`; optional metadata, `tokens`, `tokenMeta`, cascade fields, `pages`, `breakpoints`, `stylesheets`, `platform`, `extensions` |
| TargetDefinition | 2.2 | `{ url, compatibleVersions? }` |
| Tokens | 3.1 | Flat string/number values only |
| tokenMeta | 2.1 | Optional metadata map for custom tokens; follows Token Registry category schema; platform tokens not redefined here |
| PresentationBlock | 5.2–5.4 | `widget`, `widgetConfig`, `labelPosition`, `style`, `accessibility`, `fallback`, `cssClass` |
| Selector | 5.3 | `{ match: { type?, dataType? }, apply: PresentationBlock }` |
| Page | 6.1 | `{ id, title, description?, regions? }` |
| Region | 6.2 | `{ key, span?, start?, responsive? }` |
| Breakpoints | 6.4 | Record of name → non-negative integer min-width px |
| Extensions | 8.3 | Root object; keys MUST be `x-` prefixed |
| Widget–dataType matrix | Appendix B | Normative compatibility and default fallbacks |

## Critical Behavioral Rules

1. **Shallow merge per property, not deep merge.** `widgetConfig`, `style`, and `accessibility` objects are replaced wholesale by higher cascade levels; later selector does not merge keys into prior `style`.

2. **`cssClass` is the exception:** union semantics across defaults → matching selectors (order) → `items`; deduplicate, preserve order.

3. **`fallback` does not inherit `widgetConfig`.** Each supported widget uses its own defaults unless the cascade separately configures that widget.

4. **All matching selectors apply** in document order; later `apply` wins per property (not first-match-only).

5. **Selector `match` uses AND** when both `type` and `dataType` are present; at least one of the two is required.

6. **No recursive token values** containing `$token.`; treat as unresolved per §3.4 / §7.4.

7. **No JSON `null` in PresentationBlock** -- use `"none"` where defined for suppression; validators SHOULD reject `null`.

8. **`compatibleVersions` mismatch is non-fatal** -- MUST NOT fail; SHOULD warn; MAY apply null theme.

9. **Unknown `$formspecTheme` value is fatal** -- processor MUST reject the theme (§7.4).

10. **Unknown keys in `items` or region `key`** -- SHOULD warn; MUST NOT fail.

11. **`labelPosition: "hidden"`** still requires accessible label markup (§9.2).

12. **`labelPosition: "start"`** is logical (leading edge); respect direction (§9.3).

13. **Group region key** includes full subtree; inner layout from group Tier 1 `presentation.layout`, not the page grid (§6.3).

14. **Stylesheet load failure** -- MUST NOT fail theme render; SHOULD warn (§2.5).

15. **`x-` custom widgets** MUST have fallback ending on a standard widget (§8.1).

16. **`pages` live in the theme document**, not the Definition; without pages, tree walk + `pageMode` applies (§6.5).

17. **Nested item `key` in a region** may render standalone at grid position outside parent group layout when not using parent group key (§6.3).

18. **`color.dark.*` optional convention** pairs with `color.*` for scheme-specific palettes; renderers without dark mode may ignore emitted dark tokens (§3.6).

19. **`tokenMeta` is optional** metadata for custom tokens per Token Registry; must not redefine platform registry tokens (§2.1).
