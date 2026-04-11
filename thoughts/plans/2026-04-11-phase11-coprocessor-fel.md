# Phase 11: Formspec coprocessor + FEL gaps — execution plan

> **Merged index:** [`thoughts/specs/2026-04-11-formspec-wos-phase11-integration-master.md`](../specs/2026-04-11-formspec-wos-phase11-integration-master.md) — north star, gaps, S15 draft, checklist in one place (2026-04-11).

**Date:** 2026-04-11  
**Last updated:** 2026-04-11 (execution sync)  
**Status:** In progress — **FEL-QUANTIFIERS** + **Core FEL-RECORDS slice** (normative predicate / `$.field` on object elements) shipped in Formspec; **WOS example pass** + **constraint-`$` edge cases** + **COPROCESSOR (S15)** still open.  
**Sources:** `wos-spec/TODO.md` Phase 11; subagent briefs (spec-expert + formspec-scout personas); `thoughts/specs/2026-04-10-formspec-integration-gaps.md`

---

## 1. North star: user outcomes (read this first)

Phase 11 is not “close gaps between documents.” It is **make multi-document workflows trustworthy for the people inside them.**

**Primary outcome:** A respondent or caseworker can **complete a form-backed task**, know **whether the system accepted it**, recover from **errors and outages** without losing work or duplicating submissions, and leave an **auditable trail** that matches what actually happened. An integrator can **implement once** from normative text and get **the same behavior** in browser, server, and review tools.

**How we choose among options:** Favor the version that **reduces limbo** (stuck tasks), **ambiguity** (“did it validate?”), and **runtime mismatch** (different answers in different tiers). Deprioritize choices that only minimize spec diff or preserve legacy example syntax if they leave authors or end users worse off.

### 1.1 Who must be served (concrete stakes)

| Who | What they need from this work |
|-----|-------------------------------|
| **Respondent / applicant** | Submit once, see honest success or failure, retry without phantom “done,” survive network/backend outages. |
| **Caseworker / assignee** | Task state matches reality; invalid work is **rejectable and fixable**, not frozen in **claimed**. |
| **Auditor / appeals** | Distinguish **identity of response** (ledger) from **notice compliance** (mailing); validate **which form version** was bound, not a loose JSON blob. |
| **Integrator / host** | Single protocol for task context → render → `submitTaskResponse` → validate → map; **no reinvented** semantics per vendor. |

### 1.2 The three workstreams — user pain vs preferred direction

**FEL-QUANTIFIERS (`every`, `some`, `duration`)**  
Authors and WOS examples assumed these existed before Core did — that caused **warnings, missing symbols, or ad hoc rewrites**. **Shipped:** first-class Formspec builtins with one Rust catalog, schema entries, and matching behavior in WASM / Python / engine. **Lower value (avoided):** WOS-only extensions that stay **out** of the verifiable subset integrators care about.

**FEL-RECORDS (lists of records, `$` in quantifiers)**  
People think in **rows**: “every line item passes this rule.” String predicates over records are **hard to lint, hard to read, and easy to get wrong**. **Shipped in Core §3.5.1:** second argument is always a **FEL expression**; `$` is rebound per element; when the element is an **object**, **`$.property`** uses normal postfix rules (runtime already behaved this way; now normative + tested). **Still open:** ~~rewrite **WOS** samples that used string predicates~~ (verified clean under `wos-spec/`); **ADR-0060** records **constraint `$` vs predicate `$`** nesting for object-valued fields. **Rejected for Core:** `every(list, 'opaque string')` as normative FEL.

**COPROCESSOR (S15 + kernel/runtime seams)**  
Without a normative handoff, **every deployment invents** validation gates, failure states, and mapping—users see **incompatible “conformant” processors**. **Highest value:** **one protocol** with **explicit invalid path**, **idempotent submit**, and **full Response** validation so **wrong-version or partial payloads** cannot masquerade as success.

### 1.3 Eight review items — decision bias (coprocessor design)

These are **product decisions**, not editorial nits. When prose conflicts (e.g. validation failure leaves task **claimed** vs TODO’s **failed**), **resolve toward the row below**.

| # | Decision bias (why) |
|---|---------------------|
| **1** | **Separate** Respondent Ledger and notice delivery—appeals need “who submitted,” compliance needs “what was mailed”; conflating them **confuses investigations**. |
| **2** | **Validate the full Response envelope** (or a explicitly documented superset of `data` that pins definition + status)—**`data` alone** lets **wrong form/version** slip through as “valid.” |
| **3** | **Failed validation → visible recoverable state + resubmit**—**claimed** limbo **wastes caseworker time** and **erodes trust** (“I clicked submit, nothing happened”). |
| **4** | **`contractRef` on `createTask` + formal `ContractReference`**—**support lines and UIs** need a **stable** “this task = this contract” pointer. |
| **5** | **One predictable validation trigger** before case state advances—**surprise gates** create **false confidence** (“it saved to the case” when it didn’t). |
| **6** | **`direction: "both"`** for prefill—**fewer wrong-empty forms** and **fewer silent round-trip bugs**; already mapping-spec-aligned. |
| **7** | **Offline-tolerant client + idempotent server** for `submitTaskResponse`—**outages must not equal data loss** or **double-submit anxiety**. |
| **8** | **`actorId` checked against `assignedActor`** (delegation spelled out)—**accountability** on **rights-impacting** flows; weak binding **invites repudiation**. |

### 1.4 Spec ↔ schema / multi-runtime drift (`timeDiff`, aggregates, §3.5 vs §1.4.1)

**User-visible failure mode:** same expression **passes in one tool and fails in another**, or **different numeric results**. That is **worse than a strict spec** because **nobody knows which environment is “right.”**  

**Bias:** **align spec, schema, and all runtimes** on one behavior; if “subset processors” remain, **one honest capability story** (not two mandatory-sounding paragraphs). Fixing this is **foundational trust**, not polish.

**Update:** `timeDiff` in `schemas/fel-functions.schema.json` was aligned with Core §3.5.4 (**two** time args, **signed seconds**). `duration()` is documented as **milliseconds** and distinct from `timeDiff`. **`fel-functions.schema.json` function names** are contract-tested ⊆ **`BUILTIN_NAMES`** (`test_fel_functions_schema_names_are_builtin`). The JSON catalog now includes **`sumWhere`**, **`avgWhere`**, **`minWhere`**, **`maxWhere`**, **`moneySumWhere`**, **`locale`**, **`runtimeMeta`**, and **`pluralCategory`** (with a **`locale`** category enum on `FunctionEntry`).

### 1.5 Sequencing tied to user value

Technical order stays **functions → record semantics → coprocessor prose** because **authors cannot write reliable examples** until builtins and list semantics exist; **integrators cannot implement S15** credibly until those expressions are stable. **User value** is front-loaded by **unblocking honest evaluation** (FEL) before **unblocking honest submission** (coprocessor).

---

## 2. Sequencing (from TODO)

Gap 2 → Gap 3 → Gap 1: **functions first**, then calling convention / record semantics, then coprocessor normative prose and examples. (See §1.5.)

1. **FEL-QUANTIFIERS** — ~~`every`, `some`, `duration` as Core S3.5-style builtins~~ **Done** (fel-core, schema, Python/WASM, wos-lint AG-012 narrowed).
2. **FEL-RECORDS** — ~~Core: expression predicates + object `$.field`~~ **Done** (§3.5.1 prose + tests). **Remaining:** WOS checklist only. ~~optional bind-`$` ADR~~ **Done** ([ADR-0060](../adr/0060-fel-constraint-self-dollar-nesting.md)).
3. **COPROCESSOR** — Runtime Companion S15 + schemas + eight review items (below). **Not started** in this plan’s execution thread.

### 2.1 Shipped inventory (Formspec repo)

| Area | What landed |
|------|-------------|
| **Core spec** | §3.5.1: `every`, `some`, `duration`; paragraph on predicate expressions, non-string predicates, object elements + `$.field`; §3.5.4: `duration` vs `timeDiff`. |
| **Schema** | `fel-functions.schema.json`: full builtin set aligned with Rust catalog (incl. `*Where`, `moneySumWhere`, `locale`, `runtimeMeta`, `pluralCategory`, `every`, `some`, `duration`); `timeDiff` two-arg signed seconds. |
| **Rust** | `crates/fel-core`: `iso_duration`, `evaluator` dispatch, `extensions` catalog, `dependencies` (`every`\|`some` with `countWhere`), tests. |
| **Python** | Via `formspec-py` / `BUILTIN_NAMES`; `tests/unit/test_fel_functions.py`, `test_fel_api.py`; conformance `test_fel_functions_schema_names_are_builtin`. |
| **Engine** | `packages/formspec-engine/tests/fel-repeat-navigation-semantics.test.mjs` (quantifiers + `duration` + object predicates). |
| **WOS lint** | `wos-spec/crates/wos-lint`: AG-012 only on non–two-arg `every`/`some`; `tier2_rules.rs` tests updated. |
| **WOS tracking** | `wos-spec/README.md`, `wos-spec/TODO.md` Phase 11; Phase 4 AG-012 history note; `LINT-MATRIX.md` AG-012 row + FEL AST summary. |
| **WOS specs** | `wos-spec/specs/ai/ai-integration.md` §4.8 obligation example: string predicate → `every(..., $.sourceReference != null)` + Core §3.5.1 cite. |

**Rebuild note:** Python `BUILTIN_NAMES` reads the Rust catalog at import time — use `maturin develop` / `make build` so `src/formspec/_native*.so` matches `fel-core` (stale `.so` caused a transient `docs:check` failure until rebuild).

## 3. Spec-expert synthesis (normative / structural)

- **`every` / `some` / `duration`:** **Resolved** in Core §3.5.1 / §3.5.4 and `fel-functions.schema.json`.
- **`timeDiff`:** **Resolved** — schema now matches Core (two args, signed seconds). `duration` documented separately (ms).
- **`$` in quantifier predicates:** **Resolved** in §3.5.1 — rebound `$` may be an object; `$.field` is postfix on the element (consistent with evaluator behavior and §3.6 access rules).
- **Response:** `response.schema.json` requires top-level **`data`**; optional **`validationResults`**. Coprocessor design: **`validateFormspecTaskResponse`** + full envelope (`thoughts/specs/2026-04-11-wos-s15-formspec-coprocessor-proposal.md`); integration gaps §1.2.2–1.2.3 updated accordingly (**finding #2** closed at design level — **normative `runtime.md` land** still open).
- **Mapping `direction`:** Spec + `mapping.schema.json` agree on **`forward` | `reverse` | `both`** — finding #6 is spec-correct.

## 4. Formspec-scout synthesis (implementation)

- **Root domino:** ~~Implement builtins in **`fel-core`** + schema + WASM/Python/engine tests~~ **Done** (see §2.1). Evaluation stays in Rust; TS engine remains a WASM bridge.
- **WOS lint:** **AG-012** updated: standard two-arg `every`/`some` no longer warned; non–two-arg arity still warned. **`wos-spec/crates/wos-lint`** + **`tests/tier2_rules.rs`** aligned.
- **Tests added/updated:** `crates/fel-core/tests/evaluator_tests.rs` (incl. object-element predicates, `iso_duration`); `tests/unit/test_fel_functions.py`, `test_fel_api.py`; `tests/conformance/spec/test_cross_spec_contracts.py` (schema ⊆ builtins); `packages/formspec-engine/tests/fel-repeat-navigation-semantics.test.mjs`.

## 5. COPROCESSOR — eight review items (from `wos-spec/TODO.md`)

Cross-check against `thoughts/specs/2026-04-10-formspec-integration-gaps.md` when drafting S15. **Behavioral bias for each item is in §1.3.**

1. Separate **Respondent Ledger** from adverse-decision **notice** delivery.  
2. **`ContractValidator` input:** **Resolved in design** — full **Response** + pin via **`validateFormspecTaskResponse`** (S15 proposal + integration gaps §1.2.3).  
3. **Rejection policy** + failed validation → **`failed`** — **resolved** in integration gaps §1.2.3 + lifecycle diagram + S15 proposal §15.6.  
4. **`contractRef` on Kernel S9.2 `createTask`** + **`ContractReference`** definition.  
5. **Triggering** for coprocessor validation: governance-level vs per-task.  
6. Prefill mapping: **`direction: "both"`**.  
7. Formspec processor **unavailable** during `submitTaskResponse`.  
8. **`actorId`** vs **`assignedActor`** authentication.

**Deliverables (Phase 11 tail):** S15 prose, `FormspecTaskContext`, `submitTaskResponse`, TaskPresenter / S12.9 hooks, `responseMappingRef` on contract (see design spec §1.2).

## 6. Next actions (immediate)

1. ~~**Spec draft:** §3.5 for `every`, `some`, `duration`; relation to `timeDiff`; predicate / object-`$` paragraph. `docs:generate` / `docs:check`.~~  
2. ~~**Schema:** `fel-functions.schema.json` + `timeDiff` aligned with Core.~~  
3. ~~**Rust / Python / engine:** `fel-core`, `dependencies`, wos-lint AG-012, parity tests.~~  
4. ~~**Contracts:** `test_fel_functions_schema_names_are_builtin` (schema ⊆ `BUILTIN_NAMES`).~~  
5. **FEL-RECORDS (tail):** ~~Grep WOS for string-predicate `every`/`some`~~ (done: `ai-integration.md` + repo-wide `wos-spec` grep clean). ~~Optional **ADR** for **constraint** bind `$`~~ **Done** — [ADR-0060](../adr/0060-fel-constraint-self-dollar-nesting.md). ~~Optional: extend **`fel-functions.schema.json`**~~ **Done**.  
6. **COPROCESSOR:** **Concrete S15 outline** — [`thoughts/specs/2026-04-11-wos-s15-formspec-coprocessor-proposal.md`](../specs/2026-04-11-wos-s15-formspec-coprocessor-proposal.md) (spec-expert + wos-spec-author synthesis). **Next:** land prose in `wos-spec/specs/companions/runtime.md` §15 + kernel/case schemas; apply §1.3 review biases (validator input, `failed` not limbo, idempotency, ledger vs notice).

## 7. Subagent transcripts

- Spec-style research: agent `2d01fb76-1d09-49ed-b0d9-ae8085557f31` (explore, spec-expert prompt).  
- Code/stack research: agent `baa21301-e621-43f2-8c9a-6006198d1c02` (explore, formspec-scout prompt).

## 8. Note on Task tool

Cursor **Task** does not register `.claude-plugin/agents/spec-expert` / `formspec-scout` as `subagent_type` values. Equivalent: **explore** (readonly) or **generalPurpose** tasks with the agent markdown pasted into the prompt (as done here).
