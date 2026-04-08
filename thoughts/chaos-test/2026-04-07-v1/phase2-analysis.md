# Phase 2: Root Cause Analysis — Compiled Findings

**Date:** 2026-04-07

## Layer Heatmap (Corrected)

Initial layer guesses were significantly wrong. Every "engine layer" bug is actually in Rust/WASM. Every "core layer" bug is actually in studio-core or MCP. The TS engine and core handlers are functioning correctly as thin bridges.

```
Rust/WASM (fel-core, formspec-eval)  ████     4 bugs (deepest, hardest)
Types (widget-vocabulary)            █        1 bug
Core (raw-project)                   █        1 bug (createDefaultDefinition)
Studio-core (project.ts, helpers)    █████████ 9 bugs + 5 UX issues
MCP (tools, Zod schemas, docs)       █        1 bug + 8 UX issues + 2 confusion
Spec/Schema                          —        0 bugs (all gaps are working-as-designed)
```

---

## Corrected Layer Assignments

| Bug | Initial Guess | Actual Layer | Root File |
|-----|--------------|-------------|-----------|
| BUG-1 | core | **studio-core + MCP** | `project.ts:_resolvePath` + `structure.ts:handleGroup` |
| BUG-2 | engine | **Rust/WASM** | `crates/fel-core/src/evaluator.rs` (compare has no String→Date coercion) |
| BUG-3 | engine | **Rust/WASM** | `crates/fel-core/src/evaluator.rs` (compare rejects Money vs Number) |
| BUG-4 | engine | **Rust/WASM** | `crates/formspec-eval/src/recalculate/mod.rs` (required before calculate) |
| BUG-5 | engine | **studio-core** | `project.ts` (constraint not rewritten for repeat wildcards) |
| BUG-6 | engine | **Rust/WASM** | `crates/formspec-eval/src/rebuild/repeat_expand.rs` (template validated at 0 instances) |
| BUG-7 | core | **studio-core** | `project.ts:removeValidation` (path normalization mismatch) |
| BUG-8 | MCP | **studio-core** | `project.ts:generateSampleData` (no scenario param) |
| BUG-9 | core | **MCP** | `audit.ts:crossDocumentAudit` (bind key vs full path) |
| BUG-10 | core | **studio-core** | `project.ts:placeOnPage` (display items use nodeId, not bind) |
| BUG-11 | core | **studio-core** | `project.ts:listPages` + tree reconciler |
| BUG-12 | MCP | **core** | `raw-project.ts:createDefaultDefinition` (missing `status: 'draft'`) |
| BUG-13 | component gen | **types** | `widget-vocabulary.ts` (phantom `Checkbox` type) |
| BUG-14 | component gen | **studio-core + core** | `project.ts:addField` stores widgetHint on node + `raw-project.ts:cleanTreeForExport` doesn't strip |
| BUG-15 | component gen | *(cascade of BUG-13)* | Not independent — fixing BUG-13 resolves this |
| BUG-16 | component gen | **core + schema decision** | `raw-project.ts:cleanTreeForExport` doesn't strip authoring props |

---

## Spec Compliance Summary

| Bug | Spec Says | Classification |
|-----|-----------|---------------|
| BUG-2 | Date fields MUST resolve as FEL `date` type (S2.1.3); `today()` returns `date` (S3.5.4); same-type comparison required (S3.3) | **Spec violation** |
| BUG-3/CONF-2 | No implicit coercion (S3.4.3); money→number comparison MUST signal type error (S3.3) | **Working-as-designed** (but `fel(check)` should warn) |
| BUG-4 | Calculate MUST resolve before required — topological order (S2.4 Phase 2); Phase 2→3 sequencing | **Spec violation** |
| BUG-5 | Shape targets with `[*]` MUST evaluate per-instance (S7.3 normative example, S4.3.3) | **Spec violation** |
| BUG-6 | Zero instances = zero nodes to validate (S2.4 Phase 1 Rebuild) | **Spec violation** |
| BUG-7 | Shapes identified by `id` (unique), not `target` (S5.2.1) | **Spec violation** (tooling) |
| BUG-10 | Display items have keys, are in item tree, addressable by path (S4.2.1, S4.2.4) | **Spec violation** (tooling) |
| BUG-12 | `status` is REQUIRED on definition root; valid values: draft/active/retired (schema `required` array) | **Schema violation** |
| BUG-13 | No `Checkbox` component type in component schema; boolean fields use `Toggle` | **Schema violation** |
| BUG-14 | `widgetHint` is definition-tier (S4.2.5.1), NOT component tree; `unevaluatedProperties: false` rejects it | **Schema violation** |
| BUG-16 | `repeatable`, `addLabel`, `removeLabel`, `displayMode` not valid component node props | **Schema violation** |
| CONF-3 | Variables use `@name` syntax (FEL grammar S6.1), not `$name` — `$` is field reference | **User error** (but tooling should catch) |
| CONF-4 | Only bind `required` exists in spec (S4.3.1) — no `props.required` on items | **Not a spec issue** — MCP sugar |

### Reclassified "Gaps" (from Phase 1)

| Gap | Spec Expert Finding |
|-----|-------------------|
| GAP-2 (per-row shapes) | **Implementation bug** — spec has normative example (S7.3) |
| GAP-3 (numeric min/max) | **Working-as-designed** — use bind `constraint`; component `min/max` is UI-only |
| GAP-4 (rating range) | **Working-as-designed** — component spec Rating has `max` prop (S6.7) |
| GAP-5 (other/specify) | **Working-as-designed** — use field `children` + `relevant` bind |
| GAP-6 (rich text) | **Partial gap** — Tier 3 Text component has `format: "markdown"`, but Tier 1 labels are plain string |
| GAP-7 (email confirm) | **Not a spec concern** — expressible with one shape rule |
| GAP-1 (item reorder) | **Not a spec concern** — `formspec_edit(move)` exists, discoverability issue |

---

## Detailed Root Cause Analysis by Layer

### Rust/WASM Layer (4 bugs)

#### BUG-2: Date comparison with `today()` always fails
- **Root:** `crates/fel-core/src/evaluator.rs`, `compare()` function
- **Cause:** No String→Date coercion path. When a date field's value comes from the response as a JSON string (e.g., `"2026-12-25"`), the FEL evaluator stores it as a string. `today()` returns a Date value. The comparison is String vs Date → type mismatch → evaluation error → null → constraint "passes" silently or reports failure depending on context.
- **Spec requirement:** S2.1.3 maps `dataType: "date"` to FEL type `date`. The engine MUST resolve `$field` for a date-typed field as a FEL `date` value, not a raw JSON string.
- **Fix:** Add String→Date coercion in the FEL evaluator when the field's declared dataType is `date`, or coerce at the point where response values enter the evaluation context.

#### BUG-3: Money comparison `> 0` silently broken
- **Root:** `crates/fel-core/src/evaluator.rs`, `compare()` function
- **Cause:** `compare()` rejects Money vs Number as incompatible types. Per spec, this is CORRECT — no implicit coercion (S3.4.3). The expression `$revenue > 0` is a type error.
- **Spec says:** Working-as-designed. `moneyAmount($revenue) > 0` is the correct expression.
- **BUT:** `fel(check)` (static analysis via `analyze_fel` in Rust) doesn't catch this type error at authoring time. The `analyze_fel` function in `crates/formspec-core/` does syntax validation but not type inference. This is the real tooling gap — the linter should warn.
- **Fix:** Add type inference to `analyze_fel` so `fel(check)` can warn about cross-type comparisons. NOT a runtime fix.

#### BUG-4: Conditional required on calculated fields
- **Root:** `crates/formspec-eval/src/recalculate/mod.rs`
- **Cause:** The Rust evaluation pipeline evaluates `required` before `calculate` has settled. The spec mandates topological evaluation order (S2.4) — if `required` on field B depends on field A's calculated value, A's calculate MUST evaluate first.
- **Fix:** Ensure the dependency graph includes edges from calculate targets to any bind that references them. The topological sort should naturally order calculate before dependent required expressions.

#### BUG-6: Required fires on repeat template with 0 instances
- **Root:** `crates/formspec-eval/src/rebuild/repeat_expand.rs`
- **Cause:** When repeat count is 0, the template path `group.field` still generates validation targets. Per spec, Phase 1 Rebuild re-indexes based on actual instances — zero instances means zero concrete paths, zero nodes to validate.
- **Fix:** Skip validation target generation for repeat group children when instance count is 0.

### Types Layer (1 bug)

#### BUG-13: Unknown `Checkbox` component type
- **Root:** `packages/formspec-types/src/widget-vocabulary.ts:10,32`
- **Cause:** `KNOWN_COMPONENT_TYPES` includes `'Checkbox'` and `SPEC_WIDGET_TO_COMPONENT` maps `checkbox → 'Checkbox'`, but the component schema has no `Checkbox` definition. The schema has `Toggle` for boolean fields. Phantom type in vocabulary with no schema backing.
- **Fix:** Remove `'Checkbox'` from `KNOWN_COMPONENT_TYPES`. Change `SPEC_WIDGET_TO_COMPONENT` entry from `checkbox: 'Checkbox'` to `checkbox: 'Toggle'`. Update `COMPONENT_TO_HINT` and `COMPATIBILITY_MATRIX`.
- **Cascade:** Also fixes BUG-15 (stray `bind` property — was actually caused by no `oneOf` branch matching the invalid type).

### Core Layer (1 bug)

#### BUG-12: Save omits required `status` field
- **Root:** `packages/formspec-core/src/raw-project.ts:148-156`, `createDefaultDefinition()`
- **Cause:** Factory function creates definition without `status`. Nothing downstream injects it. Marcus's form passed because he explicitly called `formspec_publish` with `set_status` action.
- **Fix:** Add `status: 'draft'` to `createDefaultDefinition()`. One-line change.

### Studio-core Layer (9 bugs + architectural issue)

#### BUG-1: `parentPath` doubles path prefix
- **Root:** `packages/formspec-studio-core/src/project.ts:598-613`, `_resolvePath()`
- **Cause:** When `parentPath` is provided AND `path` has dot notation, `_resolvePath` treats the prefix segments of `path` as additional nesting to prepend to `parentPath`, doubling it.
- **Fix:** Detect when `path` already starts with `parentPath + "."` and strip the prefix before splitting. Also fix `handleGroup` in MCP to use resolved `fullPath` for `makeRepeatable`.

#### BUG-5: Shape rules don't evaluate per-row
- **Root:** `packages/formspec-studio-core/src/project.ts`
- **Cause:** When `addValidation` auto-normalizes the shape target from `line_items.description` to `line_items[*].description`, the constraint expression is NOT rewritten to use per-instance references.
- **Fix:** When normalizing target to include `[*]`, also rewrite `$field` references in the constraint to use row-context `$` or `@current` syntax.

#### BUG-7: `remove_rule` ambiguous
- **Root:** `packages/formspec-studio-core/src/project.ts:1264-1306`, `removeValidation()`
- **Cause:** Compares raw target path against stored (normalized) shape targets. Stored targets may have `[*]` wildcards that the raw target doesn't. Also returns success even when nothing was removed.
- **Fix:** Normalize the target before comparison. Return error/warning when no matches found.

#### BUG-10: Content items not findable by `formspec_place`
- **Root:** `packages/formspec-studio-core/src/project.ts:2505-2513`, `placeOnPage()`
- **Cause:** Always uses `{ bind: leafKey }` to find nodes, but display/content items use `nodeId` instead of `bind` in the component tree.
- **Fix:** Check item type — display items use `{ nodeId: leafKey }`, data items use `{ bind: leafKey }`.

#### BUG-11: `describe` drops `groupPath` from first page
- **Root:** `packages/formspec-studio-core/src/project.ts:2471-2482`, `listPages()`
- **Cause:** Medium confidence — likely related to tree reconciler snapshot/restore displacing the first page's bound children during rebuild.
- **Fix:** Write a targeted test to reproduce. Defensive fix: `listPages` should walk both `bind` and `nodeId` children.

#### BUG-14: Component tree emits `widgetHint`
- **Root (primary):** `packages/formspec-studio-core/src/project.ts:713-718` — `addField()` stores `widgetHint` on component tree node
- **Root (safety):** `packages/formspec-core/src/raw-project.ts:105` — `cleanTreeForExport()` doesn't strip it
- **Fix:** Remove the `component.setNodeProperty` call for `widgetHint` in `addField()`. Add `widgetHint` to strip list in `cleanTreeForExport()`.

#### BUG-16: Repeat group component emits invalid props
- **Root:** `packages/formspec-core/src/raw-project.ts:105`, `cleanTreeForExport()`
- **Cause:** Denylist strips only 5 internal props. `repeatable`, `displayMode`, `addLabel`, `removeLabel` all survive export.
- **Fix (immediate):** Add these to the strip list.
- **Fix (architectural):** `cleanTreeForExport` should allowlist per component type using the schema, not denylist known internals.

#### Architectural Issue: `cleanTreeForExport` is the wrong abstraction
The component tree node type uses `[k: string]: unknown` — an open index signature with no compile-time guardrails. `component.setNodeProperty` accepts ANY property name. `cleanTreeForExport` is the sole gate, using a hardcoded denylist that never gets updated. **Better approach:** allowlist properties per component type using the schema as reference. This is self-correcting — new schema properties automatically pass through, authoring-only properties automatically stripped.

### MCP Layer (1 bug + UX issues)

#### BUG-9: Cross-document audit uses leaf key not full path
- **Root:** `packages/formspec-mcp/src/tools/audit.ts:108-127`
- **Cause:** `project.itemAt(node.bind)` searches by full path, but tree nodes store `bind: item.key` (leaf key only). Nested items can't be found.
- **Fix:** Use `buildBindKeyMap` to resolve leaf keys to full paths before calling `itemAt`.

#### UX Issues (summary — all traced to specific files)

| Issue | Root Layer | Root File | Fix |
|-------|-----------|-----------|-----|
| UX-1: No shape rule listing | MCP | `query.ts:handleDescribe` | Add `shapes` mode to describe |
| UX-2: `choices` silent strip | MCP | `create-server.ts:fieldPropsSchema` | Use `.strict()` on Zod schemas |
| UX-3: Bad sample data | studio-core | `project.ts:generateSampleData` | Make constraint-aware |
| UX-4: Create skips bootstrap | MCP docs | `guide.ts:OUTPUT_INSTRUCTIONS` | Document both paths |
| UX-5: No token validation | MCP+studio-core | `theme.ts` + `layout-ui-helpers.ts` | Surface token vocabulary |
| UX-6: Humanize no-op | studio-core | `authoring-helpers.ts:humanizeFEL` | Handle compound expressions |
| UX-7: Flat sample data | studio-core | `project.ts:generateSampleData` | Handle repeatable groups |
| UX-8: Content append-only | MCP | `create-server.ts:contentItemSchema` | Add `insertIndex` to Zod schema |
| UX-9: ID mismatch | MCP | `query.ts:handleDescribe` | Rename `id` → `page_id` |
| UX-10: No save prompt | cross-layer | core + studio-core + MCP | Add dirty-tracking, surface in responses |
| CONF-1: 3 parent mechanisms | MCP docs | `create-server.ts` tool descriptions | Document precedence rules |

---

## Recommended Fix Order

Fixes ordered by: masking effects (deeper fixes may resolve shallower symptoms), blast radius, and effort.

### Tier 1: Fix now (high impact, unblocks everything)

1. **BUG-12** — Add `status: 'draft'` to `createDefaultDefinition()`. 1-line fix. Unblocks schema validation for ALL saved forms.
2. **BUG-13** — Fix `widget-vocabulary.ts` phantom `Checkbox`. 4 edits in 1 file. Also fixes BUG-15.
3. **BUG-14** — Remove `widgetHint` storage on component nodes + add to strip list. Fixes 3 of 5 forms.
4. **BUG-16** — Add authoring props to `cleanTreeForExport` strip list. Fixes repeat group export.

*After Tier 1: all 5 chaos-test forms should pass schema validation.*

### Tier 2: Fix soon (spec violations in Rust/WASM)

5. **BUG-2** — Date coercion in FEL evaluator. Spec violation per S2.1.3.
6. **BUG-4** — Calculate-before-required evaluation order. Spec violation per S2.4.
7. **BUG-6** — Skip repeat template validation at 0 instances. Spec violation per S2.4 Phase 1.

### Tier 3: Fix next (studio-core correctness)

8. **BUG-1** — Fix `_resolvePath` double-prefix. 3 personas hit this.
9. **BUG-5** — Rewrite constraint expressions when normalizing repeat targets.
10. **BUG-7** — Normalize target in `removeValidation` + error on no-match.
11. **BUG-10** — Fix `placeOnPage` for display items (nodeId vs bind).

### Tier 4: Polish (UX, docs, low-hit bugs)

12. UX-1: Add shape listing to describe
13. UX-8: Add `insertIndex` to content Zod schema
14. BUG-9: Fix cross-document audit bind resolution
15. UX-2: Use `.strict()` on Zod schemas
16. All remaining UX issues and docs fixes

---

## Tech Debt Patterns

### Pattern 1: `cleanTreeForExport` denylist (5 bugs trace here)
BUG-14, BUG-16, and potentially future bugs all stem from a denylist that never gets updated. **Architectural fix:** switch to allowlist per component type.

### Pattern 2: Studio-core stores non-spec properties on spec structures
`widgetHint` on component nodes, `repeatable`/`addLabel` on component nodes — studio-core uses spec-tier structures as mutable bags for authoring metadata. **Architectural fix:** separate authoring metadata from spec structures (e.g., `_meta` namespace or shadow store).

### Pattern 3: FEL static analysis doesn't match runtime
`fel(check)` passes expressions that fail at runtime (BUG-3 money comparison, CONF-3 variable sigil). **Architectural fix:** add type inference to `analyze_fel` in Rust.

### Pattern 4: Path resolution inconsistency across tools
`parentPath` + dot-notation conflict (BUG-1), bind key vs full path (BUG-9), display item addressing (BUG-10). **Architectural fix:** single canonical path resolution function used by all tools.
