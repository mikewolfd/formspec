# Phase 1: Blind User Testing — Compiled Findings

## Summary Table

| Persona | Form Type | Complexity | Fields | Tool Calls | Bugs Found | Overall |
|---------|-----------|-----------|--------|------------|------------|---------|
| **Priya** (beginner, haiku) | Office supply request | Low | 5 + repeating group | ~26 | 0 | Completed |
| **Marcus** (intermediate, sonnet) | Parent-teacher signup | Medium | 8 | ~30 | 2 | Completed |
| **Dana** (intermediate, sonnet) | Conference registration | High | 12+ screener | ~45 | 2 | Completed |
| **Raj** (expert, sonnet) | Expense report | High | 17 + repeating + calcs | ~50 | 3 | Completed |
| **Zoe** (expert, opus) | Research survey | Very High | 23 + branching + scoring | ~45 | 2 | Completed |

All 5 personas successfully built their forms. No one abandoned.

---

## Deduplicated Issue List

### BUGS

#### B1. `formspec_content` with `parentPath` in props fails in wizard mode (single-item form)
- **Hit by**: Dana, Zoe (2 personas) — **MEDIUM priority**
- **Category**: BUG
- **Description**: `formspec_content` with `props: { parentPath: "group_name" }` fails with "Cannot add a 'display' at root in a paged (wizard) definition — provide a parentPath". The parentPath IS provided but ignored. Batch `items[]` form with the same props works fine.
- **Dana**: "This is a genuinely confusing bug because the error message tells you exactly what to do ('provide a parentPath') and you already did it."
- **Zoe**: "The inconsistency between formspec_field (where parentPath works) and formspec_content (where it doesn't) is confusing."
- **Workaround**: Use dot-path notation (e.g., `path="group.content_name"`) or batch `items[]` form.

#### B2. `page` prop doesn't work for field placement in wizard mode
- **Hit by**: Dana, Zoe (2 personas) — **MEDIUM priority**
- **Category**: BUG
- **Description**: `formspec_field` with `props: { page: "page_id" }` fails in wizard mode with "Cannot add a 'field' at root — provide a parentPath". The `page` prop is documented but doesn't work for placement.
- **Dana**: "The tool description lists `page` as a valid prop. In a paged form, you'd naturally try `page: 'attendee_info'` to assign a field to a page."
- **Zoe**: "Either make `page` work in wizard mode (auto-resolve to the page's group), or remove `page` from the schema in wizard mode."

#### B3. Page group path derived from title, not page_id
- **Hit by**: Dana, Zoe (2 personas) — **MEDIUM priority**
- **Category**: BUG / UX
- **Description**: When creating a page with `page_id: "attendee_info"` and `title: "Attendee Information"`, the parentPath is `"attendee_information"` (snake_case of title), not `"attendee_info"` (the explicit page_id). Users must discover the actual group path through trial and error.
- **Dana**: "I had to discover this by trial and error — the first error message told me to provide a parentPath but didn't tell me what that path was."
- **Zoe**: "The page ID should BE the group path, or the creation response should clearly show the mapping."

#### B4. Shape rules on repeating group fields don't fire during validation
- **Hit by**: Raj (1 persona) — **LOW priority** (but HIGH severity if confirmed)
- **Category**: BUG
- **Description**: `add_rule` targeting a repeating group field (e.g., `line_items.amount`) stores the rule (shapeCount increments, audit clean) but never evaluates during `preview(validate)`. Negative amounts pass validation.
- **Raj**: "The shape rule IS stored. It simply doesn't evaluate. This affects any add_rule targeting a field inside a repeating group."

#### B5. Validate error paths are 1-indexed while input paths are 0-indexed
- **Hit by**: Raj (1 persona) — **LOW priority**
- **Category**: BUG
- **Description**: Submitting `line_items[1].category` in validate mode returns errors referencing `line_items[2].description`. Input is 0-based, output is 1-based.
- **Raj**: "This creates a misleading mismatch that would confuse anyone trying to map validation errors back to the submitted data."

#### B6. `=` operator unreliable for choice fields in repeating groups; must use `selected()`
- **Hit by**: Raj (1 persona) — **LOW priority**
- **Category**: BUG
- **Description**: `$line_items.category = 'other'` doesn't work reliably in `require` or `show_when` conditions within repeating groups. `selected($line_items.category, 'other')` works correctly.
- **Raj**: "The FEL check tool validated BOTH as syntactically correct, so there was no signal pointing to the right approach."

#### B7. `branch` with multiple `when` values targeting same `show` target overwrites instead of OR-ing
- **Hit by**: Zoe (1 persona) — **LOW priority** (but HIGH severity)
- **Category**: BUG
- **Description**: When two branch arms target the same show item (e.g., `employed_ft` → show X, `employed_pt` → show X), only the last condition is stored. The first is silently dropped.
- **Zoe**: "This is silent data loss — the tool reports success but the behavior is wrong."

#### B8. componentNodeCount off by 1 in `formspec_describe`
- **Hit by**: Marcus (1 persona) — **LOW priority**
- **Category**: BUG
- **Description**: `statistics.componentNodeCount` reports 14 but `componentNodes` array has 13 items. Consistently off by 1.

#### B9. SubmitButton positioned before last field in component nodes
- **Hit by**: Marcus (1 persona) — **LOW priority**
- **Category**: BUG
- **Description**: Component nodes list shows SubmitButton before the last field, even though preview shows correct order. Internal representation doesn't match display order.

---

### UX ISSUES

#### U1. Batch `formspec_edit` requires top-level `action` even when items override
- **Hit by**: Dana (1 persona) — **LOW priority**
- **Category**: UX
- **Description**: Batch operations with per-item `action` still require a redundant top-level `action`. Tool description implies top-level should be optional.

#### U2. Move summary message is misleading ("Moved X to X")
- **Hit by**: Zoe (1 persona) — **LOW priority**
- **Category**: UX
- **Description**: Move action returns "Moved 'demographics.demo_heading' to 'demographics.demo_heading'" — looks like a no-op. Should say "Moved to index 0 within 'demographics'".

#### U3. `requiredFields` in preview includes hidden/structurally-required fields
- **Hit by**: Raj, Zoe (2 personas) — **MEDIUM priority**
- **Category**: UX
- **Description**: Preview's `requiredFields` lists ALL fields with any required condition, including hidden ones. Confuses users into thinking conditional require is broken.
- **Raj**: "You have to distinguish 'required fields' from 'currently failing required fields' by cross-referencing with validationState."
- **Zoe**: "It should either filter by visibility or label them differently."

#### U4. Search results don't include full dot-paths
- **Hit by**: Zoe (1 persona) — **LOW priority**
- **Category**: UX
- **Description**: `formspec_search` returns `key` but not the full path. Can't distinguish same-named fields in different groups.

#### U5. Undo granularity is handler-level, not user-action-level
- **Hit by**: Zoe (1 persona) — **LOW priority**
- **Category**: UX
- **Description**: Changing a widget via `formspec_update` requires 2 undos (definition + component tree). One user action should be one undo.

#### U6. `email` type alias produces weak validation (`.*@.*`)
- **Hit by**: Raj (1 persona) — **LOW priority**
- **Category**: UX
- **Description**: The email alias constraint `matches($, '.*@.*')` accepts "a@b" or "not@@valid". Should apply a stricter pattern.

#### U7. `number("")` returns 0, not null
- **Hit by**: Zoe (1 persona) — **LOW priority**
- **Category**: UX
- **Description**: For calculated scores, empty fields coerce to 0 via `number()`. Research instruments need null propagation (score should be null when items are unanswered).

#### U8. No way to add content at a specific position (always appends, then move)
- **Hit by**: Marcus (1 persona) — **LOW priority**
- **Category**: UX
- **Description**: Adding headings requires create + move. An `insertBefore`/`insertAfter` or working `insertIndex` would save a round-trip.

---

### CONFUSION POINTS

#### C1. Bootstrap vs. Authoring phase concept
- **Hit by**: Priya, Marcus (2 personas) — **MEDIUM priority**
- **Category**: CONFUSION
- **Description**: New users don't understand why two phases exist or what bootstrap is for. They just follow the error message to call `formspec_load`.
- **Marcus**: "Why is there a separate phase? What would I do in bootstrap that I can't do in authoring?"

#### C2. `string` vs `text` data type distinction unclear
- **Hit by**: Marcus (1 persona) — **LOW priority**
- **Category**: CONFUSION
- **Description**: Both are text types but `string` = single-line, `text` = multi-line textarea. Not explained in tool descriptions.

#### C3. `@` prefix for variables vs `$` prefix for fields
- **Hit by**: Zoe (1 persona) — **LOW priority**
- **Category**: CONFUSION
- **Description**: Users must guess variable syntax. FEL check helps confirm but tool descriptions don't mention it.

#### C4. How `branch` interacts with `show_when`
- **Hit by**: Zoe (1 persona) — **LOW priority**
- **Category**: CONFUSION
- **Description**: Branch replaces existing show_when conditions. Relationship between these two mechanisms isn't obvious.

---

### FEATURE GAPS

#### G1. No dynamic content interpolation (variable references in display text)
- **Hit by**: Dana (1 persona) — **LOW priority**
- **Category**: GAP
- **Description**: Can't use `{{@variable}}` or `$field` references in content body text. Static text only.

#### G2. No question randomization for survey instruments
- **Hit by**: Zoe (1 persona) — **LOW priority**
- **Category**: GAP

#### G3. No page-level validation or completion enforcement
- **Hit by**: Zoe (1 persona) — **LOW priority**
- **Category**: GAP

#### G4. No `maxSelections` shorthand for multichoice
- **Hit by**: Dana (1 persona) — **LOW priority**
- **Category**: GAP

#### G5. No image/logo support in content
- **Hit by**: Dana (1 persona) — **LOW priority**
- **Category**: GAP

#### G6. No confirmation/thank-you page mechanism
- **Hit by**: Marcus (1 persona) — **LOW priority**
- **Category**: GAP

#### G7. Changelog is a stub
- **Hit by**: Zoe (1 persona) — **LOW priority**
- **Category**: GAP

#### G8. No way to inspect individual shape rules
- **Hit by**: Raj (1 persona) — **LOW priority**
- **Category**: GAP

---

### PRAISE (consistent across personas)

| Feature | Praised By |
|---------|-----------|
| Batch field creation with `items[]` | Dana, Raj, Zoe |
| Preview with scenario injection | Dana, Raj, Zoe |
| Audit diagnostics (zero errors = confidence) | Marcus, Dana, Raj, Zoe |
| FEL expression language power + `fel(check)` | Raj, Zoe |
| Automatic component selection from data types | Priya, Marcus |
| Wizard mode "just works" | Priya, Dana |
| Intuitive tool naming | Priya |
| Screener with FEL routing | Zoe |
| Reusable option sets (`choicesFrom`) | Zoe |
| Dependency tracing | Zoe |
| Type aliases (email, phone, rating) | Marcus |
| Repeating group calculations (`sum()`) | Raj |

---

## Priority Summary

**HIGH (3+ personas or high severity)**:
- None hit by 3+ personas, but B4 (shape rules not firing), B7 (branch overwrite) are high-severity silent failures

**MEDIUM (2 personas)**:
- B1: `formspec_content` parentPath ignored in single-item mode
- B2: `page` prop doesn't work for placement
- B3: Page group path ≠ page_id
- U3: `requiredFields` includes hidden fields
- C1: Bootstrap/authoring phase confusion

**LOW (1 persona)**:
- B4-B9, U1-U8, C2-C4, G1-G8
