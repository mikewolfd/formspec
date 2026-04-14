# WOS Workflow Governance Reference Map

> `wos-spec/specs/governance/workflow-governance.md` -- 589 lines -- Layer 1: Human Governance

## Overview

The WOS Workflow Governance Specification defines Layer 1: the controls human workflows require (due process, protocols, audit). It exists independently of AI. Layer 2 (AI) extends these human-centric structures.

## Section Map

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S3 | Due Process | Notice, Explanation, Appeal, Continuation of Service. | `adverse-decision` tag, notice period | Handling rights-impacting decisions |
| S4 | Review Protocols | Cognitive forcing functions for manual review. | `independentFirst`, `considerOpposite` | Designing high-stakes review steps |
| S5 | Data Validation | Pipelines with assertion gates for untrusted data. | `assertion-gate`, `contract-validation` | Integrating external data feeds |
| S6 | Structured Audit | Reasoning and Counterfactual tiers. | `RuleReference`, `Counterfactual` | Generating legal/regulatory audit trails |
| S7 | Quality Controls | Review sampling and Separation of Duties. | `samplingRate`, `excludeRoles` | Implementing institutional quality assurance |
| S8 | Rejection | Remediation policies for validation failure. | `retryWithCorrections`, `escalate` | Handling errors in processing chains |
| S9-S10 | Tasks | Catalog and management (lifecycle, roles, SLA). | `nominee`, `breachPolicy`, `owner` | Managing human work queues |
| S11 | Delegation | Authorized chains of determination authority. | `authorizedActor`, `legalInstrument` | Verifying authority for signings |
| S12 | Hold Policies | Typed suspension (applicant response, legal). | `holdType`, `expectedDuration` | Implementing state machine "freezes" |
| S13 | Temporal Parameters | Date-effective rule values (income thresholds). | `effectiveDate`, `lookup` | Resolving rules that change over time |

## Key Rules

1. **Tag-based Attachment (S4.3):** Governance rules attach via semantic tags (e.g., `determintion`), not transition IDs.
2. **Impact-Level Enforcement (S3.1):** Due process is NORMATIVE for `rights-impacting` or `safety-impacting` workflows.
3. **Independent-First Ordering (S4.1):** The interface MUST hide recommendations until the assessment is recorded.
4. **Counterfactual Requirement (S6.4):** REQUIRED for adverse decisions in `rights-impacting` cases.
