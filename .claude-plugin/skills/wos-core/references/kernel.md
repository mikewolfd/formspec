# WOS Kernel Specification Reference Map

> `wos-spec/specs/kernel/spec.md` -- 636 lines -- Layer 0: Workflow Substrate

## Overview

The WOS Kernel Specification defines Layer 0: the orchestration substrate. It handles the "plumbing" of a workflow: topology (states/transitions), case state (the `caseFile`), actor models, impact levels, and the "Facts" tier of provenance. It is independent of governance rules or AI integration, which attach via defined seams.

## Section Map

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S1-S2 | Intro / Status | Background and maturity status. | draft, draft.1 | Orientation |
| S3 | Conceptual Model | The case file, states, and transition model. | `caseFile`, `topology` | Understanding the data structure |
| S4 | Topology | Static workflow structure definition. | `workflow`, `id`, `version` | Defining a new workflow substrate |
| S5 | States | Definitions for `simple`, `compound`, and `choice` states. | `initial`, `terminal`, `substates` | Modeling workflow lifecycle |
| S6 | Transitions | Logic for moving between states. | `event`, `condition` (FEL), `target` | Defining state machine logic |
| S7 | Events & Commands | Interaction model (FireEvent, CommitData, etc.). | `Signal`, `Action` | Implementing the execution engine |
| S8 | Actor Model | Identifies who/what can act. | `human`, `system` | Mapping roles to actors |
| S9 | Impact Levels | Risk-based classification of workflows. | `rights-impacting`, `safety-impacting` | Determining baseline governance requirements |
| S10 | The Seams | Points where L1/L2 governance attaches. | `lifecycleHook`, `contractHook`, `provenanceLayer` | Understanding how layers compose |
| S11 | Provenance | The foundational "Facts" tier of audit. | `Activity`, `Entity`, `Agent` | Implementing base audit logging |
| S12 | Serialization | JSON schema binding rules. | `$wosKernel` tag | Validating Kernel JSON documents |

## Key Rules

1. **Topology is Immutable (S4.3):** Once a workflow version is published, its topology cannot change.
2. **Impact Level Defaults (S9.2):** Undisclosed impact levels default to `operational`.
3. **The Mirror Principle (S3.4):** The case file structure SHOULD mirror the Formspec definitions used for input.
4. **Transition Determinism (S6.5):** Choice states MUST have exhaustive, mutually exclusive conditions.
