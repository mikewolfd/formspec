# References Specification Reference Map

> specs/core/references-spec.md -- 697 lines, ~49K -- Companion: External Documentation, Knowledge Sources, Agent Data Stores

## Overview

The References Specification defines a standalone sidecar document (References Document) that binds external documentation, knowledge sources, and AI agent data stores to items in a Formspec Definition. Like Theme, Component, and Locale documents, a References Document targets a Definition but lives alongside it. References serve two audiences: human users (help articles, regulatory guidance, instructional material) and AI companion agents (vector store collections, knowledge bases, tool schemas, retrieval endpoints). References are pure metadata: they MUST NOT affect data capture, validation, or the processing model. A conformant processor that does not understand references MUST ignore them without error.

## Section Map

### Front Matter and Introduction (Lines 1-89)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| Abstract | Abstract | Defines References Document: standalone sidecar for attaching external documentation, knowledge sources, and AI agent data stores to any level of a Definition. | References Document, sidecar, dual audience | Understanding what the spec defines |
| Status | Status of This Document | Draft companion. Does not modify core processing model. | Draft, companion | Checking spec maturity |
| Conventions | Conventions and Terminology | RFC 2119/8174 keywords, core spec terms, JSON Pointer (RFC 6901). | MUST/SHOULD/MAY | Interpreting normative language |
| BLUF | Bottom Line Up Front | Summary: sidecar for external context, dual audience (human+agent), static metadata, multiple documents per Definition. | Quick orientation | Quick orientation |
| S1 | 1. Introduction | Forms exist in context (regulations, criteria, standards). References Document binds reference documentation to specific items. Two audiences: human users and AI companion agents. References are metadata -- safe additive layer. | Context binding, dual audience, metadata | Understanding purpose and motivation |
| S1.1 | 1.1 Design Principles | Five principles: additive not invasive, audience-aware, transport-agnostic, composable, scoped. | Design philosophy | Understanding architectural decisions |

### Reference Object (Lines 90-192)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S2 | 2. Reference Object | Core data structure: JSON object pointing to external or inline contextual information. | Reference object | Understanding the reference data model |
| S2.1 | 2.1 Properties | 12 properties: `id` (recommended, unique), `type` (required), `audience` (required: human/agent/both), `title` (recommended), `uri` (conditional -- required unless `content`), `content` (conditional -- required unless `uri`), `mediaType`, `language` (BCP 47), `description`, `tags` (array), `priority` (primary/supplementary/background), `rel` (relationship type), `selector`, `extensions` (x-prefixed). | Reference properties, audience, type | Authoring reference objects |
| S2.2 | 2.2 Reference Types | 12 types in three groups: human-oriented (`documentation`, `example`), shared (`regulation`, `policy`, `glossary`, `schema`), agent-oriented (`vector-store`, `knowledge-base`, `retrieval`, `tool`, `api`, `context`). Custom types `x-`-prefixed. Unrecognized non-`x-` types: warn, may skip, must not reject. | Reference types, audience groups | Choosing the right reference type |
| S2.3 | 2.3 Validation Rules | At least one of `uri`/`content`. Both present = content is fallback. `audience` enum. `priority` enum. `rel` open string with defined values. FEL MUST NOT appear. Empty `references` array valid. | Validation constraints | Validating reference objects |
| S2.4 | 2.4 Array Ordering | References are ordered (first = most relevant). Grouped by priority tier; within tier, array order determines sequence. | Ordering, priority tiers | Understanding reference presentation order |
| S2.5 | 2.5 Reference Relationships | `rel` property: 8 defined values (`authorizes`, `constrains`, `defines`, `exemplifies`, `supersedes`, `superseded-by`, `derived-from`, `see-also`). Absent = `"see-also"`. Custom: `x-`-prefixed. Modeled after IANA Link Relations. | Relationship types, semantic relationships | Declaring how a reference relates to its target item |

### URI Schemes for Agent Data Stores (Lines 207-328)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S3 | 3. URI Schemes for Agent Data Stores | Defines URI scheme conventions for common AI infrastructure beyond standard `https://` URLs. Formspec-defined conventions, not IANA-registered. | URI schemes, AI infrastructure | Pointing references to agent data sources |
| S3.1 | 3.1 Vector Store References | `vectorstore:{provider}/{collection-id}`. Examples: Pinecone, ChromaDB, Weaviate. Collection-level; query params are runtime concern. | vectorstore: URI scheme | Referencing vector store collections |
| S3.2 | 3.2 Knowledge Base References | `kb:{provider}/{base-id}`. Examples: AWS Bedrock, Confluence. | kb: URI scheme | Referencing knowledge base resources |
| S3.3 | 3.3 Retrieval Endpoints | Standard HTTPS URIs with `type: "retrieval"` + `extensions` for query details (method, topK, authScheme). | Retrieval endpoints, HTTPS | Pointing to RAG API endpoints |
| S3.4 | 3.4 Host-Provided Data Sources | `formspec-fn:{function-name}`. Delegates to host environment. Same convention as Data Sources (core S2.1.7). Environment-independent. | formspec-fn: scheme, host delegation | Environment-agnostic agent data resolution |
| S3.5 | 3.5 Opaque Identifiers | `urn:x-{org}:{type}:{id}`. For cases where no URI scheme fits. | URN identifiers | Custom resource identification |
| S3.6 | 3.6 Fragment Targeting | URI fragments for specific portions of referenced resources. HTML (#id), PDF (#page=N), JSON (JSON Pointer). `selector` property for schemes without fragment semantics -- unstructured advisory text. | Fragments, selector, media-type-dependent | Pointing to specific sections within a reference |

### References Document (Lines 329-541)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S4 | 4. References Document | Standalone sidecar document. Analogous to Theme and Component documents. | References Document | Creating references documents |
| S4.1 | 4.1 Document Structure | Required: `$formspecReferences` (const "1.0"), `version`, `targetDefinition`, `references` (array). Optional: `url`, `name`, `title`, `description`, `referenceDefs`. `x-` extension properties allowed and preserved. | Document structure, required properties | Authoring references documents |
| S4.2 | 4.2 Bound References | Each entry in `references` array adds a `target` property (required) binding the reference to a Definition item by path. Special value `"#"` = form-level. Uses Bind.path dot-notation (core S4.3.3). | Bound Reference, target path | Binding references to specific items |
| S4.3 | 4.3 Target Definition Binding | `url` (required) + `compatibleVersions` (optional semver range). URL mismatch -> MUST NOT apply + SHOULD emit error. Version mismatch -> SHOULD warn, MAY apply. | targetDefinition, URL verification | Binding references document to a Definition |
| S4.4 | 4.4 Multiple References Documents | Multiple documents MAY target same Definition (audience separation, locale variants, domain overlays). Merge by collecting all Bound References. Cross-document load order is implementation-defined. Same-path references are additive. | Multiple documents, merge semantics | Composing reference documents |
| S4.5 | 4.5 Scoping and Non-Inheritance | References target specific items by path. Group references do NOT inherit to children. Consumers wanting hierarchical context walk ancestor paths. Non-relevant item references persist but SHOULD NOT be surfaced. | Non-inheritance, explicit targeting | Understanding reference scoping |
| S4.6 | 4.6 Reuse via `referenceDefs` | Registry of reusable Reference objects. `$ref` pointers in the `references` array. Shallow merge for overrides. Key becomes resolved `id`. | referenceDefs, $ref, reuse | Deduplicating repeated reference objects |
| S4.6.1 | 4.6.1 Declaring Shared References | `referenceDefs` object keyed by identifiers. Key = `id`. If entry declares `id`, it MUST match key (processing-time validation). | Shared reference declaration | Authoring referenceDefs entries |
| S4.6.2 | 4.6.2 Referencing Shared Definitions | `{ "$ref": "#/referenceDefs/{key}" }`. JSON Pointer (RFC 6901). Override properties alongside `$ref`. | $ref pointers, overrides | Using referenceDefs entries |
| S4.6.3 | 4.6.3 Resolution Rules | Six rules: load-time resolution, broken $ref is document error, no recursion, unused defs are inert, $ref key becomes id (no override of id), merged result must pass validation. | Resolution rules | Implementing $ref resolution |
| S4.7 | 4.7 URI Stability and Versioning | URIs not versioned with the document. References point to living external resources. Pinning via `content` for inline snapshots. | URI versioning independence | Understanding reference lifecycle |
| S4.8 | 4.8 Modular Composition | References from imported `$ref` definitions do NOT transfer automatically. Host definition must explicitly bind references to imported items using assembled paths. | Composition, keyPrefix | Handling references with modular composition |

### Agent Integration and Conformance (Lines 543-697)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S5 | 5. Agent Integration Patterns | Advisory patterns for AI companion agent consumption. | Agent integration | Implementing agent-side reference consumption |
| S5.1 | 5.1 Context Assembly | Eight-step recommended approach: collect all loaded docs, filter by target path, collect ancestor + form-level refs, filter by audience, sort by priority, weight by rel, use inline content, resolve URIs. | Context assembly algorithm | Building agent context from references |
| S5.2 | 5.2 Vector Store Query Pattern | Agent constructs query from field label/description/hint + user question. Tags for namespace scoping. | RAG query construction | Implementing vector store reference consumption |
| S5.3 | 5.3 Tool References | `type: "tool"` with tool schema in `content`. JSON schema for function parameters inline. | Tool references, function invocation | Declaring tools agents can invoke |
| S5.4 | 5.4 Grounding Documents | `type: "context"` with inline `content`. Pre-written grounding text for agents. Field-specific instructions beyond description/hint. | Grounding, inline context | Providing optimized agent context |
| S6 | 6. Relationship to Existing Properties | Table: `label` (display), `hint` (inline instruction), `description` (on-demand help), `references` (deeper external context for humans + agents). | Property complement | Understanding how references complement existing properties |
| S7 | 7. Rendering Guidance | Advisory patterns: documentation/regulation as links in help panel, examples inline/popover, agent refs not rendered, `audience: "both"` available to both, relationship-aware rendering. | Rendering patterns | Implementing UI for human references |
| S8 | 8. Conformance | Core and Extended processor requirements. | Conformance | Implementing conformant reference handling |
| S8.1 | 8.1 Core Processor Requirements | Core processors MAY ignore entirely. MUST NOT use references to alter data/validation/processing. References MUST NOT appear in Response data. | Core conformance | Minimum requirements |
| S8.2 | 8.2 Extended Processor Requirements | Load/validate against schema, resolve `$ref` at load time, verify `targetDefinition.url` (mismatch -> don't apply + error), verify `compatibleVersions` (warn on mismatch), validate `referenceDefs` key/id match, validate target paths (warn, don't reject), surface human refs in UI, make agent refs available via API, warn on unrecognized types. | Extended conformance | Building full reference support |
| S9 | 9. Schema | Schema reference for `schemas/references.schema.json`. Generated table of all properties. | Schema | Programmatic validation |
| S10 | 10. Security Considerations | URI resolution allowlists, inline content sanitization, no credentials in URIs, prompt injection awareness, circular resolution guards, browser CORS/CSP, document provenance verification. | Security | Implementing secure reference handling |

## Cross-References

| Referenced Spec | Context |
|-----------------|---------|
| Formspec v1.0 Core Specification | Bind paths (S4.3.3), Data Sources `formspec-fn:` convention (S2.1.7), modular composition `$ref`+`keyPrefix` (S6.6) |
| Theme Specification | Sidecar pattern analogy |
| Component Specification | Sidecar pattern analogy, `$defs/TargetDefinition` shared type |
| `schemas/references.schema.json` | Structural contract for References Documents |
| `schemas/component.schema.json` | `$defs/TargetDefinition` shared type |
| RFC 6901 | JSON Pointer syntax for `$ref` resolution and JSON fragment targeting |
| RFC 3986 | URI syntax and fragment semantics |
| IANA Link Relations | Inspiration for `rel` relationship types |

## Key Schemas Defined

| Schema | Location | Purpose |
|--------|----------|---------|
| References Document (top-level) | S4.1, `schemas/references.schema.json` | Top-level structure with all properties |
| Reference | S2.1, `schemas/references.schema.json#/$defs/Reference` | Core reference object with type, audience, uri/content |
| BoundReference | S4.2, `schemas/references.schema.json#/$defs/BoundReference` | Reference + target path binding |
| ReferenceOrRef | S4.6.2, `schemas/references.schema.json#/$defs/ReferenceOrRef` | Union: inline reference or $ref pointer with overrides |
| ReferenceDefs | S4.6.1, `schemas/references.schema.json#/$defs/ReferenceDefs` | Registry of reusable reference objects |
| TargetDefinition | S4.3, shared from component schema | Definition binding with version range |

## Critical Behavioral Rules

1. **References are pure metadata (S1, S8.1).** They MUST NOT affect data capture, validation, or the processing model. Removing all References Documents produces an identical form from a data/behavior perspective.

2. **`audience` is the primary filtering mechanism (S2.1).** `"human"` = rendered in UI. `"agent"` = consumed programmatically by AI agents (not rendered). `"both"` = available to both pipelines. This is a hard enum, not advisory.

3. **References do NOT inherit from parent to child (S4.5).** A reference targeting a group does NOT automatically apply to the group's children. Each item must be targeted explicitly. Agents wanting hierarchical context must walk ancestor paths.

4. **Same-path references are additive across documents (S4.4).** Multiple References Documents targeting the same Definition merge their references. Same-path references from different documents do NOT replace each other -- they accumulate.

5. **`$ref` resolution is load-time and non-recursive (S4.6.3).** `$ref` pointers within `referenceDefs` are resolved before processing. A broken `$ref` is a document error. `referenceDefs` entries MUST NOT use `$ref` (no recursion).

6. **`target: "#"` means form-level (S4.2).** The special value `"#"` targets the entire form, not a specific item. Form-level references provide global context.

7. **`targetDefinition.url` mismatch is a hard error (S4.3, S8.2).** URL mismatch -> MUST NOT apply references + SHOULD emit error. Version mismatch via `compatibleVersions` is softer: SHOULD warn, MAY still apply.

8. **Reference property values are static (S2.3).** FEL expressions MUST NOT appear in any reference property. Dynamic resolution handled by host environment or `formspec-fn:` URIs.

9. **Array order is significant (S2.4).** First reference in array is most relevant. Priority tiers override array order: all primary before supplementary, regardless of position.

10. **`rel` defaults to `"see-also"` when absent (S2.5).** Unrecognized non-`x-` `rel` values: treat as `"see-also"` + emit warning. The `rel` property is an open string for forward compatibility.

11. **`referenceDefs` key becomes the resolved `id` (S4.6.3, rule 5).** After `$ref` resolution, the `id` of the resolved reference is always the `referenceDefs` key. An override entry MUST NOT include `id`.

12. **`vectorstore:` and `kb:` are Formspec conventions, not IANA schemes (S3 note).** For standards-compliant environments, use `urn:x-{org}:` or `formspec-fn:` instead.

13. **Non-relevant item references persist but SHOULD NOT be surfaced (S4.5).** References are structural metadata and survive relevance changes. But agents and renderers SHOULD NOT surface them for non-relevant items.
