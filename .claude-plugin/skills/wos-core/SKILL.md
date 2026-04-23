# WOS Specification Navigator (wos-core)

Navigate the Workflow Orchestration Standard (WOS) specification suite. This skill provides structured access to the 22 canonical specifications and 27 JSON Schemas under `wos-spec/`, plus companion `.llm.md` distillations where present.

## Metadata
- **Version:** 1.1.0
- **Authors:** Formspec Working Group
- **Status:** Production
- **Scope:** WOS Kernel (L0), Governance (L1), AI Integration (L2), Advanced Governance (L3), Assurance, Profiles, Sidecars, Companions, registry, and tooling schemas (conformance, lint, MCP, synth).

## Core Objective
Enable the AI to query the WOS specification with high precision, mapping requirements to specific chapters, understanding the layered processing model, and resolving inter-spec dependencies across the four vertical layers.

---

## Architectural Navigation (The Four Layers)

WOS is organized into a four-layer vertical stack. Each layer targets a "Kernel Document" via a sidecar pattern.

| Layer | Name | Primary Spec (canonical) | Primary Schema | Key Seams |
|-------|------|--------------------------|----------------|-----------|
| **L0** | **Kernel** | `wos-spec/specs/kernel/spec.md` | `wos-spec/schemas/kernel/wos-kernel.schema.json` | `topology`, `caseState`, `actorModel` |
| **L1** | **Governance** | `wos-spec/specs/governance/workflow-governance.md` | `wos-spec/schemas/governance/wos-workflow-governance.schema.json` | `lifecycleHook`, `contractHook`, `provenanceLayer` |
| **L2** | **AI Integration** | `wos-spec/specs/ai/ai-integration.md` | `wos-spec/schemas/ai/wos-ai-integration.schema.json` | `actorExtension`, `deonticConstraints`, `autonomyLevels` |
| **L3** | **Advanced** | `wos-spec/specs/advanced/advanced-governance.md` | `wos-spec/schemas/advanced/wos-advanced.schema.json` | `constraintZones` (DCR), `equityGuardrails` |

### Sidecars, profiles, and companions
- **Sidecars:** `PolicyParameters`, `BusinessCalendar`, `NotificationTemplate`, plus kernel-adjacent metadata sidecars.
- **Profiles:** `Integration`, `Semantic`, and `Signature` parallel seam documents.
- **Runtime companion:** execution model for layered evaluation (`specs/companions/runtime.md`).
- **Tooling schemas:** conformance traces, MCP tool catalog, lint diagnostics, synth traces.

---

## Decision Tree: Where to Look

1. **Topology, state, or basic actors?** → `wos-spec/specs/kernel/spec.md` (see [kernel.md](references/kernel.md))
2. **Due process, protocols, or human governance?** → `wos-spec/specs/governance/workflow-governance.md` (see [governance.md](references/governance.md))
3. **Agents, autonomy, or deontic constraints?** → `wos-spec/specs/ai/ai-integration.md` (see [ai-integration.md](references/ai-integration.md))
4. **DCR zones, verification, or fairness?** → `wos-spec/specs/advanced/advanced-governance.md` (see [advanced-governance.md](references/advanced-governance.md))
5. **Processor behavior or evaluation order?** → `wos-spec/specs/companions/runtime.md` (see [runtime.md](references/runtime.md))
6. **Temporal parameters?** → `wos-spec/specs/governance/policy-parameters.md` (see [policy-parameters.md](references/policy-parameters.md))
7. **SLAs, calendars, holds?** → `wos-spec/specs/sidecars/business-calendar.md` and governance service-level material in `workflow-governance.md`
8. **Assurance posture (separate from impact level)?** → `wos-spec/specs/assurance/assurance.md` (see [assurance.md](references/assurance.md))
9. **Extension discovery?** → `wos-spec/specs/registry/extension-registry.md` (see [extension-registry.md](references/extension-registry.md))

---

## Cross-Tier Integration Points (The Seams)

| Seam ID | Definition Spec | Consumed By | Semantics |
|---------|-----------------|-------------|-----------|
| `lifecycleHook` | Kernel §10.4 | All (L1–L3) | Logic triggered by transition tags (for example `determination`, `adverse-decision`). |
| `contractHook` | Kernel §10.2 | L1, L2 | Data validation pipelines and Formspec-as-validator cages. |
| `provenanceLayer` | Kernel §10.3 | All | Extension of Facts tier with Reasoning (L1), Counterfactual (L1), and Narrative (L2). |
| `actorExtension` | Kernel §10.1 | L2, L3 | Transformation of `actor` types into `agent` with registration and lifecycle. |
| `extensions` | Kernel §10.5 | L3 | Attachment of DCR Constraint Zones to compound states. |

---

## Reference Maps (LLM quick-links)

### Specification section maps

- [advanced-governance.md](references/advanced-governance.md) — canonical `wos-spec/specs/advanced/advanced-governance.md`
- [agent-config.md](references/agent-config.md) — canonical `wos-spec/specs/ai/agent-config.md`
- [ai-integration.md](references/ai-integration.md) — canonical `wos-spec/specs/ai/ai-integration.md`
- [assertion-library.md](references/assertion-library.md) — canonical `wos-spec/specs/governance/assertion-library.md`
- [assurance.md](references/assurance.md) — canonical `wos-spec/specs/assurance/assurance.md`
- [business-calendar.md](references/business-calendar.md) — canonical `wos-spec/specs/sidecars/business-calendar.md`
- [correspondence-metadata.md](references/correspondence-metadata.md) — canonical `wos-spec/specs/kernel/correspondence-metadata.md`
- [custody-hook-encoding.md](references/custody-hook-encoding.md) — canonical `wos-spec/specs/kernel/custody-hook-encoding.md`
- [drift-monitor.md](references/drift-monitor.md) — canonical `wos-spec/specs/ai/drift-monitor.md`
- [due-process-config.md](references/due-process-config.md) — canonical `wos-spec/specs/governance/due-process-config.md`
- [equity-config.md](references/equity-config.md) — canonical `wos-spec/specs/advanced/equity-config.md`
- [extension-registry.md](references/extension-registry.md) — canonical `wos-spec/specs/registry/extension-registry.md`
- [governance.md](references/governance.md) — canonical `wos-spec/specs/governance/workflow-governance.md`
- [integration.md](references/integration.md) — canonical `wos-spec/specs/profiles/integration.md`
- [kernel.md](references/kernel.md) — canonical `wos-spec/specs/kernel/spec.md`
- [lifecycle-detail.md](references/lifecycle-detail.md) — canonical `wos-spec/specs/companions/lifecycle-detail.md`
- [notification-template.md](references/notification-template.md) — canonical `wos-spec/specs/sidecars/notification-template.md`
- [policy-parameters.md](references/policy-parameters.md) — canonical `wos-spec/specs/governance/policy-parameters.md`
- [runtime.md](references/runtime.md) — canonical `wos-spec/specs/companions/runtime.md`
- [semantic.md](references/semantic.md) — canonical `wos-spec/specs/profiles/semantic.md`
- [signature.md](references/signature.md) — canonical `wos-spec/specs/profiles/signature.md`
- [verification-report.md](references/verification-report.md) — canonical `wos-spec/specs/advanced/verification-report.md`

### Schema property maps

- [conformance-trace.schema.json → references/schemas/conformance-trace.md](references/schemas/conformance-trace.md) — `wos-spec/schemas/conformance/conformance-trace.schema.json`
- [wos-advanced.schema.json → references/schemas/advanced.md](references/schemas/advanced.md) — `wos-spec/schemas/advanced/wos-advanced.schema.json`
- [wos-agent-config.schema.json → references/schemas/agent-config.md](references/schemas/agent-config.md) — `wos-spec/schemas/ai/wos-agent-config.schema.json`
- [wos-ai-integration.schema.json → references/schemas/ai-integration.md](references/schemas/ai-integration.md) — `wos-spec/schemas/ai/wos-ai-integration.schema.json`
- [wos-assertion-gate.schema.json → references/schemas/assertion-gate.md](references/schemas/assertion-gate.md) — `wos-spec/schemas/governance/wos-assertion-gate.schema.json`
- [wos-assurance.schema.json → references/schemas/assurance.md](references/schemas/assurance.md) — `wos-spec/schemas/assurance/wos-assurance.schema.json`
- [wos-business-calendar.schema.json → references/schemas/business-calendar.md](references/schemas/business-calendar.md) — `wos-spec/schemas/sidecars/wos-business-calendar.schema.json`
- [wos-case-instance.schema.json → references/schemas/case-instance.md](references/schemas/case-instance.md) — `wos-spec/schemas/companions/wos-case-instance.schema.json`
- [wos-correspondence-metadata.schema.json → references/schemas/correspondence-metadata.md](references/schemas/correspondence-metadata.md) — `wos-spec/schemas/kernel/wos-correspondence-metadata.schema.json`
- [wos-custody-hook-encoding.schema.json → references/schemas/custody-hook-encoding.md](references/schemas/custody-hook-encoding.md) — `wos-spec/schemas/kernel/wos-custody-hook-encoding.schema.json`
- [wos-drift-monitor.schema.json → references/schemas/drift-monitor.md](references/schemas/drift-monitor.md) — `wos-spec/schemas/ai/wos-drift-monitor.schema.json`
- [wos-due-process.schema.json → references/schemas/due-process.md](references/schemas/due-process.md) — `wos-spec/schemas/governance/wos-due-process.schema.json`
- [wos-equity.schema.json → references/schemas/equity.md](references/schemas/equity.md) — `wos-spec/schemas/advanced/wos-equity.schema.json`
- [wos-extension-registry.schema.json → references/schemas/extension-registry.md](references/schemas/extension-registry.md) — `wos-spec/schemas/registry/wos-extension-registry.schema.json`
- [wos-integration-profile.schema.json → references/schemas/integration-profile.md](references/schemas/integration-profile.md) — `wos-spec/schemas/profiles/wos-integration-profile.schema.json`
- [wos-kernel.schema.json → references/schemas/kernel.md](references/schemas/kernel.md) — `wos-spec/schemas/kernel/wos-kernel.schema.json`
- [wos-lifecycle-detail.schema.json → references/schemas/lifecycle-detail.md](references/schemas/lifecycle-detail.md) — `wos-spec/schemas/companions/wos-lifecycle-detail.schema.json`
- [wos-lint-diagnostic.schema.json → references/schemas/lint-diagnostic.md](references/schemas/lint-diagnostic.md) — `wos-spec/schemas/lint/wos-lint-diagnostic.schema.json`
- [wos-mcp-tools.schema.json → references/schemas/mcp-tools.md](references/schemas/mcp-tools.md) — `wos-spec/schemas/mcp/wos-mcp-tools.schema.json`
- [wos-notification-template.schema.json → references/schemas/notification-template.md](references/schemas/notification-template.md) — `wos-spec/schemas/sidecars/wos-notification-template.schema.json`
- [wos-policy-parameters.schema.json → references/schemas/policy-parameters.md](references/schemas/policy-parameters.md) — `wos-spec/schemas/governance/wos-policy-parameters.schema.json`
- [wos-provenance-record.schema.json → references/schemas/provenance-record.md](references/schemas/provenance-record.md) — `wos-spec/schemas/kernel/wos-provenance-record.schema.json`
- [wos-semantic-profile.schema.json → references/schemas/semantic-profile.md](references/schemas/semantic-profile.md) — `wos-spec/schemas/profiles/wos-semantic-profile.schema.json`
- [wos-signature-profile.schema.json → references/schemas/signature-profile.md](references/schemas/signature-profile.md) — `wos-spec/schemas/profiles/wos-signature-profile.schema.json`
- [wos-synth-trace.schema.json → references/schemas/synth-trace.md](references/schemas/synth-trace.md) — `wos-spec/schemas/synth/wos-synth-trace.schema.json`
- [wos-verification-report.schema.json → references/schemas/verification-report.md](references/schemas/verification-report.md) — `wos-spec/schemas/advanced/wos-verification-report.schema.json`
- [wos-workflow-governance.schema.json → references/schemas/governance.md](references/schemas/governance.md) — `wos-spec/schemas/governance/wos-workflow-governance.schema.json`

---

## Complete file map (`wos-spec`)

Each row links the canonical on-disk source to its generated reference navigator.

| Area | Kind | Source | Reference map |
|------|------|--------|---------------|
| L3: Advanced | Spec | `wos-spec/specs/advanced/advanced-governance.md` | [Section map](references/advanced-governance.md) |
| L3: Advanced | Spec | `wos-spec/specs/advanced/equity-config.md` | [Section map](references/equity-config.md) |
| L3: Advanced | Spec | `wos-spec/specs/advanced/verification-report.md` | [Section map](references/verification-report.md) |
| L2: AI Integration | Spec | `wos-spec/specs/ai/agent-config.md` | [Section map](references/agent-config.md) |
| L2: AI Integration | Spec | `wos-spec/specs/ai/ai-integration.md` | [Section map](references/ai-integration.md) |
| L2: AI Integration | Spec | `wos-spec/specs/ai/drift-monitor.md` | [Section map](references/drift-monitor.md) |
| Assurance | Spec | `wos-spec/specs/assurance/assurance.md` | [Section map](references/assurance.md) |
| Companions | Spec | `wos-spec/specs/companions/lifecycle-detail.md` | [Section map](references/lifecycle-detail.md) |
| Companions | Spec | `wos-spec/specs/companions/runtime.md` | [Section map](references/runtime.md) |
| L1: Governance | Spec | `wos-spec/specs/governance/assertion-library.md` | [Section map](references/assertion-library.md) |
| L1: Governance | Spec | `wos-spec/specs/governance/due-process-config.md` | [Section map](references/due-process-config.md) |
| L1: Governance | Spec | `wos-spec/specs/governance/policy-parameters.md` | [Section map](references/policy-parameters.md) |
| L1: Governance | Spec | `wos-spec/specs/governance/workflow-governance.md` | [Section map](references/governance.md) |
| L0: Kernel | Spec | `wos-spec/specs/kernel/correspondence-metadata.md` | [Section map](references/correspondence-metadata.md) |
| L0: Kernel | Spec | `wos-spec/specs/kernel/custody-hook-encoding.md` | [Section map](references/custody-hook-encoding.md) |
| L0: Kernel | Spec | `wos-spec/specs/kernel/spec.md` | [Section map](references/kernel.md) |
| Profiles | Spec | `wos-spec/specs/profiles/integration.md` | [Section map](references/integration.md) |
| Profiles | Spec | `wos-spec/specs/profiles/semantic.md` | [Section map](references/semantic.md) |
| Profiles | Spec | `wos-spec/specs/profiles/signature.md` | [Section map](references/signature.md) |
| Extension registry | Spec | `wos-spec/specs/registry/extension-registry.md` | [Section map](references/extension-registry.md) |
| Sidecars | Spec | `wos-spec/specs/sidecars/business-calendar.md` | [Section map](references/business-calendar.md) |
| Sidecars | Spec | `wos-spec/specs/sidecars/notification-template.md` | [Section map](references/notification-template.md) |
| L3: Advanced | Schema | `wos-spec/schemas/advanced/wos-advanced.schema.json` | [Property map](references/schemas/advanced.md) |
| L3: Advanced | Schema | `wos-spec/schemas/advanced/wos-equity.schema.json` | [Property map](references/schemas/equity.md) |
| L3: Advanced | Schema | `wos-spec/schemas/advanced/wos-verification-report.schema.json` | [Property map](references/schemas/verification-report.md) |
| L2: AI Integration | Schema | `wos-spec/schemas/ai/wos-agent-config.schema.json` | [Property map](references/schemas/agent-config.md) |
| L2: AI Integration | Schema | `wos-spec/schemas/ai/wos-ai-integration.schema.json` | [Property map](references/schemas/ai-integration.md) |
| L2: AI Integration | Schema | `wos-spec/schemas/ai/wos-drift-monitor.schema.json` | [Property map](references/schemas/drift-monitor.md) |
| Assurance | Schema | `wos-spec/schemas/assurance/wos-assurance.schema.json` | [Property map](references/schemas/assurance.md) |
| Companions | Schema | `wos-spec/schemas/companions/wos-case-instance.schema.json` | [Property map](references/schemas/case-instance.md) |
| Companions | Schema | `wos-spec/schemas/companions/wos-lifecycle-detail.schema.json` | [Property map](references/schemas/lifecycle-detail.md) |
| Conformance tooling | Schema | `wos-spec/schemas/conformance/conformance-trace.schema.json` | [Property map](references/schemas/conformance-trace.md) |
| L1: Governance | Schema | `wos-spec/schemas/governance/wos-assertion-gate.schema.json` | [Property map](references/schemas/assertion-gate.md) |
| L1: Governance | Schema | `wos-spec/schemas/governance/wos-due-process.schema.json` | [Property map](references/schemas/due-process.md) |
| L1: Governance | Schema | `wos-spec/schemas/governance/wos-policy-parameters.schema.json` | [Property map](references/schemas/policy-parameters.md) |
| L1: Governance | Schema | `wos-spec/schemas/governance/wos-workflow-governance.schema.json` | [Property map](references/schemas/governance.md) |
| L0: Kernel | Schema | `wos-spec/schemas/kernel/wos-correspondence-metadata.schema.json` | [Property map](references/schemas/correspondence-metadata.md) |
| L0: Kernel | Schema | `wos-spec/schemas/kernel/wos-custody-hook-encoding.schema.json` | [Property map](references/schemas/custody-hook-encoding.md) |
| L0: Kernel | Schema | `wos-spec/schemas/kernel/wos-kernel.schema.json` | [Property map](references/schemas/kernel.md) |
| L0: Kernel | Schema | `wos-spec/schemas/kernel/wos-provenance-record.schema.json` | [Property map](references/schemas/provenance-record.md) |
| Lint tooling | Schema | `wos-spec/schemas/lint/wos-lint-diagnostic.schema.json` | [Property map](references/schemas/lint-diagnostic.md) |
| MCP tooling | Schema | `wos-spec/schemas/mcp/wos-mcp-tools.schema.json` | [Property map](references/schemas/mcp-tools.md) |
| Profiles | Schema | `wos-spec/schemas/profiles/wos-integration-profile.schema.json` | [Property map](references/schemas/integration-profile.md) |
| Profiles | Schema | `wos-spec/schemas/profiles/wos-semantic-profile.schema.json` | [Property map](references/schemas/semantic-profile.md) |
| Profiles | Schema | `wos-spec/schemas/profiles/wos-signature-profile.schema.json` | [Property map](references/schemas/signature-profile.md) |
| Extension registry | Schema | `wos-spec/schemas/registry/wos-extension-registry.schema.json` | [Property map](references/schemas/extension-registry.md) |
| Sidecars | Schema | `wos-spec/schemas/sidecars/wos-business-calendar.schema.json` | [Property map](references/schemas/business-calendar.md) |
| Sidecars | Schema | `wos-spec/schemas/sidecars/wos-notification-template.schema.json` | [Property map](references/schemas/notification-template.md) |
| Synth tooling | Schema | `wos-spec/schemas/synth/wos-synth-trace.schema.json` | [Property map](references/schemas/synth-trace.md) |

---

## Normative Rules for LLM Reasoning

1. **Layered evaluation:** WOS is not additive; it is a layered sieve. A processor MUST evaluate L0 (if safe), then apply L1 filters, then L2 agents under L1 constraints.
2. **Sidecar binding:** Sidecars bind to the Kernel Document URL. If the URL does not match, the sidecar is ignored.
3. **Trust boundary:** AI agents (L2) are always outside the trust boundary. The WOS processor enforces constraints; the agent cannot weaken them.
4. **Semantic tags:** Logic in L1/L2 attaches to kernel tags (`determination`, `review`), not transition IDs, so governance survives topology changes.
5. **Formspec-as-validator:** Agent output is untrusted input. WOS MUST NOT implement custom validation if it can be expressed as a Formspec contract.
6. **Impact level caps:** Effective autonomy (L2) is capped by kernel `impactLevel`. `rights-impacting` defaults to `assistive`.
