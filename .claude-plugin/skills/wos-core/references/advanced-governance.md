# WOS Advanced Governance Reference Map

> `wos-spec/specs/advanced/advanced-governance.md` -- 423 lines -- Layer 3: Verification & Adaptive Management

## Overview

The WOS Advanced Governance Specification defines Layer 3: verifiable constraints (SMT), equity monitoring, and adaptive case management (DCR Zones).

## Section Map

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S3 | Equity Guardrails | Statistical fairness monitoring. | `metric`, `groupBy`, `maxDisparity` | Monitoring demographic parity |
| S4 | Constraint Zones | DCR graph modeling for adaptive workflows. | `included`, `pending`, `executed` | Modeling investigative/creative phases |
| S5 | Multi-Step | Sessions for compound agent reasoning. | `checkpointPolicy`, `interventionPoint` | Handling multi-turn agent interactions |
| S6 | Tool Governance | Permissions and side-effect policies. | `toolRegistry`, `sideEffectPolicy` | Securing agent tool/API access |
| S7 | Lifecycle | Agent state machine (Active/Degraded/Retired). | `suspend`, `retire`, `demote` | Managing operational agent fleet |
| S8 | SMT Verification | Decidable subset of FEL for formal proof. | `proven-safe`, `linear arithmetic` | Provably verifying deontic constraints |
| S9 | Calibration | Algorithms for reported-vs-actual probability. | `plattScaling`, `isotonic` | Aligning agent confidence scores |
| S10 | Drift Methods | Statistical methods for detection. | `psi`, `ks`, `chi2` | Implementing the drift monitor logic |
| S11 | Resilience | Shadow mode and Circuit Breakers. | `shadowMode`, `errorRateThreshold` | Validating agents before production |

## Key Rules

1. **Defense in Depth (S8.4):** SMT verification complements, but does not replace, runtime enforcement.
2. **Zone Satisfaction (S4.5):** A DCR zone is satisfied when all pending included activities are executed.
3. **Static Autonomy (S6.1):** Agents MUST NOT invoke tools not in their permitted list.
4. **Disparity Actions (S3.3):** Equity violations trigger alerts; they cannot block individual case actions.
