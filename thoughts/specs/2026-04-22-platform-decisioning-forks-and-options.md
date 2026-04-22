---
title: Platform decisioning — leans, forks, and constraints (technical and governance)
description: >
  Decision register for the Formspec + WOS + Trellis platform architecture:
  ideal end-state commitments, current implementation defaults, choices still
  open under those defaults, true no-default forks, hard reopen criteria, and
  organizational constraints. Each entry names the system area, the decision
  posture, the reason for that posture, and the condition that would justify
  changing it.
status: living
date: 2026-04-22
audience:
  - Architects comparing defensible branches
  - Owners deciding what is allowed to change
---

# Platform decisioning — leans, forks, and constraints (technical and governance)

This document is the active decision register for platform-level architecture across Formspec, WOS, and Trellis. It records the ideal end state, what we build against today, which choices remain open, which facts would force a review, and which organizational constraints the architecture must satisfy.

A **lean** is a current default, not a permanent truth. Shipping turns a choice into migration cost; it does not prove the choice was morally or technically final. When this document says *committed*, read that as *default until deliberate review changes it*.

Each entry should make sense without hidden context. A reader should be able to tell which system area is involved, what decision is being made, why the decision exists, and what evidence would reopen it.

## Status Vocabulary

**Lean.** A lean is the implementation and test posture we optimize against today, even though a future review may replace it.

**End-state commitment.** An end-state commitment is a destination-level architectural claim the stack intends to satisfy. It is broader than an adapter choice and stronger than a temporary implementation lean. Work may proceed incrementally, but product, spec, and runtime claims must not contradict it.

**Fork under a lean.** A fork under a lean is an unresolved implementation, profile, product, or sequencing choice that does not unset the current default.

**True open fork.** A true open fork has no end-state default; implementation should stop at bounded spike or design work until an owner makes a decision.

**Kill criterion.** A kill criterion is evidence that forces a review of a current lean.

**Constraint.** A constraint is an organizational, legal, product, or process condition that the architecture must satisfy or explicitly override.

**Profile.** A profile is an optional but center-declared variation with vectors and verifier behavior, not an ad hoc implementation branch.

**Adapter.** An adapter is a replaceable implementation behind a center-declared contract, such as a storage engine, witness service, identity provider, or workflow engine.

## Source Notes And Local Glossary

**Archived full-stack synthesis.** The internal 2026-04-22 full-stack synthesis collected the integrity narrative, build map, fork list, inventory, and staleness notes that fed this register. That synthesis is now archived; this document owns active leans, forks, kill criteria, and constraints.

**Crypto solutions note.** The internal 2026-04-11 crypto solutions note proposed concrete cryptographic mechanisms. A mechanism from that note is only normative here when this register marks it as a lean; otherwise it remains finding-level input for future spec work.

**Compass map.** The Compass workflow research map names seven workflow layers: lifecycle, decision and policy, human task, case state and evidence, integration and eventing, provenance and audit, and durable execution. It helps describe WOS depth, but it is not a bill of materials.

**G-5.** G-5 is a policy label for the stranger-test function: an independent implementation should reproduce byte outputs from normative prose and fixtures without privileged implementation hints. The label can change; the guard function matters.

**T4.** T4 is shorthand for the cross-repo signature-profile closeout track: canonical intake evidence, WOS `SignatureAffirmation`, custody-hook append, Trellis export catalog rows, and shared verification fixtures.

**Accepted signature-profile workflow slice.** The accepted workflow slice is the machine-verifiable path that emits `SignatureAffirmation` and feeds custody, export, and verification. It does not own human certificate-of-completion composition or every DocuSign-class administration feature.

**Unified-ledger-class work.** Unified-ledger-class work composes sealed response heads, governance events, and integrity exports into one logical case record. It does not require a single physical database.

**`ct_merkle`.** `ct_merkle` is the current named Merkle inclusion mechanism over roots committed by one operational unit. In this document, an operational unit is the deployment authority that admits case appends and commits the corresponding roots.

**dCBOR-class bytes.** dCBOR-class bytes are deterministic CBOR-style canonical bytes used as the current signed-object byte oracle. JCS-class JSON and JWS remain possible profiles only if they define one deterministic path into verifier input.

---

## Part A — End-State Commitments

These commitments describe the target architecture. They are not guesses about the easiest implementation path. Current leans exist to reach this state without creating rival semantics on the way.

**Every stack claim is independently verifiable.** A third party must be able to verify a case record from published specs, schemas or byte grammars, conformance vectors, and verifier behavior. A live dashboard, vendor account, private maintainer memory, or implementation comment is never enough.

**The stack emits one portable case record.** The ideal record composes the Formspec canonical response, respondent ledger, WOS governance and provenance events, Trellis checkpoints and export bundle, identity attestations, signature affirmations, evidence bindings, actor-authorization claims, amendments, statutory clocks, and migration pins into one verifier-understandable artifact set.

**All cross-layer contracts close before serious product claims.** The five existing contracts are the baseline, not the whole end state. Evidence integrity, identity attestation, signature attestation beyond the accepted machine slice, actor authorization, amendment and supersession, statutory clocks, tenant and scope composition, time semantics, failure and compensation, and cross-layer migration are required closure work.

**The reference architecture proves the specification.** The mature reference path must run one shared semantic fixture across the important seams: author a definition, collect a response, sign, govern, append, compensate or amend where applicable, export, verify, and migrate. Independent implementations should reproduce the same predicted outcomes and byte inputs.

**Workflow truth is ledger-visible.** Durable engines may orchestrate, recover, and retry, but they must not become shadow ledgers. Retries, stalls, resumes, compensation, human overrides, AI recommendations, decision provenance, and policy changes all need verifier-visible representation when they affect the case record.

**Signing has one meaning.** Product shortcuts must not create a second "signed" concept. Fast signing paths may exist only as workflow-lite profiles that invoke the same WOS signature semantics and feed the same custody, export, and verification path.

**Privacy claims match custody reality.** Metadata minimization, encryption, key destruction, selective disclosure, identity separation, and counsel-reviewed sovereignty language are part of the architecture. Marketing cannot claim user-only custody or no-platform-trust unless ordinary decryption, replicas, views, mappings, and metadata exposure make that true.

**Byte identity is non-negotiable.** Deterministic signed bytes, Rust byte authority, second-implementation cross-checks, and conformance vectors precede production issuance. After records circulate, byte drift becomes migration work rather than cleanup.

**Product proof and engineering proof both exist.** The platform needs a buyer-facing evidence package and a verifier-facing engineering package. They overlap, but they are not interchangeable: one makes the system purchasable, the other makes the system independently testable.

**Product sequencing cannot weaken center semantics.** Demos, SaaS onboarding, procurement packages, and Studio workflows may ship in practical order, but they must reuse the same center contracts. A product path that needs different semantics is an architecture decision, not a shortcut.

---

## Part B — Implementation Leans

### Evidence And Responsibility

**Verifier-facing claims require four artifacts.** Any architectural claim that a regulator, buyer, auditor, or independent implementer may rely on must land as written semantics, a machine schema or byte grammar, conformance vectors that fail when behavior drifts, and a verifier a third party can run without a SaaS login. The reason is simple: a claim without artifacts becomes oral tradition. Reopen this lean only if the organization explicitly accepts oral-tradition risk and names who carries it.

**Research ranks work but does not change the center.** Survey notes, risk memos, and expert panels may rank work by `Imp x Debt`, but they do not change byte rules or center semantics by themselves. A research result changes the center only when it lands as spec prose, schema, vector, or explicit ADR-style owner decision. Reopen this rule only if the organization wants research to override written center semantics without first paying migration cost.

**Center and adapter stay separate.** The center owns meaning and hashes: what a case is, what an event means, what gets hashed, and what crosses product seams. Adapters own replaceable machinery: storage engines, transparency-log deployments, identity providers, selective-disclosure stacks, and implementations of heavy cryptography profiles such as BBS+. This split lets buyers swap machinery without rewriting meaning. Reopen it only if a buyer forces a vendor-specific concern into the center and funds the vectors and verifier work that center status requires.

### Topology And Seams

**The platform has three centers.** Formspec owns intake and respondent-ledger semantics, WOS owns workflow governance and provenance meaning, and Trellis owns tamper-evident bytes and export proofs. Keeping those centers separate preserves independent verification. Reopen the split only if a proposed merge reduces seam surface while preserving independent verification.

**Five named contracts connect the three centers.** The cross-layer contracts are the canonical response, the governance coprocessor, the event hash chain, the checkpoint seal, and the governance custody hook. In plain language, the stack needs one pinned intake output, one governed way for workflow to ask intake for help, one abstract activity chain, one sealing point, and one provenance handoff into the integrity record.

**The five-contract count is a conformance checklist.** A change is not local if it crosses one of those contracts without updating the contract's types, mappings, custody behavior, append behavior, or verifier inputs. Reopen the count only if the integration model changes everywhere, not inside one service.

**Known open contracts sit outside the five primitives.** Evidence binding, identity attestation, signature attestation beyond the current machine slice, actor authorization, amendment and supersession, and statutory clocks are event-shape gaps. Tenant and scope composition, time semantics, cross-layer failure and compensation, and cross-layer migration and versioning are integration primitives. Treat these as explicit center work or ADR-shaped proposals, not as features hidden inside the five existing contracts.

### Proof Story And Signing

**The integrity story starts with export and offline verification.** The primary proof for a regulator, buyer, or skeptical reviewer is a portable COSE-signed export bundle plus a verifier that works without live access to the platform UI. Dashboard trust remains useful, but it is secondary because disputes and procurement reviews outlive demos. Reopen this lean only if product research shows target users will not accept export-based proof and the organization accepts the resulting integrity downgrade.

**One signing pipeline must cross the seams.** Respondent evidence flows into WOS `SignatureAffirmation`, then through a custody hook into the append-only store, then into export and verification. The point is to prevent each layer from inventing a separate meaning of "signed." Reopen this lean only if measurement shows the single pipeline is unusably slow and a replacement pipeline retires the first pipeline's semantics.

**The custody handoff pins identity and append shape.** The custody seam uses TypeID-shaped case and record identity, one governed record per append, and idempotent admission under orchestrator retries. This protects the evidentiary spine from duplicate activities after crash recovery. Reopen the handoff only if the custody-hook shape changes and new vectors prove duplicate admission still cannot fork the chain.

**Trellis owns the signed byte oracle.** For ledger-adjacent artifacts, the integrity layer hashes dCBOR-class authored bytes, while JSON Schema remains the governance-side truth for structured meaning. Workflow-internal JSON snapshot canonicalization may exist, but it must not become a second chain byte oracle. Reopen this lean only if an external standard forces a different byte rule and the migration lands with vectors.

**Intake attestation feeds workflow signatures but does not replace them.** A ClickToSign-style intake pattern records `attestation.captured` as normal Tier 3 fields; it does not create a new core datatype or replace WOS signature-profile semantics. "The user clicked" and "the workflow authorized this signature" answer different audit questions. Reopen this distinction only if product deliberately merges those meanings and the merged meaning is written and vectored.

### Ledger Model And Execution

**Each case has one logical append narrative.** The default case story is one append-only narrative, with ciphertext hashed and dispute resolution pointed at one timeline. This does not require one physical database. Reopen the lean only if organizational reality requires federated logs; then verifier inputs need explicit cross-reference and precedence rules.

**Derived stores remain rebuildable views.** Projections, materialized indexes, and snapshots must carry the canonical tree head they were derived from. That watermark keeps replay economics honest and prevents derived stores from becoming rival truth. Reopen this lean only if a derived store is deliberately promoted into verifier input and receives its own precedence rules.

**Record-ownership language follows decryption reality.** Vendor operation does not automatically transfer record ownership in the integrity narrative: operators run machinery, while verifier-facing bundles remain portable from the subject's perspective. If the platform can decrypt during normal operations, the product language must say so. Reopen the language only when the custody and key model actually changes.

**Durable execution checkpoints the ledger but does not become the ledger.** A workflow engine may advance state and recover from crashes, but it must not become a second authoritative history beside Trellis. If operations need saga-style compensation, the compensation must still produce ledger-visible events. Reopen this lean only if the organization accepts engine state as authoritative and downgrades the ledger claim.

**Compensation is governance-shaped.** Undo and correction appear as policy-governed events, not invisible runtime rollback. Trellis append is the commit authority for the evidentiary record, so compensation must explain what changed and why. Reopen this lean only if the organization accepts opaque engine rollback as source of truth.

### Storage And Witnesses

**Postgres plus `ct_merkle` is the current inclusion posture.** The default primary store is Postgres-class relational storage with `ct_merkle` roots committed by one operational unit. The point is not that Postgres is sacred; the point is that the center should require reproducible inclusion, replay, export, and verification before adopting a second immutable primary. The adapter should pass a bounded spike with realistic payload distribution, case volume, replay SLO, inclusion-proof size, export verification time, and operator-equivocation threat model before wiring becomes sticky. Reopen this lean when realistic payloads show inclusion failure, replay failure, or unacceptable operator-equivocation risk.

**Immutable-store escalation requires measured failure.** immudb-class and rs_merkle-class options remain adapter spikes until evidence proves Postgres plus `ct_merkle` cannot satisfy inclusion or audit constraints. Escalation may enter as an adapter swap or witness tier, but not as an unranked second append authority. Reopen this posture if a regulator mandates a primary SKU; then rewrite precedence rules and add vectors.

**Storage products do not satisfy integrity by branding.** QLDB is rejected because it is discontinued. Generic event stores without cryptographic verify-as-tamper-evidence do not satisfy the center integrity bar. Reopen this rejection only if "tamper evidence" is redefined in writing and the downgrade is accepted publicly.

### Bytes, Signing, And Keys

**COSE is the ledger-adjacent signing path.** The center stack uses the Trellis COSE path for ledger-adjacent artifacts, not JWS as the canonical checkpoint format and not HMAC checkpoints. This avoids signing a pretty JSON view that different implementations may interpret differently. Reopen this lean only if a required ecosystem speaks only JWS; then JWS must be a profile with one deterministic transcoding path into verifier input.

**dCBOR-class bytes are the current signed-object canon.** The current byte lean is dCBOR-class canonical bytes, not JCS-class canonical JSON. The requirement is that two implementations derive the same signature input from the same semantic object. Reopen this lean when an external standard locks a different byte rule and the organization accepts the migration.

**Payload root keys stay independent of tenant master keys.** For ledger payload encryption, the current lean is an independent PRK or equivalent isolation from the tenant master key. That separation keeps compromise stories clear and prevents product language from overstating custody. Reopen this lean when a concrete KMS or multi-cloud design requires a documented derivation tree and new vectors prove the compromise story.

### Privacy And Disclosure

**The four-layer privacy chain defines proof boundaries.** The chain is client continuity, server-authoritative respondent ledger, platform audit plane, and export-and-proof. The center owns what each layer proves; adapters and product surfaces own concrete DID/VC stacks, disclosure UX, and storage choices. Reopen this model only if product intentionally collapses proof boundaries and rewrites what verifiers can prove.

**Response, audit, and identity planes stay decoupled.** Selective disclosure and DID/VC-class adapters belong in product and adapter tiers so intake crypto does not silently become byte-center crypto. The separation lets the platform protect respondent data without overloading Trellis with identity-product decisions. Reopen this lean only if a product line deliberately merges the planes and accepts the proof consequences.

**Metadata minimization is part of privacy.** Payload encryption does not hide timing, sizes, event types, or interaction patterns. Metadata handling is therefore normative privacy work, not cosmetic cleanup. Reopen this lean only if a product knowingly ships as a single-plane system and accepts the audit loss.

**Key destruction must cover views and identity mappings.** Crypto-shredding is incomplete if materialized views, dashboard replicas, search indexes, or mapping rows still hold recoverable plaintext or re-identify a pseudonymous ledger. Each key-destruction story must name the payloads, views, mappings, and verifier consequences. Reopen this lean only if counsel accepts a weaker deletion story.

**Encrypt-then-hash is the default for sensitive payloads.** Sensitive payloads are encrypted before their encrypted bytes enter the hash story. zk, MPC, and homomorphic encryption remain profiles rather than default cost on every feature. Reopen this lean when a concrete threat model shows profiles are insufficient and funds center work.

**SD-JWT-style selective disclosure is the default posture.** BBS+ remains an optional profile until unlinkability becomes the main product requirement and the organization accepts draft instability and implementation risk. When BBS+ enters a profile, pin the W3C draft level and test vectors. Reopen the default only when unlinkability is worth that cost.

**Witness services prove publisher consistency, not confidentiality.** OpenTimestamps-class anchors come first; Rekor or tile-based transparency logs such as Tessera or Static CT are witness personalities over checkpoint roots, not PHI row stores. A witness personality is a center-declared profile implemented by an adapter. Reopen this lean only if procurement demands a log-backed primary store and the second-truth problem is addressed directly.

**Use one proof story unless threats differ.** Do not stack receipt, checkpoint, and anchor layers unless each layer covers a distinct threat. At witness tier, transparency-log semantics alone often suffice. Reopen this lean when a buyer's threat model maps cleanly to multiple proof layers and funds the operational cost.

**Sovereignty language must match custody.** Claims such as "no trust in the platform" or "end-to-end user sovereignty" must match who can decrypt in ordinary operation and what metadata still leaks. If the platform can decrypt during normal operations, marketing must not claim literal user-only sovereignty. The correct register is conditional sovereignty: what becomes true under specific keys, operators, and metadata exposure.

### Narrow Cryptography And Operations Adapters

**HPKE, FROST, and MLS stay narrow.** Use these mechanisms for ceremonies that need them, not for every event write. This avoids adding latency, audit burden, and vector cost to the hot path without a concrete threat model. Reopen this lean only when a product line truly needs one of these mechanisms on the hot path.

**Key management uses mature tiered patterns.** Cloud KMS and Vault-class patterns are acceptable per tier when they align with crypto-shredding and regulatory narrative. Every key tier must name the destruction subject, affected replicas or views, and verifier consequences. Reopen this lean when a cloud or buyer mandates a different KMS shape and the new threat model is documented.

**Authorization follows mature systems, not bespoke crypto.** Zanzibar-lineage systems such as OpenFGA, Cedar, OPA, and similar tools are the default class when an authorization engine is needed. Ledger grants are verifier-facing claims or inputs to those systems; they are not a reason to invent new authorization cryptography. Reopen this lean only when a customer mandates bespoke cryptography and funds security review.

**Receipt interop stays adapter-tier until vectored.** Export and receipt packaging should bias toward SCITT-shaped semantics where standards exist, but SCITT remains adapter-tier until adopted with vectors. Reopen this posture when SCITT becomes a hard customer requirement; then promote it with tests, not comments.

### Durable Runtime And Interchange

**`DurableRuntime` is the stable durable-execution seam.** The maximalist decision is the seam, not the engine. Restate-class execution is the current preferred reference adapter pending spike evidence; Temporal-class engines remain eligible behind the same semantic surface if ledger checkpointing stays honest. Promote any engine to committed reference status only with spike results for retry behavior, stalled-state handling, append idempotency, export reconstruction, operator fit, license posture, and SLA fit. Reopen this lean when those facts make the reference engine untenable.

**Append receipts must be idempotent under retries.** Durable execution exists for crash recovery, and retrying a workflow activity must not create duplicate evidence. The append and custody contracts must prove that retry behavior cannot fork the evidentiary spine. Reopen this rule only if the append contract changes and new vectors prove retry semantics.

**JSON is the machine contract.** FEL is the stack-native expression language for computed logic on JSON. YAML, DMN, FEEL, and Compass-map research languages must not become silent second standards. Reopen this lean only if a standards partner mandates another wire format and the platform defines one canonical JSON projection.

**YAML may be an authoring skin only.** YAML can exist as a convenience for humans, but every machine path must still land on one JSON encoding story. Reopen this lean only if the ecosystem truly requires YAML on the wire; then YAML must obey the same one-canon discipline.

### Wire Format Discipline

**The envelope is wide, but enforcement is narrow.** The on-wire format reserves room for future profiles, while lint and profiles enforce what production may use today. Big moves land as profile plus adapter plus lint relaxation, not undeclared envelope experiments. Reopen this lean if production diverges from lint; then tighten vectors or remove unused width.

**Prior hashes stay list-shaped for DAG evolution.** ADR 0001-style prior hashes allow future linkage evolution without a breaking format change, while strict profiles may require length one. The field stays list-shaped because future DAG needs are plausible. Reopen this lean only if the project chooses permanent simplification over DAG evolution.

**Anchor references stay list-shaped.** ADR 0002-style anchor references allow richer anchor sets, while the current anchored-export profile requires at least one anchor. Other profiles may define anchorless local modes, but they must state what append integrity means without external anchors. Reopen this lean only if anchor shape itself changes.

**Federation slots stay empty until a profile activates them.** ADR 0003-style federation fields remain reserved in strict profiles. Populating reserved fields early smuggles semantics nobody has agreed to verify. Reopen this lean when federation ships and the fields carry tested meaning.

**Unified-ledger sequencing starts with proof, not store swaps.** Unified-ledger-class work should ship export, verifier, and custody first; then unify taxonomy and append API; only then revisit immutable stores. That sequence avoids replacing storage before the proof story is stable. Reopen it only if measured storage failure forces an earlier store decision.

**Rust is byte authority, and Python remains the CI cross-check.** ADR 0004-style byte authority means implementation disagreement drives spec clarification, not silent correction in the faster language. Python stays in the loop as the second-language guard. Reopen Python's role only through an explicit fork that replaces the guard with something equally serious.

**Vectors precede lint widening.** Rust vectors and Python CI must cover new byte behavior before lint allows that behavior in production profiles. Model checks and chaos-style checks come after bytes are pinned. Reopen this sequence only under explicit risk acceptance.

**The independent-implementation guard protects byte identity.** The guard may be a second implementation, a stranger corpus, or an equivalent external byte check. Labels such as G-5 are shorthand; the function is to catch serialization skew before issued records depend on it. Reopen the guard only if formal verification, a larger vector suite, or an external audit replaces it.

**Pre-issuance is the cheap byte-revision surface.** Before records circulate outside controlled test fixtures, envelope byte changes are cheap. After issuance, byte drift becomes a migration contract, not a linter tweak. This is why byte decisions need vectors before deployment.

### Expert Crypto Review — Finding-Level Inputs

**The crypto solutions note supplies candidate mechanisms, not hidden spec.** The mechanisms below are useful design inputs, but they become center semantics only when accepted into spec prose, schemas, vectors, or ADRs. The note's code-level details are intentionally omitted here.

**Hybrid logical clocks plus causal edges are a candidate center pattern.** Pure receipt order can misstate causality when devices race; a FEL recomputation can appear later than an edit it actually depended on. The candidate pattern uses HLC-class logical time, explicit causal dependency references, server-side DAG construction, topological sort, and surfaced conflicts for policy-sensitive concurrent edits. This paragraph names the candidate; it does not close the HLC fork below.

**Tag commitments reduce plaintext leakage.** Determination or eligibility bits in plaintext headers leak regulated signal even when payloads are encrypted. A candidate remedy commits to tags while carrying the true bitfield and opening secret inside ciphertext. The projection cost is real: SQL-style tag filters become decrypt-first work or require encrypted tag indexes with their own key policy.

**Save-boundary event granularity is the default finding.** Append-only chains cannot afford one externally visible event per keystroke on multi-year cases. The finding-level default is batching at draft, save, or submit boundaries, with per-field or per-section modes only when law or policy demands finer grain. Definition-time defaults remain open below.

**Erasure and shredding need counsel-labeled verifier semantics.** After PRK destruction, headers and mappings can still identify people and trajectories. A serious posture includes pseudonymous ledger identifiers, destroyable mapping keys, post-shredding header redaction, and a counsel-reviewed explanation of what verifiers can still prove when redacted event headers no longer match prior hashes. This is legal-technical work, not a casual implementation detail.

**Envelope crypto hygiene belongs in the threat model.** Hybrid public-key wrapping needs fresh ephemeral material per wrap operation, and implementations must not reuse wrapping keys informally across artifacts. Typestate in Rust may enforce this, but the contract is the threat-model rule, not a language trick. Reopen this input only if an accepted profile documents a deliberate weaker posture.

**Rotation is inventory, not a code drop.** PRK, tenant master, and selective-disclosure key rotation require epoch inventory, grace periods for verifying old epochs, and in-flight-session handling. Requirements that affect verifier semantics belong in the center spec; operational procedures belong in adapter profiles or product runbooks. This split prevents rotation from hiding unverifiable assumptions.

### Workflow Depth, WOS Vocabulary, And Release Shape

**WOS vocabulary has a clear direction.** Workflow center leans include five-kind events, tier-typed provenance, and explicit deontic, autonomy, and confidence semantics. Emission paths exist, but completeness and decision provenance record shape remain the largest depth gaps. Reopen this direction only if marketing treats partial emission as full provenance.

**Decision provenance comes first among deep workflow gaps.** The first deep WOS gap is a record that says which rule version ran, with which inputs, with which override rationale, and with which model-confidence hooks. That record matters more than polishing adjacent workflow features because audits need the decision basis first. Reopen this priority only if product pressure deliberately moves SLAs, XES export, or calendar logic ahead of deeper auditability.

**Adjacent workflow gaps stay named but secondary.** Temporal parameter versioning, date-effective legal parameters, business-calendar SLAs, XES-shaped export, and dynamic adaptation for evolving investigations remain open work. They are not forgotten; they are sequenced behind decision provenance unless an owner changes the priority.

**The Compass map informs depth, not sequencing.** The Compass map is useful vocabulary for WOS depth, but it should not force BPMN gigantism, BPEL-style transport coupling, XPDL-style interchange without execution, or flowchart-only rigidity for investigations. Reopen this posture only if an owner deliberately adopts the map as a bill of materials.

**Per-layer tags are the technical release lean.** Formspec, WOS, and Trellis do not mature as one repository with one release train. The technical lean is per-layer tags plus explicit compatibility matrices. Reopen this lean only if an enterprise deal requires a single stack label; then create a matrix-backed bundle label, not a fake monotonic version.

**A shared semantic fixture gates stack conformance claims.** Before the stack claims conformance, one shared fixture should cross every seam: canonical response to `SignatureAffirmation`, custody append, export, and verify across all five contracts. This fixture prevents each layer from optimizing tests in isolation. Reopen shared ownership only if the organization names seam owners and done criteria for separate fixture suites.

**Reserved crypto slots stay empty until activated.** Pedersen-shaped reservations and similar fields must remain zero-populated until a named profile opens them. When Pedersen-class vectors are used, fixed-length commitment vectors per event type are the defensible pattern because vector length should not reveal which numeric fields were populated. Reopen this lean only when a profile ships with vectors.

**Evidence binding uses dual-hash framing.** The current evidence-binding ADR cluster uses one hash for the plaintext payload the builder intended and a second hash for the full transmitted package used in Merkle inclusion and `prev_hash` linkage. Exporters and verifiers must share one domain-separated, length-prefixed construction. Reopen this lean only if dual-hash proves wrong in practice and a vectored corrigendum replaces it.

**Compliance-related events are exported or explicitly out of scope.** A dashboard-only compliance event creates hidden truth that a verifier cannot inspect. Every compliance-related event either belongs in the export bundle model or is explicitly outside integrity scope. Reopen this rule only if a regulator forbids exporting a class of events; then redefine scope in writing.

**DocuSign-class product posture needs counsel.** The rough product floor is common-case signing plus ESIGN, UETA, and eIDAS-aware analysis, but counsel must pin the actual legal claim. This product posture does not replace WOS workflow semantics or Trellis evidence semantics. Reopen the floor when counsel says the legal or product bar moved.

---

## Part C — Forks Under Current Leans

The choices in this section remain open, but each one sits under an end-state commitment and a current implementation default. Work can proceed under the lean while the fork is decided, as long as the unresolved choice stays visible.

**Federated topology sits under the one-logical-case narrative.** The lean is one logical append narrative per case. The fork is how future federated logs cross-reference that narrative, what precedence rules verifiers apply, and what happens when a cross-link fails or forks.

**Immutable primary escalation sits under the Postgres plus `ct_merkle` lean.** The lean is relational storage plus `ct_merkle`. The fork is what measured inclusion, replay, or equivocation failure would justify immudb-class primary storage, an rs_merkle-class swap, or a witness-tier escalation.

**`ct_merkle` wiring is an implementation-sequencing fork.** The lean is to wire `ct_merkle` into Postgres and export paths after a bounded spike. The fork is the exact spike order and metric threshold, not whether inclusion, replay, export, and verification remain required.

**JWS pressure sits under the dCBOR byte canon.** The lean is dCBOR-class signed bytes. The fork is whether market pressure requires a JWS profile, and if so, the exact deterministic transcoding contract into verifier input.

**Real KMS trees may qualify PRK independence.** The lean is independent PRK or equivalent isolation. The fork is whether HSM or multi-cloud reality requires a documented derivation tree that still preserves the compromise story.

**BBS+ remains optional unless unlinkability becomes central.** The lean is SD-JWT-style selective disclosure. The fork is whether BBS+ becomes default for a profile after draft levels, implementation risk, and unlinkability requirements are pinned.

**Engine selection sits behind `DurableRuntime`.** The lean is a stable durable-execution seam with Restate as the preferred reference adapter pending spike evidence. The fork is whether SLA, license cost, team skill, stalled-state behavior, or buyer constraints force Temporal or another engine behind the same semantic interface.

**Saga compensation edge cases sit under ledger-visible compensation.** The lean is governance-shaped, ledger-visible compensation. The fork is which workflow types need operational patterns that resemble saga behavior and how those patterns remain verifier-visible.

**Commit terminology must conform to append authority.** The lean is that Trellis append is evidentiary commit authority. The fork is how the docs and runtime name pre-append, post-append, hard commit, soft commit, retry, and failure states without weakening that authority.

**Sales packaging sits under per-layer technical tags.** The lean is per-layer tags with compatibility matrices. The fork is whether product or procurement needs a matrix-backed "stack 1.0" label or PoC milestone name.

**Fixture ownership has a default and a fallback.** The lean is one shared cross-seam fixture under shared CI ownership. The fork is the fallback if joint ownership fails: seam-owned suites with explicit owners, fixture boundaries, and done criteria.

**Python cross-check depth remains adjustable.** The lean keeps Python in full CI cross-check for byte authority. The fork is whether a later ADR narrows Python to per-byte-authority checks, property tests, or another guard with equivalent seriousness.

**HLC and causal dependencies remain a product and evidence fork.** The candidate pattern is HLC plus explicit causal dependencies. The fork is whether the product needs the full DAG-merge story, receipt order with weaker testimony, or a middle profile such as causal dependencies only for FEL-marked fields.

**Client continuity thickness sits under the four-layer privacy chain.** The end state has client continuity, server-authoritative respondent-ledger admission, platform audit, and offline export proof. The fork is how much history, key material, and sync authority live client-side without weakening server admission or marketing honesty.

**Witness adapter selection sits under export-first integrity.** The end state supports witness profiles over checkpoint roots. The fork is which profile ships first: export-only local verification, OpenTimestamps-class anchoring, Rekor-class transparency logging, custom tile logs, or multiple witnesses with explicit precedence rules.

**Workflow-lite signing sits under one signing meaning.** A fast path may exist for product ergonomics, but it must emit the same WOS `SignatureAffirmation` semantics and custody inputs as ordinary workflow signing. The fork is how small that workflow-lite profile can be without creating a second meaning of "signed."

**Tag filtering remains a data-plane fork under tag commitments.** If tag commitments become center semantics, tag bits may live only behind ciphertext, in projection-specific encrypted indexes, or in a small public tag set. Each option pays a different privacy and query cost.

**Event granularity defaults remain definition-time policy.** The finding-level default is save/submit batching. The fork is how each definition sets draft-session, per-field, per-section, cap, and auto-save behavior without overloading the byte ADRs.

**Expert-panel cryptography remains profile-gated.** FHE, MPC, threshold signing, and similar mechanisms do not become center defaults through demo pressure. The fork is which product line or threat model justifies a named profile.

---

## Part D — True Open Forks

The choices in this section have no end-state default yet. They need an owner decision before implementation treats one branch as normal.

**Durable-work stalled-state semantics are not closed.** Production-grade durable execution needs a clear meaning for "stalled" and a clear remediation path before "resume" can become safe. Without that rule, resume risks becoming silent mutation.

**Amendment and supersession are not closed.** Verifiers must understand superseded artifacts, and that requirement ties directly to export bundle versioning. Federation-era supersession is a governance problem, not a storage toggle.

**Statutory clock materialization is not closed.** Materialize once and recompute-on-demand remain competing approaches because deadlines intersect procurement, admissibility, and engineering. "Materialized once" must be validated against procurement reality before it becomes a default.

**Tenant and scope identifiers are not closed.** Format, isolation guarantees, and cross-tenant leakage rules remain open at a level that every multi-tenant API depends on. This is high-debt architecture work, not naming cleanup.

**Time semantics across authoring and runtime are not closed.** The stack still needs one story for authoring timezone, runtime timezone, `today()`, and `now()` in audit trails. Until that story lands, time-sensitive fixtures remain weaker than they should be.

**Migration pin policy is not closed.** Formspec changelog-driven migration and verifier semantic bundles can conflict. The open decision is who guarantees completeness of what a verifier loads, and how auto-migration composes with cross-layer migration ADRs.

**Verifier distribution is not closed.** CLI, SaaS-hosted verifier, embedded library, and reproducible release bundle each imply different trust roots, update channels, and air-gap behavior. This is productization and trust design, not just packaging.

**The coprocessor boundary is not closed.** The intake coprocessor might emit the case boundary event, or workflow might emit `case.created`. The coprocessor spec gap cannot close until one owner owns that boundary.

**The authoring middleware contract is not closed.** Freezing the `RawProject`-shaped middleware contract before Studio ships trades velocity for stability. Shipping Studio first trades stability for product speed. The project still needs to choose the acceptable risk.

**Orphan reference cryptography is not closed.** Experimental crypto reference code must be integrated into owned crates, deleted, or parked behind a named flag. Leaving it unowned lets semantics rot.

**Post-provenance workflow ordering is not closed.** After decision provenance begins, SLAs, XES-shaped export, calendar logic, and integration breadth still compete for priority. The ordering should be explicit rather than rediscovered every session.

**Governance theme ordering is not closed.** Amendment and statutory clocks appear to be the widest blockers before safe unified-ledger-class implementation. Tenant, time, failure semantics, migration, and evidence binding cluster as high-debt coherence decisions. The organization can accept that partial ordering or keep deciding ad hoc.

**Runtime attestation on writes is not closed.** Future work may attach attestation at write time through existing seams without redefining the byte center overnight. The capability remains open until vocabulary and vectors exist.

**Human certificate-of-completion ownership is not closed.** The accepted signature-profile workflow slice leaves certificate-of-completion composition and some DocuSign-class administrative experiences out of scope. Product and integrity still need to assign those capabilities.

---

## Kill Criteria

Each kill criterion below is mandatory review evidence. If one fires, the relevant lean should be reopened rather than defended by inertia.

**Relational plus `ct_merkle` fails realistic load.** Reopen the storage lean when realistic payload distributions show inclusion breaks, replay exceeds SLOs, or operator-equivocation risk remains intolerable after honest engineering.

**Verifiers disagree on one semantic fixture.** Reopen the byte or semantic canon when implementations disagree on the same fixture. A canonical story that diverges across implementations is not canonical.

**Procurement demands stronger witness semantics.** Reopen the witness posture when buyer requirements cannot be represented without pretending witness services are primary storage. That is a model conflict, not a sales detail.

**Durable transitions disappear from exports.** Reopen durable-runtime boundaries when workflow transitions cannot be reconstructed from exported events. At that point, the engine has become a shadow ledger.

**Migration bundles require manual repair.** Reopen migration semantics when verifiers cannot accept semantic bundles without manual repair. That failure becomes a customer incident, not an internal tooling nuisance.

**Evidence binding diverges across exporter, ledger, and verifier.** Reopen evidence-binding semantics when dual-hash or binding behavior mismatches in practice. A binding story that implementations cannot reproduce is unsafe to teach externally.

---

## Organizational And Product Constraints

**Bus factor remains a first-order architecture constraint.** A new principal engineer must be able to recover the architecture from written semantics, vectors, and verifier behavior, not from private memory. The process for that recovery is still immature.

**Regulated-market evidence packages change purchasability.** Authorization-to-operate-class posture, SOC-style operational attestations, accessibility conformance statements, and commercial schedule vehicles can advance in parallel with integrity work. These artifacts change what buyers can buy more than what bytes prove.

**Buyer proof and engineering proof require separate packages.** Purchasability evidence and verifier evidence overlap, but they are not identical. The organization needs both a buyer-facing evidence package with dates and owners and an engineering-facing verifier package with vectors, release artifacts, and reproducible behavior.

**Online-trust-first demos are sequencing, not architecture.** A team may polish in-app trust before export maturity for sales or usability, but that product sequence cannot weaken the export-first integrity claim. Any demo that implies verifier maturity must include the offline verifier path.

**Product plumbing changes usable scope.** Reviewer workflows, large-binary intake, webhooks, notifications, and similar product plumbing can advance in parallel with evidence packages. A "demo done" claim that collapses plumbing and proof hides gaps on both sides.

**Adapter spikes need dates or expiry conditions.** A spike without a date becomes permanent architecture by neglect. Every proof exercise should name the date, metric, or decision condition that closes it.

**Custody and marketing language need counsel alignment.** Claims such as "free e-sign" and "end-to-end user sovereignty" must match who can decrypt in ordinary operation and what metadata still leaks. Technical architecture cannot absorb a legal or product sentence that the cryptography does not support.

**Sidecar and schema debt constrain decision quality.** Sidecar gaps, schema-description completeness, and syntax-only synthesis tooling are debt registers, not shame lists. They become leans only when an owner attaches dates and acceptance tests.

**WOS and governance debt constrain provenance claims.** Typed event meta-vocabulary, provenance export blocked on amendment policy, and facts-tier snapshots awaiting governance acceptance limit how far provenance and export claims can go. Those gaps should stay visible until closed.

**Formspec coprocessor and Studio debt constrain stack UX.** Form-level coprocessor intake is stalled on the coprocessor-boundary decision. Chaos tests and Studio P0-P6 work remain mostly internal beyond signing-authoring UX. Those items are not roadmap promises until dated and accepted.

**Planning-index drift is process debt.** Human-maintained "next free ADR id" lines and similar index prose can lag what exists on disk across repos. Treat that mismatch as triage-confusing process debt, not evidence of architecture truth.

These constraints are gates, not a roadmap. Technical leans must satisfy them, or the organization must override them with an explicit signed risk decision.
