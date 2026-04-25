# ADR 0076: WOS Artifact Taxonomy - Collapse Profiles and Companions Into Tiers

**Status:** Proposed
**Date:** 2026-04-24
**Scope:** WOS internal - `wos-spec/specs/`, `wos-spec/schemas/`, `wos-spec/README.md`, `wos-spec/CLAUDE.md`
**Related:** [counter-proposal disposition §Artifact taxonomy](../../wos-spec/counter-proposal-disposition.md); [ADR 0063 (release trains by tier)](./0063-release-trains-by-tier.md); [ADR 0065 (WOS authoring stack mirrors Formspec)](./0065-wos-authoring-stack-mirrors-formspec.md); [ADR 0074 (WOS schema target structure)](./0074-wos-schema-target-structure.md); [ADR 0077 (canonical kernel extension seams)](./0077-canonical-kernel-extension-seams.md); [vision-model Q2-Q4](../../.claude/vision-model.md); [Formspec core + sidecar model](../../specs/core/spec.md)

## Context

WOS today organizes normative content across three artifact kinds:

- **Layers** (required kernel + optional tiers): kernel, governance, AI, advanced.
- **Profiles** (cross-cutting): Integration, Semantic, Signature.
- **Companions** (auxiliary): Runtime, Lifecycle Detail.

Formspec, the parent spec suite WOS mirrors (ADR 0065), organizes along one axis: core plus sidecars. Every optional spec is a sidecar attaching to core - Theme, Components, Mapping, Registry, Screener, Assist, Respondent Ledger, Intake Handoff all use the same artifact kind. New contributors learn one pattern.

WOS's three-kind split forces every author to first choose which artifact kind a piece of content belongs to before they can begin writing. The counter-proposal disposition (§Artifact taxonomy, 2026-04-24) flagged that this dimension "may carry cost without carrying meaning" and recommended investigating each profile and companion before Wave 2+ absorption work lands. If the map is not resolved first, the Wave 0 declarative-I/O pipeline distributes across four artifact homes (`taskActions` in Runtime Companion, `outputBindings` in AI Integration, `escalationLevels` in Governance, `mergeStrategy` in Kernel) for what is conceptually one abstraction - then requires a consolidation pass later.

WOS is pre-release. No production deployments, no release pin, no users. Structural refactors land freely without migration shims, deprecation windows, or compatibility wrappers.

"Done" means: each profile and companion has an explicit collapse-or-keep decision grounded in its content, a migration path if collapsing, and a taxonomy statement the README and CLAUDE.md can align to.

## Decision

Collapse the three-kind taxonomy to one kind (tiered sidecars) with targeted exceptions. Per-artifact calls below are grounded in readings of the source files.

### D-1. Runtime Companion - collapse into Kernel

**What the file contains:** `runtime.md` defines CaseInstance serialization (S3), the event delivery contract (S4), action execution ordering (S5), five durability guarantees G1-G5 (S6), timer precision (S7), deontic enforcement ordering (S8.3), explanation assembly (S9), evaluation modes including the 100-cycle convergence cap (S10), multi-version coexistence (S11), nine host interfaces (S12), engine-isolation security (S13), relationship-triggered event cascade depth cap (S14), and the 15-step Formspec coprocessor protocol (S15). The document itself states (§1.1) that the boundary test is: *does a difference in this behavior make two processors produce different observable outcomes?* If yes, it is normative.

**Call:** Collapse. The kernel's binding invariant - *"two conformant processors given the same kernel and the same events produce the same result"* (`CLAUDE.md` Claim A, Kernel §1) - cannot be checked against one authoritative source when half the processing model lives in a peer document. Runtime §4 (serial processing), §5 (action execution ordering), §6 (durability G1-G5), §8.3 (deontic enforcement ordering), §10 (convergence cap), §14.5 (cascade depth cap), and §15 (Formspec coprocessor) are all observable-outcome rules by the document's own test. Formspec keeps its processing model inside Core §6-§7, not in a peer document. WOS matches.

**Split exception:** S12 (host interfaces - nine traits like `InstanceStore`, `EventQueue`, `TaskPresenter`) and §13 (security model) describe host integration obligations, not observable outcomes. These are adapter-facing and move to an implementation appendix (`specs/kernel/appendix-host-interfaces.md`) or into the runtime crate's README. S7.4 (simulated time for conformance) likewise goes to the appendix.

### D-2. Lifecycle Detail Companion - collapse into Kernel chapters

**What the file contains:** `lifecycle-detail.md` provides the transition evaluation pseudocode (S2), history state semantics (S3 - shallow and deep), advanced parallel execution including region activation, event routing, join semantics per `cancellationPolicy`, region cancellation, nested parallelism (S4), the compensation execution algorithm with pivot step, reverse ordering, forward vs backward recovery (S5), timer lifecycle including reset-on-reentry and parallel-region scoping (S6), and an informative SCXML interoperability mapping (S7).

**Call:** Collapse. The document itself states (§1.1) that "the kernel defines X at the level needed for document authoring and structural validation. This companion provides the implementation-level detail." That is a §4.X expansion of kernel prose, not a separable artifact. "Companion" should mean "ships independently" - this one does not. Every section elaborates a kernel seam or state type. S2 pseudocode belongs in Kernel §4.6/§4.7 as the normative algorithm. S3 history states belong in Kernel §4.14. S4 parallel semantics belong in Kernel §4.8. S5 compensation belongs in Kernel §9.5 (the kernel already names the seam; add the algorithm). S6 timer lifecycle belongs in Kernel §9.7. S7 SCXML mapping moves to an informative appendix (`specs/kernel/appendix-scxml-mapping.md`).

Both "companion" specs, after collapse, stop existing as peer documents. The `specs/companions/` directory goes away.

### D-3. Integration Profile - split: normative patterns into Kernel, adapter-specific content into appendix

**What the file contains:** `integration.md` defines seven integration binding types (`request-response`, `event-emit`, `event-consume`, `callback`, `arazzo-sequence`, `tool`, `policy-engine`) attached to the kernel's `invokeService` action, with shared properties (§3.3) for `requestContract`, `responseContract`, `retry` policy, `timeout`, `idempotencyKeyExpression`, a pinned RFC 9535 JSONPath subset for `outputBinding` (§3.3.1) including lint rule I-001, Formspec Definition contract validation (§4), WOS CloudEvents extension attributes `wosinstanceid` / `wosdefid` / `wosdefversion` / `wosstate` / `wostaskid` / `woscorrelationkey` / `woscausationeventid` (§5), correlation rules (§6), idempotency (§7), an external policy engine bridge for XACML / OPA / Cedar (§8), and execution ordering (§9).

**Call:** Partial split.

- **Integration binding taxonomy (§3), retry policy (§3.8), outputBinding JSONPath subset (§3.3.1), Formspec contract validation (§4), idempotency (§7), execution ordering (§9)** are normative patterns over the kernel's existing `invokeService` / `emitEvent` actions. They encode Wave 2 absorption targets (`retryPolicy` on `invokeService`, `eventContract` + `eventOutputBindings`). These move to Kernel §9.2 (`invokeService` binding surface) as normative. Not a separate artifact.
- **CloudEvents extension attributes (§5) and correlation rules (§6)** move to Kernel §9.2 as normative. Correlation rules reference the attribute names (`wosinstanceid` / `wosdefid` / `wosdefversion` / `wosstate` / `wostaskid` / `woscorrelationkey` / `woscausationeventid`), so both must live in the same normative document - a normative rule cannot cite attributes defined in a non-normative adapter doc. The attribute namespace is kernel-canonical. CloudEvents envelope encoding per CloudEvents v1.0.2 (how the wire format serializes these attributes) stays in `docs/adapters/cloudevents.md` as non-normative implementation reference.
- **Policy engine bridge (§8):** split. §8.4 (deny-overrides-permit rule - a `deny` decision from an external policy engine overrides any `permit` from a deontic constraint; external engines are more restrictive, never more permissive) is an observable-outcome rule over L2 deontic evaluation ordering and moves to AI Integration §4 (Deontic Constraints) as normative. XACML / OPA / Cedar vendor specifics (§8.1-§8.3, §8.5) move to `docs/adapters/policy-engine-bridge.md` as non-normative implementation guidance.
- **Arazzo sequence and CWL-informed tool bindings (§3.5, §3.6)** are reference bindings for specific integration standards. These move to `docs/adapters/arazzo.md` and `docs/adapters/cwl-tools.md`. The kernel gains a named binding extension point (`binding.type` closed enum with `x-` prefix for extensions) so adapter documents can register binding types without requiring a profile document.

The "Integration Profile Document" as a peer artifact goes away. What it expresses either becomes Kernel §9.2 normative content (the core patterns) or `docs/adapters/` implementation guidance (the provider-specific bridges).

### D-4. Semantic Profile - split: transition-tag vocabulary into Kernel, ontology alignment into sidecar

**What the file contains:** `semantic.md` defines a JSON-LD `@context` mapping WOS properties to RDF IRIs (§3), the WOS namespace `https://wos-spec.org/ns/` with property-to-IRI mappings for kernel / governance / L2 terms (§3.3, §3.4), domain vocabulary extension for NIEM / FHIR / Schema.org (§3.5), eight standard SHACL shape categories SP-01 through SP-08 for lifecycle soundness / actor completeness / due process completeness / contract coverage / attestation / dual-readability / verifiable constraint / constraint zone satisfiability (§4), PROV-O vocabulary mapping for the kernel's Facts tier with the Entity-Activity-Agent triad (§5), XES (IEEE 1849-2016) and OCEL 2.0 process mining export (§6), and SHACL/context reference implementations in Appendices A and B.

The file does **not** define the transition-tag vocabulary (`determination`, `adverse-decision`, `hold`, `review`, etc.). That vocabulary lives in Kernel §4.12 and is referenced throughout Runtime §8 (deontic enforcement, delegation verification, hold management) and governance layers. The disposition's suggestion that transition-tag vocabulary lives here is incorrect - this file is ontology alignment, not tag vocabulary.

**Call:** Keep as sidecar, rename, narrow scope.

- The JSON-LD `@context` (§3), SHACL shape library (§4, Appendix A), PROV-O export (§5), and XES/OCEL mapping (§6) are genuine cross-cutting ontology alignment work that attaches to kernel + governance + L2 provenance independently. A kernel-only deployment does not need this; a deployment exporting to process mining tools or publishing linked data does. That is exactly what "optional sidecar" means.
- Rename `specs/profiles/semantic.md` -> `specs/sidecars/ontology-alignment.md` to drop the "profile" label.
- Transition-tag vocabulary remains in Kernel §4.12 (already there - no move needed).
- The `$wosSemanticProfile` document marker becomes `$wosOntologyAlignment`.

### D-5. Signature Profile - keep as sidecar, rename

**What the file contains:** active T4 track governing signature workflow semantics (signer roles, signing order, consent and identity binding, reminders, expiry, decline, void, reassignment, `SignatureAffirmation` provenance). Separate conformance suite (`cargo test -p wos-conformance --test signature_profile`). Trellis-custody aligned. Active `T4-TODO.md`. Distinct stream versioning candidate.

**Call:** Keep. Rename from `specs/profiles/signature.md` -> `specs/sidecars/signature.md`. This is a genuine independent concern - separate release cadence, separate Trellis integration surface, separate conformance fixtures. Every reason to keep it separate remains. Only the "profile" label goes.

### D-6. What stays separate (unchanged)

Four structural commitments remain. None of this ADR changes them.

- **Four release streams** (`wos-kernel` / `wos-governance` / `wos-ai` / `wos-advanced`). Compliance claims reference a pair of stream versions (vision-model Q2-Q4). A jurisdiction adopting kernel + governance without AI must claim that pair cleanly; collapsing streams breaks rights-proportional compliance. See ADR 0063.
- **L0/L1/L2/L3 layer split.** Same rationale. Kernel is required; governance / AI / advanced are optional tiered sidecars.
- **Signature sidecar (D-5).** Active T4 track with separate conformance suite.
- **Advanced Governance (L3).** DCR constraint zones, equity guardrails, SMT verification reports. Genuinely optional and genuinely advanced.

### D-7. Target taxonomy

One artifact kind, one axis. Every WOS document is either:

- **Kernel** (required; Core analog in Formspec; includes processing model, lifecycle algorithms, timer lifecycle, compensation algorithm, relationship event cascade).
- **Tiered sidecar** (optional; attaches at kernel or higher tier): Governance (L1), AI Integration (L2), Advanced Governance (L3), Ontology Alignment, Signature, plus the existing metadata sidecars (Correspondence Metadata, Due Process Config, Assertion Library, Policy Parameters, Business Calendar, Notification Template, Agent Config, Drift Monitor, Equity Config, Verification Report).

Formspec analog: Kernel = Core; Governance / AI / Advanced = Theme / Components / Mapping (tiered sidecars); Ontology Alignment = Registry or Mapping sidecar; Signature = like a domain sidecar (Assist, Screener, Respondent Ledger).

No "profiles." No "companions." No third axis.

### D-8. Provenance schema consolidation

Merge `wos-spec/schemas/kernel/wos-provenance-record.schema.json` (`FactsTierRecord`, `MutationSource`, `VerificationLevel`, etc.) into `wos-spec/schemas/kernel/wos-kernel.schema.json`. Mutation history (Kernel §5.4) and Facts-tier provenance records (Kernel §8) are kernel-grade observable-outcome state. The two-file split was an artifact of the prior layered-schema model (ADR 0074 documents the schema-target confusion this resolves). One kernel document, one kernel schema.

After migration, `wos-provenance-record.schema.json` is deleted. Higher-tier provenance records (Reasoning, Counterfactual, Narrative tiers) attach via the `provenanceLayer` seam (Kernel §10.3) and live in their respective layer schemas - Reasoning in `schemas/governance/`, Counterfactual in `schemas/ai/`, Narrative in `schemas/advanced/`. Tier ownership matches sidecar ownership.

## Consequences

### Positive

- One taxonomy question to learn: is it kernel or a tiered sidecar? (Which tier? Required or optional?) No prior "which artifact kind?" gate.
- Wave 0 declarative-I/O pipeline (`outputBindings` / `taskActions` / `retryPolicy` / `mergeStrategy`) lands across Kernel + existing tiered sidecars, not across four parallel homes.
- Kernel §4.6/§4.7/§4.8/§4.14/§9.5/§9.7 become the single authoritative source for processing-model rules. The "two conformant processors same result" invariant can be verified against one document.
- Kernel schema consolidates Facts-tier provenance and mutation history into one file - one kernel document, one kernel schema (D-8).
- Formspec parity closes. WOS mirrors the Formspec Core + sidecar model ADR 0065 committed to; authors moving between specs see one organizing pattern.
- Rights-proportional claims (four-stream, L0/L1/L2/L3) are untouched. Compliance surface does not change.

### Negative

- Non-trivial migration. Runtime Companion (~950 lines) and Lifecycle Detail Companion (~500 lines) merge into Kernel. Integration Profile (~750 lines) splits between Kernel §9.2 and `docs/adapters/`. Semantic Profile (~930 lines) renames and drops "profile" framing. Existing in-repo links break until the same-branch sweep updates them.
- Kernel spec grows substantially. Reviewers and authors face a larger single document. Chapter-level navigation and the `*.llm.md` generator need updating for the new structure.
- Adapter documents (`docs/adapters/cloudevents.md`, `docs/adapters/arazzo.md`, `docs/adapters/cwl-tools.md`, `docs/adapters/policy-engine-bridge.md`) need authoring. Today their content lives inside the Integration Profile - splitting it out is new work, not a pure move.

### Neutral

- Schema IDs change atomically on the restructure branch. `https://wos-spec.org/schemas/companions/wos-case-instance/1.0` and `https://wos-spec.org/schemas/profiles/wos-{integration,semantic,signature}-profile/1.0` retire; new IDs land at `https://wos-spec.org/schemas/kernel/...` and `https://wos-spec.org/schemas/sidecars/...`. Document markers `$wosRuntimeCompanion`, `$wosLifecycleDetail`, `$wosIntegrationProfile`, `$wosSemanticProfile` retire on the same branch.

## Transition plan

Three phases, all on a single `kernel-restructure` branch. No sequenced merges, no deprecation window.

### Kernel chapter map

The current Kernel spec runs through §13 (Conformance Fixtures). The restructure relocates three existing chapters to better homes and reuses §11/§12/§13 for absorbed Runtime content:

- **§6 Contract Validation** (was §11). Adjacent to §5 Case State; contract validation governs case-data writes; logical adjacency.
- **§2 Separation Principles** (was §12). Foundational meta-spec discipline; belongs early, before any layer-specific machinery.
- **`crates/wos-conformance/README.md` / `meta/conformance-fixtures.md`** (was §13 Conformance Fixtures, removed from normative spec). Conformance fixtures are tooling artifacts, not normative kernel prose.

After relocation, §11/§12/§13 carry new content from Runtime absorption:

- **§11 Runtime Serialization** (Runtime §3 - CaseInstance serialization).
- **§12 Evaluation Modes** (Runtime §10 - evaluation modes including the 100-cycle convergence cap; observable-outcome runtime state).
- **§13 Formspec Coprocessor** (Runtime §15 - 15-step Formspec coprocessor protocol; ADR 0073 already pins Formspec as the recommended case-data binding at the `contractHook` seam).

Existing §1, §3, §4, §5, §7, §8, §9, §10 are unchanged in number. §6 and §2 absorb relocated content with full cross-reference rewrites in the same patch.

### Phase 1 - Kernel restructure + companion absorption + schema consolidation

Bulk of the structural work.

1. Lifecycle Detail §2 (transition evaluation pseudocode) -> Kernel §4.6/§4.7 as normative algorithm.
2. Lifecycle Detail §3 (history states) -> Kernel §4.14.
3. Lifecycle Detail §4 (advanced parallel execution) -> Kernel §4.8.
4. Lifecycle Detail §5 (compensation algorithm) -> Kernel §9.5.
5. Lifecycle Detail §6 (timer lifecycle) -> Kernel §9.7.
6. Lifecycle Detail §7 (SCXML mapping) -> `specs/kernel/appendix-scxml-mapping.md` (informative).
7. Runtime §3 (CaseInstance serialization) -> Kernel §11 (new "Runtime Serialization").
8. Runtime §4 (event delivery contract) -> Kernel §4.2/§4.9 expansion.
9. Runtime §5 (action execution model) -> Kernel §9.2 expansion.
10. Runtime §6 (durability guarantees G1-G5) -> Kernel §9.1 expansion.
11. Runtime §7 (timer precision) -> Kernel §9.7 expansion (alongside Lifecycle Detail §6).
12. Runtime §8 (governance enforcement) -> split: §8.2 scoping to Kernel §4.12; §8.3 deontic enforcement ordering to AI Integration §4 (governance layer owning deontic semantics); §8.4 delegation verification to Governance §11.4; §8.5 hold management to Governance §12.
13. Runtime §9 (explanation assembly) -> Governance §3 (due process, where adverse-decision originates).
14. Runtime §10 (evaluation modes + convergence cap) -> Kernel §12 (new "Evaluation Modes").
15. Runtime §11 (multi-version coexistence) -> Kernel §9.6 expansion.
16. Runtime §12 (host interfaces) -> `specs/kernel/appendix-host-interfaces.md` (non-normative, adapter-facing).
17. Runtime §13 (security model) -> `specs/kernel/appendix-security.md` (non-normative).
18. Runtime §14 (relationship-triggered events) -> Kernel §5.5 expansion of the relationship-metadata model. The cascade-depth cap rule (`maxRelationshipEventDepth` default 3) already lives in Kernel §4.10; that portion does not move. §5.5 absorbs the relationship-metadata structure and triggered-event routing semantics only.
19. Runtime §15 (Formspec coprocessor) -> Kernel §13 (new "Formspec Coprocessor").
20. Existing Kernel §11 (Contract Validation) -> §6. Update every cross-reference in spec, schemas, lint rules, conformance fixtures, downstream documents.
21. Existing Kernel §12 (Separation Principles) -> §2. Same cross-reference sweep.
22. Existing Kernel §13 (Conformance Fixtures) -> `crates/wos-conformance/README.md` (or `meta/conformance-fixtures.md`). Removed from normative spec.
23. Merge `schemas/kernel/wos-provenance-record.schema.json` (`FactsTierRecord`, `MutationSource`, `VerificationLevel`) into `schemas/kernel/wos-kernel.schema.json`. Delete `wos-provenance-record.schema.json`. Update all `$ref` pointers.
24. Delete `specs/companions/`. Delete `schemas/companions/`. Schema `wos-case-instance` moves under `schemas/kernel/`.

### Phase 2 - Profile/sidecar reclassification + Integration split

1. Integration §3 (binding types), §3.3 (common properties), §3.3.1 (outputBinding JSONPath subset including lint rule I-001), §3.4/§3.5/§3.6 structural shape of bindings, §3.8 (retry policy), §4 (contract validation), §7 (idempotency), §9 (execution ordering) -> Kernel §9.2 (`invokeService` binding surface) as normative.
2. Integration §5 (CloudEvents extension attributes) + §6 (correlation rules) -> Kernel §9.2 as normative. The attribute namespace (`wosinstanceid`, `wosdefid`, `wosdefversion`, `wosstate`, `wostaskid`, `woscorrelationkey`, `woscausationeventid`) and the correlation rules that reference it live in the kernel. CloudEvents envelope encoding per CloudEvents v1.0.2 -> `docs/adapters/cloudevents.md` as non-normative implementation reference.
3. Integration §8.4 (deny-overrides-permit deontic-override rule) -> AI Integration §4 (Deontic Constraints) as normative. Observable-outcome rule over L2 evaluation ordering.
4. Integration §8.1-§8.3, §8.5 (XACML / OPA / Cedar vendor specifics) -> `docs/adapters/policy-engine-bridge.md`. Non-normative.
5. Integration §3.5 (Arazzo sequence), §3.6 (CWL-informed tool) -> `docs/adapters/arazzo.md`, `docs/adapters/cwl-tools.md`. Non-normative.
6. Delete `specs/profiles/integration.md`. Delete `schemas/profiles/wos-integration-profile.schema.json`.
7. Kernel §9.2 gets an open binding-type extension point so adapter documents register binding types via `x-` prefix without requiring a profile document.
8. Move `specs/profiles/semantic.md` -> `specs/sidecars/ontology-alignment.md`. Rename document marker `$wosSemanticProfile` -> `$wosOntologyAlignment`. Rename schema `schemas/profiles/wos-semantic-profile.schema.json` -> `schemas/sidecars/wos-ontology-alignment.schema.json`. Content stays (JSON-LD `@context`, SHACL shape library, PROV-O export, XES/OCEL export). Scope narrows explicitly to ontology alignment - remove any framing that suggests it owns transition-tag vocabulary. Update Kernel §4.12 to state transition-tag vocabulary is kernel-owned.
9. Move `specs/profiles/signature.md` -> `specs/sidecars/signature.md`. Rename document marker `$wosSignatureProfile` -> `$wosSignature`. Rename schema `schemas/profiles/wos-signature-profile.schema.json` -> `schemas/sidecars/wos-signature.schema.json`. Conformance suite command: `cargo test -p wos-conformance --test signature` (drop `_profile` suffix). Content unchanged.

### Phase 3 - Downstream-doc sweep

1. `wos-spec/specs/kernel/spec.md` abstract: replace "five named extension seams" with "six." (Resolves the deferred edit from ADR 0077.)
2. `wos-spec/schemas/kernel/wos-kernel.schema.json` `description` field (line 5): same "five → six" fix.
3. `wos-spec/CLAUDE.md` Layer structure section: drop "Cross-cutting profiles" and "Companions" lines. Replace with the unified tiered-sidecar list from D-7. Update any references to specific Companion or Profile artifacts.
4. `wos-spec/README.md` "Specification inventory" table: restructure around one axis (Kernel + tiered sidecars). "Profile" and "Companion" rows retire. Add new rows for split Integration adapter documents. Update all `specs/companions/...` and `specs/profiles/...` paths.
5. `wos-spec/README.md` "How the layers work" section: drop "Cross-cutting profiles" and "Companions" subsections. Ontology Alignment and Signature become tiered sidecars alongside Governance/AI/Advanced.
6. `wos-spec/README.md` "What to adopt" table: layer→spec mapping updated for the new paths.
7. `wos-spec/RELEASE-STREAMS.md`: stream→path mapping updates - any current `specs/companions/*` or `specs/profiles/*` entries move to their new homes.
8. `wos-spec/COMPATIBILITY-MATRIX.md`: same path-reference updates.
9. `wos-spec/LINT-MATRIX.md`: lint rule I-001 (outputBinding JSONPath subset) reanchored to Kernel §9.2.X. Conformance class **Kernel Complete** (authoring-time enforcement against kernel documents): I-001 pattern-matches JSONPath syntax inside `outputBinding` expressions, which requires interpreting the expression semantically - a Kernel Structural processor's schema check cannot reject a syntactically-well-formed string whose subset-violation only surfaces under JSONPath semantics. Category prefix stays `I-` for continuity with existing fixtures.
10. `wos-spec/counter-proposal-disposition.md`: §Artifact taxonomy section becomes a one-line pointer to this ADR. §Seam vocabulary drift section becomes a one-line pointer to ADR 0077. Both prior sections deleted.
11. Conformance fixtures referencing `$wosRuntimeCompanion`, `$wosLifecycleDetail`, `$wosIntegrationProfile`, `$wosSemanticProfile` update to new markers or drop marker where content folded into kernel.

## Alternatives considered

**Keep three-kind taxonomy, document the distinction better.** Rejected. The counter-proposal disposition is correct that the extra axis carries cost without meaning for most artifacts. Runtime Companion and Lifecycle Detail Companion are kernel-grade by their own internal test (observable-outcome rule). No better documentation changes that.

**Collapse everything - treat Signature and Advanced as regular layers.** Rejected. Signature has an active separate conformance suite, a separate Trellis integration surface, and a separate release cadence candidate. Advanced has DCR / SMT / equity concerns that genuinely do not apply to most deployments. Both belong outside the required tier. "Tiered sidecar" captures this without needing a second axis.

**Keep Integration Profile as a sidecar, don't split adapter content out.** Rejected. The file conflates two kinds of content: normative patterns over kernel `invokeService` (`retryPolicy`, `outputBinding` JSONPath subset, contract validation) and provider-specific adapter guidance (Arazzo, CWL, XACML, OPA, Cedar, CloudEvents). The first is Kernel-grade. The second is per-deployment adapter guidance. A single artifact forces the second kind to inherit the normative status of the first, which neither tests nor implementations actually enforce across providers. Splitting matches how the content is actually used.

**Append Runtime chapters beyond §13 instead of relocating §11–§13.** Rejected. §13 (Conformance Fixtures) is tooling content masquerading as normative prose; §11 (Contract Validation) reads better adjacent to §5 Case State; §12 (Separation Principles) is foundational meta-spec discipline that belongs early. Pre-release status makes the renumbering free. Cross-reference sweep is one mechanical pass.

**Wait until post-1.0 to restructure.** Rejected per the "nothing is released" rule (no users, no production deployments). Pre-release is exactly when restructuring is cheap. Post-1.0 restructuring would break downstream tooling that locked to the three-kind model.
