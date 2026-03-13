# `studiofixes` Review Against `main`

Date: 2026-03-13

Reviewed commit-by-commit against `main`, cumulatively.

## Findings

### `f33799a` `refactor: remove unused page management commands from studio schema`

None.

### `a2971d9` `fix: suppress keyboard shortcuts when focus is in text inputs`

None.

### `7d20b2f` `feat: synchronize page navigation between tree and editor canvas`

- Severity: Medium
- File: [packages/formspec-studio/src/components/blueprint/StructureTree.tsx](/Users/mikewolfd/Work/formspec/packages/formspec-studio/src/components/blueprint/StructureTree.tsx)
- Issue: `handleAddPage()` switched the active page using the optimistic UI key instead of the canonical `insertedPath`. If `page1` already exists and the core inserts `page1_1`, the new page is not selected and tree/canvas page state can desynchronize immediately.
- Status: Fixed later by `79157df`.

### `26df835` `fix: guard against root-level non-group items in paged definitions`

- Severity: Medium
- File: [packages/formspec-studio-core/src/handlers/definition-items.ts](/Users/mikewolfd/Work/formspec/packages/formspec-studio-core/src/handlers/definition-items.ts)
- Issue: The initial guard over-blocked root insertion when page mode was enabled before any page groups existed.
- Status: Fixed later.

- Severity: Medium
- File: [packages/formspec-studio-core/src/handlers/definition-items.ts#L599](/Users/mikewolfd/Work/formspec/packages/formspec-studio-core/src/handlers/definition-items.ts#L599)
- Issue: `definition.moveItem` can still move a field or display node back to root in wizard/tabs mode, recreating the hidden-root state the guard was intended to prevent.
- Status: Still open.

### `35fccd0` `fix: preserve display node identity through component tree rebuilds`

- Severity: High
- File: [packages/formspec-studio-core/src/project.ts](/Users/mikewolfd/Work/formspec/packages/formspec-studio-core/src/project.ts)
- Issue: Display nodes were originally preserved by bare `item.key`, so same-key displays under different parents collided, and deleted or renamed displays could survive as stale orphan root nodes.
- Status: Fixed later by `105e226`.

### `df5db39` `fix: show JSON parse errors in ImportDialog and fix doc comments`

None.

### `59d29db` `docs: add studio bug tracking and coverage gap documentation`

None.

### `5ff08b2` `test: add RED tests for all 47 coverage gaps across studio`

None.

### `dfcb383` `fix: resolve all 47 studio coverage gaps — 268 unit + 141 E2E green`

- Severity: Medium
- Files:
  - [packages/formspec-studio/src/components/Shell.tsx](/Users/mikewolfd/Work/formspec/packages/formspec-studio/src/components/Shell.tsx)
  - [packages/formspec-studio/src/workspaces/theme/ThemeTab.tsx](/Users/mikewolfd/Work/formspec/packages/formspec-studio/src/workspaces/theme/ThemeTab.tsx)
  - [packages/formspec-studio/src/workspaces/mapping/MappingTab.tsx](/Users/mikewolfd/Work/formspec/packages/formspec-studio/src/workspaces/mapping/MappingTab.tsx)
  - [packages/formspec-studio/src/workspaces/preview/PreviewTab.tsx](/Users/mikewolfd/Work/formspec/packages/formspec-studio/src/workspaces/preview/PreviewTab.tsx)
- Issue: Theme/Mapping/Preview sub-tab and view state remained component-local, so switching workspaces remounted them and reset the active sub-tab, preview mode, preview viewport, and mapping config collapse state.
- Status: Fixed later by `8e211c5`.

- Severity: Medium
- File: [packages/formspec-studio/src/workspaces/mapping/MappingPreview.tsx](/Users/mikewolfd/Work/formspec/packages/formspec-studio/src/workspaces/mapping/MappingPreview.tsx)
- Issue: Preview defaulted an unset mapping direction to `outbound`, even though the rest of the UI treated `unset` as a first-class state.
- Status: Fixed later by `621d8d8`.

- Severity: Medium
- File: [packages/formspec-studio/src/components/ui/FELReferencePopup.tsx](/Users/mikewolfd/Work/formspec/packages/formspec-studio/src/components/ui/FELReferencePopup.tsx)
- Issue: The popup still hardcoded a function catalog that diverged from the engine and suggested invalid or missing FEL functions.
- Status: Fixed later by `9b65e1d`.

### `105e226` `fix: resolve chunk 1 studio correctness bugs`

- Severity: High
- Files:
  - [packages/formspec-studio-core/src/handlers/definition-screener.ts#L45](/Users/mikewolfd/Work/formspec/packages/formspec-studio-core/src/handlers/definition-screener.ts#L45)
  - [packages/formspec-webcomponent/src/element.ts#L144](/Users/mikewolfd/Work/formspec/packages/formspec-webcomponent/src/element.ts#L144)
  - [packages/formspec-webcomponent/src/element.ts#L390](/Users/mikewolfd/Work/formspec/packages/formspec-webcomponent/src/element.ts#L390)
- Issue: Studio core now preserves a disabled screener as `{ enabled: false, ... }`, but preview/runtime still treats any truthy `screener.items` as active. Disabling the screener in studio can still render and block on the screener in preview.
- Status: Still open.

### `3a3b2d0` `fix: remove dead controls from studio chunk 2`

None.

### `882bff3` `fix: rewrite path references when moveItem changes canonical paths`

- Severity: High
- File: [packages/formspec-studio-core/src/handlers/definition-items.ts#L190](/Users/mikewolfd/Work/formspec/packages/formspec-studio-core/src/handlers/definition-items.ts#L190)
- Issue: `rewritePathPrefix()` rewrites only the first `oldParts.length` segments. When a move increases depth, descendant paths lose the moved node name. Example: moving `field` to `group.field` rewrites `field.child` to `group.child` instead of `group.field.child`.
- Impact: Corrupts bind paths, shape targets, FEL references, and mapping paths for moved subtrees.
- Status: Still open.

- Severity: Medium
- File: [packages/formspec-studio-core/src/handlers/definition-items.ts#L338](/Users/mikewolfd/Work/formspec/packages/formspec-studio-core/src/handlers/definition-items.ts#L338)
- Issue: Mapping `innerRules[*]` rewrite `sourcePath`, `expression`, and `condition`, but skip `innerRules[*].reverse`, leaving stale references in nested reverse overrides after move or rename.
- Status: Still open.

### `a0d0427` `refactor: widen CommandResult to expose insertedPath and newPath`

- Severity: Medium
- Files:
  - [packages/formspec-studio-core/src/types.ts](/Users/mikewolfd/Work/formspec/packages/formspec-studio-core/src/types.ts)
  - [packages/formspec-studio/src/workspaces/editor/EditorCanvas.tsx](/Users/mikewolfd/Work/formspec/packages/formspec-studio/src/workspaces/editor/EditorCanvas.tsx)
  - [packages/formspec-studio/src/components/blueprint/StructureTree.tsx](/Users/mikewolfd/Work/formspec/packages/formspec-studio/src/components/blueprint/StructureTree.tsx)
- Issue: The type exposed `insertedPath/newPath`, but callers in-range still fabricated canonical paths locally or ignored dispatch results. Duplicate-key inserts could select nonexistent unsuffixed paths, and `wrapInGroup` could target the wrong parent path if the wrapper key was auto-suffixed.
- Status: Fixed later by `79157df`.

### `79157df` `fix: consume canonical paths from dispatch in EditorCanvas and StructureTree`

None.

### `8e211c5` `fix: hoist workspace tab state to Shell to prevent reset on switch`

None.

### `621d8d8` `fix: align mapping direction default to 'unset' in MappingPreview`

None.

### `9b65e1d` `fix: replace hardcoded FEL catalog with engine's live function list`

- Severity: Medium
- File: [packages/formspec-studio/src/components/ui/FELReferencePopup.tsx#L31](/Users/mikewolfd/Work/formspec/packages/formspec-studio/src/components/ui/FELReferencePopup.tsx#L31)
- Issue: The popup still relies on a partial manual `FUNCTION_DETAILS` table. Engine functions missing from that table, including `ceil`, `matches`, `readonly`, `hours`, `minutes`, `seconds`, `isDate`, `isNumber`, and `isString`, are shown and copied with an incorrect zero-arg fallback signature.
- Status: Still open.

### `9df5e3e` `docs: add studio implementation review notes and fix plan`

None.

### `edf5591` `refactor: adopt WorkspacePage layout in ThemeTab and LogicTab`

- Severity: Low
- File: [packages/formspec-studio/src/workspaces/mapping/MappingTab.tsx#L61](/Users/mikewolfd/Work/formspec/packages/formspec-studio/src/workspaces/mapping/MappingTab.tsx#L61)
- Issue: The active-tab styling checks the raw `activeTab` prop instead of the derived `active` state. In uncontrolled usage of `<MappingTab />`, no tab is visually active.
- Status: Still open.

## Remaining Open Issues On `studiofixes`

1. `definition.moveItem` can still create root-level hidden items in paged mode.
2. Disabled screener state is not honored by preview/runtime.
3. `rewritePathPrefix()` corrupts descendant paths when a move increases depth.
4. Mapping `innerRules[*].reverse` references are not rewritten on move/rename.
5. FEL popup metadata is still incomplete for several live engine functions.
6. `MappingTab` uncontrolled usage no longer highlights the active tab.
