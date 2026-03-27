# ADR-0054: Privacy-Preserving Client/Server Ledger Chain for the Formspec Ecosystem

**Status:** Proposed  
**Date:** 2026-03-22  
**Owners:** Platform Engineering, Security, Product Architecture, Applied Cryptography  
**Decision Type:** Architecture, trust model, cryptography, client/server implementation  
**Scope:** Respondent clients, APIs, sync services, tenant data planes, audit verification, export packages, cross-cell integrity

---

## Title

Define a **privacy-preserving, client/server ledger chain** that spans the Formspec ecosystem end to end:

- respondent-side draft capture,
- server-side authoritative audit persistence,
- tenant and cell integrity chaining,
- portable verification bundles,
- and higher-assurance privacy proofs.

This ADR extends the platform audit architecture so the system can support:

1. **client-captured respondent history**,  
2. **server-verifiable append-only ledgers**,  
3. **encrypted and selectively disclosed evidence**,  
4. **zero-knowledge proof workflows for verification without payload exposure**,  
5. **multi-party controls for high-assurance signing and verification**, and  
6. **privacy-preserving aggregate computation across the ecosystem where plaintext centralization is not acceptable**, and  
7. **provider-neutral identity, DID, and proof-of-personhood integration from the ground up**, and
8. **tier-aware identity disclosure profiles inspired by tiered-privacy approaches**.

The goal is not “put every form event on blockchain-with-buzzwords.” The goal is to build one coherent chain of trust from the respondent device to the authoritative platform ledger and onward into export, review, and assurance workflows.

---

## Context

The repository now contains two closely related tracks of work:

- the **platform-wide tamper-evident audit ledger** defined in **ADR-0003**, and  
- the **respondent-facing ledger add-on** defined in the audit spec draft and companion schemas.

Those artifacts establish the need for material event capture, append-only history, and signed checkpoints. But they do not yet answer the end-to-end implementation question:

**How should the respondent/client ledger, the server ledger, and ecosystem-level verification fit together when stronger privacy and assurance guarantees are required?**

That question matters because the product is expected to support:

- ordinary SaaS draft/save/submit flows,
- regulated and government workflows,
- dispute and appeal packages,
- portable exports,
- support investigations,
- cross-device draft resumption,
- partner and delegated completion workflows,
- and future multi-party environments where a single operator asserting “trust us” is not enough.

Prior ADRs already establish critical constraints:

- **ADR-0001** defines tiered deployment and assurance expectations.  
- **ADR-0002** defines the control-plane / data-plane / cell architecture.  
- **ADR-0003** defines append-only tamper-evident audit integrity.  
- **ADR-0007** defines key management and signature lifecycle.  
- **ADR-0009** defines document/evidence handling and file security.  
- **ADR-0012** defines retention, deletion, and legal-hold semantics.  
- **ADR-0013** defines portability and export packaging.  
- **ADR-0015** defines tier-aware compliance and assurance boundaries.

This ADR adds the missing bridge between the respondent-side ledger model and the platform-wide audit chain, while also setting rules for advanced cryptographic capabilities such as encryption, zkSNARKs, multi-party computation (MPC), homomorphic encryption (HE), and provider-neutral identity / proof-of-personhood integration.

---

## Problem Statement

We need an architecture that can simultaneously provide:

1. **usable respondent history** on client and server,  
2. **authoritative append-only audit history** on the server side,  
3. **cross-system integrity continuity** across devices, APIs, tenant stores, and export packages,  
4. **privacy controls strong enough for sensitive and regulated data**,  
5. **proof mechanisms that allow verification without disclosing raw contents**, and  
6. **a realistic implementation path** that does not make basic draft/save/submit flows unusably expensive, and  
7. **an identity architecture that can support DID-native flows and third-party providers such as ID.me without rewriting the ledger model**.

The architecture question is therefore:

**What cryptographic and systems model should govern the client/server respondent ledger chain across the entire Formspec ecosystem?**

---

## Decision Drivers

### End-to-end trust
- Respondent-visible history must line up with server-authoritative history.
- A reviewer, auditor, or customer should be able to verify continuity across save, submit, amendment, export, and archive boundaries.

### Privacy by architecture
- Sensitive answers, attachments, and derived signals cannot be sprayed across every verification surface.
- Proof should often be possible without revealing raw form contents.

### Multi-party assurance
- Some customers will require separation of duties across provider, tenant, regulator, or external custodian boundaries.
- High-assurance workflows need controls stronger than “one service account signs everything.”

### Practicality
- Most deployments still need normal product responsiveness.
- Expensive cryptography must be reserved for the places where it materially improves assurance.

### Portability and survivability
- The chain must survive export, migration, and cross-tier movement.
- Proofs and encrypted artifacts must remain interpretable outside the live SaaS runtime.

---

## Assumptions

This ADR assumes:

1. The Formspec `Response` remains the canonical current-state document.  
2. Respondent ledgers are additive explanatory history layered on top of `Response`, not replacements for it.  
3. The platform audit ledger remains the authoritative server-side audit integrity mechanism.  
4. Client devices are valuable trust contributors but are not assumed to be perfectly trusted.  
5. Advanced cryptography is useful, but only when attached to clear trust boundaries and operational use cases.  
6. Different deployment tiers may enable different subsets of the model.

---

## Considered Options

### Option A: Server-only ledger, conventional encryption, no advanced proof system

Keep all authoritative logic on the server. Clients merely send saves and submissions.

#### Advantages
- simplest implementation,
- lowest product latency,
- easiest operational model.

#### Disadvantages
- weak respondent-side continuity,
- weaker offline and cross-device auditability,
- poor story for selective disclosure and external verification,
- no clean bridge to advanced regulated workflows.

#### Why we are not choosing it
It is too weak for the ecosystem-level trust model we want.

---

### Option B: Full client/server cryptographic parity everywhere

Require every client event and every server event to be fully encrypted, zero-knowledge proved, MPC-co-signed, and HE-compatible by default.

#### Advantages
- maximal cryptographic ambition,
- strong privacy posture on paper.

#### Disadvantages
- operationally unrealistic,
- expensive and latency-heavy,
- difficult to explain and support,
- likely to block adoption of the respondent ledger entirely.

#### Why we are not choosing it
This would turn the product into a research project.

---

### Option C: Layered trust chain with tiered cryptographic capabilities

Adopt one coherent client/server ledger chain with:

- **baseline append-only encrypted ledgers and signatures everywhere**,
- **selective advanced proofs where assurance needs justify them**,
- **MPC for split-control and threshold trust boundaries**,
- **HE for narrow privacy-preserving aggregate workloads rather than general transaction processing**,
- and a portable export model that preserves verification outside the platform.

#### Advantages
- practical baseline,
- strong upgrade path,
- aligns with deployment tiers,
- credible story for government and regulated buyers,
- preserves product usability.

#### Disadvantages
- more complex than a plain audit log,
- requires profile-driven implementation discipline,
- demands clear documentation so teams know which crypto layers apply where.

#### Why we are choosing it
It is the only option that is both ambitious enough for the target market and realistic enough to build.

---

## Decision

We will implement the ledger as a **four-layer privacy-preserving trust chain**.

### Layer 1: Respondent client ledger
The client runtime may maintain an encrypted local respondent ledger for durable draft history, offline continuity, resume support, and user-facing timelines.

### Layer 2: Server authoritative respondent ledger
The server will maintain the authoritative append-only respondent ledger and associated canonical `Response` snapshot state for each logical intake record.

### Layer 3: Platform audit ledger chain
Material respondent-ledger checkpoints and related workflow/document events will flow into the platform-wide tamper-evident audit ledger defined by ADR-0003.

### Layer 4: Ecosystem proof/export layer
Exports, review bundles, portability packages, regulator evidence packages, and external anchors will carry verifiable proofs derived from the lower layers without requiring full plaintext disclosure.

Across those layers:

- **response and audit continuity** are implementation-agnostic and may be stored off-chain, on-chain, or in hybrid custody models,  
- **subject continuity** is represented through a stable pseudonymous reference rather than requiring legal identity in every ledger write,  
- **encryption** is mandatory for stored ledger payloads and sensitive transport surfaces,  
- **zkSNARKs** are used for privacy-preserving verification of specific claims,  
- **MPC** is used for split-control signing, decryption, and high-assurance verification gates,  
- **homomorphic encryption** is used only for scoped aggregate analytics or attestations where encrypted computation materially reduces disclosure risk,  
- **DIDs and proof-of-personhood attestations** are modeled as provider-neutral identity evidence, not vendor-specific special cases.

We explicitly reject using zkSNARKs, MPC, or homomorphic encryption as blanket requirements for every event write.

---

## Canonical Architecture

## 1. Respondent client implementation

### 1.1 Local ledger role
Client applications that support durable drafts or offline capability should maintain a local append-only respondent ledger segment containing material user-visible events such as:

- draft created,
- draft resumed,
- draft saved,
- prepopulation applied,
- attachment added/replaced/removed,
- submit attempted,
- amendment opened,
- amendment completed.

### 1.2 Local encryption
The local ledger must be protected with envelope encryption.

Recommended shape:
- per-draft or per-response **data encryption key (DEK)**,
- DEK wrapped by a device-bound or session-bound **key encryption key (KEK)**,
- attachment and large evidence objects encrypted separately from small event metadata,
- local secrets stored in platform-appropriate secure storage when available.

### 1.3 Client signing and attestation
Where supported, the client should produce a lightweight event-batch attestation over canonicalized local events using:

- device-held keys,
- passkey-backed keys,
- hardware-backed platform keys,
- or tenant-issued ephemeral session keys.

These signatures are evidence of capture continuity, not sole sources of truth.

### 1.4 Sync behavior
Client sync to the server must transmit:

- the material event batch,
- client batch hash,
- local sequence range,
- local encryption metadata envelope,
- and any client-side attestations.

The server must preserve the submission as evidence even when it does not treat every client-side claim as authoritative.

---

## 2. Server authoritative implementation

### 2.1 Authority model
The authoritative respondent ledger lives on the server in the tenant data plane.

The server is responsible for:
- canonical event validation,
- event sequencing,
- conflict resolution,
- response snapshot updates,
- durable encryption at rest,
- and bridging material checkpoints into the platform audit ledger.

### 2.2 Server-side encryption
Server-side ledger payloads must be encrypted at rest using tenant-aware key hierarchy rules from ADR-0007.

Recommended hierarchy:
- cell master material or HSM/KMS root,
- tenant-scoped KEKs where tier requires it,
- ledger-specific or object-class DEKs,
- separate encryption domains for attachments, response payloads, and event metadata.

### 2.3 Canonicalization and commitments
Before hashing, the server must canonicalize ledger events and build cryptographic commitments that support later proof workflows.

At minimum the server should produce:
- canonical event digest,
- prior-event linkage,
- batch Merkle root or equivalent inclusion structure,
- checkpoint signature material,
- redaction-aware content commitments for selectively revealable fields.

### 2.4 Response/ledger consistency
The server must be able to prove that the current `Response` snapshot is consistent with retained ledger history.

This does not require replay for normal application behavior, but it does require the system to maintain enough evidence to verify that:
- a given response hash corresponds to a specific event chain head,
- amendments extend rather than replace prior history,
- migrations are represented as explicit material events,
- exported evidence packages correspond to signed checkpoint ranges.

---

## Identity, Proof of Personhood, and DID Architecture

## 3A. Identity layer goal

Identity-sensitive flows must be part of the ledger architecture from the ground up rather than bolt-on auth metadata.

That includes:
- proof-of-personhood checks,
- delegated-completion authority,
- DID issuance or DID binding,
- wallet-presented credentials,
- and third-party provider sessions such as **ID.me**.

## 3A.1 Decoupled planes

The framework separates three interoperable but decoupled planes:

1. **Response plane** — the canonical Formspec `Response` snapshot.
2. **Audit plane** — respondent-ledger events, hashes, checkpoints, and optional anchors.
3. **Identity plane** — provider-neutral personhood, DID, delegation, and proofing evidence.

These planes may share references, but they must not be collapsed into one storage or disclosure model. A deployment may therefore keep the response plane and audit plane anonymous or pseudonymous — including when anchoring commitments on-chain — while only the identity plane carries proofing artifacts and disclosure controls.

## 3B. Tiered privacy model

Identity evidence in the ledger must distinguish between **how strongly something was verified** and **how much identity is disclosed**.

We will therefore treat `assuranceLevel` and `privacyTier` as separate dimensions. A high-assurance proof-of-personhood flow may still resolve to an anonymous or pseudonymous event record, while a lower-assurance workflow may still disclose a known account identifier for operational reasons.

Recommended privacy tiers are:
- `anonymous` — no durable service-visible subject identifier is revealed in ordinary workflow use,
- `pseudonymous` — a stable case or account-scoped identifier is available without broad real-world identity disclosure,
- `identified` — the operator can bind the event to a real-world identity under normal controls,
- `public` — the identity is intended for broad disclosure in exports, attestations, or public-facing workflows.

This is inspired by tiered-privacy identity models such as TPIF, but applied here as a ledger and disclosure policy concern rather than a mandate for any specific blockchain or consortium design.

## 3C. Canonical identity evidence model

The ledger must treat identity evidence as a **provider-neutral canonical object** with stable fields such as:
- provider,
- adapter,
- subjectRef,
- did,
- verificationMethod,
- credentialType,
- credentialRef,
- personhoodCheck,
- subjectBinding,
- assuranceLevel,
- privacyTier,
- selectiveDisclosureProfile,
- and encrypted evidence references.

## 3D. DID compatibility

Where DID-based identity is used, the ledger should record:
- the subject DID,
- the verification method or DID URL used for verification,
- the credential or presentation reference,
- and the assurance/policy profile satisfied.

The ledger is not itself a DID registry. It is the durable audit and continuity record for DID-related events.

## 3E. Proof of Personhood integration

Proof of personhood results are material when they affect eligibility, account-linking, delegation, anti-fraud controls, or completion authority.

Those results should be represented as auditable events like `identity-verified` and `attestation.captured`, with privacy-preserving reveal bundles rather than raw biometric or vendor payload dumps in the primary ledger.

## 3F. Adapter boundary for providers such as ID.me

Third-party identity providers must integrate through an adapter/interface boundary rather than writing provider-native event shapes directly into the ledger.

An **ID.me** adapter, for example, should be able to emit the canonical identity evidence object plus encrypted provider-response evidence and assurance metadata without changing the ledger schema or proof model.

This rule keeps the ledger portable across:
- ID.me,
- DID wallet flows,
- internal proofing services,
- future government identity providers,
- and delegated identity brokers.

## 3. Ecosystem chain model

The full ecosystem chain is:

1. **client event segment** →  
2. **server respondent ledger** →  
3. **tenant/platform audit checkpoint** →  
4. **cell/global anchor or export proof package**.

Each step must preserve linkage to the previous layer via signed hashes, Merkle commitments, or equivalent verifiable digests.

This means an investigator or customer should be able to verify, within the limits of available keys and policy, that:

- a respondent-visible timeline corresponds to server-retained events,
- server-retained events correspond to platform audit checkpoints,
- checkpoint digests correspond to external anchors or export packages,
- and the chain has not been silently rewritten.

---

## Cryptographic Capability Rules

## 4. Encryption

### 4.1 Baseline rule
Encryption is mandatory for ledger payload confidentiality in transit and at rest.

### 4.2 Required uses
Encryption must protect:
- local respondent-ledger payloads when stored on device,
- server ledger payloads at rest,
- attachment references and payloads,
- proof packages containing sensitive revealable content,
- intermediate artifacts used for export or review.

### 4.2AA Anonymous or on-chain-compatible custody
The architecture must support deployments in which:

- the response payload remains off-chain while only commitments are anchored on-chain,
- the audit ledger remains pseudonymous via `subjectRef`,
- identity proof evidence is held separately and revealed only through approved disclosure profiles,
- and the same canonical event model survives whether the underlying implementation uses SaaS storage, tenant custody, or chain-based anchoring.

### 4.2A Tier-aware review and export
The same ledger event may need to appear differently in:

- respondent-visible history,
- support tooling,
- regulator or adjudicator bundles, and
- public or partner-facing attestations.

Implementations should therefore attach a named disclosure profile to identity-sensitive evidence so the export pipeline can deterministically reveal only what the selected tier allows.

### 4.3 Selective disclosure
The architecture must support selective disclosure by separating:
- plaintext payloads,
- commitments/hashes,
- display-safe summaries,
- and encrypted reveal bundles.

---

## 5. zkSNARKs

### 5.1 Role
zkSNARKs are the preferred mechanism for proving narrow high-value claims about ledger state **without revealing the underlying sensitive payloads**.

### 5.2 Approved use cases
zkSNARKs may be used to prove, for example:
- an event is included in a signed checkpoint range,
- a redacted export is faithful to an original committed event set,
- a submission satisfied a specific validation predicate at completion time,
- a response hash derives from a committed event chain head,
- a migration or amendment followed an approved transformation rule,
- a policy gate was satisfied without revealing the underlying values.

### 5.3 Non-goal
zkSNARKs are not required for routine save/submit latency paths in baseline deployments.

### 5.4 Implementation rule
Proof circuits must be versioned, auditable, and explicitly tied to policy or verification profiles. No invisible “magic proof” layer is allowed.

---

## 6. Multi-party computation (MPC)

### 6.1 Role
MPC is the preferred mechanism for **split-control trust boundaries** where no single operator should be able to unilaterally sign, decrypt, or attest to sensitive ledger state.

### 6.2 Approved use cases
MPC or threshold cryptography may be used for:
- threshold checkpoint signing,
- split approval for high-assurance export decryption,
- cross-organization attestation where provider and tenant must both participate,
- regulator-visible proof workflows where one party must not hold all the material,
- recovery and compromise-response workflows for high-assurance keys.

### 6.3 Baseline rule
MPC is not required for ordinary Shared Cloud event ingestion, but the architecture must not preclude it for Regulated Cloud or Dedicated deployments.

---

## 7. Homomorphic encryption (HE)

### 7.1 Role
Homomorphic encryption is approved for **scoped aggregate computation on encrypted ledger-derived signals** where revealing plaintext is more dangerous than the computational overhead is costly.

### 7.2 Approved use cases
HE may be used for:
- encrypted aggregate analytics across sensitive response populations,
- privacy-preserving risk or anomaly counts,
- regulator-approved summary reporting where raw records must remain concealed,
- proof-supporting computations over committed or encrypted features.

### 7.3 Explicit limitation
HE is not the transaction engine for draft saves, validation, or core workflow execution. It is a specialized privacy-preserving analytics and attestation tool.

---

## Trust Profiles by Deployment Tier

## 8. Shared Cloud

Shared Cloud must support:
- encrypted local and server ledger storage,
- signed server checkpoints,
- exportable integrity proofs,
- optional client attestations,
- no requirement for MPC or zkSNARKs in default flows.

## 9. Regulated Cloud

Regulated Cloud should additionally support:
- tenant-scoped or program-scoped key hierarchy,
- stronger client attestation options,
- zkSNARK-backed redaction/inclusion proofs for exports,
- threshold signing or MPC for selected checkpoint and export operations.

## 10. Dedicated / Private Instance

Dedicated deployments may require:
- customer-held or customer-approved trust roots,
- customer-participating threshold or MPC signing,
- external notarization or regulator-observable checkpointing,
- specialized zk proof circuits and encrypted analytics profiles,
- stricter data residency and proof-verification packaging.

---

## Client/Server Data Flow

## 11. Happy path

1. respondent edits data locally;  
2. client app emits material local ledger events;  
3. local ledger segment is encrypted and optionally attested;  
4. sync batch is sent to server;  
5. server validates, canonicalizes, sequences, and persists authoritative events;  
6. server updates canonical `Response`;  
7. server produces batch commitments and signed checkpoints;  
8. material checkpoint metadata flows into the platform audit ledger;  
9. exports and review packages derive from committed ledger ranges.

## 12. Conflict / merge path

When parallel edits, resume conflicts, or delegated-entry collisions occur:

- the server remains the arbiter of authoritative sequencing,
- the respondent ledger records merge-resolution events explicitly,
- any dropped or superseded branch must remain explainable in audit history,
- proof artifacts must distinguish “client claimed” from “server accepted” events.

---

## Data Model Implications

The canonical respondent ledger model should therefore support, either directly or through extensions:

- encrypted payload references,
- content commitments,
- proof references,
- attestation references,
- DID identifiers and verification-method references,
- proof-of-personhood state and provider-neutral adapter metadata,
- threshold-signature metadata,
- reveal-package references,
- and policy/profile identifiers describing which cryptographic guarantees apply.

The platform audit ledger must be able to anchor respondent-ledger checkpoints without ingesting all respondent plaintext into its public proof surface.

---

## Security and Privacy Consequences

## Positive consequences
- stronger end-to-end trust from device to export,
- better respondent continuity and support explainability,
- improved selective disclosure for audits and appeals,
- reduced need to reveal raw sensitive data during verification,
- better fit for government and multi-party trust environments.

## Negative consequences
- materially higher implementation complexity,
- more key lifecycle and proof-system operational burden,
- risk of cargo-cult cryptography if profiles are not enforced,
- specialized verification tooling becomes mandatory for advanced deployments.

---

## Rejected Alternatives

1. **Client history as UX-only local state with no server-verifiable continuity.** Rejected because it breaks the trust chain.  
2. **Server-only trust with no selective-disclosure proof model.** Rejected because it overexposes sensitive data in review and export workflows.  
3. **Universal zk/MPC/HE on every event path.** Rejected because it is operationally unreasonable.  
4. **Public blockchain as the coordination layer for respondent ledgers.** Rejected because it does not match the privacy model or transaction shape.

---

## Configuration Profiles

This architecture makes sense, but only if deployments are explicit about what profile they are running. The canonical model should stay stable while operational guarantees vary by profile.

### Profile 1: Standard respondent history
- local/server ledger capture,
- privacy minimization on by default,
- no mandatory external anchoring,
- no mandatory identity proofing beyond ordinary auth.

### Profile 2: Pseudonymous integrity mode
- `subjectRef` continuity required,
- signed checkpoints and platform audit anchoring enabled,
- response payload may remain off-chain while commitments are anchored,
- identity proofing still optional and externalized.

### Profile 3: Identity-bound assurance mode
- identity proofing and/or proof-of-personhood policy enforced,
- disclosure profiles and assurance levels governed,
- export/review proof controls strengthened,
- threshold or advanced cryptography enabled where tier policy requires it.

The main thing that should **not** vary is the event semantics themselves. If event meaning changes by deployment, portability and verification collapse. What should vary is policy: retention, anchoring, proof requirements, disclosure profiles, and assurance thresholds.

---

## Rollout Plan

### Phase 1: Baseline client/server respondent ledger
- encrypted local draft ledger support,
- authoritative server respondent ledger,
- sync batch hashing and signed server checkpoints,
- linkage into the platform audit ledger.

### Phase 2: Selective disclosure and proof-ready commitments
- Merkleized checkpoint structures,
- redaction-aware commitments,
- portable reveal-package format,
- proof reference support in exports.

### Phase 3: zk proof profiles
- inclusion and redaction-faithfulness proofs,
- response/ledger consistency proofs,
- profile-specific verifier tooling.

### Phase 4: MPC and threshold assurance profiles
- split-control signing,
- multi-party export release,
- tenant/customer co-verification modes.

### Phase 5: Scoped HE analytics
- encrypted aggregate reporting,
- privacy-preserving anomaly and assurance summaries,
- regulator/customer-specific analytics profiles.

---

## Acceptance Criteria

This ADR is satisfied when the architecture can support all of the following:

1. respondent-ledger continuity from client capture to server authority,  
2. encrypted local and server ledger storage,  
3. signed checkpoint linkage into the platform audit ledger,  
4. portable export bundles that preserve verification lineage,  
5. selective-disclosure workflows that do not require full plaintext release,  
6. provider-neutral identity, DID, and proof-of-personhood evidence that can support adapters such as ID.me without schema redesign,  
7. decoupled response/audit/identity planes that allow anonymous or pseudonymous custody independent of proofing,  
8. tier-aware privacy/disclosure semantics so assurance and identity reveal can evolve independently,  
9. optional zk proof workflows for defined high-assurance claims,  
10. optional MPC/threshold trust boundaries for high-assurance signing and release,  
11. scoped HE support for privacy-preserving aggregate computation without turning HE into the primary runtime.

---

## Open Questions

- Which proof systems and circuits are realistic to standardize first for the respondent-ledger domain?  
- Which cryptographic profiles should be mandatory by deployment tier versus optional add-ons?  
- How much client-side attestation is worth the UX and device-compatibility cost?  
- Which exports need interactive reveal workflows versus static proof bundles?  
- Where should MPC sit first: checkpoint signing, export release, or customer-co-signed attestations?  
- Which HE workloads provide enough value to justify operational cost in the first regulated deployments?

---

## Relationship to Other ADRs

This ADR extends rather than replaces earlier decisions:

- **ADR-0003** remains the baseline tamper-evident audit ledger decision.  
- **ADR-0007** remains the key-management authority.  
- **ADR-0009** remains the document/evidence lifecycle authority.  
- **ADR-0012** remains the retention/deletion/legal-hold authority.  
- **ADR-0013** remains the portability/export packaging authority.  
- **ADR-0015** remains the tier-assurance packaging authority.

What this ADR adds is the **privacy-preserving chain-of-trust model** connecting the respondent/client ledger and server/platform ledger into one ecosystem story.

---

## Final Rationale

The platform needs more than an audit log and more than a respondent timeline. It needs a chain that can explain, verify, and selectively reveal history across client, server, and export boundaries.

The right answer is a **layered cryptographic architecture**:

- encryption everywhere sensitive data lives,
- append-only authoritative ledgers on the server,
- client-side continuity where it helps respondent trust,
- zkSNARKs for narrow high-value privacy-preserving proofs,
- MPC for split-control trust boundaries,
- homomorphic encryption for carefully scoped aggregate computation,
- and a portability model that survives outside the SaaS boundary.

That gives us an architecture that is ambitious enough for the ecosystem we want to build, without making every draft save feel like a cryptography dissertation.
