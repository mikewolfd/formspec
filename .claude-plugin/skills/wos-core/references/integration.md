# WOS Integration Profile v1.0 — Reference Map

> `wos-spec/specs/profiles/integration.md` — 751 lines — machine-oriented section index

## Overview

The WOS Integration Profile is a parallel seam specification for the Workflow Orchestration Standard (WOS). An Integration Profile Document -- itself a JSON document -- declares named integration bindings that WOS workflows invoke through the kernel's `invokeService` action: Arazzo sequences for multi-step API orchestration, CWL-informed tool descriptors for non-HTTP invocations, CloudEvents extension attributes for …

## Section Map

| Line | Heading | Pointer |
|------|---------|---------|
| L8 | WOS Integration Profile v1.0 | Navigate here for this subsection. |
| L17 |   Abstract | Navigate here for this subsection. |
| L27 |   Status of This Document | Navigate here for this subsection. |
| L33 |   1. Introduction | Navigate here for this subsection. |
| L35 |     1.1 Background | Navigate here for this subsection. |
| L41 |     1.2 Design Goals | Navigate here for this subsection. |
| L48 |     1.3 Scope | Navigate here for this subsection. |
| L54 |     1.4 Relationship to the Kernel | Navigate here for this subsection. |
| L60 |     1.5 Notational Conventions | Navigate here for this subsection. |
| L84 |   2. Conformance | Navigate here for this subsection. |
| L86 |     2.1 Conformance Classes | Navigate here for this subsection. |
| L92 |     2.2 Conformance Profiles | Navigate here for this subsection. |
| L105 |   3. Integration Bindings | Navigate here for this subsection. |
| L107 |     3.1 Overview | Navigate here for this subsection. |
| L134 |     3.2 Integration Binding Types | Navigate here for this subsection. |
| L146 |     3.3 Common Binding Properties | Navigate here for this subsection. |
| L161 |     3.3.1 outputBinding JSONPath Profile | Navigate here for this subsection. |
| L185 |     3.4 Request-Response Bindings | Navigate here for this subsection. |
| L219 |     3.5 Arazzo Sequence Bindings | Navigate here for this subsection. |
| L253 |     3.6 Tool Bindings | Navigate here for this subsection. |
| L309 |     3.7 Event Bindings | Navigate here for this subsection. |
| L346 |     3.8 Retry Policy | Navigate here for this subsection. |
| L357 |   4. Contract Validation | Navigate here for this subsection. |
| L359 |     4.1 Formspec Definition Contracts | Navigate here for this subsection. |
| L367 |     4.2 Validation Semantics | Navigate here for this subsection. |
| L383 |   5. CloudEvents Extensions | Navigate here for this subsection. |
| L385 |     5.1 WOS Extension Attributes | Navigate here for this subsection. |
| L399 |     5.2 Attribute Semantics | Navigate here for this subsection. |
| L409 |     5.3 Inbound Event Processing | Navigate here for this subsection. |
| L418 |     5.4 Idempotent Event Consumption | Navigate here for this subsection. |
| L424 |   6. Correlation | Navigate here for this subsection. |
| L426 |     6.1 Correlation Rules | Navigate here for this subsection. |
| L454 |   7. Idempotency | Navigate here for this subsection. |
| L456 |     7.1 Idempotency Keys | Navigate here for this subsection. |
| L470 |   8. External Policy Engine Bridge | Navigate here for this subsection. |
| L472 |     8.1 Overview | Navigate here for this subsection. |
| L483 |     8.2 Policy Engine Binding Properties | Navigate here for this subsection. |
| L492 |     8.3 Decision Mapping | Navigate here for this subsection. |
| L503 |     8.4 Governance Integration | Navigate here for this subsection. |
| L521 |     8.5 Engine-Specific Notes | Navigate here for this subsection. |
| L556 |   9. Processing Model | Navigate here for this subsection. |
| L558 |     9.1 Binding Resolution | Navigate here for this subsection. |
| L564 |     9.2 Execution Order | Navigate here for this subsection. |
| L577 |     9.3 FEL Expression Evaluation | Navigate here for this subsection. |
| L583 |   10. Extension Points | Navigate here for this subsection. |
| … | *(additional subsections omitted)* | |

## How to Use This Map

Open the canonical spec at the path above and jump to the listed line for the authoritative definition. Prefer `.llm.md` distillations in the same directory when you only need retrieval-oriented summaries.
