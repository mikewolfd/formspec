# ADR 0068: Stack Contract — Tenant and Scope Composition

**Status:** Proposed
**Date:** 2026-04-21
**Scope:** Cross-layer — Formspec + WOS + Trellis
**Related:** [STACK.md Open Contracts](../../STACK.md#open-contracts); [ADR 0061 (WOS custodyHook wire format)](../../wos-spec/thoughts/adr/0061-custody-hook-trellis-wire-format.md) (TypeID tenant prefix); [ADR 0066 (amendment and supersession)](./0066-stack-amendment-and-supersession.md) (cross-bundle boundaries); WOS #3 migration routing; WOS `DurableRuntime` tenant-scope contract (session 9); Trellis Core §17 ledger scope; [parent TODO](../../TODO.md) stack-wide section

## Context

Three layers, three scoping concepts — all authored independently, none declared to compose.

- **Formspec** scopes by *definition* — one definition version governs one response.
- **WOS** scopes by *tenant* via the `DurableRuntime` contract (session 9), separately by *workflow* via kernel instance id.
- **Trellis** scopes by *ledger* — the hash-chain boundary.

No stack-level statement says how these three compose. The public-SaaS wedge requires hard tenant isolation — one customer's case must never leak into another customer's chain. Multi-program government agencies need program-level isolation inside a tenant. Cross-tenant actor identity (a caseworker serving multiple tenants) is a common pattern. Today each concern is solved per-deployment, which is exactly how multi-valent centers become narrow ones.

Listed in [STACK.md Open Contracts](../../STACK.md#open-contracts) as an integration primitive — composition protocol, not event shape. Touches all three layers; no adapter fills the gap.

## Decision

**Hierarchical composition.** Tenant is the outermost container; the three per-layer scopes nest inside it. A case belongs to exactly one four-tuple — the *scope bundle* — for its entire lifetime.

### D-1. Tenant is the outermost container

Every record produced by any layer for any case carries the tenant identifier. Cross-tenant reads are impossible by construction — the runtime, the ledger, and every storage tier MUST refuse reads that cross the tenant boundary. Tenant is not an application-level filter; it is a substrate boundary honored by all three layers.

### D-2. A case's scope bundle is the four-tuple `(Tenant, DefinitionId, KernelId, LedgerId)`

| Identifier | Owned by | Meaning |
|---|---|---|
| `Tenant` | stack | outer isolation boundary |
| `DefinitionId` | Formspec | the definition version the case's responses validate against |
| `KernelId` | WOS | the workflow kernel the case evaluates under |
| `LedgerId` | Trellis | the hash-chain the case's events belong to |

Authoring-time constraint: the four components MUST be declared jointly at case open and MUST NOT change for the case's lifetime. A mismatched tuple — a response against `DefinitionId` submitted into a chain opened under a different `DefinitionId` — is a configuration error rejected at runtime.

### D-3. Actors span tenants; authorization is per-tenant

A reviewer's identity is first-class across tenants. The same human holds one global identity. But *authority* — which cases this human may read, review, or decide — is per-tenant. Authorization grants in one tenant do not transfer to another.

Rationale: identity-as-global matches how people actually work (one reviewer serves many counties). Authority-as-per-tenant preserves isolation at the capability layer.

### D-4. Case ID scope is tenant × ledger

TypeID format (per [ADR-0061](../../wos-spec/thoughts/adr/0061-custody-hook-trellis-wire-format.md)) already encodes tenant as a prefix: `{tenant}_{type}_{uuidv7_base32}`. This ADR makes the prefix *load-bearing across all three layers*: a case ID is unique within a `(Tenant, LedgerId)` pair, not globally. Verifiers and storage layers MUST treat the tenant prefix as scope, not as opaque string.

### D-5. Migration within a scope bundle is permitted; across bundles is prohibited

A case may move through workflow states, definition migrations (opt-in per [ADR 0071](./0071-stack-cross-layer-migration-and-versioning.md)), and governance amendments (per [ADR 0066](./0066-stack-amendment-and-supersession.md)) — all within its scope bundle. A case MUST NOT migrate across tenants. Cross-tenant case movement is a rights-impacting correctness risk — evidence, authorization, and audit trails anchor to the source tenant's substrate. Pattern is available via [ADR 0066](./0066-stack-amendment-and-supersession.md) supersession: the destination tenant opens a new case that supersedes; the source chain remains intact.

## Consequences

**Positive.**
- Multi-tenant SaaS has structural isolation, not convention.
- Program-level isolation inside a tenant via distinct scope bundles.
- Auditors always answer "which tenant does this case belong to?" by reading the case ID.
- TypeID tenant prefix carries the invariant mechanically.

**Negative.**
- Every runtime carries tenant context in every call. Non-trivial API-surface impact on adapters.
- Some patterns (cross-tenant case reassignment, multi-tenant shared evidence pools) become unavailable. Supersession is the substitute.

**Neutral.**
- Does not prescribe tenant encoding. A DurableRuntime adapter may implement tenant as Temporal namespace, Restate partition, or Postgres schema — the choice is adapter-concern.

## Implementation plan

**Formspec.**
- Respondent Ledger §6 event envelope gains a REQUIRED `tenant` field at the top level.
- Canonical response schema gains a top-level `tenant` field.
- Runtime re-validation paths refuse responses whose `tenant` does not match the runtime's current scope.

**WOS.**
- `DurableRuntime` trait API carries tenant context on every method; existing impls updated.
- `CaseInstance` struct gains a required `tenant: String` field.
- Kernel `caseRelationship` enforces same-tenant at lint time; cross-tenant relationships are rejected with a dedicated rule (proposed `K-C-010`).
- Governance policies may scope by tenant via FEL on existing `scope` field (no new mechanism).

**Trellis.**
- Envelope header gains REQUIRED `tenant` field paired with `ledger_id`.
- Verifier MUST refuse a chain whose tenant mismatches the expected scope context.
- Export bundles carry tenant at the bundle level.

**Stack-level.**
- TypeID registration ([ADR-0061](../../wos-spec/thoughts/adr/0061-custody-hook-trellis-wire-format.md) T1.1) carries this ADR as a normative reference.

## Open questions

1. **Tenant identifier format.** Default: opaque string matching `^[a-z][a-z0-9-]{0,62}$` (matches TypeID lowercase-kebab convention). Alternative: UUID. Recommendation: default — tenants are human-meaningful; opaque UUIDs hurt operability.
2. **Actor-across-tenants identity format.** Default: global identifier independent of tenant, resolved by the identity-proofing adapter. Alternative: per-tenant identity with a separate global-id mapping layer. Recommendation: default — matches how federated identity already works.
3. **Scope-bundle re-declaration on amendment/supersession.** An amendment under [ADR 0066](./0066-stack-amendment-and-supersession.md) stays in the same bundle. A supersession opens a new chain; does it reuse the same `(Tenant, DefinitionId, KernelId)` and only mint a new `LedgerId`, or does it mint fresh across all four? Default: reuses the first three; new LedgerId only. Alternative: fresh bundle for clarity. Recommendation: default — the supersession-graph.json linkage already disambiguates.

## Alternatives considered

**Flat scoping — three independent axes.** Rejected. Cross-tenant leakage becomes possible by omission; any layer that forgets to check tenant opens a hole.

**Tenant as adapter-only concern.** Rejected. Tenant is observable in every cross-layer operation (a case ID carries it; a chain's scope is defined by it). Adapter-only means different adapters could produce different observable outcomes for the same authored documents — violates the center-vs-adapter test.

**Per-layer independent scoping with no cross-layer pin.** Rejected. Composition becomes per-deployment convention; multi-valent center narrows to the first deployment shape.

**Program as a first-class kernel concept.** Rejected. "Program" is a human-organizational construct that varies across adopters (government agencies have programs; SaaS tenants may or may not). The four-tuple is the formal primitive; "program" is prose at the application layer.
