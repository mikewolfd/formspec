# WOS Lifecycle Detail Companion v1.0 — Reference Map

> `wos-spec/specs/companions/lifecycle-detail.md` — 503 lines — machine-oriented section index

## Overview

The WOS Lifecycle Detail Companion elaborates the lifecycle semantics defined in the WOS Kernel Specification. The kernel defines the deterministic evaluation algorithm, state types, transitions, fork/join, and the compensation seam. This companion provides the detailed execution algorithms that Kernel Complete processors need: the full compensation execution algorithm (reverse ordering, pivot steps, forward/backward…

## Section Map

| Line | Heading | Pointer |
|------|---------|---------|
| L8 | WOS Lifecycle Detail Companion v1.0 | Navigate here for this subsection. |
| L17 |   Abstract | Navigate here for this subsection. |
| L27 |   Status of This Document | Navigate here for this subsection. |
| L33 |   Normative Precedence | Navigate here for this subsection. |
| L45 |   1. Introduction | Navigate here for this subsection. |
| L47 |     1.1 Purpose | Navigate here for this subsection. |
| L58 |     1.2 Scope | Navigate here for this subsection. |
| L64 |     1.3 Notational Conventions | Navigate here for this subsection. |
| L72 |   2. Transition Evaluation Algorithm | Navigate here for this subsection. |
| L76 |     2.1 Overview | Navigate here for this subsection. |
| L80 |     2.2 Configuration | Navigate here for this subsection. |
| L84 |     2.3 Algorithm: Process Event | Navigate here for this subsection. |
| L111 |     2.4 Algorithm: Fire Transition | Navigate here for this subsection. |
| L151 |     2.5 Exit and Entry Path Computation | Navigate here for this subsection. |
| L177 |     2.6 Nested State Transitions | Navigate here for this subsection. |
| L183 |   3. History States | Navigate here for this subsection. |
| L187 |     3.1 Overview | Navigate here for this subsection. |
| L191 |     3.2 Shallow History | Navigate here for this subsection. |
| L204 |     3.3 Deep History | Navigate here for this subsection. |
| L219 |     3.4 History Clearing | Navigate here for this subsection. |
| L225 |   4. Advanced Parallel Execution | Navigate here for this subsection. |
| L229 |     4.1 Region Activation | Navigate here for this subsection. |
| L241 |     4.2 Event Routing to Regions | Navigate here for this subsection. |
| L258 |     4.3 Join Semantics | Navigate here for this subsection. |
| L266 |     4.4 Region Cancellation | Navigate here for this subsection. |
| L276 |     4.5 Nested Parallelism | Navigate here for this subsection. |
| L280 |     4.6 Transitions Exiting a Parallel State | Navigate here for this subsection. |
| L286 |   5. Compensation Execution Algorithm | Navigate here for this subsection. |
| L290 |     5.1 Overview | Navigate here for this subsection. |
| L294 |     5.2 Compensation Log | Navigate here for this subsection. |
| L298 |     5.3 Algorithm: Execute Compensation | Navigate here for this subsection. |
| L329 |     5.4 Reverse Ordering | Navigate here for this subsection. |
| L333 |     5.5 The Pivot Step | Navigate here for this subsection. |
| L337 |     5.6 Forward Recovery vs. Backward Recovery | Navigate here for this subsection. |
| L352 |     5.7 Compensation and Parallel States | Navigate here for this subsection. |
| L356 |     5.8 Nested Compensation | Navigate here for this subsection. |
| L360 |     5.9 Compensation Triggering | Navigate here for this subsection. |
| L371 |   6. Timer Semantics | Navigate here for this subsection. |
| L375 |     6.1 Overview | Navigate here for this subsection. |
| L379 |     6.2 Timer Creation | Navigate here for this subsection. |
| L392 |     6.3 Timer Cancellation | Navigate here for this subsection. |
| L396 |     6.4 Timer Reset on Reentry | Navigate here for this subsection. |
| L400 |     6.5 Timers and Parallel States | Navigate here for this subsection. |
| L404 |     6.6 Timer Durability | Navigate here for this subsection. |
| L408 |     6.7 Timer Provenance | Navigate here for this subsection. |
| … | *(additional subsections omitted)* | |

## How to Use This Map

Open the canonical spec at the path above and jump to the listed line for the authoritative definition. Prefer `.llm.md` distillations in the same directory when you only need retrieval-oriented summaries.
