# Screener Specification Reference Map

> specs/screener/screener-spec.md -- 2047 lines, ~87K -- Companion: standalone respondent screening, classification, routing, and Determination Records

## Overview

The Formspec Screener Specification is a companion to Formspec v1.0. It defines a freestanding Screener Document (JSON) that classifies respondents and routes them to Definition references, external URIs, or named `outcome:` dispositions using FEL for conditions, scores, and binds. Evaluation is an ordered phase pipeline with normative strategies, hoisted override routes (including terminal halt), lifecycle controls, and a structured Determination Record output with per-item answer states. Appendix C is a repository-wide implementation migration inventory for replacing embedded core §4.7 screeners with the standalone model.

## Section Map

### Front matter, abstract, and navigation (Lines 1-99)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| -- | Formspec Screener Specification v1.0 | Title block: draft version metadata, editors, companion relationship to Formspec v1.0. | version, draft, companion | Confirming document identity and draft status |
| -- | Abstract | Standalone JSON screener; items, phases, routing; FEL substrate; contrast with Theme/Component/Mapping (no single Definition bind); outward routing. | freestanding, FEL, gateway | One-paragraph product summary |
| -- | Status of This Document | Draft companion; does not modify core; not production-stable until 1.0.0. | draft, feedback | Stability and normative scope vs core |
| -- | Conventions and Terminology | BCP 14 / RFC 2119+8174 keywords; RFC 8259 JSON; RFC 3986 URI; ISO 8601 durations; core terms (Definition, Item, Bind, FEL) by reference. | MUST, RFC 8259, ISO 8601 | Keyword and external-standard grounding |
| -- | Bottom Line Up Front | Bullet summary: required properties, freestanding model, phase pipeline, strategies, override routes, Determination Record, lifecycle, isolated items/binds, answer states. | BLUF | Fast onboarding (cross-check body for precision) |
| -- | Table of Contents | Anchor list for §1-§14 (appendices not linked in TOC). | navigation | Jump targets within the spec |

### §1 Introduction (Lines 100-228)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §1 | 1. Introduction | Motivation: core defines data/behavior/validation; §4.7 embedded screener replaced by standalone document with phases, strategies, lifecycle, structured output. | standalone, §4.7 | Architectural framing |
| §1.1 | 1.1 Purpose and Scope | Screener as independent JSON with URL/version; isolated scope; pipeline; first-match, fan-out, score-threshold; overrides; Determination Record; lifecycle; many-to-many Screener↔Definition routing. | decoupled, routing | Why the companion exists |
| §1.2 | 1.2 Scope | In: document JSON, strategies, overrides, Determination Record, lifecycle, answer states. Out: transport, auth, sessions, identity, rendering, core/FEL grammar, orchestration. | in-scope, out-of-scope | Boundary questions |
| §1.3 | 1.3 Relationship to Formspec Core | Companion only; core processors need not implement screener; screener processors MUST support Item §4.2, Bind §4.3, FEL §3; every valid §4.7 screener expressible as one `first-match` phase; degenerate interpretation SHOULD. | companion, FEL required, §4.7 equivalence | Core coupling and migration equivalence |
| §1.4 | 1.4 Terminology | Defines Screener Document, Evaluation Phase, Strategy, Route, Override Route, Determination Record, Answer State, Result Validity, Availability Window. | override hoisting, answer state | Precise term lookup |
| §1.5 | 1.5 Notational Conventions | `//` in examples; monospace keys; §N = this doc, "core §" = core spec. | notation | Reading examples and cross-refs |

### §2 Screener document structure (Lines 230-303)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §2 | 2. Screener Document Structure | Root JSON object; SC-13: recognize all top-level keys; reject if REQUIRED missing. | SC-13, JSON shape | Validator and authoring root |
| §2.1 | 2.1 Top-Level Properties | Table: `$formspecScreener` "1.0", `url`, `version` semver, `title`, optional `description`, `availability`, `resultValidity`, `evaluationBinding`, required `items`, optional `binds`, required `evaluation`, optional `extensions` (core §4.6 pattern). | evaluationBinding, items, evaluation | Root property authoring |
| §2.2 | 2.2 Identification | Identity is `url` + `version`; `url` opaque/stable (URN ok, not necessarily HTTP). | url, version | Linking and versioning |
| §2.3 | 2.3 No Target Binding | No `targetDefinition` / `definitionRef`; routes carry relationships; gateway vs projection; project-level association. | gateway, sidecar | Why screener differs from Theme/Component/Mapping |

### §3 Items and binds (Lines 305-390)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §3 | 3. Items and Binds | Items/binds reuse core schemas; isolated FEL scope; answer states; null handling in conditions/scores. | isolated scope | Screener data layer behavior |
| §3.1 | 3.1 Screener Items | Core §4.2 Item types/datatypes/repeaters; not part of any Definition response; SC-14 unique keys within screener; MAY collide with Definition keys. | SC-14, routing-only | Item authoring and key rules |
| §3.2 | 3.2 Screener Binds | Core §4.3 full bind surface; screener paths only; absolute isolation from Definition binds. | calculate, relevant | Bind authoring |
| §3.3 | 3.3 Answer States | `answered`, `declined`, `not-presented`; SC-01 distinguishable in Determination Record; SC-02/SC-03 FEL sees null for declined/not-presented. | SC-01, SC-02, SC-03 | Response and audit semantics |
| §3.4 | 3.4 FEL in Screener Context | `$key` and screener binds/functions allowed; no Definition items/binds/shapes/external state. | FEL scope | Expression validity |
| §3.5 | 3.5 Null Propagation in Conditions and Scores | Core §3.4 applies; SC-11 null condition → false; SC-12 null score → −∞, reason `null-score`. | SC-11, SC-12 | Edge cases in routing math |

### §4 Evaluation pipeline (Lines 392-499)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §4 | 4. Evaluation Pipeline | Ordered phases; overrides first (§6); phases in order; aggregate into Determination Record; terminal override can halt (§6.2). | override-first, aggregation | End-to-end flow mental model |
| §4.1 | 4.1 Phase Structure | JSON example: fan-out eligibility + score-threshold form selection. | evaluation[], routes | Authoring multi-phase JSON |
| §4.2 | 4.2 Phase Properties | `id` (SC-15 pattern), `label`, `description`, `strategy` (normative + SC-16 `x-` extensions), `routes`, `activeWhen`, `config`. | SC-15, SC-16, activeWhen | Phase object validation |
| §4.3 | 4.3 Route Properties (Common) | `condition`, `score`, required `target`, `label`, `message` with `{{fel}}` and `\{{` escape, SC-17 fallback, `metadata`, `override`. | message interpolation, SC-17 | Route authoring shared fields |
| §4.4 | 4.4 Phase Execution Semantics | `activeWhen` false → phase `skipped`; else strategy runs; phases independent; terminal override exception halts pipeline. | skipped, phase independence | Execution and Determination phase status |

### §5 Normative strategies (Lines 501-599)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §5 | 5. Normative Strategies | Built-in `first-match`, `fan-out`, `score-threshold`. | strategy | Choosing algorithm |
| §5.1 | 5.1 `first-match` | Declaration order; first true `condition`; SC-08 every route has `condition`; `"true"` default route; no extra config; same as core §4.7. | SC-08, first-match | Simple routing / §4.7 parity |
| §5.2 | 5.2 `fan-out` | All routes; every true match; SC-09 requires `condition`; false → eliminated `condition-false`; `config.minMatches`, `maxMatches` (excess `max-exceeded`). | SC-09, minMatches, maxMatches | Multi-match eligibility |
| §5.3 | 5.3 `score-threshold` | Per-route `score` and `threshold`; match if score ≥ threshold; all evaluated; sort matched descending, tie-break declaration order; SC-10; `config.topN`, `normalize`. | SC-10, normalize, topN | Scored routing |

### §6 Override routes (Lines 601-658)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §6 | 6. Override Routes | Safety routes hoisted from any phase; evaluated before phase pipeline (not “inside” a strategy). | hoisted, override set | When to use overrides |
| §6.1 | 6.1 Purpose | Hard exclusion / crisis / sanctions pattern; `"override": true` collects routes into virtual override set. | safety-critical | Product intent for overrides |
| §6.2 | 6.2 Override Evaluation | SC-18: before phases, cross-phase declaration order, no short-circuit among overrides; `terminal` two-stage (evaluate all overrides, then halt phases if any matched terminal); `overrides.halted`, empty `phases`; non-terminal overrides informational alongside phases. | SC-18, terminal, halted | Terminal and ordering bugs |
| §6.3 | 6.3 Override Route Properties | SC-25: override routes MUST have `condition`; `override` true; `terminal` ignored if not override. | SC-25 | Validating override routes |

### §7 Route targets (Lines 660-701)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §7 | 7. Route Targets | URI targets: Definition reference, external URI, named outcome. | target | Destination modeling |
| §7.1 | 7.1 Target Syntax | Table: `url\|version`, arbitrary URI, `outcome:name`; Definition syntax aligned with core §4.7. | url\|version, outcome: | Syntax authoring |
| §7.2 | 7.2 Named Outcomes | `outcome:` scheme; illustrative table not exhaustive; SC-19 pass-through without processor interpretation. | outcome:closed, SC-19 | Non-Definition exits |
| §7.3 | 7.3 Formspec Definition References | Consumer resolves Definition; bare URL → latest compatible SHOULD. | resolution | Version pinning at consumers |

### §8 Determination record (Lines 704-845)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §8 | 8. Determination Record | Primary output; schemas: `schemas/determination.schema.json` vs input `schemas/screener.schema.json`. | $formspecDetermination | Output vs input validation |
| §8.1 | 8.1 Structure | Full JSON example: overrides, phases, inputs with paths/states, validity. | inputs, phases | Shape of a real record |
| §8.2 | 8.2 Determination Record Properties | Required markers, screener ref, timestamp, evaluationVersion, status (completed/partial/expired/unavailable), overrides, phases, inputs (core §4.3.3 paths), optional validity. | evaluationVersion, status | Field-level output spec |
| §8.3 | 8.3 Phase Result Properties | `id`, `status` evaluated/skipped/unsupported-strategy, `strategy`, matched/eliminated, `warnings`. | unsupported-strategy | Per-phase results |
| §8.4 | 8.4 Route Result Properties | target, label, message, score (score-threshold), elimination reasons, metadata. | condition-false, null-score | Per-route results |
| §8.5 | 8.5 Determination Record as Extension Point | Normative minimum; extensions for audit, signatures, etc.; SC-20 use `extensions`, do not alter normative fields. | SC-20, extensions | Extending output safely |

### §9 Lifecycle (Lines 848-929)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §9 | 9. Lifecycle | Availability, validity duration, evaluation version binding. | lifecycle | Time and version policy |
| §9.1 | 9.1 Availability Window | `from`/`until` inclusive ISO dates; SC-04 no new sessions outside window, SHOULD `outcome:closed`; SC-05 complete sessions that started in window. | SC-04, SC-05 | Calendar gating |
| §9.2 | 9.2 Result Validity | ISO 8601 duration on document; SC-21 validity object with `validUntil`; SC-06 expired not valid, SHOULD re-screen; omit = no expiry. | SC-06, SC-21 | Determination TTL |
| §9.3 | 9.3 Evaluation Binding | `submission` vs `completion`; SC-07 `evaluationVersion` reflects applied rules; stateless single-shot guidance. | SC-07, evaluationBinding | Mid-session version behavior |

### §10 Processing model (Lines 932-997)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §10 | 10. Processing Model | Ordered evaluation behavior and partial/rescreen linkage. | processing model | Processor implementation order |
| §10.1 | 10.1 Evaluation Order | Six steps: availability (unavailable Determination + outcome:closed), item collection, answer states, overrides (terminal halt), phases (`activeWhen`), assemble record. | unavailable | Normative pipeline checklist |
| §10.2 | 10.2 Partial Evaluation | status `partial`; unanswered as not-presented; SC-22 not definitive routing. | SC-22, partial | Save/resume and progressive UI |
| §10.3 | 10.3 Re-screening | Not normatively defined; MAY link via `extensions` (example `x-rescreening.supersedes`). | supersedes, extensions | Session linkage patterns |

### §11 Conformance (Lines 1000-1021)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §11 | 11. Conformance | Levels and extension strategy handling. | conformance | Product tiering |
| §11.1 | 11.1 Conformance Levels | Core: first-match, Determination, availability, validity, answer states. Complete: all strategies, overrides+terminal, `activeWhen`, full record. Core MAY reject fan-out/score-threshold with clear report. | Core, Complete | Capability advertising |
| §11.2 | 11.2 Extension Conformance | SC-23: unknown `x-` strategy → skip phase, `unsupported-strategy`, MUST NOT fail whole eval. | SC-23 | Graceful degradation |

### §12 Extension points (Lines 1024-1075)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §12 | 12. Extension Points | Strategies, document/route/record extensions. | x- prefix | Custom behavior surfaces |
| §12.1 | 12.1 Custom Strategies | Example `x-constraint-satisfaction`; SC-24 same matched/eliminated contract as normative strategies. | SC-24, config | Custom strategy plugins |
| §12.2 | 12.2 Document Extensions | Top-level `extensions` like core §4.6. | core §4.6 | Document-level metadata |
| §12.3 | 12.3 Route Extensions | `metadata` opaque, preserved; not Definition-style `extensions`; behavioral extensions SHOULD use phase/document extensions. | metadata | Route tagging |
| §12.4 | 12.4 Determination Record Extensions | `extensions` on record per §8.5. | output extensions | Downstream fields |

### §13 Examples (Lines 1078-1435)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §13 | 13. Examples | Four full JSON screeners. | examples | Copy-paste patterns |
| §13.1 | 13.1 Simple Grant Eligibility (first-match) | §4.7 translation: money field, first-match, fallback `true` route. | migration, first-match | Minimal standalone screener |
| §13.2 | 13.2 Multi-Benefit Eligibility (fan-out) | SNAP/LIHEAP/WIC style; notes `fpl()` as domain FEL extension. | fan-out, fpl() | Parallel program routing |
| §13.3 | 13.3 Clinical Trial with Overrides and Scoring | Terminal pregnancy/stage IV overrides; composite score-threshold tiers; outcome targets. | terminal, score-threshold | Safety + scoring |
| §13.4 | 13.4 Multi-Phase Behavioral Health Intake | Crisis terminal override; LOCUS score-threshold LOC; fan-out programs; narrative on combined Determination. | multi-phase, LOCUS | All strategies together |

### §14 Security considerations (Lines 1438-1479)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §14 | 14. Security Considerations | Sensitive data, confidential logic, override safety. | security, audit | Threat-adjacent guidance |
| §14.1 | 14.1 Sensitive Data | Encryption, access control, retention (HIPAA/FERPA/GDPR mentions), protect declined state. | PII, declined | Data handling |
| §14.2 | 14.2 Evaluation Logic Confidentiality | Server-side eval, redacted records, headless API MAY. | blinding, redaction | Hiding rules or scores |
| §14.3 | 14.3 Override Route Safety | Audit terminal overrides, prevent accidental edits/bypass. | terminal, audit | Governance of hard stops |

### Appendix A-B (Lines 1482-1515)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| App A | Appendix A: Migration from Core §4.7 | Six-step mechanical extraction to standalone; embedded `definition.screener` deprecated; SHOULD point core §4.7 refs here. | migration, deprecated | Upgrading authors and tools |
| App B | Appendix B: Relationship to Sidecar Documents | Table: Theme/Component/Mapping inward projection vs Screener outward gateway without binding. | gateway, projection | Architecture comparisons |

### Appendix C: Implementation migration inventory (Lines 1517-2047)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| App C | Appendix C: Implementation Migration Inventory | Repo-wide catalog of embedded §4.7 touchpoints and required changes for standalone screeners. | migration inventory | Planning multi-package refactors |
| C.1 | C.1 Schema Changes | Remove Definition `screener`/`$defs`; sync linter copy; register new schemas; core-commands; types barrel. | definition.schema.json, screener.schema.json | Schema rollout |
| C.2 | C.2 Core Spec Changes | `specs/core/spec.md` §4.7 → deprecation forward-reference text. | core §4.7 | Core spec edit |
| C.3 | C.3 TypeScript Engine Changes | `evaluateScreener`, WASM bridge, generated types, index augmentations → standalone Determination APIs. | formspec-engine | Engine/WASM surface |
| C.4 | C.4 TypeScript Core/Handler Changes | `definition-screener` handlers → `screener.*`; statistics; dependency graph; path rewrite decoupling; types. | formspec-core | Commands and queries |
| C.5 | C.5 TypeScript Studio-Core Changes | `project.ts` helpers and `removeItem` cascade removal. | formspec-studio-core | Authoring API |
| C.6 | C.6 TypeScript Studio UI Changes | `screener/` components, orchestrator, preview, blueprint counts. | formspec-studio | UI migration |
| C.7 | C.7 Rust Crate Changes | `formspec-eval` screener, JSON/WASM/Python/lint/changelog paths. | formspec-eval, formspec-wasm | Rust/WASM migration |
| C.8 | C.8 Python Changes | Bridge, unit tests, conformance, fuzz generators. | formspec-py | Python parity |
| C.9 | C.9 Webcomponent and React Changes | `screener.ts`, element gate, hydrate, public API, React hook/component. | formspec-webcomponent, formspec-react | Front-end integration |
| C.10 | C.10 MCP Tool Changes | `screener.ts` MCP actions → document/phase/lifecycle model. | formspec-mcp | MCP authoring tools |
| C.11 | C.11 Test Migration | Layered test matrix and fixture extraction list (~40 files). | fixtures, E2E | Test plan |
| C.12 | C.12 Migration Phasing | Bottom-up phases 0-7; ~95 files estimate. | phasing | Sequencing work |
| C.13 | C.13 Existing Plans | Archive plan outdated; new plan needed for standalone + phases. | thoughts/archive | Planning docs |

## Cross-References

- **Formspec v1.0 core** -- Items §4.2, Binds §4.3, FEL §3, null propagation §3.4, extensions §4.6, path syntax §4.3.3, embedded screener §4.7 (replaced/deprecated). Referenced throughout §1-§3, §7, §8, §12, Appendix A.
- **BCP 14 / RFC 2119 / RFC 8174** -- Normative keywords (Conventions).
- **RFC 8259** -- JSON (Conventions).
- **RFC 3986** -- URI syntax for `url` and targets (Conventions, §2.1, §7).
- **ISO 8601** -- Dates and durations for availability, timestamps, `resultValidity` (Conventions, §8, §9).
- **Semantic Versioning 2.0.0** -- `version` and `evaluationVersion` (§2.1, §8.2).
- **`schemas/screener.schema.json`** -- Screener Document input (§8 intro, Appendix C.1).
- **`schemas/determination.schema.json`** -- Determination Record output `$id` `https://formspec.org/schemas/determination/1.0` (§8 intro).
- **`schemas/definition.schema.json`** -- Embedded screener removal target (Appendix C.1).
- **`schemas/core-commands.schema.json`** -- `definition.*` screener commands → `screener.*` (Appendix C.1.4).
- **`crates/formspec-lint/schemas/definition.schema.json`** -- Synced copy (Appendix C.1.2).
- **Repository files** -- Appendix C enumerates concrete paths under `packages/`, `crates/`, `tests/`, `examples/`, MCP, Studio, WASM, Python for migration (no third-party specs).

## Quick reference -- conformance rules (SC-01–SC-25)

| Rule | Summary |
|------|---------|
| SC-01 | Preserve distinguishable answer states in Determination Record; declined ≠ null answered |
| SC-02 | Declined item value evaluates as null in FEL |
| SC-03 | Not-presented item value evaluates as null in FEL |
| SC-04 | No new sessions outside availability; SHOULD `outcome:closed` |
| SC-05 | Sessions started in-window MUST be completable if window closes mid-session |
| SC-06 | Expired Determination Records MUST NOT be treated valid |
| SC-07 | `evaluationVersion` reflects rules actually applied |
| SC-08 | `first-match` routes MUST have `condition` |
| SC-09 | `fan-out` routes MUST have `condition` |
| SC-10 | `score-threshold` routes MUST have `score` and `threshold` |
| SC-11 | Null `condition` treated as false |
| SC-12 | Null `score` treated as −∞, reason `null-score` |
| SC-13 | Recognize all top-level properties; reject missing REQUIRED |
| SC-14 | Item keys unique in screener; MAY collide with Definition keys |
| SC-15 | Phase `id` matches `[a-zA-Z][a-zA-Z0-9_-]*` |
| SC-16 | Extension strategies use `x-` prefix |
| SC-17 | Unsupported message interpolation → show raw string |
| SC-18 | Overrides before phases, cross-phase order, all overrides evaluated |
| SC-19 | Named outcomes passed through without interpretation |
| SC-20 | Record extensions via `extensions`; MUST NOT alter normative fields |
| SC-21 | If `resultValidity` set, record MUST include `validity` with `validUntil` |
| SC-22 | Partial records MUST NOT be definitive routing decisions |
| SC-23 | Unsupported `x-` strategy → phase `unsupported-strategy`, no total failure |
| SC-24 | Extension strategies produce matched/eliminated contract like normative |
| SC-25 | Override routes MUST have `condition` |

## Critical behavioral rules

1. **Screener responses are not Definition instance data.** They drive evaluation only and must not be merged into a Definition Response as form fields.

2. **FEL and binds are screener-scoped only.** No Definition items, binds, shapes, or undeclared external state in expressions.

3. **Override routes are hoisted and run before any phase.** They still require a `condition` (SC-25); “override” means phase/strategy cannot skip them, not that they fire without a true condition.

4. **Override evaluation does not short-circuit.** Every override is evaluated; then if any matched override is `terminal`, the phase list does not run (`overrides.halted`, `phases` empty).

5. **Phases are otherwise independent.** Matches in one phase do not block later phases unless a terminal override halted the pipeline.

6. **Null condition → false (SC-11); null score → −∞ / `null-score` (SC-12).** Aligns with declined/not-presented null item values under core null propagation.

7. **Answer states must remain distinguishable in output** even when FEL treats declined and not-presented as null (SC-01–SC-03).

8. **`first-match` stops at first true condition; `fan-out` and `score-threshold` evaluate every route** (subject to strategy config like `maxMatches` / `topN`).

9. **`score-threshold` ranks matched routes by descending score**, ties by declaration order; threshold is inclusive (`>=`).

10. **Availability blocks new sessions when outside window** but must allow in-flight sessions to finish (SC-04/SC-05), with `evaluationBinding` controlling which rule version applies.

11. **No target binding on the document.** Routing targets live on routes; project tooling associates screeners with forms.

12. **Input paths in Determination Records follow core §4.3.3** including indexed repeat paths.

13. **`evaluationVersion` in the record is the applied evaluation logic version**, which may differ from `screener.version` when `evaluationBinding` is `submission` and the document changed mid-session.

14. **Processors that do not implement a normative strategy must reject clearly** (Core conformance) rather than silently mis-route.

15. **Appendix C is non-normative engineering inventory** for the Formspec monorepo; it does not change runtime semantics but lists files to touch for standalone migration.
