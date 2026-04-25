# ADR 0074: WOS Governed Output-Commit Pipeline

**Status:** Proposed
**Date:** 2026-04-24
**Scope:** WOS — Kernel (Layer 0) + AI Integration (Layer 2) + Governance (Layer 1) + Runtime Companion
**Related:** [ADR 0073 (case initiation and intake handoff)](./0073-stack-case-initiation-and-intake-handoff.md); [ADR 0072 (evidence integrity and attachment binding)](./0072-stack-evidence-integrity-and-attachment-binding.md); [ADR 0070 (failure and compensation)](./0070-stack-failure-and-compensation.md); [ADR 0076 (artifact taxonomy)](./0076-artifact-taxonomy.md); [ADR 0077 (canonical kernel extension seams)](./0077-canonical-kernel-extension-seams.md); WOS Kernel spec (`wos-spec/specs/kernel/spec.md`, §4.4 fork/join, §5.4 mutation history, §9.2 action declarations, §9.4 correlation keys, §9.7 timeout categories, §10 seam enumeration); WOS AI Integration spec (`wos-spec/specs/ai/ai-integration.md`, §3.3 `CapabilityDeclaration`, §8 fallback); WOS Runtime Companion (`wos-spec/specs/companions/runtime.md`, §5.4 service invocation execution, §15 Formspec coprocessor); kernel provenance schema (`wos-spec/schemas/kernel/wos-provenance-record.schema.json`, `$defs/FactsTierRecord`, `$defs/MutationSource`, `$defs/VerificationLevel`); prior analysis context: [counter-proposal disposition §Wave 0](../../wos-spec/counter-proposal-disposition.md) and [standards absorption gap analysis §Refactor Target #2](../../wos-spec/thoughts/2026-04-24-standards-absorption-gap-analysis.md)

## Context

Five WOS surfaces write to the case file as a side effect of external work:

1. **Agent output** — an L2 `CapabilityDeclaration` invocation returns structured data that a processor projects into case fields.
2. **Service response** — a Kernel §9.2 `invokeService` action returns a payload whose fields map into the case file. Execution semantics live in Runtime Companion §5.4 today; ADR 0076 sequences §5.4 prose into Kernel §9.2.
3. **Event payload** — an external callback routed by `correlationKey` (Kernel §9.4) and bounded by `signalTimeout` (Kernel §9.7) accepts a payload and projects its body into case data. Signal/message wait is a usage pattern over those two mechanisms; the kernel does not name a dedicated wait section.
4. **Human task action** — a Runtime Companion §15 Formspec-backed task submits a validated Response and projects via `responseMappingRef` (§15.3, §15.5). The forward-looking `taskActions` shape (counter-proposal Wave 3) generalizes that projection to non-Formspec respondent inputs.
5. **Parallel branch result** — Kernel §4.4 fork/join joins per-branch outputs into one case-file projection. The `mergeStrategy` + `collectPath` shape (Wave 4 absorption target) does not yet exist in kernel prose or schema.

Every one of those surfaces does the same job: validate an untrusted payload against a named contract, gate the write against an allowed scope, project it into case fields, and record what happened. Today each surface is (or is about to be) designed independently. Agent output has `outputContractRef` + `outputBindings`. `invokeService` will gain its own response contract + bindings. Event wait will grow `eventContract` + `eventOutputBindings`. Human task projection will grow `taskActions` beyond `responseMappingRef`'s Formspec scope. Parallel will grow `mergeStrategy` + `collectPath`. Five shapes for one abstraction.

Two thinking documents converged independently on the same insight. The counter-proposal disposition named "Wave 0 — unified declarative output-commit pipeline" as the cross-cutting pattern that all Wave 2–4 items instantiate. The standards-absorption gap analysis named "Refactor Target #2 — Governed output commit" as one of three shared abstractions that absorb BPMN/CMMN/WS-HumanTask operational surfaces without growing extension surface. Both reached the same decomposition (inputs, allowed write scope, `mutationSource`, `verificationLevel`, validated mutation + provenance output) from opposite starting points. That convergence is the ratification signal this ADR captures.

If each surface ships its own binding shape, lint vocabulary, provenance emission, and write-scope gate, WOS accrues four parallel artifacts for one pattern and then needs a consolidation pass later. Processor authors must reimplement the same validate-gate-project-record loop five times. Governance-profile authors must attach write policies (who may write which paths) to five different surfaces. Audit readers must learn five provenance shapes for one semantic event.

## Decision

**Every external-work surface in WOS routes case-file mutations through one governed output-commit pipeline.** The pipeline is the canonical abstraction; each surface supplies the pipeline's inputs in its surface-specific shape and receives the pipeline's outputs in one uniform form. The pipeline's base semantics (validate → gate → project → record) are kernel-level (Layer 0) and apply to every conformant processor. Per-surface policy attachments (write-scope rules, verification-level requirements per impact tier, per-actor authority) attach via the Layer 1 Governance Document at the existing `lifecycleHook` seam; a kernel-only deployment runs the pipeline shape with policy fields absent.

### D-1. Pipeline inputs (what every surface supplies)

The pipeline takes six inputs. Every external-work surface supplies all six; only the binding-map field name and the contract-ref field name vary per surface.

1. **Actor or action output** — the untrusted payload to be committed. Agent result, service response body, event payload, human task action payload, parallel branch result.
2. **Contract ref** — the schema the payload MUST validate against before any projection. `outputContractRef` on L2 `CapabilityDeclaration`; on a `invokeService` action (Kernel §9.2 declaration; Runtime §5.4 execution) a service response contract; on signal/message wait a contract paired with `correlationKey` (§9.4) and `signalTimeout` (§9.7); on a Runtime §15 task the pinned Formspec Definition; on a Kernel §4.4 parallel branch a per-branch contract. Content-addressable refs are preferred over inline schemas so `verificationLevel` and Trellis custody anchoring compare cleanly across invocations.
3. **Output bindings** — the projection map from validated payload paths to case-file field paths. `outputBindings` on agent + service, `eventOutputBindings` on event wait, `responseMappingRef` (today) and `taskActions` (Wave 3) on human task, `collectPath` on parallel `mergeStrategy: "collect"` (Wave 4).
4. **Allowed write scope** — the closed list of case-file paths this surface invocation may write. Human tasks constrain to the task's editable surface (today via Mapping document; Wave 3 via `taskActions` `editableFields`). Agents constrain to the capability's registered write scope. Services, events, and parallel merges constrain to their declared binding targets. The pipeline MUST reject any projection that would write a path outside this scope — no silent clamp, no truncation. A projection that escapes scope is a lint failure at authoring time and a processor rejection at runtime.
5. **`mutationSource` value** — origin of the value. Reserved literals: `human-entered` | `human-corrected` | `agent-extracted` | `system-fetched` | `computed` | `self-attested`. Vendor extensions MUST use the `x-` prefix. One value per mutation. Supplied by the surface: `agent-extracted` for L2 capability output, `system-fetched` for `invokeService` response and signal/message payload, `human-entered` or `human-corrected` for task actions, `computed` for parallel-merge derived values, `self-attested` for respondent-affirmed intake paths. Renamed from FlowSpec's `ai-extracted` to `agent-extracted` for WOS actor-vocabulary alignment.
6. **`verificationLevel` value** — degree of independent confirmation. Reserved literals: `independent` | `attested` | `corroborated` | `authoritative`. Vendor extensions MUST use the `x-` prefix. OPTIONAL at L0; governance profiles MAY require a minimum level on `determination`-tagged transitions.

`mutationSource` and `verificationLevel` are open enums by construction: the kernel provenance schema declares each as `oneOf [enum-of-reserved-literals | pattern: ^x-[a-z][a-z0-9-]*$]` with `"x-wos": {"open-enum": true}` (`wos-provenance-record.schema.json` `$defs/MutationSource`, `$defs/VerificationLevel`). A vendor adds `x-vendor-batch-import` or `x-vendor-quota-confirmed` with no schema change. The reserved-literal set is closed; the extension surface is the standard `x-` prefix.

### D-2. Pipeline outputs (what every surface receives back)

The pipeline emits two artifacts per invocation:

1. **Validated case mutations.** Applied atomically to the case file under kernel append-only mutation semantics (Kernel §5.4). Either all bindings apply or none do; partial commit is forbidden. A contract-validation failure, a write-scope violation, or a value-coercion failure fails the whole projection and emits no mutations.
2. **Provenance records.** One Facts-tier mutation record per applied mutation (Kernel §5.4; schema `$defs/FactsTierRecord` in `wos-provenance-record.schema.json`). Each carries the field path, previous value, new value, `mutationSource`, optional `verificationLevel`, actor ref, contract ref, and the originating transition id. Failures emit a rejection record under existing failure-and-compensation rules (ADR 0070) — the surface does not silently drop or retry the untrusted payload.

### D-3. Reuse targets (where each surface plugs in)

Five surfaces become instances of one pipeline. No new seam is introduced; each surface attaches via existing Kernel §10 hooks (`contractHook` for validation, `provenanceLayer` for record emission, `lifecycleHook` for transition-tagged policy attachment).

| Surface | Status | Spec section | Contract field | Bindings field | Default `mutationSource` |
|---|---|---|---|---|---|
| Agent output | current | AI Integration §3.3 (`CapabilityDeclaration`) | `outputContractRef` | `outputBindings` | `agent-extracted` |
| Service response | partial — declaration current, response-contract field future (Wave 2) | Kernel §9.2 (declaration) + Runtime §5.4 (execution; absorbs into Kernel §9.2 under ADR 0076) | service response contract (Wave 2) | `outputBindings` (Wave 2) | `system-fetched` |
| Event payload | future (Wave 2) | Kernel §9.4 (`correlationKey`) + Kernel §9.7 (`signalTimeout`) | `eventContract` (Wave 2) | `eventOutputBindings` (Wave 2) | `system-fetched` |
| Human task action | partial — Formspec coprocessor current, generalized `taskActions` future (Wave 3) | Runtime §15 (`responseMappingRef` today; `taskActions` Wave 3) | Formspec definition pin (today); ContractReference (`taskActions`) | `responseMappingRef` (today); `taskActions` (Wave 3) | `human-entered` (or `human-corrected` on overrides) |
| Parallel branch | future (Wave 4) | Kernel §4.4 (fork/join) | per-branch contract (Wave 4) | `mergeStrategy` + `collectPath` (Wave 4) | `computed` |

Three of five surfaces are forward-looking: their contract and bindings fields land in their Wave under the pipeline shape this ADR ratifies. Surface-specific authority rules (who may write, how deep the write scope runs, which verification levels are acceptable) remain per-surface and attach through governance-layer policy. The pipeline shape is shared; the policy is per-surface.

### D-4. Spec changes to land

The pipeline ships through documentation and reserved-literal work, not new schema fields. Both shipped under counter-proposal Wave 1.

1. **Kernel §5.4 cross-reference table.** `mutationSource` and `verificationLevel` already exist as OPTIONAL fields on `$defs/FactsTierRecord` in `wos-provenance-record.schema.json` with open-enum `oneOf` shapes referencing `$defs/MutationSource` and `$defs/VerificationLevel`. Wave 1 extends Kernel §5.4 prose with a per-surface defaults table that points at AI Integration §3.3, Kernel §9.2 (with cross-reference to Runtime §5.4 until ADR 0076 absorbs it), Kernel §9.4 + §9.7, Runtime §15, and Kernel §4.4 for surface-specific reuse targets. No schema field is added; existing fixtures remain valid.
2. **Reserved `recordKind` literals.** `recordKind` on `FactsTierRecord` is an open discriminator string with no enum constraint. Wave 1 reserves two new literals in Kernel §5.4 / §8 prose: `capabilityQuarantined` (a capability invocation was held for authorized-actor reset after a contract-validation failure the surface policy flagged as non-retryable) and `capabilityOutputInvalidated` (a previously-committed capability output was superseded by later evidence). Reservation is a normative-prose act: the kernel names the literal, defines the shape constraint, and bans collisions. Processor semantics for these record kinds land in counter-proposal Wave 4 under AI Integration §8 extensions. Separating the literal reservation from the behavior preserves the kernel's schema-first sequencing.

No changes are required to `wos-ai-integration.schema.json`, `wos-workflow-governance.schema.json`, or the Runtime Companion schema as part of this ADR. Their surface-specific binding fields land in their respective absorption waves (Waves 2–4) with the pipeline shape this ADR ratifies.

### D-5. Non-goals

This ADR does **not**:

- **Change statechart topology.** Kernel §4 nested states, parallel regions, and transition semantics are untouched. The pipeline is a processor abstraction for side effects on transitions, not a new state shape.
- **Adopt FlowSpec's flat `nodes[] / edges[]` form.** Hierarchical statechart remains authoritative; LLM-authorability is not a pipeline concern.
- **Invent new seams.** The pipeline attaches at three of the six canonical Kernel §10 seams enumerated in ADR 0077 (`contractHook`, `provenanceLayer`, `lifecycleHook`). The named-seams invariant (WOS `CLAUDE.md` decision heuristic 3) holds.
- **Define surface-specific policy.** Who may write which paths, which verification levels are required for rights-impacting transitions, and which `mutationSource` values are acceptable on which surfaces remain governance-layer concerns attached at `lifecycleHook` per surface.
- **Replace Trellis custody.** Provenance records flow out of the pipeline into the standard exporter path (`wos-export` → `custodyHook` → Trellis). The pipeline emits; Trellis anchors.

## Consequences

**Positive.**

- Wave 2–4 absorption items from the counter-proposal disposition land as instances of one pipeline rather than four parallel additions. `outputBindings` on `CapabilityDeclaration`, `retryPolicy` on `invokeService`, `eventContract` + `eventOutputBindings` on signal/message wait, `taskActions` on Runtime §15, and `mergeStrategy` + `collectPath` on parallel states all share the same input/output contract.
- One provenance shape (`FactsTierRecord` with `mutationSource` + `verificationLevel`) covers every external-work write. Audit readers learn one record, not five.
- Governance profiles attach write policy (scope, verification level, actor authority) at one abstraction point through `lifecycleHook`. A rule like "`verificationLevel` MUST be `independent` on all mutations from `determination`-tagged transitions" applies uniformly across agent, service, event, task, and parallel surfaces.
- Future external-work surfaces default to this pipeline. A new capability kind (e.g. a federated-inference adapter) supplies contract + bindings + scope + source; it does not reinvent the validation and emission loop.
- Closes the FlowSpec §4.4 `provenance` enum absorption target with a WOS-native vocabulary (`agent-extracted` actor-aligned, `self-attested` added for respondent intake paths).

**Negative.**

- Five surfaces must converge their authoring shapes during Waves 2–4. Any surface landed ahead of the pipeline must be re-fit. Counter-proposal wave sequencing (documentation + literal reservation in Wave 1, behavior in Waves 2–4) assumes no surface ships its bindings before the kernel cross-reference table and reserved literals land.
- The reserved-literal set for `mutationSource` and `verificationLevel` is closed (the open-enum surface is the `x-` prefix). Adding a seventh reserved `mutationSource` literal that all conformant processors must understand requires a kernel spec revision; vendor-specific labels do not, because they belong in `x-` extensions and pass through unchanged.
- Lint must grow write-scope-violation rules per surface. A pipeline that rejects out-of-scope writes at runtime is a correctness floor; lint catching the same violation at authoring time is a usability requirement the counter-proposal disposition's §5.2 invariant already implies but does not yet enforce.
- The pipeline does not prescribe coercion rules for payload→case-field projections. Type mismatches (a capability returns a string where the case field expects a number) fail the projection atomically. Surfaces that want lenient coercion must declare it in their binding map, not in the pipeline. This is deliberate — silent coercion is how rival write-scope meanings appear — but authoring ergonomics will need to document the failure modes.

**Neutral.**

- Transport of the payload (HTTP response, queue message, durable activity result, in-process return value) is adapter territory. The pipeline sees a validated payload; it does not see the wire.
- Whether a projection fires inline with the transition or asynchronously (e.g. a parallel branch that gathers over time) is a surface-specific concern. The pipeline is surface-neutral on timing; it is not neutral on atomicity of the commit once invoked.

## Implementation plan

The pipeline lands in one structural pass on the `kernel-restructure` branch governed by ADR 0076. Kernel cross-reference prose, per-surface bindings, lint rules, and runtime conformance ship together. Each surface supplies its six pipeline inputs in its surface-specific shape and emits the two pipeline outputs through the existing Facts-tier mutation record path.

**Kernel prose and reserved literals.**

- Per-surface defaults table in Kernel §5.4 normative prose. The table cites `mutationSource` and `verificationLevel` as already-OPTIONAL fields on `FactsTierRecord` (schema `wos-provenance-record.schema.json`), restates the open-enum semantics (`oneOf [reserved literals | x- pattern]`), and points readers at AI Integration §3.3, Kernel §9.2 (with cross-reference to Runtime §5.4 until ADR 0076 absorbs §5.4 prose into the kernel), Kernel §9.4 + §9.7, Runtime §15, and Kernel §4.4 for per-surface defaults. No schema change.
- Reserved `recordKind` literals `capabilityQuarantined` and `capabilityOutputInvalidated` in Kernel §5.4 / §8 prose. Each literal's shape constraint is defined normatively; the discriminator is `type: string` with no enum, so reservation is prose, not a schema enum extension.
- Kernel §10 seam prose states that `contractHook`, `provenanceLayer`, and `lifecycleHook` together carry the output-commit pipeline; no new seam is declared. Reference ADR 0077 for the canonical six-seam enumeration.
- Conformance fixtures: at least one fixture per `mutationSource` reserved literal proving the kernel round-trips the value through a Facts-tier mutation record emission, plus at least one fixture proving an `x-vendor-*` extension value round-trips unchanged.

**Per-surface bindings.**

- `outputBindings` + `inputBindings` on `CapabilityDeclaration` (AI Integration §3.3).
- `eventContract` + `retryPolicy` on `invokeService` (Kernel §9.2 declaration; Runtime §5.4 execution, absorbed into kernel under ADR 0076) and on signal/message wait substates routed by `correlationKey` (Kernel §9.4) with `signalTimeout` (Kernel §9.7).
- `taskActions` on the Runtime Companion §15 Formspec coprocessor surface, generalizing `responseMappingRef` to non-Formspec respondent inputs.
- `mergeStrategy` + `collectPath` on parallel-state join (Kernel §4.4).
- Processor semantics for `capabilityQuarantined` and `capabilityOutputInvalidated` under AI Integration §8.

**Lint.**

- Write-scope-violation rule per surface: `outputBindings` target paths MUST fall within the capability's registered write scope; `taskActions` fields MUST fall within the task's editable surface; event and service bindings MUST fall within their declared projection scope; parallel `collectPath` MUST fall within the parallel region's declared merge scope.
- `mutationSource` default rule per surface: lint warns when a surface emits a `mutationSource` outside the D-3 default set without a `rationaleRef` (e.g. a capability emitting `human-corrected` requires an explicit rationale that a human override occurred).
- `verificationLevel` rule on rights-impacting transitions: governance profile lint MAY require a minimum `verificationLevel` on mutations emitted during `determination`-tagged transitions when the workflow's `impactLevel` is `rightsImpacting`.

**Runtime conformance (`wos-runtime` + `wos-formspec-binding`).**

- One `commit_external_output` function takes the six inputs and returns validated mutations + Facts-tier provenance records, replacing five per-surface commit implementations.
- Runtime conformance fixtures: at least one positive and one negative fixture per surface, where the negative fixture proves the write-scope gate rejects an out-of-scope projection.
- Three-way agreement: spec + in-memory reference adapter + production adapter (Restate) MUST all pass the same fixture set.

## Open questions

1. **Coercion policy.** Whether a single normative coercion table lives at the pipeline level (e.g. "string → number coerces under ISO-8601 number-string rules; otherwise fails") or each surface declares its own coercion stance. Default: per-surface, declared in the binding map. Revisit if Wave 4 surfaces need a shared coercion contract.

2. **`verificationLevel` requirement posture.** Whether `verificationLevel` becomes a MUST on `determination`-tagged transitions at L1 or remains a governance-profile requirement. Default: governance-profile. Elevating to L1 MUST would tighten rights-proportional claims but forces every kernel-only deployment to supply the value.

3. **Quarantine resume authorization.** Whether `capabilityQuarantined` reset authority is a kernel concept (e.g. role-tagged actor MUST be referenced in the resume provenance) or an AI Integration §8 concept (resume policy declared per capability). Default: AI Integration §8; the kernel reservation is neutral on who may reset, only on the fact that reset is provenance-recorded.

## Alternatives considered

**Ship each surface independently with its own binding shape.** Rejected. Produces four parallel artifacts for one pattern, forces processor authors to implement five variations of the same validate-gate-project-record loop, and forces governance profiles to attach policy at five different surfaces. Consolidation later is more expensive than consolidation first — every deployment that ships against the fragmented surfaces must migrate.

**Land the pipeline as a new kernel seam.** Rejected. Violates the named-seams invariant (WOS `CLAUDE.md` decision heuristic 3; ADR 0077 canonically enumerates six kernel seams). The pipeline attaches at three existing seams (`contractHook`, `provenanceLayer`, `lifecycleHook`); no new extension point is needed.

**Make `mutationSource` a fully open string with no reserved literals.** Rejected. Open strings without reserved-literal anchors are how vendor-specific sourcing labels end up shaping interoperable audit — every deployment invents its own value, cross-reader analysis breaks, and the field loses meaning. Open enum (closed reserved literals + `x-` extension pattern, declared in schema as `oneOf [enum | pattern]` with `"x-wos": {"open-enum": true}`) preserves the interoperable baseline while admitting vendor-specific labels.

**Collapse `mutationSource` and `verificationLevel` into one field.** Rejected. They answer different questions: `mutationSource` is "who produced this value?" and `verificationLevel` is "how was it verified before commit?". A human-entered value may be `independent` (caseworker independently assessed) or `attested` (respondent affirmed). An agent-extracted value may be `corroborated` (two agents agreed) or `authoritative` (upstream authority returned it). Flattening loses the cross-product.

**Put the pipeline in the Runtime Companion rather than the kernel.** Rejected. The pipeline's outputs (Facts-tier mutation records with `mutationSource` + `verificationLevel`) are kernel-grade processing-model content. Two conformant processors given the same inputs must emit the same mutation records — that is a kernel invariant per WOS `CLAUDE.md` Claim A. Splitting it across the Runtime Companion boundary would produce two sources of truth for the mutation shape.
