# Phase 1: Blind User Testing — Compiled Findings

**Date:** 2026-04-07

## Summary Table

| Persona | Form Type | Complexity | Fields | Tool Calls | Bugs Found | Schema Errors | Overall |
|---------|-----------|-----------|--------|------------|------------|---------------|---------|
| Priya Sharma (beginner/haiku) | Volunteer signup | Low | 7 | ~26 | 0 | 1 (def) | Completed |
| Marcus Chen (intermediate/sonnet) | Employee onboarding | High | 21 | ~35 | 2 | 0 | Completed |
| Zoe Blackwell (intermediate/sonnet) | Conference registration | Medium | 9 | ~35 | 3 | 4 (1 def + 3 comp) | Completed |
| David Okonkwo (advanced/sonnet) | Quarterly financial report | High | 11 | ~35 | 4 | 3 (1 def + 2 comp) | Completed |
| Sam Reeves (expert/opus) | Longitudinal research survey | Very High | 34 | ~35 | 4 | 2 (1 def + 1 comp) | Completed |

All 5 personas completed their forms. No one abandoned. David forgot to save (nothing prompted him); he saved when asked.

## Post-hoc Validation

Each saved form was validated with `python3 -m formspec.validate <dir>/ --registry registries/formspec-common.registry.json`.

| Form | Definition | Theme | Component | FEL Parsing | Total Errors |
|------|-----------|-------|-----------|-------------|-------------|
| volunteer-form-published (Priya) | **1 error** — missing `status` | Clean | Clean | 3 exprs, 0 unresolved | **1** |
| employee-onboarding (Marcus) | **Clean** | Clean | **Clean** | 9 exprs, 0 unresolved | **0** |
| techconf-2025 (Zoe) | **1 error** — missing `status` | Clean | **3 errors** — unevaluated `widgetHint`, stray `bind`, unknown type `Checkbox` | 4 exprs, 0 unresolved | **4** |
| quarterly-report (David) | **1 error** — missing `status` | Clean | **2 errors** — unevaluated `widgetHint`, unevaluated repeat props (`addLabel`, `displayMode`, `removeLabel`, `repeatable`) | 11 exprs, 0 unresolved | **3** |
| longitudinal-health-survey (Sam) | **1 error** — missing `status` | Clean | **1 error** — unevaluated `widgetHint` | 13 exprs, 0 unresolved | **2** |

**Key finding:** Only 1 of 5 forms passes schema validation. The MCP authoring pipeline systematically produces invalid artifacts. Themes and FEL expressions are consistently clean; the problems are in definition metadata and component tree generation.

---

## Deduplicated Issue List

### BUGS — Confirmed by Persona Testing

#### BUG-1: `parentPath` prop doubles the path prefix (HIGH — 3 personas)
- **Hit by:** Marcus, Zoe, Sam
- **Reproduction:** Call `formspec_group` (or `formspec_content`) with `path: "parent.child"` AND `props.parentPath: "parent"`. The system concatenates both, producing `"parent.parent"` and erroring with `"Parent path not found: parent.parent"`.
- **Sam's variant:** The group is created in a half-initialized state (no repeat config) despite returning an error — worst of both worlds.
- **Expected:** Either ignore `parentPath` when path uses dot notation, or warn that they conflict.
- **Verbatim (Marcus):** *"The system was combining the path prefix with parentPath and doubling it. This is confusing because the tool description says parentPath is a 'convenience alias' but doesn't warn that it conflicts with dot-notation paths."*
- **Verbatim (Sam):** *"Three different ways to specify parent context is confusing. Would have helped to have one canonical approach documented clearly."*

#### BUG-2: Date comparison with `today()` always fails in validation (HIGH — 2 personas)
- **Hit by:** Marcus, Sam
- **Reproduction:** Add a shape rule like `$field >= today()`. Run `preview(mode="validate")` with a clearly future date (e.g., `"2026-12-25"`). Validation reports failure even though the date is months in the future.
- **Expected:** Future dates should pass `>= today()` comparisons.
- **Verbatim (Marcus):** *"Hypothesis: date strings in the response payload are not being coerced to date type before the FEL comparison."*
- **Verbatim (Sam):** *"The engine timestamp shows `2026-04-07T21:20:15.999Z`, so it knows the correct date. Either `today()` returns an unexpected value or date `>` comparison doesn't work correctly."*

#### BUG-3: Money type comparison `> 0` silently broken (MEDIUM — 1 persona)
- **Hit by:** David
- **Reproduction:** Add a money field, add shape rule `$revenue > 0`, validate with positive money value `{"amount": 150000, "currency": "USD"}`. Validation fires incorrectly.
- **Expected:** `$revenue > 0` should compare the money amount to 0.
- **Workaround:** Use `moneyAmount($revenue) > 0`.
- **Why critical:** `formspec_fel(check)` says the expression is valid — no type warning. Silent wrong results at runtime.
- **Verbatim (David):** *"A type-aware linter should warn: 'Comparing money to integer — did you mean `moneyAmount($revenue) > 0`?'"*

#### BUG-4: Conditional required on calculated fields doesn't evaluate against calculated value (MEDIUM — 1 persona)
- **Hit by:** David
- **Reproduction:** Set `net_income` as calculated (`$revenue - $expenses`). Add `behavior(require, target="loss_explanation", condition="$net_income < 0")`. Preview correctly shows net_income as negative, but `loss_explanation` is NOT in `requiredFields`.
- **Workaround:** Inline the full calculation: `moneyAmount($revenue) - moneyAmount($expenses) < 0`.
- **Verbatim (David):** *"This is a silent contract violation — the bind says one thing, the runtime does another."*

#### BUG-5: Shape rules targeting repeat group fields don't evaluate per-row (MEDIUM — 1 persona)
- **Hit by:** David
- **Reproduction:** Add a shape rule targeting `line_items.description` with rule `length(trim($line_items.description)) > 0`. Submit with non-blank descriptions. Rule fires on ALL rows.
- **Expected:** Shape rules should evaluate per repeat instance.
- **Verbatim (David):** *"No reliable per-row validation is possible via shape rules."*

#### BUG-6: Required validation fires on repeat group template fields with zero instances (MEDIUM — 1 persona)
- **Hit by:** Sam
- **Reproduction:** Create repeatable group with `minRepeat: 0`, add required field inside, validate with zero instances. Validation reports `REQUIRED` on the template path.
- **Expected:** With min 0 and no instances, template fields should not fire.
- **Verbatim (Sam):** *"In XForms/ODK, `required` only applies to actual repeat instances, not the empty state."*

#### BUG-7: `remove_rule` silently removes only one of multiple rules for a field (LOW — 1 persona)
- **Hit by:** David
- **Reproduction:** Add two shape rules targeting same field path. Call `behavior(remove_rule, target=path)`. One rule removed silently; the other remains active.
- **Expected:** Either accept a shapeId, list rules when ambiguous, or error.
- **Verbatim (David):** *"Stale broken rules remain in the form invisibly."*

#### BUG-8: `sample_data` mode ignores `scenario` parameter (LOW — 1 persona)
- **Hit by:** Marcus
- **Reproduction:** Call `preview(mode="sample_data", scenario={"field": "value"})`. Returned sample data ignores the scenario values.
- **Expected:** Scenario values should be locked; remaining fields generated around them.

#### BUG-9: Cross-document audit shows component bind mismatches for every field (LOW — 1 persona)
- **Hit by:** Sam
- **Reproduction:** Build form with dotted paths, run `audit(action="cross_document")`. All component nodes warn about "nonexistent item" using leaf key instead of full path.
- **Expected:** Auto-generated component nodes should reference items by full qualified path.

#### BUG-10: Content items created via `formspec_content` not findable by `formspec_place` (LOW — 1 persona)
- **Hit by:** Zoe
- **Reproduction:** Add content via `formspec_content`, try to `formspec_place` that item. Error: "Source node not found". Items exist in audit output but can't be referenced by `formspec_place`.

#### BUG-11: `formspec_describe` drops `groupPath` from first page (LOW — 1 persona)
- **Hit by:** Zoe
- **Reproduction:** Build multi-page form. First page loses its `groupPath` in describe output while other pages retain theirs.

---

### BUGS — Confirmed by Post-hoc Schema Validation

#### BUG-12: `formspec_save`/`formspec_publish` omits required `status` field from definition (HIGH — 4 of 5 forms)
- **Hit by:** Priya, Zoe, David, Sam (all except Marcus)
- **Validation error:** `E101 $: "status" is a required property`
- **Root cause:** The MCP save/publish pipeline doesn't emit the `status` field that the definition schema requires. Marcus's form passed — unclear what he did differently (possibly `formspec_publish` vs `formspec_save` behavior differs, or a race condition).
- **Impact:** Every saved form fails schema validation out of the box.

#### BUG-13: Component tree emits unknown `Checkbox` component type (MEDIUM — 1 form)
- **Hit by:** Zoe (techconf-2025)
- **Validation error:** `E801 $.tree.children[2].children[0].children[2]: Unknown component type: 'Checkbox'`
- **Expected:** Should be `CheckboxInput` or `Toggle` — `Checkbox` is not a valid component type in the component schema.
- **Root cause:** Component auto-generation picks `Checkbox` for boolean fields with agreement semantics, but the component spec doesn't define a `Checkbox` type.

#### BUG-14: Component tree emits unevaluated `widgetHint` on component nodes (HIGH — 3 of 5 forms)
- **Hit by:** Zoe, David, Sam
- **Validation error:** `E101 $.tree.children[N]: Unevaluated properties are not allowed ('widgetHint' was unexpected)`
- **Root cause:** When the MCP tools apply a widget override (e.g., `RadioGroup`, `Textarea`), the component tree generator emits a `widgetHint` property on the component node. The component schema uses `unevaluatedProperties: false` and doesn't declare `widgetHint`.
- **Impact:** Any form using widget overrides produces an invalid component tree. This is the most broadly-hitting schema violation.

#### BUG-15: Component tree emits stray `bind` property on component node (LOW — 1 form)
- **Hit by:** Zoe (techconf-2025)
- **Validation error:** `E101 $.tree.children[2].children[0].children[2]: Unevaluated properties are not allowed ('bind' was unexpected)`
- **Root cause:** A component node for a checkbox/agreement field has a `bind` property that doesn't belong in the component tree — binds belong in the definition, not the component tree.

#### BUG-16: Repeat group component node emits unevaluated repeat-related props (MEDIUM — 1 form)
- **Hit by:** David (quarterly-report)
- **Validation error:** `E101 $.tree.children[8]: Unevaluated properties are not allowed ('addLabel', 'displayMode', 'removeLabel', 'repeatable' were unexpected)`
- **Root cause:** The component tree generator emits repeat-group UX props (`addLabel`, `displayMode`, `removeLabel`, `repeatable`) directly on the component node, but the component schema doesn't declare these as valid properties.

---

### UX ISSUES (technically works but feels wrong)

#### UX-1: No way to list/view active validation shape rules (HIGH — 2 personas)
- **Hit by:** David, Sam
- `formspec_describe(structure)` shows `shapeCount: N` but not what those shapes are. Shape IDs are opaque and only surface through validation errors.
- **Verbatim (David):** *"Building forms iteratively means you accumulate invisible state that you can only introspect by breaking things."*

#### UX-2: `choices` vs `options` parameter naming inconsistency (MEDIUM — 1 persona)
- **Hit by:** Priya
- Adding `choices` property when creating multichoice fields is silently ignored. Must use `options`. No error message guides the user.
- **Verbatim (Priya):** *"Either accept both parameter names, OR give an error message saying 'use options, not choices'."*

#### UX-3: `sample_data` generates non-contextual dummy values (MEDIUM — 2 personas)
- **Hit by:** Zoe, Sam
- All text fields get "Sample text". Rating fields get `42` (should be 1-10). Date fields get past dates (violating future-date constraints). Money fields get generic values.
- **Verbatim (Sam):** *"Respect type constraints (rating range, min/max), generate semantically plausible values, respect validation rules."*

#### UX-4: `formspec_create` skips bootstrap phase, making `formspec_draft` unreachable (MEDIUM — 1 persona)
- **Hit by:** Zoe
- Guide says use `formspec_draft` → `formspec_load` → authoring. But `formspec_create` goes straight to authoring.
- **Verbatim (Zoe):** *"Either `formspec_create` should stay in bootstrap phase, or the guide should detect the project is already in authoring."*

#### UX-5: Theme tokens have no validation or documentation (LOW — 1 persona)
- **Hit by:** Zoe
- Setting tokens like `color.primary` returns success but no confirmation the token is real. No way to list valid token vocabulary.

#### UX-6: `humanize` FEL action is a no-op (LOW — 1 persona)
- **Hit by:** Sam
- Input and output are identical for all tested expressions.

#### UX-7: `sample_data` output format is flat, not structured for repeat groups (LOW — 1 persona)
- **Hit by:** David
- Shows `"line_items.description": "Sample text"` instead of nested `"line_items": [{...}]`. Not usable as template for test payloads.

#### UX-8: Display content items appended at end of parent by default (LOW — 2 personas)
- **Hit by:** Zoe, Sam
- Content like headings and intro paragraphs appear at the bottom after all fields. Must use `formspec_edit(move)` to reorder.
- **Verbatim (Sam):** *"Content items like headings and intro paragraphs should support an `insertIndex: 0` or similar to control placement at creation time."*

#### UX-9: `formspec_describe` vs `formspec_place` use different identifiers (LOW — 1 persona)
- **Hit by:** Zoe
- `describe` shows `groupPath`, but `place` wants `page_id`. Cross-referencing required.

#### UX-10: No save prompt, unsaved indicator, or autosave (MEDIUM — 1 persona)
- **Hit by:** David (discovered when asked why his form wasn't on disk)
- Nothing in the workflow prompts or reminds users to save. No "unsaved changes" indicator. David built a 35-step form and forgot to save — the form only existed in memory.
- **Verbatim (David):** *"In a real production tool, losing a 35-step form build because you forgot to call `save` would be catastrophic."*
- **David's suggestions:** (1) autosave, (2) `unsaved: true` flag in describe/preview responses, (3) explicit guidance in `formspec_create` response to save when done.

---

### CONFUSION POINTS

#### CONF-1: `parentPath` vs dot-notation vs `page` prop — three ways to specify parent context (HIGH — 3 personas)
- **Hit by:** Marcus, Zoe, Sam
- Fields use `props.page`, groups use dot-notation in `path`, and there's a `parentPath` prop that conflicts with dot-notation. No consistent canonical approach.

#### CONF-2: Money type requires `moneyAmount()` extraction for all comparisons (MEDIUM — 1 persona)
- **Hit by:** David
- Not documented anywhere in tool descriptions. Discovered empirically. `fel(check)` doesn't warn.

#### CONF-3: Variables can't be referenced in bind expressions (MEDIUM — 1 persona)
- **Hit by:** Sam
- Created variable via `formspec_data(resource: "variable")`. `fel(check)` validated `$avg_severity`. But `behavior(calculate)` rejected it with `INVALID_FEL`.
- **Verbatim (Sam):** *"The `check` and `behavior` tools use different validation contexts, which is surprising and inconsistent."*

#### CONF-4: `formspec_behavior(require)` vs `props.required` — which wins? (LOW — 1 persona)
- **Hit by:** Zoe
- Unclear if both can coexist on the same field. Docs say "do NOT use both" only in the context of `readonly`.

---

### FEATURE GAPS

#### GAP-1: No way to reorder items within a page/group (HIGH — 2 personas)
- **Hit by:** Zoe, Sam (Priya noted it too)
- No drag-and-drop equivalent. Must delete and recreate to reorder.
- **Note:** `formspec_edit(move)` exists but Sam had to discover it; not surfaced in primary authoring tools.

#### GAP-2: Per-row validation in repeating groups (MEDIUM — 1 persona)
- **Hit by:** David
- Bind-level required works per-row, but custom logic shape rules don't evaluate per instance.

#### GAP-3: No min/max constraint on numeric fields at schema level (LOW — 1 persona)
- **Hit by:** Sam
- Must create shape rules with FEL expressions for simple range validation.

#### GAP-4: No rating scale range configuration (LOW — 1 persona)
- **Hit by:** Sam
- `rating` type creates a Rating widget but no way to specify the scale (1-5 vs 1-10).

#### GAP-5: No "other (specify)" pattern built-in (LOW — 1 persona)
- **Hit by:** Zoe
- Common in Typeform/JotForm. Here requires manual wiring with `show_when`.

#### GAP-6: No rich text / hyperlink support in content elements (LOW — 1 persona)
- **Hit by:** Zoe
- Can't embed links in labels or content paragraphs.

#### GAP-7: No email confirmation field pattern (LOW — 1 persona)
- **Hit by:** Zoe
- Common pattern not built in.

---

### PRAISE (consistently positive signals)

| Feature | Praised By | Notes |
|---------|-----------|-------|
| Batch field creation (`items[]` arrays) | All 5 | Unanimous. "Dramatically faster." "Massive productivity win." |
| Preview with scenario injection | Marcus, David, Sam | "Genuinely powerful." "Better than any form tool I've used." |
| FEL expression language | David, Sam | "Comprehensive." "Powerful and well-designed." |
| Auto email/phone validation | Priya, Zoe | "Delightful." "Just works." |
| Accessibility audit | Zoe, Sam | "Proactive and specific." "Found exactly the right things." |
| `formspec_flow(branch)` for conditional logic | Marcus | "Standout feature. High-leverage abstraction." |
| Cascading relevance (XForms processing model) | Sam | "Correct behavior. Great to see it implemented properly." |
| Intuitive tool naming | Priya | "Clear and descriptive. No confusion about which tool to use." |
| Component auto-generation | Priya, Sam | "Never had to tell the tool which components to use." |
| Validation report structure | David | "Well-designed. Machine-readable." |
| Money type as first-class citizen | David | "Real thought about financial form use cases." |
| FEL autocomplete | Sam | "Production-quality. Would make an excellent IDE integration." |

---

## Priority Summary

### HIGH priority (3+ personas or systemic)
| ID | Issue | Type | Hit By |
|----|-------|------|--------|
| BUG-1 | `parentPath` doubles path prefix | BUG | Marcus, Zoe, Sam |
| BUG-12 | Save/publish omits required `status` field | BUG (validation) | 4 of 5 forms |
| BUG-14 | Component tree emits unevaluated `widgetHint` | BUG (validation) | 3 of 5 forms |
| BUG-2 | Date comparison with `today()` always fails | BUG | Marcus, Sam |
| CONF-1 | Three inconsistent parent-context mechanisms | CONFUSION | Marcus, Zoe, Sam |
| UX-1 | No way to list active shape rules | UX | David, Sam |

### MEDIUM priority (2 personas or significant impact)
| ID | Issue | Type | Hit By |
|----|-------|------|--------|
| BUG-3 | Money comparison `> 0` silently broken | BUG | David |
| BUG-4 | Conditional required on calculated fields broken | BUG | David |
| BUG-5 | Shape rules don't evaluate per-row in repeat groups | BUG | David |
| BUG-6 | Required fires on repeat template with 0 instances | BUG | Sam |
| BUG-13 | Unknown `Checkbox` component type | BUG (validation) | Zoe |
| BUG-16 | Repeat component emits unevaluated props | BUG (validation) | David |
| UX-2 | `choices` silently ignored (should be `options`) | UX | Priya |
| UX-3 | Sample data ignores type constraints | UX | Zoe, Sam |
| UX-4 | `formspec_create` skips bootstrap phase | UX | Zoe |
| UX-10 | No save prompt or unsaved indicator | UX | David |
| CONF-2 | Money requires `moneyAmount()` — undocumented | CONFUSION | David |
| CONF-3 | Variables can't be referenced in bind expressions | CONFUSION | Sam |
| GAP-2 | Per-row validation in repeat groups | GAP | David |

### LOW priority (1 persona, minor impact)
| ID | Issue | Type |
|----|-------|------|
| BUG-7 | `remove_rule` ambiguous with multiple rules | BUG |
| BUG-8 | `sample_data` ignores `scenario` parameter | BUG |
| BUG-9 | Cross-document audit uses leaf key not full path | BUG |
| BUG-10 | Content items not findable by `formspec_place` | BUG |
| BUG-11 | `describe` drops `groupPath` from first page | BUG |
| BUG-15 | Component tree emits stray `bind` property | BUG |
| UX-5 | Theme tokens have no validation | UX |
| UX-6 | `humanize` FEL action is a no-op | UX |
| UX-7 | `sample_data` flat format for repeat groups | UX |
| UX-8 | Content appended at end by default | UX |
| UX-9 | `describe` vs `place` use different identifiers | UX |
| CONF-4 | `require` vs `props.required` precedence unclear | CONFUSION |
| GAP-1 | No obvious item reorder in authoring tools | GAP |
| GAP-3 | No numeric min/max at schema level | GAP |
| GAP-4 | No rating scale range config | GAP |
| GAP-5 | No "other (specify)" pattern | GAP |
| GAP-6 | No rich text in content elements | GAP |
| GAP-7 | No email confirmation pattern | GAP |
