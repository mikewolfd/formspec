# Studio → Studio-Core Migration Analysis

**Date:** 2026-03-20
**Goal:** Classify business logic in `formspec-studio` that should be consolidated into `formspec-studio-core`. Studio-core should be purely behavior-driven. Studio should not know or care about JSON schemas.

---

## Executive Summary

Studio currently contains **6 categories** of business logic that leak into the UI layer:

1. **Field type catalog & type metadata** — hardcoded domain knowledge about formspec data types
2. **FEL expression utilities** — parsing, validation, highlighting, autocomplete
3. **Tree/path manipulation** — flattening, lookup, descendant pruning
4. **Widget compatibility** — mapping data types to compatible widgets
5. **Serialization adapters** — XML/CSV/JSON output formatting
6. **Document normalization** — preparing definition/component/theme docs for preview

Studio-core already has a rich 100+ method `Project` class that handles most CRUD operations. The gap is in **query/introspection helpers** and **catalogs** that studio uses to present editing UI.

---

## Category 1: Field Type Catalog & Type Metadata

### MOVE → studio-core

**File:** `packages/formspec-studio/src/components/AddItemPalette.tsx`
- **`FIELD_TYPE_CATALOG`** (lines 28–265): Complete catalog of all addable item types with metadata (label, description, icon, color, dataType, keywords, category). This is domain knowledge — which field types exist and what they mean. The UI should just render whatever the core provides.
- **`FieldTypeOption` interface**: The shape of a catalog entry.

**File:** `packages/formspec-studio/src/lib/field-helpers.ts`
- **`TYPE_MAP`** (lines 68–85): Maps data types to display metadata (icon, label, color). Duplicates domain knowledge that's also in the catalog.
- **`dataTypeInfo()`** (line 88): Lookup function for type display info.
- **`propertyHelp`** (lines 139–161): Help text for property labels. This is spec-derived domain knowledge, not UI.

### Already in studio-core
- `field-type-aliases.ts` has `FIELD_TYPE_MAP` mapping type aliases → canonical dataTypes. Related but different purpose.

### Recommendation
Create a `catalogs.ts` in studio-core that exports:
- `getFieldTypeCatalog(): FieldTypeOption[]` — the full addable-types catalog
- `getDataTypeInfo(dataType: string): DataTypeDisplay` — type display metadata
- `getPropertyHelp(): Record<string, string>` — help text

---

## Category 2: FEL Expression Utilities

### MOVE → studio-core

**File:** `packages/formspec-studio/src/lib/fel-editor-utils.ts` (entire file, 456 lines)
All of this is pure business logic with zero UI coupling:
- **`validateFEL()`** (line 71): Validates FEL syntax using the lexer/parser. Pure function.
- **`buildFELHighlightTokens()`** (line 94): Tokenizes FEL for syntax highlighting. Pure function.
- **`getFELAutocompleteTrigger()`** (line 151): Determines autocomplete context from cursor position. Pure function.
- **`getFELInstanceNameAutocompleteTrigger()`** (line 197): Instance name autocomplete. Pure function.
- **`getFELFunctionAutocompleteTrigger()`** (line 239): Function name autocomplete. Pure function.
- **`filterFELFieldOptions()`** (line 271): Filters/sorts field options for autocomplete. Pure function.
- **`filterFELFunctionOptions()`** (line 294): Filters/sorts function options. Pure function.
- **`getInstanceFieldOptions()`** (line 320): Extracts field paths from instance schemas/data. Pure function.
- **`getInstanceNameOptions()`** (line 222): Filters instance names. Pure function.
- All supporting types (`FELEditorFieldOption`, `FELAutocompleteTrigger`, `FELHighlightToken`, etc.)

**File:** `packages/formspec-studio/src/lib/fel-catalog.ts` (entire file, 112 lines)
- **`FUNCTION_DETAILS`** (line 27): Signatures and descriptions for all ~60 FEL functions.
- **`getFELCatalog()`** (line 101): Merges engine's function catalog with display metadata.
- **`CATEGORY_COLORS`** / **`CATEGORY_ORDER`**: Display metadata for function categories.
- **`formatCategoryName()`**: String formatting utility.

**File:** `packages/formspec-studio/src/lib/humanize.ts` (entire file, 44 lines)
- **`humanizeFEL()`**: Converts simple FEL expressions to human-readable strings. Pure function.

### Recommendation
Create `fel-editing.ts` in studio-core that consolidates all FEL editing support:
- Expression validation, highlighting, autocomplete triggers
- Function catalog with metadata
- Humanization

This lets any future studio client (web, mobile, CLI) use the same FEL editing intelligence without depending on the Preact-based studio.

---

## Category 3: Tree & Path Manipulation

### MOVE → studio-core

**File:** `packages/formspec-studio/src/lib/tree-helpers.ts` (entire file, 200 lines)
All pure data structure operations:
- **`buildDefLookup()`** (line 81): Builds flat lookup map from definition items. Used extensively.
- **`buildBindKeyMap()`** (line 103): Secondary lookup from item key → path.
- **`flattenComponentTree()`** (line 122): Walks component tree producing flat entries. Core to both canvas rendering and DnD.
- **`isLayoutId()` / `nodeIdFromLayoutId()` / `nodeRefFor()`**: Identity helpers.
- All supporting types (`FlatEntry`, `DefLookupEntry`, `CompNode`).

**File:** `packages/formspec-studio/src/lib/selection-helpers.ts` (entire file, 55 lines)
All pure functions for multi-select operations:
- **`pruneDescendants()`** (line 7): Removes paths whose ancestors are in the set.
- **`sortForBatchDelete()`** (line 23): Sorts paths deepest-first for safe deletion.
- **`buildBatchMoveCommands()`** (line 40): Builds move command payloads.

**File:** `packages/formspec-studio/src/lib/field-helpers.ts`
- **`flatItems()`** (line 18): Flattens nested item tree into flat list with paths.
- **`bindsFor()`** (line 31): Gets bind properties for a field path.
- **`shapesFor()`** (line 52): Gets shapes targeting a specific path.

### Recommendation
Studio-core already has `Project.fieldPaths()`, `Project.itemAt()`, `Project.bindFor()`. Extend with:
- `flattenDefinition()` — replaces `flatItems()`
- `flattenComponentTree()` — the component tree flattening
- `pruneDescendants()` / `sortForBatchDelete()` — selection utilities
- `buildDefLookup()` — the definition lookup builder

These are all used by DnD, context menus, batch operations — behavior that should work identically regardless of rendering technology.

---

## Category 4: Widget Compatibility

### MOVE → studio-core

**File:** `packages/formspec-studio/src/lib/field-helpers.ts`
- **`ITEM_TYPE_WIDGETS`** (lines 97–100): Maps non-field item types to compatible widget names.
- **`compatibleWidgets()`** (line 103): Returns compatible widget components for a type+dataType combo.
- **`widgetHintForComponent()`** (line 111): Converts component → widgetHint token.
- **`componentForWidgetHint()`** (line 130): Converts widgetHint → component id.

### Already in studio-core
- `field-type-aliases.ts` has `resolveWidget()` and `widgetHintFor()` — related but focused on aliases, not compatibility matrices.

### Recommendation
Add `compatibleWidgets()` and the bidirectional hint ↔ component mapping to studio-core. The UI component (`WidgetHintSection.tsx`) currently calls these helpers directly — it should instead call `project.compatibleWidgets(type, dataType)` or similar.

---

## Category 5: Serialization Adapters

### MOVE → studio-core

**File:** `packages/formspec-studio/src/workspaces/mapping/adapters.ts` (entire file, 187 lines)
Complete serialization logic for mapping preview:
- **`serializeMappedData()`**: Dispatches to format-specific serializers.
- **`toJSON()`**: JSON serialization with null stripping, key sorting, pretty printing.
- **`toXML()`**: Full XML serializer with namespaces, CDATA, declaration.
- **`toCSV()`**: CSV serializer with quoting, delimiters, headers.
- **`AdapterOptions` interface**: Configuration for all three formats.

This is pure business logic. Zero DOM/UI dependency. Currently in studio because the mapping preview needed it, but it belongs in core.

### Recommendation
Move to studio-core as `serialization-adapters.ts` or integrate with the existing `Project.previewMapping()` method.

---

## Category 6: Document Normalization

### MOVE → studio-core

**File:** `packages/formspec-studio/src/workspaces/preview/preview-documents.ts` (84 lines)
- **`normalizeDefinitionDoc()`**: Normalizes `presentation` → `formPresentation`.
- **`normalizeComponentDoc()`**: Normalizes component tree root and wires targetDefinition URL.
- **`normalizeThemeDoc()`**: Merges user theme with default theme, wires targetDefinition.

These are the bridge between studio's document model and the webcomponent's expectations. This normalization logic is spec behavior, not UI.

### Recommendation
Move to studio-core. `Project.export()` already exists — these normalizations could become part of a `Project.exportForPreview()` or `Project.exportBundle()` that produces webcomponent-ready documents.

---

## Category 7: Drop Target Computation (DnD Logic)

### MOVE → studio-core

**File:** `packages/formspec-studio/src/workspaces/editor/dnd/compute-drop-target.ts` (294 lines)
Heavy pure logic for DnD positioning:
- **`computeDropTarget()`**: Given source, target, position, and flat list, computes the drop target for both definition and component moves.
- **`buildSequentialMoves()`**: Builds sequential move descriptors for multi-item DnD.
- **`isDescendantOf()`**: Descendant check with flat-list traversal.
- All helper functions for resolving component/definition targets.

This is algorithm-heavy logic with zero DOM dependency. It operates on the `FlatEntry[]` data structure and returns move descriptors that are fed to `Project.moveItem()` and `Project.moveLayoutNode()`.

### Recommendation
Move to studio-core alongside the tree helpers it depends on. Expose as `computeDropTarget()` and `buildSequentialMoves()`.

---

## Category 8: Canvas Operations (Context Menu Actions)

### KEEP in studio (mostly)

**File:** `packages/formspec-studio/src/workspaces/editor/canvas-operations.ts` (197 lines)
- **`buildContextMenuItems()`**: Returns menu items based on selection state. This is **UI menu structure** — keep in studio.
- **`executeContextAction()`**: Dispatches to `Project.*` methods based on action string. This is a **thin UI dispatcher** — the actual business logic (delete, duplicate, wrap, move) is already in `Project`. Keep in studio.
- **`clampContextMenuPosition()`**: Uses `window.innerWidth` — definitely UI. Keep in studio.

---

## Category 9: Bind Normalization (Duplicated)

### MOVE → studio-core

**File:** `packages/formspec-studio/src/workspaces/logic/LogicTab.tsx` (lines 52–74)
- **`normalizeBinds(binds, items)`**: Converts the definition's `binds` (array form) into a grouped `Record<path, BindEntry>`, and extracts `prePopulate` from item definitions into the same structure. Merges two separate definition structures into one unified view.

**File:** `packages/formspec-studio/src/components/CommandPalette.tsx` (lines 23–39)
- **`normalizeBinds(binds)`**: Another local implementation — same concept, slightly different shape. Classic code smell from duplicated domain logic.

### Recommendation
Add `Project.getBindsView()` or `normalizeBinds()` to studio-core. Both call sites consume the same merged view.

---

## Category 10: Sample Data Generation & Engine Seeding

### MOVE → studio-core

**File:** `packages/formspec-studio/src/workspaces/mapping/MappingPreview.tsx` (lines 19–85)
- **`generateSchemaSample()`**: Creates a FormEngine, walks all definition items, generates type-appropriate fake data using `@faker-js/faker` with key-name heuristics (e.g., `keyLower.includes('email')` → faker email), handles repeatable groups. Significant data generation algorithm.

**File:** `packages/formspec-studio/src/workspaces/data/TestResponse.tsx` (lines 7–17)
- **`seedInitialValues(engine, items, prefix)`**: Recursively walks definition items, calls `engine.setValue()` for fields with non-expression initial values. Duplicates engine initialization logic that `evaluation-helpers.ts` in studio-core also handles.

### Recommendation
Add `Project.generateSampleData()` and consolidate engine seeding into studio-core's existing `previewForm()` / `validateResponse()` helpers.

---

## Category 11: Definition Queries (Option Sets, Search Index)

### MOVE → studio-core

**File:** `packages/formspec-studio/src/workspaces/data/OptionSets.tsx` (lines 49–59)
- Usage count computation: Uses `flatItems()` to walk all definition items and count references to each `optionSet` by name. Pure cross-definition query.

**File:** `packages/formspec-studio/src/components/CommandPalette.tsx` (lines 60–121)
- Search index construction: Builds a flat list of searchable results from items, variables, binds, and shapes with keyword arrays encoding what terms each entity matches against. This is a search-index over the definition.

### Recommendation
Add `Project.getOptionSetUsage()` and `Project.getSearchIndex()` methods to studio-core. These are pure queries that any consumer (not just the React UI) would benefit from.

---

## Category 12: Widget Resolution Priority

### MOVE → studio-core

**File:** `packages/formspec-studio/src/workspaces/editor/properties/WidgetHintSection.tsx` (lines 21–25)
- Three-way widget resolution: `widgetHint presentation → component tree override → compatibility-matrix default`. This precedence order is a spec-level rule embedded in a React component.

### Recommendation
Add `Project.resolvedWidgetFor(path)` that encapsulates this resolution order.

---

## What Should NOT Move

### Pure UI State (KEEP in studio)
- `state/useSelection.tsx` — multi-select state with React context. Pure UI concern (which items are highlighted).
- `state/useActivePage.tsx` — which page tab is active. UI navigation state.
- `state/useCanvasTargets.tsx` — DOM element registry for scroll-to. Purely DOM-bound.
- `state/ProjectContext.tsx` — React context provider. Framework binding.
- All `use*.ts` hooks — React framework glue.

### Pure UI Components (KEEP in studio)
- All `.tsx` component files in `components/`, `workspaces/`, `features/`
- `lib/keyboard.ts` — keyboard shortcut handling
- `workspaces/editor/block-utils.ts` — CSS indent calculation, DOM ref factory

### UI Catalog Constants (KEEP in studio)
- `CATEGORY_COLORS` in `fel-catalog.ts` — CSS class names for display
- Icon glyphs and color classes in `TYPE_MAP`

Note: The **data** (which categories exist, which functions exist) should move. The **presentation** (colors, icons) stays.

---

## Migration Priority

| Priority | Category | Files | Lines | Impact |
|----------|----------|-------|-------|--------|
| **P0** | FEL editing utils | `fel-editor-utils.ts`, `fel-catalog.ts`, `humanize.ts` | ~612 | Unblocks FEL editor reuse |
| **P0** | Tree/path helpers | `tree-helpers.ts`, `selection-helpers.ts`, parts of `field-helpers.ts` | ~300 | Unblocks DnD/canvas reuse |
| **P0** | Bind normalization | `LogicTab.tsx`, `CommandPalette.tsx` (duplicated!) | ~60 | Eliminates duplication |
| **P1** | Field type catalog | Part of `AddItemPalette.tsx`, part of `field-helpers.ts` | ~300 | Unblocks item palette reuse |
| **P1** | Drop target computation | `compute-drop-target.ts` | ~294 | Unblocks DnD reuse |
| **P1** | Widget compatibility | Part of `field-helpers.ts`, `WidgetHintSection.tsx` | ~50 | Clean API boundary |
| **P1** | Definition queries | `OptionSets.tsx`, `CommandPalette.tsx` | ~80 | Reusable queries |
| **P2** | Serialization adapters | `adapters.ts` | ~187 | Already works, lower urgency |
| **P2** | Document normalization | `preview-documents.ts` | ~84 | Could fold into Project.export |
| **P2** | Sample data generation | `MappingPreview.tsx`, `TestResponse.tsx` | ~100 | Consolidates engine seeding |

---

## Schema Coupling Found in Studio

Studio does **not** directly import or reference JSON schema files from `schemas/`. However, it has **implicit schema knowledge** in several places:

1. **`propertyHelp`** in `field-helpers.ts` — descriptions copied from schema `description` fields
2. **`FIELD_TYPE_CATALOG`** — encodes which `dataType` values are valid and their metadata
3. **`TYPE_MAP`** — encodes the full set of data types
4. **`ITEM_TYPE_WIDGETS`** — encodes which component types work with which item types
5. **`bindTypes`** in `BindsSection.tsx` — hardcodes the list of valid bind types (`required`, `relevant`, `calculate`, `constraint`, `readonly`, `pre-populate`)

None of these reference schema files at runtime, but they duplicate knowledge that the schemas define. Moving them to studio-core consolidates this domain knowledge in one place and lets it be derived from the spec/schemas if desired.

---

## Proposed Studio-Core API Additions

```typescript
// catalogs.ts
export function getFieldTypeCatalog(): FieldTypeOption[];
export function getDataTypeInfo(dataType: string): DataTypeDisplay;
export function getPropertyHelp(): Record<string, string>;
export function compatibleWidgets(type: string, dataType?: string): string[];

// fel-editing.ts
export function validateFEL(expression: string): string | null;
export function buildFELHighlightTokens(expression: string, sigs?: Record<string, string>): FELHighlightToken[];
export function getFELAutocompleteTrigger(expression: string, caret: number): FELAutocompleteTrigger | null;
export function getFELFunctionAutocompleteTrigger(expression: string, caret: number): FELAutocompleteTrigger | null;
export function getFELInstanceNameAutocompleteTrigger(expression: string, caret: number): FELAutocompleteTrigger | null;
export function filterFELFieldOptions(options: FELEditorFieldOption[], query: string): FELEditorFieldOption[];
export function filterFELFunctionOptions(options: FELEditorFunctionOption[], query: string): FELEditorFunctionOption[];
export function getInstanceFieldOptions(instances: Record<string, FormspecInstance> | undefined, instanceName: string): FELEditorFieldOption[];
export function getInstanceNameOptions(instances: Record<string, FormspecInstance> | undefined, query: string): string[];
export function getFELFunctionCatalog(): FELFunction[];
export function humanizeFEL(expression: string): string;

// tree-operations.ts
export function buildDefLookup(items: FormItem[], prefix?: string): Map<string, DefLookupEntry>;
export function buildBindKeyMap(defLookup: Map<string, DefLookupEntry>): Map<string, string>;
export function flattenComponentTree(root: CompNode, defLookup: Map<string, DefLookupEntry>, bindKeyMap?: Map<string, string>): FlatEntry[];
export function flattenDefinition(items: FormItem[], prefix?: string): FlatItem[];
export function pruneDescendants(paths: Set<string>): string[];
export function sortForBatchDelete(paths: string[]): string[];
export function computeDropTarget(activePath: string, overPath: string, position: DropPosition, flatList: FlatEntry[], selectedPaths?: Set<string>): DropTarget | null;
export function buildSequentialMoves(sortedPaths: string[], targetParentPath: string | null, rawTargetIndex: number, flatList: FlatEntry[]): DefinitionMove[];

// serialization.ts
export function serializeMappedData(data: any, options: AdapterOptions): string;

// queries.ts (new Project methods)
Project.getBindsView(): Record<string, BindEntry>;       // replaces 2x normalizeBinds()
Project.getOptionSetUsage(): Record<string, number>;     // replaces inline flatItems loop
Project.getSearchIndex(): SearchEntry[];                 // replaces CommandPalette index builder
Project.resolvedWidgetFor(path: string): string;         // replaces 3-way inline resolution
Project.generateSampleData(): Record<string, unknown>;   // replaces faker-based generation
Project.exportForPreview(): { definition; component; theme };  // replaces preview-documents.ts
```
