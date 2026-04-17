# Phase 11 — Coprocessor backlog closure (questions & assumptions)

> **Canonical design:** [`wos-spec/thoughts/specs/2026-04-11-formspec-wos-phase11-integration-master.md`](../../wos-spec/thoughts/specs/2026-04-11-formspec-wos-phase11-integration-master.md) (§6 coprocessor, §6.10 closed decisions, §7 publication checklist).
> **Execution context:** [`thoughts/plans/2026-04-11-phase11-coprocessor-fel.md`](2026-04-11-phase11-coprocessor-fel.md)

**Date:** 2026-04-11

**Purpose:** Preserve the original coprocessor questions and record their behavior-driven closure so Phase 11 normative landings (Runtime §15, kernel schemas) do not carry hidden assumptions.

**How to use:** Treat §§A-F as the original open-state inventory. Treat §G and §G.1 as the current closure record. Treat §I as the remaining post-landing collateral sync outside the numbered backlog. P11-BL-050 is now closed by publication review; keep its checklist as an authoring discipline.

**Normative targets (repo reality):** Coprocessor protocol prose now lives in `wos-spec/specs/companions/runtime.md` §12.9 / §15. Kernel fields (`responseMappingRef`, `prefillMappingRef`, `completionEvent`, `failureEvent`) now live in `wos-kernel.schema.json`; durable task state (`activeTasks`, `ActiveTask`, `FormspecTaskContext`, `ValidationOutcome`) now lives in `wos-case-instance.schema.json`.

---

## A. Explicit open questions (from integration master §6.10)

| ID | Topic | Question / gap | Suggested next step |
|----|--------|----------------|---------------------|
| **P11-BL-001** | Prefill when `both` unsupported | Same Mapping document vs two URIs (`prefillMappingRef` / `responseMappingRef`) when a host cannot use Mapping **`direction: "both"`**? | Document **deployment profiles** in Runtime or Mapping companion; optional **lint rule** for inconsistent pairs. **Verified (Formspec):** `direction` enum includes **`both`** in `mapping.schema.json` + Mapping spec §3.1 / §3.1.2. **Caveat:** Mapping **Core** processors **MAY** support forward-only (spec §5.1) — “`both` in document” ≠ “full bidirectional host.” |
| **P11-BL-002** | Drafts via processor | Phase 1 keeps drafts **host-local**; no **`persistTaskDraft`** (or equivalent). | Spec **Phase 2** API shape, idempotency, and interaction with **`submitTaskResponse`**; align with VE-05 / save semantics. |
| **P11-BL-003** | Multi-form tasks | One form per task **unless** kernel gains **multi-contract** tasks. | Kernel product decision: stay with **multiple tasks** vs extend **`createTask`** / contract model; update §6.10 narrative when chosen. |
| **P11-BL-004** | Agent submitters | **`assignedActor`** may be agent ids; same validator path — **access control, delegation, audit** language for non-human actors still thin. | Governance / Runtime prose + examples: **actor types**, **delegation**, provenance fields for **agent completion**. |
| **P11-BL-005** | Amended Response | After a completed submit: **new task** vs **reopen** vs other — **provenance / Respondent Ledger** policy **TBD**. | ADR or Governance addendum; tie to **Changelog** / version pins (**VP-01** family). |

---

## B. Phase 1 design locks (assumptions — revisit when extending scope)

| ID | Assumption | Where it lives | Revisit when |
|----|------------|----------------|--------------|
| **P11-BL-010** | **`submitTaskResponse`** accepts only **`status: "completed"`**; other statuses rejected at API boundary. | §6.2, §6.6 step 2 | **P11-BL-002** (drafts); partial save flows. |
| **P11-BL-011** | **No Mapping document** → **host-defined default** mapping (e.g. identity-style path alignment) for Response→case / external transforms; **not** required by Core for a conformant Response. | §6.6 step 7 | First integrator that needs **interoperable** default — consider **minimal normative profile** or required **`responseMappingRef`**. **Precision:** Core **is** normative about Response **`data`** vs Definition (§2.1.6); “not Formspec-normative” applies to **host mapping defaults**, not “anything goes” for `data`. |
| **P11-BL-012** | **`contractHook`** may run **after** coprocessor validation; **SHOULD** be **non-redundant** (disjoint concerns only). | §6.3, §6.6 step 6 | Lint or **kernel** examples showing **valid** split vs **invalid** double-validate. |
| **P11-BL-013** | **Per-task gate** for Formspec validation is **`submitTaskResponse`** (not **`contractHook`** alone). | §4 bias #5, §6.3 | Multi-stage workflows that try to **skip** submit path — document **anti-patterns**. |

---

## C. Publication & schema (decide before or during `wos-spec/` land)

| ID | Item | Open point | Suggested next step |
|----|------|------------|-------------------|
| **P11-BL-020** | **`activeTasks` / `ActiveTask`** on **`wos-case-instance.schema.json`** | Marked **optional** in §7 — MVP may omit. | Decide **v1 required or optional**; if required, define **shape** + **lifecycle** vs task store. |
| **P11-BL-021** | **`FormspecTaskContext`**, **`ValidationOutcome`** as **`$defs`** | Optional §7 — tooling ergonomics. | JSON Schema **`$defs`** + **`x-lm`** if Studio/lint need stable types. |
| **P11-BL-022** | Runtime **§12.9** / **§15** numbering | Current `runtime.md` ends at §12.8 / §14 — **forward-looking** section numbers in master. | Apply checklist §7 in **one editorial pass** (anchors, TOC, cross-links). |

---

## D. Respondent Ledger, impact level, provenance

| ID | Gap | Notes | Suggested next step |
|----|-----|-------|---------------------|
| **P11-BL-030** | **`impactLevel` → ledger obligation** | Rights/safety: **MUST** have ledger / **`submit`** evidence before completion; operational: optional (§6.9). | Normative **taxonomy** (values → obligation); **failure** when evidence missing; link **Respondent Ledger** add-on. |
| **P11-BL-031** | **Informative provenance JSON** (§6.9 example) | Illustrative only — not yet **`$id`’d** schema. | Optional **sidecar schema** or **appendix** in Governance / Runtime. |
| **P11-BL-032** | **Ledger vs notice** (bias #1) | Stated as MUST-not-conflate — **operational tests** still needed. | Example **appeals** narrative in Governance or AI Integration. |

---

## E. Protocol edge cases (not in §6.10 but still open)

| ID | Topic | Gap | Suggested next step |
|----|--------|-----|---------------------|
| **P11-BL-040** | **Task abandonment** | **`stopped`** / host policy **informative**; processor **task state** on abandon unclear. | Runtime: **`dismissTask`** → **task lifecycle** mapping (`claimed`? `cancelled`?); idempotency of **retry**. |
| **P11-BL-041** | **`contractHook` + coprocessor order** | “**Kernel-declared** order” — concrete **ordering rules** for Formspec tasks not written. | **Authoring note:** Normative ordering is the **Runtime completion pipeline** (e.g. `submitTaskResponse`, optional post-pass hooks) plus **`contractHook`** where attached; align **Governance S5** if lifecycle hooks participate. **Not** a new “sixth” kernel seam name — keep **`contractHook`** as the declarative validation seam. Kernel / Lifecycle Detail: **default order** + **override** + one **worked example** (pass + fail paths). |
| **P11-BL-042** | **Optional post-pass pipeline** | §6.6 step 6 / diagram “optional pipeline” — **which hooks**, **failure** semantics if hook fails after Formspec pass. | Align with **Governance S5** sequencing table; define **compensation** or **rollback** stance. |

---

## F. Cross-cutting verification (close when normative text ships)

| ID | Verification | Done when |
|----|--------------|-----------|
| **P11-BL-050** | **Five Formspec integration rules** (companion authoring) hold in **published** Runtime §15 + Kernel — **not** the same as integration master **§6.1 five *protocol questions***. Canonical list: `.claude-plugin/agents/wos-spec-author.md` → **Five Formspec Integration Rules** (additive only; cite never restate; delegate processing; canonical terminology; **Formspec-as-validator**). Optionally also **Formspec Integration Verification Checklist** in that file. | WOS lint / human review of final PR; cite rule names explicitly in review checklist. |
| **P11-BL-051** | **Spec ↔ schema** for Response envelope (`additionalProperties: false` at root, **`data`** open) matches **integrator guidance** in Runtime. **Verified:** `response.schema.json` matches that shape; Core §2.1.6 defers structure to schema; current Core §2.1.6 example includes required **`$formspecResponse`**. | Close the Formspec doc-debt side. Remaining work is WOS Runtime integrator guidance that cites full-envelope validation, root **`additionalProperties: false`**, and open **`data`**. |

---

## G. Behavior-driven closure recommendations (2026-04-11)

These recommendations optimize for the user-visible behaviors in the Phase 11 north star: no limbo tasks, honest validation outcomes, recoverable submissions, and audit trails that match the event history. They intentionally spend more spec work now to avoid parallel host-defined semantics later.

| ID | Recommended closure | Behavior / debt rationale |
|----|---------------------|---------------------------|
| **P11-BL-001** | Define **deployment profiles**. Preferred interoperable profile: both **`prefillMappingRef`** and **`responseMappingRef`** point to the same Mapping document when that document is **`direction: "both"`** and the host claims Mapping Bidirectional. Use **two URIs** only for distinct one-way documents: reverse/prefill and forward/response. If a host cannot execute reverse/bidirectional Mapping, prefill is host-local and non-portable; do not fake it through Mapping Core. | Keeps one source of truth where possible, but avoids implying that Mapping Core can perform reverse population. |
| **P11-BL-002** | Add a separate optional **`persistTaskDraft`** / draft-store operation in Runtime §15 now. It accepts a full Response with **`status: "in-progress"`**, **`"amended"`**, or **`"stopped"`**, is idempotent, and performs **no** case mutation or lifecycle advancement. | Users get save/resume and outage recovery without overloading **`submitTaskResponse`** or weakening the completed-only gate. |
| **P11-BL-003** | Close as **no multi-contract task for v1**. Model packets as multiple coordinated tasks or as one composite Formspec Definition. One WOS task owns one Formspec completion bundle and one Response. | Avoids a second task model while preserving every current user workflow through composition. |
| **P11-BL-004** | Permit agent submitters only as declared **`agent`** actors through **`actorExtension`**. **`actorId`** must match **`assignedActor`** or be authorized through AccessControl/delegation; provenance must record **`actorType: "agent"`**, agent identity, model/version/confidence/source metadata, and any **`principalActorId`** / **`delegationRef`**. Rights/safety respondent submissions still need human or legally delegated authority. Authorization or agent-registration failure rejects with **`taskSubmitterUnauthorized`** / **`agentSubmitterUnauthorized`**, records **`taskResponseRejected`** when policy allows, and does not fail or complete the task. | Supports agent-prepared and agent-submitted internal tasks without letting an agent impersonate a respondent or delegated official; a bad submitter cannot break the assignee's task. |
| **P11-BL-005** | Use a **new amendment task** after a completed submit. Do **not** reopen a terminal completed task. Link the new task/Response to the original through Respondent Ledger **`amendmentRef`** and provenance such as **`supersedesResponseId`** / **`relatedTaskId`**. | Keeps completed tasks immutable and makes appeals/audit timelines easier to reason about. |
| **P11-BL-010** | Keep the lock: **`submitTaskResponse`** accepts only **`status: "completed"`**. Drafts and stops use **`persistTaskDraft`** / abandon semantics. | Maintains one predictable completion gate. |
| **P11-BL-011** | Replace the host-defined default mapping with an explicit portability rule: a WOS processor MUST have **`responseMappingRef`** before it automatically mutates case state from a Formspec Response. If absent, it may store response/provenance and emit **`completionEvent`**, but it must not invent case-field projection. Generate identity Mapping documents with tooling instead of specifying a parallel default. | Prevents silent cross-host data drift and uses the spec's Mapping mechanism instead of a second mapping path. |
| **P11-BL-012** | Keep **`contractHook`** non-redundant. Default order: Formspec envelope/pin/Definition validation, pure Mapping projection to proposed case mutations, optional **`contractHook`** / Governance S5 checks on the completion bundle, then atomic commit. Hooks must not repeat Formspec Definition validation. | Gives hooks the case-level view they need while preventing duplicate validators and post-commit rollback problems. |
| **P11-BL-013** | Keep **`submitTaskResponse`** as the per-task gate. Document “case advances from contractHook alone” as an anti-pattern for Formspec-bound tasks. | Prevents surprise advancement from a side pipeline that never validated the full Response envelope. |
| **P11-BL-020** | Make durable active task state part of v1. Add **`activeTasks`** to CaseInstance as a required array, empty when none, covering nonterminal task states. Terminal task history stays in provenance. If a host uses an external task store, CaseInstance still needs stable task references sufficient to resume. | A running task is runtime state. Crash recovery and honest UI state require it to be serialized or referenced. |
| **P11-BL-021** | Add JSON Schema **`$defs`** for **`ActiveTask`**, **`FormspecTaskContext`**, and **`ValidationOutcome`**, with **`x-lm.critical`** where these are used by Runtime §15 or Studio/lint tooling. | Stable shapes reduce implementation drift and make conformance fixtures straightforward. |
| **P11-BL-022** | Land the Runtime structure first: add §12.9 **TaskPresenter**, add §15 **Formspec Coprocessor**, update §2.2, TOC, anchors, and cross-links in one editorial PR. | Reduces citation churn before adding deeper behavior prose and schema fields. |
| **P11-BL-030** | Define the ledger obligation by impact level: **rights-impacting** and **safety-impacting** respondent Formspec tasks MUST include Respondent Ledger evidence before completion; **operational** respondent tasks SHOULD; **informational** MAY. Missing high-impact evidence rejects completion with **`ledgerEvidenceMissing`** and no case mutation. | High-impact users need proof of what happened at submit time; low-impact flows should not pay that cost by default. |
| **P11-BL-031** | Do not create a standalone provenance sidecar in Phase 11. Define named Facts-tier record payloads in Runtime §15 for **`taskPresented`**, **`taskDismissed`**, **`taskDraftPersisted`**, **`taskResponseRejected`**, **`taskResponseSubmitted`**, **`contractValidation`**, **`dataMapping`**, **`taskCompleted`**, **`taskFailed`**, and **`taskSkipped`**; keep the JSON example informative. | Reuses WOS provenance instead of adding a second audit artifact while still giving implementers stable event names. |
| **P11-BL-032** | Make ledger vs notice explicit: Respondent Ledger proves respondent-side Response history; WOS Notification Template / Correspondence Metadata / Facts-tier provenance prove legal notice delivery. The ledger may reference a notice record, but that reference does not satisfy notice by itself. | Avoids conflating “who submitted what” with “what the agency mailed or served.” |
| **P11-BL-040** | Define **`dismissTask`** as UI close only: **`taskDismissed`** provenance, no lifecycle transition, task remains resumable. Define explicit abandonment separately: **`abandonTask`** or **`persistTaskDraft`** with Response **`status: "stopped"`**. Default task transition is **`claimed -> failed`** with **`taskFailed`** provenance and **`failureEvent`** when configured. If the workflow explicitly maps the rationale to **`skipped`**, the task transitions to **`skipped`**, records **`taskSkipped`** with structured rationale, emits no **`completionEvent`** or **`failureEvent`**, and is removed from **`activeTasks`**. | Closing a browser tab should not fail a task; deliberate abandonment should not leave it in limbo; not-applicable skips should not look like validation failures. |
| **P11-BL-041** | Use one default completion pipeline and no new seam: check a durable actor-scoped replay store before `activeTasks`, preserve replay outcomes beyond terminal task removal for the retry window, resolve the active task, authorize actor, reject unauthorized submitters without terminal lifecycle effects, validate full Response, compute Mapping projection without commit, run optional hooks on the completion bundle, then atomically commit case mutation + task completion + event. Overrides must be explicit pipeline stages. | Gives deterministic ordering while keeping **`contractHook`** as the only declarative validation seam. |
| **P11-BL-042** | If an optional post-pass hook fails, the processor records rejection provenance, leaves case state unchanged, marks the task **`failed`**, and applies Governance S8 remediation. Side-effecting work belongs after commit as normal kernel actions or in compensable scopes, not in the precommit post-pass. | Eliminates rollback ambiguity by making the post-pass precommit and pure. |
| **P11-BL-050** | Close through a publication review checklist, not new normative prose. The review must cite the five rule names and verify Runtime §15 / Kernel schema changes are additive, delegated, and terminology-safe. | Keeps the integration rules as authoring discipline without bloating the spec. |
| **P11-BL-051** | Close the Formspec side. Current Core §2.1.6 example includes required **`$formspecResponse`**; keep WOS guidance aligned to **full envelope validation**, root **`additionalProperties: false`**, and open **`data`**. | The earlier example gap is no longer present in the current spec; the remaining work is WOS integrator wording. |

### G.1 Closure status after WOS landing

The behavior questions are now closed for purposes of continuing the Phase 11 integration master. The WOS landing slice carries the decisions into Runtime §12.9 / §15, Kernel §9.2 / §11.3, `wos-kernel.schema.json`, `wos-case-instance.schema.json`, and the typed Rust model.

| Status | Items | Closure note |
|--------|-------|--------------|
| Closed in WOS normative slice | **P11-BL-001**–**005**, **P11-BL-010**–**013**, **P11-BL-020**–**022**, **P11-BL-030**–**032**, **P11-BL-040**–**042**, **P11-BL-051** | Proceed with `wos-spec/thoughts/specs/2026-04-11-formspec-wos-phase11-integration-master.md` using Runtime §15 as the source of truth for the coprocessor protocol. |
| Closed by publication review | **P11-BL-050** | Closed after semi-formal review verified the landed prose stayed additive, delegated to Formspec, terminology-safe, and consistent on terminal/replay behavior. |

---

## H. Multi-agent resolutions & recommendations (2026-04-11)

Cross-check: **spec-expert** (Formspec `specs/` + `schemas/`), **formspec-scout** (layer stack + `wos-spec/` vs `thoughts/`), **wos-spec-author** (WOS norms + five integration rules). Use this section to close or narrow items without duplicating full agent transcripts.

| Topic | Resolution / recommendation |
|-------|----------------------------|
| **§6.10 ↔ backlog IDs** | **P11-BL-001**–**005** match integration master §6.10 **in order** — no ID drift. |
| **Primary owners (thin in A/D)** | **P11-BL-004** / **005** / **030**–**032:** pick **one** normative home each (Governance vs Runtime vs Kernel) when closing; split prose is OK if a single “source of truth” section is cited. |
| **Publication order** | Superseded by §G.1 landing status. Runtime §12.9 / §15, Kernel prose, schemas, and the typed Rust model now carry the behavior decisions; Runtime §12.3 intentionally remains the existing `ContractValidator` data-bag seam. |
| **Schema + prose same PR** | §7 kernel extensions (`responseMappingRef`, …), **P11-BL-020** / **021**, **P11-BL-040**–**042** (if schema knobs appear): ship **JSON Schema + spec** together. **P11-BL-051:** joint **WOS Runtime** integrator text + **Formspec** `response.schema.json` / Core §2.1.6 consistency check. |
| **FEL vs WOS doc sequencing** | `wos-spec/TODO.md` Gap ordering may prioritize Formspec/FEL in monorepo; **WOS** normative landings still benefit from **P11-BL-022** + kernel fields **leading** to limit citation churn. |
| **Prior baseline before §G** | Earlier agent passes treated **P11-BL-002**–**010**, **012**–**013**, **020**–**022**, **030**–**032**, **040**, and **042** as still open or accurate as written. §G supersedes that baseline with behavior-driven closure recommendations where it is more specific. |

---

## I. Post-landing collateral sync (outside the numbered backlog)

The numbered Phase 11 backlog is closed. The remaining work is publication sync: several WOS collateral documents still describe the coprocessor as missing even though Runtime §12.9 / §15, the kernel schema, the case-instance schema, and the typed Rust model are now landed. Treat these as **follow-up documentation debt**, not reopened design questions.

| Surface | Stale claim now in repo | Needed update |
|---------|-------------------------|---------------|
| `wos-spec/README.md` | Says the Formspec Coprocessor handoff protocol does not exist and lists Runtime S15 + FEL-RECORDS as missing. | Rewrite the “Critical gap” and “What does not exist” sections to say the coprocessor protocol and FEL-RECORDS semantics are landed. Keep the remaining gaps limited to implementation, conformance expansion, engine bindings, and deployment work. |
| `wos-spec/WOS-FEATURE-MATRIX.md` | Marks **Formspec Coprocessor** as ⚪ “not yet specified” and lists it under “Future.” | Reclassify it as spec-complete / needs implementation, summarize Runtime §15 + kernel/schema landing, and remove it from the future-spec bucket. |
| `wos-spec/enterprise-feature-gaps.md` | Still calls the coprocessor the critical remaining architecture gap and says the handoff is not yet specified. | Update Section 5 so the gap is SaaS implementation + UI + engine work, not coprocessor design. RFI/amendment rows should now cite the landed Runtime §15 path instead of future protocol work. |
| `wos-spec/enterprise-implementation-roadmap.md` | Still says Phase 1.3 is blocked until the coprocessor is written. | Change the dependency language from “spec must be written” to “Runtime §15 / kernel schemas must be implemented.” Keep the real blockers focused on platform build work. |
| `wos-spec/TODO.md` | Phase 11 still has an unchecked “Author Runtime Companion S15” item with schema deliverables marked TODO. | Mark the coprocessor authoring slice done, preserve any residual follow-up as implementation or collateral-sync tasks, and keep the historical checklist only as context. |

**Why this matters:** external readers will trust `README.md`, the feature matrix, and roadmap pages before they read Runtime §15. Leaving those documents stale reopens ambiguity the spec landing just removed.

**Tracking note:** active follow-up tasks now live in `wos-spec/TODO.md` under the Phase 11 coprocessor section. Keep this section as historical context, not as the live queue.

**Exit criterion for this section:** once the collateral surfaces above are aligned, this file becomes a historical closure ledger only. New work should open under implementation planning, not under the Phase 11 coprocessor backlog.

---

## Summary counts

| Bucket | Items |
|--------|-------|
| §6.10 explicit | 5 (**P11-BL-001**–**005**) |
| Phase 1 assumptions | 4 (**P11-BL-010**–**013**) |
| Publication / schema | 3 (**P11-BL-020**–**022**) |
| Ledger / impact / provenance | 3 (**P11-BL-030**–**032**) |
| Protocol edge cases | 3 (**P11-BL-040**–**042**) |
| Cross-cutting | 2 (**P11-BL-050**–**051**) |
| **Total** | **20** (§G / §H are meta — not numbered backlog items) |

`§I` is intentionally unnumbered. It captures post-landing collateral sync, not reopened backlog items.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-11 | Initial backlog from integration master §6.10 + Phase 1 locks + publication + ledger + edge cases + review follow-ups. |
| 2026-04-11 | Original **§G** agent-synthesis section added, now **§H** after the behavior-driven closure matrix: spec-expert / scout / wos-spec-author verification (P11-BL-001, 011, 041, 050, 051); repo reality blurb; publication order; P11-BL-050 disambiguation vs §6.1. |
| 2026-04-11 | Added behavior-driven closure matrix: explicit mapping profiles, separate draft persistence, no multi-contract v1 task, durable active task state, high-impact ledger gate, deterministic completion pipeline, and stale P11-BL-051 doc-debt cleanup. |
| 2026-04-11 | Added WOS landing closure status: all behavior assumptions are closed for the integration master; P11-BL-050 was still a final publication-review gate at that point. |
| 2026-04-11 | Closed P11-BL-050 after semi-formal review; added non-terminal submitter rejection provenance and durable actor-scoped replay semantics before `activeTasks` lookup. |
| 2026-04-11 | Added post-landing collateral-sync section: WOS README, feature matrix, enterprise gap docs, roadmap, and TODO still contain pre-landing coprocessor language and should be updated without reopening the numbered backlog. |
| 2026-04-11 | Sunsetted the backlog as a live queue: new follow-up tasks now live in `wos-spec/TODO.md` under the Phase 11 coprocessor section. |
