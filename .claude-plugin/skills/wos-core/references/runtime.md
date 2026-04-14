# WOS Runtime Companion Reference Map

> `wos-spec/specs/companions/runtime.md` -- 896 lines -- Normative Orchestration Logic

## Overview

The Runtime Companion defines how a WOS processor executes layered evaluation. It specifies the "Orchestration Loop" that resolves sidecars, evaluates kernel state, and applies governance layers.

## Section Map

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S3 | Document Indexing | Loading and resolving $wos* sidecars. | `documentRegistry` | Bootstrapping a layered workflow |
| S4 | Evaluation Context | Composition of the multi-tier data model. | `caseFile`, `output`, `parameters` | Resolving FEL refs across layers |
| S5 | Orchestration Loop | The primary processing cycle. | `pre-action`, `action`, `post-action` | Implementing the execution core |
| S6 | Layer 1 Processing | Attachment and execution of human governance. | `lifecycleHook` resolution | Implementing review/audit logic |
| S7 | Layer 2 Processing | Agency, deontic enforcement, and fallback. | `guardrail-loop` | Implementing agent invocation |
| S8 | Conflict Resolution | Rules for when layers contradict. | `most-restrictive-pass` | Resolving overlapping constraints |
| S9 | Explanation Assembly | Composing Reasoning and Narrative tiers. | `IndividualizedExplanation` | Generating notices and audit trails |

## Key Invariants

1. **Isolation Invariant (S2.4):** Kernel evaluation MUST NOT depend on governance outcome; governance ENVELOPES the kernel.
2. **Context Enrichment (S4.2):** Each layer MUST NOT mutate lower-layer data; it adds new namespaced variables to the context.
3. **The Guardrail Loop (S7.3):** Agent invocation -> Contract Validation -> Deontic Enforcement -> Confidence Check -> VOLUME check.
