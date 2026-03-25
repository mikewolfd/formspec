# Spec Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three issues found during spec-expert review of commits since f121c1cd.

**Architecture:** Three independent refactors: (1) split dual-purpose `fallback` field on LayoutNode into `fallbackText` + `widgetFallback`, (2) add `number` to definition schema dataType enum and remove redundant TS normalization, (3) collapse two viewport-width functions into one with clear priority chain.

**Tech Stack:** Rust (formspec-plan, formspec-theme), TypeScript (formspec-layout, formspec-webcomponent), JSON Schema

---

## Fix 1: Split `LayoutNode.fallback` into `fallbackText` + `widgetFallback`

The `fallback` field serves two unrelated purposes: ConditionalGroup display text (string) and theme cascade widget chain (string[]). A field with both a `when` condition and a theme cascade widget fallback would render widget names like "camera, fileUpload" as visible text to the user.

### Task 1.1: Update Rust LayoutNode struct

**Files:**
- Modify: `crates/formspec-plan/src/types.rs:88-89`

- [ ] **Step 1: Update LayoutNode struct** — Replace `fallback: Option<Vec<String>>` with two fields:
  ```rust
  #[serde(skip_serializing_if = "Option::is_none")]
  pub fallback_text: Option<String>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub widget_fallback: Option<Vec<String>>,
  ```

- [ ] **Step 2: Fix all LayoutNode construction sites in planner.rs** — Every `LayoutNode { ... fallback: None, ... }` becomes `fallback_text: None, widget_fallback: None`. Then:
  - Line 535 (`fallback = pres.fallback.clone()`) → `widget_fallback = pres.fallback.clone()`
  - Lines 548-552 (tree `fallback` parsing) → assign to `fallback_text` as `Option<String>` (unwrap the Vec to single string)
  - Line 778 (`fallback = pres.fallback.clone()`) → `widget_fallback = pres.fallback.clone()`
  - Update `parse_tree_fallback` to return `Option<String>` (single string, since spec says ConditionalGroup fallback is a string, not array)

- [ ] **Step 3: Update Rust tests** — `plan_component_tree_conditional_group_fallback` test: assert `node.fallback_text == Some("No subcontractors are needed.".to_string())` and `node.widget_fallback == None`.

- [ ] **Step 4: Run Rust tests**
  Run: `cargo test -p formspec-plan`
  Expected: PASS

### Task 1.2: Update TypeScript LayoutNode interface and consumers

**Files:**
- Modify: `packages/formspec-layout/src/types.ts:68-69`
- Modify: `packages/formspec-webcomponent/src/rendering/emit-node.ts:66-71`
- Modify: `packages/formspec-layout/tests/planner.test.ts:155-157`

- [ ] **Step 1: Update TS LayoutNode interface** — Replace `fallback?: string[]` with:
  ```typescript
  /** ConditionalGroup display text when the condition is false. */
  fallbackText?: string;

  /** Theme cascade widget fallback chain (list of widget type names). */
  widgetFallback?: string[];
  ```

- [ ] **Step 2: Update emit-node.ts** — Change `node.fallback` → `node.fallbackText`:
  ```typescript
  if (node.fallbackText) {
      fallbackEl = document.createElement('p');
      fallbackEl.className = 'formspec-conditional-fallback';
      fallbackEl.textContent = node.fallbackText;
      target.appendChild(fallbackEl);
  }
  ```

- [ ] **Step 3: Update planner.test.ts** — Change assertion from `node.fallback` to `node.fallbackText`:
  ```typescript
  expect(node.fallbackText).toBe('N/A');
  expect(node.props.fallback).toBeUndefined();
  ```

- [ ] **Step 4: Build and run TS tests**
  Run: `npm run build --workspace=formspec-layout && npm run build --workspace=formspec-webcomponent`
  Run: `npx vitest run packages/formspec-layout/tests/planner.test.ts`

### Task 1.3: Commit

- [ ] **Step 1: Commit**
  ```
  refactor(plan): split LayoutNode fallback into fallbackText + widgetFallback
  ```

---

## Fix 2: Add `number` to definition schema dataType enum

The core spec says `decimal`, the component spec says `number`. Developers intuitively type `number` (JSON Schema, HTML, JavaScript conventions). Make both valid, prefer `number`.

### Task 2.1: Update schema and remove redundant TS normalization

**Files:**
- Modify: `schemas/definition.schema.json:567-580` — add `"number"` to enum
- Modify: `packages/formspec-layout/src/wasm-bridge.ts:23-28` — remove `normalizeDataTypeForRust`
- Modify: `packages/formspec-layout/src/wasm-bridge.ts:271` — remove call to `normalizeDataTypeForRust`

- [ ] **Step 1: Add `number` to schema enum** — In `definition.schema.json`, add `"number"` after `"integer"` in the dataType enum array. Also add to the conditional checks for `decimal`/`money` → `precision` (line 730).

- [ ] **Step 2: Remove `normalizeDataTypeForRust`** — Delete the function and its usage in `resolvePresentation`. Rust already accepts `"number"` via `#[serde(alias = "number")]`.

- [ ] **Step 3: Run schema validation**
  Run: `python3 -m pytest tests/ -v -k "schema"` (quick schema tests only)

- [ ] **Step 4: Run docs generation**
  Run: `npm run docs:generate && npm run docs:check`

### Task 2.2: Commit

- [ ] **Step 1: Commit**
  ```
  feat(schema): add number as valid dataType (alias for decimal)
  ```

---

## Fix 3: Collapse viewport width functions

`resolveViewportWidth` and `effectiveViewportWidth` redundantly check `window.innerWidth`. Collapse into one function with clear priority: explicit `viewportWidth` > `window.innerWidth` > breakpoint lookup > null.

### Task 3.1: Add `viewportWidth` to PlanContext and collapse functions

**Files:**
- Modify: `packages/formspec-layout/src/types.ts` — add `viewportWidth?: number` to PlanContext
- Modify: `packages/formspec-layout/src/wasm-bridge.ts:90-123` — collapse to one function

- [ ] **Step 1: Add `viewportWidth` to PlanContext**:
  ```typescript
  /** Explicit viewport width override (for SSR, PDF, testing). */
  viewportWidth?: number;
  ```

- [ ] **Step 2: Collapse viewport functions** — Replace both functions with:
  ```typescript
  function resolveViewportWidth(ctx: PlanContext): number | null {
      // 1. Explicit override (SSR, PDF, testing)
      if (ctx.viewportWidth != null && ctx.viewportWidth > 0) {
          return Math.round(ctx.viewportWidth);
      }
      // 2. Browser window (runtime)
      if (typeof globalThis !== 'undefined') {
          const w = (globalThis as unknown as { innerWidth?: number }).innerWidth;
          if (typeof w === 'number' && Number.isFinite(w) && w > 0) {
              return Math.round(w);
          }
      }
      // 3. Named breakpoint lookup (legacy/compat)
      if (ctx.activeBreakpoint != null) {
          const bp = ctx.theme?.breakpoints?.[ctx.activeBreakpoint]
              ?? ctx.componentDocument?.breakpoints?.[ctx.activeBreakpoint];
          if (typeof bp === 'number') return bp;
      }
      return null;
  }
  ```

- [ ] **Step 3: Update `toPlanContextJson`** — Use `resolveViewportWidth(ctx)` (remove `effectiveViewportWidth` reference).

- [ ] **Step 4: Build and run tests**
  Run: `npm run build --workspace=formspec-layout`
  Run: `npx vitest run packages/formspec-layout/tests/`

### Task 3.2: Commit

- [ ] **Step 1: Commit**
  ```
  refactor(layout): collapse viewport width resolution into single function
  ```
