# WOS Semantic Profile v1.0 — Reference Map

> `wos-spec/specs/profiles/semantic.md` — 930 lines — machine-oriented section index

## Overview

The WOS Semantic Profile is a parallel seam specification for the Workflow Orchestration Standard (WOS). A Semantic Profile Document -- itself a JSON document -- declares a JSON-LD `@context` that maps WOS properties to RDF terms, SHACL shape references for semantic validation, PROV-O vocabulary mappings for provenance export, and XES/OCEL export configuration for process mining interoperability. The `@context` makes…

## Section Map

| Line | Heading | Pointer |
|------|---------|---------|
| L8 | WOS Semantic Profile v1.0 | Navigate here for this subsection. |
| L17 |   Abstract | Navigate here for this subsection. |
| L27 |   Status of This Document | Navigate here for this subsection. |
| L33 |   Conventions and Terminology | Navigate here for this subsection. |
| L58 |   1. Introduction | Navigate here for this subsection. |
| L60 |     1.1 Background | Navigate here for this subsection. |
| L66 |     1.2 Design Goals | Navigate here for this subsection. |
| L74 |     1.3 Scope | Navigate here for this subsection. |
| L80 |     1.4 Relationship to the Kernel | Navigate here for this subsection. |
| L88 |     1.5 Notational Conventions | Navigate here for this subsection. |
| L106 |   2. Document Structure | Navigate here for this subsection. |
| L110 |     2.1 Top-Level Properties | Navigate here for this subsection. |
| L127 |     2.2 Target Workflow | Navigate here for this subsection. |
| L138 |   3. JSON-LD Context | Navigate here for this subsection. |
| L142 |     3.1 Overview | Navigate here for this subsection. |
| L148 |     3.2 Context Configuration | Navigate here for this subsection. |
| L159 |     3.3 The WOS Namespace | Navigate here for this subsection. |
| L198 |     3.4 Governance Property Mappings | Navigate here for this subsection. |
| L223 |     3.5 Domain Vocabulary Extension | Navigate here for this subsection. |
| L246 |     3.6 Context Versioning | Navigate here for this subsection. |
| L254 |   4. SHACL Shapes | Navigate here for this subsection. |
| L258 |     4.1 Overview | Navigate here for this subsection. |
| L264 |     4.2 Shape References | Navigate here for this subsection. |
| L274 |     4.3 Standard Shape Categories | Navigate here for this subsection. |
| L294 |     4.4 Custom Shapes | Navigate here for this subsection. |
| L300 |   5. PROV-O Vocabulary Mapping | Navigate here for this subsection. |
| L304 |     5.1 Overview | Navigate here for this subsection. |
| L310 |     5.2 The provMapping Configuration | Navigate here for this subsection. |
| L320 |     5.3 Facts Tier to PROV-O | Navigate here for this subsection. |
| L340 |     5.4 Higher Provenance Tiers | Navigate here for this subsection. |
| L353 |     5.5 Actor Type Mapping | Navigate here for this subsection. |
| L375 |     5.6 PROV-O Export | Navigate here for this subsection. |
| L389 |   6. Process Mining Export | Navigate here for this subsection. |
| L393 |     6.1 Overview | Navigate here for this subsection. |
| L397 |     6.2 The processMining Configuration | Navigate here for this subsection. |
| L408 |     6.3 XES Mapping | Navigate here for this subsection. |
| L428 |     6.4 OCEL Mapping | Navigate here for this subsection. |
| L445 |     6.5 Export Scope | Navigate here for this subsection. |
| L451 |   7. Conformance | Navigate here for this subsection. |
| L455 |     7.1 Conformance Levels | Navigate here for this subsection. |
| L465 |     7.2 Additive Invariant | Navigate here for this subsection. |
| L473 |   8. Extension Points | Navigate here for this subsection. |
| L477 |     8.1 Document-Level Extensions | Navigate here for this subsection. |
| L481 |     8.2 Shape Extensions | Navigate here for this subsection. |
| L485 |     8.3 Vocabulary Extensions | Navigate here for this subsection. |
| … | *(additional subsections omitted)* | |

## How to Use This Map

Open the canonical spec at the path above and jump to the listed line for the authoritative definition. Prefer `.llm.md` distillations in the same directory when you only need retrieval-oriented summaries.
