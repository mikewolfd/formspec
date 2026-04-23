# Mapping Specification Reference Map

> specs/mapping/mapping-spec.md -- 2031 lines, ~100K -- Companion: Bidirectional Transforms, Format Adapters (JSON, XML, CSV)

## Overview

The Formspec Mapping DSL is a companion specification to Formspec v1.0 that defines a declarative, JSON-native language for bidirectional data transformations between Formspec Responses and external system schemas (API payloads, databases, CSV, XML). It reuses FEL for computed transforms, generalizes core §6.7 `fieldMap`, and defines three conformance levels (Core, Bidirectional, Extended) with built-in JSON, XML, and CSV adapters. Mapping is independent of Core: a conformant Core processor is not required to implement it. The canonical structural contract for the root object includes generated schema-ref markers and `schemas/mapping.schema.json`; top-level `extensions` (keys `x-` only) is a document-level vendor extension bucket.

## Section Map

### Front matter and document header (Lines 1-70)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| (YAML) | Front matter | Machine-readable `title`, `version`, `date`, `status` for the spec file itself (not a Mapping Document). | YAML frontmatter, draft status | Identifying spec edition vs Mapping Document `version` |
| -- | Title block | Human-facing title, version line, editors, companion-to Core note. | Formspec Mapping DSL v1.0 | Citation and document identity |
| Abstract | Abstract | Companion spec for declarative bidirectional transforms between Responses and external schemas; FEL for computation; generalizes §6.7 `fieldMap`. | Mapping Document, FEL, fieldMap, bidirectional | One-paragraph scope summary |
| -- | Status of This Document | Draft companion; does not modify Core; not stable for production until 1.0.0 release. | draft, companion, feedback | Stability / production readiness |
| -- | Conventions and Terminology | BCP 14 / RFC 2119 / RFC 8174 keywords; RFC 8259, 6901, 3986; Core terms (Definition, Instance, Response, Bind, FEL) retained by reference. | RFC 2119, RFC 8174, RFC 8259, RFC 6901, RFC 3986 | Normative language and incorporated Core vocabulary |
| -- | Bottom Line Up Front | Four bullets: bidirectional DSL; required top-level fields; declarative field rules; BLUF governed by `schemas/mapping.schema.json`. | BLUF, `$formspecMapping`, `rules`, schema contract | Quick authoring checklist |

### 1. Introduction (Lines 72-298)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 1.1 | Purpose | Bridges native Response shape vs external shapes (flattening, XML, CSV, REST); avoids bespoke tightly coupled mapping code. | Mapping Document, round-trip, declarative | Why Mapping exists |
| 1.2 | Scope | In: Mapping Documents, paths, coercion, valueMap, arrays/conditionals, defaults, bidirectional semantics, adapters. Out: transport, auth, rendering, Core itself, scheduling, persistence. | in-scope, out-of-scope | Whether behavior belongs in this spec |
| 1.3 | Relationship to Formspec Core | Companion only; Core need not implement Mapping. Mapping processors MUST understand Response (§2.1.6) and implement FEL (§3). Every valid §6.7 `fieldMap` entry is a degenerate Field Rule (both schemas Responses). | companion, FEL requirement, §6.7, SHOULD accept fieldMap as rules | Core vs Mapping boundaries |
| 1.4 | Terminology | Defines Mapping Document, Source/Target Schema, Forward/Reverse Mapping, Transform, Field Rule, Adapter. | source schema, target schema, adapter | Precise definitions |
| 1.5 | Conformance | Three strict superset levels: Core, Bidirectional, Extended. | Mapping Core, Bidirectional, Extended | Choosing implementation tier |
| 1.5.1 | Mapping Core | Forward JSON only; full FEL; all transform types; arrays for JSON; diagnostics on unknown transform / bad paths / invalid FEL. No reverse/XML/CSV required. | forward-only, diagnostics | Minimal processor |
| 1.5.2 | Mapping Bidirectional | Reverse for declared-reversible rules; round-trip fidelity on covered paths; lossy transform detection and error on illegal reverse. | round-trip, lossy | Reverse and fidelity |
| 1.5.3 | Mapping Extended | XML adapter (namespaces, attributes, mixed content); CSV adapter (RFC 4180, delimiters, headers, multi-row repeat); adapter config on document. | XML Adapter, CSV Adapter | Wire formats beyond JSON |
| 1.6 | Notational Conventions | JSON examples, ellipsis, non-normative `//` comments, dot/bracket paths, `[*]`, RFC keyword capitalization. | dot notation, `[*]`, examples | Reading normative examples |

### 2. Conceptual model (Lines 300-590)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 2.1 | Overview | Mapping Document answers what/where, how transformed, which direction(s). Engine is format-agnostic; adapters handle wire formats. | three questions, Mapping Engine | High-level mental model |
| 2.2 | Architecture | Diagram: Response ↔ Engine ↔ External. Subcomponents: Mapping Document, FEL Evaluator (same as Core), Adapter (JSON/XML/CSV by tier). | architecture diagram, FEL Evaluator | Runtime decomposition |
| 2.3 | Mapping Document Lifecycle | Authoring, Association (external to Definition), Versioning (semver + `definitionVersion` range), Distribution (bundled/referenced/inline), Retirement. | definitionRef, semver, association | Lifecycle and versioning |
| 2.4 | Data Flow | Forward: Extract → Transform → Restructure → Serialize. Reverse: Parse → Restructure → Transform → Inject; MUST NOT overwrite uncovered fields; new Response `status: "in-progress"`. | pipeline, Inject, uncovered fields | End-to-end data path |
| 2.4.1 | Forward Path | Per-stage narrative for Response → External. | Extract, Transform, Restructure, Serialize | Forward-only flows |
| 2.4.2 | Reverse Path | Per-stage narrative for External → Response. | Parse, Inject | Reverse-only flows |
| 2.5 | Relationship to §6.7 Migrations | Equivalence table: migration `source`/`target`/transform/defaults → Mapping fields; pass-through via autoMap semantics. | §6.7, fieldMap, degenerate case | Migration interop |
| 2.6 | Design Principles | Six ordered principles: declarative; FEL-only computation; composition; explicit over implicit (autoMap opt-in); bidirectional default with explicit opt-out for lossy; transport independence. | declarative, explicit, bidirectional default | Design rationale |

### 3. Mapping Document schema (Lines 592-929)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 3 | Mapping Document schema (intro) | Normative JSON object; case-sensitive properties; reject unrecognized root keys unless `x-` vendor prefix. | root rejection, `x-` | Validating document shape |
| 3.1 | Top-Level Structure | Generated schema-ref table: `$formspecMapping`, `$schema`, `adapters`, `autoMap`, `conformanceLevel`, `defaults`, `definitionRef`, `definitionVersion`, `direction`, `extensions` (object; all keys `x-`), `rules`, `targetSchema`, `version`. Table is canonical structural contract. | schema-ref, `extensions`, critical fields | Authoring root object |
| 3.1.1 | Versioning | `version` = Mapping doc semver, independent of Definition/spec; cache invalidation. `definitionVersion` = semver range; MUST refuse if Definition version out of range. | semver, definitionVersion | Compatibility checks |
| 3.1.2 | Direction Semantics | `forward` / `reverse` / `both` with wrong-direction execution errors as stated. | direction enum | Enforcing allowed execution direction |
| 3.1.3 | Example | FHIR Patient R4 example: preserve, coerce datetime→date, valueMap, expression+condition, constant, `adapters.x-fhir-r4`. | FHIR, example document | Realistic JSON mapping sample |
| 3.2 | Target Schema Descriptor | `format` json|xml|csv; `name`; `url`; `rootElement` (required if xml); `namespaces` (conditional; `""` default namespace). | targetSchema, rootElement, namespaces | Adapter selection and XML setup |
| 3.2.1 | Format-Specific Behavior | JSON: dot/bracket paths, RFC 8259. XML: elements + `@` attributes. CSV: flat column names only; dot in `targetPath` MUST error. | `@` attribute prefix, csv flat paths | Path syntax per format |
| 3.2.2 | Example (XML) | CDA R2 ClinicalDocument `targetSchema` with namespaces. | CDA, XML example | XML descriptor sample |
| 3.3 | Field Rule Structure | Full property table: `sourcePath`/`targetPath` conditional by transform; `reverse` MAY include any Field Rule property except `sourcePath`, `targetPath`, `reverse`; `bidirectional` default `true`; at least one path required; innerRules parent SHOULD declare `transform` (typically preserve); runtimes MAY treat missing parent transform as preserve. | Field Rule, reverse object, bidirectional | Single-rule authoring |
| 3.3.1 | Transform Types | Normative enum: preserve, drop, expression, coerce, valueMap, flatten, nest, constant, concat, split -- unknown values MUST be rejected. | transform enum | Choosing transform type |
| 3.3.2 | Coerce Object | `from`, `to` required type strings; optional `format`; unsupported combinations MUST error. | coerce.from, coerce.to | Type conversion config |
| 3.3.3 | ValueMap Object | `forward` required; `reverse` inferred if injective else error; `unmapped` default `"error"`; legacy flat shorthand → omitted `unmapped` SHOULD be `"passthrough"`; structured shape defaults `unmapped` to `"error"` (see §4.6). | valueMap, unmapped, legacy shorthand | Code tables and unmapped handling |
| 3.3.4 | Array Object | `mode` each|whole|indexed; optional `separator`; `innerRules` with element-relative paths. | array.mode, innerRules | Repeat/array mapping |
| 3.3.5 | Example | Field Rule combining expression, reverse split, condition, default, array whole, priority, description. | comprehensive rule | Multi-property rule example |
| 3.4 | Field Rule Ordering and Precedence | Priority descending then stable document order; condition guard; last-write-wins same `targetPath` with SHOULD warn; defaults written before rules. Note: higher priority runs first and can be overwritten by later lower priority to same path. | priority, last-write-wins, defaults first | Ordering bugs and conflicts |
| 3.5 | Auto-Mapping | `autoMap: true` augments rules with synthetic preserve at priority -1. | autoMap, synthetic rules | Pass-through behavior |
| 3.5.1 | Synthetic Rule Generation | Enumerate leaves → exclude any explicit `sourcePath` (even if condition false) → synthetic preserve priority -1 → append after sort. | covered paths, priority -1 | Implementing auto-map |
| 3.5.2 | Constraints | Shallow enumeration by default; `drop` suppresses auto-map; CSV skips dotted paths silently. | shallow, CSV auto-map | Auto-map limitations |
| 3.5.3 | Example | name/email/age with explicit email remap; auto preserve for name and age. | auto-map example | Effective rule set illustration |

### 4. Transform operations (Lines 931-1470)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 4 | Transform Operations (intro) | Exactly one `transform` per Field Rule; determines required/permitted sibling properties. | transform operation | Implementing transforms |
| 4.1 | Transform Type Reference | Summary table: type, description, auto-reversible, required properties. | auto-reversible | Quick matrix |
| 4.2 | `preserve` | Identity copy; always auto-reversible; incompatible types SHOULD implicit-coerce with diagnostic warning. | preserve, identity | Simple passthrough |
| 4.3 | `drop` | Discard; never reversible; `bidirectional` MUST be false or absent (defaults false for drop); validation error if `bidirectional: true`; `targetPath` null/omitted OK. | drop, bidirectional false | Excluding fields |
| 4.4 | `expression` | FEL evaluation; bindings `$` (sourcePath value or null), `@source` root -- both REQUIRED; not auto-reversible; `bidirectional: true` without `reverse` MUST validation-error. | `$`, `@source`, reverse.expression | Computed fields |
| 4.5 | `coerce` | Full conversion matrix string/number/integer/boolean/date/datetime/money; lossy datetime→date and money→number/integer; reversibility rules; string↔boolean literals; money extracts amount. | coercion matrix, lossy | Typed conversions |
| 4.6 | `valueMap` | Static lookup; bijective forward → auto reverse; duplicate values need explicit `reverse.valueMap.forward`; unmapped strategies error|passthrough|drop|default; same strategy both directions unless reverse overrides. | bijective, unmapped | Enumeration mapping |
| 4.7 | `flatten` | Delimited (array+separator), Positional (array, `_0` suffixes), Dot-prefix (object); optional expression when non-trivial; auto-reversible with nest. | flatten modes, separator | Flattening structures |
| 4.8 | `nest` | Inverse of flatten; modes from delimited string, positional fields, dot-prefixed keys; auto-reversible with flatten. | nest, structural inverse | Rebuilding nesting |
| 4.9 | `constant` | Fixed value via `expression`; `sourcePath` optional/ignored; not reversible; `bidirectional: true` MUST validation-error. | constant, injection | Envelope / fixed fields |
| 4.10 | `concat` | Multi-field string via `@source`; result MUST be string (`string()` coercion); not auto-reversible; `bidirectional: true` forbidden without explicit reverse. | concat, @source | Combining strings |
| 4.11 | `split` | Expression returns object (keys under targetPath) or array (positional suffixes); `$` and `@source` bindings. | split, decomposition | One-to-many targets |
| 4.12 | Array Operations | `array` requires `mode` when present; repeat groups. | array, repeat | Array-level control |
| 4.12.1 | `array` Object Schema | Properties: mode, separator (whole only per table), innerRules. | separator whole | Validating array object |
| 4.12.2 | `mode: "each"` | Per element; `$`, `$index`, `@source`; ordered 1:1 output. | each, $index | Per-row API arrays |
| 4.12.3 | `mode: "whole"` | `$` = entire array; aggregates. | whole | Join/sum/filter patterns |
| 4.12.4 | `mode: "indexed"` | innerRules with `index`; uncovered elements dropped. | indexed, index property | Positional columns |
| 4.12.5 | Complete Example | `budget_items` → `line_items` with innerRules preserve/coerce/valueMap. | repeat group, innerRules | Full array example |
| 4.13 | Conditional Mapping | `condition` FEL boolean before transform; false/null skips rule with no errors from invalid inner expression/path. | condition guard | Conditional emission |
| 4.13.1 | Branching | Same `targetPath` with conditions: SHOULD warn if not provably exclusive; multiple true → last in document order wins. | branching, last wins | Discriminated routing |
| 4.13.2 | Reverse Direction | Reverse evaluates condition on external document; `reverse.condition` override; example with contact_type. | reverse condition | Bidirectional conditions |

### 5. Bidirectional semantics (Lines 1472-1608)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 5.1 | Forward and Reverse Execution | Direction table; `direction` default forward; Field Rules use `bidirectional` (§5.4); Core MAY ignore bidirectional (forward only). | direction, bidirectional | Direction switching |
| 5.2 | Auto-Reversal | Table per transform; lossless coercion pairs string↔integer, string↔number, string↔boolean (only true/false strings), date↔string with ISO format; unlisted pairs MUST NOT auto-reverse. | auto-reversal, lossless pairs | Inverse without `reverse` block |
| 5.3 | Explicit Reverse Overrides | Permitted reverse properties per table (`transform`, `expression`, `coerce` as **string** target type, `valueMap`, `default`); paths swap; MUST NOT embed `sourcePath`/`targetPath` in `reverse`. | reverse block, validation | Custom reverse logic |
| 5.4 | Lossy Transforms and Non-Reversibility | Formal lossy definition; lossy kinds listed; lossy MUST `bidirectional: false`; lossy + `bidirectional: true` without `reverse` → validation error; reverse through `bidirectional: false` MUST error, MUST NOT silently skip (see §3.3 tension below). | lossy, bidirectional false | Reversibility enforcement |
| 5.5 | Round-Trip Fidelity | Mathematical response and external round-trip equalities using projections on covered paths; untouched uncovered fields; Bidirectional conformance obligations. | P(R), F_M, R_M | Testing round-trip |
| 5.6 | Conflict Resolution in Reverse Mapping | Last-rule-wins; SHOULD warn; optional `reversePriority` (non-negative) overrides order with tie-break to last-rule-wins; example with displayName/legalName. | reversePriority, conflicts | Multi-source same path |

### 6. Format adapters (Lines 1610-1739)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 6.1 | Adapter Architecture | serialize/deserialize; built-in JSON (Core), XML+CSV (Extended); active adapter from `targetSchema.format`; default JSON; custom §6.5. | serialize, deserialize | Adapter boundary |
| 6.2 | JSON Adapter | Identity serialization; auto-create intermediate objects/arrays; `pretty`, `sortKeys`, `nullHandling`. | json adapter, nullHandling | JSON output tuning |
| 6.3 | XML Adapter (Mapping Extended) | Path conventions elements/attributes/repeated siblings; namespaces; config declaration/indent/cdata; example Order XML. | XML 1.0, CDATA, `@id` | XML emission |
| 6.4 | CSV Adapter (Mapping Extended) | RFC 4180; flat identifiers only; repeat rows; delimiter/quote/header/encoding/lineEnding; example multi-row. | CSV rows, flat paths | Tabular export |
| 6.5 | Custom Adapters | Identifiers `x-`; config under `adapters.<id>`; MUST NOT silent fallback to JSON on unknown id. | x- adapter, diagnostic | Custom wire formats |

### 7. Processing model (Lines 1741-1819)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 7.1 | Execution Pipeline | Seven ordered steps: Validate → Resolve direction → Apply defaults → Auto-map → Sort → Execute (condition, sourcePath, transform, targetPath) → Serialize; reverse swaps roles per §5. | pipeline, deterministic | Engine implementation order |
| 7.2 | Error Handling | Categories: Validation (halt before step 6), Resolution (default or non-fatal diagnostic), Transform (non-fatal diagnostic, continue), Adapter (halt, no partial output); Diagnostic schema; standard error codes. | diagnostics, ADAPTER_FAILURE | Error taxonomy |
| 7.3 | Null and Absent Value Handling | Matrix for absent+default, absent no default, explicit null across preserve/expression/coerce/valueMap. | absent vs null | Edge cases on missing data |
| 7.4 | Idempotency | Forward (and reverse) idempotent; ban hidden nondeterminism unless FEL explicitly non-deterministic. | idempotency | Deterministic outputs |

### 8. Examples (Lines 1821-1946)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 8.1 | Grant Application to Federal API | JSON forward: preserve, expression EIN dash strip + reverse, coerce, array each + innerRules valueMap, defaults. | grant, EIN, innerRules | Complex JSON integration |
| 8.2 | Patient Intake to CSV Export | CSV: indexed medications to columns; flatten allergies with separator; flat targetPaths. | CSV indexed, flatten | Flat-file export |
| 8.3 | Bidirectional FHIR Integration | Observation round-trip; auto-reverse; constant forward-only; defaults forward-only. | FHIR Observation | Bidirectional JSON |

### Appendix A -- §6.7 migrations (Lines 1948-2031)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| A (intro) | Appendix A (Normative) | Formal algorithm §6.7 migration descriptor → Mapping Document. | §6.7 conversion | Tooling migrations |
| A.1 | Conversion Algorithm | Five steps: forward doc, json target, per fieldMap entry mapping (drop null target, expression → bidirectional false), copy defaults, autoMap true. | conversion algorithm | Mechanical translation |
| A.2 | Example | Side-by-side migration JSON vs Mapping Document; property correspondence table. | fieldMap, autoMap | Worked conversion |

## Cross-References

- **Formspec v1.0 core** -- Parent ecosystem; Response §2.1.6; FEL §3; version migrations §6.7. (Abstract, §1.3, §2.5, Appendix A)
- **§6.7 `fieldMap`** -- Generalized by Mapping; degenerate Field Rules; normative conversion in Appendix A. (Abstract, §1.3, §2.5, Appendix A)
- **§3 FEL (Core)** -- Required for all expressions and conditions. (§1.3, §1.5.1, §2.2)
- **`schemas/mapping.schema.json`** -- Canonical JSON Schema; generated schema-ref in §3.1. (BLUF, §3.1)
- **RFC 8259** -- JSON. (Conventions, §3.2.1, §6.2, §7.1)
- **RFC 6901** -- JSON Pointer (conventions reference). (Conventions)
- **RFC 3986** -- URI (`definitionRef`, `targetSchema.url`). (Conventions)
- **RFC 4180** -- CSV wire format. (§1.5.3, §6.4)
- **RFC 2119 / RFC 8174 / BCP 14** -- Normative keywords. (Conventions)
- **Semantic Versioning 2.0.0** -- Mapping `version` and `definitionVersion` ranges (node-semver). (§2.3, §3.1.1)
- **XML 1.0** -- XML adapter output. (§6.1, §6.3)
- **HL7 FHIR** -- Patient example §3.1.3; Observation §8.3. (§3.1.3, §8.3)

## Key schemas defined

| Schema / structure | Section | Description |
|--------------------|---------|-------------|
| **Mapping Document (root)** | §3.1 | Includes `$formspecMapping`, versioning, `direction`, `targetSchema`, `rules`, `defaults`, `autoMap`, `conformanceLevel`, `adapters`, `extensions` (`x-` keys only). |
| **Target schema descriptor** | §3.2 | `format`, `name`, `url`, `rootElement`, `namespaces`. |
| **Field Rule** | §3.3 | Paths, `transform`, optional `expression`/`coerce`/`valueMap`/`reverse`/`bidirectional`/`condition`/`default`/`array`/`description`/`priority`/`reversePriority` (§5.6). |
| **Coerce object** | §3.3.2 | `from`, `to`, optional `format`. |
| **ValueMap object** | §3.3.3 / §4.6 | Structured `forward`/`reverse`/`unmapped`/`default` or legacy flat shorthand. |
| **Array object** | §3.3.4 | `mode`, `separator`, `innerRules`. |
| **Reverse override (normative subset table)** | §5.3 | `transform`, `expression`, `coerce` (**string** -- target type for reverse), `valueMap`, `default`; no nested paths inside `reverse`. |
| **Diagnostic object** | §7.2 | `ruleIndex`, `sourcePath`, `targetPath`, `errorCode`, `message`. |
| **JSON adapter config** | §6.2 | `pretty`, `sortKeys`, `nullHandling`. |
| **XML adapter config** | §6.3 | `declaration`, `indent`, `cdata`. |
| **CSV adapter config** | §6.4 | `delimiter`, `quote`, `header`, `encoding`, `lineEnding`. |

## Transform operations quick reference

| Transform | Purpose | Auto-reversible? | Inverse / notes | Required parameters |
|-----------|---------|:----------------:|-------------------|---------------------|
| `preserve` | Identity copy | Yes | `preserve` | -- |
| `drop` | Omit from output | No | -- | `bidirectional: true` invalid |
| `expression` | FEL value | No | Needs `reverse.expression` for bidirectional | `expression` |
| `coerce` | Typed conversion | Conditional | Inverse pair only if lossless per §5.2 | `coerce` object |
| `valueMap` | Lookup table | Conditional | Inverted if bijective | `valueMap` |
| `flatten` | Collapse structure | Yes | `nest` | `separator` when delimited array |
| `nest` | Expand structure | Yes | `flatten` | `separator` when delimited string |
| `constant` | Fixed literal | No | -- | `expression` |
| `concat` | Join fields to string | No | Explicit `reverse` only | `expression` |
| `split` | One source → many targets | No | Explicit `reverse` only | `expression` |

## Coercion conversion matrix (§4.5)

| From / To | `string` | `number` | `integer` | `boolean` | `date` | `datetime` | `money` |
|-----------|:--------:|:--------:|:---------:|:---------:|:------:|:----------:|:-------:|
| **`string`** | -- | Y | Y | Y | Y | Y | N |
| **`number`** | Y | -- | Y | Y | N | N | N |
| **`integer`** | Y | Y | -- | Y | N | N | N |
| **`boolean`** | Y | Y | Y | -- | N | N | N |
| **`date`** | Y | N | N | N | -- | Y | N |
| **`datetime`** | Y | N | N | N | Y* | -- | N |
| **`money`** | Y | Y* | Y* | N | N | N | -- |

Y = supported, N = MUST reject, -- = identity, Y* = lossy (time or currency discarded per §4.5 footnotes).

## Critical behavioral rules

1. **Pipeline order (§7.1).** Validate → direction → defaults → auto-map → sort → execute → serialize. Defaults precede rules; auto-map precedes final priority sort as described (synthetic rules priority -1 execute after higher explicit priorities in sorted order).

2. **Higher `priority` runs first but last-write-wins overwrites it (§3.4).** Same `targetPath`: later-executing rule wins; use `condition` or different paths to get final precedence.

3. **Auto-map uses priority -1 (§3.5.1).** Synthetic preserves run after default-priority explicit rules; explicit `sourcePath` coverage excludes auto-map; CSV skips nested paths silently.

4. **`bidirectional` defaults `true` (§3.3); `drop` must not be true-bidirectional (§4.3).** Lossy forward transforms MUST use `bidirectional: false` or supply explicit `reverse` (§5.4).

5. **§3.3 vs §5.4 on `bidirectional: false`.** §3.3: if `bidirectional` is `false`, the rule is *skipped* during reverse. §5.4: attempting reverse *through* a rule marked `bidirectional: false` MUST *error* and MUST NOT silently skip. Treat as a spec inconsistency to reconcile in implementation or a future erratum; do not assume skip and error are interchangeable.

6. **`reverse` MUST NOT contain `sourcePath` or `targetPath` (§5.3);** §3.3 also forbids nested `reverse`. Reverse `coerce` in §5.3 table is a **string** (target type), not the forward `coerce` object -- align implementation with §5.3 table even if §3.3 suggests broader Field Rule cloning.

7. **Conditions before transforms (§4.13).** False/null `condition` skips the entire rule without surfacing errors from unreachable `expression`/`sourcePath`.

8. **Absent vs explicit `null` (§7.3).** Different branches for defaults and for preserve/expression/coerce/valueMap.

9. **Lossless auto-reverse coercion pairs are enumerated (§5.2).** Only listed pairs auto-reverse; `number→integer`, `money→number`, `datetime→date`, etc. MUST NOT auto-reverse.

10. **ValueMap inversion requires injective forward (§4.6).** Duplicate forward values require explicit `reverse.valueMap.forward`.

11. **CSV `targetPath` must be flat identifiers (§3.2.1, §6.4).** Nested paths validation-error; adapter errors halt with no partial output (§7.2).

12. **Root and `extensions` keys (§3, §3.1).** Unrecognized root properties MUST be rejected unless `x-` prefixed; `extensions` object keys MUST be `x-` prefixed.

13. **Idempotency (§7.4).** No hidden randomness or unstable ordering unless FEL explicitly introduces it.

14. **Uncovered Response fields (§2.4.2, §5.5).** Reverse MUST NOT overwrite paths not covered by the mapping; new scaffold uses `status: "in-progress"`.

15. **`flatten` / `nest` pairing (§4.7–§4.8).** Mode inference from shape; structural auto-reversal.

16. **`array.mode: "indexed"` drops uncovered elements (§4.12.4).**

17. **Branching same `targetPath` (§4.13.1).** Multiple true conditions → last in document order wins; SHOULD warn if not provably mutually exclusive.

18. **ValueMap `unmapped` (§4.6).** Same strategy forward and reverse unless `reverse` overrides.

19. **Unrecognized custom adapter id (§6.5).** MUST diagnostic error; MUST NOT silently fall back to JSON.

20. **ValueMap shorthand vs structured defaults (§3.3.3, §4.6).** Legacy flat object → lenient `passthrough` for omitted `unmapped`; explicit `forward` object → default `unmapped` is `error`.
