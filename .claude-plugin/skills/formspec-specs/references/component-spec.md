# Component Specification Reference Map

> specs/component/component-spec.md -- 3592 lines, ~126K -- Tier 3: Component Tree, Slot Binding, 35 Built-in Components

## Overview

The Component Specification defines **Tier 3** of Formspec's presentation model: a sidecar **Component Document** with an explicit component tree whose nodes **slot-bind** to Definition items by key. It overrides Tier 2 (Theme) and Tier 1 hints for layout and widget choice, but **never** overrides Definition behavioral semantics (`required`, `relevant`, `readOnly`, `constraint`, `calculate`). The spec catalogs **35** built-in components (18 Core in §5, 17 Progressive in §6 with Core fallbacks in §6.18), **custom** templates in `components` with `{param}` interpolation, **`when`** (FEL) for visual conditionals, **`responsive`** breakpoint overrides, and **`tokens`** with Tier 3 > Tier 2 cascade. YAML frontmatter records `version: 1.0.0-draft.1` and `date: 2026-04-09`; the Status block also lists **Version** / **Date** prose -- treat schema and numbered sections as normative for structure.

## Section Map

### Preamble and Introduction (Lines 1-220)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| Frontmatter | (YAML) | Title, `version`, `date`, `status: draft` for document metadata alongside the Markdown title. | draft, version | Tooling or doc inventory |
| Preamble | Status of This Document | Draft companion to Core (`spec.md`); defines Component Documents as parallel presentation trees. Lists **Depends on:** Core, Theme (`theme-spec.md`), FEL (`fel-grammar.md`). | Draft, dependencies | Checking dependency chain or document status |
| Conventions | Conventions and Terminology | RFC 2119 keywords; JSON per RFC 8259; JSON Pointer RFC 6901; URI RFC 3986; `§` = this doc; `core` / `theme` prefixes for cross-spec. | RFC 2119, JSON Pointer, URI | Interpreting MUST/MAY or cross-reference notation |
| BLUF | Bottom Line Up Front | Tier 3 documents; required top-level keys; trees cannot override core behavior; BLUF governed by `schemas/component.schema.json`. | $formspecComponent, version, targetDefinition, tree, component.schema.json | Fast orientation |
| ToC | Table of Contents | Anchor list for §1–§13 and Appendices A–C (note: §10.5 exists in body; verify anchors if ToC drifts). | navigation | Jump targets |
| §1 | Introduction | Role of Tier 3 vs Core data model and Theme Tier 2; slot binding; FEL for `when`; 35 built-ins + custom; multiple documents MAY target one Definition. | Tier 3, Component Document, platform-specific | Why use a Component Document |
| §1.1 | Purpose and Scope | Explicit tree vs Theme selector cascade; same Definition, different presentations allowed. | parallel tree, slot-bound | Tier 2 vs Tier 3 choice |
| §1.2 | Relationship to Formspec Core, Theme Spec, and FEL | Three-tier table; Tier 3 wins layout/widget vs Tiers 1–2; behavioral rules always from Definition; Tier 3 MAY coexist with Theme; FEL only for `when` and display text interpolation -- not computed props. | behavioral rules immutable, FEL scope | Cross-tier precedence and FEL limits |
| §1.3 | Conformance Levels (Core / Complete) | **Core:** 18 Core + Progressive fallbacks + custom + when + responsive + tokens + bind. **Complete:** all 35 natively. | Core Conformant, Complete Conformant, §6.18 | Processor capability claims |
| §1.4 | Terminology | Tabular definitions: Definition, Component Document, Component, Tier hints/theme/component, Renderer, Token, Slot binding, Core/Progressive/Custom. | terminology | Precise term lookup |

### Document Structure (Lines 222-339)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §2 | Document Structure | JSON root; REQUIRED properties must be present for conformance. | JSON root | Authoring or parsing envelope |
| §2.1 | Top-Level Properties | Schema-generated table (`component.schema.json`): `$formspecComponent`, `version`, `targetDefinition`, `tree` (required); optional `url`, `name`, `title`, `description`, `breakpoints`, `tokens`, `components`, **`extensions`** (object; keys MUST be `x-` prefixed). Canonical structural contract. Processors MUST **ignore** unrecognized top-level keys starting with `x-`; MUST **reject** unrecognized keys that do not. | extensions, schema-ref, top-level | Validating envelope; extension points |
| §2.2 | Target Definition Binding | `targetDefinition.url` required URI; `compatibleVersions` optional semver range; SHOULD check range; MUST NOT fail -- SHOULD warn; MAY fall back to Tier 2/1. Same mechanism as **theme-spec §2.2**. | targetDefinition, compatibleVersions | Binding to a Definition |
| §2.3 | MIME Type (.formspec-component.json) | Extension `.formspec-component.json`; HTTP `application/json` or `application/formspec-component+json`. | MIME, file extension | Serving or saving files |
| §2.4 | Minimal Conforming Document | Minimal JSON example: Stack root + TextInput; lists optional top-levels including `extensions`. | minimal example | Smoke-test document shape |

### Component Model (Lines 341-556)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §3 | Component Model | Hierarchy of component objects (layout, input, display, container). | component object | Mental model |
| §3.1 | Component Object Base Properties | Base table: `component` (required), `id`, `bind`, `when`, `responsive`, `style`, `cssClass`, `accessibility`, `children`. **`id`:** optional; if present MUST match `^[a-zA-Z][a-zA-Z0-9_\-]*$`; MUST be unique (validation error; runtime warning + first wins). Enables `$component.<id>.<prop>` (locale spec §3.1.8), tests, a11y. Repeat templates share one template `id`; locale may use FEL with `@index`/`@count` per instance. Processors MUST **ignore** unrecognized properties on **component objects** (forward compatibility). | id pattern, locale addressing, repeat template | Any node authoring; forward-compatible parsers |
| §3.2 | Component Tree Semantics (single root) | `tree` is exactly one object, not an array; wrap in Stack/Page. Root MAY be any child-accepting type; leaf root is valid. | single root, tree | Fixing invalid `tree` arrays |
| §3.3 | Children Ordering | `children` order is normative render order; MUST NOT reorder except responsive may change **layout** props (e.g. Stack `direction`) while preserving logical array order in the new direction. | ordered children, responsive layout | Ordering vs responsive |
| §3.4 | Nesting Constraints | Categories Layout / Container / Input / Display; Input/Display MUST NOT have `children` (reject or ignore+warn); Spacer no children; depth SHOULD ≤ 20. | nesting, Spacer | Structural validation |
| §3.5 | AccessibilityBlock | `role`, `description` (→ `aria-describedby`), `liveRegion` (`off`/`polite`/`assertive`). MUST NOT apply `role="status"` or live-region semantics unless `liveRegion` set. | ARIA, liveRegion, aria-describedby | Accessibility overrides |
| §3.6 | Localizable String Properties | Table of components and props for `$component.<id>.<prop>`; bracket indices for arrays. | $component, tabLabels[N], items[N].label | Locale authoring |

### Slot Binding (Lines 558-727)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §4 | Slot Binding | `bind` links tree nodes to Definition items. | slot binding | Binding overview |
| §4.1 | The bind Property | String: flat key or dotted path to nested item; NOT JSON Pointer or FEL. | bind, dotted path | Authoring `bind` values |
| §4.2 | Bind Resolution Rules | Per category: Input bind rules, Display optional read-only, Layout/Container forbidden (except Accordion repeat + DataTable as specified). Bound Inputs MUST surface label, hint, required, readonly, relevant, validation; validation UI per **core §5.6** adjacent to bound input. | Input, Display, Layout, core §5.6 | Renderer bind behavior |
| §4.3 | Editable Binding Uniqueness | At most one **editable** Input per key; many read-only Displays MAY share a key. | duplicate bind | Validation |
| §4.4 | Repeatable Group Binding | Repeat templates; DataTable (§6.14), Accordion (§6.3); other layout/container MUST NOT bind repeat groups. | repeat template, DataTable, Accordion | Repeat UX |
| §4.5 | Unbound Required Items | Partial trees OK; required unbound → fallback after tree, Definition order; non-required MAY omit. | fallback, unbound required | Partial adoption |
| §4.6 | Bind/dataType Compatibility Matrix | Input ↔ dataType compatibility; Select + `multiChoice` MUST `multiple: true`. | dataType matrix | Type compatibility |

### Built-In Components -- Core (Lines 729-1628)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §5 | Built-In Components -- Core (18) | Introduces 18 Core components; MUST be supported; grouped by category with props/requirements/examples. | Core catalog | Core-only renderers |
| §5.1 | Page | Section/page container; title/description; wizard step visibility with Definition page mode. | Page | Multi-page / wizard layouts |
| §5.2 | Stack | Flex stack; `direction`, `gap`, `align`, `wrap`. | Stack | Default grouping |
| §5.3 | Grid | Columns + gaps; column count or template. | Grid, columns | Grids |
| §5.4 | [Reserved] | **Wizard** component removed; use `formPresentation.pageMode: "wizard"` and `Stack > Page*`; **Core §4.1.2** normative. | Wizard removed, pageMode | Why no Wizard type |
| §5.5 | Spacer | Layout leaf; `size`; no bind/children. | Spacer | Whitespace |
| §5.6 | TextInput | Text/multiline; placeholder, `maxLines`, `inputMode`, prefix/suffix; string (+ numeric temporal types as text where noted). | TextInput | Text fields |
| §5.7 | NumberInput | Numeric + stepper; step, min, max, `showStepper`, `locale`. | NumberInput | Numbers |
| §5.8 | DatePicker | Date/time/datetime; format, min/max, `showTime`; ISO storage. | DatePicker | Dates |
| §5.9 | Select | Dropdown/combobox; `searchable`, `multiple`, `placeholder`, `clearable`; combobox rules when searchable/multiple; options from item; keyword filter. | Select, options, keywords | Choices |
| §5.10 | CheckboxGroup | Multi-select checkboxes; `columns`, `selectAll`; `multiChoice`. | CheckboxGroup | Multi-choice |
| §5.11 | Toggle | Boolean switch; `onLabel`/`offLabel`. | Toggle | Booleans |
| §5.12 | FileUpload | Attachments; `accept`, `maxSize`, `multiple`, `dragDrop`. | FileUpload | Files |
| §5.13 | Heading | h1–h6; `level`, `text`; bind forbidden. | Heading | Headings |
| §5.14 | Text | Static or bound text; `format` plain/markdown; sanitize markdown; bind optional read-only. | Text, markdown | Read-only display |
| §5.15 | Divider | Rule; optional `label`; bind forbidden. | Divider | Separators |
| §5.16 | Card | Grouping surface; `title`, `subtitle`, `elevation`. | Card | Surfaces |
| §5.17 | Collapsible | Toggle section; `title`, `defaultOpen`; collapsed children stay mounted; data + relevant/`when` still evaluated. | Collapsible | Progressive disclosure |
| §5.18 | ConditionalGroup | Visibility from **required** `when` + optional `fallback`; invalid without `when`; hidden preserves data vs bind relevant. | ConditionalGroup, when required | Conditional sections |
| §5.19 | SubmitButton | Submit control; `label`, `mode`, `emitEvent`, `pendingLabel`, `disableWhenPending`; `formspec-submit` event; bind forbidden. | SubmitButton, formspec-submit | Submission UX |

### Built-In Components -- Progressive (Lines 1630-2560)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §6 | Built-In Components -- Progressive (17) | Progressive catalog + fallback story for Core processors. | Progressive, fallback | Complete vs Core |
| §6.1 | Columns | Explicit widths; fallback Grid. | Columns | Column widths |
| §6.2 | Tabs | `position`, `tabLabels`, `defaultTab`; children stay mounted. | Tabs | Tabs |
| §6.3 | Accordion | `allowMultiple`, `defaultOpen`, `labels`; optional repeat-group bind; fallback Stack+Collapsible. | Accordion, repeatable | Accordions / repeat |
| §6.4 | RadioGroup | `choice`; `columns`, `orientation`; fallback Select. | RadioGroup | Single choice radios |
| §6.5 | MoneyInput | Currency; ISO 4217; fallback NumberInput. | MoneyInput | Money |
| §6.6 | Slider | Range control; fallback NumberInput. | Slider | Sliders |
| §6.7 | Rating | Stars/icons; `allowHalf`; fallback NumberInput. | Rating | Ratings |
| §6.8 | Signature | Canvas signature; fallback FileUpload image/*. | Signature | Signatures |
| §6.9 | Alert | Severity + text; dismissible; ARIA roles; fallback Text prefix. | Alert | Banners |
| §6.10 | Badge | Compact label; variants; fallback Text. | Badge | Tags |
| §6.11 | ProgressBar | Value/max/label/percent; bind optional; fallback Text. | ProgressBar | Progress |
| §6.12 | Summary | Review list; `items` with `label`/`bind`/`optionSet`; label resolution; fallback Stack of Text. | Summary, optionSet | Review pages |
| §6.13 | ValidationSummary | Live/submit panel; `source`, `mode`, `showFieldErrors`, `jumpLinks`, `dedupe`, `focusField`; fallback Alert per finding. | ValidationSummary | Error summary |
| §6.14 | DataTable | Repeat group table; columns; add/remove; fallback Stack of Cards. | DataTable | Tabular repeats |
| §6.15 | Panel | Side panel; fallback Card. | Panel | Side content |
| §6.16 | Modal | Dialog; focus trap, `role="dialog"`, `aria-modal`; fallback Collapsible. | Modal | Modals |
| §6.17 | Popover | Anchored overlay; `triggerBind`, `placement`; fallback Collapsible. | Popover | Popovers |
| §6.18 | Fallback Requirements | 17-row fallback table + preservation rules (`when`, `responsive`, `style`, `bind`, `children`); discarded props SHOULD warn. | fallback table | Core substitution |

### Custom Components (Lines 2562-2722)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §7 | Custom Components | Reusable templates + `{param}` interpolation. | custom components | Reuse patterns |
| §7.1 | The components Registry | Top-level `components`; `params` + `tree`; PascalCase names; no built-in collisions; `x-` vendor names. | components, params | Defining templates |
| §7.2 | {param} Interpolation Grammar (ABNF) | `{name}` in allowed string props; `{{` escape; no nesting; forbidden in `component`, numeric/boolean, `$token`, `style`. | ABNF, interpolation | Template strings |
| §7.3 | Instantiation | `component` = template name + `params`; deep clone; merge instance `when`/`style`/`responsive` on root; missing/extra param rules. | instantiation | Using templates |
| §7.4 | Recursion Prohibition and Cycle Detection | No cycles in custom dependency graph; static detection; reject cyclic docs. | acyclic, cycle detection | Validation |
| §7.5 | Depth Limits | SHOULD ≤3 custom expansion levels; total depth SHOULD ≤20; MUST NOT enforce below 3 custom / 10 total. | depth limits | Limits |

### Conditional Rendering (Lines 2724-2810)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §8 | Conditional Rendering | `when` for visual show/hide without changing bind data semantics by itself. | when | Conditionals |
| §8.1 | The when Property | FEL boolean; one `when` per node; compound via FEL `and`/`or`. | FEL boolean | Writing `when` |
| §8.2 | Distinction from Bind relevant | `relevant` vs `when` precedence and data preservation rules. | when vs relevant | Confusing hides |
| §8.3 | FEL Evaluation Context | Data tree only; `$fieldKey`; `@index`/`@count` in repeat; no component props in FEL. | @index, @count, data-only | FEL in `when` |
| §8.4 | Error Handling | Malformed `when` → hide + warn; missing keys → null; no halt. | graceful degradation | FEL failures |

### Responsive Design (Lines 2812-2924)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §9 | Responsive Design | `breakpoints` + `responsive` overrides; Component breakpoints like **theme-spec §6.4**; Tier 3 overrides Theme namesakes. | breakpoints, responsive | Adaptive layout |
| §9.1 | Breakpoints Declaration | Named min-width map; Component overrides Theme. | min-width | Defining breakpoints |
| §9.2 | The responsive Property | Breakpoint → partial props; MUST NOT override `component`, `bind`, `when`, `children`, recursive `responsive`. | override rules | Safe responsive props |
| §9.3 | Merge Semantics (mobile-first) | Base + ascending breakpoint shallow merge; `style` replace whole object at breakpoint. | mobile-first, shallow merge | Merge bugs |
| §9.4 | Structural Constraints | Responsive MUST NOT change structure (type, children, bind, when). | structural stability | Reject invalid overrides |

### Theming and Design Tokens (Lines 2926-3040)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §10 | Theming and Design Tokens | Token format aligned with **theme-spec §3**. | tokens, $token | Theming in Tier 3 |
| §10.1 | The tokens Map | Flat string/number values; keys dot-delimited; no nesting; prefixes per **theme-spec §3.1–§3.2**. | tokens map | Declaring tokens |
| §10.2 | $token.path References | `$token.<key>` in styles/token-able props; non-recursive values. | $token.path | References |
| §10.3 | Cross-Tier Token Cascade | Component > Theme > renderer defaults. | token cascade | Resolution order |
| §10.4 | Unresolved Token Handling | Default + warn; MUST NOT fail. | unresolved token | Missing tokens |
| §10.5 | CSS Custom Property Emission (Web Renderers) | SHOULD emit resolved tokens as `--formspec-{key-with-dots-as-hyphens}`; bridge `var(--formspec-…)`; MAY emit Component `tokens` (Component wins over Theme for same name); update/cleanup on theme change; non-web MAY ignore. | CSS variables, --formspec- | Web integration |

### Cross-Tier Interaction (Lines 3042-3122)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §11 | Cross-Tier Interaction | Tier 3 vs Theme vs Definition hints. | cross-tier | End-to-end presentation |
| §11.1 | Tier 1 Fallback for Unbound Items | Theme → Tier 1 `presentation` (**core §4.2.5**) → defaults; with §4.5. | fallback chain | Unbound items |
| §11.2 | Tier 2 Token Inheritance | Theme tokens available without redeclaration; MAY override per key. | token inheritance | Shared design system |
| §11.3 | Precedence: Tier 3 > Tier 2 > Tier 1 | Layout/widget/tokens vs immutable behavioral rules; labels from Definition. | precedence | Conflict resolution |
| §11.4 | Partial Component Trees | Subset binding + fallback ordering; required editability. | partial tree | Incremental Tier 3 adoption |

### Validation, Conformance, and Complexity Controls (Lines 3124-3297)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §12 | Validation and Conformance | Processor validation and conformance levels. | validation | Implementing validators |
| §12.1 | Structural Validation (JSON Schema) | Required fields, types, enums, component names, children rules, ConditionalGroup `when`, Heading; **before** §12.2. | structural checks | Pipeline ordering |
| §12.2 | Referential Integrity | Bind keys, tokens, custom names/params, Summary/DataTable inner binds, acyclic custom graph. | referential integrity | Second-pass validation |
| §12.3 | Compatibility Validation | dataType vs §4.6 matrix; SHOULD error on mismatch. | compatibility | Type safety |
| §12.4 | Conformance Levels: Core / Complete | Same capability split as §1.3. | Core, Complete | Conformance docs |
| §13 | Complexity Controls | Excluded features + guard rails + `x-` extensions. | complexity, x- | Scope boundaries |
| §13.1 | Excluded Features | No imperative handlers, type switching, recursive templates, FEL computed props (except allowed uses), slot projection, animation spec, fetching, inheritance, dynamic registry, deep responsive children swap. | excluded | Out-of-scope requests |
| §13.2 | Guard Rails | Depth ~20; custom nesting ~3; single `when`; string params; no `{param}` in `component` type; flat tokens; editable uniqueness; static tree; processor floor limits. | guard rails | Abuse prevention |
| §13.3 | Extension Mechanism | `x-` names, top-level props, style keys, token prefixes; unsupported MUST NOT fail Core/Progressive render. | x- prefix | Vendor extensions |

### Appendices (Lines 3299-3592)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| App A | Appendix A: Full Example -- Budget Form | **Informative.** Wizard-style layout via Definition `pageMode`; custom `AddressBlock`; responsive Grid; DataTable; MoneyInput; Summary; Alert; Signature; ConditionalGroup; tokens. | full example | Authoring patterns |
| App B | Appendix B: Component Quick Reference | **Normative.** 35 rows: #, Component, Category, Level, Children, Bind, Description; Accordion¹ / DataTable² footnotes. | quick reference | At-a-glance classification |
| App C | Appendix C: DataType ↔ Component Compatibility | **Normative.** Matrix + notes (Display read-only bind; MoneyInput; TextInput universal fallback with warn; Select `multiple` on `multiChoice`). | matrix | dataType ↔ Input |

## Cross-References

- **Formspec Core (`spec.md`):** Items and structure (**core §4.2**); `formPresentation` / `presentation` hints (**core §4.1.1**, **core §4.2.5**); **core §4.1.2** page mode (replaces Wizard component); validation presentation **core §5.6** (adjacent to bound inputs in §4.2).
- **Theme Specification (`theme-spec.md`):** `targetDefinition` (**theme-spec §2.2**); tokens **theme-spec §3**, **§3.1**, **§3.2**, **§3.3**, **§3.5** (`x-` tokens); breakpoints **theme-spec §6.4**.
- **FEL Grammar (`fel-grammar.md`):** Boolean `when` (§8); optional FEL in locale strings for repeat instances (§3.1); display `text` interpolation where allowed (§1.2, §13.1).
- **Locale specification:** `$component.<id>.<prop>` -- **locale spec §3.1.8** (§3.1, §3.6).
- **`schemas/component.schema.json`:** Canonical top-level and structural contract (BLUF, §2.1, §12.1).
- **RFC 2119, RFC 8259, RFC 6901, RFC 3986:** Conventions (preamble).

## Key Schemas Defined

| Schema / Structure | Location | Description |
|-------------------|----------|-------------|
| **Component Document (top-level)** | §2.1, `component.schema.json` | `$formspecComponent`, `version`, `targetDefinition`, `tree`; optional `url`, `name`, `title`, `description`, `breakpoints`, `tokens`, `components`, **`extensions`**. |
| **TargetDefinition** | §2.2 | `url`, optional `compatibleVersions`. |
| **AnyComponent** | §3.1 | `component`, optional `id`, `bind`, `when`, `responsive`, `style`, `cssClass`, `accessibility`, `children` + type-specific props. |
| **AccessibilityBlock** | §3.5 | `role`, `description`, `liveRegion`. |
| **Breakpoints** | §9.1 | Name → min-width px. |
| **Tokens** | §10.1 | Flat string/number map. |
| **Custom template** | §7.1 | `params`, `tree`. |
| **Summary item** | §6.12 | `label`, `bind`, optional `optionSet`. |
| **DataTable column** | §6.14 | `header`, `bind`. |

## Component Quick Reference (Appendix B)

| # | Component | Tier | Category | Purpose | Bind |
|---|-----------|------|----------|---------|------|
| 1 | Page | Core | Layout | Page/section container | Forbidden |
| 2 | Stack | Core | Layout | Flex stack | Forbidden |
| 3 | Grid | Core | Layout | Grid layout | Forbidden |
| 4 | Spacer | Core | Layout | Spacing leaf | Forbidden |
| 5 | TextInput | Core | Input | Text / multiline | Required |
| 6 | NumberInput | Core | Input | Numeric input | Required |
| 7 | DatePicker | Core | Input | Date/time picker | Required |
| 8 | Select | Core | Input | Dropdown / combobox | Required |
| 9 | CheckboxGroup | Core | Input | Checkbox multi-select | Required |
| 10 | Toggle | Core | Input | Boolean switch | Required |
| 11 | FileUpload | Core | Input | File upload | Required |
| 12 | Heading | Core | Display | Heading h1–h6 | Forbidden |
| 13 | Text | Core | Display | Static or bound text | Optional |
| 14 | Divider | Core | Display | Separator | Forbidden |
| 15 | SubmitButton | Core | Display | Submit trigger | Forbidden |
| 16 | Card | Core | Container | Card surface | Forbidden |
| 17 | Collapsible | Core | Container | Collapsible section | Forbidden |
| 18 | ConditionalGroup | Core | Container | `when`-gated group | Forbidden |
| 19 | Columns | Progressive | Layout | Explicit columns | Forbidden |
| 20 | Tabs | Progressive | Layout | Tabs | Forbidden |
| 21 | Accordion | Progressive | Layout | Accordion (optional repeat bind¹) | Optional¹ |
| 22 | RadioGroup | Progressive | Input | Radio group | Required |
| 23 | MoneyInput | Progressive | Input | Money input | Required |
| 24 | Slider | Progressive | Input | Slider | Required |
| 25 | Rating | Progressive | Input | Rating | Required |
| 26 | Signature | Progressive | Input | Signature | Required |
| 27 | Alert | Progressive | Display | Alert banner | Forbidden |
| 28 | Badge | Progressive | Display | Badge | Forbidden |
| 29 | ProgressBar | Progressive | Display | Progress bar | Optional |
| 30 | Summary | Progressive | Display | Summary list | Forbidden (uses `items[].bind`) |
| 31 | ValidationSummary | Progressive | Display | Validation panel | Forbidden |
| 32 | DataTable | Progressive | Display | Repeat table² | Optional² |
| 33 | Panel | Progressive | Container | Side panel | Forbidden |
| 34 | Modal | Progressive | Container | Modal | Forbidden |
| 35 | Popover | Progressive | Container | Popover | Forbidden |

¹ Accordion `bind` optional; if set MUST be repeatable group (§6.3).  
² DataTable binds repeatable group, not scalar field (§6.14).

## Critical Behavioral Rules

1. **Behavioral rules are never overridden by Tier 3** (`required`, `readOnly`, `relevant`, `constraint`, `calculate` stay authoritative) (§1.2, §11.3).

2. **`when` vs `relevant`:** `relevant=false` hides regardless of `when`; `when=false` hides visually but preserves data unlike NRB-driven clears (§8.2).

3. **ConditionalGroup requires `when`.** Missing `when` is invalid (§5.18).

4. **ConditionalGroup hidden subtree preserves data** (contrast bind `relevant`) (§5.18).

5. **Collapsible:** collapsed children remain mounted; `relevant` / `when` still evaluated (§5.17).

6. **At most one editable Input per bind key;** multiple read-only Displays allowed (§4.3).

7. **`bind` is a plain string key or dotted path,** not JSON Pointer or FEL (§4.1).

8. **Only Accordion (repeat) and DataTable bind repeatable groups** among the special cases; other layout/container MUST NOT (§4.4).

9. **No Wizard component** -- use Definition `formPresentation.pageMode: "wizard"` + `Stack > Page*`; see **Core §4.1.2** (§5.4).

10. **Responsive MUST NOT change** `component`, `children`, `bind`, or `when` (§9.4).

11. **Responsive merge is shallow;** breakpoint `style` replaces entire `style` object (§9.3).

12. **Breakpoints:** Component map overrides Theme for same Definition (§9.1).

13. **Tokens non-recursive;** cascade Component > Theme > defaults (§10.2–§10.3).

14. **`{param}` interpolation** forbidden in `component` name, non-string props, `$token` literals, and `style` objects (§7.2).

15. **Custom `params` values are strings only** (§13.2).

16. **Custom components acyclic** -- static graph validation (§7.4).

17. **Progressive fallback** preserves `when`, `responsive`, `style`, `bind`, `children`; warn on discarded props (§6.18).

18. **Required unbound items** get Tier 2 → Tier 1 → default fallback **after** tree, Definition order (§4.5, §11.1).

19. **Structural validation before referential** (§12.1 → §12.2).

20. **Top-level:** ignore unknown `x-*`; **reject** unknown non-`x-` keys (§2.1). **Component nodes:** ignore unknown properties (§3.1).

21. **`when` errors:** hide + warn; do not halt (§8.4).

22. **Summary `optionSet`:** resolve label from option set, not raw value (§6.12).

23. **DataTable is Display** (tabular repeat; not a generic `children` container) (§6.14).

24. **Layout/Container bind:** forbidden except Accordion repeat and DataTable display pattern (§4.2); Layout never binds.

25. **Processor depth floors:** MUST NOT cap below 10 total depth or 3 custom expansion where limits apply (§7.5, §13.2).

26. **`id` pattern and uniqueness** rules + repeat-template shared `id` (§3.1).

27. **AccessibilityBlock:** do not imply `role="status"` / live region unless `liveRegion` set (§3.5).

28. **Select on `multiChoice` MUST set `multiple: true`** (§4.6, App C).

29. **SubmitButton** may emit `formspec-submit`; pending UI via `pendingLabel` / `disableWhenPending` (§5.19).

30. **Web renderers SHOULD emit `--formspec-*` CSS variables** from resolved tokens; MAY include Component tokens; clean up stale theme vars on theme change (§10.5).

31. **Validation UI for bound Inputs** aligns with **core §5.6** placement expectations (§4.2).

32. **Children order** is stable; responsive may change layout props (e.g. Stack direction) without reordering the logical `children` array (§3.3).
