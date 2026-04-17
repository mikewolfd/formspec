# Formspec Compatibility Matrix

> **Current Status:** Today all packages release atomically from a single Changesets pipeline. The matrix below reflects the *target* velocity-tier assignments. The release-train split itself is planned — see [ADR 0063](./thoughts/adr/0063-release-trains-by-tier.md). Until that lands, consumers should treat all listed versions as coupled.

Formspec is a multi-language monorepo (TypeScript packages, Rust crates, a Python package) whose components mature at different rates. The stable kernel types evolve slowly — most of the engine runtime moves quarterly, and the AI/authoring surface is still pre-1.0 and moves monthly. To let consumers pin risk appropriately, packages are grouped into **velocity tiers**. Once release-train split is active, a vendor may — for example — pin `@formspec-org/types@1.x` for long-term stability while tracking `@formspec-org/chat@0.x` on a faster cadence.

Each tier has its own CHANGELOG (where applicable), its own target cadence, and — after the split — its own release stream. Within a tier, packages move together; across tiers they do not.

## Package Matrix

| Package                       | Tier                 | Cadence        | Current Version | Requires                       |
| ----------------------------- | -------------------- | -------------- | --------------- | ------------------------------ |
| `@formspec-org/types`         | 0 — Kernel           | 6–12 months    | 0.1.0           | —                              |
| `@formspec-org/engine`        | 1 — Foundation       | 3–6 months     | 1.0.0           | `@formspec-org/types@0.1.x`    |
| `@formspec-org/layout`        | 1 — Foundation       | 3–6 months     | 1.0.0           | `@formspec-org/types@0.1.x`    |
| `@formspec-org/webcomponent` | 2 — Foundation       | 3–6 months     | 1.0.0           | `@formspec-org/engine@1.x`     |
| `@formspec-org/react`         | 2 — Foundation       | 3–6 months     | 0.1.0           | `@formspec-org/engine@1.x`     |
| `@formspec-org/core`          | 2 — Foundation       | 3–6 months     | 0.1.0           | `@formspec-org/engine@1.x`     |
| `@formspec-org/assist`        | 2 — Foundation       | 3–6 months     | 0.1.0           | `@formspec-org/engine@1.x`     |
| `@formspec-org/adapters`      | 3 — Integration      | Quarterly      | 0.1.0           | `@formspec-org/core@0.1.x`     |
| `@formspec-org/studio-core`   | 3 — Integration      | Quarterly      | 0.1.0           | `@formspec-org/core@0.1.x`     |
| `@formspec-org/mcp`           | 4 — AI & Authoring   | Monthly        | 0.2.0           | `@formspec-org/studio-core@0.1.x` |
| `@formspec-org/chat`          | 5 — AI & Authoring   | Monthly        | 0.1.0           | `@formspec-org/mcp@0.2.x`      |
| `@formspec-org/studio`        | 6 — Applications     | Out-of-cadence | 0.1.0 (private) | all lower tiers                |

### Rust crates (workspace version `0.1.0`)

| Crate                  | Tier               | Notes                                                       |
| ---------------------- | ------------------ | ----------------------------------------------------------- |
| `fel-core`             | 0 — Kernel         | FEL grammar, parser, evaluator — normative logic            |
| `formspec-core`        | 0 — Kernel         | Core types; emits into `@formspec-org/types`                |
| `formspec-eval`        | 0 — Kernel         | Evaluation primitives shared by runtime + tools             |
| `formspec-lint`        | 1 — Foundation     | Lint rules; consumed by tools tier                          |
| `formspec-changeset`   | 1 — Foundation     | Changeset primitives for authoring                          |
| `formspec-wasm`        | 1 — Foundation     | WASM glue; consumed exclusively by `@formspec-org/engine`   |
| `formspec-py`          | 3 — Integration    | Python bindings; ships as the `formspec-py` wheel           |

All crates currently move together at workspace version `0.1.0`. Kernel-tier crates back `@formspec-org/types`; Foundation-tier crates back `@formspec-org/engine` (WASM).

### Python

| Package       | Tier            | Cadence   | Current Version | Requires                                  |
| ------------- | --------------- | --------- | --------------- | ----------------------------------------- |
| `formspec-py` | 3 — Integration | Quarterly | 0.1.0           | Matches kernel + foundation Rust versions |

`formspec-py` ships via `.github/workflows/publish-pypi.yml` on `py-v*` tags and is already decoupled from the npm pipeline at the workflow level, even while version numbers are currently aligned.

## Tier Definitions

### Tier 0 — Kernel

**Members:** `@formspec-org/types`, `formspec-types` (TypeScript build target), `fel-core`, `formspec-core` (Rust), `formspec-eval`.

The structural and semantic contract of Formspec. Schema shapes, FEL grammar, core evaluation primitives. Breaks here ripple through every other tier.

- **Cadence:** 6–12 months between minor releases. Patch releases only for correctness bugs.
- **Semver discipline:** strict. No silent behavior changes.
- **Vendors pin here.** A vendor or platform integrating Formspec should pin the kernel tier as the anchor for their supply chain.

### Tier 1–2 — Foundation

**Members:** `@formspec-org/engine`, `@formspec-org/layout`, `@formspec-org/webcomponent`, `@formspec-org/react`, `@formspec-org/core`, `@formspec-org/assist`. Rust: `formspec-lint`, `formspec-changeset`, `formspec-wasm`.

Runtime and presentation primitives built on the kernel. Engine state management, layout resolution, component registry, rendering bridges.

- **Cadence:** 3–6 months.
- **Semver discipline:** strict for 1.x packages; tracking toward 1.x for 0.x packages.
- **Moves as a unit within its tier.** Foundation packages are co-versioned because cross-package contracts (engine ↔ webcomponent, engine ↔ react) are tight.

### Tier 3 — Integration

**Members:** `@formspec-org/adapters`, `@formspec-org/studio-core`, `formspec-py`.

Adapters that integrate Formspec with external data and tooling surfaces. Studio runtime (headless). Python backend.

- **Cadence:** Quarterly.
- **Semver discipline:** strict once past 1.0. Currently 0.x while shape stabilizes.

### Tier 4–5 — AI & Authoring

**Members:** `@formspec-org/mcp`, `@formspec-org/chat`.

AI-adjacent and authoring-experience surface. Pre-1.0; APIs still moving as the authoring loop is validated.

- **Cadence:** Monthly.
- **Semver discipline:** 0.x — breaking changes expected at minor bumps. Consumers should expect to update these on every cadence.

### Tier 6 — Applications

**Members:** `@formspec-org/studio` (private).

Applications built on top of the lower tiers. Not published to npm; version moves with internal release cycles.

- **Cadence:** Out-of-cadence.
- **Semver discipline:** N/A (private).
