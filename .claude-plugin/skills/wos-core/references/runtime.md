# WOS Runtime Companion v1.0 — Reference Map

> `wos-spec/specs/companions/runtime.md` — 908 lines — machine-oriented section index

## Overview

The WOS Runtime Companion defines the behavioral contract between the WOS evaluation engine and its host environment. A processor that implements this companion can host any WOS workflow at any scale, on any infrastructure. The companion defines WHAT a conformant processor must do -- not HOW. It specifies instance serialization (CaseInstance), event delivery semantics, action execution ordering, durability guarantees…

## Section Map

| Line | Heading | Pointer |
|------|---------|---------|
| L8 | WOS Runtime Companion v1.0 | Navigate here for this subsection. |
| L17 |   Abstract | Navigate here for this subsection. |
| L27 |   Status of This Document | Navigate here for this subsection. |
| L33 |   Normative Precedence | Navigate here for this subsection. |
| L45 |   1. Introduction | Navigate here for this subsection. |
| L47 |     1.1 Purpose | Navigate here for this subsection. |
| L57 |     1.2 Scope | Navigate here for this subsection. |
| L63 |     1.3 Notational Conventions | Navigate here for this subsection. |
| L75 |   2. Conformance | Navigate here for this subsection. |
| L77 |     2.1 Conformance Profiles | Navigate here for this subsection. |
| L87 |     2.2 Host Interface Requirements | Navigate here for this subsection. |
| L93 |   3. Instance Lifecycle | Navigate here for this subsection. |
| L95 |     3.1 CaseInstance | Navigate here for this subsection. |
| L125 |     3.2 Configuration Ordering | Navigate here for this subsection. |
| L129 |     3.3 Instance Operations | Navigate here for this subsection. |
| L145 |     3.4 Status Transitions | Navigate here for this subsection. |
| L179 |   4. Event Delivery Contract | Navigate here for this subsection. |
| L183 |     4.1 Serial Processing | Navigate here for this subsection. |
| L189 |     4.2 Event Structure | Navigate here for this subsection. |
| L201 |     4.3 Exactly-Once Semantics | Navigate here for this subsection. |
| L207 |     4.4 Unmatched Events | Navigate here for this subsection. |
| L213 |   5. Action Execution Model | Navigate here for this subsection. |
| L217 |     5.1 Sequential Execution Within a State | Navigate here for this subsection. |
| L221 |     5.2 Transition Execution Sequence | Navigate here for this subsection. |
| L232 |     5.3 Parallel Region Actions | Navigate here for this subsection. |
| L236 |     5.4 Service Invocation | Navigate here for this subsection. |
| L256 |     5.5 Contract Validation | Navigate here for this subsection. |
| L277 |   6. Durability Guarantees | Navigate here for this subsection. |
| L281 |     6.1 Kernel Guarantees as Runtime Requirements | Navigate here for this subsection. |
| L295 |     6.2 Checkpoint Semantics | Navigate here for this subsection. |
| L316 |     6.3 Provenance Durability | Navigate here for this subsection. |
| L322 |   7. Timer Management | Navigate here for this subsection. |
| L326 |     7.1 Overview | Navigate here for this subsection. |
| L330 |     7.2 Precision | Navigate here for this subsection. |
| L344 |     7.3 Persistence | Navigate here for this subsection. |
| L348 |     7.4 Simulated Time | Navigate here for this subsection. |
| L354 |     7.5 Timer Ordering | Navigate here for this subsection. |
| L360 |   8. Governance Enforcement | Navigate here for this subsection. |
| L364 |     8.1 Overview | Navigate here for this subsection. |
| L368 |     8.2 Governance Scoping | Navigate here for this subsection. |
| L384 |     8.3 Deontic Enforcement Ordering | Navigate here for this subsection. |
| L397 |     8.4 Delegation Verification | Navigate here for this subsection. |
| L409 |     8.5 Hold Management | Navigate here for this subsection. |
| L420 |   9. Explanation Assembly | Navigate here for this subsection. |
| L424 |     9.1 Overview | Navigate here for this subsection. |
| … | *(additional subsections omitted)* | |

## How to Use This Map

Open the canonical spec at the path above and jump to the listed line for the authoritative definition. Prefer `.llm.md` distillations in the same directory when you only need retrieval-oriented summaries.
