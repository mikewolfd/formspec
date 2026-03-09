# Studio v2 — Prioritized Task List

> Goal: spec/schema parity + feature-complete no-code editor (Google Forms / Notion style).
> Reference: `thoughts/PRD-v2.md`, `thoughts/studio-v2-plan.md`, all `schemas/*.json`, all `specs/**/*.llm.md`.
> Last updated: 2026-03-05 (session 8: `@instance` FEL autocomplete completed in the FELEditor and verified via integration tests).

---

## How to Work This List

### Philosophy

All code is ephemeral. There are zero users, zero deployments, zero backwards compatibility constraints. When something is wrong — wrong abstraction, wrong location, accumulated cruft — throw it away and rebuild. Don't band-aid, don't add layers to avoid touching existing code, don't refactor for fun. If a file is ugly but functional and not blocking the current task, leave it alone.

**KISS always.** Many tasks below (especially P2–P4 property editors) can share a single generic "property editor" pattern rather than requiring a custom component per property. Three similar lines are better than one confusing helper. Don't invent complexity that isn't there.

**Extensibility where the spec demands it.** Formspec has extension points (`x-*` properties, custom components, registries). Build clean seams at those boundaries but nowhere else.

### Source of Truth

Structural truth lives in `schemas/*.json`. Behavioral semantics live in canonical specs (`specs/**/*.md`). For quick context, prefer the generated `specs/**/*.llm.md` files. The studio must produce JSON that validates against all relevant schemas — that is the definition of "spec parity."

When a task says "the spec defines X" — verify against the schema first. Schemas are normative for structure; spec prose is normative for behavior that schemas can't express.

### Red-Green-Refactor

Every task follows this loop. Do NOT write implementation before a failing test exists.

1. **Red** — Write one minimal failing test. Run it, confirm it fails for the right reason.
2. **Green** — Make it pass with the simplest change that works.
3. **Expand** — Add tests for edge cases and the full requirement.
4. **Verify** — Run the full suite to confirm zero regressions.

### Test Strategy

The goal is confidence in correctness, not test quantity. One well-chosen integration test exercising the real path is worth more than ten unit tests mocking every seam.

| Task type | Test layer | Location |
|---|---|---|
| State mutations (P0, P1 wiring) | Unit tests (Vitest) | `form-builder/src/__tests__/` |
| Inspector/surface behavior | Integration tests (Vitest + happy-dom) | `form-builder/src/__tests__/` |
| Full user workflows (smoke test) | E2E (Playwright) | `tests/e2e/playwright/studio/` |
| Schema validation of output | Unit: Ajv against `schemas/*.json` | `form-builder/src/__tests__/` |
| Engine correctness | Unit/integration | `packages/formspec-engine/tests/` |

Don't test trivial getters/setters, framework glue, or type-system-enforced invariants.

### Verification Commands

```bash
# Studio dev server
npm run dev --workspace=form-builder

# Studio unit/integration tests
npx vitest run --workspace=form-builder

# Studio E2E tests
npx playwright test tests/e2e/playwright/studio/

# Validate generated artifacts against schemas
python3 -m formspec.validate <artifact-dir> --registry registries/formspec-common.registry.json

# Full engine test suite (check for regressions)
npm test

# Build all packages (check for type errors)
npm run build
```

---

## P0 — Spec Violations (invalid output today)

These produce structurally invalid JSON that will fail schema validation or be rejected by conformant processors. Fix before anything else.

**Approach:** These are small, surgical fixes — not rewrites. Write a failing schema-validation test first (Ajv against `definition.schema.json` or `component.schema.json`), then fix. If you discover the surrounding code is tangled enough that the fix is awkward, that's a signal to rewrite the module from scratch rather than patching around it.

- [x] **`precision` stored in bind instead of item.** Fixed: `FieldInspector` now uses `setItemProperty(project, path, 'precision', value)`.
- [x] **Non-conformant component names.** Fixed in `field-templates.ts`:

  | Template | Studio Uses | Spec Name | Fix |
  |---|---|---|---|
  | Long Answer | `Textarea` | `TextInput` | Use `TextInput` with `maxLines > 1` |
  | Multiple Choice | `ChoiceGroup` | `CheckboxGroup` | Use `CheckboxGroup` |
  | Yes/No | `Checkbox` | `Toggle` | Use `Toggle` |

- [x] **Additional component name mismatches in templates/wiring:** Fixed in `field-templates.ts`:

  | Template | Studio Uses | Spec Name | Fix |
  |---|---|---|---|
  | Date | `DateInput` | `DatePicker` | Rename |
  | Heading/Instructions | `DisplayText` | `Heading` / `Text` | Map heading to `Heading`, instructions/display to `Text` |
  | Section/Group | `Section` | `Stack` | Use `Stack` (already correct in wiring.ts, but templates show `Section`) |
  | Page Break | `PageBreak` | `Page` | Use `Page` component |
  | Likert Scale | `LikertScale` | — | Not in 33 built-ins; remove or gate behind extension registry |

- [x] **`AppearanceSection` fallback widget names use wrong casing.** Fixed: `DEFAULT_WIDGET_OPTIONS` now uses PascalCase (`TextInput`, `Select`, etc.).

---

## P1 — Core No-Code Editor (Google Forms parity)

A non-technical user can build a multi-page form with conditional logic, calculated fields, required validation, and custom branding without seeing JSON or FEL.

**Approach:** State wiring tasks are pure logic — unit-test them against `mutations.ts` and `wiring.ts` with Vitest. Surface/tree/inspector tasks are interaction behavior — integration-test with Vitest + happy-dom. The smoke test scenario is an E2E Playwright test that exercises the critical path end-to-end. If the current wiring code is too tangled to test cleanly, rewrite it from scratch — prior code is a learning artifact, not an asset to protect.

### Smoke Test Scenario

Run this end-to-end before starting new work. Every item below must pass:

1. Open studio → blank page with "Type / to add a field"
2. Edit title → "Grant Application"
3. `/` → Short Answer → "Organization Name" → Required ON
4. `/` → Dropdown → "Organization Type" → add options: Nonprofit / University / Other
5. `/` → Short Answer → "Sub-type"
6. Select Sub-type → Logic → Show when → `Org Type` equals `University`
7. Toggle preview → fill out form → Sub-type only appears when University selected
8. Clear Org Name → required error fires

### State Wiring (correctness)

- [x] **Rename → FEL rewrite.** Fixed: `renameItem` in `mutations.ts` rewrites all `$path` references in binds, shapes, variables, and calculate expressions. Tested.
- [x] **Move into/out of group → bind path rewrite.** Fixed: `moveItem` in `mutations.ts` rewrites descendant paths (e.g., `amount` → `budget.amount`). Tested.
- [x] **Delete → orphan cleanup.** Fixed: `deleteItem` removes binds, shapes (by target), and variables scoped to deleted paths. Tested.
- [x] **Repeat toggle → `[*]` promotion.** Fixed: `setGroupRepeatable` in `mutations.ts` rewrites descendant paths from `group.field` to `group[*].field` on enable, and reverts on disable. `GroupInspector` uses it. Tested.
- [x] **Bind garbage collection.** Already implemented via `isEmptyBind` in `mutations.ts` — bind entry is removed when all properties are cleared.

### Form Surface

- [x] **Inline required toggle** (PRD §3.3). Star `*` button on each field's hover state; toggles `bind.required` directly from the surface.
- [x] **Option drag-to-reorder.** Fixed: `ChoiceOptionsEditor` in `FieldBlock.tsx` now supports HTML5 drag-and-drop reorder. Drag grip icon (⠿) shown on each row. Visual drop-target highlight via `is-drag-target` class.
- [x] **Slash command reliability.** Fixed: form surface now programmatically focuses itself after any field selection and on empty-area clicks, ensuring `onKeyDown` for `/` reliably fires.
- [x] **Field click disambiguation.** Fixed: `InlineEditableText` now only enters edit mode when `editEnabled` prop is true (only set when the item is already selected). First click selects; second click on label edits. Dotted underline hint shown on hover when editable.
- [x] **Add-between button discoverability.** Fixed: "Insert field here" buttons now have `opacity: 0.3` at rest instead of `opacity: 0`.

### Structure Tree

- [x] **Logic badges on tree nodes.** Already implemented — `collectLogicBadges` in `TreeNode.tsx` emits `●` `?` `=` `!` `L` badges for required/relevant/calculate/constraint/readonly.
- [x] **Reparent via drag.** Fixed: cross-group reparenting works for non-empty open groups via existing drop zones. Added empty-group drop zone: when dragging is active, a drop zone is rendered inside groups with no children (so you can drop into empty groups).
- [x] **Structure tree contrast.** Fixed: `.structure-panel` now has a distinct background (`#f8fafc`), `.structure-node__label` has stronger contrast (`#111827`, `letter-spacing: -0.01em`), and hover/selected states are clear.

### Diagnostics

- [x] **Click-to-navigate.** Already implemented — `DiagnosticsBar` renders entries with `entry.navigation` as clickable buttons that call `onNavigate` → `setSelection`.

### Logic Builders

- [x] **ConstraintBuilder full operator set.** Verified: `afterDate` serializes as `$ > "date"` and `beforeDate` as `$ < "date"` (strict operators, distinct from `>=`/`<=` used for atLeast/atMost). `parseConstraintExpression` calls `isLikelyDateLiteral()` on the literal before mapping `>` → afterDate / `<` → beforeDate. Round-trip is correct for valid date strings (ISO 8601 format). Typing `$ > 10` (non-date) in FEL correctly falls back to "too complex" in visual mode.
- [x] **ExpressionToggle "too complex" path.** Implemented and verified: when `parse()` returns null, mode auto-starts in `fel`; switching back to visual shows `"Expression is too complex for visual builder."` warning (data-testid `...-too-complex`) and blocks the switch. Covered by `logic-builders.integration.test.tsx` (constraint builder fallback test).
- [x] **`$` vs `$fieldName` disambiguation.** Verified correct: `ConstraintBuilder` always uses bare `$` (current field value); `ConditionBuilder` always uses `$fieldPath` syntax. They are separate components with distinct serialization paths — no conflation possible.
- [x] **Condition builder field-name validation.** Fixed: `ConditionBuilder` shows `logic-builder__path-warning` inline when selected path is not in the form's field list.
- [x] **No "else" branch in condition builder.** Fixed: `ExpressionToggle` now accepts an optional `otherwise` prop. The "Show when" condition in `LogicSection` shows "Otherwise: Hidden" below the builder when a condition is active. Explicit multi-field routing ("Show X when Y, show Z otherwise") requires managing two separate binds and remains a P5 item.

### Inspector

- [x] **Scroll reset on field selection.** Fixed: `Inspector.tsx` scrolls its container to top on `selectedPath` change.
- [x] **Checkbox/toggle visual states.** Fixed: inspector toggle/checkbox controls now have unambiguous active visual states via updated CSS.
- [x] **Section collapse state not persisted.** Fixed: collapse state is now keyed per-path (e.g. `field:my.path:basics`) so each field remembers its own expanded sections.
- [x] **Field-level template system.** Fixed: "Save as template…" button in `FieldInspector` saves field item + bind config to localStorage. Saved templates appear under a `Saved` category in the slash menu via `loadUserFieldTemplates()` in `field-templates.ts`. `addItem` extended with `itemSeed`/`bindSeed` to apply pre-configured properties on insertion.

---

## P2 — Definition Spec Parity

Everything in `definition.schema.json` and the core spec that the studio can't currently author.

**Approach:** Most of these are "add a property editor to the inspector." Don't build a custom component for each — use a generic pattern (text input, dropdown, toggle) driven by the property's schema type. Verify by round-tripping: set a value in the inspector → confirm it appears in the definition JSON → validate against `definition.schema.json` with Ajv. Refer to `specs/core/spec.llm.md` for behavioral semantics that go beyond schema structure (e.g., `initialValue` vs `bind.default` timing).

### Form-Level Properties

The Metadata section currently exposes only title, URL, version. Add:

- [x] **`description`** — text area in Metadata section. Done.
- [x] **`name`** — machine-friendly identifier field in Metadata section. Done.
- [x] **`date`** — date text input in Metadata section. Done.
- [x] **`status`** — dropdown: draft / active / retired. Done.
- [x] **`nonRelevantBehavior`** — dropdown: remove / empty / keep in Metadata section. Done.
- [x] **`versionAlgorithm`** — dropdown: semver / date / integer / natural. Done.
- [x] **`derivedFrom`** — URI text input in Metadata section. Done.

### Field Item Properties

- [x] **`prefix` / `suffix`** — text inputs in Basics section. Done.
- [x] **`optionSet`** reference — dropdown in Basics section when option sets are defined. Done.
- [x] **`semanticType`** — text input in Advanced section. Done.
- [x] **`labels`** — `short`, `pdf`, `csv`, `accessibility` text inputs in Advanced section. Done.
- [x] **`initialValue`** — text input in Advanced section. Done.
- [x] **`prePopulate`** — Fixed: `instance`, `path`, and `editable` inputs added to `AdvancedSection`. Wired in `FieldInspector` via `setItemProperty`. Conditional display: path/editable shown only when instance is set.
- [x] **Field `children`** — dependent sub-questions. Fixed: `SubQuestionsSection` in `FieldInspector` shows existing sub-questions as clickable nav buttons and an "Add sub-question" button that calls `addItem` with `parentPath`. Tree and mutations already supported field children; UI was missing. Children are selectable and the structure panel renders drop zones inside them.
- [x] **`currency`** — per-field ISO 4217 text input in Advanced section. Done.

### Named Option Sets

- [x] **`optionSets` top-level authoring.** `OptionSetsPanel` in the Form Inspector: create/edit/delete named option sets with value+label rows. Done.
- [x] **Field `optionSet` reference.** Dropdown in Basics section lets choice fields reference a named option set. Done.
- [x] **Promote inline → shared.** Fixed: "Make reusable" button in Basics section when field has inline options; `promoteOptionsToOptionSet` mutation creates the set and links the field.
- [x] **Option set `source` (URI).** Fixed: `source` URL input added to OptionSetsPanel editor; `setOptionSet` mutation persists `source` alongside `options`.

### Secondary Data Sources (`instances`)

- [x] **`instances` authoring.** Fixed: `InstancesPanel` component in `FormInspector` (under "Secondary Data Sources" section). Add/edit/delete instances with `name`, `description`, `source`, `static`. Mutations: `addInstance`, `setInstanceProperty`, `renameInstance`, `deleteInstance`. Tested.
- [x] **FEL integration.** `@instance('name')` references in FEL autocomplete. Implemented instance-name completion (`@instance('name')`) plus nested path completion (`@instance('name').path`) with tests in `form-builder/src/components/__tests__/fel-editor.integration.test.tsx`; works in both single and double-quote variants.

### Item-Level Presentation

These are Tier 1 advisory hints on `items[].presentation`:

- [x] **`widgetHint`** — text input in new Presentation Hints section. Writes to `definition.items[path].presentation.widgetHint`. Done.
- [x] **`layout.flow`** — dropdown (stack/grid/inline) in Presentation Hints section (groups). Done.
- [x] **`layout.columns`** — number input, shown only when `flow: grid`. Done.
- [x] **`layout.colSpan`** — number input in Presentation Hints section (fields). Done.
- [x] **`layout.newRow`** — toggle in Presentation Hints section (fields). Done.
- [x] **`layout.collapsible`** — toggle in Presentation Hints section (groups). Done.
- [x] **`layout.collapsedByDefault`** — toggle, shown only when `collapsible: true`. Done.
- [x] **`layout.page`** — text input in Presentation Hints section (groups). Done.
- [x] **`styleHints.emphasis`** — dropdown in Presentation Hints section. Done.
- [x] **`styleHints.size`** — dropdown in Presentation Hints section. Done.
- [x] **`accessibility.role`** — text input in Presentation Hints section. Done.
- [x] **`accessibility.description`** — text input in Presentation Hints section. Done.
- [x] **`accessibility.liveRegion`** — dropdown (off/polite/assertive) in Presentation Hints section. Done.

---

## P3 — Component Document Parity

Everything in `component.schema.json` that the studio can't currently author. The studio auto-generates a flat `Stack` root; these tasks enable full layout/component control.

**Approach:** Component prop editors should be driven by the schema's per-component property definitions — not hand-coded per widget. Build one `WidgetConfigEditor` that reads the component schema and generates controls. The schema is the single source of truth; if the schema adds a property, the editor should pick it up. Validate output against `component.schema.json`. Refer to `specs/component/component-spec.llm.md` for the 33 built-in components and their semantics.

### Component-Specific Property Editors

The Appearance section picks a widget type but can't configure any of its properties. Each widget has spec-defined props:

- [x] **TextInput** — `maxLines`, `inputMode`, `prefix`, `suffix`, `placeholder`. Done via `WidgetPropsSection`.
- [x] **NumberInput** — `step`, `min`, `max`, `showStepper`. Done. (`locale` not yet exposed.)
- [x] **DatePicker** — `format`, `minDate`, `maxDate`, `showTime`. Done.
- [x] **Select** — `searchable`, `clearable`, `placeholder`. Done.
- [x] **FileUpload** — `accept`, `maxSize`, `multiple`, `dragDrop`. Done.
- [x] **MoneyInput** — `currency`, `showCurrency`, `step`, `min`, `max`. Done. (`locale`, `showStepper` not yet exposed.)
- [x] **Slider** — `min`, `max`, `step`, `showValue`, `showTicks`. Done.
- [x] **Rating** — `max`, `icon`, `allowHalf`. Done.
- [x] **Toggle** — `onLabel`, `offLabel`. Done.
- [x] **CheckboxGroup** — `columns`, `selectAll`. Done.
- [x] **RadioGroup** — `columns`, `orientation`. Done.
- [x] **Signature** — `strokeColor`, `height`, `penWidth`, `clearable`. Done.
- [x] **DataTable** — `columns`, `showRowNumbers`, `allowAdd`, `allowRemove`, `sortable`, `filterable`, `sortBy`, `sortDirection`. Done via `RepeatSection` in `GroupInspector`.

### Layout Tree Authoring

Every form gets a flat `Stack` root today. Enable building:

- [x] **Multi-step forms** — `Wizard` wrapping `Page` children. Fixed: `rebuildComponentTreeFromDefinition` wraps consecutive top-level `Page` groups in `Wizard`; BrandPanel exposes `showProgress` and `allowSkip`; shell/inspector integration coverage now verifies the preview payload updates end-to-end.
- [x] **Page** — Available in slash menu (Layout category). Title/description edited via BasicsSection as usual.
- [x] **Grid** — Available in slash menu (Layout category). GridInspector props: `gridColumns`, `gap`, `rowGap`.
- [x] **Columns** — Available in slash menu (Layout category). Inspector props: `widths`, `gap`.
- [x] **Tabs** — Available in slash menu (Layout category). Inspector props: `position`, `tabLabels`, `defaultTab`.
- [x] **Accordion** — Available in slash menu (Layout category). Inspector props: `allowMultiple`, `labels`.
- [x] **Stack direction** — Fixed: `direction` (vertical/horizontal), `gap`, `align`, `wrap` added to `PresentationLayout` and `PresentationSection` group controls. Writes to `definition.items[].presentation.layout.*`.

### Non-Field Components

The slash menu only inserts definition items. Enable placing:

- [x] **Display components** — `Alert`, `Badge`, `ProgressBar`, `Summary`, `ValidationSummary`. Added to `FIELD_TEMPLATES` as `Display` category display items.
- [x] **SubmitButton** — Added to `FIELD_TEMPLATES` as `Structure` category display item with `componentType: 'SubmitButton'`.
- [x] **Container components** — Fixed: `Card`, `Collapsible`, `ConditionalGroup`, and `Spacer` added to `FIELD_TEMPLATES` (Structure category); appear in slash menu. Wiring fix: group `componentType` is now written to `presentation.widgetHint` so component node correctly uses `Card`/`Collapsible`/`ConditionalGroup` instead of always `Stack`.
- [x] **Panel, Modal, Popover** — added to `FIELD_TEMPLATES` (Structure category) as group items with `componentType: 'Panel'/'Modal'/'Popover'`; available in slash menu.
- [x] **Spacer** — `size`. Fixed: `DisplayInspector` detects `componentNode.component === 'Spacer'` and renders a "Spacer" collapsible with a `size` text input. Writes to component node via `setComponentNodeProperty`. `size` added to `GeneratedComponentNode` interface.

### Component-Level `when`

- [x] **`when` on component nodes.** Fixed: `AppearanceSection` now accepts optional `componentWhen`/`onComponentWhenChange`/`felFieldOptions` props. A "Display when (visual only)" FEL input appears in Appearance for all item types (field, group, display). Writes to component tree node `when` via `setComponentNodeProperty`. `when` added to `GeneratedComponentNode` interface.

### Component Document Identity

- [x] **Top-level fields** — `name`, `title`, `description` on the component document. Fixed: "Component Document" collapsible section added to `FormInspector`; `setComponentDocumentProperty` mutation wires to component state.
- [x] **`breakpoints`** — `BreakpointEditor` added to BrandPanel. Defines named viewport breakpoints (name → minWidth px). One-click preset button adds sm/md/lg/xl. Wired to `setThemeBreakpoint` mutation.
- [x] **`tokens`** — component-level design tokens. Fixed: `setComponentTokens` mutation + KeyValueEditor in FormInspector "Component Document" section for flat key-value tokens.
- [x] **Custom component registry** — `components` object for registering custom component templates with `params`. Fixed: `CustomComponentRegistryEditor` in the FormInspector "Component Document" section writes `component.components` via `setComponentRegistry`; renderer/planner support already expands templates.

---

## P4 — Theme Document Parity

Everything in `theme.schema.json` the studio doesn't cover.

**Approach:** The theme cascade (`defaults` → `selectors` → `items`) is the spec's most layered abstraction. The `PresentationBlock` type is shared across all three levels — build one reusable `PresentationBlockEditor` component, not three. Validate against `theme.schema.json`. Refer to `specs/theme/theme-spec.llm.md` for cascade resolution semantics.

### Cascade Level 1: `defaults`

- [x] **`defaults` PresentationBlock (partial).** `labelPosition` and `cssClass` are now editable in the "Global Defaults" section of `BrandPanel` via `setThemeDefaultsProperty`. Remaining properties (`widget`, `widgetConfig`, `style`, `accessibility`, `fallback`) not yet exposed.

### Cascade Level 2: `selectors` — Incomplete Apply Block

`SelectorRuleEditor` sets `widget`, `labelPosition`, `cssClass`. Missing from apply:

- [x] **`widgetConfig`** — widget-specific config object in selectors. Fixed: KeyValueEditor in SelectorRuleEditor per-rule apply block.
- [x] **`style`** — flat CSS-like overrides in selectors. Fixed: KeyValueEditor for apply.style (values may use $token refs).
- [x] **`accessibility`** — `role`, `liveRegion`, `description` in selectors. Fixed: Role/Description/Live region inputs in SelectorRuleEditor; patchApplyAccessibility merges into apply.accessibility.
- [x] **`fallback`** — ordered fallback widget chain in selectors. Fixed: Comma-separated TextInput; parsed to array and set via setThemeSelectorApplyProperty(..., 'fallback', arr).

### Cascade Level 3: `items` — Incomplete Per-Item Overrides

Studio only writes `cssClass` per-item. Missing:

- [x] **`widget`** override per-item. Already done via AppearanceSection widget dropdown → `setFieldWidgetComponent` (for fields) or `updateThemePresentation('widget', value)` (for groups/display).
- [x] **`widgetConfig`** per-item. `AppearanceSection` now renders a `KeyValueEditor` for `widgetConfig`; wired in all three inspectors via `updateThemePresentation('widgetConfig', value)`.
- [x] **`style`** per-item with `$token` references. `AppearanceSection` now renders a `KeyValueEditor` for `style`; values accept `$token.*` references.
- [x] **`accessibility`** per-item. `AppearanceSection` renders `role`, `description`, and `liveRegion` inputs; wired via `updateThemePresentation('accessibility', value)`.
- [x] **`fallback`** chain per-item. `AppearanceSection` renders a comma-separated `TextInput` for `fallback`; wired via `updateThemePresentation('fallback', value)`.
- [x] **`labelPosition`** per-item. Fixed: `labelPosition` dropdown (above/left/right/hidden/placeholder) added to `AppearanceSection`; wired in `FieldInspector` via `updateThemePresentation('labelPosition', value)`.

### Theme Page Layout

- [x] **`pages`** array — place items onto named pages with `regions`. Each region has `key`, `span` (1–12), `start` (1–12), and per-breakpoint responsive overrides (`span`, `start`, `hidden`). Fixed: `PageLayoutEditor` in BrandPanel writes `theme.pages`; layout planner now emits `Page -> Grid -> region` wrappers from theme pages for both definition fallback and component-tree planning.

### Theme Identity & Metadata

- [x] **`url`, `name`, `title`, `description`** — Fixed: `setThemeDocumentProperty` mutation + "Theme Identity" collapsible section in `BrandPanel` with TextInput for each. Closed by default.
- [x] **`platform`** — Fixed: Dropdown (web/mobile/pdf/kiosk/universal/not-set) in "Theme Identity" section via `setThemeDocumentProperty`.
- [x] **`stylesheets`** — Fixed: List editor in "Theme Identity" section; `setThemeStylesheets` mutation persists/clears the array. Add-on-Enter or Add button; × to remove.

---

## P5 — Power Features & Integration

Features that exist as UI stubs or are partially built. Each needs end-to-end verification.

**Approach:** These features have existing code. Before adding to them, exercise the existing code in a real workflow. If it works, leave it alone. If it's fundamentally broken or the abstraction is wrong, delete and rebuild rather than patching. For mapping and registry features, validate output against `mapping.schema.json`, `registry.schema.json`, and `changelog.schema.json` respectively.

### FEL Expression Editor

`FELEditor.tsx` has syntax highlighting, `$`-autocomplete, function suggestions, live parse validation. Still needs:

- [ ] **Function signature tooltips on hover.**
- [ ] **Autocomplete in every `ExpressionToggle` context** — not just tested locations.
- [ ] **Edge cases** — empty definition, paths inside repeat groups, extension-contributed functions.

### Form Rules (Shapes) Builder

UI exists with `+ Add rule`. Needs end-to-end test:

- [x] **Rule list** shows name + severity icon + plain-English summary. Already implemented: `ShapeList` shows severity glyph (x/!/i), display name from `toDisplayName(shape.id)`, and shape ID.
- [x] **"Applies to" picker** — Entire form / Specific field / Each instance of (wildcard path). Already implemented in `ShapeEditor`.
- [x] **Composition modes** — ALL / ANY / EXACTLY ONE / NOT. Already implemented: `CompositionBuilder` handles `and`/`or`/`xone`/`not` modes.
- [x] **`{{expression}}` interpolation** in error messages. Fixed: `ShapeEditor` message input now has a `placeholder` with example (`Total must equal {{$budgetAmount}}`) and an inline hint explaining the `{{$fieldPath}}` interpolation syntax.
- [x] **Advanced properties** — timing, code, context, activeWhen hidden unless explicitly opened. Already implemented: collapsible "Advanced" section in `ShapeEditor`.
- [x] **Delete cleanup** — deleting a target field cleans up shapes referencing it. Already implemented: `deleteItem` in mutations filters `state.definition.shapes` to remove shapes whose `target` path matches the deleted paths.

### Theme Selector Rules

- [x] **Write a selector** ("All date fields use compact style") → `SelectorRuleEditor` is functional: creates `selectors[]` entries with `match.type`, `match.dataType`, `apply.widget`, `apply.labelPosition`, `apply.cssClass`. Verified.

### Design Token Editor

- [x] **Edit a token** → `TokenEditor` is functional: reads/writes `theme.tokens`, categorizes by prefix (color/spacing/typography/border/elevation/custom), shows visual previews per category, and tracks cross-references. Propagation to preview iframe depends on preview implementation.

### Variables Panel

- [x] **Add and delete** a variable end-to-end. Already implemented: `VariablesPanel` has `+ Add variable` button and per-row Delete buttons, wired to `addVariable`/`deleteVariable` in mutations.
- [x] **"Used by" display** — already implemented: `VariableEditor.tsx` renders `usage.label` for each reference.
- [ ] **Variable-scope autocomplete** in the FEL editor.

### Repeating Group Data Table Mode

- [ ] **Verify "Data Table" display mode** produces tabular layout with configurable columns.

### Simple / Advanced Inspector Toggle

- [x] **Global toggle** in inspector header (PRD §2.4). Simple = visual builders only. Advanced = raw FEL + all properties. Pill toggle in `Inspector.tsx` controls `uiState.inspectorMode`; `FieldInspector` hides `WidgetPropsSection`, `PresentationSection`, and `AdvancedSection` in simple mode.

### Mapping Editor

- [x] **Round-trip test** — `RoundTripTest` component is fully implemented: paste or upload JSON, run forward + reverse, see diff list. Already present.
- [x] **Auto-map unmatched fields** toggle — `autoMap` checkbox exists in `MappingEditor` meta section. Already present.
- [x] **All transform types** — preserve, drop, expression, coerce, valueMap, flatten, nest, constant, concat, split — all defined in `TRANSFORM_OPTIONS` and handled in `MappingRuleDetail`. Already present.
- [ ] **Adapter configuration** — JSON (pretty, sortKeys, nullHandling), XML (declaration, indent, cdata), CSV (delimiter, quote, header, encoding, lineEnding).

### Extension Registry Browser

`formspec-common.registry.json` is auto-loaded at startup (bundled inline). Users can load additional registries on top.

- [ ] **Load a registry from URL** → custom types appear in slash menu.
- [ ] **Extension-contributed functions** appear in FEL autocomplete.
- [ ] **Status badges** — stable / deprecated / retired.

### Version Management

- [ ] **Changelog diff** auto-computed from definition changes.
- [ ] **Impact classification** — breaking / compatible / cosmetic → major / minor / patch.
- [ ] **Full publish flow** — bump version, generate changelog document.
- [x] **Export bundle as ZIP.**

### Sub-Form Composition

- [ ] **Import definition fragment** from URL or file.
- [ ] **Fragment appears** as collapsible section with "linked" badge.
- [ ] **FEL path rewriting** during import.

### JSON Editor

- [x] **JSON → visual parse path.** Already implemented: `JsonEditorPane` validates JSON against schema on every keystroke and applies to project state via `setJsonDocument` when valid. Visual ↔ JSON is bidirectional.
- [x] **Error click-to-line navigation.** Fixed: schema errors are now rendered as clickable buttons. Clicking navigates the textarea to the line matching the `instancePath` (searches for the last property-name segment). CSS `underline dotted` hint indicates clickability.
- [x] **Auto-format toggle.** Already present: `json-editor-pane__action` "Format" button re-prettifies JSON via `JSON.stringify(parsed, null, 2)`.
- [x] **Line numbers missing.** Fixed: added a `json-editor-pane__gutter` column that renders one line-number div per line, with synchronized scroll tracking via `onScroll` on the textarea.

### Preview Pane

- [x] **Validation feedback in preview.** Fixed: added a "Show errors" button to the preview pane header. Clicking it sends a `touch-all` postMessage to the iframe, which calls `renderer.touchAllFields()` on the `<formspec-render>` element — this marks all fields as touched so the engine's existing error signals become visible. Button resets to inactive when the definition changes.
- [x] **Device frame presets.** Fixed: Mobile (375px), Tablet (768px), Desktop (1280px) snap buttons added to `PreviewPane` header. Active button highlighted. `onWidthChange` callback wired through Shell → `setPreviewWidth`.

### Import / Export

- [x] **Export all artifacts** as JSON files. Already implemented: `ImportExportPanel` has Export Definition / Component / Theme / Mapping / Bundle buttons.
- [x] **Import a form from file.** Already implemented: `ImportExportPanel` has file input (`<input type="file" accept=".json">`) with `onFileChange` handler that parses and calls `importArtifacts`.
- [x] **Template launcher** — Fixed: Contact Form, Survey, Registration, Grant Application quick-start templates added in `quickstart-templates.ts`; shown as a card grid at the top of the Import/Export panel.

---

## P6 — Spec Features (Future Phases)

Features in the spec that are architecturally complex or low-priority for an MVP editor. Track but don't block on. These are the kind of features where building the wrong abstraction early costs more than deferring. Wait until the core editor is solid and the patterns are proven before tackling these.

### Screener Routing

- [ ] **`screener` section** — classification fields and condition-based routing to different form definitions. No UI. No plan coverage.

### Version Migrations

- [ ] **`migrations.from[version]`** — field mapping rules for upgrading responses across breaking changes. Versioning panel handles publishing but not migration authoring.

### Custom Component Templates

- [x] **Component document `components` registry** — define custom component templates with `params`, slot binding, fallback declarations. Fixed in the Component Document section via the custom component registry editor and state mutation.

### Responsive Breakpoint Slider

- [x] **Toolbar breakpoint bar** with draggable width slider. Already present in `Toolbar`/`BreakpointBar`; integration coverage exercises preview-width sync and breakpoint snapping.
- [x] **Per-component responsive property editor** — span, start, hidden per breakpoint. Already present via `ResponsiveOverrides` in Appearance for field/group/display inspectors.
- [x] **Breakpoint definitions** — named breakpoints with min/max widths. Already present via `BreakpointEditor` in BrandPanel and `setThemeBreakpoint`.

---

## P7 — Polish & Accessibility

- [x] **`aria-live` region** — Fixed: `<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">` in Shell announces `"Selected: {label}"` when `project.selection` changes. Label resolved via `resolveFieldLabel` helper walking the item tree.
- [x] **Predictable focus target** when a field is selected. Fixed: `FieldInspector` `useEffect` on `props.path` change uses `requestAnimationFrame` to focus the first visible input/textarea/select in the inspector container after selection.
- [ ] **WCAG AA contrast audit** — teal accent, muted text, badge colors.
- [x] **Undo/redo** — Fixed: `history.ts` maintains undo/redo stacks (cap 50). `commitProject` pushes to history for all content mutations; UI-only mutations (selection, inspector section state, panel toggles, breakpoint changes) return `{ skipHistory: true }`. `undoProject`/`redoProject` exported from `mutations.ts`. ⌘Z and ⌘⇧Z wired in `Shell.tsx`. History cleared on `importArtifacts`.
- [x] **Keyboard shortcut ⌘⇧P** — toggle Preview added. ⌘K (command palette), ⌘\ (toggle JSON editor) were already present. Still missing: keyboard-only field reorder shortcuts.
- [x] **Remaining keyboard shortcuts** — Fixed: `⌘D` duplicates selected field (`duplicateItem` mutation); `Backspace`/`Delete` (when not in an input) deletes selected field (`deleteItem` mutation). Both skip when focus is on an input/textarea/contenteditable. Both also appear in command palette (`action-duplicate-field`, `action-delete-field`).
- [x] **Keyboard-only field reordering in structure tree.** Already implemented: `TreeNode` handles `Alt+ArrowUp`/`Alt+ArrowDown` which call `onReorder(path, 'up'|'down')` → `reorderItem` mutation.

### Performance Targets

Don't optimize prematurely. Measure first, then fix only what's measurably slow.

- [ ] Slash menu appearance: < 50ms.
- [ ] Inspector switch: < 100ms.
- [ ] Preview iframe update after edit: < 500ms.
- [ ] 100+ field form scroll at 60fps.

---

## Schema Parity Checklist

Output validation gate. Before any tier is considered done, the studio's generated artifacts must pass:

```bash
# Structural validation of all generated documents
python3 -m formspec.validate <export-dir> --registry registries/formspec-common.registry.json
```

| Schema | Document | Status |
|---|---|---|
| `definition.schema.json` | Definition | Mostly covered — P0 fixed; all P2 form-level, field item, optionSet, presentation, `prePopulate`, and `instances` properties done; option set `source` and promote-inline-to-shared now done. `Field.children` UI added (sub-questions section). Remaining: `instances.data`/`schema`/`readonly`. |
| `component.schema.json` | Component | P0 name violations fixed; 12 widget prop editors done via `WidgetPropsSection`; DataTable done via RepeatSection; layout tree authoring (Wizard/Page/Grid/Columns/Tabs/Accordion), container components, component-level `when`, component document identity fields, `tokens`, and custom `components` registry are now covered in Studio. Remaining: only future-phase items tracked below. |
| `theme.schema.json` | Theme | `defaults.labelPosition`/`cssClass` done. Identity fields (`name`, `title`, `description`, `url`, `platform`, `stylesheets`) done. `labelPosition` per-item override done. **Selector apply block**: `widgetConfig`, `style`, `accessibility`, `fallback` added to SelectorRuleEditor. `pages` array authoring and planner layout are now covered. Remaining: full `defaults` PresentationBlock. |
| `mapping.schema.json` | Mapping | Untested — P5 |
| `changelog.schema.json` | Changelog | Untested — P5 |
| `registry.schema.json` | Registry | Read-only (loaded, not authored) |
| `response.schema.json` | Response | Engine-generated, not studio-authored |
| `validationReport.schema.json` | Validation | Engine-generated, not studio-authored |
