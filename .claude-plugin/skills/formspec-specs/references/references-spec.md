# References Specification Reference Map

> specs/core/references-spec.md -- 697 lines, ~48K -- Companion: Sidecar References Document for External Context and Agent Data Stores

## Overview

The References Specification (v1.0.0-draft.1) defines a standalone sidecar JSON document that binds external documentation, knowledge sources, and AI agent data stores to items in a Formspec Definition. Like Theme and Component documents, a References Document lives alongside the Definition and is identified by a `$formspecReferences` version pin. References serve two audiences (human users and AI companion agents) and are pure metadata -- they MUST NOT affect data capture, validation, or the processing model. The spec covers the Reference object model, URI schemes for vector stores and knowledge bases, document structure with composable multi-document merging, `referenceDefs` for DRY reuse via `$ref`, agent integration patterns, and conformance levels.

## Section Map

### Document Header and Introduction (Lines 1-89)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| (front) | YAML front matter and title block | Machine-readable `title`, `version`, `date`, `status` plus human-facing title, version, editors, and companion-to line for the core spec. | draft, companion to Formspec v1.0 | Locating document version and editorial metadata |
| Abstract | Abstract | States that a References Document is a standalone sidecar that binds external resources to Definition items by path, targeting human users and AI agents. Multiple documents MAY target the same Definition. References are pure metadata that MUST NOT affect data capture, validation, or the processing model. | sidecar document, audience (human/agent/both), pure metadata, additive layer | Understanding the purpose and scope of the References spec |
| Status | Status of This Document | Marks this as a draft companion spec that does not modify the core processing model. Not stable for production until 1.0.0 release. | draft, companion spec, feedback | Determining maturity/stability for implementation decisions |
| Conventions | Conventions and Terminology | BCP 14 keyword conventions (MUST/SHOULD/MAY). References RFC 8259 (JSON), RFC 3986 (URI), RFC 6901 (JSON Pointer). Core terms (Definition, Item, Bind, FEL, conformant processor) retain core-spec meanings. | RFC 2119, RFC 8174, RFC 8259, RFC 3986, RFC 6901, conformant processor | Understanding normative language and external standards |
| BLUF | Bottom Line Up Front | Compact summary: sidecar model; `target` / `type` / `audience`; `uri` / `content`; multiple documents merge additively; pure metadata; open strings on `type` / `rel` for forward compatibility; no inheritance; `referenceDefs` + `$ref` for DRY reuse. | BLUF summary | Quick orientation before deeper reading |
| 1 | Introduction | Motivates contextual attachments (regulatory guidance, diagnostic criteria, reporting standards). Two audiences: humans (help, guidance) and AI agents (RAG, vector stores, tools). Ignoring references MUST not error -- safe additive layer. | contextual information, RAG, vector stores, knowledge bases, tool schemas | Understanding the problem space and design motivation |
| 1.1 | Design Principles | Five principles: (1) Additive, not invasive -- removing references yields identical form behavior. (2) Audience-aware -- each reference declares human/agent/both. (3) Transport-agnostic -- URIs, APIs, abstract identifiers. (4) Composable -- multiple documents per Definition. (5) Scoped -- each reference declares its target by path. | additive, audience-aware, transport-agnostic, composable, scoped | Understanding the design philosophy driving spec decisions |

### Reference Object (Lines 90-206)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 2 | Reference Object | Introduces the Reference as a JSON object pointing to external or inline contextual information. Container for properties, types, validation, ordering, and relationships. | Reference object | Understanding the base data model |
| 2.1 | Properties | Defines all **14** properties of a Reference: `id` (recommended, pattern-constrained), `type` (required), `audience` (required), `title` (recommended), `uri` (conditional), `content` (conditional -- string or object; authors SHOULD keep inline under ~50 KB), `mediaType`, `language` (BCP 47), `description`, `tags`, `priority` (primary/supplementary/background; absent ⇒ processors MUST treat as supplementary -- processing default, not schema default), `rel` (defaults to see-also when absent), `selector`, `extensions` (x-prefixed keys). | id, type, audience, title, uri, content, mediaType, language, description, tags, priority, rel, selector, extensions | Building or validating a Reference object, understanding each property's role |
| 2.2 | Reference Types | Categorizes types by interaction pattern. Human-oriented: `documentation`, `example`. Shared: `regulation`, `policy`, `glossary`, `schema`. Agent-oriented: `vector-store`, `knowledge-base`, `retrieval`, `tool`, `api`, `context`. Typical audience in tables is not binding -- `audience` is set per reference. Custom types must be x-prefixed. Unrecognized non-x types: SHOULD warn, MAY skip, MUST NOT reject. | documentation, example, regulation, policy, glossary, schema, vector-store, knowledge-base, retrieval, tool, api, context, x- prefix, forward compatibility | Choosing the correct type for a reference, understanding consumer interaction patterns |
| 2.3 | Validation Rules | Constraints: uri-or-content; both ⇒ content is cached/fallback; `id` unique within document (SHOULD across loaded docs); audience enum; type recognized or x-prefixed; priority enum; `rel` unrecognized non-x ⇒ see-also + SHOULD warn; empty `references` array valid; same `uri` MAY repeat; all values static -- no FEL (dynamic resolution via host or `formspec-fn:`). | uri-or-content, id uniqueness, audience enum, static values, no FEL expressions | Implementing validation logic, understanding what makes a Reference valid |
| 2.4 | Array Ordering | `references` array is ordered -- first is most relevant. Effective priority tier orders presentation: all primary before supplementary before background, regardless of array position; within a tier, array order is presentation sequence. | array ordering, priority tiers, presentation sequence | Implementing reference display ordering, understanding author intent |
| 2.5 | Reference Relationships | Defines `rel` with eight values: `authorizes`, `constrains`, `defines`, `exemplifies`, `supersedes`, `superseded-by`, `derived-from`, `see-also` (implicit when `rel` absent). Custom rels must be x-prefixed. Modeled after IANA Link Relations / HTML `rel`. References do not link to each other -- only to their target item. | rel, authorizes, constrains, defines, exemplifies, supersedes, superseded-by, derived-from, see-also, IANA Link Relations | Choosing the right relationship type, understanding how rel affects agent context weighting |

### URI Schemes for Agent Data Stores (Lines 207-327)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 3 | URI Schemes for Agent Data Stores | Introduces URI scheme conventions beyond standard `https://` for AI infrastructure. `vectorstore:` and `kb:` are Formspec conventions, not IANA-registered; for standards-compliant URIs prefer `urn:x-{org}:` (§3.5) or `formspec-fn:` (§3.4). | URI schemes, vectorstore:, kb:, formspec-fn:, urn:x- | Understanding how references point to AI data stores |
| 3.1 | Vector Store References | Format: `vectorstore:{provider}/{collection-id}`. Examples: Pinecone, ChromaDB, Weaviate. Query params and auth are runtime concerns. | vectorstore: scheme, provider, collection-id | Constructing URIs for vector store references |
| 3.2 | Knowledge Base References | Format: `kb:{provider}/{base-id}`. Examples: AWS Bedrock, Confluence. | kb: scheme, knowledge base URI | Constructing URIs for knowledge base references |
| 3.3 | Retrieval Endpoints | Standard HTTPS URIs with `type: "retrieval"`. `extensions` (e.g. `x-retrieval`) may carry method, topK, queryField, authScheme for the agent. | retrieval endpoints, x-retrieval extension, HTTPS URI | Setting up RAG/retrieval API references with query configuration |
| 3.4 | Host-Provided Data Sources | Format: `formspec-fn:{function-name}`. Delegates resolution to the host environment. Recommended for environment-independent definitions. Follows core Data Sources convention (core §2.1.7). | formspec-fn:, host delegation, environment-independent | Making references portable across environments |
| 3.5 | Opaque Identifiers | Format: `urn:x-{org}:{type}:{id}`. Fallback when standard schemes do not fit. | URN, opaque identifiers | Using non-standard identifier schemes |
| 3.6 | Fragment Targeting | URI fragments per RFC 3986 §3.5: HTML by id, PDF by open params, JSON by JSON Pointer (RFC 6901); plain text/markdown use `selector`. With fragment, authors SHOULD include `mediaType`. `selector` is advisory, unstructured. Both fragment and selector: fragment is machine-actionable; selector is supplementary human context. | URI fragment, selector, JSON Pointer, mediaType, advisory hint | Pointing to specific portions of referenced documents |

### References Document (Lines 329-541)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 4 | References Document | Introduces the standalone JSON sidecar. Like Theme (Tier 2) and Component (Tier 3), lives alongside the Definition. Multiple documents MAY target the same Definition for audience, language, domain, or deployment separation. | References Document, sidecar, standalone JSON | Understanding the document-level structure |
| 4.1 | Document Structure | MUST: `$formspecReferences` (`"1.0"`), `version`, `targetDefinition` (url + optional `compatibleVersions`), `references`. MAY: `url`, `name` (pattern), `title`, `description`, `referenceDefs`. Root `x-` properties allowed; unrecognized `x-` MUST be preserved on round-trip. Full example JSON included. | $formspecReferences, version, targetDefinition, references array, referenceDefs, name, x- extensions | Building or validating a References Document, understanding required vs optional fields |
| 4.2 | Bound References | Each `references` entry is a Bound Reference -- Reference (§2) plus required `target`, or `$ref` to `referenceDefs` (§4.6). Target uses dot-notation like Bind paths (core §4.3.3). `"#"` = form-level. Examples: `"#"`, `"indirectCostRate"`, `"budget.lineItems"`, `"lineItems[*].amount"`. | Bound Reference, target, path syntax, # form-level, dot-notation, [*] wildcard | Binding references to specific Definition items |
| 4.3 | Target Definition Binding | `targetDefinition.url` (required) MUST match loaded Definition `url` -- mismatch ⇒ MUST NOT apply, SHOULD error. `compatibleVersions` (optional) semver range -- mismatch ⇒ SHOULD warn, MAY still apply (warn-and-continue). When absent, compatible with any version at that URL. | targetDefinition, url matching, compatibleVersions, semver range, warn-and-continue | Implementing document loading and validation, understanding binding rules |
| 4.4 | Multiple References Documents | Enables audience separation, locale variants, domain overlays. Processor MUST merge by collecting all Bound References into one ordered list. Per-document order preserved (§2.4); cross-document load order is implementation-defined. Same-path bindings are additive -- never replace. | multiple documents, additive merge, load order, audience separation, locale variants, domain overlays | Implementing multi-document loading, understanding merge semantics |
| 4.5 | Scoping and Non-Inheritance | References do NOT inherit parent → child; each item must be targeted explicitly. Agents needing hierarchical context walk ancestors (§5.1). Non-relevant items: references remain structural metadata but SHOULD NOT be surfaced while non-relevant. | non-inheritance, explicit targeting, non-relevant items | Understanding why a child field does not automatically get its parent's references |
| 4.6 | Reuse via referenceDefs | Registry of reusable Reference objects; `references` may use `$ref` instead of inline duplication. Same pattern as JSON Schema `$defs` and Formspec modular `$ref` (core §6.6). | referenceDefs, $ref, DRY reuse, single source of truth | Avoiding duplication when the same reference is bound to multiple items |
| 4.6.1 | Declaring Shared References | Keys match `[a-zA-Z][a-zA-Z0-9_-]*`. Key becomes the reference's `id`. If entry also declares `id`, it MUST match the key -- processing-time validation (not JSON Schema expressible). | referenceDefs keys, id-key match constraint, processing-time validation | Defining reusable reference objects |
| 4.6.2 | Referencing Shared Definitions | `$ref` MUST be JSON Pointer (RFC 6901) to `"#/referenceDefs/{key}"`. Additional properties alongside `$ref` override base (shallow merge, top-level only). | $ref pointer, JSON Pointer, shallow merge, override properties | Using $ref with optional overrides |
| 4.6.3 | Resolution Rules | (1) Resolve at load time before processing; result as if inline. (2) Broken `$ref` ⇒ document error -- MUST report, MUST NOT ignore. (3) No recursive `$ref` in `referenceDefs`. (4) Unreferenced defs inert -- no warning. (5) Resolved `id` is the key -- overrides MUST NOT include `id`. (6) Merged object MUST satisfy §2.3. | load-time resolution, broken ref error, no recursion, inert entries, id from key, merged validation | Implementing $ref resolution logic |
| 4.7 | URI Stability and Versioning | Reference URIs are not versioned with the document -- they may point to living resources. Pinning: inline `content`, versioned URIs where supported, or `description` notes on expected version/date. | URI stability, living references, pinned content | Understanding URI lifecycle and versioning strategy |
| 4.8 | Modular Composition | When a Group uses `$ref` to import items (core §6.6), references from the source definition's References Documents do NOT transfer automatically. Host must bind via assembled paths (including `keyPrefix`). | modular composition, $ref import, keyPrefix, no automatic transfer | Understanding reference behavior with definition imports |

### Agent Integration Patterns (Lines 543-610)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 5 | Agent Integration Patterns | Advisory: how AI agents are expected to consume references; implementations may vary. | agent integration, advisory patterns | Implementing agent-side reference consumption |
| 5.1 | Context Assembly | Recommended steps: collect all loaded docs for Definition; filter by field path; add ancestor + form-level (`"#"`); filter audience agent/both; sort by priority; weight `rel` (`constrains` / `defines` before `see-also`); use inline `content`; resolve `uri` as appropriate. | context assembly, ancestor walk, priority sort, rel weighting | Implementing an agent's reference resolution pipeline |
| 5.2 | Vector Store Query Pattern | Agent builds queries from field `label` / `description` / `hint`, user question, and reference `tags` for scoping. Includes worked narrative example. | vector store query, label/description/hint context, tags for scoping | Implementing vector store integration for field-level assistance |
| 5.3 | Tool References | `type: "tool"` -- `uri` to tool definition; `content` MAY inline tool JSON schema (OpenAPI, MCP, etc.). | tool references, tool schema, OpenAPI, MCP tool definition | Binding function-invocation tools to specific fields |
| 5.4 | Grounding Documents | `type: "context"` with inline `content` for pre-written grounding beyond `description`/`hint` -- domain rules, disambiguation, edge cases. | context type, grounding text, inline content, disambiguation | Providing pre-written agent context |

### Relationship to Existing Properties (Lines 612-625)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 6 | Relationship to Existing Properties | Contrasts references with Item `label`, `hint`, `description` (concise inline human guidance). References carry deeper context (documents, KBs, regulatory citations, agent data). Agents SHOULD use label/hint/description as lightweight context before references. | label, hint, description, references complement | Deciding whether guidance belongs on Item vs in a Reference |

### Rendering Guidance (Lines 627-635)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 7 | Rendering Guidance | Advisory: doc/regulation/policy as help links (primary may get icon); examples inline/popover; agent types not in UI; `both` feeds both pipelines; relationship-aware UI (e.g. constrains → "Requirements", exemplifies → expandable panel, superseded-by de-emphasized). | rendering patterns, help panel, popover, relationship-aware display | Implementing UI for human-audience references |

### Conformance (Lines 637-657)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 8 | Conformance | Defines Core vs Extended processor requirements for References Document handling. | conformance levels | Understanding implementation requirements |
| 8.1 | Core Processor Requirements | MAY ignore References Documents entirely. MUST NOT use references to alter capture, validation, or processing model. References MUST NOT appear in Response data. | Core processor, ignore references, no Response data | Implementing a minimal processor that does not support references |
| 8.2 | Extended Processor Requirements | MUST load/validate per §9 schema; MUST resolve `$ref` at load time; MUST verify `targetDefinition.url`; SHOULD verify `compatibleVersions`; MUST validate referenceDefs id-key match (mismatch = document error); SHOULD warn on invalid `target` paths (non-rejection); SHOULD surface human refs in UI; SHOULD expose agent refs via API; SHOULD warn on unrecognized non-x `type`. | Extended processor, schema validation, url match, target path validation, warning-only | Implementing a full-featured processor with reference support |

### Schema (Lines 659-687)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 9 | Schema | Normative schema: `schemas/references.schema.json` -- standalone, not embedded in definition schema. `TargetDefinition` shared with Component schema via `$ref`. Generated schema-ref table lists pointers for BoundReference, Reference, ReferenceOrRef, ReferenceDefs; includes maintenance note that new Reference properties must be added to the `$ref` override branch or overrides are silently rejected. | references.schema.json, TargetDefinition, BoundReference, Reference, ReferenceOrRef, ReferenceDefs | Understanding JSON Schema structure, validating documents, schema evolution |

### Security Considerations (Lines 689-697)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 10 | Security Considerations | Seven concerns: URI resolution (allowlist / host delegation); inline content untrusted (sanitize HTML/markdown); no credentials in URIs; prompt injection on content/fetches; circular URI resolution guards; browser CORS/CSP -- prefer backend proxy; verify provenance of loaded References Documents. | URI allowlist, content sanitization, credential exposure, prompt injection, circular resolution, CORS, CSP, document provenance | Implementing secure reference handling, reviewing security posture |

## Cross-References

- **Formspec v1.0 Core Specification** -- Parent spec; this document is a companion and does not modify the core processing model.
- **Core §2.1.7 (Data Sources / `formspec-fn:`)** -- §3.4 follows the existing `formspec-fn:` convention for host-delegated resolution.
- **Core §4.3.3 (Bind paths / dot-notation)** -- §4.2: Bound Reference `target` uses the same path syntax as Bind paths.
- **Core §6.2 (Semver)** -- §4.3: `compatibleVersions` uses semver range expressions.
- **Core §6.6 (Modular composition / `$ref`)** -- §4.6 / §4.6.3 rationale: same reuse pattern as JSON Schema `$defs` and Formspec `$ref`. §4.8: imported items do not inherit source sidecar references.
- **`schemas/references.schema.json`** -- §9 normative schema; generated schema-ref table in §9 is sourced from this file.
- **`schemas/component.schema.json`** -- §9: `TargetDefinition` type shared via `$ref` to `https://formspec.org/schemas/component/1.0#/.../TargetDefinition`.
- **RFC 2119 / RFC 8174 (BCP 14)** -- Normative keyword conventions.
- **RFC 8259** -- JSON syntax and data types.
- **RFC 3986** -- URI syntax; §3.6 cites §3.5 for fragment semantics.
- **RFC 6901** -- JSON Pointer: JSON URI fragments (§3.6) and `$ref` targets (§4.6.2).
- **RFC 2045** -- MIME types (`mediaType`; noted in schema table).
- **BCP 47** -- Language tags for `language`.
- **IANA Link Relations / HTML `rel`** -- §2.5: relationship types modeled after link relations and HTML `rel`.

## Reference Type Quick Reference

| Type | Audience Pattern | Interface Pattern | URI Scheme |
|------|-----------------|-------------------|------------|
| `documentation` | human | Display (links, help panels) | https: |
| `example` | human | Display (inline, popover) | https: |
| `regulation` | both | Display + context | https: |
| `policy` | both | Display + context | https: |
| `glossary` | both | Display + context | https: |
| `schema` | both | Display + context | https: |
| `vector-store` | agent | Semantic similarity search | vectorstore: |
| `knowledge-base` | agent | Structured lookup | kb: |
| `retrieval` | agent | HTTP request/response | https: |
| `tool` | agent | Function invocation | https:, inline content |
| `api` | agent | REST/GraphQL endpoint | https: |
| `context` | agent | Direct inclusion (no external query) | (inline content) |

## Relationship Type Quick Reference

| `rel` Value | Meaning | Agent Weight |
|-------------|---------|--------------|
| `authorizes` | Permits the action described by target | Authoritative |
| `constrains` | Imposes limits on valid values | Authoritative |
| `defines` | Defines the term or concept | Authoritative |
| `exemplifies` | Provides an example or template | Supplementary |
| `supersedes` | Replaces a prior reference version | Current |
| `superseded-by` | Has been replaced by a newer version | Outdated |
| `derived-from` | Target value is derived from this source | Provenance |
| `see-also` | General association (implicit default) | Background |

## Critical Behavioral Rules

1. **References are pure metadata -- zero behavioral impact.** References MUST NOT affect data capture, validation, or the processing model. A conformant Core processor MAY ignore them entirely. References MUST NOT appear in Response data. This is the most important invariant of the entire spec.

2. **At least one of `uri` or `content` is required.** When both are present, `content` is a cached/fallback representation of the URI target -- not independent parallel content.

3. **No FEL in reference properties.** All reference property values are static. FEL MUST NOT appear in reference properties; use host resolution or `formspec-fn:` URIs for dynamism.

4. **References do NOT inherit from parent to child.** A reference on a group does not apply to children unless each path is explicitly targeted. Agents needing hierarchy walk ancestor paths (§5.1).

5. **Priority tiers override raw array position for ordering.** All `primary` references surface before `supplementary`, then `background`, regardless of array order. Within a tier, array order is the sequence. When `priority` is absent, processors MUST treat the reference as `"supplementary"` (processing-model default, not a schema `default`).

6. **Unrecognized `type` and non-x `rel` are warnings, not hard rejects.** Unrecognized non-x `type`: SHOULD warn, MAY skip reference, MUST NOT reject document. Unrecognized non-x `rel`: MUST treat as `"see-also"`, SHOULD warn -- forward compatibility.

7. **`targetDefinition.url` mismatch is a hard gate.** URLs must match the loaded Definition's `url` -- processor MUST NOT apply references (SHOULD emit error). `compatibleVersions` mismatch is softer: SHOULD warn, MAY still apply.

8. **`$ref` resolves at load time.** Broken `$ref` is a document error (MUST report, MUST NOT silently ignore). No recursive `$ref` in `referenceDefs`. Overrides: shallow merge, top-level only; overrides MUST NOT include `id` (identity is the `referenceDefs` key).

9. **Multiple References Documents merge additively.** Same-path bindings accumulate; they do not replace. Cross-document ordering after merge is implementation-defined.

10. **Agents should weight by `rel` in context assembly.** Prefer `constrains` / `defines` over `see-also` for authoritative vs background context (§5.1).

11. **`referenceDefs` id-key match is processing-time validation.** Extended processors MUST enforce id equals key when both present; mismatch is a document error (§8.2).

12. **URI and content security.** No blind fetches; allowlist or host delegation. No credentials in URIs. Sanitize rendered inline content; assume prompt-injection risk in content and fetched docs; guard circular URI resolution.

13. **Modular composition does not carry references.** `$ref`-imported items do not pick up the source definition's References Documents; host docs must target assembled paths (including `keyPrefix`).

14. **Schema evolution:** When adding properties to `Reference`, update the `ReferenceOrRef` / `$ref` branch in `references.schema.json` so new fields can be overridden -- otherwise overrides for that property are silently rejected (§9 maintenance note).
