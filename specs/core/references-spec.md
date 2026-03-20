---
title: Formspec References Specification
version: 1.0.0-draft.1
date: 2026-03-19
status: draft
---

# Formspec References Specification v1.0

**Version:** 1.0.0-draft.1  
**Date:** 2026-03-19  
**Editors:** Formspec Working Group  
**Companion to:** Formspec v1.0 — A JSON-Native Declarative Form Standard  

---

## Abstract

The Formspec References Specification is a companion to Formspec v1.0 that
defines a declarative mechanism for attaching external documentation, knowledge
sources, and AI agent data stores to any level of a Formspec definition — the
form itself, a group or section, or an individual field. A Reference is a JSON
object that points to contextual information (regulatory guidance, help
articles, vector store collections, tool schemas) and declares its intended
audience (human, agent, or both). References are pure metadata: they MUST NOT
affect data capture, validation, or the processing model.

## Status of This Document

This document is a **draft specification**. It is a companion to the Formspec
v1.0 core specification and does not modify or extend the core processing model.
Implementors are encouraged to experiment with this specification and provide
feedback, but MUST NOT treat it as stable for production use until a 1.0.0
release is published.

## Conventions and Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this
document are to be interpreted as described in [BCP 14][rfc2119] [RFC 2119]
[RFC 8174] when, and only when, they appear in ALL CAPITALS, as shown here.

JSON syntax and data types are as defined in [RFC 8259]. URI syntax is as
defined in [RFC 3986].

Terms defined in the Formspec v1.0 core specification — including *Definition*,
*Item*, *Bind*, *FEL*, and *conformant processor* — retain their
core-specification meanings throughout this document unless explicitly redefined.

[rfc2119]: https://www.rfc-editor.org/rfc/rfc2119

---

## Bottom Line Up Front

<!-- bluf:start references-spec -->
<!-- bluf:end -->

## 1. Introduction

Forms exist in context. A tax form references regulatory guidance. A clinical intake form references diagnostic criteria. A grant application references federal reporting standards. Today, that context lives outside the form — in separate documents, institutional knowledge, or the heads of trained staff.

The References specification adds a declarative mechanism for attaching reference documentation, knowledge sources, and assistive data stores to any level of a Formspec definition: the form itself, a group/section, or an individual field. References serve two audiences:

1. **Human users** — contextual help, regulatory guidance, policy documents, instructional material.
2. **AI companion agents** — retrieval-augmented generation (RAG) endpoints, vector store collections, knowledge base articles, tool schemas, and structured context that agents can query at runtime to assist users.

References are **metadata** — they MUST NOT affect data capture, validation, or the processing model. A conformant processor that does not understand references MUST ignore them without error. This makes references a safe, additive layer that enhances the form experience without altering its behavior.

### 1.1 Design Principles

1. **Additive, not invasive** — References layer onto existing definitions. Removing all references produces an identical form from a data/behavior perspective.
2. **Audience-aware** — Each reference declares its intended audience (`human`, `agent`, or `both`), enabling renderers and agents to filter appropriately.
3. **Transport-agnostic** — References can point to static documents (URLs), structured data endpoints (APIs), or abstract resource identifiers (vector store collection IDs). The spec defines the pointer; the consumer resolves it.
4. **Scoped** — References attach at the level they apply to. A form-level reference provides global context; a field-level reference provides targeted guidance for that specific input.

## 2. Reference Object

A Reference is a JSON object that points to an external (or inline) source of contextual information.

### 2.1 Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | RECOMMENDED | Stable identifier for this reference, unique within the definition. Enables deduplication and cross-referencing. Pattern: `[a-zA-Z][a-zA-Z0-9_-]*` |
| `type` | string | REQUIRED | The kind of reference. See §2.2. |
| `audience` | string | REQUIRED | Who this reference is for: `"human"`, `"agent"`, or `"both"`. |
| `title` | string | RECOMMENDED | Human-readable title or short description of the reference. |
| `uri` | string | Conditional | URI pointing to the reference content. REQUIRED unless `content` is provided. May be an HTTP(S) URL, a URN, or a scheme-prefixed identifier (see §3). |
| `content` | string or object | Conditional | Inline reference content. REQUIRED unless `uri` is provided. String for plain text or markdown. Object for structured data — no structural constraints are imposed by the base Reference schema; specific `type` values MAY define expected `content` shapes (e.g., `type: "tool"` expects a tool-schema-shaped object per §5.3). Authors SHOULD keep inline content concise (under 50 KB); for larger documents, prefer `uri`. |
| `mediaType` | string | OPTIONAL | MIME type of the referenced content (e.g., `"text/html"`, `"application/pdf"`, `"text/markdown"`, `"application/json"`). Helps consumers decide how to fetch and render. |
| `language` | string | OPTIONAL | BCP 47 language tag (e.g., `"en"`, `"es"`, `"fr-CA"`). Enables locale-aware reference selection. |
| `description` | string | OPTIONAL | Longer explanation of what this reference contains and when to consult it. |
| `tags` | array of string | OPTIONAL | Categorization tags for filtering and discovery (e.g., `["regulation", "2-cfr-200"]`, `["rag", "embeddings"]`). |
| `priority` | string | OPTIONAL | `"primary"`, `"supplementary"`, or `"background"`. Indicates how prominently the reference should be surfaced. When absent, processors MUST treat the reference as `"supplementary"` (this is a processing-model default, not a schema `default`). |
| `rel` | string | OPTIONAL | Relationship of this reference to the attachment point. See §2.5 for defined values. When absent, the relationship is `"see-also"`. |
| `selector` | string | OPTIONAL | Advisory hint identifying the relevant portion of the referenced resource when URI fragments are insufficient. See §3.6. |
| `extensions` | object | OPTIONAL | Extension data. All keys MUST be prefixed with `x-`. |

### 2.2 Reference Types

Types are grouped by intended interface pattern — the distinction is about **how the consumer interacts with the reference**, not the underlying technology.

**Human-oriented types** — typically consumed by renderers for display:

| Type | Typical Audience | Description |
|------|------------------|-------------|
| `"documentation"` | human | Help articles, user guides, instructional content. |
| `"example"` | human | Worked examples, sample responses, templates. |

**Shared types** — typically useful to both humans and agents:

| Type | Typical Audience | Description |
|------|------------------|-------------|
| `"regulation"` | both | Laws, regulations, compliance standards (e.g., 2 CFR 200, HIPAA). |
| `"policy"` | both | Organizational policies, SOPs, internal guidelines. |
| `"glossary"` | both | Term definitions, abbreviations, domain vocabulary. |
| `"schema"` | both | JSON Schema, data dictionary, or structural specification for the data being collected. |

> **Note:** The audience column indicates the typical usage. The actual `audience` property on each reference is set independently — a `"documentation"` reference could have `audience: "agent"` if it contains agent-consumable guidance.

**Agent-oriented types** — consumed programmatically by AI companion agents. The type indicates the **query interface pattern**:

| Type | Interface Pattern | Description |
|------|-------------------|-------------|
| `"vector-store"` | Semantic similarity search | The agent sends a natural-language query and receives ranked document chunks. Use `vectorstore:` URIs (§3.1). |
| `"knowledge-base"` | Structured lookup | The agent queries by key, category, or structured filter. Returns articles, FAQ entries, or structured records. Use `kb:` URIs (§3.2). |
| `"retrieval"` | Request/response API | The agent sends a query to an HTTP endpoint and receives results. Catch-all for RAG systems that don't fit the above patterns. Use HTTPS URIs with `extensions` for query details (§3.3). |
| `"tool"` | Function invocation | The agent invokes a tool/function to compute or look up information. `content` SHOULD contain the tool schema (§5.3). |
| `"api"` | REST/GraphQL endpoint | The agent calls a structured API for reference data (e.g., code lookups, entity resolution). |
| `"context"` | Direct inclusion | Static text or structured data included directly in the agent's context window. No external query needed. |

Custom types MUST be prefixed with `x-` (e.g., `"x-org-training-video"`).

### 2.3 Validation Rules

- At least one of `uri` or `content` MUST be present.
- If both `uri` and `content` are present, `content` is treated as a cached/fallback representation of the URI target.
- `id`, when present, MUST be unique among all references that share the same attachment point (i.e., unique within the same `references` array). IDs SHOULD be unique across the entire definition to enable unambiguous cross-referencing, but this is not a hard requirement.
- `audience` MUST be one of: `"human"`, `"agent"`, `"both"`.
- `type` MUST be a recognized type from §2.2 or an `x-`-prefixed custom type. A processor encountering an unrecognized, non-`x-`-prefixed type MUST skip the reference and SHOULD emit a warning, but MUST NOT reject the definition.
- `priority` when present MUST be one of: `"primary"`, `"supplementary"`, `"background"`.
- An empty `references` array (`"references": []`) is valid and semantically equivalent to omitting the property.
- Multiple references MAY share the same `uri` value (e.g., the same document serving as both a human `"regulation"` and an agent `"context"` reference with different `audience` values).
- Reference property values are **static**. FEL expressions MUST NOT appear in any reference property (`uri`, `content`, `title`, etc.). Dynamic reference resolution, if needed, MUST be handled by the host environment or via `formspec-fn:` URIs (§3.4).

### 2.4 Array Ordering

References within a `references` array are **ordered**. The first reference in the array is the most relevant to the attachment point; subsequent references are progressively less central. Processors that present references to humans or agents SHOULD preserve this authoring order.

When `priority` is present, it takes precedence over positional order for grouping purposes — all `"primary"` references are surfaced before `"supplementary"`, regardless of array position. Within a priority tier, array order determines presentation sequence.

> **Rationale:** Leaving order undefined would force divergent implementations — some treating order as significant, others not — with no way to reconcile them later. Defining it now costs nothing and prevents a class of interoperability bugs.

### 2.5 Reference Relationships

A Reference MAY declare a `rel` property that describes its relationship to the attachment point (the field, group, or form it is attached to). This enables consumers to understand not just *what* a reference points to, but *how* it relates to the thing being filled out.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `rel` | string | OPTIONAL | Relationship type. See table below. |

**Defined relationship types:**

| `rel` value | Meaning |
|-------------|---------|
| `"authorizes"` | The referenced document authorizes or permits the action described by the attachment point (e.g., a regulation authorizing a particular cost category). |
| `"constrains"` | The referenced document imposes constraints or limits on valid values (e.g., a rate ceiling, an enumeration of permitted codes). |
| `"defines"` | The referenced document defines the term or concept represented by the attachment point (e.g., a glossary entry). |
| `"exemplifies"` | The referenced document provides an example or template for the attachment point. |
| `"supersedes"` | The referenced document replaces a prior version. Use with a second reference (with `rel: "superseded-by"` or without `rel`) pointing to the prior version. |
| `"derived-from"` | The attachment point's value or structure is derived from the referenced source (e.g., a pre-populated field drawn from an external record). |
| `"see-also"` | General association — the reference provides related but non-essential context. This is the implicit relationship when `rel` is absent. |

Custom relationship types MUST be prefixed with `x-` (e.g., `"x-org-audit-trail"`).

When `rel` is absent, processors MUST treat the relationship as `"see-also"`.

> **Design note:** Relationship types are modeled after [IANA Link Relations](https://www.iana.org/assignments/link-relations/) and HTML's `rel` attribute. The set is intentionally small and focused on the reference–attachment-point relationship, not reference-to-reference relationships. References do not link to each other; if two references are related, that relationship is expressed in the documents they point to, not in the Formspec definition.

**Example:**

```json
{
  "key": "indirectCostRate",
  "type": "field",
  "label": "Indirect Cost Rate",
  "dataType": "decimal",
  "references": [
    {
      "type": "regulation",
      "audience": "both",
      "rel": "constrains",
      "title": "2 CFR §200.414 — Indirect (F&A) Costs",
      "uri": "https://www.ecfr.gov/current/title-2/section-200.414"
    },
    {
      "type": "context",
      "audience": "agent",
      "rel": "defines",
      "title": "Indirect cost rate guidance",
      "content": "The indirect cost rate is a percentage negotiated between the grantee organization and its cognizant federal agency..."
    }
  ]
}
```

## 3. URI Schemes for Agent Data Stores

References use URIs to point to external resources. Beyond standard `https://` URLs, this spec defines well-known URI scheme conventions for common AI infrastructure.

> **Note:** The `vectorstore:` and `kb:` schemes below are Formspec-defined conventions, not IANA-registered URI schemes. For environments that require standards-compliant URIs, use the `urn:x-{org}:` pattern (§3.5) or `formspec-fn:` host delegation (§3.4) instead.

### 3.1 Vector Store References

```
vectorstore:{provider}/{collection-id}
```

Examples:
- `vectorstore:pinecone/grant-guidance-v2`
- `vectorstore:chromadb/policy-docs`
- `vectorstore:weaviate/tax-regulations`

The vector store URI identifies the collection. Query parameters and authentication are runtime concerns handled by the consuming agent or host environment.

### 3.2 Knowledge Base References

```
kb:{provider}/{base-id}
```

Examples:
- `kb:aws-bedrock/ABCDEF1234`
- `kb:confluence/space-key/page-id`

### 3.3 Retrieval Endpoints

Standard HTTPS URIs are used for retrieval APIs. The `type: "retrieval"` plus optional `extensions` provide the agent with enough context to query them:

```json
{
  "type": "retrieval",
  "audience": "agent",
  "uri": "https://rag.example.gov/query",
  "title": "Federal grant guidance RAG endpoint",
  "extensions": {
    "x-retrieval": {
      "method": "POST",
      "topK": 5,
      "queryField": "question",
      "authScheme": "bearer"
    }
  }
}
```

### 3.4 Host-Provided Data Sources

Following the existing `formspec-fn:` convention from Data Sources (core §2.1.7):

```
formspec-fn:{function-name}
```

This delegates resolution to the host environment, which maps the function name to an actual data source, vector store, or API call. This is the recommended approach when the definition should remain environment-independent.

Example:
```json
{
  "type": "vector-store",
  "audience": "agent",
  "uri": "formspec-fn:searchGuidance",
  "title": "Search grant guidance knowledge base"
}
```

### 3.5 Opaque Identifiers

When a URI scheme doesn't fit, use a URN:

```
urn:x-{org}:{type}:{id}
```

Example: `urn:x-acme:vectordb:collection-42`

### 3.6 Fragment Targeting

Reference URIs MAY include a **fragment** (the portion after `#` per [RFC 3986 §3.5](https://www.rfc-editor.org/rfc/rfc3986#section-3.5)) to identify a specific part of the referenced resource. Fragment semantics are defined by the media type of the target resource:

- **HTML**: Fragment identifies an element by `id` (e.g., `https://ecfr.gov/title-2/section-200.414#p-200.414(f)`).
- **PDF**: Fragment follows the open parameters convention (e.g., `guide.pdf#page=12`).
- **JSON**: Fragment uses JSON Pointer ([RFC 6901](https://www.rfc-editor.org/rfc/rfc6901)) (e.g., `schema.json#/definitions/CostCategory`).
- **Plain text / Markdown**: No standard fragment semantics. Use `selector` (below) instead.

For URI schemes that do not support fragments natively (e.g., `vectorstore:`, `kb:`), or when the target media type lacks fragment semantics, a Reference MAY include a `selector` property:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `selector` | string | OPTIONAL | A human- and agent-readable hint identifying the relevant portion of the referenced resource. Not a formal addressing mechanism — it is advisory context that helps consumers locate the relevant content. |

`selector` is intentionally unstructured. Examples:

- `"Section 200.414(f) — De minimis rate"` — points to a regulation subsection
- `"Chapter 3: Budget Justification"` — points to a document chapter
- `"rows where category = 'indirect'"` — hints at relevant data within a dataset

When both a URI fragment and `selector` are present, the URI fragment is the machine-actionable locator and `selector` provides supplementary human-readable context.

> **Rationale:** Without fragment or selector support, authors are forced to duplicate relevant excerpts into `content`, creating a second copy that drifts from the source. Fragments are already part of the URI spec — this section simply blesses their use and fills the gap for schemes that lack them.

**Example:**

```json
{
  "type": "regulation",
  "audience": "both",
  "rel": "constrains",
  "title": "De minimis indirect cost rate",
  "uri": "https://www.ecfr.gov/current/title-2/section-200.414#p-200.414(f)",
  "selector": "Section 200.414(f) — De minimis rate of 10%"
}
```

## 4. Attachment Points

References can be attached at three levels. Each level uses the same `references` property containing an array of Reference objects.

### 4.1 Form-Level References

Declared as a top-level `references` property on the Definition object. These provide context for the entire form.

```json
{
  "$formspec": "1.0",
  "url": "https://example.gov/forms/sf-425",
  "version": "2025.1.0",
  "status": "active",
  "title": "Federal Financial Report (SF-425)",
  "references": [
    {
      "id": "cfr-guidance",
      "type": "regulation",
      "audience": "both",
      "title": "2 CFR Part 200 — Uniform Administrative Requirements",
      "uri": "https://www.ecfr.gov/current/title-2/subtitle-A/chapter-II/part-200",
      "priority": "primary"
    },
    {
      "id": "completion-guide",
      "type": "documentation",
      "audience": "human",
      "title": "SF-425 Line-by-Line Completion Guide",
      "uri": "https://example.gov/help/sf425-guide.pdf",
      "mediaType": "application/pdf"
    },
    {
      "id": "grant-kb",
      "type": "vector-store",
      "audience": "agent",
      "title": "Federal grants guidance knowledge base",
      "uri": "vectorstore:pinecone/federal-grants-v3",
      "description": "Embeddings of all OMB circulars, 2 CFR 200 subparts, and agency-specific grant guidance. Query with field-level questions for contextual help.",
      "tags": ["rag", "grants", "2-cfr-200"]
    }
  ],
  "items": []
}
```

### 4.2 Item-Level References

Declared as a `references` property on any Item (field, group, or display). These provide targeted context for that specific part of the form.

```json
{
  "key": "indirectCostRate",
  "type": "field",
  "label": "Indirect Cost Rate",
  "dataType": "decimal",
  "description": "Your organization's negotiated indirect cost rate.",
  "references": [
    {
      "type": "regulation",
      "audience": "both",
      "title": "2 CFR §200.414 — Indirect (F&A) Costs",
      "uri": "https://www.ecfr.gov/current/title-2/section-200.414"
    },
    {
      "type": "context",
      "audience": "agent",
      "title": "Indirect cost rate guidance",
      "content": "The indirect cost rate is a percentage negotiated between the grantee organization and its cognizant federal agency. It represents overhead costs (facilities, administration) that cannot be directly attributed to a specific grant. Common values range from 10% to 65%. Organizations without a negotiated rate may use the de minimis rate of 10% per 2 CFR §200.414(f). The rate entered here should match the organization's current Negotiated Indirect Cost Rate Agreement (NICRA).",
      "priority": "primary"
    },
    {
      "type": "example",
      "audience": "human",
      "title": "How to find your indirect cost rate",
      "uri": "https://example.gov/help/indirect-cost-rate-examples"
    }
  ]
}
```

### 4.3 Inheritance and Scoping

References do NOT inherit. A field does not automatically receive its parent group's references. This is intentional — consumers that need broader context should walk up the item tree and collect references from ancestor groups and the form level.

**Rationale**: Automatic inheritance would create ambiguity about which references apply to a specific field vs. its container. Explicit attachment keeps the model simple and predictable. While references do not inherit in the data model, consumers (particularly agents) may choose to collect references from ancestor scopes for broader context — see the recommended context assembly pattern in §5.1.

**Non-relevant items**: References on non-relevant items persist in the definition (they are structural metadata, not runtime state). However, agents and renderers SHOULD NOT surface references for items that are currently non-relevant, since the user cannot interact with those items.

### 4.4 Modular Composition

When a Group uses `$ref` to include items from another definition (core §6.6), references on the imported items are carried into the assembled definition. The `keyPrefix` mechanism applies only to item keys and bind paths — reference `id` values are NOT prefixed. If this creates `id` collisions, the assembler SHOULD emit a warning. Imported references retain their original URIs and content; the assembler MUST NOT rewrite them.

Form-level references from the referenced definition are NOT imported — only item-level references travel with their items. If the host definition needs the referenced definition's form-level context, it must redeclare those references explicitly.

### 4.5 URI Stability and Versioning

Reference URIs are **not versioned** alongside the definition. A definition at version `2025.1.0` and version `2025.2.0` may contain the same reference URI pointing to content that has changed independently. This is by design — references point to living external resources.

Authors who need pinned references SHOULD:
- Use `content` for inline snapshots that are immutable with the definition version.
- Include version information in URIs where the external system supports it (e.g., `https://www.ecfr.gov/current/title-2/section-200.414?version=2025-01-01`).
- Use `description` to note the expected version or date of the referenced content.

### 4.6 Reuse via `referenceDefs`

Definitions MAY declare a top-level `referenceDefs` object that serves as a registry of reusable Reference objects. Items then refer to these shared definitions instead of duplicating them inline, eliminating copy-paste sprawl and the drift that comes with it.

#### 4.6.1 Declaring Shared References

`referenceDefs` is an object whose keys are reference identifiers (matching `[a-zA-Z][a-zA-Z0-9_-]*`) and whose values are Reference objects. The key becomes the reference's `id` — if the Reference object also declares an `id`, it MUST match the key.

```json
{
  "$formspec": "1.0",
  "url": "https://example.gov/forms/sf-425",
  "version": "2025.1.0",
  "status": "active",
  "title": "Federal Financial Report (SF-425)",
  "referenceDefs": {
    "cfr-200-414": {
      "type": "regulation",
      "audience": "both",
      "rel": "constrains",
      "title": "2 CFR §200.414 — Indirect (F&A) Costs",
      "uri": "https://www.ecfr.gov/current/title-2/section-200.414",
      "priority": "primary"
    },
    "grant-kb": {
      "type": "vector-store",
      "audience": "agent",
      "title": "Federal grants guidance knowledge base",
      "uri": "vectorstore:pinecone/federal-grants-v3",
      "tags": ["rag", "grants", "2-cfr-200"]
    }
  },
  "items": []
}
```

#### 4.6.2 Referencing Shared Definitions

Within any `references` array, an entry MAY use `{ "$ref": "#/referenceDefs/{key}" }` instead of a full Reference object. The `$ref` value MUST be a JSON Pointer ([RFC 6901]) relative to the definition root, pointing to a key in `referenceDefs`.

```json
{
  "key": "indirectCostRate",
  "type": "field",
  "label": "Indirect Cost Rate",
  "dataType": "decimal",
  "references": [
    { "$ref": "#/referenceDefs/cfr-200-414" },
    { "$ref": "#/referenceDefs/grant-kb" },
    {
      "type": "context",
      "audience": "agent",
      "title": "Indirect cost rate field guidance",
      "content": "The indirect cost rate is a percentage negotiated between..."
    }
  ]
}
```

A `$ref` entry MAY include additional properties alongside `$ref`. These properties **override** the corresponding properties from the referenced definition (shallow merge — top-level keys only). This allows site-specific customization without duplicating the entire reference:

```json
{
  "$ref": "#/referenceDefs/cfr-200-414",
  "selector": "Section 200.414(f) — De minimis rate of 10%",
  "priority": "primary"
}
```

#### 4.6.3 Resolution Rules

1. `$ref` resolution is performed at **load time**, before any processing. After resolution, the definition behaves as if all references were declared inline.
2. A `$ref` pointing to a nonexistent key in `referenceDefs` is a definition error. Processors MUST report it and MUST NOT silently ignore the broken reference.
3. `$ref` values MUST NOT be recursive — a `referenceDefs` entry MUST NOT itself contain a `$ref`.
4. `referenceDefs` entries that are never referenced are inert — they impose no processing cost and MUST NOT cause warnings.
5. After resolution, the `id` of the resolved reference is the key from `referenceDefs` (unless overridden by the referencing entry).

> **Rationale:** This is the same pattern used by JSON Schema's `$defs` and Formspec's own `$ref` for modular composition (core §6.6). Without a reuse mechanism, definitions with many fields citing the same regulation will contain dozens of identical reference objects — a maintenance hazard where updating one copy but not the others creates silent inconsistency. `referenceDefs` makes the single-source-of-truth pattern expressible.

## 5. Agent Integration Patterns

This section describes how AI companion agents are expected to consume references. These patterns are advisory — implementations may vary.

### 5.1 Context Assembly

When an agent assists a user with a specific field, the recommended approach is to:

1. Collect `references` from the target field.
2. Collect `references` from ancestor groups (walking up the item tree).
3. Collect `references` from the form level.
4. Filter by `audience` (`"agent"` or `"both"`).
5. Sort by `priority` (`"primary"` first, then `"supplementary"`, then `"background"`).
6. Use inline `content` references directly as context.
7. Resolve `uri` references as appropriate (fetch documents, query vector stores, call APIs).

### 5.2 Vector Store Query Pattern

For `type: "vector-store"` references, the agent constructs a query using:

- The field's `label`, `description`, and `hint` as natural-language query context.
- The user's current question or input as the primary query.
- The `tags` on the reference for namespace/filter scoping.

```
User asks: "What rate should I enter for indirect costs?"

Agent context assembly:
  1. Field: indirectCostRate (label: "Indirect Cost Rate")
  2. Inline context reference → immediate grounding
  3. Vector store reference → query "indirect cost rate guidance for federal grants"
  4. Regulation reference → deep-link for citation
```

### 5.3 Tool References

`type: "tool"` references point to tool schemas (e.g., OpenAPI operations, MCP tool definitions) that an agent can invoke to help the user. The `uri` points to the tool definition; `content` may contain the tool's JSON schema inline.

```json
{
  "type": "tool",
  "audience": "agent",
  "title": "NICRA Lookup",
  "uri": "https://api.example.gov/tools/nicra-lookup",
  "content": {
    "name": "lookupNICRA",
    "description": "Look up an organization's Negotiated Indirect Cost Rate Agreement by UEI or EIN.",
    "parameters": {
      "type": "object",
      "properties": {
        "uei": { "type": "string", "description": "Unique Entity Identifier" },
        "ein": { "type": "string", "description": "Employer Identification Number" }
      }
    }
  },
  "mediaType": "application/json"
}
```

### 5.4 Grounding Documents

`type: "context"` references with inline `content` provide pre-written grounding text optimized for agent consumption. These are particularly useful for:

- Field-specific instructions that go beyond the `description`/`hint` (which are optimized for human display).
- Domain rules and edge cases an agent should know about.
- Disambiguation guidance (e.g., "This field asks for the *federal* fiscal year, not the organization's fiscal year").

## 6. Relationship to Existing Properties

References complement but do not replace existing Item properties:

| Property | Purpose | Audience | Display |
|----------|---------|----------|---------|
| `label` | Primary display name | Human | Always visible |
| `hint` | Short instructional text | Human | Inline with input |
| `description` | Help text | Human | On-demand (tooltip/help) |
| **`references`** | **External context, knowledge sources, agent data** | **Human + Agent** | **Implementation-defined** |

- `description` and `hint` remain the right place for concise, inline human guidance.
- `references` are for deeper context: full documents, knowledge bases, regulatory citations, and agent-consumable data sources.
- An agent SHOULD use `label`, `hint`, and `description` as lightweight context before consulting `references` for deeper information.

## 7. Rendering Guidance

References are metadata and renderers are free to present them however they choose (or not at all). Recommended patterns:

- **Human `documentation`/`regulation`/`policy` references**: render as links in a help panel, sidebar, or expandable section. `priority: "primary"` references may warrant a visible help icon on the field.
- **Human `example` references**: render inline or in a popover when the user focuses the field.
- **Agent references**: not rendered in the UI. Consumed programmatically by companion agents.
- **`audience: "both"` references**: available to both rendering and agent pipelines. A `regulation` reference might render as a citation link for humans while also being queryable context for an agent.

## 8. Conformance

This specification defines conformance requirements for `references` handling. These requirements are modeled after the round-trip preservation rule in core §8.4 (rule 5): processors MUST round-trip data they do not consume. Core §1.4 will be updated to reference this companion spec.

### 8.1 Core Processor Requirements

- A conformant Core processor MUST accept definitions containing `references` without error.
- A conformant Core processor MUST preserve `references` on round-trip (serialize/deserialize). This follows the same principle as core §8.4 rule 5 (extension round-trip preservation).
- A conformant Core processor MUST NOT use `references` to alter data capture, validation, or the processing model.
- `references` MUST NOT appear in Response data.

### 8.2 Extended Processor Requirements

- An Extended processor that supports references SHOULD surface human-audience references in the UI.
- An Extended processor that supports agent integration SHOULD make agent-audience references available to companion agents via a documented API.
- An Extended processor SHOULD validate reference objects against the schema in this specification.
- An Extended processor that encounters a reference with an unrecognized `type` (non-`x-`-prefixed) SHOULD emit a warning and MUST ignore the reference without rejecting the definition.

## 9. Schema

The normative JSON Schema for references will be added to `schemas/definition.schema.json` as a `Reference` `$def`, with `references` arrays on both the top-level Definition and the Item base type. The schema for the `type` property requires a union of the recognized enum values and the `^x-.+` pattern for custom types (e.g., `oneOf: [{enum: [...]}, {pattern: "^x-.+"}]`).

<!-- schema-ref:start definition.schema.json#/$defs/Reference -->
<!-- schema-ref:end -->

## 10. Security Considerations

- **URI resolution**: Agents and renderers MUST NOT blindly fetch arbitrary URIs from references. Implementations SHOULD maintain an allowlist of trusted domains or delegate URI resolution to the host environment.
- **Inline content**: `content` values (especially objects) MUST be treated as untrusted data. Renderers MUST sanitize HTML/markdown content before display. Agents SHOULD treat inline content as context, not as executable instructions.
- **Credential exposure**: Reference URIs MUST NOT contain credentials (API keys, tokens). Authentication for protected resources MUST be handled by the host environment or agent runtime, not embedded in the definition.
- **Prompt injection**: Agent implementations MUST be aware that `content` fields and fetched reference documents could contain adversarial text. Standard prompt injection mitigations apply.
- **Circular resolution**: A reference URI could point back to the definition itself or to another reference that creates a loop. Implementations that recursively resolve reference URIs MUST guard against circular resolution (e.g., via a visited-set or depth limit).
- **Browser security**: Web implementations that fetch reference URIs for display (human-audience references) are subject to CORS and Content Security Policy restrictions. Implementations SHOULD proxy external reference content through a trusted backend rather than fetching directly from the browser.
