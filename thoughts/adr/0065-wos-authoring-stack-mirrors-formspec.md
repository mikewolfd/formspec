# ADR 0065: WOS Authoring Stack Mirrors Formspec

**Status:** Accepted
**Date:** 2026-04-17
**Scope:** `wos-spec/` submodule — crate architecture for authoring and AI integration
**Related:** [ADR 0064 (WOS granularity + AI-native positioning)](./0064-wos-granularity-and-ai-native-positioning.md), [ADR 0063 (Release trains by tier)](./0063-release-trains-by-tier.md)

## Context

The WOS submodule currently has four Rust crates: `wos-core` (model types, parser, AST), `wos-lint` (linter, 91 rules), `wos-conformance` (T3 runner, 6 rules), and `wos-runtime` (execution engine). These correspond to Formspec's foundational layers (types / engine).

Two AI-native deliverables are in scope per [ADR 0064](./0064-wos-granularity-and-ai-native-positioning.md) and resolved open-questions Q1:

1. A reference LLM-authoring harness (benchmarkable demonstration of Claim A).
2. Interactive agent-driven authoring (MCP tool surface for Claude Desktop / Cline users).

An initial plan scaffolded both deliverables as a single monolithic crate (`wos-synth`) gated by a `--features synth` Cargo feature. Architectural review on 2026-04-17 flagged two problems:

1. **Dependency inversion violation.** The authoring loop (business logic) was compile-time-coupled to a specific LLM provider (Anthropic SDK). A `--features` flag separates at compilation, not at crate boundaries — the right seam for DIP is across crate boundaries.

2. **Missing intermediate layers.** Parent Formspec's authoring stack has five layers above foundational types: `formspec-core` (state + commands + undo/redo), `formspec-studio-core` (intent-driven helpers), `formspec-mcp` (tool adapter, dual entry: stdio + in-process dispatch), `formspec-chat` (conversation loop). WOS's initial plan collapsed three of those layers (studio-core + mcp + chat) into one crate.

Formspec's layering is load-bearing for extensibility: each layer has a single responsibility, and each is independently consumable. `formspec-mcp` can be used without `formspec-chat`. `formspec-chat`'s `ToolContext` is host-injected — Studio can provide a local in-process tool surface; another host could provide a remote one. Similar flexibility is absent from the WOS monolithic plan.

## Decision

### D-1. WOS adopts Formspec's layering verbatim for authoring / AI-native crates

The mapping:

| Formspec | WOS | Responsibility |
|---|---|---|
| `formspec-core` | `wos-core` (existing, minor growth needed) | Model types + low-level parser/serializer. Future: command pipeline + undo/redo if needed. |
| `formspec-studio-core` | `wos-authoring` (new) | Intent-driven authoring helpers: `add_state`, `add_transition`, `add_actor`, etc. Composes over `wos-core`. ≥25 helpers across lifecycle / actors / governance / AI. |
| `formspec-mcp` | `wos-mcp` (new) | Thin MCP adapter wrapping `wos-authoring` helpers as tool handlers. Dual entry: MCP stdio server (for external agents) + `dispatch()` in-process function (for internal consumers). |
| `formspec-chat` | `wos-synth-core` (rescoped) | Authoring loop orchestrator. Owns the `Prompter` trait (LLM provider abstraction) and `ToolContext` trait (how the loop invokes tools). |

### D-2. `wos-synth-core` splits along DIP boundaries into four crates

The monolithic scaffold at commit `2815e4d` is reshaped into:

| Crate | Role |
|---|---|
| `wos-synth-core` | Loop + `Prompter` trait + `ToolContext` trait + prompt templates. Pure business logic; no network, no LLM client, no runtime async executor in the default dep graph. |
| `wos-synth-anthropic` | Concrete `Prompter` via `anthropic-sdk`. Unconditional dep on LLM client. Separate crate, not a feature flag. |
| `wos-synth-mock` | Deterministic `Prompter` for tests / benchmarking. |
| `wos-synth-cli` | Binary wiring one `Prompter` + one `ToolContext`. Default binding: `wos-synth-anthropic` + `wos-mcp::dispatch`. |

### D-3. `ToolContext` is the seam between authoring loop and tool handlers

`wos-synth-core` never directly imports `wos-lint`, `wos-conformance`, or `wos-authoring`. It depends only on the `ToolContext` trait it defines. Production wiring in `wos-synth-cli` injects a `ToolContext` implementation backed by `wos-mcp::dispatch`. An optional stopgap implementation in `wos-synth-core/src/tool_context/direct.rs` wraps `wos-lint` + `wos-conformance` directly for the transition period before `wos-mcp` lands.

### D-4. `wos-mcp` serves both in-process and out-of-process callers

Mirrors `packages/formspec-mcp/src/dispatch.ts` which is explicitly documented as "in-process tool dispatch — call MCP tool handlers directly without network transport." The same Rust module exposes both. `wos-synth-core` talks to `wos-mcp` via in-process `dispatch()`; Claude Desktop talks to it via stdio JSON-RPC-2.0.

## Consequences

### Positive

- Each layer independently consumable. A vendor embedding WOS authoring into their product can use `wos-authoring` directly without pulling in MCP or LLM client. A user authoring via Claude Desktop doesn't need Rust-side LLM client code at all. A benchmark harness uses `wos-synth-mock` with no network.
- DIP is honored at crate boundaries, not feature flags. The loop crate stays pure and build-fast for tests. Provider churn (Anthropic SDK updates, new providers) doesn't cascade through the loop.
- Mirrors parent-repo mental model. Contributors familiar with `formspec-chat` / `formspec-mcp` / `formspec-studio-core` map onto WOS crates 1:1. Muscle memory transfers.
- Unblocks a future `wos-openai` / `wos-llamacpp` provider crate per [open-questions Q2](../../wos-spec/thoughts/archive/reviews/2026-04-16-architecture-review-open-questions.md#q2-should-wos-synth-live-in-wos-spec-or-a-sibling-repo) extraction trigger — each is ~100 LOC implementing `Prompter`.

### Negative

- More crates (four above foundational, up from one planned). More `Cargo.toml` churn during releases. Mitigated by Changesets `fixed` groups per `wos-synth-*` per ADR 0063 step 1.
- `wos-authoring` is genuinely new work not in the original plan (~2 engineer-weeks). Budget expanded accordingly.
- The scaffolded monolithic `crates/wos-synth/` at commit `2815e4d` is now either reshaped (code moves across crate boundaries) or renamed (`wos-synth` becomes `wos-synth-core`, feature flag removed, provider deps extracted to `wos-synth-anthropic`). Either path is ≤1 hour of work since the scaffold is ~200 LOC.

### Neutral

- Open-questions Q6 ("is synth and benchmark one project or two?") was resolved as "two crates sharing primitives." Under D-2, `wos-bench` depends on `wos-synth-core` + one provider (typically `wos-synth-mock` for CI or `wos-synth-anthropic` for real runs). The two-crate framing holds; the split just adds granularity around providers.

## Alternatives Considered

1. **Keep the monolithic `wos-synth` with `--features synth`.** Rejected per D-1's DIP argument. Feature flags are not dependency inversion; they're compile-time selection.

2. **Put `wos-mcp` tools directly over `wos-core`, skip `wos-authoring`.** Rejected because `wos-mcp`'s 20+ tool handlers would each need to re-implement intent-to-primitives translation, duplicating ~25 helpers' worth of logic across the tool surface. Formspec explicitly avoided this: studio-core exists because MCP tools needed somewhere to call. Same answer here.

3. **Extend `wos-core` with the authoring helpers, merge `wos-authoring` into `wos-core`.** Rejected because `wos-core` is the ratified model-types layer; mixing it with intent-driven authoring helpers violates the "layer = single responsibility" pattern the decision is anchored in.

4. **Fold `wos-mcp` and `wos-synth-core` into a single crate (since both are authoring interfaces).** Rejected because their consumers differ fundamentally: `wos-mcp` serves external agents via stdio; `wos-synth-core` hosts an in-process loop driving an LLM via Rust code. Different async models, different dep graphs, different release cadence. Formspec separates them for the same reason.

## References

- Open questions Q1, Q2, Q6 — [resolved 2026-04-17](../../wos-spec/thoughts/archive/reviews/2026-04-16-architecture-review-open-questions.md).
- Plans affected: `wos-spec/thoughts/plans/2026-04-16-wos-synth-crate.md` (rewritten), `wos-spec/thoughts/plans/2026-04-17-wos-authoring-crate.md` (new), `wos-spec/thoughts/plans/2026-04-17-wos-mcp-crate.md` (new).
- Formspec prior art (verbatim layer mapping target):
  - `packages/formspec-core/README.md` — `RawProject` + IProjectCore + commands + pipeline.
  - `packages/formspec-studio-core/README.md` — `Project` class + authoring helpers over IProjectCore.
  - `packages/formspec-mcp/src/dispatch.ts` — dual-entry dispatch pattern.
  - `packages/formspec-chat/README.md` — conversation loop + AIAdapter + ToolContext.
