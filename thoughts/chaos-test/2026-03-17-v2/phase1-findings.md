# Phase 1: Blind User Testing — Compiled Findings (v2)

**Date:** 2026-03-17 (iteration 2)
**Personas:** 5 (1 beginner, 2 intermediate, 1 advanced, 1 expert)

## Summary Table

| Persona | Model | Form Type | Fields | Tool Calls | Bugs | Overall |
|---------|-------|-----------|--------|------------|------|---------|
| Priya (beginner) | haiku | Volunteer signup | 8 | ~24 | 1 | **Completed** |
| Marcus (intermediate) | sonnet | Exit interview | 22 | ~35 | 0 | **Completed** |
| Jade (intermediate) | sonnet | Grant application | 58 | ~75 | 2 | **Completed** |
| Tomas (advanced) | sonnet | Expense report | 29 | ~55 | 3 | **Completed** |
| Rin (expert) | opus | Research intake | 33 | ~40 | 2 | **Completed** |

All 5 personas completed their forms. Total: ~229 tool calls, 150 fields created, 8 distinct bugs found.

---

## Deduplicated Issue List

### BUGS

#### B1. Dot-path + parentPath collision creates orphaned items [HIGH]
- **Category:** BUG
- **Hit by:** Rin, Jade (2 personas)
- **Reproduction:** Call `formspec_group` with `path: "parent.child"` AND `props: { parentPath: "parent" }`. Creates a child with literal key `parent.child` inside `parent`, resulting in path `parent.parent.child`. The created item is permanently unreachable — `formspec_edit(remove)` returns PATH_NOT_FOUND because the path resolver splits on dots. Only recoverable via `formspec_undo`.
- **Verbatim:**
  > Rin: "The system should detect the redundancy and treat the path as relative, or reject the call with a clear error."
  > Jade: "Lost probably 5 tool calls on this rabbit hole with no resolution."

#### B2. Multichoice fields fail required validation even with values [HIGH]
- **Category:** BUG
- **Hit by:** Priya (1 persona — but blocks the most basic use case)
- **Reproduction:** Create a multichoice field with `required: true`. Validate a response where the field has `["setup", "food"]`. Returns REQUIRED error.
- **Impact:** Required multichoice fields are unusable. Workaround: make them optional.
- **Verbatim:**
  > Priya: "Spent 10+ minutes trying different value formats before realizing it wasn't a data format issue."

#### B3. Cannot remove or edit existing shape rules [MEDIUM]
- **Category:** BUG
- **Hit by:** Tomas (1 persona)
- **Reproduction:** Call `formspec_behavior(add_rule)` with an incorrect expression, then try `formspec_edit(remove, "shape_1")` — returns PATH_NOT_FOUND.
- **Impact:** Incorrect shape rules become permanent noise in the form definition. No way to fix mistakes.
- **Verbatim:**
  > Tomas: "Now there are two rules where one is wrong and will silently fail. This is a data quality issue."

#### B4. Variable trace (`@variable`) shows no dependencies [MEDIUM]
- **Category:** BUG
- **Hit by:** Rin, Tomas (2 personas)
- **Reproduction:** Call `formspec_trace("@grand_total")` — returns `{"dependencies": []}` even though the variable depends on fields. Tracing the raw FEL expression works correctly.
- **Verbatim:**
  > Tomas: "Tracing the raw expression correctly shows dependencies. But tracing the variable name returns empty."
  > Rin: "formspec_trace for variable-to-variable dependencies returns empty."

#### B5. Preview scenario doesn't compute money-dependent values [MEDIUM]
- **Category:** BUG
- **Hit by:** Tomas (1 persona)
- **Reproduction:** Run `formspec_preview` with `scenario: {"line_items[0].amount": 6000}`. Grand total shows 0, conditional logic based on total doesn't trigger. `initialValue: "=today()"` does work, so it's specific to money functions.
- **Verbatim:**
  > Tomas: "The moneyAmount() function receives currency empty from raw number scenario and may return null/0."

#### B6. insertIndex silently ignored on content items [LOW]
- **Category:** BUG
- **Hit by:** Jade (1 persona)
- **Reproduction:** `formspec_content` with `props: { insertIndex: 10 }` — item appended to end, prop has no effect.
- **Verbatim:**
  > Jade: "The item was appended to the end; the insertIndex prop was accepted without error but had no effect."

---

### UX ISSUES

#### U1. Pages and groups are the same thing — not communicated [HIGH]
- **Category:** UX / CONFUSION
- **Hit by:** Marcus, Jade, Tomas (3 personas)
- **Description:** When `formspec_page(add)` creates a page, it also creates a definition group with the same ID. Fields with `props: {page: "X"}` get nested inside this group, affecting their data path. This dual-role is the single most common confusion point.
- **Verbatim:**
  > Marcus: "I wasn't sure if I was nesting inside the group or if the page key and group key matching was intentional."
  > Tomas: "I thought pages were purely presentational. When I saw employee_info.employee_name paths I was confused."
  > Jade: "So a page IS a group? Once I figured it out it was elegant, but the mental model shift took a moment."

#### U2. Screener fields not referenceable from form body FEL [HIGH]
- **Category:** UX
- **Hit by:** Rin (1 persona — but fundamental design issue)
- **Description:** Screener fields live in a separate data namespace. `$prior_diagnosis` silently resolves to null rather than erroring. No warning from `formspec_fel(check)`.
- **Verbatim:**
  > Rin: "This is the single biggest 'gotcha' I encountered. I had to create a duplicate boolean field as a workaround."

#### U3. formspec_group `page` prop doesn't work (inconsistent with field) [MEDIUM]
- **Category:** UX
- **Hit by:** Tomas (1 persona)
- **Description:** For `formspec_field`, the `page` prop works inline. For `formspec_group`, it's silently ignored — must use `formspec_place` separately.
- **Verbatim:**
  > Tomas: "This inconsistency is confusing — why does page in field props work but not in group props?"

#### U4. parentPath + dot-path interaction undocumented [MEDIUM]
- **Category:** UX
- **Hit by:** Rin, Jade (2 personas)
- **Description:** Both path conventions work independently but combining them creates broken state. No validation or documentation warns against this.
- **Verbatim:**
  > Rin: "A validation that rejects paths containing dots when parentPath is also provided would help."

#### U5. Content items placed after fields in groups [LOW]
- **Category:** UX
- **Hit by:** Rin (1 persona)
- **Description:** Headings and instructions content added to pages end up at the bottom of children list, after fields.
- **Verbatim:**
  > Rin: "Display content like headings should ideally default to the top of their group."

#### U6. No way to inspect shapes/variables after creation [LOW]
- **Category:** UX
- **Hit by:** Tomas (1 persona)
- **Description:** `formspec_describe(structure, target: "field")` shows binds but NOT shapes attached to it. No `formspec_search` filter for shapes or variables.
- **Verbatim:**
  > Tomas: "I had to remember which shapes I'd created and what their IDs were."

#### U7. FEL functions listing lacks parameter signatures [LOW]
- **Category:** UX
- **Hit by:** Marcus (1 persona)
- **Description:** `formspec_fel(functions)` returns function names and categories but not parameter names, types, or argument order.
- **Verbatim:**
  > Marcus: "I was initially unsure if dateDiff was (start, end) or (end, start)."

#### U8. Rating field scale not configurable [LOW]
- **Category:** UX
- **Hit by:** Marcus, Rin (2 personas)
- **Description:** `type: "rating"` creates a rating widget with no way to configure range (1-5 vs 1-10).
- **Verbatim:**
  > Marcus: "If I'd wanted a 1-10 scale I would have been stuck."

#### U9. Content `body` shows as `label` in describe output [LOW]
- **Category:** UX
- **Hit by:** Jade (1 persona)
- **Description:** Display items show `"label": "text"` in describe output even though they were created with `body` parameter.
- **Verbatim:**
  > Jade: "I wondered if my body content was stored correctly."

---

### FEATURE GAPS

#### G1. No `sumWhere` / conditional aggregate function [MEDIUM]
- **Hit by:** Tomas (1 persona)
- Needed per-category subtotals. Workaround: `sum(if(condition, value, 0))` for each category — verbose.
- **Verbatim:**
  > Tomas: "Eight category variables meant 8 nearly-identical expressions."

#### G2. No conditional page skip in wizard progress bar [MEDIUM]
- **Hit by:** Marcus, Jade (2 personas)
- Hidden pages still show in wizard progress. No way to mark a page as conditional for navigation.
- **Verbatim:**
  > Marcus: "I accepted that the progress bar may show a ghost step."

#### G3. No "other, please specify" pattern [LOW]
- **Hit by:** Rin (1 persona)
- Common survey pattern requires manual field + show_when workaround.

#### G4. No soft calculate / editable default from expression [LOW]
- **Hit by:** Jade (1 persona)
- `calculate` locks field value. No way to pre-populate from expression but allow user override.

#### G5. No dynamic text interpolation in content items [LOW]
- **Hit by:** Rin (1 persona)
- Content body is static text. Can't embed variable references.

#### G6. No field reordering within a group after creation [LOW]
- **Hit by:** Rin (1 persona)
- No post-hoc reorder for items within a group.

#### G7. Money field comparison gotcha — no FEL warning [LOW]
- **Hit by:** Tomas (1 persona)
- `$amount > 0` passes FEL check but doesn't work on money fields. Need `moneyAmount($amount) > 0`. No warning.

---

### PRAISE (Common Themes)

| Feature | Personas | Representative Quote |
|---------|----------|---------------------|
| **Batch `items[]` array** | All 5 | Jade: "Being able to add 14 fields in a single call saved enormous time" |
| **FEL check tool** | Marcus, Jade, Tomas, Rin | Marcus: "This is the best design decision in the tool" |
| **Preview with scenarios** | Marcus, Tomas, Rin | Tomas: "Testing $5000 vs $15000 and instantly seeing which fields appear" |
| **Audit tool** | Marcus, Tomas, Rin | Tomas: "Zero errors on a complex form felt genuinely reassuring" |
| **Type aliases** | Priya, Rin | Rin: "These aliases save significant boilerplate and demonstrate good API taste" |
| **show_when + required suppression** | Marcus, Jade, Tomas | Jade: "The conditional logic just works" |
| **Nested dot-path groups** | Priya, Jade | Priya: "The dot notation did exactly what I expected" |
| **Undo/redo** | Rin | Rin: "Having a reliable undo on a stateful form builder is essential" |
| **Screener feature** | Jade | Jade: "I didn't expect pre-form qualification screening to be first-class" |
| **Changelog with semver** | Rin | Rin: "For research instruments where version tracking matters, genuinely useful" |
| **selected() for multichoice** | Marcus | Marcus: "selected($reasons, 'other') worked first try" |

---

## Priority Summary

| Priority | Count | Key Issues |
|----------|-------|------------|
| HIGH | 3 | B1 dot-path/parentPath orphans, B2 multichoice required, U1 page=group confusion |
| MEDIUM | 6 | B3 shape removal, B4 variable trace, B5 money preview, U2 screener isolation, U3 group page prop, U4 parentPath docs |
| LOW | 9 | B6 insertIndex, U5-U9, G1-G7 |
