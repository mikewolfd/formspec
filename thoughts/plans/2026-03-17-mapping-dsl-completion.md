# Mapping DSL Completion Plan

**Date:** 2026-03-17
**Status:** Draft
**Scope:** Complete the Mapping DSL implementation across all four packages to reach Mapping Core conformance, with the multi-mapping Studio UI and Extended adapter groundwork.

---

## Context

The multi-mapping migration (multiple `mappings` in `ProjectState`) is done and stable (518 tests passing). What remains is the runtime transform engine, missing Studio Core helpers, and the Studio authoring UI. This plan tracks all known gaps in priority order.

---

## Phase 1 — Engine: Fix broken foundations

These are correctness issues in the existing `RuntimeMappingEngine` that affect every mapping.

### 1.1 Fix `valueMap` shape mismatch
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

The spec defines `valueMap` as `{ forward: {...}, reverse: {...}, unmapped: "error"|"passthrough"|"drop"|"default", default: any }`. The engine currently reads `valueMap` as the forward map directly (`map[String(value)]`).

- Read from `valueMap.forward` (not `valueMap` directly)
- Support `unmapped` strategies: `error` (throw/diagnostic), `passthrough` (copy unchanged), `drop` (omit field), `default` (use `valueMap.default`)
- Auto-invert bijective `forward` maps for reverse direction
- Explicit `reverse` block overrides auto-inversion

### 1.2 Fix `coerce` descriptor shape
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

The spec defines `coerce` as `{ from: string, to: string, format?: string }`. The engine currently reads `coerce` as a plain string type name.

- Accept both old string form and new `{ from, to, format }` object
- Add `integer` type: `string↔integer`, `number→integer` (lossy, warn)
- Add `date`/`datetime` types: `date↔string` with `format` (ISO 8601 default), `datetime→date` (lossy, no auto-reverse)
- Add `money` type: `money→number` (extracts `amount`, lossy), `money→string`
- Enforce reversibility: lossy pairs (`datetime→date`, `money→number/integer`) MUST NOT auto-reverse

### 1.3 Fix array path notation
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

`splitPath` only splits on `.`. Bracket notation `name[0].given[0]` is entirely unhandled.

- Parse `[N]` index segments in `splitPath`/`getByPath`/`setByPath`
- `[*]` wildcard support (needed for array mode)

### 1.4 Add per-rule `default` fallback
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

When `sourcePath` resolves to absent/`undefined` and the rule has a `default` property, use the default value instead of skipping.

### 1.5 Enforce `bidirectional: false`
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

Rules with `bidirectional: false` (or `transform: "drop"`) must be skipped during reverse execution. Currently not checked.

### 1.6 Enforce document-level `direction`
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

- `direction: "forward"` → `reverse()` MUST throw (or return a fatal diagnostic)
- `direction: "reverse"` → `forward()` MUST throw

### 1.7 Structured diagnostics
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

Replace `diagnostics: string[]` with structured objects per spec §7.2:

```ts
interface MappingDiagnostic {
  ruleIndex: number;       // -1 if not rule-specific
  sourcePath?: string;
  targetPath?: string;
  errorCode: string;       // COERCE_FAILURE | UNMAPPED_VALUE | FEL_RUNTIME | PATH_NOT_FOUND | ...
  message: string;
}
```

Update `RuntimeMappingResult.diagnostics` type accordingly.

---

## Phase 2 — Engine: FEL integration

FEL is the computation substrate for `expression`, `condition`, `concat`, `split`, and `flatten`/`nest` with expressions. Nothing in Phase 3 works without this.

### 2.1 Wire FEL evaluator into `expression` transform
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

The engine lives in `formspec-engine` alongside the FEL interpreter. Import and use it.

- Evaluate `expression` property as FEL
- Bind `$` to the resolved source value (`getByPath(source, sourcePath)` or `null` if absent)
- Bind `@source` to the full source document root
- Catch FEL runtime errors → emit `FEL_RUNTIME` diagnostic, skip rule

### 2.2 Replace condition evaluator with FEL
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

Remove `evaluateCondition` regex hack. Evaluate `condition` as FEL with same `$`/`@source` bindings. A `null` result counts as `false` (skip rule).

---

## Phase 3 — Engine: Missing transform types

### 3.1 `array` object — `mode: "each"`
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

The most important array mode. Iterates each element of the source array and applies `innerRules` (element-relative paths) to produce one output element per input.

- `$` = current element, `$index` = zero-based index, `@source` = full document
- Build output array by collecting per-element results
- Reverse: iterate target array, apply inner rule inverses per element

### 3.2 `array` object — `mode: "whole"`
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

Treat the entire array as a single value (`$` = complete array). Used for aggregate operations. Simplest mode — just binds the array to `$` and runs the rule's transform.

### 3.3 `array` object — `mode: "indexed"`
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

Apply `innerRules` by positional `index` property. Uncovered elements are dropped. Used for CSV positional column mapping.

### 3.4 `flatten` transform
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

Three modes (inferred from source shape):
- Array + `separator` → join into delimited string (e.g. `["a","b","c"]` → `"a, b, c"`)
- Array without separator → positional keys (`targetPath_0`, `_1`, `_2`)
- Object → dot-prefixed flat keys (`addr.street`, `addr.city`)

Auto-reversible (pairs with `nest`).

### 3.5 `nest` transform
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

Inverse of `flatten`:
- Delimited string + `separator` → split into array
- Positional keys (`sourcePath_0`, `_1`) → ordered array
- Dot-prefixed keys (`sourcePath.child.leaf`) → nested object

### 3.6 `concat` transform
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

`expression` references multiple source fields via `@source`. Result must be a string. `sourcePath` is optional. Not auto-reversible.

### 3.7 `split` transform
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

`expression` returns an array (→ positional suffixes on `targetPath`) or object (→ keys appended to `targetPath`). `$` = source value.

---

## Phase 4 — Engine: Adapters

### 4.1 JSON adapter config
**File:** `packages/formspec-engine/src/runtime-mapping.ts`

Read `adapters.json` config from mapping doc:
- `nullHandling: "omit"` — suppress null-valued keys from output
- `pretty: true` — indent serialized output (only relevant if engine returns serialized string; currently returns object)
- `sortKeys: true` — sort output object keys lexicographically

### 4.2 CSV adapter (Mapping Extended)
**File:** `packages/formspec-engine/src/runtime-mapping.ts` or new `packages/formspec-engine/src/adapters/csv.ts`

- All `targetPath` values must be simple identifiers (no dots) — validate and emit `ADAPTER_FAILURE` if violated
- Repeat groups → multiple CSV rows (fields outside repeat group duplicated across rows)
- Config: `delimiter`, `quote`, `header`, `encoding`, `lineEnding`
- Serialize: return CSV string, not JSON object

### 4.3 XML adapter (Mapping Extended)
**File:** new `packages/formspec-engine/src/adapters/xml.ts`

- Dot-path → nested elements; `@attr` → XML attribute on parent
- `rootElement` wraps the document
- `namespaces` prefixes applied to elements
- Config: `declaration`, `indent`, `cdata` (paths whose content is CDATA-wrapped)
- Serialize: return XML string

---

## Phase 5 — Core: Gaps and verification

### 5.1 Verify `previewMapping` uses selected mapping
**File:** `packages/formspec-core/src/queries/mapping-queries.ts` (or wherever `previewMapping` is implemented)

Confirm `previewMapping` reads from `state.mappings[state.selectedMappingId]`, not a stale reference. Accept optional `mappingId` param to preview a non-selected mapping.

### 5.2 Verify `dependency-graph` scans all mappings
**File:** `packages/formspec-core/src/queries/dependency-graph.ts`

Already emits `mappingId:index` format — confirm it iterates `Object.entries(state.mappings)` not just the selected one.

### 5.3 Verify `autoGenerateRules` `scopePath` walk
**File:** `packages/formspec-core/src/handlers/mapping.ts`

When `scopePath` is `""` (empty string) the prefix logic produces `".fieldKey"` — verify the walk trims leading dots correctly.

---

## Phase 6 — Studio Core: Multi-mapping helpers

**File:** `packages/formspec-studio-core/src/project.ts`

Add the four management helpers that dispatch to existing core handlers:

```ts
createMapping(id: string, props?: { targetSchema?: Record<string, unknown> }): HelperResult
deleteMapping(id: string): HelperResult
renameMapping(oldId: string, newId: string): HelperResult
selectMapping(id: string): HelperResult
```

Update `mapField` and `unmapField` to accept optional `mappingId` param (default to `state.selectedMappingId`).

Update `previewMapping` to accept optional `mappingId` param and pass it to core.

---

## Phase 7 — Studio: Multi-mapping UI

**File:** `packages/formspec-studio/src/workspaces/mapping/MappingTab.tsx` + new components

The Mapping tab currently has no way to switch between or create multiple mappings.

- **Mapping selector** in the tab header: shows current mapping ID, dropdown lists all mapping IDs in `state.mappings`
- **"New Mapping" action**: opens a small form (ID input + format picker), calls `project.createMapping`
- **"Delete Mapping"** with confirmation dialog (disabled when only one mapping exists)
- **Rename** via inline edit on the selected mapping label

Wiring: selector reads `state.mappings` and `state.selectedMappingId` from `useProjectState()`, calls `project.selectMapping(id)` on change.

---

## Phase 8 — Studio: Rule editor completeness

**Files:** `packages/formspec-studio/src/workspaces/mapping/RuleCard.tsx`, `RuleEditor.tsx`

Currently only `sourcePath`, `targetPath`, `transform` are editable. Missing fields:

- `description` — plain text input
- `priority` — number input (default 0)
- `bidirectional` — toggle (default true)
- `condition` — FEL expression text input
- `default` — JSON value input (shown when sourcePath may be absent)
- `reverse` — expandable section with nested transform/expression override
- `valueMap` editor — `forward` key-value table, `unmapped` strategy picker, optional `default`
- `coerce` editor — `from`/`to` type selectors, optional `format` input
- `array` mode selector — `each`/`whole`/`indexed` with nested `innerRules` editor (can defer to a later iteration)

---

## Phase 9 — Studio: AdapterConfig

**File:** `packages/formspec-studio/src/workspaces/mapping/AdapterConfig.tsx`

Render config fields based on `mapping.targetSchema.format`:

- **JSON**: `nullHandling` toggle (`include`/`omit`), `sortKeys` toggle
- **CSV**: `delimiter` text input, `quote` text input, `header` toggle, `encoding` selector, `lineEnding` selector
- **XML**: `rootElement` text input, `namespaces` key-value editor, `indent` number input, `cdata` path list, `declaration` toggle

---

## Execution order

| Phase | Package | Depends on |
|-------|---------|-----------|
| 1 — Fix foundations | engine | — |
| 2 — FEL integration | engine | Phase 1 |
| 3 — Missing transforms | engine | Phase 2 |
| 4 — Adapters | engine | Phase 3 |
| 5 — Core verification | core | Phase 1 |
| 6 — Studio Core helpers | studio-core | Phase 5 |
| 7 — Multi-mapping UI | studio | Phase 6 |
| 8 — Rule editor | studio | Phase 7 |
| 9 — AdapterConfig | studio | Phase 4, 8 |

Phases 1–3 are the critical path. Everything else depends on the engine being correct. Phases 4 (adapters) and 8–9 (full rule UI) can be deferred if Extended conformance is not the immediate goal.
