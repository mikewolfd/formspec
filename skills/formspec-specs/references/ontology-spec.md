# Ontology Specification Reference Map

> specs/ontology/ontology-spec.md -- 782 lines, ~38K -- Companion: Semantic Concept Bindings, Vocabulary Alignment, JSON-LD

## Overview

The Ontology Specification defines a standalone sidecar document (Ontology Document) for binding form fields to concepts in external ontologies and standards (schema.org, FHIR, ICD-10, Dublin Core, etc.). An Ontology Document does not define new concepts -- it references existing ones by IRI, connecting Formspec's data collection model to domain ontologies, controlled vocabularies, and data standards. The spec covers concept bindings (field-to-concept mapping), vocabulary bindings (option-set-to-terminology mapping), cross-system alignments (SKOS-inspired typed relationships), and JSON-LD context generation for linked data export. Ontology Documents are pure metadata: they MUST NOT affect data capture, validation, or the processing model.

## Section Map

### Front Matter and Scope (Lines 1-177)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| Abstract | Abstract | Defines the Ontology Document as a sidecar for binding fields to external concepts by IRI. Multiple documents MAY target the same Definition for different domains/standards. | Ontology Document, sidecar, IRI-based binding | Understanding what the spec defines |
| Status | Status of This Document | Draft companion specification. Does not modify the core processing model. | Draft, companion | Checking spec maturity |
| Conventions | Conventions and Terminology | RFC 2119/8174 keywords plus core spec terms. | MUST/SHOULD/MAY | Interpreting normative language |
| BLUF | Bottom Line Up Front | Summary: binding document, not an ontology; concept/vocabulary/alignment/JSON-LD; sidecar; pure metadata. | Quick orientation | Quick orientation |
| S1 | 1. Purpose and Scope | Five things defined (concept bindings, vocabulary bindings, alignments, JSON-LD context, conformance). Clarifies: this is NOT an ontology, ontology language, reasoning engine, or terminology service -- it is a binding document. | Binding vs defining, five deliverables | Understanding scope boundaries |
| S1.0.1 | 1.0.1 Relationship to Registry Concept and Vocabulary Entries | Registry entries (`category: "concept"` and `category: "vocabulary"`) provide shared org-level metadata. Ontology Document provides per-form bindings, alignments, JSON-LD context, bespoke vocabulary bindings. When both apply, Ontology Document takes precedence. | Registry vs Ontology Document, precedence | Understanding the layered concept resolution model |
| S1.1 | 1.1 Design Principles | Six principles: binding not definition, sidecar not embedded, different authority, different cadence, pure metadata, graceful degradation. | Design philosophy | Understanding architectural decisions |
| S1.2 | 1.2 Relationship to OWL and the Semantic Web | OWL-integrative, not OWL-compatible. Uses IRIs and SKOS but not OWL formal semantics, open-world reasoning, or class hierarchies. | OWL integration | Understanding semantic web relationship |

### Document Format (Lines 178-228)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S2 | 2. Ontology Document Format | Top-level JSON structure. 15 properties: `$formspecOntology` (required, const "1.0"), `version` (required), `targetDefinition` (required), plus optional `$schema`, `url`, `name`, `title`, `description`, `publisher`, `published`, `defaultSystem`, `concepts`, `vocabularies`, `alignments`, `context`, `extensions`. | Top-level structure | Creating or validating Ontology Documents |
| S2.1 | 2.1 Target Definition | `url` (required, URI) + `compatibleVersions` (optional, semver range). | targetDefinition binding | Binding ontology to a Definition |
| S2.2 | 2.2 Publisher Object | `name` (required), `url` (required), `contact` (optional). | Publisher metadata | Authoring publisher information |
| S2.3 | 2.3 Validation Rules | Paths use Bind.path syntax (core S4.3.3). Missing items -> warning, not error. Values are static (no FEL). `x-` extension properties preserved. Empty objects/arrays valid. | Validation rules | Understanding structural constraints |

### Concept Bindings (Lines 229-344)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S3 | 3. Concept Bindings | `concepts` is a map of item paths to Concept Binding objects. Five properties: `concept` (IRI, required), `system` (URI, recommended -- falls back to `defaultSystem`), `display` (recommended), `code` (optional), `equivalents` (optional). | Concept binding, IRI, system, code | Associating fields with external concepts |
| S3.1 | 3.1 Equivalents | Array declaring cross-system equivalences. Each element: `system` (required), `code` (required), `display` (optional), `type` (optional, defaults to `"exact"`). | Cross-system equivalences | Declaring concept equivalences across ontologies |
| S3.2 | 3.2 Relationship Types (SKOS-Inspired) | Five relationship types: `exact` (default), `close`, `broader`, `narrower`, `related`. Custom types `x-` prefixed. | SKOS semantics, relationship types | Choosing the right relationship type |
| S3.3 | 3.3 Example | Full JSON example showing concept bindings with equivalents for MRN, DOB, SSN fields. | Example | Seeing concept bindings in practice |
| S3.4 | 3.4 Resolution Cascade | Three-level precedence: (1) Ontology Document binding (highest), (2) registry concept entry (matching `semanticType`), (3) `semanticType` literal (lowest). All three may coexist -- no warning needed. | Concept resolution cascade, precedence | Understanding which concept source wins |

### Vocabulary Bindings (Lines 345-417)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S4 | 4. Vocabulary Bindings | `vocabularies` maps option set names to Vocabulary Binding objects. Five properties: `system` (URI, required), `version` (recommended), `display` (recommended), `filter` (optional), `valueMap` (optional -- translates option values to terminology codes). | Vocabulary binding, terminology system, valueMap | Associating option sets with external terminologies |
| S4.1 | 4.1 Filter Object | Subset constraints: `ancestor` (root code), `maxDepth`, `include` (explicit codes), `exclude`. | Vocabulary filtering | Constraining a large vocabulary to a relevant subset |
| S4.2 | 4.2 Example | ICD-10 diagnosis codes with filter + FHIR gender options with valueMap. | Example | Seeing vocabulary bindings in practice |
| S4.3 | 4.3 Interaction with Option Sets | Vocabulary bindings do NOT replace Definition option values. They provide: terminology version tracking, cross-vocabulary alignment, hierarchical context, code normalization. | Additive metadata, not replacement | Understanding how vocab bindings layer on top of options |
| S4.4 | 4.4 Dynamic Option Sources | `choicesFrom` dynamic sources are outside scope of static vocabulary bindings. Dynamic resolution handled by host environment. | Dynamic sources excluded | Understanding scope limitations |

### Alignments and JSON-LD (Lines 419-527)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S5 | 5. Alignments | `alignments` array declares typed relationships between Definition fields and external system concepts. Properties: `field` (path, required), `target` (object with `system`+`code`, required), `type` (relationship type, required), `bidirectional` (optional, default false), `notes` (optional). | Cross-system alignment, field-to-concept mapping | Declaring data alignment across systems for interoperability |
| S5.1 | 5.1 Example | FHIR R4 and schema.org alignments for patient intake fields. | Example | Seeing alignments in practice |
| S5.2 | 5.2 Alignment vs. Concept Equivalents | Concept equivalents = "concept X is also known as Y." Alignments = "field X maps to system Y's concept Z." Distinct use cases: concept-level vs field-level, notes/directionality, structural alignment without concept binding. Both valid; equivalents simpler for common cases, alignments richer for integration. | Equivalents vs alignments | Choosing between concept equivalents and alignments |
| S6 | 6. JSON-LD Context Fragment | `context` property contains `@context` fragment for making responses valid JSON-LD documents. Enables triple store ingestion, SPARQL queries, RDF merging. | JSON-LD, @context, linked data export | Generating linked data from form responses |
| S6.1 | 6.1 Example | JSON-LD context mapping fields to concept IRIs with XSD types. | JSON-LD example | Seeing JSON-LD context generation |
| S6.2 | 6.2 Auto-Generation | Tooling SHOULD auto-generate context from concept/vocabulary bindings. Explicit entries override auto-generated. | Auto-generation | Understanding tooling capabilities |

### Relationships, Conformance, Security (Lines 528-607)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S7 | 7. Relationship to Existing Properties | Full property layering table from structural typing through semantic identity: `dataType` -> `semanticType` -> extension -> concept entry -> vocabulary entry -> concept binding -> vocabulary binding -> alignment. | Property layering, semantic stack | Understanding the full semantic metadata stack |
| S8 | 8. Conformance | Core and Extended conformance levels. | Conformance | Implementing a conformant processor |
| S8.1 | 8.1 Core Processor Requirements | Core processors MAY ignore Ontology Documents entirely. MUST NOT use them to alter data/validation/processing. Metadata MUST NOT appear in Response data. | Core conformance | Minimum requirements |
| S8.2 | 8.2 Extended Processor Requirements | Load/validate against schema, verify `targetDefinition.url`, verify `compatibleVersions`, resolve `defaultSystem`, warn on nonexistent paths/option sets, last-loaded precedence for same-path bindings, warn on unrecognized relationship types, preserve `x-` properties. | Extended conformance | Building full ontology support |
| S9 | 9. Schema | Schema reference block for `schemas/ontology.schema.json`. | Schema | Programmatic validation |
| S10 | 10. Security Considerations | URI resolution restrictions (concept URIs are identifiers, not fetch targets), JSON-LD context injection risks, alignment target trust, document provenance, information disclosure. | Security | Secure handling of ontology documents |

### Examples and Appendices (Lines 611-782)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S11 | 11. Complete Example | Full Ontology Document for a clinical intake form with FHIR R4 bindings, concept mappings, vocabulary bindings, alignments, and JSON-LD context. | Complete example | Learning by example |
| App A | Appendix A -- References | Normative and informative references (RFC 2119, RFC 8259, RFC 3986, RFC 3987, SKOS, JSON-LD). | References | Looking up underlying standards |
| App B | Appendix B -- Relationship to OWL and the Semantic Web | Detailed discussion: what is shared with OWL (IRI identity, SKOS vocab, JSON-LD bridge), what is NOT done (open-world, reasoning, class hierarchy, property restrictions). Derived OWL output is possible but not canonical. | OWL compatibility analysis | Understanding semantic web integration depth |

## Cross-References

| Referenced Spec | Context |
|-----------------|---------|
| Formspec v1.0 Core Specification | `semanticType` (S4.2.3), `dataType`, `optionSets`, Bind paths (S4.3.3), processing model (S2.4) |
| Extension Registry | `concept` and `vocabulary` category entries (S3.2). Resolution cascade: Ontology Document > registry entry > semanticType literal |
| `schemas/ontology.schema.json` | Structural contract for Ontology Documents |
| `schemas/component.schema.json` | `$defs/TargetDefinition` shared type |
| SKOS (W3C Recommendation) | Relationship types (exact, close, broader, narrower, related) |
| JSON-LD 1.1 (W3C Recommendation) | `@context` fragment format |

## Key Schemas Defined

| Schema | Location | Purpose |
|--------|----------|---------|
| Ontology Document (top-level) | S2, `schemas/ontology.schema.json` | Top-level structure with all properties |
| Concept Binding | S3, `schemas/ontology.schema.json#/$defs/ConceptBinding` | Per-field concept association |
| Equivalent | S3.1, `schemas/ontology.schema.json#/$defs/Equivalent` | Cross-system equivalence declaration |
| Vocabulary Binding | S4, `schemas/ontology.schema.json#/$defs/VocabularyBinding` | Per-option-set terminology association |
| Filter | S4.1, `schemas/ontology.schema.json#/$defs/Filter` | Vocabulary subset constraints |
| Alignment | S5, `schemas/ontology.schema.json#/$defs/Alignment` | Cross-system typed field relationship |
| TargetDefinition | S2.1, shared from component schema | Definition binding with version range |
| Publisher | S2.2, `schemas/ontology.schema.json#/$defs/Publisher` | Organization metadata |

## Critical Behavioral Rules

1. **Ontology Documents are pure metadata (S1.1, S8.1).** They MUST NOT affect data capture, validation, or the processing model. A processor that does not understand ontology documents MUST ignore them without error.

2. **Concept resolution has a three-level cascade (S3.4).** Ontology Document binding > registry concept entry (matching `semanticType`) > raw `semanticType` literal. The Ontology Document always wins when present.

3. **`defaultSystem` is a behavioral default (S2, S8.2).** When a concept binding omits `system`, the `defaultSystem` URI is applied. Extended processors MUST resolve this.

4. **Paths use Bind.path syntax (S2.3, S3).** The same dot-delimited path notation as core spec S4.3.3. `[*]` wildcards for repeat group fields. Invalid paths produce warnings, not errors.

5. **Vocabulary bindings are additive, not replacement (S4.3).** They layer terminology metadata on top of existing Definition option sets. They do NOT modify option values, add options, or remove options.

6. **Last-loaded wins for same-path concept bindings (S8.2).** When multiple Ontology Documents bind the same field path, the last-loaded document's binding takes precedence. Vocabulary bindings for the same option set name also follow last-loaded precedence. Alignments concatenate (not replace).

7. **Concept URIs are identifiers, not fetch targets (S10).** Processors MUST NOT blindly dereference concept URIs. They are used for matching and metadata enrichment, not for fetching external resources at runtime.

8. **SKOS relationship types have defined semantics (S3.2).** `exact` = identical concept (default). `broader` = source is more specific than target. `narrower` = source is more general. These follow SKOS vocabulary conventions. Custom types MUST be `x-`-prefixed.

9. **Alignments are field-level; equivalents are concept-level (S5.2).** Concept equivalents say "concept X is also known as Y." Alignments say "field X in this form maps to system Y's concept Z." Both are valid but serve different purposes.

10. **JSON-LD context is a derived artifact (S6, Appendix B).** The `context` property generates JSON-LD output from form responses. Tooling MAY auto-generate it from concept bindings. Generated OWL/RDFS is also a derived artifact with no round-trip fidelity guarantee.

11. **Registry concept/vocabulary entries complement, not compete with, Ontology Documents (S1.0.1).** Registry entries are org-level shared metadata. Ontology Documents are per-form bindings. Both MAY coexist on the same field without warnings.
