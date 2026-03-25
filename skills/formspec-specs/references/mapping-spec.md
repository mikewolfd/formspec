# Mapping Specification Reference Map

> specs/mapping/mapping-spec.md -- 2023 lines, ~94K -- Companion: Bidirectional Transforms, Format Adapters (JSON, XML, CSV)

## Overview

The Formspec Mapping DSL is a companion specification to Formspec v1.0 that defines a declarative, JSON-native language for expressing bidirectional data transformations between Formspec Responses and external system schemas (API payloads, database records, CSV exports, XML documents). It reuses FEL (Formspec Expression Language) for all computed transforms, generalizes the version-migration `fieldMap` from core spec section 6.7, and defines three conformance levels (Core, Bidirectional, Extended) with three built-in format adapters (JSON, XML, CSV). The specification is independent of the core spec -- a conformant Formspec Core processor is NOT required to implement it.

## Section Map

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| Abstract | Abstract | Summarizes the spec as a companion to Formspec v1.0 for declaring bidirectional transforms between Responses and external schemas. | Mapping Document, FEL reuse, fieldMap generalization | Getting a one-paragraph summary of what this spec does |
| -- | Status of This Document | Declares this is a draft specification, companion to core, not stable for production. | draft, companion, not stable | Checking maturity/stability of the mapping spec |
| -- | Conventions and Terminology | RFC 2119 keyword definitions, JSON/URI standards references, incorporation of core spec terms. | RFC 2119, RFC 8259, RFC 6901, RFC 3986 | Understanding normative language conventions |
| -- | Bottom Line Up Front | 4-bullet summary: bidirectional DSL, required top-level fields, declarative field rules, governed by mapping schema. | BLUF summary | Quick orientation before reading the full spec |
| S1 | 1. Introduction | Frames the problem: real systems need data in different shapes than Formspec Responses provide. | -- | Understanding motivation for the mapping spec |
| S1.1 | 1.1 Purpose | Explains the gap between Formspec Responses and external system requirements (relational DBs, XML schemas, CSV, REST APIs) that this spec fills. | Mapping Document, bidirectional, round-trip | Understanding why the mapping spec exists |
| S1.2 | 1.2 Scope | Enumerates what is defined (field renaming, coercion, value mapping, arrays, conditionals, defaults, bidirectional semantics, adapters) and what is NOT (transport, auth, rendering, scheduling, persistence). | in-scope vs out-of-scope | Determining if a feature belongs in the mapping spec |
| S1.3 | 1.3 Relationship to Formspec Core | Defines mapping as a companion (not extension/supersession). Core processors need not implement it. Mapping processors MUST implement FEL and understand Response schema. Formalizes that every S6.7 fieldMap entry is a degenerate Mapping Document Field Rule. | companion spec, FEL requirement, S6.7 generalization | Understanding how mapping and core specs relate |
| S1.4 | 1.4 Terminology | Defines 7 key terms: Mapping Document, Source Schema, Target Schema, Forward Mapping, Reverse Mapping, Transform, Field Rule, Adapter. | Mapping Document, Source/Target Schema, Forward/Reverse Mapping, Transform, Field Rule, Adapter | Looking up precise definitions of mapping-specific terms |
| S1.5 | 1.5 Conformance | Defines three conformance levels as strict supersets: Core, Bidirectional, Extended. | conformance levels | Determining what a processor must implement |
| S1.5.1 | 1.5.1 Mapping Core | Forward JSON mapping only. Must parse Mapping Documents, implement FEL, all transform types, array/repeat mappings, and report diagnostics. NOT required to support reverse, XML, or CSV. | Mapping Core, forward-only, JSON | Building a minimal mapping implementation |
| S1.5.2 | 1.5.2 Mapping Bidirectional | Adds reverse mapping, round-trip fidelity guarantee, and lossy transform detection/reporting. Implies Core conformance. | Mapping Bidirectional, round-trip fidelity, lossy detection | Implementing reverse mapping support |
| S1.5.3 | 1.5.3 Mapping Extended | Adds XML Adapter (namespaces, attributes, mixed content) and CSV Adapter (RFC 4180, configurable delimiters, header rows, multi-row repeat flattening). Implies Bidirectional conformance. | Mapping Extended, XML Adapter, CSV Adapter | Implementing XML or CSV serialization support |
| S1.6 | 1.6 Notational Conventions | JSON conventions, ellipsis, comments, dot/bracket path notation, wildcard `[*]`, RFC 2119 keyword casing rules. | dot notation, bracket indexing, `[*]` wildcard | Understanding path syntax and example conventions |
| S2 | 2. Conceptual Model | High-level conceptual framework for the Mapping DSL. | -- | Understanding the mental model before diving into details |
| S2.1 | 2.1 Overview | A Mapping Document is standalone JSON answering: what goes where, how is it transformed, in which direction(s). The Mapping Engine reads it and produces target structures. | Mapping Document (3 questions), Mapping Engine, format-agnostic | Getting the 30-second conceptual overview |
| S2.2 | 2.2 Architecture | ASCII architecture diagram showing Formspec Response <-> Mapping Engine <-> External System. Engine has 3 sub-components: Mapping Document (rules), FEL Evaluator (computation), Adapter (format serialization). | Mapping Engine architecture, FEL Evaluator reuse, Adapter component | Understanding the runtime architecture and component responsibilities |
| S2.3 | 2.3 Mapping Document Lifecycle | 5-stage lifecycle: Authoring, Association (external to Definition), Versioning (independent semver + definitionVersion range), Distribution (bundled/referenced/inline), Retirement. | lifecycle, independent versioning, definitionVersion range, association | Understanding how Mapping Documents are created, versioned, and distributed |
| S2.4 | 2.4 Data Flow | Detailed 4-stage pipeline for both forward (Extract -> Transform -> Restructure -> Serialize) and reverse (Parse -> Restructure -> Transform -> Inject) paths with ASCII diagrams. | forward pipeline, reverse pipeline, Extract/Transform/Restructure/Serialize | Understanding the step-by-step execution flow in each direction |
| S2.4.1 | 2.4.1 Forward Path | Extract source fields -> Transform (FEL, coercions, value maps) -> Restructure (path remapping, arrays) -> Serialize via Adapter. | Extract, Transform, Restructure, Serialize | Tracing forward mapping execution |
| S2.4.2 | 2.4.2 Reverse Path | Parse via Adapter -> Restructure (map external paths back) -> Transform (reverse FEL, inverse coercions) -> Inject into Response. Engine MUST NOT overwrite uncovered fields. New Response gets `status: "in-progress"`. | Parse, Restructure, Transform, Inject, uncovered fields preserved | Tracing reverse mapping execution |
| S2.5 | 2.5 Relationship to S6.7 Migrations | Formal mapping table between S6.7 migration concepts and Mapping DSL equivalents. Both source and target are Formspec Responses in migrations. Processor SHOULD interpret S6.7 entries as Mapping rules. | S6.7 equivalence table, degenerate case | Converting between S6.7 fieldMap entries and Mapping Document rules |
| S2.6 | 2.6 Design Principles | 6 prioritized principles: (1) Declarative over imperative, (2) FEL for computation, (3) Composition over complexity, (4) Explicit over implicit, (5) Bidirectional by default with explicit opt-out, (6) Independence from transport/storage. | declarative, FEL-only, composition, explicit, bidirectional-default, transport-independent | Understanding design tradeoffs and why the spec works as it does |
| S3 | 3. Mapping Document Schema | Normative JSON structure definition. Property names are case-sensitive. Unrecognized root properties MUST be rejected unless `x-` prefixed. | case-sensitive, x- vendor extensions | Authoring or validating a Mapping Document |
| S3.1 | 3.1 Top-Level Structure | Complete schema-ref table of all root properties: `$schema`, `adapters`, `autoMap`, `conformanceLevel`, `defaults`, `definitionRef`, `definitionVersion`, `direction`, `rules`, `targetSchema`, `version`. Includes generated schema reference. | top-level properties, `definitionRef`, `definitionVersion`, `direction`, `rules`, `targetSchema`, `autoMap`, `defaults` | Building or parsing the root of a Mapping Document |
| S3.1.1 | 3.1.1 Versioning | `version` is the Mapping Document's own semver, independent of Definition version and spec version. `definitionVersion` is a semver range; engine MUST refuse execution on mismatch. | version independence, definitionVersion range validation | Implementing version compatibility checking |
| S3.1.2 | 3.1.2 Direction Semantics | `"forward"` = source-to-target only (reverse MUST error), `"reverse"` = target-to-source only (forward MUST error), `"both"` = either direction with optional reverse overrides. | direction enum, error on wrong direction | Implementing direction enforcement |
| S3.1.3 | 3.1.3 Example | Complete FHIR Patient mapping example with preserve, coerce, valueMap, expression, constant, and condition rules. | FHIR Patient example | Seeing a realistic complete Mapping Document |
| S3.2 | 3.2 Target Schema Descriptor | `targetSchema` object: `format` (REQUIRED: json/xml/csv), `name`, `url`, `rootElement` (REQUIRED for xml), `namespaces` (conditional for xml). | targetSchema, format, rootElement, namespaces | Configuring the target format for a mapping |
| S3.2.1 | 3.2.1 Format-Specific Behavior | JSON uses dot/bracket paths. XML uses dot paths with `@` for attributes. CSV uses flat column names only (dot paths MUST error). | json path syntax, xml attribute `@` prefix, csv flat constraint | Understanding path syntax rules per target format |
| S3.2.2 | 3.2.2 Example (XML) | CDA R2 ClinicalDocument XML target schema example with namespace declarations. | XML target schema example | Setting up an XML target schema |
| S3.3 | 3.3 Field Rule Structure | Complete property table for Field Rules: `sourcePath`, `targetPath`, `transform`, `expression`, `coerce`, `valueMap`, `reverse`, `bidirectional`, `condition`, `default`, `array`, `description`, `priority`. At least one of sourcePath/targetPath MUST be present. | Field Rule schema, all 13 properties | Authoring or validating individual Field Rules |
| S3.3.1 | 3.3.1 Transform Types | Enumeration of all 10 transform type values with brief behavior and required properties. | preserve, drop, expression, coerce, valueMap, flatten, nest, constant, concat, split | Quick reference for transform type selection |
| S3.3.2 | 3.3.2 Coerce Object | Schema for `coerce`: `from` (REQUIRED), `to` (REQUIRED), `format` (OPTIONAL). Enumerates valid type strings. | coerce schema, from/to types, format pattern | Implementing type coercion configuration |
| S3.3.3 | 3.3.3 ValueMap Object | Schema for `valueMap`: `forward` (REQUIRED), `reverse` (OPTIONAL, inferred by inversion), `unmapped` (error/drop/passthrough), `default`. Non-injective forward map without explicit reverse MUST error. | valueMap schema, forward/reverse maps, unmapped strategy | Implementing value lookup tables |
| S3.3.4 | 3.3.4 Array Object | Schema for `array`: `mode` (REQUIRED: each/whole/indexed), `separator`, `innerRules`. Inner rule paths are element-relative. | array schema, mode enum, innerRules, element-relative paths | Mapping arrays and repeat groups |
| S3.3.5 | 3.3.5 Example | Complete Field Rule example with expression, reverse, condition, default, array (whole mode), priority, and description. | comprehensive Field Rule example | Seeing all Field Rule properties used together |
| S3.4 | 3.4 Field Rule Ordering and Precedence | 5-step deterministic procedure: (1) priority sort descending, (2) stable order for ties, (3) condition guard, (4) last-write-wins for same targetPath, (5) defaults written before rules. NOTE: higher priority executes FIRST so gets OVERWRITTEN by later lower-priority rules targeting same path. | priority sort, stable order, condition guard, last-write-wins, defaults-first | Understanding rule execution order and conflict resolution |
| S3.5 | 3.5 Auto-Mapping | When `autoMap: true`, synthesize `preserve` rules at priority -1 for uncovered source fields. | autoMap, synthetic rules, priority -1 | Implementing or using auto-mapping |
| S3.5.1 | 3.5.1 Synthetic Rule Generation | 4-step algorithm: enumerate source leaf paths, exclude covered paths, generate preserve rules at priority -1, append to sorted list. | synthetic rule generation algorithm | Implementing the auto-map generator |
| S3.5.2 | 3.5.2 Constraints | Auto-mapping is shallow (no recursive expansion). Explicit rules always win. `drop` suppresses auto-map. CSV auto-map silently skips dotted paths. | shallow enumeration, drop suppression, CSV skip | Understanding auto-map edge cases and limitations |
| S3.5.3 | 3.5.3 Example | Shows name/email/age response with one explicit email rule; auto-map generates preserve for name and age. | auto-map example | Seeing auto-map in action |
| S4 | 4. Transform Operations | Defines all transform operation types. Every Field Rule MUST specify exactly one `transform`. | transform operations | Implementing or using any transform type |
| S4.1 | 4.1 Transform Type Reference | Summary table of all 10 transforms with auto-reversibility status and required properties. | transform reference table | Quick lookup of transform capabilities |
| S4.2 | 4.2 `preserve` -- Identity Copy | Copies source value to target unmodified. Always auto-reversible. Incompatible types SHOULD attempt implicit coercion with warning. | preserve, identity, auto-reversible, implicit coercion warning | Implementing the simplest transform |
| S4.3 | 4.3 `drop` -- Discard | Suppresses source value from target. Never reversible. `bidirectional: true` on drop MUST error. `targetPath` null/omitted is accepted; if provided, field still omitted. | drop, never reversible, targetPath null accepted | Implementing field exclusion |
| S4.4 | 4.4 `expression` -- FEL Evaluation | Evaluates FEL expression. `$` = source value, `@source` = full document. Not auto-reversible; requires explicit `reverse.expression` for bidirectional. | expression, `$` binding, `@source` binding, not auto-reversible | Implementing computed transforms with FEL |
| S4.5 | 4.5 `coerce` -- Type Conversion | Type conversion with `from`/`to` properties. Includes supported conversion matrix (7x7), lossy conversion notes (datetime->date, money->number/integer). Defines coercion rules for string<->boolean, boolean->integer, date/datetime->string, money->number. | coerce, conversion matrix, lossy markers, format property, coercion rules | Implementing type conversions between Formspec and external types |
| S4.6 | 4.6 `valueMap` -- Lookup Table | Static lookup table substitution. Bijective maps auto-derive reverse by inversion. 4 unmapped strategies: error (default), passthrough, drop, default. Same unmapped strategy in both directions unless reverse block overrides. | valueMap, bijective auto-reverse, unmapped strategies, forward/reverse maps | Implementing enumeration/code translation |
| S4.7 | 4.7 `flatten` -- Collapse Nested/Array Structures | 3 modes: Delimited (array + separator -> string), Positional (array -> indexed fields), Dot-prefix (object -> flat dot-keys). Auto-reversible, pairs with `nest`. For non-trivial flattening, `expression` MUST be provided. | flatten, 3 modes, separator, auto-reversible with nest | Collapsing nested structures to flat representations |
| S4.8 | 4.8 `nest` -- Expand Flat to Nested | Inverse of `flatten`. Infers mode from source shape: string + separator -> array, positional fields -> array, dot-prefixed fields -> object. Auto-reversible, pairs with `flatten`. | nest, inverse of flatten, mode inference | Expanding flat structures back to nested form |
| S4.9 | 4.9 `constant` -- Fixed Value Injection | Writes fixed value to target. `sourcePath` NOT REQUIRED, ignored if present. `expression` provides the value. NOT reversible; `bidirectional: true` MUST error. | constant, no sourcePath, not reversible | Injecting envelope fields, API versions, fixed metadata |
| S4.10 | 4.10 `concat` -- Multiple Sources to Single Target | Combines multiple source fields into one target string via FEL expression referencing `@source`. Result MUST be string (coerced via `string()`). NOT auto-reversible; requires explicit `reverse` for bidirectional. | concat, multi-source, string result, not auto-reversible | Combining names, addresses, or other multi-field values |
| S4.11 | 4.11 `split` -- Single Source to Multiple Targets | Decomposes single source into multiple target fields. Expression MUST return object (keys appended to targetPath) or array (positional suffixes). `$` = source value, `@source` = full document. | split, object/array return, positional suffixes | Decomposing composite values into structured fields |
| S4.12 | 4.12 Array Operations | Controls array-valued source field mapping including repeat groups. `array` object with `mode` property. | array operations, repeat groups | Mapping arrays and Formspec repeat sections |
| S4.12.1 | 4.12.1 `array` Object Schema | Properties: `mode` (REQUIRED: each/whole/indexed), `separator` (valid only with whole), `innerRules` (nested Field Rules with element-relative paths). | array object schema | Configuring array mapping behavior |
| S4.12.2 | 4.12.2 `mode: "each"` | Iterate every element. `$` = current element, `$index` = zero-based index, `@source` = full document. Inner rule paths resolve relative to current element. One output per input, in order. | each mode, `$index`, element-relative paths | Implementing per-element array transforms |
| S4.12.3 | 4.12.3 `mode: "whole"` | Entire array as single value (`$` = complete array). For aggregates: sum, filter, join. | whole mode, aggregate operations | Implementing whole-array transforms |
| S4.12.4 | 4.12.4 `mode: "indexed"` | Apply innerRules by positional index. Each inner rule MUST include `index` property (integer). Uncovered elements are DROPPED. | indexed mode, positional, uncovered dropped | Implementing positional array mapping (e.g., CSV columns) |
| S4.12.5 | 4.12.5 Complete Example | Repeat group `budget_items` mapped to `line_items` using `mode: "each"` with innerRules for preserve, coerce, and valueMap per element. Shows source, rule, and target. | array each example, repeat group mapping | Seeing a complete array mapping with inner rules |
| S4.13 | 4.13 Conditional Mapping | `condition` property: FEL boolean expression. If false/null, entire rule skipped (no output, no side effects). `$` = sourcePath value, `@source` = full document. Evaluated BEFORE transform. Skipped rule MUST NOT error even with invalid expression/sourcePath. | condition, pre-transform evaluation, skip semantics | Implementing conditional field mapping |
| S4.13.1 | 4.13.1 Branching | Multiple rules MAY target same targetPath with mutually exclusive conditions. Non-exclusive conditions SHOULD warn (not error). Same-path + multiple true -> last-rule-wins. | branching, mutually exclusive conditions, last-rule-wins | Implementing type-discriminated or conditional routing |
| S4.13.2 | 4.13.2 Reverse Direction | During reverse, condition evaluates against external document. `$` and `@source` bind to external values. Authors SHOULD ensure conditions work in both directions or provide `reverse.condition`. | reverse condition, external document binding | Implementing conditional logic that works bidirectionally |
| S5 | 5. Bidirectional Semantics | Formal semantics for forward/reverse execution, auto-reversal, explicit overrides, lossiness, round-trip fidelity, and conflict resolution. | bidirectional semantics | Implementing reverse mapping support |
| S5.1 | 5.1 Forward and Reverse Execution | Direction table: Forward = Response -> External (default), Reverse = External -> Response. `direction` property controls default. Individual rules use `bidirectional`. Core processors MAY ignore `bidirectional`. | direction semantics, forward/reverse roles | Understanding source/target role swapping |
| S5.2 | 5.2 Auto-Reversal | Complete table of auto-reversibility per transform type. Lossless coercion pairs listed (string<->integer, string<->number, string<->boolean, date<->string with ISO 8601). Lossy pairs MUST NOT auto-reverse. | auto-reversal table, lossless coercion pairs, inverse transforms | Determining which transforms can be automatically reversed |
| S5.3 | 5.3 Explicit Reverse Overrides | `reverse` object properties: `transform`, `expression`, `coerce`, `valueMap`, `default`. sourcePath/targetPath swap automatically; reverse block MUST NOT re-specify them (validation error if present). | reverse block, auto path swap, forbidden properties | Implementing explicit reverse transform configuration |
| S5.4 | 5.4 Lossy Transforms and Non-Reversibility | Formal definition of lossy transform. Lossy rules MUST set `bidirectional: false`. Lossy + `bidirectional: true` without `reverse` block MUST error. Reverse through `bidirectional: false` MUST error (not silently skip). | lossy definition, bidirectional enforcement, error on reverse of non-reversible | Implementing lossy transform detection and enforcement |
| S5.5 | 5.5 Round-Trip Fidelity | Formal mathematical definitions of Response Round-Trip and External Round-Trip properties. Uncovered fields left untouched. Bidirectional conformance MUST satisfy both properties. | round-trip fidelity, P(R) projection, response round-trip, external round-trip | Verifying or testing bidirectional correctness |
| S5.6 | 5.6 Conflict Resolution in Reverse Mapping | When multiple external fields map to same Response path: (1) last-rule-wins, (2) SHOULD warn, (3) `reversePriority` (non-negative integer) overrides document order (highest wins). | reverse conflict resolution, reversePriority, last-rule-wins | Handling multiple-to-one reverse mapping conflicts |
| S6 | 6. Format Adapters | Decouples transform logic from wire formats. Adapters implement serialize (JSON -> bytes) and deserialize (bytes -> JSON). | Adapter interface, serialize/deserialize | Implementing format-specific serialization |
| S6.1 | 6.1 Adapter Architecture | Adapter operations: serialize and deserialize. 3 built-in adapters: JSON (Core), XML (Extended), CSV (Extended). Active adapter from `targetSchema.format`; JSON is default. Custom adapters supported. | adapter operations, built-in adapters, format selection | Understanding the adapter abstraction |
| S6.2 | 6.2 JSON Adapter | Identity serialization (internal is already JSON). Dot-notation with bracket indexing. Auto-creates intermediate objects/arrays. Config: `pretty`, `sortKeys`, `nullHandling` (include/omit). | JSON adapter, identity serialization, null handling | Configuring JSON output formatting |
| S6.3 | 6.3 XML Adapter (Mapping Extended) | JSON -> XML 1.0 serialization. Path conventions: `a.b.c` = nested elements, `a.b.@id` = attribute, `a.b[0].c` = repeated sibling. Namespace colon notation. Requires `rootElement`, optional `namespaces`. Config: `declaration`, `indent`, `cdata` paths. | XML adapter, attribute `@` prefix, namespace prefixes, rootElement, CDATA | Implementing XML serialization with namespaces and attributes |
| S6.4 | 6.4 CSV Adapter (Mapping Extended) | JSON -> RFC 4180 CSV. All target paths MUST be simple identifiers (no dots/brackets). Repeat groups emit separate rows; non-repeat fields duplicated. Config: `delimiter`, `quote`, `header`, `encoding`, `lineEnding`. | CSV adapter, flat paths only, repeat -> rows, RFC 4180 | Implementing CSV serialization for tabular export |
| S6.5 | 6.5 Custom Adapters | Custom adapter identifiers MUST begin with `x-` prefix. Config under `adapters.<identifier>`. MUST implement serialize/deserialize. Unrecognized adapter MUST error (no silent JSON fallback). | custom adapters, x- prefix, no silent fallback | Extending the adapter system with custom formats |
| S7 | 7. Processing Model | Normative execution pipeline and error handling. | processing model | Understanding the complete execution lifecycle |
| S7.1 | 7.1 Execution Pipeline | 7-step ordered pipeline: (1) Validate, (2) Resolve direction, (3) Apply defaults, (4) Generate auto-map rules, (5) Sort rules, (6) Execute rules (condition -> resolve -> transform -> write), (7) Serialize. Reverse execution swaps roles at step 6. | 7-step pipeline, execution order | Implementing a conformant mapping engine |
| S7.2 | 7.2 Error Handling | 4 error categories: Validation (halt before step 6), Resolution (use default or diagnostic), Transform (diagnostic, non-fatal, continue), Adapter (halt, no partial output). Diagnostic object schema: ruleIndex, sourcePath, targetPath, errorCode, message. 8 standard error codes. | error categories, halt vs non-fatal, Diagnostic object, error codes | Implementing error handling and diagnostics |
| S7.3 | 7.3 Null and Absent Value Handling | Distinguishes absent fields from explicit null. 4x3 behavior matrix for absent+default, absent+no-default, and explicit null across preserve/expression/coerce/valueMap transforms. | absent vs null, default handling, behavior matrix | Implementing null/absent handling for each transform type |
| S7.4 | 7.4 Idempotency | Forward mapping MUST be idempotent. No non-determinism (random IDs, timestamps, hash-map iteration) unless Mapping Document explicitly uses non-deterministic FEL. Reverse similarly idempotent. | idempotency, determinism requirement | Verifying deterministic behavior of mapping execution |
| S8 | 8. Examples | Three complete end-to-end Mapping Document examples. | -- | Seeing realistic complete mapping configurations |
| S8.1 | 8.1 Grant Application to Federal API | Maps grant form to federal API: preserve, expression (EIN dash stripping with explicit reverse), coerce, array each with innerRules (valueMap for category codes), defaults for envelope. | grant API example, EIN formatting, array innerRules | Seeing a realistic JSON API mapping with arrays |
| S8.2 | 8.2 Patient Intake to CSV Export | Maps patient form to flat CSV: preserve, coerce, flatten with indexed mode for positional medication columns, flatten with separator for allergy list. All targetPaths are simple identifiers per CSV constraint. | CSV export example, indexed positional columns, flatten separator | Seeing a realistic CSV mapping with repeat groups |
| S8.3 | 8.3 Bidirectional FHIR Integration | Round-trip mapping between vitals form and FHIR Observation. Uses preserve, coerce, and constant. Demonstrates auto-reversal for lossless rules and forward-only constant. | FHIR example, bidirectional, constant forward-only, auto-reversal | Seeing a realistic bidirectional integration mapping |
| App A | Appendix A. Relationship to S6.7 Migrations (Normative) | Formal (normative) algorithm for converting S6.7 migration descriptors into Mapping Documents. | S6.7 conversion algorithm | Converting existing migration descriptors to Mapping Documents |
| A.1 | A.1 Conversion Algorithm | 5-step algorithm: create Mapping Document, set JSON adapter, convert each fieldMap entry (source->sourcePath, null target->drop, transform->transform, expression->bidirectional:false), copy defaults, set autoMap:true. | conversion algorithm, 5 steps | Implementing S6.7-to-Mapping conversion |
| A.2 | A.2 Example | Side-by-side S6.7 migration descriptor and equivalent Mapping Document with property correspondence table. | conversion example, property correspondence | Seeing a concrete S6.7 to Mapping Document conversion |

## Cross-References

| Reference | Context | Location |
|-----------|---------|----------|
| Formspec v1.0 core specification | Parent spec; Mapping DSL is a companion. Response schema (S2.1.6), FEL (S3), version migrations (S6.7) are incorporated by reference. | S1.1, S1.3, S2.5, Appendix A |
| S6.7 of the core specification (version-migration `fieldMap`) | The Mapping DSL generalizes this. Every S6.7 fieldMap entry is a degenerate Mapping Document Field Rule. Formal conversion algorithm in Appendix A. | Abstract, S1.3, S2.5, Appendix A |
| S3 of the core specification (FEL) | FEL is the computation substrate for all transform expressions. Mapping processors MUST implement FEL. | S1.3, S2.2, S2.6 |
| S2.1.6 of the core specification (Response schema) | Mapping processors MUST understand the Formspec Response schema. | S1.3 |
| RFC 8259 (JSON) | JSON syntax standard. Mapping Documents are JSON. JSON adapter serialization. | Conventions, S6.2, S7.1 |
| RFC 6901 (JSON Pointer) | JSON Pointer syntax reference. | Conventions |
| RFC 3986 (URI) | URI syntax for definitionRef and targetSchema.url. | Conventions |
| RFC 4180 (CSV) | CSV format standard for CSV adapter. | S1.5.3, S6.4 |
| RFC 2119 / RFC 8174 (Key words) | Normative keyword definitions. | Conventions |
| Semantic Versioning 2.0.0 | `version` and `definitionVersion` follow semver. | S2.3, S3.1.1 |
| HL7 FHIR | Referenced in examples (Patient R4, Observation). | S3.1.3, S8.3 |
| schemas/mapping.schema.json | Canonical JSON Schema governing Mapping Document structure. | BLUF, S3.1 (schema-ref) |

## Key Schemas Defined

| Schema / Structure | Section | Description |
|--------------------|---------|-------------|
| **Mapping Document (root)** | S3.1 | Top-level JSON object with `$schema`, `version`, `definitionRef`, `definitionVersion`, `direction`, `targetSchema`, `rules`, `defaults`, `autoMap`, `conformanceLevel`, `adapters`. |
| **Target Schema Descriptor** | S3.2 | Object describing external format: `format` (json/xml/csv), `name`, `url`, `rootElement`, `namespaces`. |
| **Field Rule** | S3.3 | Atomic mapping unit: `sourcePath`, `targetPath`, `transform`, `expression`, `coerce`, `valueMap`, `reverse`, `bidirectional`, `condition`, `default`, `array`, `description`, `priority`. |
| **Coerce Object** | S3.3.2 | `from`, `to` (type strings), `format` (pattern string). |
| **ValueMap Object** | S3.3.3 | `forward` (object), `reverse` (object, optional), `unmapped` (strategy string), `default` (any). |
| **Array Object** | S3.3.4 | `mode` (each/whole/indexed), `separator` (string), `innerRules` (array of Field Rules). |
| **Reverse Override Object** | S5.3 | `transform`, `expression`, `coerce`, `valueMap`, `default`. MUST NOT contain `sourcePath`, `targetPath`, or nested `reverse`. |
| **Diagnostic Object** | S7.2 | `ruleIndex` (integer), `sourcePath`, `targetPath`, `errorCode`, `message`. |
| **JSON Adapter Config** | S6.2 | `pretty` (boolean), `sortKeys` (boolean), `nullHandling` ("include"/"omit"). |
| **XML Adapter Config** | S6.3 | `declaration` (boolean), `indent` (integer), `cdata` (string[]). |
| **CSV Adapter Config** | S6.4 | `delimiter`, `quote`, `header` (boolean), `encoding`, `lineEnding` ("crlf"/"lf"). |

## Transform Operations Quick Reference

| Transform | Purpose | Auto-Reversible? | Inverse | Key Parameters | Notes |
|-----------|---------|:-:|---------|----------------|-------|
| `preserve` | Identity copy, value passes through unmodified | Yes | `preserve` | -- | Incompatible types: implicit coercion with warning |
| `drop` | Discard field from output | No | -- | -- | `bidirectional: true` MUST error; `targetPath` can be null |
| `expression` | Evaluate arbitrary FEL expression | No | -- | `expression` (REQUIRED) | `$` = source value, `@source` = full doc; needs explicit `reverse.expression` for bidirectional |
| `coerce` | Type conversion between data types | Conditional | `coerce` (inverse pair) | `coerce.from`, `coerce.to`, `coerce.format` | Lossless pairs auto-reverse; lossy (datetime->date, money->number) require explicit reverse |
| `valueMap` | Static lookup table substitution | Conditional | `valueMap` (inverted) | `valueMap.forward`, `valueMap.unmapped` | Bijective maps auto-reverse; non-injective require explicit reverse |
| `flatten` | Collapse nested/array to flat | Yes | `nest` | `separator` (for delimited mode) | 3 modes: delimited, positional, dot-prefix; mode inferred from source shape |
| `nest` | Expand flat to nested structure | Yes | `flatten` | `separator` (for string split) | Inverse of flatten; mode inferred from source shape |
| `constant` | Inject fixed value regardless of source | No | -- | `expression` (REQUIRED) | `sourcePath` ignored; `bidirectional: true` MUST error |
| `concat` | Combine multiple source fields into one string | No | -- | `expression` (REQUIRED) | References `@source`; boundary info lost; needs explicit reverse |
| `split` | Decompose single source into multiple targets | No | -- | `expression` (REQUIRED) | Must return object or array; join order ambiguous |

## Critical Behavioral Rules

These are the non-obvious rules that are easy to miss and commonly trip up implementers:

1. **Execution pipeline order is strict (S7.1).** The 7 steps MUST execute in order: Validate -> Resolve direction -> Apply defaults -> Generate auto-map -> Sort rules -> Execute rules -> Serialize. Defaults are applied BEFORE rules, and auto-map rules are generated BEFORE sorting.

2. **Priority sort means higher-priority rules execute FIRST, and thus get OVERWRITTEN (S3.4).** Because of last-write-wins, a rule with `priority: 10` will be overwritten by a later rule with `priority: 0` targeting the same path. This is counterintuitive. To make high-priority rules "win," use conditions on lower-priority rules, not priority alone.

3. **Auto-map synthetic rules have priority -1 (S3.5.1).** They always execute after all explicit rules (even priority 0), so explicit rules always overwrite auto-mapped values.

4. **`bidirectional` defaults to `true` (S3.3), except for `drop` which defaults to `false` (S4.3).** This means most rules are assumed bidirectional unless explicitly opted out. Lossy transforms without `bidirectional: false` or an explicit `reverse` block MUST produce a validation error.

5. **Reverse execution through `bidirectional: false` MUST error, not silently skip (S5.4).** The processor must actively reject reverse mapping attempts through non-reversible rules rather than ignoring them.

6. **`sourcePath` and `targetPath` swap automatically in reverse (S5.3).** The `reverse` block MUST NOT re-specify them. If either appears inside `reverse`, the processor MUST report a validation error.

7. **Condition is evaluated BEFORE any transform (S4.13).** A skipped rule (condition = false/null) MUST NOT produce an error even if its expression or sourcePath would be invalid for the given input.

8. **Absent vs explicit null are distinct (S7.3).** Absent + default -> write default. Absent + no default -> omit target (for preserve/coerce/valueMap) or evaluate with `$` = null (for expression). Explicit null -> write null (for preserve) or look up null key in valueMap.

9. **Lossless coercion pairs are specifically enumerated (S5.2).** Only string<->integer, string<->number, string<->boolean, and date<->string (with ISO 8601 format) are auto-reversible. All other coercion pairs (number->integer, money->number, datetime->date) are lossy and MUST NOT auto-reverse.

10. **ValueMap auto-reverse requires bijective forward map (S4.6).** If forward has duplicate values (non-injective), auto-reversal is impossible. A `reverse.valueMap.forward` block MUST be provided explicitly, or the processor MUST error.

11. **CSV target paths MUST be flat identifiers (S6.4, S3.2.1).** No dots, no brackets. A nested targetPath with CSV format MUST produce a validation error. Auto-map silently skips dotted paths for CSV.

12. **Adapter errors MUST halt; partial output MUST NOT be emitted (S7.2).** Unlike transform errors (which are non-fatal), adapter failures are fatal.

13. **Unmapped valueMap strategy applies in BOTH directions (S4.6).** Unless the reverse block specifies its own `unmapped` override, the forward strategy is used for reverse too.

14. **Forward mapping MUST be idempotent (S7.4).** No random IDs, timestamps, or non-deterministic hash-map iteration unless the Mapping Document explicitly invokes non-deterministic FEL functions.

15. **Uncovered fields are left untouched by both forward and reverse execution (S5.5).** The engine MUST NOT modify fields that no Field Rule covers. During reverse injection into a new Response, status is set to `"in-progress"` (S2.4.2).

16. **`flatten` and `nest` are structural inverses (S4.7, S4.8).** Flatten auto-reverses to nest and vice versa. Mode is inferred from source shape, not declared.

17. **In `array.mode: "indexed"`, uncovered elements are DROPPED (S4.12.4).** Only elements with matching index in innerRules are mapped; the rest are discarded.

18. **Multiple rules targeting same targetPath with conditions: last-rule-wins when multiple are true (S4.13.1).** Processor SHOULD warn (but MUST NOT error) if conditions are not provably exclusive.

19. **Unrecognized root properties MUST be rejected unless `x-` prefixed (S3).** This applies to the Mapping Document root level.

20. **Custom adapter identifiers MUST begin with `x-` (S6.5).** An unrecognized adapter MUST error; no silent fallback to JSON.
