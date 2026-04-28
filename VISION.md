# Vision — Formspec + WOS + Trellis

**Status:** Internal companion to [`STACK.md`](STACK.md). Architectural commitment as of 2026-04-27. Target architecture; not an inventory of code already shipped.
**Authoritative for:** stack-wide operating frame, foundational architectural answers, cross-spec commitments, per-spec settled positions, the rejection list. Per-spec implementation detail lives in each project's own tree.
**Maintenance rule:** update only when the owner gives explicit signals that conflict with current content. Do NOT update speculatively. Treat each section as frozen until the owner overrides.

This document captures the architectural vision behind the Formspec + WOS + Trellis stack as it should exist when complete. It is paired with:

- [`STACK.md`](STACK.md) — public-facing integrative doc (partners, procurement, investors). Conceptual, externally legible. The five cross-layer contracts are canonically defined there.
- [`.claude/user_profile.md`](.claude/user_profile.md) — owner operating preferences (economic model, opinionatedness, communication style).
- [`.claude/operating-mode.md`](.claude/operating-mode.md) — behavioral interrupts that override default agent training.
- [`thoughts/specs/2026-04-22-platform-decisioning-forks-and-options.md`](thoughts/specs/2026-04-22-platform-decisioning-forks-and-options.md) — active platform decision register: end-state commitments, implementation leans, forks, kill criteria.

Per-spec implementation framing:

- **Formspec** — `CLAUDE.md` in this repo plus the `specs/` tree.
- **WOS** — [`wos-spec/CLAUDE.md`](wos-spec/CLAUDE.md). Reference-server architecture lives in [`wos-spec/crates/wos-server/VISION.md`](wos-spec/crates/wos-server/VISION.md).
- **Trellis** — [`trellis/CLAUDE.md`](trellis/CLAUDE.md). Phase-1 byte protocol at [`trellis/specs/trellis-core.md`](trellis/specs/trellis-core.md).

When these docs conflict with this one, direct owner signals override all of them.

---

## Read this first

**When to consult:**

- Before any architectural decision that crosses more than one subsystem within a spec, or any decision that crosses spec boundaries.
- When a new design question surfaces that isn't directly answered by existing specs.
- After context compaction, to re-orient.
- Before dispatching parallel agents on load-bearing work.

**When NOT to use:**

- For local tactical decisions inside a single file/function — follow the code.
- As a substitute for asking the owner when a genuinely new question arises. This doc answers the questions it was built to answer.

---

## I. Operating Frame

**Optimization target: architectural elegance and minimum conceptual debt.** Tokens, AI agents, and frontier-model inference are unlimited. Calendar time and tech debt are scarce. The bottleneck is not single-threaded human typing.

This produces specific stances:

- **No phasing.** Phased delivery as a developer-time-saving move is rejected. Phasing as architectural-risk reduction (validate an assumption first) is accepted; nothing else qualifies.
- **No backwards compatibility.** Nothing is released. Existing AI-authored specs and code are exploration. Rewrite freely when the architecture demands it.
- **AI-authored documents are input, not authority.** "Locked," "ratified," "normative" labels in earlier exploratory documents are framing. Substance is evaluated independently.
- **Build the end state directly.** The first thing that ships is the right thing. Interim versions become migrations; we don't ship them.
- **Minimize concept count.** Each architectural concept earns its place by doing one thing the others don't. Naming converges on existing terms (e.g., Trellis's "case ledger") rather than inventing parallel ones.
- **Cargo / package fences enforce architectural seams.** Conventions stop being load-bearing; the dep graph is the architecture diagram.

Everything else follows.

---

## II. The Foundational Answers (Q1–Q4)

Four questions fixed the vision model. Owner's answers in their own words; interpretation flagged. These answers apply to the whole stack; each spec descends from them.

### Q1 — First adopter

**Lead wedge (per STACK.md §Positioning):** Mid-market regulated CTO with active AI audit finding. Has budget, short cycle, compliance-driven. Sits between SBA-class adjudication and DocuSign-replacement signing.

- **Lead wedge target:** organizations whose AI-assisted decisioning has produced a compliance audit finding. The pain (compliance cannot reconstruct what the model saw) is concrete; budget and timeline are real.
- **SBA PoC** is *one customer* exercising the adjudication deployment configuration — not the wedge itself. Validates the regulated-adjudication path with rights-impacting due-process machinery and exercises all three layers end-to-end.
- **Consumer SaaS (Jotform-tier)** is **deferred to future commercialization path**. No 1.0 architectural commitments hinge on consumer SaaS. If demand signal materializes, it composes from the same architecture.
- **AI integration is product-central, not seam-optional.** Lead-wedge buyers want AI agents AND verifiable governance over them.
- **DocuSign-replacement signing** is a deployment configuration (signature-profile-only) — not a separate product. Workflow semantics (WOS Signature Profile), integrity artifacts (ADR 0007 certificate-of-completion + export bundles; Trellis user-content Attestation primitive at [`trellis/thoughts/adr/0010`](trellis/thoughts/adr/0010-user-content-attestation-primitive.md)), and intake surface (Formspec `authoredSignatures`) all compose into the single claim.

### Q2 — Spec vs. runtime authority

**Owner's answer (verbatim):**
> "it's supposed to be spec-led, but this is a non-deterministic process, and often, real-world runtime changes drive progress and need to be integrated, so C" (co-authoritative).

**Interpretation:**

- **Default is spec-led across all three specs.** When a runtime doesn't implement what the spec says, the runtime is fixed to match.
- **But drift is bidirectional and managed.** When a runtime discovers semantics the spec didn't capture, the spec is updated.
- **Both sides are reviewed together.** The session-8/9 pattern — spec prose + runtime code + tests landing in one PR with semi-formal review — is canonical across all three specs.
- **"v1.0" and "tagged" are coherent-state labels, not freezes.** Nothing is released; no users, no production, no backwards-compatibility obligation. If a change to any spec surface prevents future architectural debt, make it and retag. The only expensive debt is debt we'd have to unwind once adopters exist — and they don't yet.

### Q3 — Opinionatedness

**Owner's answer:** "A" — opinionated / principled.

**Interpretation (stack-wide character; per-spec consequences below each spec's section):**

- **Few right ways to do things.** Extension points are bounded per spec; alternative-expression patterns are rejected, not accommodated.
- **Closed taxonomies over open extension at core keys.** Vendors extend through named seams and `x-` patternProperties only.
- **Rejection list is a feature.** Each spec maintains a visible rejection list with reasons; don't re-litigate, don't accommodate via back doors.
- **Single mechanism per concern.** FEL for expressions, not FEL + FEEL + SHACL. One intake spec, not alternatives. One integrity primitive, not options.
- **Center vs. adapter is the native frame.** Each spec declares a center (the shape); adapters implement it (runtime, renderer, storage, anchor target). The line is maintained strictly.

### Q4 — Verifiability threshold

**Owner's answer (verbatim):**
> "the entire point of the reference architecture is for us to use it and also for it itself to be a way to test/validate the spec, not sure where that lands"

**Interpretation:**

- **Each spec's reference implementation is the oracle for that spec.** MUSTs are verified by constructing a fixture, running it against the reference, and asserting the spec's predicted outcome.
- **Every MUST gets a passing fixture at 1.0.** Under the user's minutes-not-days economics, closing coverage gaps is cheap and high-value for the reference-architecture claim.
- **Where a spec has multiple conformant adapters, all must pass.** Three-way agreement (spec + reference + production adapter) is the strongest attainable verification posture per spec.

---

## III. Stack Composition

Three composable specs, one verifiable artifact:

```
┌──────────────────────────────────────────────────────────────┐
│  Formspec (intake)                                            │
│  Definition + Response + FEL + accessControl (per ADR-0074)   │
│  Field-level access classification declared at source          │
│  Bucketed Response wire format                                 │
└──────────────────────┬───────────────────────────────────────┘
                       │ IntakeHandoff (per ADR 0073)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  WOS (governance)                                             │
│  Kernel + Governance + AI + Advanced + Signature              │
│  Extends accessControl taxonomy with wos.* class namespace    │
│  Emits wos.governance events into the case ledger             │
└──────────────────────┬───────────────────────────────────────┘
                       │ wos.governance events
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Trellis (integrity substrate — we ship)                      │
│  COSE_Sign1 + dCBOR + Merkle + checkpoint + export package    │
│  Per-class DEK key bag; encrypt-then-hash; client decrypt     │
│  trellis-core, trellis-cose, trellis-store-postgres,          │
│  trellis-verify, trellis-export — our crates                  │
└──────────────────────────────────────────────────────────────┘
```

### Layer roles

| Spec | Layer | Responsibility | Status |
|---|---|---|---|
| **Formspec** | Intake | Fields, FEL, validation, behavior. JSON-native. | Parent monorepo. Runtime deployable at kernel level; authoring tools BSL. |
| **WOS** | Governance | Lifecycle, AI constraints, review protocols, provenance emission, deontic modalities. | Submodule. v1.0 closure in flight. |
| **Trellis** | Integrity | Content-addressed signed events, checkpoint seals, offline-verifiable export bundles, SCITT-aligned federation. | Submodule. Export-bundle byte story has Rust reference implementation and independent second-implementation guard; remaining work is product and stack glue. |

**Trellis is our work.** The byte protocol, the Phase-1 envelope invariants, and the Rust reference implementation are commitments we ship — not third-party dependencies we wait on. Downstream consumers (notably the wos-server `EventStore`) compose Trellis crates we author.

**Restate is the production runtime adapter** for WOS durable execution. The in-memory `wos-runtime` is the test and conformance oracle. WASM-compiled `wos-runtime` runs in browsers for client-side guard evaluation. Same Rust source, three adapter targets, shared conformance fixtures.

**Inter-layer transport.** Formspec ↔ WOS ↔ Trellis-store calls authenticate via workload identity (per §V principal model — fourth class alongside human / service-account / support); not API-key. Service-to-service auth between formspec-server / wos-server / trellis-store is structural, not afterthought.

### Cross-layer contracts (the five seams)

Canonical definitions in [`STACK.md`](STACK.md); this doc does not redefine them.

1. **Canonical response** — Formspec → WOS.
2. **Governance coprocessor** — WOS ↔ Formspec, including WOS prefill/validate/map calls and Formspec intake handoff into WOS-owned case creation.
3. **Event hash chain** — Respondent Ledger spec declares (Formspec center, per §V); Trellis concretizes via §6.2 envelope wrapping.
4. **Checkpoint seal** — Respondent Ledger spec declares (§13 LedgerCheckpoint); Trellis concretizes.
5. **Governance custody hook** — WOS → Trellis.

Each seam is owned by one spec and consumed by another. New cross-layer concerns surface as [Open Contracts in STACK.md](STACK.md#open-contracts), not inside this vision.

### Technical-stack pattern (applied per spec)

Every spec follows **center → trait → adapter** layering:

- **Center:** the spec's semantics library (declares the shape).
- **Trait:** the abstraction seam (what adapters must implement).
- **Adapter:** concrete implementations (browser, runtime backend, storage, anchor target, etc.).

Specifics:

- **Formspec:** center is the Definition + FEL + validation + behavior semantics. Adapters include browser runtime, native integrations, server-side re-verification, Formspec-as-coprocessor for WOS.
- **WOS:** center is `wos-runtime` (kernel evaluator, FEL, deontic, autonomy, provenance construction, signature workflow semantics). `DurableRuntime` trait is the seam. Adapters: in-memory, postgres-simple, Temporal, Restate.
- **Trellis:** center declares event shape + seal + export-bundle format. Adapters for storage (append-only, WORM, blob), KMS, anchor targets (transparency logs, TSAs, bilateral witnesses).

### Product stack (delivery vehicles)

Value proposition of the combined stack: **complex form authoring with AI + governed-AI-agents + cryptographically-verifiable signature ledger** — no current product offers this combination.

- **SBA PoC** — DocuSign + Adobe Forms replacement. One customer in the lead wedge; exercises the adjudication deployment configuration end-to-end.
- **Mid-market regulated CTO product** — lead-wedge buyers under active AI audit findings; exercises adjudication or signature-profile-only configurations depending on their use case.
- **Consumer SaaS** — deferred to future commercialization path; not a 1.0 architectural commitment.

### Reference architecture (concrete)

Below VISION altitude but pinned here so there's one canonical source. This describes the reference implementations behind the abstractions in §III; concrete defaults can change as adapters mature.

#### Crate clusters

```
formspec-* cluster (intake / capture / light workflow)
├── fel-core, formspec-eval                   — grammar + evaluator authority
├── formspec-server (NEW)                     — reference backend (composition root)
└── Respondent Ledger spec (Formspec center)  — RL emission via composed trellis-*

wos-* cluster (governance semantics — owns meaning, not bytes)
├── wos-core                                  — kernel + Signature Profile schemas
│                                                Importable as signature-profile-only profile
├── wos-runtime                               — in-memory + WASM oracle; governance overlay
└── wos-server                                — production runtime + DurableRuntime adapter
                                                  EventStore composes trellis-store-postgres
                                                  + wos-server-eventstore-embedded sibling
                                                    (in wos-spec/crates/, NOT trellis/)

trellis-* cluster (integrity substrate; byte authority via Rust)
├── trellis-core, trellis-cose                — envelope + COSE_Sign1
├── trellis-store-postgres, trellis-store-memory
├── trellis-verify                            — stranger-test reference
└── trellis-export                            — export bundle composition

agent-sdk (peer crate)
└── provider routing + conversation state + tool use protocol
    consumes class-aware policy (Privacy Profile + ADR-0074 allowlists)
    does NOT hold DEKs or perform decryption (per §VI binding)
```

#### Server topology

**formspec-server** — reference backend (parallel to wos-server's relationship to WOS spec). Listed ports are product/operational concerns of the reference backend, not Formspec center semantics. Same Formspec center can be hosted by other backends.

```
formspec-server submodules (six ports):
├── authoring port           — definition CRUD, versioning, AI-assist, lint, publish
├── runtime port             — definition resolution, asset serving (read-mostly, edge-cacheable)
├── intake port              — receive, re-verify against same Definition version, ack, sinks,
│                              response browser; emits IntakeHandoff artifact (ADR 0073)
├── ledger emission port     — composes Trellis envelope wrapping for Respondent Ledger events
│                              per RL §6.2; does NOT define ledger semantics (Formspec center)
├── signature-capture port   — UI, click capture; populates Formspec authoredSignatures (S2.1.6);
│                              imports wos-core Signature Profile schemas for intent semantics
├── send-for-signature port  — light sequence logic (NOT deontic governance)
└── auth port                — principal model (4 classes incl. workload), membership,
                              OpenFGA bindings, session lifecycle
```

**Deployment configurations** assemble these crates differently:

```
forms-only                   formspec-server + Trellis (no signing capture; no WOS)
signature-profile-only       formspec-server + Trellis + wos-core
                             (signing capture + sequence logic; no wos-runtime governance)
adjudication                 formspec-server + wos-server + Trellis
                             (full governance kernel; durable runtime; agent governance overlay)
```

#### Frontend surfaces

```
1.0 surfaces:
  Studio          — staff (form authors, basic workspace settings, AI-assist, response browser)
                    cohort A/B/C (all configurations)
  Caseworker      — review queue, independent-first protocol UI, decision surfaces
                    adjudication configuration only (where wos-server is)
  Admin           — tenant ops, key/KMS config, posture, audit log
                    enterprise deployments (cluster-per-tenant + adjudication)
  Hosted form pg  — respondent on hosted deployments
                    forms-only + signature-profile-only
  formspec-       — embedded respondent on customer sites
    webcomponent    all configurations

Phase-2:
  Native SDKs (iOS/Android) — fel-core + formspec-eval compiled to mobile targets;
                              identical semantics required
```

Three apps (Studio + Caseworker + Admin) because the stack-coined independent-first review protocol (UX enforcement of WOS Governance §4 Review Protocols `independentFirst` value) structurally requires UX separation — interface mustn't reveal AI output until human commits independent judgment. Trade: more deployment surface; less per-app feature-flag burden.

#### Adapter defaults

| Concern | 1.0 default | Adapter alternatives |
|---|---|---|
| Identity (staff) | WorkOS or Zitadel | login.gov, ID.me, Okta, Azure AD, agency SAML |
| Identity (respondent) | Custom WebAuthn-PRF (binds to per-class DEKs) | OIDC ("Sign in with X"); magic-link |
| Email | Resend | SES, Postmark, raw SMTP |
| SMS / push | None at 1.0 | Twilio, Vonage, FCM, APNs |
| Anchor target | OpenTimestamps | Trillian, Sigstore Rekor, agency-operated |
| Object storage | S3 | Azure Blob, GCS, FS for self-host |
| KMS | AWS KMS | GCP KMS, Azure KeyVault, HSM |
| Postgres | (bring your own) | Aurora, RDS, GCP CloudSQL, self-hosted |
| Confidential compute | `processing-audited` (SBA reference) | `processing-tee` (Federal floor), `processing-fhe`, `processing-mpc` |
| Durable runtime | Restate | Temporal, Camunda, Step Functions (commercial gate) |

Center keeps the *port shape*; adapter is the implementation. Customer can replace any adapter without touching center code. Defaults can change; the port contracts cannot.

#### API surface

```
Public          REST + JSON + OpenAPI; generates client SDKs
Inter-server    Transport choice (gRPC over wire / in-process Rust trait when collocated)
                is ORTHOGONAL to seam shape. The seam itself is a typed artifact:
                  - IntakeHandoff (Core S2.1.6.1 + intake-handoff.schema.json):
                    one-shot Formspec → WOS at intake completion;
                    initiationMode invariant; caseRef required for workflowInitiated,
                    forbidden for publicIntake
                  - contractHook (Kernel §10.2): bidirectional prefill/validate/map;
                    a DIFFERENT seam than IntakeHandoff
                  - custodyHook (Kernel §10.5 + custody-hook-encoding.md):
                    four-field append wire surface; the WOS↔Trellis byte edge
Outbound        HMAC-signed webhooks; idempotency-key; replay-safe
                Runs inside ProcessingService boundary (decrypts only what its
                key-bag admits; emits integration.delivered ledger event)
                Inbound vs outbound trust boundary explicit; dead-letter mandatory
```

No GraphQL — single mechanism per concern; Studio uses REST + a few aggregated endpoints.

---

## IV. Three Orthogonal Deployment Axes

Each deployment selects one value on each of three independent axes. Conflating them is the substantive error in pre-stack-vision ADRs (ADR-0001/0005/0015 in `formspec-internal/`).

| Axis | Values | What it controls |
|---|---|---|
| **Configuration** | forms-only / signature-profile-only / adjudication | Which feature ports activate at composition root |
| **Trust posture** (custody property) | SBA / Federal / Sovereign | What the platform commits not to do with plaintext |
| **Isolation topology** (deployment knob) | shared+RLS / DB-per-tenant / cluster-per-tenant | Postgres + cell topology |

A signature-profile-only configuration can run SBA-posture or Federal-posture independently. An adjudication configuration can run on shared+RLS Postgres or DB-per-tenant. Trust posture is what you commit not to do, not where you run.

### Trust postures

Three deployment modes describe the **property** the deployment commits to, not the implementation. Declared per deployment, **normatively enforced** (per Trellis Phase-1 invariant #15: trust-posture honesty floor — the deployment MUST NOT describe a posture more strongly than its `ProcessingService` adapter delivers). Structural enforcement requires conformance fixtures cross-checking declared posture against adapter selection. Same architecture, different configuration. Both configuration choice and posture are ledger-recorded so the runtime can prove its declared posture.

| Posture | What the deployment commits to | Procurement target |
|---|---|---|
| **SBA** | Platform may decrypt for explicit, audited purposes; plaintext never persists at rest; every decryption is a KMS-logged event | Small agencies, nonprofits |
| **Federal** | Platform cannot reconstruct plaintext outside an attested or math-bound boundary | FedRAMP-Moderate+; HIPAA-regulated; rights-impacting |
| **Sovereign** | As Federal, plus respondent's content uses client-origin keys (no platform-side custody for respondent-self class) | EU eIDAS 2.0; civil-liberties contexts |

**Confidential compute is pluggable, not architecturally fixed.** The `processing-audited` adapter is the SBA reference: explicit server-side decryption, KMS authorization, and ledgered purpose. It does not satisfy Federal or Sovereign claims by itself. Stronger siblings under the same `ProcessingService` port supply those claims:

- **`processing-tee`** — TEE-attested processing (AWS Nitro Enclaves, Intel SGX, Confidential VMs). Hardware-rooted confidentiality with attestation chain. **Required before first Federal-posture customer; not required for SBA-posture deployments.**
- **`processing-fhe`** — Fully Homomorphic Encryption. Math-rooted confidentiality; computation on ciphertext without decryption. Tractable for narrow operations (predicate evaluation, simple aggregates), maturing for broader workloads.
- **`processing-mpc`** — Multi-Party Computation. No single party holds plaintext; computation is distributed across non-colluding services.

TEE, FHE, and MPC are peer options for stronger processing confidentiality. The architecture admits all three without making any one of them load-bearing. Federal and Sovereign deployments must not claim "platform cannot reconstruct plaintext outside an attested or math-bound boundary" until the selected `ProcessingService` adapter actually delivers that property. SBA-posture deployments use `processing-audited` as the reference adapter.

This stack is **data-and-workflow zero trust** layered on conventional **identity-and-network zero trust**. NIST SP 800-207, CISA ZTMM v2.0 Data pillar, OMB M-22-09, and FedRAMP rev5 cross-reference cleanly (procurement-facing mapping in [`STACK.md`](STACK.md) §Proof packages).

---

## V. Platform End-State Commitments

Refined and accepted 2026-04-22; data-and-workflow zero trust posture refined 2026-04-25. These commitments describe the target architecture agents should optimize toward. Implementation leans, adapter spikes, kill criteria, and current forks live in [`thoughts/specs/2026-04-22-platform-decisioning-forks-and-options.md`](thoughts/specs/2026-04-22-platform-decisioning-forks-and-options.md), not here.

- **The target is one portable case record, not three adjacent artifacts.** Formspec intake, respondent ledger events, WOS governance/provenance, Trellis checkpoints/export, evidence bindings, identity attestations, signature affirmations, amendments, statutory clocks, and migration pins should compose into one verifier-understandable record where the workflow requires them.
- **Serious stack claims require independent offline verification.** Dashboard trust and product demos may help users, but a durable architecture claim needs written semantics, schema or byte grammar, vectors, and verifier behavior that work without the vendor runtime.
- **Open contracts are required closure work.** The five seams are the baseline. Evidence integrity, identity attestation, signature attestation completion, actor authorization, amendment and supersession, statutory clocks, tenant and scope composition, time semantics, failure and compensation, and cross-layer migration are not optional polish for full-stack product claims.
- **Case initiation has one governed owner and two routes.** WOS owns governed case identity and `case.created`; Formspec owns intake sessions, canonical responses, validation reports, and respondent-ledger evidence. Both workflow-initiated cases and public-intake-initiated cases cross the accepted `IntakeHandoff` artifact instead of inventing rival case boundaries.
- **Signing has one stack meaning.** Product shortcuts may exist only as workflow-lite profiles over the same WOS `SignatureAffirmation` semantics and Trellis custody/export path. Do not create a second meaning of "signed."
- **Durable execution is orchestration, not evidentiary truth.** `DurableRuntime` is the stable seam. Temporal, Restate, and other engines are adapters; retries, stalls, resumes, compensation, and policy-relevant transitions must remain ledger-visible when they affect the case.
- **Privacy claims must match custody reality.** Encryption, selective disclosure, metadata minimization, key destruction, identity separation, and sovereignty language must match who can decrypt, what replicas or views exist, and what verifiers can still prove.
- **Product sequencing cannot weaken center semantics.** SaaS demos, Studio UX, procurement artifacts, and buyer proof packages may ship in practical order, but they cannot introduce rival semantics for proof, signing, custody, governance, or migration.
- **Data-and-workflow zero trust is the architectural posture.** Server processes never hold case content plaintext at rest; per-class encryption with key-bag access; clients decrypt. Three deployment modes — SBA, Federal, Sovereign — declared per deployment; declaration must match observable behavior (Trellis Phase-1 invariant #15 trust-posture honesty floor). Detail in §IV.
- **Field-level access classification is Formspec-native.** Per [ADR-0074](thoughts/adr/0074-formspec-native-field-level-transparency.md): `accessControl` is a normative item property; class taxonomy lives in an Access-Class Registry companion (registry-tier infrastructure); per-deployment audience policy lives in a Privacy Profile sidecar. Bucketed Response wire shape; per-class DEKs in the key bag; cross-class FEL is a definition error at Core. Class names are opaque to Core; sensitivity ordering is audience-subset-defined and Profile-loaded only.
- **Trellis is the canonical event log, on our build track.** Trellis Phase-1 envelope invariants are byte commitments we ship; the Rust reference implementation (`trellis-core`, `trellis-cose`, `trellis-store-postgres`, `trellis-verify`, `trellis-export`) is co-engineered with downstream consumers, not an external dependency. The wos-server `EventStore` composes `trellis-store-postgres` plus an in-database projections schema. **The Respondent Ledger is Formspec center** (specification at `specs/audit/respondent-ledger-spec.md`, normative for event taxonomy, materiality rules, identity attestation shape, checkpoint format). Trellis composes *into* it via §6.2 envelope wrapping and §13 LedgerCheckpoint; Trellis does not absorb the Respondent Ledger spec. "Case ledger" (Trellis Core §1.2 term) names the case-scope composition that adjudication-configuration cases produce; the Respondent Ledger name remains valid for the Formspec-owned spec.
- **Crypto is fenced, structurally.** Following ADR-0074's `formspec-bucketing` precedent, every workspace adopts a `CRYPTO_OWNER`-pattern dep fence keeping crypto imports scoped to specific adapter crates. The dep graph is the security boundary; crypto distributed across an unfenced codebase is a misuse vector.
- **Optimization target is architectural elegance and minimum conceptual debt.** Tokens, AI agents, and frontier inference are unlimited; the bottleneck is not single-threaded human typing. Phasing as a developer-time-saving move is rejected; phasing only for architectural-risk reduction. "Build the end state directly" — interim versions become migrations, and migrations are tech debt.

- **Principal model and scope hierarchy.** Scope: `Tenant → Organization → Workspace → Environment → Resource`. Tenant = hosting/commercial boundary; Organization = product-ownership boundary (where forms, cases, members live); Workspace = sub-scope inside org; Environment = sandbox/staging/prod. Four principal classes: `human / service-account / workload / support`. **Workload identity** is required for service-to-service calls between formspec-server / wos-server / trellis-store; cannot be treated as API-key afterthought. **Support identity** is reason-coded, time-boxed, audit-by-default — distinct from staff. RBAC ladder: `Owner / Admin / Author / Reviewer / Analyst / Submitter` (canonical role vocabulary; OpenFGA tuples express specifics).

- **Object-ownership and deletion-follows-org invariants.** Core business objects belong to organizations, not subscriptions. Subscription/billing objects MUST NOT be foreign-key parents of forms, cases, definitions, or any product-domain object. Deletion and retention key off organization ownership, not billing state — a billing-suspended organization's data is governed by retention policy on the org, not by lapse of the SaaS subscription. This is what makes class-DEK destruction work cleanly as the GDPR Art. 17 mechanism: crypto-shredding is organization-scoped, not subscription-scoped.

- **Control-plane / data-plane separation.** Customer-operational data MUST NOT be silently co-mingled with commercial control-plane data. Provisioning, billing, entitlements, and fleet ops are control-plane concerns; customer forms, cases, and audit records are data-plane concerns. The control plane never has broad access to data-plane customer content for routine operations. Load-bearing for Federal and Sovereign trust postures.

- **AI provider-routing classification derives from ADR-0074, not a parallel taxonomy.** AI provider allowlist matrices are *generated* from per-class regulatory tags (HIPAA, PCI, FERPA, CJIS, ITAR) annotating ADR-0074 access classes via Privacy Profile, plus tier policy. Older parallel data-class systems (D0–D4 from the AI provider routing tradition) are explicitly superseded; future AI routing code MUST consume `accessControl.class` and Privacy Profile tags, not mint a parallel classification.

- **Lifecycle discipline is per state-type.** Different state types use different mechanisms; conflating them is the failure mode in pre-stack-vision lifecycle thinking.

  | State type | Mechanism |
  |---|---|
  | Chain content (Trellis events) | Append-only; only crypto-shredding via class-DEK destruction works (Core §6.4, §9.3, §25.8 + Companion App A.7 cascade scopes CS-01..CS-06); legal hold = synthesis-layer KmsAdapter policy suspending DEK destruction; emits proposed `wos.governance.legal-hold-applied` event when applied |
  | Projections (rebuildable from chain) | State machine `{Active, Archived, Pending Deletion, Deleted, Redacted, On Hold, Expired}`; per-object-class retention policy |
  | Attachments (blob store) | Originals immutable; redactions are derivative artifacts (artifact taxonomy: original/generated/redacted/snapshot/temporary/export/preview); quarantine state for malware-scan; each carries derived_from lineage metadata |
  | Application state (definitions, configs, profiles) | State machine + explicit promotion path; versioned; profile changes ledger-emit `governance.profile-evolved` |
  | Derived AI artifacts (embeddings, summaries, extractions) | First-class lifecycle objects; inherit lifecycle from parent source object; crypto-shredded with parent's class DEK |
  | Backups | Encrypted via class DEKs; crypto-shredding handles transitively; no separate backup-lifecycle mechanism |

- **Operational SLO categories and degraded-mode discipline.** SLO categories: `intake / case durability / workflow / audit-continuity / docs / integration / AI`. Each adapter declares a degraded mode at port boundary. Operational principles:
  - "Core workflow integrity outranks AI convenience" — AI failures degrade gracefully; never block core workflow
  - "An outage is not permission to create undocumented history" — chain semantics survive incidents
  - Audit ⊥ observability — Trellis events answer who/what/why; OTel answers what failed (per wos-server VISION §IV)

- **Configuration is releasable state with promotion discipline.** Privacy Profile, access-class registry, `wos.*` event-type registry are versioned artifacts with explicit promotion paths. Migration class declared per release: `backward-compatible / forward-compatible / expand-contract / breaking`. ("No backwards compatibility" applies to *unshipped* product. Once a tag goes out, it's a coherent-state label; the migration class describes what evolution from that tag promises.) Feature flags are governed: owner, purpose, expiry, audit. Long-lived undocumented flags rejected. Drift detection mandatory in CI.

- **Compliance claims are tier-qualified and control-category scoped.** Five control categories:

  | Category | Scope |
  |---|---|
  | Product | Controls baked into spec/code (encryption, chain integrity) |
  | Deployment | Controls applied at deploy (posture, isolation, region) |
  | Operational | Controls in ops practice (SLO commitments, incident response) |
  | Customer-configurable | Controls customer configures (key rotation cadence, retention policy, recipient registration) |
  | Inherited | Controls from underlying infrastructure (cloud SOC 2, KMS attestation) |

  No compliance claim is made without naming the trust posture, configuration, and category. SBA-posture vs Federal-posture must produce observably different behavior, not cosmetic difference. Customer-configurable controls explicitly distinguished from defaults at sign-up. No bundled certifications-first-architecture-later. Subprocessor list maintained: every adapter that processes customer data is named.

- **Open contracts decompose into center commitments and profile-specific extensions.** Architectural-vs-profile distinction, not phased delivery.

  **Center commitments (close before any deployment relies on the contract):**
  - Statutory clocks ([ADR 0067](thoughts/adr/0067-stack-statutory-clocks.md)): `ClockStarted/Resolved` events; materialized-once deadline; `open-clocks.json` manifest
  - Amendment ([ADR 0066](thoughts/adr/0066-stack-amendment-and-supersession.md)): four modes; `supersedes_chain_id` envelope reservation; linear supersession only
  - Failure ([ADR 0070](thoughts/adr/0070-stack-failure-and-compensation.md)): commit-point semantic pinned (Trellis local-append IS commit); idempotency tuple; `stalled` state
  - Migration pin (split from [ADR 0071](thoughts/adr/0071-stack-cross-layer-migration-and-versioning.md)): pin set on first anchored event via Core §6.7 extension surface
  - Identity attestation (proposed parent-repo ADR — pick free number, not 0079 which is taken): `IdentityAttestation` shape; proposed `wos.identity.*` taxonomy; claim graph
  - User-content Attestation primitive ([Trellis ADR 0010](trellis/thoughts/adr/0010-user-content-attestation-primitive.md), Accepted 2026-04-28): byte format for user-content attestation; implementation in flight
  - WOS Signature Profile extension (`signature.md` §1.3 scope reopen): signing-intent URI registry; signer-authority claim shape; ESIGN/UETA/eIDAS posture mapping
  - Certificate-of-completion: already specified by [Trellis ADR 0007](trellis/thoughts/adr/0007-certificate-of-completion-composition.md) (Accepted 2026-04-24); remaining work is shared cross-repo fixtures and claim-graph tightening
  - External recipient lifecycle (proposed parent-repo stack ADR): Privacy Profile registration + ledgered access events under `wos.governance.*` namespace + recipient-rotation rule
  - AEAD nonce determinism on retry (proposed Trellis Core §9.4 + §17 prose addition): pin nonce derivation rule so same-key + same-authored-bytes retry produces byte-identical canonical event
  - Procurement-blocking commitments: WCAG 2.2 AA + VPAT for each frontend app; counsel-pinned ESIGN/UETA/eIDAS legal claim; SOC 2 controls inventory; pricing model; subprocessor list; incident response and breach-notification commitments

  **Profile-specific extensions (trigger-gated):**
  - Confidential-compute reference adapter (TEE minimum) — posture-gated; required before first Federal-posture customer
  - Data residency story — required before first Sovereign-posture or EU-touching customer
  - Statutory clocks: jurisdiction-aware business calendars → first jurisdiction beyond initial profile
  - Amendment: cross-jurisdiction reversal, diamond/cycle handling → first cross-agency case
  - Failure: full reconciliation event taxonomy → first significant production incident
  - Migration mid-flight policy → first multi-year case lands
  - Identity: IdP-quirk profiles → per real adapter need
  - External recipient: federation-tier multi-jurisdiction → first multi-jurisdiction federation deployment
  - Tenant-scope Trellis export shape — Core §18 ZIP layout is per-`ledger_scope`; tenant-scope is genuine new shape work; trigger = first tenant-scope export use case

---

## VI. Cross-Spec Bindings

Each layer owns one fact; nobody redefines below their layer. Companion specs own their content in full; this section states the bindings only.

- **Formspec** — [ADR-0074](thoughts/adr/0074-formspec-native-field-level-transparency.md) is authoritative for `accessControl` semantics, the Privacy Profile sidecar, the bucketed Response wire shape, sensitivity ordering, Phase-5 emission, and the cross-class FEL definition error. Two callouts that load-bear on the WOS layer: (1) `flClassCompatibility` (ADR-0074 §7) is the only mechanism that relaxes cross-class FEL across `wos.*` + `formspec.*` namespaces — WOS guard authoring inherits this constraint, enforced at both lint time and processor load time; (2) the schema-omitted vs. explicit `unclassified` distinction is lint-relevant (ADR-0074 §1, §12) — only schema omission fires `every-field-classified`. Implementations MUST preserve both states distinctly.

- **Respondent Ledger** — `specs/audit/respondent-ledger-spec.md` §7.8 (draft v0.2.0) already inverts inheritance: each `ChangeSetEntry` derives `accessClass` from the source field's `accessControl.class` when a Privacy Profile is loaded, and raw values for a class MUST NOT be exposed to a reader who lacks authority. Distinct identifiers — source = `accessControl.class` (ADR-0074 §1, on the item); derived = `accessClass` (ledger, on `ChangeSetEntry`). The broader class-aware redaction surface (groups, repeats, calculated fields, non-relevant fields) remains forward work per ADR-0074 §9.

- **Case Ledger composition + WOS event taxonomy** — Trellis Core §1.2 defines the case ledger as composed sealed response-ledger heads + WOS governance events into one adjudicatory matter. WOS event-type definitions live in the planned `wos-spec/specs/audit/wos-event-types.md`. This vision asserts the *requirements* (one chain per case; family-level `event_type` plaintext per Trellis Phase-1 invariant #9; specific tags / outcomes / actor identities encrypted in payload; encrypt-then-hash normative; recipient-revocation event in the taxonomy) without minting names. WOS authors own the `wos.*` namespace; Formspec authors own `formspec.*` and `respondent.*`.

- **Custody seam** — the binding from `wos.*` event-type tags into Trellis envelope tags goes through the kernel `extensions` seam (`wos-spec/specs/kernel/spec.md` §10.6) and the `custodyHook` seam (`wos-spec/specs/kernel/custody-hook-encoding.md`): one authored WOS record per append, dCBOR-canonicalized, ingested into the Trellis chain.

- **Trellis** — `trellis/specs/trellis-core.md` is authoritative for envelope format, hash construction, signing, export, and the 15 Phase-1 envelope invariants we honor.

- **Decision authority is an orthogonal axis to data access.** Two-layer access control on data (OpenFGA grants + key-bag membership) is independent from decision authority on decrypted content (WOS deontic constraints + impact-tier autonomy caps per AI Integration §4–§5). Crypto/FGA say "you can decrypt"; WOS says "in this case state, with this autonomy posture, you may or may not act." The three concerns fail independently.

- **Three planes: Response ⊥ Audit ⊥ Identity.** A separate orthogonality from the data-access ⊥ decision-authority pair above. The two structures stack: each plane below has its own (data-access ⊥ decision-authority) split per the prior bullet. **Response plane:** canonical response (Formspec Core §2.1.6); bucketed wire shape per ADR-0074 §4. **Audit plane:** hash-chained events (Respondent Ledger spec); pseudonymous via `subjectRef`; RL §2.2 invariant — ledger replay MUST NOT be required to interpret a Response. **Identity plane:** `assuranceLevel × privacyTier`, provider-neutral attestation; RL §6.7 normatively declares `privacyTier ⊥ assuranceLevel` (MUST NOT conflate, derive, or couple transitions); RL §6.8 — authored signature ≠ recorded attestation. The three planes share references (`subjectRef`, `eventHash`, `attestation_id`, `ledgerHeadRef`, `responseId`) but never collapse storage or disclosure. Sovereign-posture deployments structurally require this orthogonality.

- **agent-sdk structural boundary.** agent-sdk receives plaintext only after calling code has decrypted in its own boundary (client or declared `ProcessingService` adapter). agent-sdk consumes class-aware policy (Privacy Profile + recipient-class allowlists per ADR-0074) but MUST NOT hold DEKs or perform decryption. Decryption authority stays in client or `ProcessingService`. Class-aware agent autonomy is non-negotiable; key custody is structurally separate.

- **Recipient rotation across multi-year cases.** Trellis Phase-1 invariant #7 (key-bag immutability) applies per event, not per case. Recipient turnover (caseworker leaves, agency reorganizes) is handled by emitting subsequent events with key bags scoped to current recipients; superseded recipients remain in the chain (chain integrity preserved) but no new content is wrapped to them. Departed-recipient revocation is a governance event (proposed `wos.governance.access-revoked`; final name in the planned `wos-event-types.md`); subsequent events MUST NOT wrap to revoked recipients. Historical decryption capability for already-emitted events is by design. Crypto-shredding via class-DEK destruction remains the mechanism for irrecoverability. Recipient revocation is a Privacy Profile concern; `lawfulBasis` (per-class, not per-recipient per ADR-0074 §1) carries no parallel retraction obligation.

- **Connectors and external recipients.** Outbound integrations (DocuSign delivery, Salesforce post-submit, FAFSA → state grants, child-support → tax intercept) compose through this seam. Privacy Profile registers external systems as per-class recipients; key-bag wraps DEK to receiving system identity; ledgered `access.granted` / `access.revoked` events under `wos.governance.*` namespace (Companion §25.1 OC-115: "Grants and Revocations Are Canonical"). Connector workers run inside `ProcessingService` boundary — decrypt only what their key-bag admits, emit `integration.delivered` provenance via custodyHook. Idempotency tuple per Core §17.2 deterministic-hash construction. Dead-letter queue mandatory; quarantine on repeated failure. Tenant-scoped secrets in `KmsAdapter` or sibling `SecretsAdapter`; never plaintext config tables. Inbound vs outbound trust boundary explicit; inbound carries different posture. Tenant package secret-exclusion list: passwords, API keys, OAuth refresh tokens, session tokens, signing private keys, infra credentials never serialize.

---

## VII. Architectural Constraints from Compliance

The architecture's shape is constrained by a small number of frameworks whose requirements are mechanism-level (not procurement positioning). These are kept here because they explain *why* the architecture has its current shape:

| Framework | What it constrains |
|---|---|
| NIST SP 800-207 (Zero Trust Architecture) | All seven tenets satisfied structurally by per-class encryption + key-bag access; "all data sources and computing services are considered resources" enforced by the data path, not by network policy |
| GDPR Art. 17 (right to erasure) | Crypto-shredding via class-DEK destruction is the structural mechanism; chain integrity preserved (the bound content becomes irrecoverable, the chain stays intact) |
| GDPR Art. 20 (data portability) | Trellis export package self-contained, machine-readable, verifiable on air-gapped laptop per Trellis Core §18 |
| HIPAA | Per-class encryption isolates PHI; medical class access restricted by key bag (mechanism, not procurement) |
| FRE 803(6) (business records exception) | Systematic, contemporaneous, attributed, routine, tamper-evident — by construction of the canonical schema + chain |

**Procurement-facing compliance framework mapping** (FedRAMP rev5, OMB M-22-09, OMB M-24-10, CISA ZTMM v2.0, Title VI / disparate-impact, NIST SP 800-63, etc.) lives in [`STACK.md`](STACK.md) §Proof packages, not here. That mapping is buyer-facing and does not constrain stack architecture.

**Positioning:**

> Zero-trust workflow governance for high-stakes public-sector adjudication: routine server reads do not expose case content, every field disclosure is key-gated and ledgered, the operator cannot quietly rewrite history, and a 2045 verifier can prove on an air-gapped laptop that the 2026 record is genuine. Open spec, Rust + WASM, federal-oriented.

---

## VIII. What We Reject

| Anti-pattern | Reason rejected |
|---|---|
| Phase 1 / Phase 2 / Phase 3 sequencing as developer-time economy | Wrong economic model — calendar time, architectural debt, conceptual debt are scarce; tokens aren't |
| Two-store split (`Storage` + separate `AuditSink` ports) | Trellis IS the database; one EventStore port covers both |
| Parallel hash chains (WOS-internal `previous_hash` alongside Trellis chain) | One chain — Trellis. Postgres WAL covers torn writes; replay determinism is Trellis chain semantics |
| Plaintext at rest in operational store | Metadata-only projections; plaintext lives only in encrypted events + transient `ProcessingService` memory |
| Server-side plaintext outside the declared `ProcessingService` boundary | Strict modes (Federal/Sovereign) commit to "platform cannot reconstruct plaintext outside an attested or math-bound boundary." Audited-decryption is SBA-grade only |
| Hardcoding TEE as the architectural pillar | TEE is one confidential-compute strategy among several (peer to FHE, MPC). The architecture admits all via a pluggable `ProcessingService` port; no specific adapter is load-bearing for the architecture's correctness. Deployments select; the spec doesn't dictate. |
| Application-layer dual-write to multiple stores | Outbox / event-sourcing pattern; never dual-write |
| Server decrypts content for routine reads | Clients decrypt; server brokers wrapped DEKs |
| Bespoke per-actor scoping in handlers | OpenFGA service handles relationship-based access |
| Event-level encryption only (one DEK per event) | Per-class encryption — granular by access class within an event |
| AI-authored "Locked narrative" treated as architectural authority | Treat as input; evaluate substance independently |
| In-memory storage as production posture | Test / conformance oracle only; production is Postgres |
| Treating the operational EventStore as a generic datalake or JSON object store | The `canonical` schema is a Trellis-shaped artifact with specific Phase-1 invariants and verifier-independence requirements (Trellis Core §16); conflating it with general-purpose blob storage breaks both. Operational ≠ analytical |
| Per-field DEKs (one DEK per field, not per class) | Per-class DEKs are right granularity; per-field is key explosion |
| "Subject Ledger" as a parallel name for Trellis's "case ledger" | Adopt Trellis's term; one canonical name per concept |
| Crypto distributed across the codebase | CRYPTO_OWNER fence concentrates crypto in adapter crates that need it; the dep graph is the security boundary |
| FEEL / DMN / SHACL / FEL-conformance-profiles / DAG processing as alternatives to FEL + WOS lifecycle | One expression language, one lifecycle model. Single mechanism per concern |
| Renaming or duplicating "case ledger" / "Respondent Ledger" / "Subject Ledger" / "audit log" in adjacent projects | One canonical term per concept; converge on existing names |

---

## IX. Formspec — Settled Architectural Commitments

Probed and accepted 2026-04-22.

**First-adopter / wedge posture (refines stack Q1 for Formspec scope):**

- **Formspec is for teams building and maintaining complex forms with AI.** Grants, contracts, government workflows, insurance, survey companies, and any organization that spends real time and money updating load-bearing forms are in scope.
- **The replacement set is the existing form-spec / form-builder landscape plus signing tooling where needed.** XForms, JSON Forms, SurveyJS, and adjacent systems are the closest category peers; DocuSign replacement is the minimum bar when signature workflows matter.
- **The value proposition is open, portable, auditable form infrastructure that AI can author quickly without making the artifact unreadable to humans.** Human-editable and AI-manageable are both required, not a trade.
- **Government is a major partner path, not a special exception.** The same center must also serve commercial adopters such as insurance and survey operators.

**Authority model (refines stack Q2 for Formspec scope):**

- **No single layer is the permanent authority.** Idea doc, spec, schema, lint, conformance, runtime, reference implementation, and authoring tooling all have only coincidental provenance.
- **The real decision rule is user value plus forward architectural debt.** When those layers disagree, the winning change is the one that improves user value or reduces future architectural burden.
- **The spec is still the portability target for independent implementation.** "Not permanent authority" does not mean "optional"; it means the spec must be updated when reality discovers better semantics.
- **Runtime and tooling discoveries are expected to flow back up the chain.** Formspec is explicitly co-authoritative in practice, not spec-frozen.
- **The meaningful reference architecture is stack-wide.** A standalone Formspec reference implementation is valid, but the real target is Formspec composed with WOS and Trellis.

**Character of the center (refines stack Q3 for Formspec scope):**

- **Formspec is simultaneously a spec, a portable kernel, and an AI authoring substrate.** It is not useful to force these into separate identities.
- **Design is DI-first.** Seams are natural and encouraged; the primary design question is where something belongs, not whether the center should reject it on principle.
- **Do not harden the center just to feel opinionated.** Nothing is closed merely for its own sake, and refactoring-for-refactoring's-sake is explicitly the wrong instinct.
- **When standalone Formspec value and stack composition appear to conflict, the seam is wrong.** The default move is to redesign the boundary until both work, or push the compromise down into an adapter rather than contaminating the center.

**Verifiability threshold (refines stack Q4 for Formspec scope):**

- **A real Formspec implementation must pass the same conformance suite.** Schema validity is part of the bar, but not the whole bar; behavioral fixtures must also agree.
- **Independent implementations should reproduce the spec's predicted outcomes for the same fixture corpus.** That is the practical meaning of Formspec portability.
- **"Implements Formspec" means more than "can read the JSON."** It means the implementation is willing to stand against the same shared tests as every other implementation.

### Active uncertainties (Formspec-scope)

- **Standalone reference implementation scope.** A minimal standalone reference implementation could be a Django server that versions definitions, accepts responses, and runs the processing model correctly. The stack-wide reference architecture remains the more important target.
- **DocuSign-replacement surface area inside standalone Formspec.** "Minimum bar" is clear; exact standalone-vs-stack allocation remains a design question best answered at seam definition time rather than by doctrine.

### Formspec-specific heuristics

Apply after the stack-wide heuristics:

1. **Placement before prohibition.** Ask where a concern belongs in the DI structure before asking whether to ban it.
2. **User-value / debt tie-break.** When spec, schema, runtime, or tooling disagree, prefer the move that improves user value or reduces forward architectural debt.
3. **Seam-repair reflex.** If standalone adoption and stack composition seem to want different shapes, repair the seam instead of choosing one side and polluting the center.
4. **Conformance is the portability bar.** Any proposed semantic change should be expressible as fixtures that every real implementation can run.

Known cross-cutting facts already captured elsewhere:

- Intake runtime deployable at kernel level today. Authoring tools under BSL 1.1 converting to Apache-2.0 on 2030-04-07.
- Respondent Ledger is Formspec center (per §V — fully normative for event taxonomy, materiality rules, identity attestation shape, checkpoint format). Trellis composes via §6.2 envelope wrapping and §13 LedgerCheckpoint; Trellis does not absorb the Respondent Ledger spec.

---

## X. WOS — Settled Architectural Commitments

- **Signature Profile = workflow semantics only.** WOS emits `SignatureAffirmation` provenance; Trellis anchors it through `custodyHook`. Certificate-of-completion artifact is Trellis (per ADR 0007). DocuSign 100% parity bar: ESIGN / UETA / eIDAS compatibility, full workflow primitive set, AND administrative surface (templates, bulk-send, dashboards) — see active uncertainty below for scope reopen detail.
- **One meaning of signing.** Product shortcuts exist only as workflow-lite paths over the same `SignatureAffirmation` plus custody plus export pipeline.
- **Case initiation.** WOS owns governed case identity and `case.created`; Formspec hands off via `IntakeHandoff` (ADR 0073).
- **Durable execution as a seam.** `DurableRuntime` trait is the stable center. Restate is the initial default reference adapter. Temporal, Camunda, Step Functions remain eligible behind the same seam; Camunda and Step Functions are trigger-gated on commercial request.
- **Center vs. adapter.** `wos-core` plus `wos-runtime` (in-memory plus conformance oracle) is the center. Production adapters plug in below `DurableRuntime`.
- **One expression language.** FEL via `fel-core`. FEEL, DMN, SHACL, FEL-conformance-profiles, JSON-LD authoring, BPMN parity, DAG processing are on the rejection list.
- **Admin portal is product scope, not WOS spec scope.** Two exceptions that pulled spec work: Bulk Operations; Signer-authentication policies inside Signature Profile.

Internal conventions (layer structure, six kernel seams, build commands, spec-authoring rubric) live in [`wos-spec/CLAUDE.md`](wos-spec/CLAUDE.md). Tactical work in [`wos-spec/TODO.md`](wos-spec/TODO.md) and [`wos-spec/COMPLETED.md`](wos-spec/COMPLETED.md). **End-state architectural framing for the WOS Server reference implementation** lives in [`wos-spec/crates/wos-server/VISION.md`](wos-spec/crates/wos-server/VISION.md). Read it before any wos-server architectural decision.

### Active uncertainties (WOS-scope)

- **DocuSign 100% parity bar.** Lead wedge requires it. The DocuSign-replacement claim must hold against full feature comparison, not workflow-only minimum.
  - **Spec-level work (signature.md scope reopen):** ESIGN/UETA/eIDAS posture mapping is currently carved out as out-of-scope by `signature.md` §1.3 ("jurisdiction-specific legal sufficiency claims"). Lead-wedge customers require reopening this. Not a pending confirmation — an explicit scope change requiring `signature.md` §1.3 to be edited and ratified, plus extension to add: signing-intent URI registry (Trellis encodes URI bytes; WOS owns meaning), signer-authority claim shape (capacity-to-bind, distinct from authentication-method strength), ESIGN/UETA/eIDAS posture mapping. (Architectural-risk-reduction phasing per §I — reopening before committing parity claim to counsel — not delivery-time phasing.)
  - **Workflow primitives in scope:** sequential / parallel / routed / free-for-all signing flows (signature.md §2.3); witness, counter-signature, notary, in-person dependencies (§2.10); reminders; expiry; decline; void; reassignment.
  - **Administrative surface in scope:** template libraries, bulk-send, send-for-signature dashboards, signer status views, reminder cadence configuration, audit history view. These were previously soft-deferred as "product scope, not stack" — pulled back into 1.0 because lead-wedge buyers compare feature-for-feature against DocuSign and parity is the buying threshold.
  - **What's still out of scope:** DocuSign-specific UX patterns whose value is brand inertia, not function. Match the *capability surface*; don't clone the *interaction patterns*.
- **Multi-tenant model on Temporal or Restate.** Likely namespaces (Temporal) or partitions (Restate) plus per-tenant provenance log scoping. Confirm during adapter spike.
- **Rendering service for signature artifacts.** Formspec Definition plus signature overlays produces a signed PDF. Likely a separate service (Chromium-based). Product-implementation concern.

WOS-specific decision heuristics live in [`wos-spec/CLAUDE.md`](wos-spec/CLAUDE.md).

---

## XI. Trellis — Settled Architectural Commitments

Probed and accepted 2026-04-20 (session producing [`trellis/thoughts/adr/0001-0004-phase-1-mvp-principles-and-format-adrs.md`](trellis/thoughts/adr/0001-0004-phase-1-mvp-principles-and-format-adrs.md)).

**Phase-1 posture (refines stack Q1-Q4 for Trellis scope):**

- **Phase-1 MVP and v1.0 tagging are milestones, not locks.** `v1.0.0` is tagged, but nothing is released and no production records exist. The tag marks current best understanding; the wire shape stays rewritable as long as doing so prevents future architectural debt.
- **Rust is the byte authority.** Stack Q2 (co-authoritative) refined at byte level: for decisions spec prose can't pin (CBOR ordering, COSE headers, ZIP metadata, Merkle steps), Rust reference impl is canonical. Python remains as a cross-check implementation and updates to match Rust when byte-level ambiguity is resolved.
- **Maximalist envelope, restrictive Phase-1 runtime.** Stack Q3 (opinionated) expressed at Trellis: reserve envelope capacity for later phases now; enforce Phase-1 scope with lint/runtime constraints rather than by omitting wire-shape capacity.
- **G-5 stranger test is the integrity anchor.** Stack Q4 (reference-impl-is-oracle) specialized: byte-exact reproducibility across two independent impls. Internal Python/Rust agreement catches typos and intra-team ambiguity; G-5 catches spec ambiguity for an outside implementor.
- **Trellis is on our build track, not external dependency.** Phase-1 envelope invariants and the Rust reference implementation are co-engineered with downstream consumers (notably wos-server's EventStore). The "ship Trellis next" framing replaces any earlier "wait on Trellis" framing.

**Format ADRs.** ADRs 0001-0004 cover DAG-capable envelope with single-parent Phase-1 runtime, optional anchor capacity, federation reservations, and Rust-as-byte-authority. ADR 0006 defines a 5-class `KeyEntry` taxonomy (signing/tenant-root/scope/subject/recovery); Phase-1 envelope reserves all five, runtime emits only `signing` today. ADR 0007 defines `trellis.certificate-of-completion.v1` (Accepted 2026-04-24) — composed from SignatureAffirmations + IdentityAttestations + final determination; export catalog at `065-certificates-of-completion.cbor`; not open work. Lifecycle states for signing keys per Core §8.4: `Active → Rotating → Retired`, with `Revoked` reachable from any. Detail at [`trellis/thoughts/adr/0001-0004-phase-1-mvp-principles-and-format-adrs.md`](trellis/thoughts/adr/0001-0004-phase-1-mvp-principles-and-format-adrs.md). Normative bytes at [`trellis/specs/trellis-core.md`](trellis/specs/trellis-core.md).

**ADR namespace discipline.** Trellis-internal ADRs (`trellis/thoughts/adr/`) are numbered independently of parent-repo stack ADRs (`thoughts/adr/`). New Trellis envelope/CDDL/byte work uses Trellis-internal numbering; next free is `0009`. Stack-level cross-layer ADRs use parent-repo numbering. Cross-namespace number collisions are not collisions; same-namespace collisions are.

**Authority order (Trellis-scope conflicts).** When two artifacts disagree about Trellis bytes or behavior: Rust crates > CDDL §28 > Core/Companion prose > requirements matrix > Python cross-check > archives. Per Trellis ADR 0004 — Rust is byte authority. Archive material (non-normative `thoughts/archive/`) is never citation-grade; current `specs/` and `crates/` are.

### Active uncertainties (Trellis-scope)

- **Anchor substrate choice at deployment.** OpenTimestamps default (strongest durability); agency-operated Trillian if infrastructure ownership requires it; Sigstore Rekor also in scope. Adapter-tier; spike before pinning.
- **Python maintenance burden vs. integrity contribution.** Re-evaluate once production experience shows whether the dual-implementation cross-check catches meaningful issues.
- **`custodyHook` contract with WOS.** Joint-design ADR spanning both submodules.
- **SCITT strictness.** Full SCITT vs. SCITT-adjacent. Default stands at full SCITT with RFC 9162 plus SCITT-compat leaves as fallback if IETF working group volatility blocks spec write-up.
- **Federation Profile substance.** Cooperative trust-anchor network is the inherited default. Current Core carries federation-oriented capacity via `extensions` registries and checkpoint / export manifest hooks; substance defers to Phase 4.
- **AEAD nonce determinism on retry.** Real spec gap. Core §17 pins `(ledger_scope, idempotency_key)` permanence; Core §9.4 (HPKE Base mode wrap) does NOT pin AEAD encryption nonce as deterministic from authored content. Naive retry that re-encrypts with fresh random nonce produces different ciphertext → different `content_hash` → different `canonical_event_hash` → `IdempotencyKeyPayloadMismatch` for what looks like the same authored fact. Resolution: either deterministic nonce derivation rule (e.g., HKDF over authored bytes + idempotency_key) in Core §9.4, or explicit operator obligation to memoize ciphertext per idempotency_key. Center commitment; needs prose addition + fixture vector.
- **Tenant-scope export shape.** Core §18 ZIP layout is per-`ledger_scope`. Tenant-scope export spans many scopes — genuine new shape work. Decision between bundle-of-bundles (e.g., `070-tenant-package-manifest.cbor` cataloging constituent per-scope ZIPs) and a new top-level package format is gating; trigger = first tenant-scope export use case.

Trellis-specific decision heuristics live in [`trellis/CLAUDE.md`](trellis/CLAUDE.md).

---

## XII. Decision Heuristics

Stack-wide collaboration heuristics live in [`.claude/user_profile.md`](.claude/user_profile.md) § "Collaboration heuristics". Per-spec heuristics live in the corresponding submodule `CLAUDE.md`. Q1-Q4 answers above are the foundation — any proposed action that would override them stops and asks the owner.

---

## XIII. Authoritative References

| Concern | Authoritative spec |
|---|---|
| Public-facing stack framing (partners, procurement, investors) | [`STACK.md`](STACK.md) |
| Owner operating preferences | [`.claude/user_profile.md`](.claude/user_profile.md) |
| Behavioral interrupts overriding default agent training | [`.claude/operating-mode.md`](.claude/operating-mode.md) |
| Active platform decision register | [`thoughts/specs/2026-04-22-platform-decisioning-forks-and-options.md`](thoughts/specs/2026-04-22-platform-decisioning-forks-and-options.md) |
| Formspec field-level access classification, bucketed Response, per-class encryption mechanics | [ADR-0074](thoughts/adr/0074-formspec-native-field-level-transparency.md) |
| Formspec response-scoped respondent history | `specs/audit/respondent-ledger-spec.md` |
| Case ledger composition and wire format | `trellis/specs/trellis-core.md` §22 (current) plus planned cross-stack case-ledger binding |
| WOS governance event-type definitions | `wos-spec/specs/audit/wos-event-types.md` (planned) |
| Access-class taxonomy + lint rules | `specs/registry/access-class-registry.md` (planned per ADR-0074) |
| Per-deployment audience policy | `specs/privacy/privacy-profile.md` (planned per ADR-0074) |
| Trellis byte protocol (envelope, hash construction, signing, export) | `trellis/specs/trellis-core.md` |
| Trellis operational discipline (projections, watermarks, snapshots) | `trellis/specs/trellis-operational-companion.md` |
| Case-creation boundary (Formspec → WOS handoff) | [ADR 0073](thoughts/adr/0073-stack-case-initiation-and-intake-handoff.md) |
| Stack evidence integrity (attachment binding) | [ADR 0072](thoughts/adr/0072-stack-evidence-integrity-and-attachment-binding.md) |
| Selective disclosure (BBS+) for FOIA / cross-agency export | Planned follow-on parent-repo ADR (number TBD; current free numbers start past existing 0081) |
| WOS Server reference architecture (crate structure, ports, adapters, build sequence DAG, wos-server-specific invariants) | [`wos-spec/crates/wos-server/VISION.md`](wos-spec/crates/wos-server/VISION.md) |

---

## XIV. What This Doc Is NOT

- A spec. Specs live in each project's `specs/` tree.
- A plan. Plans live in each project's `thoughts/plans/`.
- The public-facing integrative doc — [`STACK.md`](STACK.md) serves partners/procurement/investors.
- A user profile — [`.claude/user_profile.md`](.claude/user_profile.md) captures operating preferences.
- An inventory — does not enumerate code already shipped; describes the target architecture.
- A reference implementation roadmap — wos-server, browser runtimes, and adapter sequencing live in the per-project trees and the platform decision register.
- Immutable — updated on explicit owner signals; cautiously.

---

## XV. Provenance

This vision is the synthesis of architectural conversations through 2026-04. The shape that survived:

- **Operating frame correction.** Phasing as developer-hours economy was rejected; tokens are unlimited; calendar time and architectural/conceptual debt are scarce; elegance is the optimization target.
- **AI-authored "locked narrative" framing rejected** as authority. Substance evaluated independently.
- **Two-store outbox collapsed to single EventStore** when the coordination problem dissolved under "Trellis IS the database."
- **Server-side decryption rejected for routine reads** in favor of client-side decryption with KMS-mediated key brokerage.
- **Per-class encryption** chosen over event-level encryption when "not every person needs to see every field" became architecturally explicit.
- **Field-level classification placed in Formspec** because Formspec is the source of truth for what fields are. ADR-0074 owns the spec specifics.
- **Trellis framed as our work**, not as an external substrate dependency. We ship the Phase-1 envelope, the Rust reference implementation, and the storage adapters.
- **"Subject Ledger" synonym dropped** in favor of distinct concepts: Respondent Ledger (Formspec center, response-scope) vs. case ledger (Trellis Core §1.2 term for adjudicatory-scope composition). RL stayed as Formspec center; only the parallel "Subject Ledger" naming was retired.
- **CRYPTO_OWNER fence pattern adopted** from ADR-0074's `formspec-bucketing` precedent. The dep graph is the security boundary.
- **Calendar-time and "implementation realism" scaffolding dropped.** Architectural debt and conceptual debt are the real costs; build the elegant end state.
- **Vision consolidated into root /VISION.md (2026-04-27).** Previously split between `.claude/vision-model.md` (stack-wide Q&A and per-spec commitments) and `wos-spec/crates/wos-server/VISION.md` (which had accreted stack-wide content). Stack-wide content lives here; wos-server-specific architectural framing remains in the wos-server doc.

The architecture that resulted is data-and-workflow zero trust on top of conventional identity-and-network zero trust — emergent from honest engagement with each architectural question, not engineered toward as a goal.
