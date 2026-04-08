# Phase 1: Blind User Testing — Compiled Findings

**Date:** 2026-04-07

## Summary Table

| Persona | Role | Experience | Form Type | Fields | Pages | Tool Calls | Bugs | UX Issues | Overall |
| ------- | ---- | ---------- | --------- | ------ | ----- | ---------- | ---- | --------- | ------- |
| Priya | Nonprofit director | Beginner | Volunteer signup | 7 | 1 | 22 | 0 | 2 | Completed |
| Marcus | HR manager | Intermediate | Onboarding checklist | 77 | 6 | ~35 | 2 | 4 | Completed |
| Zoe | Event coordinator | Intermediate | Conference registration | 19 | 4 | ~45 | 4 | 5 | Completed |
| David | Business analyst | Advanced | Budget request | 34 | 5 | ~30 | 2 | 3 | Completed |
| Rina | Researcher | Expert | Research survey | 34 | 5 | ~40 | 2 | 4 | Completed |

All 5 personas completed their forms. No one abandoned. Total: ~172 tool calls across all personas.

**Validation results** (`python3 -m formspec.validate`):

| Project | Result | Notes |
| ------- | ------ | ----- |
| volunteer-signup (Priya) | PASS | 0 errors, 2 FEL expressions |
| hr-onboarding (Marcus) | **FAIL** | 8 duplicate key errors (E200) |
| conference-registration (Zoe) | PASS | 0 errors, 8 FEL expressions |
| quarterly-budget-request (David) | PASS | 0 errors, 29 FEL expressions |
| faculty-survey (Rina) | PASS | 0 errors, 23 FEL expressions |

---

## Issues by Architectural Layer

### Layer 7 — MCP (formspec-mcp: tool schemas, descriptions, parameter mapping)

> Issues where the MCP tool interface itself is the root cause — bad descriptions, missing parameters, confusing naming, serialization bugs in responses.

#### U1. FEL path syntax ($-prefix) confusion in conditions [HIGH — 3 personas]

**Hit by:** Marcus, Zoe, Rina
**Category:** UX
**Description:** Users are unclear when to use `$`-prefixed paths (FEL) vs bare dot-notation (authoring). In `show_when` conditions, `formspec_behavior` accepts FEL but users aren't sure of the syntax.
**Evidence:**

- Marcus: "I initially wrote `department_role.department = 'manufacturing'` (no `$`) and it worked — but I wasn't sure if it would"
- Zoe: "I kept second-guessing whether to use `$preferences.dietary_restrictions` or `preferences.dietary_restrictions`"
- Rina: "Coming from XForms/ODK where you use `/data/field` XPath syntax, the `$path.to.field` syntax was a small mental shift"

#### U2. Dot notation vs `parentPath` vs `page` — when to use which [HIGH — 3 personas]

**Hit by:** Marcus, David, Zoe
**Category:** UX / CONFUSION
**Description:** The interaction between dot-notation nesting, `parentPath` prop, and `page` prop is unclear. The docs warn about "combining causes double-nesting" but users can't tell which approach is correct for their situation.
**Evidence:**

- Marcus: "Without `parentPath`, I wasn't sure if the group would just float or attach correctly"
- David: "The docs say 'combining them causes double-nesting' but the path I passed already used dot notation to imply nesting"
- Zoe: "early on I wasn't sure if `page` was equivalent to `parentPath` or if it was an additional placement directive"

#### U3. `formspec_save` vs `formspec_publish` naming confusion [MEDIUM — 2 personas]

**Hit by:** Priya, Zoe
**Category:** UX
**Description:** `formspec_save` requires a disk path and fails with an opaque error when none is provided. Users expect "save" to just persist their work. `formspec_publish` does what they expect but the naming difference is non-obvious.
**Evidence:**

- Priya: "The error message 'No save path specified and project has no source path' didn't tell me what a valid path would look like"
- Zoe: "I saw `formspec_save` and assumed it was the 'save my work' button. `formspec_publish` does what I expected save to do."

#### U4. `formspec_guide` says "call FIRST" but isn't interactive [MEDIUM — 2 personas]

**Hit by:** Marcus, Zoe
**Category:** UX
**Description:** Guide returns a questionnaire but doesn't accept answers. `formspec_create` doesn't mention the guide. Users either skip it or are confused by the non-interactive flow.
**Evidence:**

- Marcus: "I expected a back-and-forth. It turned out the guide was more of a 'here's what to think about' prompt"
- Zoe: "The guide says to call it first, but `formspec_create` doesn't mention the guide at all. New users will skip the guide."

#### B3. Screener routes/phases show "undefined" in responses [LOW — 1 persona]

**Hit by:** Zoe
**Category:** BUG
**Description:** `formspec_screener(add_route)` response says `"Added route to 'undefined'"`. `add_phase` response says `"Added evaluation phase 'eligibility' (undefined)"`.
**Evidence:** Zoe: "The `(undefined)` in the summary is alarming — looks like a serialization bug where the strategy/type wasn't printed"

#### B8. MCP authoring tools allow creating duplicate item keys without warning [MEDIUM — 1 persona + validator]

**Hit by:** Marcus (detected by `python3 -m formspec.validate`)
**Category:** BUG
**Description:** The MCP field/group creation tools (`formspec_field`, `formspec_group`) allow creating multiple items with the same key in different parent groups (e.g., `laptop_issued`, `safety_glasses`, `locker_assigned` duplicated across department-conditional sections). The tools accept these without error, but the validator catches them as E200 violations. Marcus's 77-field onboarding form had 8 duplicate key errors.
**Evidence:** Validator output: `E200 $.items[2].children[2].children[0]: Duplicate item key 'laptop_issued' (first seen at $.items[2].children[1].children[0])` — 8 such errors across equipment, compliance, and training sections.
**Impact:** Users build forms they believe are valid, only to discover structural errors at validation time. The MCP layer should either reject duplicate keys at creation time or auto-namespace them (e.g., `manufacturing_laptop_issued` vs `office_laptop_issued`).

#### U9. `formspec_update` lacks batch mode [LOW — 1 persona]

**Hit by:** Rina
**Category:** UX
**Description:** Unlike `formspec_field`, `formspec_behavior`, etc., `formspec_update` doesn't support `items[]` for bulk operations.

#### U10. `formspec_style(layout)` gives no feedback on where it applies [LOW — 1 persona]

**Hit by:** Zoe
**Category:** UX
**Description:** Response just says "Applied columns-2 layout to 2 item(s)" with no page/container context.

#### G4. No batch move operations [LOW — 1 persona]

**Hit by:** Priya
**Description:** Fields must be moved into groups individually.

---

### Layer 6 — Studio-core (formspec-studio-core: Project helpers, evaluation)

> Issues where the Project class helpers (preview, sample data, audit) produce incorrect or incomplete results.

#### B1. Calculated fields return null in preview mode [HIGH — 2 personas]

**Hit by:** David, Rina
**Category:** BUG
**Description:** `formspec_preview(mode="preview")` with scenario data does not evaluate FEL `calculate` expressions. All calculated fields return `null`.
**Evidence:**

- David: "With `quantity: 4` and `unit_cost: {amount: 5000, currency: 'USD'}`, `line_total` should be `{amount: 20000, currency: 'USD'}` — got `null`"
- Rina: "`research_score`, `teaching_score`, `seniority_score` all returned `null`. `total_score` returned `0` (because `coalesce(null, 0)` evaluates to `0`)"

**Impact:** Makes it impossible to test calculated field logic through the MCP API without a live runtime.

#### B4. `sample_data` mode ignores relevance/conditional visibility [LOW — 1 persona]

**Hit by:** Zoe
**Category:** BUG
**Description:** `formspec_preview(mode="sample_data")` fills every field regardless of `show_when` / `relevant` conditions.
**Evidence:** Zoe: "`dietary_other` gets populated with 'Sample paragraph text' even though it should be hidden when 'none' is selected"

#### B5. `timing: "submit"` on validation rules ignored in preview [LOW — 1 persona]

**Hit by:** Marcus
**Category:** BUG
**Description:** Validation rules with `timing: "submit"` fire immediately in preview instead of being suppressed until submission.
**Evidence:** Marcus: "My boolean 'must be true' rules fire immediately on an empty form, alongside the 'Required' errors for text fields"

#### B7. Pages show "active" even when hidden by branching [LOW — 1 persona]

**Hit by:** Rina
**Category:** BUG
**Description:** In preview, all pages show `"status": "active"` regardless of branching logic. `hiddenFields` array is correct but `pages` array doesn't reflect page-level hiding.

#### U7. Accessibility audit too noisy — flags self-explanatory fields [LOW — 1 persona]

**Hit by:** Marcus
**Category:** UX
**Description:** Audit flags "First Name", "Last Name", "Phone Number" etc. for missing hints. These labels need no hint.
**Evidence:** Marcus: "The noise made it harder to spot the two or three fields that actually warranted a hint"

#### U8. Preview always shows validation — no "clean slate" mode [LOW — 1 persona]

**Hit by:** Marcus
**Category:** UX
**Description:** No way to see the form as a fresh user would see it without validation errors firing.

#### U11. `sample_data` generates implausible values (42 for all integers, ignores constraints) [LOW — 1 persona]

**Hit by:** Rina
**Category:** UX
**Description:** Sample data doesn't respect constraints, choice lists, or calculated expressions.

---

### Layer 5 — Core (formspec-core: RawProject, handlers, tree operations)

> Issues where the project handler layer produces structurally incorrect output.

#### B6. 2-column Grid nodes orphaned in component tree [LOW — 1 persona]

**Hit by:** Zoe
**Category:** BUG
**Description:** After applying `formspec_style(layout, columns-2)`, the Grid wrapper components appear at the end of the component tree as orphaned nodes, not nested inside their parent page.
**Evidence:** Zoe: "The fields themselves appear correctly on their pages but the Grid wrapper seems detached"

---

### Layer 4 — Engine (formspec-engine: FEL, state management, reactivity)

> Issues where FEL evaluation, error messages, or expression semantics are the root cause.

#### B2. `formspec_fel humanize` is a no-op [MEDIUM — 2 personas]

**Hit by:** Zoe, Rina
**Category:** BUG
**Description:** `formspec_fel(action: "humanize")` returns the expression unchanged. The `humanized` field is identical to `original`.
**Evidence:**

- Zoe: "I ran `humanize` on my complex nested `if()` expression expecting 'If ticket type is early bird then $299...' — got the exact same expression echoed back verbatim"
- Rina: "`humanize` FEL action is a no-op — it returns successfully but `humanized` field is identical to `original`"

#### U5. Repeat group FEL references — scope and wildcards non-obvious [MEDIUM — 2 personas]

**Hit by:** David, Rina
**Category:** UX / CONFUSION
**Description:** Inside repeat groups, users don't know whether FEL references resolve to the current instance or all instances, whether to use `[*]` wildcards, or whether sibling short-form references work.
**Evidence:**

- David: "I had to guess that `$line_items.items.quantity` (without an instance index) would work as a sibling reference inside a repeat"
- Rina: "I wasn't sure if `count($publications.pub_entries.pub_title)` would count across all repeat instances or just the current one"

#### U6. `formspec_fel(check)` reports "unknown reference" for short-form sibling refs [MEDIUM — 1 persona]

**Hit by:** David
**Category:** UX
**Description:** `$quantity * $unit_cost` inside a repeat context returns `FEL_UNKNOWN_REFERENCE` instead of suggesting the full path.
**Evidence:** David: "This is technically fine, but counterintuitive if you expect relative scope inside a group"

#### U12. `len()` error doesn't suggest `length()` [LOW — 1 persona]

**Hit by:** Marcus
**Category:** UX
**Description:** Error says "Unknown function" but doesn't suggest the correct name. User had to look up the catalog.

#### U13. `countWhere` predicate syntax non-obvious [LOW — 1 persona]

**Hit by:** Rina
**Category:** UX
**Description:** Signature says "predicate" but actual syntax expects a literal match value.

---

### Layer 1 — Spec / Schema (specs, schemas: normative behavior, field types, components)

> Feature gaps that require spec-level decisions before they can be implemented.

#### G1. No conditional page routing / skip logic [MEDIUM — 2 personas]

**Hit by:** David, Zoe
**Category:** GAP
**Description:** Users want to skip entire wizard pages based on conditions. `formspec_flow(branch)` exists but its capability for page skipping is unclear.

#### G2. No computed display / display-only field type [LOW — 1 persona]

**Hit by:** David
**Description:** Readonly string + calculate renders as a text input, not a styled label/badge.

#### G3. No confirmation/summary page type [LOW — 1 persona]

**Hit by:** Zoe
**Description:** No built-in "review your answers" page at end of wizard.

#### G5. No signature field type [LOW — 1 persona]

**Hit by:** Marcus

#### G6. No checklist component [LOW — 1 persona]

**Hit by:** Marcus
**Description:** Boolean toggles work but a purpose-built checklist group would save many tool calls.

---

## Layer Heatmap

| Layer | Issues | High | Medium | Low |
| ----- | ------ | ---- | ------ | --- |
| **MCP** (tool interface) | 10 | 2 | 3 | 5 |
| **Studio-core** (preview/eval) | 7 | 1 | 0 | 6 |
| **Core** (tree ops) | 1 | 0 | 0 | 1 |
| **Engine** (FEL) | 5 | 0 | 3 | 2 |
| **Spec/Schema** | 5 | 0 | 1 | 4 |

---

## Praise (patterns across personas)

| Feature | Personas | Notes |
| ------- | -------- | ----- |
| **Batch field creation (`items[]`)** | ALL 5 | Universal praise. "Chef's kiss" (Rina), "genuinely fast" (David), "miles better than Typeform" (Zoe) |
| **FEL expression language + function catalog** | David, Marcus, Rina, Zoe | Power, breadth, `money()` type, regex support, `formspec_fel(functions)` |
| **Preview with scenario injection** | David, Marcus, Zoe | "Killer feature" (Zoe), "genuinely reassuring" (Marcus) |
| **`formspec_fel(check)` for expression validation** | David, Marcus, Rina | Validate before committing — "invaluable" |
| **Error messages on FEL failures** | Marcus, Rina | Precise, actionable, position-aware |
| **`formspec_describe(mode="structure")`** | Marcus, Zoe | At-a-glance stats for the whole form |
| **Path hierarchy (dot notation)** | Marcus, Rina | "Intuitive once you trust it" |
| **Conditional show/hide on display items** | Zoe | "Elegant" — banners appear/disappear based on cross-page values |
| **Changeset workflow** | Rina | "Unique and valuable — git-like staging for form changes" |
| **Repeatable groups** | Priya, Rina, Zoe | "Just worked" — configurable labels, nesting |
| **Cross-page calculated fields** | Zoe | "In most form builders, cross-page calculated values are impossible" |
| **Money type system** | David | "First-class money types — exactly right for financial forms" |

---

## Priority Signal

| Priority | Issues | Rationale |
| -------- | ------ | --------- |
| **HIGH** | B1 (calc null in preview), U1 ($-prefix confusion), U2 (nesting confusion) | 2-3 personas hit these; core usability blockers |
| **MEDIUM** | B2 (humanize no-op), B8 (duplicate keys allowed), U3 (save vs publish), U4 (guide not interactive), U5 (repeat FEL scope), U6 (short-form ref error), G1 (page skip) | 1-2 personas; friction but workarounds exist |
| **LOW** | B3-B7, U7-U13, G2-G6 | Single persona; minor or edge-case |
