# WOS Specification Navigator (wos-core)

Navigate the Workflow Orchestration Standard (WOS) specification suite. This skill provides structured access to the 18+ specifications and 18+ schemas that define the WOS orchestration substrate, governance layers, and AI integration framework.

## Metadata
- **Version:** 1.0.0
- **Authors:** Formspec Working Group
- **Status:** Production
- **Scope:** WOS Kernel (L0), Governance (L1), AI Integration (L2), Advanced Governance (L3), Profiles, Sidecars, and Companions.

## Core Objective
Enable the AI to query the WOS specification with high precision, mapping requirements to specific chapters, understanding the layered processing model, and resolving inter-spec dependencies across the four vertical layers.

---

## Architectural Navigation (The Four Layers)

WOS is organized into a four-layer vertical stack. Each layer targets a "Kernel Document" via a sidecar pattern.

| Layer | Name | Primary Spec | Primary Schema | Key Seams |
|-------|------|--------------|----------------|-----------|
| **L0** | **Kernel** | `specs/kernel/spec.llm.md` | `wos-kernel.schema.json` | `topology`, `caseState`, `actorModel` |
| **L1** | **Governance** | `specs/governance/workflow-governance.llm.md` | `wos-workflow-governance.schema.json` | `lifecycleHook`, `contractHook`, `provenanceLayer` |
| **L2** | **AI Integration** | `specs/ai/ai-integration.llm.md` | `wos-ai-integration.schema.json` | `actorExtension`, `deonticConstraints`, `autonomyLevels` |
| **L3** | **Advanced** | `specs/advanced/advanced-governance.llm.md` | `wos-advanced.schema.json` | `constraintZones` (DCR), `equityGuardrails` |

### Sidecars and Companions
- **Sidecars:** Targeted documents like `PolicyParameters`, `BusinessCalendar`, `NotificationTemplate`, and `AgentConfig`.
- **Profiles:** Implementation constraints (Semantic, Integration) defining subset conformance.
- **Runtime Companion:** The normative guide to *how* a WOS processor executes layered evaluation (`specs/companions/runtime.llm.md`).

---

## Decision Tree: Where to Look

When answering a question about WOS, use this decision tree:

1.  **Topology, State, or Basic Actors?** -> `specs/kernel/spec.llm.md`
2.  **Due Process, Protocols, or Human Governance?** -> `specs/governance/workflow-governance.llm.md`
3.  **Agents, Autonomy, or Deontic Constraints?** -> `specs/ai/ai-integration.llm.md`
4.  **DCR Zones, Logic Verification, or Fairness?** -> `specs/advanced/advanced-governance.llm.md`
5.  **Processor Behavior or Evaluation Order?** -> `specs/companions/runtime.llm.md`
6.  **Temporal Rules or Date-Effective Parameters?** -> `specs/governance/policy-parameters.llm.md`
7.  **Service Levels or Hold Policies?** -> `specs/sidecars/business-calendar.llm.md` and `specs/governance/workflow-governance.llm.md` (S10-S12)

---

## Cross-Tier Integration Points (The Seams)

WOS layers attach to the kernel through named "seams." Understanding these is critical for resolving cross-spec behavior.

| Seam ID | Definition Spec | Consumed By | Semantics |
|---------|-----------------|-------------|-----------|
| `lifecycleHook` | Kernel S10.4 | All (L1-L3) | Logic triggered by transition tags (e.g., `determination`, `adverse-decision`). |
| `contractHook` | Kernel S10.2 | L1, L2 | Data validation pipelines and Formspec-as-validator cages. |
| `provenanceLayer` | Kernel S10.3 | All | Extension of Facts tier with Reasoning (L1), Counterfactual (L1), and Narrative (L2). |
| `actorExtension` | Kernel S10.1 | L2, L3 | Transformation of `actor` types into `agent` with registration and lifecycle. |
| `extensions` | Kernel S10.5 | L3 | Attachment of DCR Constraint Zones to compound states. |

---

## Reference Maps (LLM Quick-Links)

Detailed section-by-section maps for the primary specifications. Use these to find exact line ranges.

- [Kernel Reference Map](references/kernel.md) (Tier 0: substrate)
- [Governance Reference Map](references/governance.md) (Tier 1: humanity)
- [AI Integration Reference Map](references/ai-integration.md) (Tier 2: agency)
- [Advanced Governance Reference Map](references/advanced-governance.md) (Tier 3: verification)
- [Runtime Companion Reference Map](references/runtime.md) (Orchestration logic)

### Schema Reference Maps

Detailed property-level maps for WOS schemas:

- [Kernel Schema](references/schemas/kernel.md) (`wos-kernel.schema.json`)
- [Governance Schema](references/schemas/governance.md) (`wos-workflow-governance.schema.json`)
- [AI Integration Schema](references/schemas/ai-integration.md) (`wos-ai-integration.schema.json`)
- [Advanced Governance Schema](references/schemas/advanced.md) (`wos-advanced.schema.json`)
- [Policy Parameters Schema](references/schemas/policy-parameters.md) (`wos-policy-parameters.schema.json`)
- [Business Calendar Schema](references/schemas/business-calendar.md) (`wos-business-calendar.schema.json`)
- [Case Instance Schema](references/schemas/case-instance.md) (`wos-case-instance.schema.json`)

---

## Complete File Map (wos-spec)

| Layer | Type | File Path | Description |
|-------|------|-----------|-------------|
| **L0: Kernel** | Spec | `wos-spec/specs/kernel/spec.llm.md` | Core substrate: topology, case state, actors. |
| | Schema | `wos-spec/schemas/kernel/wos-kernel.schema.json` | Kernel Document structure. |
| | Spec | `wos-spec/specs/kernel/correspondence-metadata.llm.md` | Audit-ready metadata for external communication. |
| | Schema | `wos-spec/schemas/kernel/wos-correspondence-metadata.schema.json` | Correspondence metadata record. |
| **L1: Governance** | Spec | `wos-spec/specs/governance/workflow-governance.llm.md` | High-stakes human review and due process. |
| | Schema | `wos-spec/schemas/governance/wos-workflow-governance.schema.json` | Workflow Governance configuration. |
| | Spec | `wos-spec/specs/governance/policy-parameters.llm.md` | Temporal (date-indexed) business rules. |
| | Schema | `wos-spec/schemas/governance/wos-policy-parameters.schema.json` | Policy Parameter configuration. |
| | Spec | `wos-spec/specs/governance/due-process-config.llm.md` | Notices, appeals, and explanation rules. |
| | Schema | `wos-spec/schemas/governance/wos-due-process.schema.json` | Due Process configuration. |
| | Spec | `wos-spec/specs/governance/assertion-library.llm.md` | Reusable data validation logic gates. |
| | Schema | `wos-spec/schemas/governance/wos-assertion-gate.schema.json` | Assertion library definitions. |
| **L2: AI Integration** | Spec | `wos-spec/specs/ai/ai-integration.llm.md` | Agent registration and deontic constraints. |
| | Schema | `wos-spec/schemas/ai/wos-ai-integration.schema.json` | AI Integration configuration. |
| | Spec | `wos-spec/specs/ai/agent-config.llm.md` | Fine-grained model parameters and fallbacks. |
| | Schema | `wos-spec/schemas/ai/wos-agent-config.schema.json` | Agent-specific configuration. |
| | Spec | `wos-spec/specs/ai/drift-monitor.llm.md` | Statistical monitoring of agent behavioral shift. |
| | Schema | `wos-spec/schemas/ai/wos-drift-monitor.schema.json` | Drift monitor configuration. |
| **L3: Advanced** | Spec | `wos-spec/specs/advanced/advanced-governance.llm.md` | Adaptive phases (DCR) and formal verification (SMT). |
| | Schema | `wos-spec/schemas/advanced/wos-advanced.schema.json` | Advanced Governance configuration. |
| | Spec | `wos-spec/specs/advanced/verification-report.llm.md` | Standardized results from formal proof tooling. |
| | Schema | `wos-spec/schemas/advanced/wos-verification-report.schema.json` | Verification Report record. |
| | Spec | `wos-spec/specs/advanced/equity-config.llm.md` | Statistical disparity monitoring and bias caps. |
| | Schema | `wos-spec/schemas/advanced/wos-equity.schema.json` | Equity guardrail configuration. |
| **Sidecars** | Spec | `wos-spec/specs/sidecars/business-calendar.llm.md` | Working days, holidays, and SLA timeframes. |
| | Schema | `wos-spec/schemas/sidecars/wos-business-calendar.schema.json` | Business Calendar configuration. |
| | Spec | `wos-spec/specs/sidecars/notification-template.llm.md` | Standardized notice generation for due process. |
| | Schema | `wos-spec/schemas/sidecars/wos-notification-template.schema.json` | Notification template structure. |
| **Companions** | Spec | `wos-spec/specs/companions/runtime.llm.md` | Normative guide to the WOS Processor execution model. |
| | Schema | `wos-spec/schemas/companions/wos-case-instance.schema.json` | In-flight workflow instance state. |
| | Spec | `wos-spec/specs/companions/lifecycle-detail.llm.md` | Deep semantics of the SCXML-compatible engine. |
| | Schema | `wos-spec/schemas/companions/wos-lifecycle-detail.schema.json` | Detail-level state machine configuration. |
| **Profiles** | Spec | `wos-spec/specs/profiles/integration.llm.md` | Compliance profiles for system-to-system interop. |
| | Schema | `wos-spec/schemas/profiles/wos-integration-profile.schema.json` | Integration profile definition. |
| | Spec | `wos-spec/specs/profiles/semantic.llm.md` | Compliance profiles for data-sharing and ontology. |
| | Schema | `wos-spec/schemas/profiles/wos-semantic-profile.schema.json` | Semantic profile definition. |

---

---

## Normative Rules for LLM Reasoning

1.  **Layered Evaluation:** WOS is NOT additive; it is a layered sieve. A processor MUST evaluate L0 (if safe), then apply L1 filters, then L2 agents under L1 constraints.
2.  **Sidecar Binding:** Sidecars BIND to the Kernel Document URL. If the URL doesn't match, the sidecar is ignored.
3.  **Trust Boundary:** AI agents (L2) are ALWAYS outside the trust boundary. The WOS Processor enforces constraints; the agent cannot weaken them.
4.  **Semantic Tags:** Logic in L1/L2 attaches to Kernel TAGS (`determination`, `review`), not transition IDs. This allows governance to survive topology changes.
5.  **Formspec-as-Validator:** Agent output is untrusted input. WOS MUST NOT implement custom validation if it can be expressed as a Formspec contract.
6.  **Impact Level Caps:** Effective autonomy (L2) is capped by Kernel `impactLevel`. `rights-impacting` defaults to `assistive`.
