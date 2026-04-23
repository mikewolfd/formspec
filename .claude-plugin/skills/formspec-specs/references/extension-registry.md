# Extension Registry Specification Reference Map

> specs/registry/extension-registry.md -- 591 lines, ~32K -- Companion: Extension Publishing, Discovery, Lifecycle (registry tier)

## Overview

The Extension Registry specification defines a static JSON catalog format for publishing, discovering, and validating Formspec extensions and semantic metadata. It complements Formspec v1.0 §8, which defines extension categories and the `x-` prefix but leaves publication and discovery unspecified. The spec normativizes Registry Documents and Registry Entries, naming rules, optional well-known URL discovery, a four-state lifecycle, and processor conformance. The abstract enumerates seven entry kinds (including concept identities and vocabulary bindings); the normative entry table in §3 lists five `category` enum values, while §3.2 additionally documents `concept` and `vocabulary` whose shapes are aligned with the Ontology specification -- Appendix A’s JSON Schema `category` enum still lists only the five processing-model extension categories.

## Section Map

### Title, YAML Front Matter, and Introductory Sections (Lines 1-71)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| (front) | YAML front matter | Machine metadata: title, version, date, status for the spec document itself (not the Registry JSON format). | title, version, date, status, draft | Identifying the spec revision you are reading |
| (title) | Formspec Extension Registry v1.0 | Human-facing title block: spec version line, date, editors, companion relationship to Formspec v1.0. | v1.0.0-draft.1, companion | Citation and version alignment with core |
| Abstract | Abstract | Defines Registry Documents as JSON catalogs of named entries (data types, functions, constraints, properties, namespaces, concepts, vocabularies) with metadata, compatibility, and schemas; explicitly not a runtime service -- static format for HTTPS, packages, or repos. | Registry Document, static format, interoperability | Understanding purpose and non-goals |
| Status | Status of This Document | Draft disclaimer; companion to core v1.0 and does not modify §8 extension mechanisms; implementors MUST NOT treat as stable until 1.0.0. | draft, companion, feedback | Checking maturity and production use |
| Conventions | Conventions and Terminology | BCP 14 / RFC 2119 / RFC 8174 keywords; JSON (RFC 8259), URI (RFC 3986), Semver 2.0.0; inherits Formspec v1.0 terms; defines Registry Document, Registry Entry, registry-aware processor. | MUST, Registry-aware processor, conformant processor | Interpreting normative language and defined terms |
| BLUF | Bottom Line Up Front | Four bullets: registry role, required top-level fields (`$formspecRegistry`, `publisher`, `published`, `entries`), entry concerns, structural contract from `schemas/registry.schema.json`. | `$formspecRegistry`, BLUF, schema contract | Quick orientation |

### 1. Purpose and Scope (Lines 73-92)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 1 | Purpose and Scope | States core §8 defines five categories and `x-` prefix while leaving publication/discovery out of scope; this spec supplies six deliverables (entry format, document format, naming, discovery, lifecycle, conformance) and explicitly excludes centralized registry service, governance board, or approval. | five categories, decentralized publishing, six deliverables | Scoping what the spec does and does not require |

### 2. Registry Document Format (Lines 96-124)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 2 | Registry Document Format | Top-level JSON object; schema-ref generated table is the canonical structural contract for `$formspecRegistry` (const `"1.0"`), optional `$schema`, required `entries` with per-document unique `(name, version)`, optional registry-level `extensions` (keys `x-`-prefixed), required `published` (ISO 8601), required `publisher` ($ref Publisher). | `$formspecRegistry`, `entries`, `published`, uniqueness | Authoring or validating top-level registry JSON |
| 2.1 | Publisher Object | Sub-object at document or entry level: `name` and `url` (URI) required; `contact` optional (email or URI). | Publisher, name, url, contact | Building publisher metadata |

### 3. Registry Entry Format (Lines 126-220)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 3 | Registry Entry Format | Per-`entries` element: `name`, `category` (table lists five enum strings -- see §3.2 for concept/vocabulary), `version` (semver), `status`, optional entry `publisher` override, required `description`, `compatibility`, optional docs/schemas/license/examples/extensions; `deprecationNotice` conditional on deprecated status. | name, category, version, status, deprecationNotice | Creating or validating one entry row |
| 3.1 | Compatibility Object | Required `formspecVersion` (semver range); optional `mappingDslVersion` when extension interacts with mappings. | formspecVersion, mappingDslVersion | Declaring supported Formspec / Mapping DSL versions |
| 3.2 | Category-Specific Properties | Additional required/optional fields per category: dataType (`baseType`, optional `constraints`, `metadata`); function (`parameters`, `returns`); constraint (`parameters`); property (no extra required; `schemaUrl` recommended); namespace (optional `members`); concept (`conceptUri` required; conceptSystem, conceptCode, equivalents with SKOS types, metadata) with semanticType resolution note; vocabulary (`vocabularySystem` required; version, filter, metadata) complementing Ontology Document bindings. Note: concept/vocabulary MUST NOT affect processing model (core §2.4). | baseType, parameters, returns, members, conceptUri, vocabularySystem, filter, semanticType, SKOS | Category-specific authoring; ontology-tier vs extension-tier |

### 4. Naming Rules (Lines 223-256)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 4 | Naming Rules | Six normative rules: all identifiers `x-` prefixed; regex `^x-[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$`; `x-formspec-` reserved for future core promotion; `(name, version)` unique within document; cross-registry collisions resolved by publisher authority with `x-{org}-{domain}` SHOULD pattern (§8.5); concept SHOULD use `x-onto-`, vocabulary SHOULD use `x-vocab-` (advisory). | x- prefix, regex, x-formspec-, uniqueness, x-onto-, x-vocab- | Naming extensions and avoiding collisions |

### 5. Discovery (Lines 259-280)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 5 | Discovery | SHOULD serve registry at `https://{host}/.well-known/formspec-extensions.json`; response MUST be `application/json` and valid Registry Document (§2); SHOULD support conditional GET; processors MAY accept registry URIs from config, CLI, or Definition metadata -- well-known is optional. | well-known, Content-Type, conditional GET, OPTIONAL | Automated discovery and alternate distribution |

### 6. Extension Lifecycle (Lines 283-302)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 6 | Extension Lifecycle | Four states with ASCII diagram: draft → stable → deprecated → retired; rules for each transition; `(any) → draft` allowed via new major version; transitions MUST NOT skip states (no draft→deprecated, no stable→retired). | draft, stable, deprecated, retired, deprecationNotice, interface freeze | Lifecycle policy and processor-visible status |

### 7. Conformance (Lines 306-355)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 7 | Conformance | Eight behaviors for registry-aware processors (extends conformant processor per core §1): load/parse against Appendix A schema; resolution by name+category; compatibility warning (strict flag); retired MUST warn, deprecated SHOULD inform; optional schemaUrl validation; UNRESOLVED_EXTENSION error for enabled missing extensions; concept resolution for semanticType (non-match not an error); vocabulary defaults with Ontology Document precedence. | UNRESOLVED_EXTENSION, x-formspec-strict, semanticType, vocabularySystem | Implementing registry-aware tooling |

### 8. Examples (Lines 358-437)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 8 | Examples | Introduces worked JSON. | examples | Finding sample material |
| 8.1 | Registry Document with Two Entries | Full document with `x-gov-grants` namespace (members, nested extensions in examples) and `x-currency-usd` dataType (baseType, constraints, metadata, field example). | x-gov-grants, x-currency-usd | Copy-paste template for real registries |

### Appendices (Lines 441-591)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| Appendix A | Registry Entry JSON Schema | Draft 2020-12 schema for a single entry: required core fields; `category` enum **five values only** (no `concept`/`vocabulary` in schema); naming pattern; conditional `allOf` for dataType/baseType, function/parameters+returns, constraint/parameters, deprecated/deprecationNotice; `additionalProperties: false`; `$defs.publisher`. Document-level wrapper described in prose only. | JSON Schema, allOf, additionalProperties, $defs/publisher | Machine validation of the five core categories; note gap vs §3.2 ontology categories |
| Appendix B | References | Normative/informative citations: BCP 14, RFC 8174, RFC 8259, RFC 3986, Semver, SPDX License List, RFC 8615 (well-known URIs). | RFC 2119, RFC 8615, SPDX | Tracing spec dependencies |

## Cross-References

- **Formspec v1.0 §8** -- Core extension categories and `x-` prefix; companion relationship; naming pattern `x-{org}-{domain}` (§8.5) in §4 rule 5.
- **Formspec v1.0 §8.1–§8.5** -- Referenced from §3.2 for dataType, function, constraint, property, namespace category semantics.
- **Formspec v1.0 §1** -- Conformant processor definition reused in §7 opening.
- **Formspec v1.0 §2.4** -- Processing model; concept/vocabulary entries MUST NOT affect it (§3.2 Note).
- **Ontology specification** -- Defines concept and vocabulary entry semantics referenced in §3.2; vocabulary complements Ontology Document bindings (§3.2, §7 rule 8).
- **Ontology Document** -- Vocabulary bindings vs registry vocabulary entries; document values take precedence (§7 rule 8).
- **`schemas/registry.schema.json`** -- Governs full Registry Document structure (BLUF, §2 schema-ref).
- **Mapping DSL** -- `mappingDslVersion` in compatibility (§3.1).
- **SKOS** -- Equivalence `type` values for concept `equivalents` (§3.2).
- **BCP 14 / RFC 2119 / RFC 8174** -- Keyword interpretation (§Conventions, Appendix B).
- **RFC 8259, RFC 3986** -- JSON and URI (Conventions, Appendix B).
- **Semantic Versioning 2.0.0** -- Version and range syntax (Conventions, Appendix B).
- **SPDX License List** -- License field (§3, Appendix B).
- **RFC 8615** -- Well-known URIs for discovery (§5, Appendix B as [well-known]).

## Key Schemas and Tables

| Artifact | Location | Purpose |
|----------|----------|---------|
| Registry Document | §2 schema-ref + `schemas/registry.schema.json` | Top-level catalog: `$formspecRegistry`, `$schema`, `publisher`, `published`, `entries`, `extensions` |
| Publisher | §2.1 + Appendix A `$defs.publisher` | Reusable publisher object |
| Registry Entry | §3 + Appendix A | Per-entry validation for five `category` values in schema |
| Compatibility | §3.1 + Appendix A | `formspecVersion`, optional `mappingDslVersion` |
| Conditional requirements | Appendix A `allOf` | dataType → `baseType`; function → `parameters`, `returns`; constraint → `parameters`; deprecated → `deprecationNotice` |

## Extension Categories Quick Reference

| Category | Required category-specific | Optional / recommended | Spec anchor |
|----------|---------------------------|-------------------------|--------------|
| `dataType` | `baseType` | `constraints`, `metadata` | Core §8.1 |
| `function` | `parameters`, `returns` | -- | Core §8.2 |
| `constraint` | `parameters` | -- | Core §8.3 |
| `property` | -- | `schemaUrl` recommended | Core §8.4 |
| `namespace` | -- | `members` | Core §8.5 |
| `concept` | `conceptUri` | `conceptSystem`, `conceptCode`, `equivalents`, `metadata` | Ontology spec; **not** in Appendix A enum |
| `vocabulary` | `vocabularySystem` | `vocabularyVersion`, `filter`, `metadata` | Ontology spec; **not** in Appendix A enum |

## Lifecycle State Transitions

| From | To | Rule |
|------|-----|------|
| draft | stable | Publisher asserts interface frozen for that major version |
| stable | deprecated | MUST include `deprecationNotice`; SHOULD name replacement |
| deprecated | retired | SHOULD NOT use; processors SHOULD warn on retired |
| (any) | draft | New `version` with incremented major MAY re-enter draft |
| draft | deprecated | **FORBIDDEN** (no skipped states) |
| stable | retired | **FORBIDDEN** (no skipped states) |

## Critical Behavioral Rules

1. **UNRESOLVED_EXTENSION is an error.** Enabled extension reference (`"extensions": { "x-example": true }`) with no matching registry entry → MUST emit error code `UNRESOLVED_EXTENSION`; disabled (`false`) does not trigger. (§7.6)

2. **Lifecycle transitions must not skip states.** No draft→deprecated or stable→retired. (§6)

3. **`deprecationNotice` is required when `status` is `deprecated`.** (§3, §6, Appendix A conditional)

4. **Compatibility mismatch → warning by default; strict mode is opt-in.** Unless entry `extensions` contains `"x-formspec-strict": true`, mismatch SHOULD NOT be a hard error. (§7.3)

5. **`x-formspec-` is reserved** for identifiers that might be promoted into core; third parties MUST NOT use that prefix. (§4.3)

6. **`(name, version)` unique within one Registry Document.** Cross-registry collisions are publisher-authority problems; use `x-{org}-{domain}` to reduce risk. (§4.4–4.5)

7. **Identifier regex is strict lowercase hyphenated segments** after `x-`. (§4.2)

8. **Entry-level `publisher` overrides document-level** for that entry. (§3)

9. **`retired` → MUST warn; `deprecated` → SHOULD informational notice.** (§7.4)

10. **Well-known URL is optional**; other URIs MAY come from config, CLI, or Definition metadata. (§5.4)

11. **Appendix A uses `additionalProperties: false` on entries**; vendor keys live under `extensions` with `x-` property names pattern where specified. (Appendix A)

12. **Concept and vocabulary entries MUST NOT affect the core processing model** (pure metadata). (§3.2 Note, core §2.4)

13. **Unresolved `semanticType` (no matching concept entry) is not an error**--string remains opaque for non–concept-aware processors. (§7.7)

14. **Ontology Document overrides registry vocabulary defaults** when both define the same `vocabularySystem`. (§7.8)

15. **`x-onto-` / `x-vocab-` prefixes are SHOULD-level naming hints** for concept vs vocabulary entries, not enforced by the regex. (§4.6)

16. **Schema vs prose gap:** §7.1 requires validation against Appendix A (entry schema); full-document validation remains tied to `schemas/registry.schema.json` (BLUF/§2). Implementors should validate **document** against registry schema and **each entry** against Appendix A; ontology categories may need Ontology-supplied or extended schemas until Appendix A enum catches up.
