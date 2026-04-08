# Chaos Test Implementation Plan

**Date:** 2026-04-07
**Philosophy:** No deferrals. Greenfield, zero users, zero backwards compatibility. Fix the architecture, not the symptoms.

---

## Tier 1: Core Data Model Fixes (Foundation)

These must land first — everything else builds on them.

### ARCH-1+2: Typed TreeNode + Allowlist Export

**Bugs fixed:** BUG-14 (widgetHint leak, 3/5 forms), BUG-16 (repeat group props leak), prevents future recurrence

**Current state:** `TreeNode = { component: string; bind?: string; [k: string]: unknown }` — totally open. `component.setNodeProperty` accepts ANY property. `cleanTreeForExport` uses a hardcoded denylist of 5 internal properties. Anything not in the denylist survives to export.

**Target state:**
1. TreeNode becomes a discriminated union keyed on component type. Each variant declares exactly which properties are valid per the component schema.
2. Authoring-only metadata (widgetHint, repeatable, displayMode, addLabel, removeLabel, etc.) lives in a separate `_meta` store keyed by node ID — NOT on the tree node itself.
3. `cleanTreeForExport` switches from denylist to allowlist — for each component type, only emit properties that the component schema declares as valid.

**Files:**
- `packages/formspec-core/src/raw-project.ts` — TreeNode type, `cleanTreeForExport`
- `packages/formspec-core/src/tree-reconciler.ts` — node creation
- `packages/formspec-core/src/handlers/component-tree.ts` — node manipulation
- `packages/formspec-core/src/handlers/component-properties.ts` — property storage
- `packages/formspec-studio-core/src/project.ts` — all sites storing authoring metadata on nodes
- `schemas/component.schema.json` — source of truth for valid properties per type

### ARCH-4: Canonical Paths on TreeNode at Write Time

**Bugs fixed:** BUG-1 (parentPath doubling, 3 personas), BUG-9 (leaf key vs full path audit), BUG-10 (display items not findable)

**Current state:** Tree nodes store `bind: item.key` (leaf key only). Display items use `nodeId` instead of `bind`. Path resolution is inconsistent across `_resolvePath`, `placeOnPage`, `crossDocumentAudit`, each implementing their own logic.

**Target state:**
1. Tree nodes store full resolved paths at write time, not leaf keys. The reconciler and node creation code resolve the canonical path once and store it.
2. Display items and data items use a unified addressing model — both have a canonical path.
3. Single canonical resolution function at creation time. No fixup helpers at read time.

**Files:**
- `packages/formspec-core/src/tree-reconciler.ts:182` — currently `bind: item.key`, needs full path
- `packages/formspec-studio-core/src/project.ts:598-613` — `_resolvePath` (parentPath doubling)
- `packages/formspec-studio-core/src/project.ts:2505-2513` — `placeOnPage` (bind vs nodeId)
- `packages/formspec-mcp/src/tools/audit.ts:108-127` — cross-document audit (leaf key lookup)
- `packages/formspec-mcp/src/tools/structure.ts:38-45` — `mergeParentPath`

### FIX 1: Add `status: 'draft'` to `createDefaultDefinition()`

**Bug fixed:** BUG-12 (4/5 forms fail schema validation)

**File:** `packages/formspec-core/src/raw-project.ts:148-156`

**Change:** Add `status: 'draft'` to the factory return object. 1-line change.

### FIX 2: Fix Phantom `Checkbox` in Widget Vocabulary

**Bugs fixed:** BUG-13 (unknown Checkbox type), BUG-15 (cascade — stray `bind` property)

**File:** `packages/formspec-types/src/widget-vocabulary.ts`

**Changes:**
- Line 10: Remove `'Checkbox'` from `KNOWN_COMPONENT_TYPES`
- Line 32: Change `checkbox: 'Checkbox'` to `checkbox: 'Toggle'` in `SPEC_WIDGET_TO_COMPONENT`
- Line 75: Remove `Checkbox: 'checkbox'` from `COMPONENT_TO_HINT`
- Line 104: Remove `'Checkbox'` from `COMPATIBILITY_MATRIX` boolean entry

---

## Tier 2: Rust/WASM Spec Violations

### FIX 4: Date Coercion at Context Entry

**Bug fixed:** BUG-2 (date comparison always fails, 2 personas)

**Spec:** S2.1.3 maps `dataType: "date"` → FEL type `date`. The engine MUST resolve `$field` for a date-typed field as a FEL `date` value. S3.4.3: no implicit coercion in the evaluator.

**Approach:** Coerce at the JSON→FEL boundary (where response values enter the evaluation context), NOT in the evaluator's `compare()`. The evaluator stays type-strict. The boundary between "JSON world" and "FEL world" is where conversion happens.

**Files:** `crates/fel-core/src/evaluator.rs` or the context-building code in `crates/formspec-eval/` that feeds values into FEL evaluation.

### FIX 5: Calculate-Before-Required Evaluation Order

**Bug fixed:** BUG-4 (conditional required on calculated fields, 1 persona)

**Spec:** S2.4 Phase 2 mandates topological evaluation order. If `required` on field B depends on field A's calculated value, A's calculate MUST evaluate first.

**Approach:** Ensure the dependency graph includes edges from calculate targets to any bind that references them. The topological sort should naturally order calculate before dependent required expressions.

**File:** `crates/formspec-eval/src/recalculate/mod.rs`

### FIX 6: Skip Repeat Template Validation at 0 Instances

**Bug fixed:** BUG-6 (required fires on template with 0 instances, 1 persona)

**Spec:** S2.4 Phase 1 Rebuild re-indexes based on actual instances. Zero instances = zero concrete paths = zero nodes to validate.

**Approach:** Skip validation target generation for repeat group children when instance count is 0.

**File:** `crates/formspec-eval/src/rebuild/repeat_expand.rs`

### ARCH-3: Operator Type Checking + Sigil Validation in `analyze_fel`

**Bugs fixed:** BUG-3/CONF-2 (money comparison — working-as-designed, but `fel(check)` should warn), CONF-3 (variable `$` vs `@` sigil)

**Scope (bounded):**
1. Comparison operator type matching: if left operand is money and right is number, warn "use moneyAmount()"
2. Sigil validation: if `$name` doesn't match a known field but a variable named `name` exists, suggest `@name`
3. Date/string mismatch warnings on comparisons

**NOT in scope:** Full type inference through function calls, ternary expressions, or nested path resolution. This is operator-level type checking, not a type system.

**Files:**
- `crates/formspec-core/src/` — `analyze_fel` function
- `packages/formspec-core/src/queries/expression-index.ts` — semantic validation that powers `fel(check)` and `behavior()`

---

## Tier 3: Studio-core Correctness

### FIX 8: Constraint Expression Rewriting for Repeat Wildcards

**Bug fixed:** BUG-5 (shape rules don't evaluate per-row, 1 persona — confirmed spec violation per S7.3)

**Current:** `addValidation` auto-normalizes shape target from `line_items.description` to `line_items[*].description`, but the constraint expression is NOT rewritten to use per-instance references.

**Approach:** When normalizing target to include `[*]`, also rewrite `$field` references in the constraint expression to use row-context syntax.

**File:** `packages/formspec-studio-core/src/project.ts`

### FIX 9: `removeValidation` Normalization + Error Handling

**Bug fixed:** BUG-7 (remove_rule ambiguous with multiple rules, 1 persona)

**Current:** Compares raw target against normalized stored targets (with `[*]`). Returns success even when nothing removed.

**Approach:**
1. Normalize the target before comparison (apply `_normalizeShapeTarget`)
2. Accept shape `id` as an alternative to target path
3. Return error/warning when no matches found

**File:** `packages/formspec-studio-core/src/project.ts:1264-1306`

### FIX 11: `listPages` First-Page `groupPath`

**Bug fixed:** BUG-11 (describe drops groupPath from first page, 1 persona)

**Current:** Medium-confidence root cause — likely tree reconciler snapshot/restore displacing first page's bound children.

**Approach:** Write a targeted failing test first. Defensive fix: `listPages` should walk both `bind` and `nodeId` children.

**File:** `packages/formspec-studio-core/src/project.ts:2471-2482`

---

## Tier 4: MCP/UX Polish

| Fix | What | File |
|-----|------|------|
| UX-1 | Add shape listing to `formspec_describe` | `packages/formspec-mcp/src/tools/query.ts` |
| UX-2 | `.strict()` on Zod schemas (defense-in-depth with ARCH-1+2) | `packages/formspec-mcp/src/create-server.ts` |
| UX-8 | Add `insertIndex` to content Zod schema | `packages/formspec-mcp/src/create-server.ts` |
| UX-9 | Rename `id` → `page_id` in describe output | `packages/formspec-mcp/src/tools/query.ts` |
| BUG-8 | Pass scenario param to `generateSampleData` | `packages/formspec-studio-core/src/project.ts` |
| CONF-1 | Document parent-context precedence in tool descriptions | `packages/formspec-mcp/src/create-server.ts` |
| UX-4 | Document both create and draft→load paths in guide | `packages/formspec-mcp/src/tools/guide.ts` |
| UX-5 | Surface token vocabulary via existing helpers | `packages/formspec-mcp/src/tools/theme.ts` |
| UX-6 | Enhance `humanizeFEL` for compound expressions | `packages/formspec-studio-core/src/authoring-helpers.ts` |
| UX-7 | Handle repeatable groups in `generateSampleData` | `packages/formspec-studio-core/src/project.ts` |
| UX-3 | Make `generateSampleData` constraint-aware | `packages/formspec-studio-core/src/project.ts` |
| UX-10 | Add dirty-tracking state, surface in responses | Core + studio-core + MCP |

---

## Grouping for Parallel Implementation

Fixes can be parallelized by layer since they touch different packages:

| Agent | Layer | Fixes | Dependencies |
|-------|-------|-------|-------------|
| **Agent A** | Types + Core + Studio-core | ARCH-1+2, ARCH-4, FIX 1, FIX 2 | None — foundation |
| **Agent B** | Rust/WASM | FIX 4, FIX 5, FIX 6, ARCH-3 | None — independent crate work |
| **Agent C** | Studio-core (after Agent A) | FIX 8, FIX 9, FIX 11 | Depends on ARCH-4 path model |
| **Agent D** | MCP (after Agent A) | UX-1, UX-2, UX-8, UX-9, BUG-8, CONF-1, rest | Depends on ARCH-1+2 node model |

Agents A and B can run in parallel. Agents C and D wait for A to land.
