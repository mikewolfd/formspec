---
name: formspec-specs
version: 1.1.0
description: This skill should be used when the user asks about "the spec", "spec sections", "how does formspec define X", "what section covers Y", "cross-tier behavior", "FEL grammar", "validation rules", "component binding", "theme cascade", "mapping transforms", "extension registry", "schema structure", "what properties does X have", "JSON schema for Y", "localization", "locale documents", "ontology bindings", "semantic types", "references documents", "agent context", or any question requiring knowledge of the Formspec specification suite or JSON schemas. Also triggers on implementation questions where normative spec behavior matters -- processing model phases, null propagation, bind semantics, slot resolution, screener routing, version migrations, schema validation constraints, internationalization, concept bindings, vocabulary alignment, external references, etc.
---

# Formspec Specification Navigator

Navigate 780K+ of specification content and 9400 lines of JSON schemas without loading everything into context. This skill provides structured section maps, schema reference maps, cross-reference guides, and decision trees for finding the right spec section or schema property quickly.

## Specification Architecture

Formspec uses a **three-tier architecture** with companion specifications:

```
+-----------------------------------------------------+
| Tier 3: Components (component-spec.md, 3424 lines)  |  Explicit rendering tree
|   34 component types, slot binding, responsive       |  Overrides Tier 1 & 2
+-----------------------------------------------------+
| Tier 2: Theme (theme-spec.md, 1167 lines)            |  Presentation intent
|   Design tokens, widget catalog, selector cascade    |  Overrides Tier 1
+-----------------------------------------------------+
| Tier 1: Core (spec.md, 4665 lines)                   |  Data & logic
|   Items, binds, FEL, validation, versioning          |  Baseline behavior
+-----------------------------------------------------+
| Companions:                                          |
|   FEL Grammar (394 lines) -- Normative PEG grammar   |
|   Mapping DSL (2023 lines) -- Bidirectional transforms|
|   Extension Registry (584 lines) -- Extension system  |
|   Changelog (260 lines) -- Version change format      |
|   Locale (1230 lines) -- Internationalization         |
|   Ontology (782 lines) -- Semantic concept bindings   |
|   References (697 lines) -- External docs & agent data|
+-----------------------------------------------------+
```

**Precedence rule**: Tier 3 > Tier 2 > Tier 1. Each higher tier can override lower-tier behavior.

## Quick Decision Tree -- Which Spec?

| Topic | Read This | Section |
|-------|-----------|---------|
| Item structure, data types, groups | Core spec | S4.2 Item Schema |
| Bind expressions (required, relevant, calculate, constraint, readonly) | Core spec | S4.3 Bind Schema |
| FEL syntax, operators, functions | Core spec S3 + FEL Grammar | S3.1-3.12 + full grammar |
| Validation shapes, severity, constraint kinds | Core spec | S5.1-5.7 |
| Processing model (rebuild/recalculate/revalidate/notify) | Core spec | S2.4 |
| Screener routing | Core spec | S4.7 |
| Versioning, migrations, response pinning | Core spec | S6.1-6.7 |
| Design tokens, color/spacing/typography | Theme spec | S3.1-3.5 |
| Widget catalog and configuration | Theme spec | S4.1-4.4 |
| Selector cascade (defaults -> selectors -> overrides) | Theme spec | S5.1-5.6 |
| Page layout, 12-column grid, regions | Theme spec | S6.1-6.5 |
| Component tree structure, children ordering | Component spec | S3.1-3.5 |
| Slot binding, bind resolution, dataType compatibility | Component spec | S4.1-4.6 |
| Any specific built-in component | Component spec | S5 (Core) or S6 (Progressive) |
| Custom components, param interpolation | Component spec | S7.1-7.5 |
| Conditional rendering (`when` vs `relevant`) | Component spec | S8.1-8.4 |
| Responsive breakpoints, mobile-first merge | Component spec | S9.1-9.4 |
| Cross-tier token cascade | Component spec | S10.1-10.5 |
| Data transforms (expression, coerce, valueMap, etc.) | Mapping spec | S4.1-4.13 |
| Bidirectional/reverse mapping | Mapping spec | S5.1-5.6 |
| Format adapters (JSON, XML, CSV) | Mapping spec | S6.1-6.5 |
| Extension publishing, discovery, resolution | Extension Registry | Full doc |
| Version changelogs, impact classification | Changelog spec | S3-S6 |
| Internationalization, localized strings, fallback cascade | Locale spec | S2-S8 |
| FEL interpolation in locale strings | Locale spec | S3.3 |
| `locale()`, `plural()`, `formatNumber()`, `formatDate()` | Locale spec | S5.1-5.4 |
| Semantic concept bindings (schema.org, FHIR, ICD-10) | Ontology spec | S3-S5 |
| Vocabulary/terminology alignment | Ontology spec | S4 |
| Cross-system field alignment (SKOS) | Ontology spec | S5 |
| JSON-LD context for linked data export | Ontology spec | S6 |
| External documentation, help articles, regulatory guidance | References spec | S2-S4 |
| AI agent context: vector stores, RAG, tool schemas | References spec | S3, S5 |
| Reference types, audience filtering (human/agent/both) | References spec | S2.1-2.2 |

## File Types in specs/

| Suffix | Purpose | Normative? | When to Read |
|--------|---------|------------|--------------|
| `.md` | Canonical specification | **Yes** | Authoritative source for any behavioral question |
| `.llm.md` | Generated LLM reference | No | Quick context loading -- compact summaries, auto-generated |
| `.bluf.md` | Bottom-line summary | No | 4-line essence of each spec, injected into canonical |
| `.semantic.md` | Semantic capsule | No | Conformance-oriented summary |

**Strategy**: Start with `.llm.md` for orientation. Consult canonical `.md` when precise behavioral semantics matter.

## Cross-Tier Interaction Points

These are the key places where specifications reference each other:

1. **Token Cascade** (Component S10 <- Theme S3): Components inherit design tokens from Theme. Unresolved tokens handled per S10.4.
2. **Widget Config** (Component S5-6 <- Theme S4): Theme's widget catalog provides typed configuration consumed by component rendering.
3. **Bind Compatibility** (Component S4.6 <- Core S4.3): Component slot binding checked against Definition item data types. See compatibility matrix in Component Appendix C.
4. **Conditional Logic** (Component S8 vs Core S4.3 relevant): Component `when` controls rendering visibility; Core `relevant` controls data relevance. Both use FEL but have different semantics -- `relevant=false` excludes from response, `when=false` only hides visually.
5. **Responsive Design** (Component S9 <- Theme S6.4): Component breakpoints merge with Theme layout breakpoints using mobile-first strategy.
6. **Processing Model** (Core S2.4): All tiers depend on the 4-phase processing model -- Rebuild -> Recalculate -> Revalidate -> Notify.
7. **Extension Resolution** (All tiers <- Extension Registry): Extensions declared on items resolve against loaded registry entries. Unresolved = error.
8. **Mapping <-> Core Versioning** (Mapping Appendix A <-> Core S6.7): Version migrations can generate mapping rules; mapping rules can produce migrations.
9. **Locale String Resolution** (Locale S8 <- Core S2.4): Locale resolution is a presentation concern, NOT part of the core four-phase cycle. Happens after Notify, before render.
10. **Cross-Tier Locale Keys** (Locale S3.1.7-3.1.8 <- Theme S6, Component S5-6): Locale Documents can address Theme page titles (`$page.*`) and Component node strings (`$component.*`).
11. **Ontology <-> Registry Concepts** (Ontology S3.4 <- Extension Registry S3.2): Ontology Document bindings take precedence over registry concept entries. Both complement each other.
12. **Concept Resolution Cascade** (Ontology S3.4 <- Core S4.2.3 semanticType <- Extension Registry): Three-level: Ontology binding > registry concept > semanticType literal.

## Critical Behavioral Rules (Cross-Spec)

- **`relevant=false` suppresses validation**: Non-relevant fields skip required/constraint checks (Core S5.6)
- **Tier precedence is absolute**: Tier 3 component tree overrides Theme layout, which overrides Definition formPresentation hints
- **FEL null propagation**: Most operations with null return null (Core S3.8). Exceptions: `coalesce()`, `if()`, null-check operators
- **Processing model is synchronous 4-phase**: No partial updates. Rebuild -> Recalculate -> Revalidate -> Notify, always in order (Core S2.4)
- **Pages are theme-tier**: Page layout lives in Theme (S6), not in Definition. Definition only has advisory `formPresentation`
- **Component `when` vs bind `relevant`**: `when=false` hides but keeps data; `relevant=false` hides AND excludes from response (Component S8.2)
- **Locale resolution is a presentation concern**: NOT part of the core four-phase cycle. String resolution happens after Notify, before render (Locale S8.1)
- **Sidecar documents are pure metadata**: Locale, Ontology, and References documents MUST NOT affect data capture, validation, or the processing model
- **Ontology Document takes precedence over registry concept entries**: When both bind the same field, the Ontology Document wins (Ontology S3.4)

## JSON Schemas -- Co-Authoritative with Specs

The `schemas/` directory contains 15 JSON Schema files (9373 lines total). Schemas and specs are **co-authoritative** -- neither is assumed more correct than the other:

- **Schemas** define structural truth: what properties exist, their types, required fields, enums, patterns, constraints.
- **Specs** define behavioral truth: processing semantics, evaluation order, null handling, precedence, error behavior.

**When researching any question, always check BOTH the spec and corresponding schema.** If they disagree -- a property the spec calls required isn't in the schema's `required` array, or the schema allows values the spec prohibits -- that is an inconsistency to surface, not silently resolve.

| Schema | Lines | Defines |
|--------|-------|---------|
| `definition.schema.json` | 1696 | Core form definition -- items, binds, instances, variables, screener |
| `component.schema.json` | 1516 | Component tree -- 34 component types (33 built-in + CustomComponentRef), slot binding, responsive |
| `core-commands.schema.json` | 1196 | Programmatic commands for form manipulation |
| `fel-functions.schema.json` | 994 | FEL standard library -- function signatures across 9+ categories |
| `mapping.schema.json` | 817 | Mapping DSL -- transforms, adapters, bidirectional rules |
| `theme.schema.json` | 658 | Theme document -- tokens, widgets, selectors, pages, layout |
| `registry.schema.json` | 647 | Extension registry -- entries, publishers, lifecycle, concept/vocabulary categories |
| `ontology.schema.json` | 429 | Ontology document -- concept bindings, vocabulary bindings, alignments, JSON-LD |
| `references.schema.json` | 324 | References document -- external docs, agent data stores, audience filtering |
| `response.schema.json` | 214 | Form response -- submitted data, metadata, pinned version |
| `changelog.schema.json` | 204 | Version changelog -- change objects, impact |
| `validationResult.schema.json` | 178 | Single validation result -- severity, path, constraint kind |
| `locale.schema.json` | 173 | Locale document -- internationalized strings, fallback cascade |
| `validationReport.schema.json` | 169 | Full validation report -- aggregated results |
| `conformance-suite.schema.json` | 158 | Test conformance suite -- test cases, expected outcomes |

### Schema <-> Spec Correspondence

| Schema | Normative Spec | Spec Sections |
|--------|---------------|---------------|
| definition | Core spec | S4.1-4.7 |
| component | Component spec | S2-7, Appendix B-C |
| theme | Theme spec | S2-6, Appendix A-C |
| mapping | Mapping spec | S3-6, Appendix A |
| registry | Extension Registry | Full doc (incl. S3.2 concept/vocabulary categories) |
| changelog | Changelog spec | S2-7 |
| response | Core spec | S2.1 (Response abstraction) |
| validationResult | Core spec | S5.3 |
| validationReport | Core spec | S5.4 |
| fel-functions | Core spec | S3.5 (Built-in Functions) |
| locale | Locale spec | S2-S10 |
| ontology | Ontology spec | S2-S9 |
| references | References spec | S2-S9 |
| core-commands | N/A (tooling) | Studio/MCP tooling layer |
| conformance-suite | N/A (testing) | Test infrastructure |

### Schema Decision Tree

| Need To Know | Read This Schema |
|---|---|
| What properties can a form item have? | definition -> Item |
| What bind types exist? | definition -> Bind |
| What components are available? | component -> component type discriminator |
| Properties of a specific component (e.g., Grid, TextInput) | component -> $defs |
| FEL function signatures and parameters | fel-functions |
| Theme token categories | theme -> tokens |
| Page layout structure | theme -> pages |
| Mapping transform types | mapping -> fieldRule |
| Extension entry format | registry -> RegistryEntry |
| What a validation error looks like | validationResult |
| Locale document structure and string key format | locale |
| Concept binding and vocabulary alignment structure | ontology |
| Reference types, audience, and $ref reuse | references |

### Schema Reference Maps

For property-level navigation of each schema, consult:

- **`references/schemas/definition.md`** -- Definition schema: items, binds, instances, variables (1696 lines)
- **`references/schemas/component.md`** -- Component schema: 34 components, slot binding, responsive (1516 lines)
- **`references/schemas/core-commands.md`** -- Core commands schema: programmatic form manipulation (1196 lines)
- **`references/schemas/fel-functions.md`** -- FEL functions schema: function catalog (994 lines)
- **`references/schemas/mapping-theme-registry.md`** -- Mapping, theme, and registry schemas (2122 combined)
- **`references/schemas/response-validation-changelog-conformance.md`** -- Response, validation, changelog, conformance schemas (905 combined)
- **`references/schemas/locale-ontology-references.md`** -- Locale, ontology, and references schemas (926 combined)

Each schema reference contains: top-level structure, $defs catalog, required fields, enums, cross-references, extension points, x-lm annotations, and validation constraints.

## Detailed Specification Reference Maps

For section-by-section navigation of each specification, consult the reference files:

- **`references/core-spec.md`** -- Core specification: items, binds, FEL, validation, versioning (4665 lines mapped)
- **`references/theme-spec.md`** -- Theme specification: tokens, widgets, cascade, layout (1167 lines mapped)
- **`references/component-spec.md`** -- Component specification: tree, binding, 34 components, responsive (3424 lines mapped)
- **`references/mapping-spec.md`** -- Mapping specification: transforms, bidirectional, adapters (2023 lines mapped)
- **`references/fel-grammar.md`** -- FEL normative grammar: lexical rules, precedence, paths (394 lines mapped)
- **`references/extension-registry.md`** -- Extension registry: publishing, discovery, lifecycle (584 lines mapped)
- **`references/changelog-spec.md`** -- Changelog format: change objects, impact classification (260 lines mapped)
- **`references/locale-spec.md`** -- Locale specification: internationalization, string keys, fallback cascade (1230 lines mapped)
- **`references/ontology-spec.md`** -- Ontology specification: concept bindings, vocabulary alignment, JSON-LD (782 lines mapped)
- **`references/references-spec.md`** -- References specification: external docs, agent data stores, audience filtering (697 lines mapped)

Each reference file contains:
- Complete section map (heading -> description -> key concepts -> when to consult)
- Cross-references to other specs
- Key schemas defined
- Critical behavioral rules specific to that spec

## Navigation Strategy

1. **Identify the tier**: Is this about data/logic (Tier 1), presentation (Tier 2), or rendering (Tier 3)? Or is it a companion concern (localization, semantics, references, mapping)?
2. **Check the decision tree** above for the specific topic
3. **Load the .llm.md** file first for quick orientation: `specs/{tier}/{name}.llm.md`
4. **Consult BOTH reference maps** -- the spec reference (`references/*.md`) AND the corresponding schema reference (`references/schemas/*.md`). If both agree, the answer is likely complete.
5. **Read targeted spec sections only** when precise normative language is needed -- NEVER read an entire spec file. Use section headings from the reference maps to grep for the exact line, then read ~80 lines from that offset.
6. **Cross-reference spec <-> schema** for any question about properties, types, or constraints. If they disagree, surface the inconsistency -- do not silently pick one.
7. **Check cross-references** when behavior spans tiers or companion specs -- the reference maps list every cross-spec link.

## Cross-Spec Lookup Paths

Common questions span multiple specs. These are the most frequent cross-spec paths:

- **FEL syntax + semantics**: `fel-grammar.md` (grammar) -> `spec.md` S3 (semantics) -> `fel-functions.schema.json` (stdlib)
- **Validation**: `spec.md` S5 (shapes, rules) -> `validationResult.schema.json` -> `validationReport.schema.json`
- **Versioning + Migration**: `spec.md` S6.7 -> `changelog-spec.md` S6 -> `mapping-spec.md` Appendix A
- **Extensions**: `spec.md` S8 -> `extension-registry.md` -> `registry.schema.json`
- **Widget resolution**: `spec.md` S4.2 (widgetHint) -> `theme-spec.md` S4 (catalog) -> `component-spec.md` S5-6 (components)
- **Localization**: `locale-spec.md` S2-4 (strings, cascade) -> `spec.md` S4.2 (item properties) -> `theme-spec.md` S6 (page titles) -> `component-spec.md` S3.1 (node ids)
- **Semantic identity**: `spec.md` S4.2.3 (semanticType) -> `extension-registry.md` S3.2 (concept/vocabulary entries) -> `ontology-spec.md` S3 (concept bindings)
- **Agent context**: `references-spec.md` S2-5 (reference types, agent integration) -> `spec.md` S2.1.7 (formspec-fn: data sources)
