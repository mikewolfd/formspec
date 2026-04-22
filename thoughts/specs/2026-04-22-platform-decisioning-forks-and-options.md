---
title: Platform decisioning — committed leans vs open forks (technical)
description: >
  Architectural leans we optimize against today (each revisitable) and forks
  we have not closed. Prose is self-contained; no repository paths; no phased
  roadmap framing. Cross-checked for technical completeness against the
  2026-04-22 full-stack synthesis in this repo.
status: living
date: 2026-04-22
audience:
  - Architects comparing defensible branches
  - Owners deciding what is allowed to change
---

# Platform decisioning — committed leans vs open forks (technical)

This document lists **leans** (what we build and test against today) and **open forks** (what we have not decided). Nothing listed under leans is sacred: shipping is a migration cost, not a moral proof. When this text says *committed*, it means *default until a deliberate review changes it.*

The goal of each paragraph below is that you can read it **once**, in isolation, and still know **what part of the system it refers to**, **what choice we are making**, **why that choice exists**, and **what would make us undo it**.

A **completeness pass** against the 2026-04-22 full-stack synthesis added back named mechanisms that had been compressed out (for example `ct_merkle`, five seams, four-layer privacy chain, adapter rejects, and WOS event vocabulary). If this note and that synthesis disagree, **reconcile them deliberately**; do not let them drift silently.

---

## Part A — Committed leans (each may revert)

### Evidence and responsibility

**Verifiable architecture.** Any architectural choice that is supposed to survive a skeptical auditor or a second implementation should eventually show up as four things: written semantics, a machine schema or byte grammar, conformance vectors that fail when behavior drifts, and a verifier a third party can run without your SaaS login. We lean on that bar because otherwise the system becomes tribal knowledge that walks out with whoever remembered the meeting. Reopen this lean only if the organization explicitly accepts that some layer will live as oral tradition and you document who carries that risk.

**Research and panel inputs are not normative until landed.** Survey notes, risk memos, and expert panels may rank work (impact times debt), but they do not change byte rules until they arrive as spec prose, schemas, vectors, or an explicit ADR-style decision with owner sign-off. Reopen if the organization wants research to override written center semantics without paying migration cost.

**Center versus adapter.** “Center” holds meaning and hashes: what a case is, what an event means, what gets hashed, and what crosses a seam between products. “Adapter” holds replaceable machinery: a particular immutable database SKU, a particular transparency-log deployment, a selective-disclosure credential stack, or a heavy cryptography profile. We split them so buyers can swap machinery without rewriting meaning, and so specs do not absorb every vendor novelty. Reopen if a buyer forces a vendor-specific concern into the center without funding the vectors and verifier work that center status implies.

### Topology and seams

**Three centers, five named integration contracts.** Intake plus respondent ledger semantics, workflow governance plus provenance *meaning*, and tamper-evident bytes plus export proofs stay separate centers. They compose through **five explicit cross-layer contracts** (the same “named seams” the stack synthesis summarizes from the integrative stack doc), not through ad hoc shared databases. The count of **five** matters because it is the checklist for conformance: a change is not “local” if it silently crosses a contract without updating types, mappings, custody, append, or verifier inputs. Reopen the three-center split only if someone shows a merge that **reduces** seam surface **and** preserves independent verification; reopen the **five** count only if you rewrite the integration model everywhere, not in one service.

### Proof story and signing

**Export and offline verifier first.** The primary story we want to tell a regulator or a hostile reviewer is: here is a **portable, COSE-signed export bundle**, here is a verifier, here is the answer with no live dependency on our UI. Dashboard trust stays real but secondary. We chose this because procurement and disputes outlive demos. Reopen if product research shows your target users will never run or accept an export path and you are willing to own what that does to the integrity claim.

**One signing pipeline across seams.** Respondent evidence flows into a workflow **SignatureAffirmation** (signature profile workstream), then a **custody hook** into the append-only store, then **export** and **verify** as one machine story. The lean prevents each team from inventing a different notion of “signed” that does not compose. Reopen if measurement shows the pipeline is unusably slow and you must redesign; do not reopen silently by adding a second pipeline without retiring the semantics of the first.

**Intake attestation does not replace workflow signatures.** A **ClickToSign-style** progressive intake pattern ties capture to **`attestation.captured`**, stays Tier-3 (a group of normal fields, not a new core datatype), and **feeds** signing and ledger evidence without duplicating workflow-level signature profile semantics. “The user clicked” and “the organization’s workflow authorized this signature” answer different audit questions. Reopen if product insists on a single merged meaning; then you must write that merged meaning down and re-vector it, not smuggle it through UI copy.

### Ledger model and execution

**Single logical append story per case.** One append-only narrative per case, ciphertext hashed, projections treated as rebuildable views rather than rival truth. The long-range product shape ties **sealed response heads** to **governance events** in one model, even when physical storage stays relational. We lean here because dispute resolution wants one timeline, not two databases that disagree. Reopen if organizational reality truly requires federated logs; then you owe explicit cross-reference and precedence rules in the verifier input, not hand-waving.

**Durable execution checkpoints the ledger; it does not fork reality.** Workflow engines advance state, but they do not become a second authoritative history alongside the ledger. The lean prevents “the engine says X, the chain says Y” from becoming normal. Reopen if operations truly need saga-style compensation; then compensation must still produce **ledger-visible** events a verifier can read, not silent engine rewinds.

**Compensation is governance-shaped.** Undo and correction show up as policy events, not as invisible runtime rollback. Verifiers can see that a human or rule permitted the change. Cross-cutting theme: **Trellis append is commit authority**—governance-as-compensation, not a hidden runtime saga that pretends append never happened. Reopen only if you accept opaque engine state as the source of truth and you downgrade what the ledger proves accordingly.

### Storage and witnesses

**Postgres-class primary plus `ct_merkle` for inclusion posture.** We name **ct_merkle** deliberately: it is the recommended Merkle mechanism over committed roots on one operational unit, not a vague “maybe hash something.” We default here before adopting a second immutable SKU as “the real” store. Reopen when **measured** inclusion, replay time, or operator-equivocation risk fails at realistic payload shapes—not when a vendor slide says you should.

**Escalation includes bounded spikes, not premature primacy.** **immudb-class** or **rs_merkle-class** options stay **adapter spikes** until a spike proves Postgres plus `ct_merkle` cannot meet inclusion or audit constraints; the spike must output numbers, not vibes. Escalation enters as **adapter swap or witness tier**, not as a second “authoritative append” without precedence rules. Two primaries create lawsuits. Reopen if a regulator mandates a specific SKU as primary; then you rewrite precedence explicitly and pay for new vectors.

**Explicit rejects for storage masquerading as integrity.** **QLDB** is off the table (discontinued). **Generic event stores** without cryptographic verify-as-tamper-evidence do not satisfy the integrity bar for the center story. Reopen only if you redefine what “tamper evidence” means in writing and accept the downgrade publicly.

### Bytes, signing, and keys

**COSE-shaped signing for ledger-adjacent artifacts; center stack uses COSE signing (Trellis COSE path), not JWS and not HMAC checkpoints.** We avoid “sign the pretty JSON view,” avoid ad-hoc JWS as the canonical checkpoint format, and avoid **HMAC-as-checkpoint** shortcuts that read as integrity but bind to operator secrets instead of portable proof. Those paths breed cross-implementation disagreement and weak audit stories. Reopen if the ecosystem you must interoperate with **only** speaks JWS; then adopt JWS as a **profile** with exactly one deterministic transcoding step into what the verifier checks—not two ad-hoc canonicalizations.

**One canonical encoding story per signed object.** Resolved conflict in planning: **dCBOR-class** canonical bytes beat **JCS-class** canonical JSON for the current lean where the synthesis recorded drift from older docs. Two implementations must derive identical signature inputs from the same semantic object. Reopen when an external standard locks a different rule and you accept the migration.

**Payload root key independent of tenant master where the spec says so.** Older unified-ledger prose sometimes implied “derive PRK from TMK”; the current lean is **independent PRK** (or equivalent) so compromise stories decouple and marketing cannot smuggle a false custody story. Narrative debt may still exist in prose until text is corrected—track that as documentation work, not as silent crypto fact. Reopen when a concrete KMS or multi-cloud design requires a documented derivation tree; document it and re-run vectors.

### Privacy and disclosure

**Four-layer privacy chain and decoupled planes.** The privacy architecture is not only “encrypt payloads.” It is an ordered story: **client continuity** → **server authoritative respondent ledger** → **platform audit plane** → **export and proof**, with **decoupled planes** for response, audit, and identity or disclosure concerns. **DID/VC-class adapters** and selective disclosure belong in the **product** and adapter tier so intake crypto does not collapse into the byte-center by accident. Reopen if product collapses planes; then rewrite what verifiers prove about each plane.

**Multi-plane privacy and metadata minimization.** Timing, sizes, and event types leak behavior even when payloads encrypt, so metadata handling is **normative**, not cosmetic. Reopen if the product wins as a single-plane system and the team consciously accepts what that loses for audits.

**Encrypt-then-hash for sensitive payloads at the center; zk, MPC, and homomorphic encryption as profiles.** Defense in depth without making exotic cryptography the default tax on every feature. Reopen when a serious threat model says profiles are insufficient and funds the work.

**SD-JWT-style selective disclosure as default posture; BBS+ as optional profile.** Pragmatism for implementers and reviewers. Reopen when unlinkability becomes the headline requirement and you accept draft instability and implementation risk.

**Witness services prove publisher consistency, not confidentiality.** OpenTimestamps-class anchors first; Rekor or **tile-based transparency logs** (Tessera / Static CT ecosystem names in the synthesis) as **witness personalities** over **checkpoint roots**, not as the primary PHI row store. Reopen if procurement demands a log-backed primary store; then you must re-litigate the “second truth” problem instead of pretending witness and primary merged cleanly.

**One proof story where possible.** Avoid stacking redundant **receipt plus checkpoint plus anchor** unless each layer covers a **distinct** threat; at witness tier, **transparency-log semantics alone** often suffice. Reopen when a buyer’s threat model maps cleanly to multiple distinct layers and funds the operational cost.

**Honest sovereignty language.** Claims like “no trust in the platform” or “pure end-to-end user sovereignty” must match the adversary model and **who can decrypt in ordinary operation**. If the platform can decrypt during normal ops, marketing must not claim literal user-only sovereignty. Reopen never: this is honesty as part of the system contract.

### Narrow cryptography and operations adapters

**HPKE, FROST, and MLS stay narrow subsystems** for ceremonies that need them, not for every event write. Reopen when a product line truly needs them on the hot path; pay latency, audit, and vector cost explicitly.

**Key management and shredding narrative.** Cloud KMS or **Vault-class** patterns per tier, aligned with crypto-shredding and regulatory narrative (including EDPB-aligned framing where that applies). Reopen when a cloud mandates a different KMS shape; document the new threat model.

**Authorization follows mature models** (Zanzibar-lineage systems such as OpenFGA, Cedar, OPA, and similar) **derived from ledger grants** where we use them. We avoid inventing bespoke authorization cryptography. Reopen when a customer mandates bespoke; price the security review honestly.

**Interop bias for receipts.** Where standards exist, bias export and receipt packaging toward **SCITT-shaped** semantics, but treat that as **adapter tier** until explicitly adopted and vectored. Reopen when SCITT becomes a hard customer requirement; then promote with tests, not with comments.

### Durable runtime and interchange

**A reference durable engine sits behind `DurableRuntime` semantics (Restate-class today; Temporal-class engines explicitly considered and not the current lean).** The engine is replaceable if the semantic surface and ledger checkpointing stay honest. Resolved planning conflict: **Restate over Temporal** for the reference path, but engine choice remains **adapter-shaped** behind the same interface. Reopen when SLA, license cost, or team skill makes the current engine untenable; swap behind the same interface and re-prove checkpoint linkage.

**JSON is the machine contract; FEL is the stack-native expression language for computed logic on that JSON.** Planning posture is **FEL-only** for stack-centered logic: we do not treat YAML, DMN, or FEEL as the interchange of record, and we do not let “Compass research” languages become silent second standards. Reopen if a standards partner mandates a different wire; then you define one canonical JSON projection and test it.

**YAML may exist as an authoring skin only if every machine path still lands on one JSON encoding story.** Reopen if the ecosystem truly cannot live without YAML on the wire; then you owe the same “one canon” discipline, not two.

### Wire format discipline (Trellis byte ADR themes)

**Wide envelope, narrow enforcement.** The on-wire format reserves room for futures; lint and profiles enforce what production may use today so early deployers cannot paint outside the lines and become accidental conformance suites. Big moves land as **profile plus adapter plus lint relaxation**, not as undeclared envelope experiments. Reopen if lint becomes performative while production diverges; then tighten vectors or delete widening, but do not pretend the wide envelope silently means “anything goes.”

**ADR 0001-style prior hashes: list-shaped for DAG evolution; strict profiles may require length one.** The representation choice exists so you can evolve linkage without a breaking format change. Reopen if you are sure a DAG will never matter and you want to simplify the field; that is a real simplification trade, not a free cleanup.

**ADR 0002-style anchors: list-shaped anchor references; strict profiles require at least one anchor.** Looser profiles may allow richer anchor sets. Reopen if product truly needs anchorless mode; then say what “append integrity” means without anchors.

**ADR 0003-style federation slots: reserved on wire; empty in strict profiles.** Do **not** populate reserved federation fields early; early population smuggles semantics nobody agreed to verify. Sequencing lean for unified-ledger-class work: ship **export, verifier, and custody** first; unify taxonomy and append API before swapping immutable stores. Reopen when federation actually ships and the slots must carry meaning; pay the vector and verifier cost at that moment.

**ADR 0004-style byte authority: Rust canonical for ambiguous bytes; Python remains a CI cross-check.** Disagreement between implementations drives **spec clarification**, not silent “fix the faster language.” Reopen the Python role only if you consciously shrink it to property tests or drop it—**that is a fork**, not a silent budget cut.

**Extend Rust vectors and Python CI before widening what lint allows.** Add **model checks and chaos-style checks** only after bytes are pinned, per the risk-reduction framing in the synthesis. Otherwise production traffic becomes the test suite and regressions become customer incidents. Reopen only under explicit risk acceptance when velocity crises force it.

**Second implementation or stranger corpus still guards byte identity (policy names like “G-5” are just labels).** The function is to catch serialization skew between implementations; the corpus status can lag vector growth, so treat counts as **time-stamped claims**, not magic numbers. Reopen if maintenance cost exceeds value, but only if you replace the function with something equally serious: formal verification, a much larger single-implementation vector suite, or an external audit you trust. Do not delete the guard and call it progress.

### Workflow depth, WOS vocabulary, and release shape

**WOS event and provenance vocabulary (synthesis snapshot).** Workflow center leans include **five-kind events**, **tier-typed provenance**, and explicit dimensions for **deontic**, **autonomy**, and **confidence** semantics; **ProvenanceKind** tier-typing is part of that direction. Emission exists; **completeness** and **decision provenance record shape** remain the largest depth gaps. Reopen if marketing pretends provenance is “done” because emit paths exist.

**Decision provenance record shape comes first among “deep workflow” gaps.** Knowing *which rule version*, *with what inputs*, *with what override rationale*, and *with what model confidence hooks* matters before you polish every adjacent bell. Named remaining gaps include **temporal parameter versioning**, **business-calendar SLAs** (deadline chains incomplete even when a calendar crate exists), **XES-shaped export**, and **dynamic adaptation** for evolving investigations. Reopen if product pressure forces SLAs, XES export, or calendar logic first; then you accept that audits may stay shallow longer.

**Compass-style seven-layer map is input, not mandate.** It lists lifecycle, decision and policy, human task, case state and evidence, integration and eventing, provenance and audit, and durable execution. Traps to avoid remain explicit: **BPMN gigantism**, **BPEL-style transport coupling**, **XPDL-style interchange without execution**, and **flowchart-only rigidity** for investigations. Reopen if someone treats the map as a mandatory bill of materials without sequencing.

**Per-layer version tags plus explicit compatibility rules at seams.** The stack is not one repo with one release train; pretending otherwise confuses buyers and engineers. Fork options remain **stack gate**, **per-layer tags**, or **PoC tag equals 1.0**; current lean is **per-layer tags** with explicit compatibility matrices. Reopen if an enterprise deal truly requires a single monotonic “stack version”; then you build a matrix, not a fairytale gate.

**One semantic fixture should eventually cross every seam under shared CI ownership** (canonical response → SignatureAffirmation → export and verify across **all five** contracts). Without that, each team optimizes its own tests and the integration rots asymmetrically; synthesis ranks **cross-repo signature profile closeout** as active last mile. Reopen if the org refuses joint ownership; then you must document **per seam** who owns the fixture and what “done” means, instead of assuming a miracle integration fixture will appear.

**Reserved crypto slots (including Pedersen-shaped reservations) stay zero-populated and gated until a named profile activates them.** Prevents “almost cryptography” from leaking into parsers. Reopen when a profile ships and the gates must open; open them with vectors, not vibes.

**Evidence binding uses dual-hash framing where accepted (evidence-binding ADR cluster).** Verifiers and exporters must agree on how cryptographic hashes bind artifacts to ledger events. Reopen only if dual-hash proves wrong in practice; then you write the corrigendum with vectors, not a blog post.

**Compliance-related events either appear in the export bundle model or sit explicitly outside the integrity scope.** No shadow events that dashboards see but verifiers never can. Reopen only if a regulator forbids exporting a class of events; then you **redefine scope in writing**, you do not silently bifurcate truth.

**DocuSign-class product floor (non-crypto).** Roughly “most common case” signing plus statutes (**ESIGN**, **UETA**, **eIDAS-class** thinking) is a product commitment parallel to the crypto story; it does not replace workflow semantics. Reopen when counsel says the floor moved; update product and integrity language together.

---

## Part B — Open forks (no default yet)

**Case topology.** We have not finally chosen between one global logical case ledger and multiple federated logs with cross-references. The decision needs precedence rules, verifier inputs, and a clear story for what happens when a cross-link fails or forks.

**Client-held history versus server authority.** Thick client ledgers, thin server authority, and hybrids each imply different sync models, key custody, and honesty about marketing claims (“user sovereignty” versus who can decrypt in normal operations). None of that is closed as a product contract.

**Immutable database as primary.** Staying on relational storage plus `ct_merkle` versus adopting an immudb-class primary remains open until a measured gap justifies the SKU; without numbers, picking a SKU is astrology.

**When to wire `ct_merkle` into Postgres and export paths.** Fork: wire **now** versus **spike-first**; synthesis recorded a lean toward wiring now, but spikes remain valid if inclusion math or ops risk is unclear.

**Which transparency service, if any.** None, Rekor, a custom tile log, or multiple witnesses remain on the table; the choice depends on a written threat model for publisher equivocation, not on logos.

**Canonical encoding and JWS pressure.** CBOR profiles, JCS, and other encodings compete; ecosystem pressure may force JWS. The open work is to pick one verifier canon and treat everything else as a profile with a transcoding contract, or to refuse interop and accept the market cost.

**PRK derivation under real KMS trees.** Independence is the lean, but HSM and multi-cloud reality may require a documented derivation tree we have not fully pinned.

**Whether BBS+ should become default.** SD-JWT-first stays the lean until unlinkability becomes the headline bet and the organization accepts draft risk; **pin W3C draft levels per profile** when BBS+ is in play.

**Engine choice behind `DurableRuntime`.** Restate versus Temporal versus something else versus no engine remains open as long as ledger checkpoint semantics stay definitional; the engine must not become the ledger.

**Stalled and failure semantics for durable work.** Production-grade durability needs an explicit answer for what “stalled” means and how remediation works before “resume” becomes silent mutation; synthesis flags this as **before DurableRuntime production**.

**Saga compensation versus audit purity.** We lean toward ledger-visible compensation, but operations may demand patterns that tempt invisibility; that tension is not fully resolved in every workflow type.

**Amendment and supersession.** How superseded artifacts remain interpretable by verifiers ties directly to export bundle versioning; the rules are not fully accepted as a single global policy. Theme: **federation-era supersession** is a governance problem, not a storage toggle.

**Statutory clocks.** Materialize once versus recompute remains open because it intersects procurement and admissibility, not only engineering taste. Theme: **“materialized once”** must be validated against procurement reality, not assumed.

**Tenant and scope identifiers.** Format, isolation guarantees, and cross-tenant leakage rules are still open at the level of “every multi-tenant API depends on this.”

**Time semantics across authoring and runtime.** Authoring timezone versus runtime timezone, and the meaning of `today()` and `now()` in audit trails, still need a single coherent story.

**Failure versus append authority.** What “commit” means when append is authoritative—hard commit versus soft commit—is not fully pinned everywhere the word appears; synthesis ties **Trellis append** to **commit authority** explicitly.

**Migration versus automation.** Changelog-driven migration and verifier semantic bundles can fight; ownership of “who guarantees completeness of what verifiers load” is open. Tension: **migration ADR** versus **Formspec changelog auto-migration** needs an explicit pin policy.

**Verifier distribution.** CLI, SaaS-hosted verifier, or embedded library each implies different trust roots, update channels, and air-gap behavior; synthesis calls out **verifier semantics distribution** as productization work, not only an engineering detail.

**Coprocessor boundary and missing coprocessor spec.** Whether an intake coprocessor emits the case boundary event or workflow emits something like `case.created` still needs a single owner; unified-ledger-class prose references a **coprocessor section** that remains a **spec gap** until written.

**Authoring middleware contract.** Freezing the `RawProject`-shaped middleware contract versus shipping Studio before that contract hardens is still a velocity-versus-stability fork (synthesis ties this to post-split follow-up work).

**Whether signature affirmation may exist without workflow.** Speed tempts shortcuts; duplication of “signed” meaning tempts audits. The fork stays open until product and integrity owners write one rule.

**Online-trust-first demos.** Teams can still choose to polish in-app trust before export maturity; that is a product fork with audit consequences, not a settled lean here.

**What “proven” means for sales versus engineering.** Purchasability evidence and engineering proof are related but not identical; the calendar and artifact package are open.

**What “1.0” means.** Per-layer tags, a monotonic stack gate, or a sales milestone remain competing definitions of the same English word.

**Fixture ownership and cross-repo T4.** Shared cross-seam fixture versus seam-owned suites remains an organizational fork; **signature profile work** may be “done” on one side of a seam while **cross-repo glue** is still in flight—call that state explicitly in planning, not as “green.”

**Orphan reference cryptography.** Integrate experimental crypto reference code into owned crates, delete it, or park it behind a flag; leaving it unowned rots semantics.

**Ordering among depth items after provenance.** SLAs, XES-shaped export, calendar logic, and integration breadth still compete for priority once decision provenance is underway.

**Meta-ordering among governance themes.** Amendment and statutory clocks are treated as **widest blockers** before safe implementation of unified-case-ledger-class work; tenant, time, and failure semantics cluster with migration and evidence binding as **high-debt** coherence decisions. Teams can accept an explicit partial ordering or keep deciding ad hoc until that hurts.

**Runtime attestation on writes (Trellis vocabulary as shared library).** A future capability space: attach attestation at write time through existing seams without redefining the byte center overnight. Treat as **open design** until vocabulary and vectors exist.

**Human certificate-of-completion and Studio signing authoring.** Product gaps named in the synthesis remain open UX and policy work, not implied by bytes alone.

**Python cross-check depth.** Fork remains **full CI cross-check now** versus **narrow per-byte-authority ADR revisit** versus **property tests only**; default lean favors keeping Python in the loop until explicitly retired.

**Expert-panel-class cryptography (FHE, MPC threshold signing, and similar).** Stay adapter-tier and profile-gated; do not become center defaults by demo pressure.

---

## Kill criteria (hard reopen signals for Part A)

Treat these as **mandatory** fork reviews, not optional nagging.

**Measured failure of relational plus `ct_merkle`** at realistic payload distributions: inclusion breaks, replay blows past SLOs, or operator-equivocation risk remains intolerable after honest engineering.

**Verifier divergence** across implementations on the same semantic fixture, which means your “canonical” story is not canonical.

**Procurement demands witness semantics** that the current witness tier cannot express without pretending witnesses are primary storage.

**Durable execution transitions** that cannot be reconstructed from exported events, which means the engine has become a shadow ledger.

**Migration cannot assemble semantic bundles** that verifiers accept without manual repair, which means your automation story is broken in a way customers will pay for with incidents.

**Dual-hash or evidence-binding mismatch** between exporter, ledger, and verifier in practice, which means the binding story is not safe to teach externally.

---

## Organizational and product constraints (still open work)

**Bus factor and recovery.** Architecture must remain recoverable by a new principal engineer from written semantics, vectors, and verifier behavior, not from lunch lore. Maturity of that process is open.

**Dated obligations from proof exercises to production promises.** Without dates, adapter spikes become permanent scars because nobody schedules the replacement.

**Legal and product alignment on custody and marketing language.** “Free e-sign,” “end-to-end user sovereignty,” and similar claims must match who can decrypt in ordinary operation and what metadata still leaks. Technical architecture cannot absorb that mismatch; the alignment work stays open until counsel and product sign the same sentence the cryptography supports.

**High-signal engineering debt called out in synthesis (non-exhaustive).** Sidecar gaps, schema-description completeness, syntax-only synthesis tooling, typed event meta-vocabulary, provenance export blocked on amendment policy, facts-tier snapshots awaiting governance acceptance, form-level coprocessor intake stalled on the coprocessor-boundary tension, chaos tests and Studio P0–P6 work mostly internal beyond signing-authoring UX—these are **constraints and debt registers**, not shame lists. They become leans only when owners attach dates and acceptance tests.

These constraints are not a roadmap; they are **gates** that technical leans must satisfy or that the organization must override with an explicit signed risk decision.
