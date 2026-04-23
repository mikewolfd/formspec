# WOS AI Integration Specification v1.0 — Reference Map

> `wos-spec/specs/ai/ai-integration.md` — 680 lines — machine-oriented section index

## Overview

The WOS AI Integration Specification defines Layer 2 of the Workflow Orchestration Standard: the governance structures for AI agent participation in WOS workflows. An AI Integration Document -- itself a JSON document -- targets a WOS Kernel Document and declares agent registration, deontic constraints on agent behavior, autonomy levels with impact-level caps, the Formspec-as-validator pattern, a confidence framework …

## Section Map

| Line | Heading | Pointer |
|------|---------|---------|
| L8 | WOS AI Integration Specification v1.0 | Navigate here for this subsection. |
| L17 |   Abstract | Navigate here for this subsection. |
| L27 |   Status of This Document | Navigate here for this subsection. |
| L33 |   1. Introduction | Navigate here for this subsection. |
| L35 |     1.1 Background | Navigate here for this subsection. |
| L46 |     1.2 Design Goals | Navigate here for this subsection. |
| L54 |     1.3 Scope | Navigate here for this subsection. |
| L60 |     1.4 Relationship to Lower Layers | Navigate here for this subsection. |
| L71 |     1.5 How AI Extends Human Governance | Navigate here for this subsection. |
| L84 |     1.6 Notational Conventions | Navigate here for this subsection. |
| L90 |   2. Conformance | Navigate here for this subsection. |
| L92 |     2.1 Conformance Profiles | Navigate here for this subsection. |
| L102 |     2.2 Conformance Requirements | Navigate here for this subsection. |
| L111 |   3. Agent Registration | Navigate here for this subsection. |
| L115 |     3.1 Agent as Actor Type | Navigate here for this subsection. |
| L130 |     3.2 Agent Type Taxonomy | Navigate here for this subsection. |
| L140 |     3.3 Capability Declaration | Navigate here for this subsection. |
| L152 |     3.3.1 Capability Preconditions | Navigate here for this subsection. |
| L164 |     3.4 Model Version Policy | Navigate here for this subsection. |
| L174 |     3.5 Trust Boundary | Navigate here for this subsection. |
| L180 |     3.6 Security Patterns (informative) | Navigate here for this subsection. |
| L184 |     3.7 Normative Constraints | Navigate here for this subsection. |
| L193 |   4. Deontic Constraints | Navigate here for this subsection. |
| L197 |     4.1 Overview | Navigate here for this subsection. |
| L201 |     4.2 Permission | Navigate here for this subsection. |
| L214 |     4.3 Prohibition | Navigate here for this subsection. |
| L226 |     4.4 Obligation | Navigate here for this subsection. |
| L238 |     4.5 Right | Navigate here for this subsection. |
| L248 |     4.6 Enforcement Ordering | Navigate here for this subsection. |
| L261 |     4.7 Constraint Composition | Navigate here for this subsection. |
| L277 |     4.8 Examples (non-normative) | Navigate here for this subsection. |
| L307 |     4.9 Null Propagation | Navigate here for this subsection. |
| L322 |   5. Autonomy Levels | Navigate here for this subsection. |
| L326 |     5.1 Overview | Navigate here for this subsection. |
| L330 |     5.2 Level Definitions | Navigate here for this subsection. |
| L339 |     5.3 Autonomy Constraints | Navigate here for this subsection. |
| L348 |     5.4 Autonomy Escalation | Navigate here for this subsection. |
| L358 |     5.5 Autonomy Demotion | Navigate here for this subsection. |
| L371 |     5.6 Dynamic Autonomy Selection | Navigate here for this subsection. |
| L377 |   6. Formspec-as-Validator | Navigate here for this subsection. |
| L381 |     6.1 Principle | Navigate here for this subsection. |
| L387 |     6.2 Requirements | Navigate here for this subsection. |
| L394 |     6.3 Agent Provenance Metadata | Navigate here for this subsection. |
| L405 |   7. Confidence Framework | Navigate here for this subsection. |
| L409 |     7.1 Confidence Report | Navigate here for this subsection. |
| … | *(additional subsections omitted)* | |

## How to Use This Map

Open the canonical spec at the path above and jump to the listed line for the authoritative definition. Prefer `.llm.md` distillations in the same directory when you only need retrieval-oriented summaries.
