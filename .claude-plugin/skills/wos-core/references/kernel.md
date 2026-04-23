# WOS Kernel Specification v1.0 — Reference Map

> `wos-spec/specs/kernel/spec.md` — 708 lines — machine-oriented section index

## Overview

The WOS Kernel Specification defines the minimal orchestration substrate for the Workflow Orchestration Standard (WOS). A Kernel Document -- itself a JSON document -- declares a workflow's lifecycle topology (states, transitions, events, milestones), case state model (typed data with append-only mutation history), actor model (human and system), impact level classification, contract validation interface, provenance F…

## Section Map

| Line | Heading | Pointer |
|------|---------|---------|
| L8 | WOS Kernel Specification v1.0 | Navigate here for this subsection. |
| L17 |   Abstract | Navigate here for this subsection. |
| L25 |   Status of This Document | Navigate here for this subsection. |
| L31 |   1. Introduction | Navigate here for this subsection. |
| L33 |     1.1 Background | Navigate here for this subsection. |
| L39 |     1.2 Design Goals | Navigate here for this subsection. |
| L48 |     1.3 Scope | Navigate here for this subsection. |
| L54 |     1.4 Relationship to Formspec | Navigate here for this subsection. |
| L62 |     1.5 Notational Conventions | Navigate here for this subsection. |
| L72 |   2. Conformance | Navigate here for this subsection. |
| L74 |     2.1 Conformance Classes | Navigate here for this subsection. |
| L80 |     2.2 Conformance Profiles | Navigate here for this subsection. |
| L90 |   3. Actor Model | Navigate here for this subsection. |
| L101 |     3.1 Actor Type Determination | Navigate here for this subsection. |
| L105 |     3.2 Extensibility | Navigate here for this subsection. |
| L109 |     3.3 Normative Constraints | Navigate here for this subsection. |
| L115 |     3.4 Actor Assignment | Navigate here for this subsection. |
| L121 |   4. Lifecycle Topology | Navigate here for this subsection. |
| L125 |     4.1 Overview | Navigate here for this subsection. |
| L129 |     4.2 Deterministic Evaluation Algorithm | Navigate here for this subsection. |
| L135 |     4.3 States | Navigate here for this subsection. |
| L160 |     4.4 Cancellation Policy | Navigate here for this subsection. |
| L170 |     4.5 Transitions | Navigate here for this subsection. |
| L183 |     4.6 Transition Resolution | Navigate here for this subsection. |
| L193 |     4.7 Transition Execution Sequence | Navigate here for this subsection. |
| L202 |     4.8 Fork and Join | Navigate here for this subsection. |
| L210 |     4.9 Event Handling | Navigate here for this subsection. |
| L214 |     4.10 Kernel-Generated Events | Navigate here for this subsection. |
| L236 |     4.11 Reentry | Navigate here for this subsection. |
| L240 |     4.12 Semantic Transition Tags | Navigate here for this subsection. |
| L257 |     4.13 Milestones | Navigate here for this subsection. |
| L269 |     4.14 History States | Navigate here for this subsection. |
| L280 |   5. Case State | Navigate here for this subsection. |
| L284 |     5.1 Overview | Navigate here for this subsection. |
| L290 |     5.2 Case File | Navigate here for this subsection. |
| L298 |     5.3 Field Types | Navigate here for this subsection. |
| L302 |     5.4 Mutation History | Navigate here for this subsection. |
| L315 |     5.5 Case Relationships | Navigate here for this subsection. |
| L330 |   6. Impact Level Classification | Navigate here for this subsection. |
| L347 |   7. Evaluation Context | Navigate here for this subsection. |
| L351 |     7.1 Overview | Navigate here for this subsection. |
| L355 |     7.2 Base Context | Navigate here for this subsection. |
| L367 |     7.3 Context Enrichment | Navigate here for this subsection. |
| L380 |     7.4 FEL Usage | Navigate here for this subsection. |
| L388 |   8. Provenance: Facts Tier | Navigate here for this subsection. |
| … | *(additional subsections omitted)* | |

## How to Use This Map

Open the canonical spec at the path above and jump to the listed line for the authoritative definition. Prefer `.llm.md` distillations in the same directory when you only need retrieval-oriented summaries.
