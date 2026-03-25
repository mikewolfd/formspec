---
name: formspec-specs
version: 1.0.0
description: This skill should be used when the user asks about "the spec", "spec sections", "how does formspec define X", "what section covers Y", "cross-tier behavior", "FEL grammar", "validation rules", "component binding", "theme cascade", "mapping transforms", "extension registry", "schema structure", "what properties does X have", "JSON schema for Y", or any question requiring knowledge of the Formspec specification suite or JSON schemas. Also triggers on implementation questions where normative spec behavior matters — processing model phases, null propagation, bind semantics, slot resolution, screener routing, version migrations, schema validation constraints, etc.
---

# Formspec Specification Navigator

Navigate 625K of specification content and 8K lines of JSON schemas without loading everything into context. This skill provides structured section maps, schema reference maps, cross-reference guides, and decision trees for finding the right spec section or schema property quickly.

## Specification Architecture

Formspec uses a **three-tier architecture** with companion specifications:

```
┌─────────────────────────────────────────────────────┐
│ Tier 3: Components (component-spec.md, 3334 lines)  │  Explicit rendering tree
│   36 component types, slot binding, responsive        │  Overrides Tier 1 & 2
├─────────────────────────────────────────────────────┤
│ Tier 2: Theme (theme-spec.md, 1161 lines)           │  Presentation intent
│   Design tokens, widget catalog, selector cascade    │  Overrides Tier 1
├─────────────────────────────────────────────────────┤
│ Tier 1: Core (spec.md, 4630 lines)                  │  Data & logic
│   Items, binds, FEL, validation, versioning          │  Baseline behavior
├─────────────────────────────────────────────────────┤
│ Companions:                                          │
│   FEL Grammar (394 lines) — Normative PEG grammar   │
│   Mapping DSL (2014 lines) — Bidirectional transforms│
│   Extension Registry (541 lines) — Extension system  │
│   Changelog (259 lines) — Version change format      │
└─────────────────────────────────────────────────────┘
```

**Precedence rule**: Tier 3 > Tier 2 > Tier 1. Each higher tier can override lower-tier behavior.

## Quick Decision Tree — Which Spec?

| Topic | Read This | Section |
|-------|-----------|---------|
| Item structure, data types, groups | Core spec | §4.2 Item Schema |
| Bind expressions (required, relevant, calculate, constraint, readonly) | Core spec | §4.3 Bind Schema |
| FEL syntax, operators, functions | Core spec §3 + FEL Grammar | §3.1–3.12 + full grammar |
| Validation shapes, severity, constraint kinds | Core spec | §5.1–5.7 |
| Processing model (rebuild/recalculate/revalidate/notify) | Core spec | §2.4 |
| Screener routing | Core spec | §4.7 |
| Versioning, migrations, response pinning | Core spec | §6.1–6.7 |
| Design tokens, color/spacing/typography | Theme spec | §3.1–3.5 |
| Widget catalog and configuration | Theme spec | §4.1–4.4 |
| Selector cascade (defaults → selectors → overrides) | Theme spec | §5.1–5.6 |
| Page layout, 12-column grid, regions | Theme spec | §6.1–6.5 |
| Component tree structure, children ordering | Component spec | §3.1–3.5 |
| Slot binding, bind resolution, dataType compatibility | Component spec | §4.1–4.6 |
| Any specific built-in component | Component spec | §5 (Core) or §6 (Progressive) |
| Custom components, param interpolation | Component spec | §7.1–7.5 |
| Conditional rendering (`when` vs `relevant`) | Component spec | §8.1–8.4 |
| Responsive breakpoints, mobile-first merge | Component spec | §9.1–9.4 |
| Cross-tier token cascade | Component spec | §10.1–10.5 |
| Data transforms (expression, coerce, valueMap, etc.) | Mapping spec | §4.1–4.13 |
| Bidirectional/reverse mapping | Mapping spec | §5.1–5.6 |
| Format adapters (JSON, XML, CSV) | Mapping spec | §6.1–6.5 |
| Extension publishing, discovery, resolution | Extension Registry | Full doc |
| Version changelogs, impact classification | Changelog spec | §3–§6 |

## File Types in specs/

| Suffix | Purpose | Normative? | When to Read |
|--------|---------|------------|--------------|
| `.md` | Canonical specification | **Yes** | Authoritative source for any behavioral question |
| `.llm.md` | Generated LLM reference | No | Quick context loading — compact summaries, auto-generated |
| `.bluf.md` | Bottom-line summary | No | 4-line essence of each spec, injected into canonical |
| `.semantic.md` | Semantic capsule | No | Conformance-oriented summary |

**Strategy**: Start with `.llm.md` for orientation. Consult canonical `.md` when precise behavioral semantics matter.

## Cross-Tier Interaction Points

These are the key places where specifications reference each other:

1. **Token Cascade** (Component §10 ← Theme §3): Components inherit design tokens from Theme. Unresolved tokens handled per §10.4.
2. **Widget Config** (Component §5–6 ← Theme §4): Theme's widget catalog provides typed configuration consumed by component rendering.
3. **Bind Compatibility** (Component §4.6 ← Core §4.3): Component slot binding checked against Definition item data types. See compatibility matrix in Component Appendix C.
4. **Conditional Logic** (Component §8 vs Core §4.3 relevant): Component `when` controls rendering visibility; Core `relevant` controls data relevance. Both use FEL but have different semantics — `relevant=false` excludes from response, `when=false` only hides visually.
5. **Responsive Design** (Component §9 ← Theme §6.4): Component breakpoints merge with Theme layout breakpoints using mobile-first strategy.
6. **Processing Model** (Core §2.4): All tiers depend on the 4-phase processing model — Rebuild → Recalculate → Revalidate → Notify.
7. **Extension Resolution** (All tiers ← Extension Registry): Extensions declared on items resolve against loaded registry entries. Unresolved = error.
8. **Mapping ↔ Core Versioning** (Mapping Appendix A ↔ Core §6.7): Version migrations can generate mapping rules; mapping rules can produce migrations.

## Critical Behavioral Rules (Cross-Spec)

- **`relevant=false` suppresses validation**: Non-relevant fields skip required/constraint checks (Core §5.6)
- **Tier precedence is absolute**: Tier 3 component tree overrides Theme layout, which overrides Definition formPresentation hints
- **FEL null propagation**: Most operations with null return null (Core §3.8). Exceptions: `coalesce()`, `if()`, null-check operators
- **Processing model is synchronous 4-phase**: No partial updates. Rebuild → Recalculate → Revalidate → Notify, always in order (Core §2.4)
- **Pages are theme-tier**: Page layout lives in Theme (§6), not in Definition. Definition only has advisory `formPresentation`
- **Component `when` vs bind `relevant`**: `when=false` hides but keeps data; `relevant=false` hides AND excludes from response (Component §8.2)

## JSON Schemas — Co-Authoritative with Specs

The `schemas/` directory contains 12 JSON Schema files (8162 lines total). Schemas and specs are **co-authoritative** — neither is assumed more correct than the other:

- **Schemas** define structural truth: what properties exist, their types, required fields, enums, patterns, constraints.
- **Specs** define behavioral truth: processing semantics, evaluation order, null handling, precedence, error behavior.

**When researching any question, always check BOTH the spec and corresponding schema.** If they disagree — a property the spec calls required isn't in the schema's `required` array, or the schema allows values the spec prohibits — that is an inconsistency to surface, not silently resolve.

| Schema | Lines | Defines |
|--------|-------|---------|
| `definition.schema.json` | 1685 | Core form definition — items, binds, instances, variables, screener |
| `component.schema.json` | 1511 | Component tree — 36 component types (35 built-in + CustomComponentRef), slot binding, responsive |
| `core-commands.schema.json` | 1196 | Programmatic commands for form manipulation |
| `fel-functions.schema.json` | 983 | FEL standard library — all 61 function signatures across 9 categories |
| `mapping.schema.json` | 807 | Mapping DSL — transforms, adapters, bidirectional rules |
| `theme.schema.json` | 658 | Theme document — tokens, widgets, selectors, pages, layout |
| `registry.schema.json` | 462 | Extension registry — entries, publishers, lifecycle |
| `response.schema.json` | 203 | Form response — submitted data, metadata, pinned version |
| `changelog.schema.json` | 194 | Version changelog — change objects, impact |
| `validationResult.schema.json` | 168 | Single validation result — severity, path, constraint kind |
| `validationReport.schema.json` | 159 | Full validation report — aggregated results |
| `conformance-suite.schema.json` | 136 | Test conformance suite — test cases, expected outcomes |

### Schema ↔ Spec Correspondence

| Schema | Normative Spec | Spec Sections |
|--------|---------------|---------------|
| definition | Core spec | §4.1–4.7 |
| component | Component spec | §2–7, Appendix B–C |
| theme | Theme spec | §2–6, Appendix A–C |
| mapping | Mapping spec | §3–6, Appendix A |
| registry | Extension Registry | Full doc |
| changelog | Changelog spec | §2–7 |
| response | Core spec | §2.1 (Response abstraction) |
| validationResult | Core spec | §5.3 |
| validationReport | Core spec | §5.4 |
| fel-functions | Core spec | §3.5 (Built-in Functions) |
| core-commands | N/A (tooling) | Studio/MCP tooling layer |
| conformance-suite | N/A (testing) | Test infrastructure |

### Schema Decision Tree

| Need To Know | Read This Schema |
|---|---|
| What properties can a form item have? | definition → Item |
| What bind types exist? | definition → Bind |
| What components are available? | component → component type discriminator |
| Properties of a specific component (e.g., Grid, TextInput) | component → $defs |
| FEL function signatures and parameters | fel-functions |
| Theme token categories | theme → tokens |
| Page layout structure | theme → pages |
| Mapping transform types | mapping → fieldRule |
| Extension entry format | registry → RegistryEntry |
| What a validation error looks like | validationResult |

### Schema Reference Maps

For property-level navigation of each schema, consult:

- **`references/schemas/definition.md`** — Definition schema: items, binds, instances, variables (1685 lines)
- **`references/schemas/component.md`** — Component schema: 34 components, slot binding, responsive (1511 lines)
- **`references/schemas/core-commands.md`** — Core commands schema: programmatic form manipulation (1196 lines)
- **`references/schemas/fel-functions.md`** — FEL functions schema: ~40+ function catalog (983 lines)
- **`references/schemas/mapping-theme-registry.md`** — Mapping, theme, and registry schemas (1927 combined)
- **`references/schemas/response-validation-changelog-conformance.md`** — Response, validation, changelog, conformance schemas (860 combined)

Each schema reference contains: top-level structure, $defs catalog, required fields, enums, cross-references, extension points, x-lm annotations, and validation constraints.

## Detailed Specification Reference Maps

For section-by-section navigation of each specification, consult the reference files:

- **`references/core-spec.md`** — Core specification: items, binds, FEL, validation, versioning (4630 lines mapped)
- **`references/theme-spec.md`** — Theme specification: tokens, widgets, cascade, layout (1161 lines mapped)
- **`references/component-spec.md`** — Component specification: tree, binding, 34 components, responsive (3334 lines mapped)
- **`references/mapping-spec.md`** — Mapping specification: transforms, bidirectional, adapters (2014 lines mapped)
- **`references/fel-grammar.md`** — FEL normative grammar: lexical rules, precedence, paths (394 lines mapped)
- **`references/extension-registry.md`** — Extension registry: publishing, discovery, lifecycle (541 lines mapped)
- **`references/changelog-spec.md`** — Changelog format: change objects, impact classification (259 lines mapped)

Each reference file contains:
- Complete section map (heading → description → key concepts → when to consult)
- Cross-references to other specs
- Key schemas defined
- Critical behavioral rules specific to that spec

## Navigation Strategy

1. **Identify the tier**: Is this about data/logic (Tier 1), presentation (Tier 2), or rendering (Tier 3)?
2. **Check the decision tree** above for the specific topic
3. **Load the .llm.md** file first for quick orientation: `specs/{tier}/{name}.llm.md`
4. **Consult BOTH reference maps** — the spec reference (`references/*.md`) AND the corresponding schema reference (`references/schemas/*.md`). If both agree, the answer is likely complete.
5. **Read targeted spec sections only** when precise normative language is needed — NEVER read an entire spec file. Use section headings from the reference maps to grep for the exact line, then read ~80 lines from that offset.
6. **Cross-reference spec ↔ schema** for any question about properties, types, or constraints. If they disagree, surface the inconsistency — do not silently pick one.
7. **Check cross-references** when behavior spans tiers or companion specs — the reference maps list every cross-spec link.

## Cross-Spec Lookup Paths

Common questions span multiple specs. These are the most frequent cross-spec paths:

- **FEL syntax + semantics**: `fel-grammar.md` (grammar) → `spec.md` §3 (semantics) → `fel-functions.schema.json` (stdlib)
- **Validation**: `spec.md` §5 (shapes, rules) → `validationResult.schema.json` → `validationReport.schema.json`
- **Versioning + Migration**: `spec.md` §6.7 → `changelog-spec.md` §6 → `mapping-spec.md` Appendix A
- **Extensions**: `spec.md` §8 → `extension-registry.md` → `registry.schema.json`
- **Widget resolution**: `spec.md` §4.2 (widgetHint) → `theme-spec.md` §4 (catalog) → `component-spec.md` §5–6 (components)
