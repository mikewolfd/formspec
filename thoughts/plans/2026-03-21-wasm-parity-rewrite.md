# WASM Parity Rewrite — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve 1:1 parity between the Python (`_rust.py`) and TypeScript (`index.ts`) interfaces — both become thin wrappers over the same Rust entry points, with zero monkey patching of WASM results.

**Architecture:** The Python bridge calls `evaluate_definition_full_with_instances(def, data, trigger, extensions, instances)` and gets a complete result in ~20 lines. The TypeScript engine currently calls `evaluate_definition_with_context(def, data, context)` — the **basic** entry point missing instances and extensions — then runs ~500 lines of TS workarounds to compensate. This plan wires the WASM binding to the **full** Rust entry point (matching Python), then deletes the TS workarounds. The mapping engine follows the same pattern: Python calls `execute_mapping_doc` directly; TS should too.

**Tech Stack:** Rust (`formspec-eval`, `formspec-wasm`, `formspec-core`), TypeScript, `@preact/signals-core`, `wasm-pack`

**Key References:**
- Python bridge (target architecture): `src/formspec/_rust.py` (~446 lines, zero workarounds)
- PyO3 binding: `crates/formspec-py/src/lib.rs:305-355` (`evaluate_def` → `evaluate_definition_full_with_instances`)
- WASM binding (current): `crates/formspec-wasm/src/lib.rs:587-654` (`evaluate_definition_wasm` → `evaluate_definition_with_context`)
- Rust full entry point: `crates/formspec-eval/src/lib.rs:116-135` (`evaluate_definition_full_with_instances_and_context`)
- TS engine: `packages/formspec-engine/src/index.ts` (~4,293 lines)
- TS bridge: `packages/formspec-engine/src/wasm-bridge.ts` (~426 lines)
- Engine tests: `packages/formspec-engine/tests/` (621 tests)
- E2E tests: `tests/e2e/` (Playwright)

**Current state:** 621/621 engine tests pass. 4,293 lines in index.ts. ~1,400 lines are workarounds for incomplete WASM inputs.

**Target state:** ~2,200 lines in index.ts. Zero TS-side FEL re-evaluation. Single WASM call per state change. Mapping delegates to WASM. Assembly stays in TS (async resolver requirement) but is already lean.

---

## What Stays in TS (Legitimately)

These are NOT duplications — they're TS-only concerns:

| Area | ~Lines | Why TS |
|------|--------|--------|
| Signal lifecycle (create, diff, patch) | 300 | Preact reactivity for UI. Python has no UI. |
| Repeat instance management (add/remove/shift) | 100 | Signal-based counts, snapshot/restore |
| Async I/O (remote options, instance source fetch) | 80 | `fetch()` — runtime concern |
| Response/report assembly | 100 | Reads from signals |
| `compileExpression()` / `evaluateScreener()` | 60 | Public API for webcomponent/studio live eval |
| Assembly (async + sync) | 400 | Async resolver; already delegates FEL to WASM |
| setValue + coercion + options | 150 | Entry point logic |
| Migration/replay/diagnostics/labels | 120 | Orchestration |
| Constructor + signal init + item tree | 200 | Setup |

**Total legitimate TS: ~1,510 lines.** Plus ~200 lines of exports/types/helpers = ~1,700.

## What Gets Deleted

| Area | ~Lines | Replaced By |
|------|--------|-------------|
| `patchDerivedMipSignals` (re-eval relevant/required/readonly) | 28 | WASM result fields `required`, `readonly`, `nonRelevant` |
| `patchBindValidationSignals` (re-eval constraints) | 38 | WASM result `validations` |
| `patchCalculatedSignals` (re-eval calculates) | 32 | WASM result `values` |
| `patchVariableSignals` (re-eval variables) | 18 | WASM result `variables` |
| `reevaluateContinuousShapes` (TS shape eval) | 80 | WASM result `validations` with shape results |
| `withExtraValidations` shape supplement | 50 | WASM handles all shapes with instances |
| Registry validation supplement | 80 | WASM handles extension constraints |
| `normalizeExpressionForWasm` (bare $, group refs, wildcards) | 34 | Only needed for `compileExpression` now |
| `buildExpressionContext` (full context builder) | 62 | Only needed for `compileExpression` now |
| 3-pass settle loop in `_evaluate` | 20 | Single WASM call, direct signal patch |
| `RuntimeMappingEngine` class + helpers | 605 | `wasmExecuteMappingDoc` wrapper |
| Dead helpers (`safeEvaluateExpression` for shapes, etc.) | ~100 | Deleted |
| **Total deleted** | **~1,150** | |

## What Gets Added to Rust

| Area | ~Lines | Where |
|------|--------|-------|
| Wire instances + extensions through WASM binding | 60 | `crates/formspec-wasm/src/lib.rs` |
| Parse `ExtensionConstraint` from registry JSON in WASM | 80 | `crates/formspec-wasm/src/lib.rs` (port from PyO3) |
| Parse `array` and `reverse` in WASM mapping parser | 40 | `crates/formspec-wasm/src/lib.rs` |
| Parse `targetSchema`, `direction` in WASM mapping doc parser | 20 | `crates/formspec-wasm/src/lib.rs` |
| Plumb instances into Rust `recalculate` FEL environment | 30 | `crates/formspec-eval/src/recalculate.rs` |
| Add expression-default evaluation to Rust `evaluate_single_item` | 20 | `crates/formspec-eval/src/recalculate.rs` |
| Add `targetSchema`, `direction` to Rust `MappingDocument` struct | 10 | `crates/formspec-core/src/runtime_mapping.rs` |
| Add CSV/XML/JSON adapter layer to Rust mapping | 250 | `crates/formspec-core/src/mapping_adapters.rs` (new) |
| **Total Rust additions** | **~510** | |

---

## Phase 0 — Fix Rust Evaluator Gaps (the REAL root domino)

The WASM binding is incomplete, but the Rust evaluator itself also has gaps. The Python bridge works around them via per-expression calls. We must fix these BEFORE wiring WASM or deleting TS workarounds.

### Task 0a: Plumb instances into Rust FEL environment

**Files:**
- Modify: `crates/formspec-eval/src/lib.rs:116-175` (pass instances to recalculate)
- Modify: `crates/formspec-eval/src/recalculate.rs` (accept instances, populate env)

**Problem:** `evaluate_definition_full_with_instances_and_context` uses instances ONLY for `seed_prepopulate_tree` (line 134). It does NOT pass instances to `recalculate` (line 147). So `@instance('name').path` in FEL expressions (calculate, constraint, relevant, etc.) always resolves to Null.

- [ ] **Step 1: Write failing Rust tests (6 tests covering all FEL evaluation paths)**

```rust
// 1. Calculate (recalculate path)
#[test]
fn instance_ref_in_calculate_resolves() {
    let def = serde_json::json!({
        "$formspec": "1.0", "url": "test", "version": "1.0.0", "title": "T",
        "items": [{ "key": "rate", "type": "field", "dataType": "decimal", "label": "Rate" }],
        "binds": [{ "path": "rate", "calculate": "@instance('config').defaultRate" }],
        "instances": [{ "name": "config", "src": "static", "data": {} }],
    });
    let data = HashMap::new();
    let mut instances = HashMap::new();
    instances.insert("config".into(), serde_json::json!({ "defaultRate": 0.15 }));
    let result = evaluate_definition_full_with_instances(
        &def, &data, EvalTrigger::Continuous, &[], &instances,
    );
    assert_eq!(result.values.get("rate"), Some(&serde_json::json!(0.15)));
}

// 2. Constraint (revalidate path) — CRITICAL: separate env from recalculate
#[test]
fn instance_ref_in_constraint_resolves() {
    let def = serde_json::json!({
        "$formspec": "1.0", "url": "test", "version": "1.0.0", "title": "T",
        "items": [{ "key": "amount", "type": "field", "dataType": "decimal", "label": "Amt" }],
        "binds": [{ "path": "amount",
            "constraint": "$amount <= @instance('limits').maxAmount",
            "constraintMessage": "Exceeds limit" }],
        "instances": [{ "name": "limits", "src": "static", "data": {} }],
    });
    let mut data = HashMap::new();
    data.insert("amount".into(), serde_json::json!(500));
    let mut instances = HashMap::new();
    instances.insert("limits".into(), serde_json::json!({ "maxAmount": 100 }));
    let result = evaluate_definition_full_with_instances(
        &def, &data, EvalTrigger::Continuous, &[], &instances,
    );
    assert!(result.validations.iter().any(|v| v.code == "CONSTRAINT_FAILED"),
        "constraint referencing @instance should fire");
}

// 3. Shape constraint (revalidate path, shapes)
#[test]
fn instance_ref_in_shape_constraint_resolves() {
    let def = serde_json::json!({
        "$formspec": "1.0", "url": "test", "version": "1.0.0", "title": "T",
        "items": [{ "key": "total", "type": "field", "dataType": "decimal", "label": "T" }],
        "shapes": [{ "id": "cap", "target": "total", "severity": "error",
            "constraint": "$total <= @instance('rules').cap",
            "message": "Over cap", "code": "OVER_CAP" }],
        "instances": [{ "name": "rules", "src": "static", "data": {} }],
    });
    let mut data = HashMap::new();
    data.insert("total".into(), serde_json::json!(200));
    let mut instances = HashMap::new();
    instances.insert("rules".into(), serde_json::json!({ "cap": 100 }));
    let result = evaluate_definition_full_with_instances(
        &def, &data, EvalTrigger::Continuous, &[], &instances,
    );
    assert!(result.validations.iter().any(|v| v.code == "OVER_CAP"));
}

// 4. Relevant expression
#[test]
fn instance_ref_in_relevant_resolves() {
    let def = serde_json::json!({
        "$formspec": "1.0", "url": "test", "version": "1.0.0", "title": "T",
        "items": [{ "key": "extra", "type": "field", "dataType": "string", "label": "E" }],
        "binds": [{ "path": "extra", "relevant": "@instance('flags').showExtra" }],
        "instances": [{ "name": "flags", "src": "static", "data": {} }],
    });
    let data = HashMap::new();
    let mut instances = HashMap::new();
    instances.insert("flags".into(), serde_json::json!({ "showExtra": false }));
    let result = evaluate_definition_full_with_instances(
        &def, &data, EvalTrigger::Continuous, &[], &instances,
    );
    assert!(result.non_relevant.contains(&"extra".to_string()));
}

// 5. Missing instance name returns null (no panic)
#[test]
fn missing_instance_name_returns_null_not_panic() {
    let def = serde_json::json!({
        "$formspec": "1.0", "url": "test", "version": "1.0.0", "title": "T",
        "items": [{ "key": "val", "type": "field", "dataType": "string", "label": "V" }],
        "binds": [{ "path": "val", "calculate": "@instance('nonexistent').foo" }],
    });
    let result = evaluate_definition_full_with_instances(
        &def, &HashMap::new(), EvalTrigger::Continuous, &[], &HashMap::new(),
    );
    // Should not panic — value should be null
    assert!(result.values.get("val").is_none()
        || result.values.get("val") == Some(&serde_json::json!(null)));
}

// 6. Nested instance path
#[test]
fn nested_instance_path_resolves() {
    let def = serde_json::json!({
        "$formspec": "1.0", "url": "test", "version": "1.0.0", "title": "T",
        "items": [{ "key": "city", "type": "field", "dataType": "string", "label": "C" }],
        "binds": [{ "path": "city", "calculate": "@instance('org').address.city" }],
        "instances": [{ "name": "org", "src": "static", "data": {} }],
    });
    let mut instances = HashMap::new();
    instances.insert("org".into(), serde_json::json!({ "address": { "city": "Springfield" } }));
    let result = evaluate_definition_full_with_instances(
        &def, &HashMap::new(), EvalTrigger::Continuous, &[], &instances,
    );
    assert_eq!(result.values.get("city"), Some(&serde_json::json!("Springfield")));
}
```

- [ ] **Step 2: Run all 6 tests, verify they ALL fail** (all return null)

Run: `cargo test -p formspec-eval -- instance_ref`

- [ ] **Step 3: Implement — pass instances to recalculate AND revalidate**

In `lib.rs`, modify `evaluate_definition_full_with_instances_and_context` to pass `instances` to BOTH `recalculate` AND `revalidate`. Both functions create their own `FormspecEnvironment` — instances must be populated in both.

- In `recalculate.rs`, accept `instances: &HashMap<String, Value>` and populate `env.instances` with `json_to_fel` conversions after creating the environment.
- In `revalidate.rs`, update `build_validation_env` to accept and populate instances. Shape constraints use `@instance()` during revalidation, not just recalculation.

- [ ] **Step 4: Run all 6 tests, verify they ALL pass**

- [ ] **Step 5: Run full Rust test suite:** `cargo test -p formspec-eval`

- [ ] **Step 6: Commit**

### Task 0b: Add expression-default evaluation to Rust evaluator

**Files:**
- Modify: `crates/formspec-eval/src/types.rs` (add `default_expression: Option<String>` to `ItemInfo`)
- Modify: `crates/formspec-eval/src/rebuild.rs:138-141` (parse `=expression` defaults into new field)
- Modify: `crates/formspec-eval/src/recalculate.rs` (`evaluate_single_item` default application)

**Problem:** `rebuild.rs:138-141` explicitly skips expression defaults (strings starting with `=`). The `default_value` field is set to `None`. When a field becomes relevant, `evaluate_single_item` only applies literal defaults. The TS engine handles expression defaults via `applyRelevanceDefaults`.

- [ ] **Step 1: Write failing Rust tests (4 tests)**

```rust
// 1. Core: expression default fires on relevance transition
#[test]
fn expression_default_applied_on_relevance_transition() {
    let def = serde_json::json!({
        "$formspec": "1.0", "url": "test", "version": "1.0.0", "title": "T",
        "items": [
            { "key": "toggle", "type": "field", "dataType": "boolean", "label": "Toggle" },
            { "key": "derived", "type": "field", "dataType": "string", "label": "D" },
        ],
        "binds": [
            { "path": "derived", "relevant": "$toggle", "default": "=concat('hello', ' world')" },
        ],
    });
    // Pass 1: toggle = false → derived is non-relevant
    let mut data = HashMap::new();
    data.insert("toggle".into(), serde_json::json!(false));
    let result1 = evaluate_definition_with_context(&def, &data, &EvalContext {
        previous_validations: None, now_iso: None,
    });
    assert!(result1.non_relevant.contains(&"derived".to_string()),
        "derived should be non-relevant when toggle=false");

    // Pass 2: toggle = true → derived transitions to relevant → expression default fires
    data.insert("toggle".into(), serde_json::json!(true));
    let result2 = evaluate_definition_with_context(&def, &data, &EvalContext {
        previous_validations: Some(result1.validations.clone()), now_iso: None,
    });
    assert_eq!(result2.values.get("derived"), Some(&serde_json::json!("hello world")),
        "expression default should be applied on non-relevant → relevant transition");
}

// 2. Expression default must NOT overwrite user-entered value
#[test]
fn expression_default_does_not_overwrite_user_value() {
    let def = serde_json::json!({
        "$formspec": "1.0", "url": "test", "version": "1.0.0", "title": "T",
        "items": [
            { "key": "toggle", "type": "field", "dataType": "boolean", "label": "Toggle" },
            { "key": "name", "type": "field", "dataType": "string", "label": "Name" },
        ],
        "binds": [
            { "path": "name", "relevant": "$toggle", "default": "=concat('default', 'Name')" },
        ],
    });
    // User enters a value, then toggle off/on — default must NOT overwrite
    let mut data = HashMap::new();
    data.insert("toggle".into(), serde_json::json!(true));
    data.insert("name".into(), serde_json::json!("UserValue"));
    let result = evaluate_definition(&def, &data);
    assert_eq!(result.values.get("name"), Some(&serde_json::json!("UserValue")),
        "expression default should not overwrite user-entered value");
}

// 3. Literal default still works (regression guard)
#[test]
fn literal_default_still_works_after_expression_default_change() {
    let def = serde_json::json!({
        "$formspec": "1.0", "url": "test", "version": "1.0.0", "title": "T",
        "items": [
            { "key": "toggle", "type": "field", "dataType": "boolean", "label": "Toggle" },
            { "key": "status", "type": "field", "dataType": "string", "label": "S" },
        ],
        "binds": [
            { "path": "status", "relevant": "$toggle", "default": "active" },
        ],
    });
    let mut data = HashMap::new();
    data.insert("toggle".into(), serde_json::json!(false));
    let result1 = evaluate_definition(&def, &data);
    assert!(result1.non_relevant.contains(&"status".to_string()));
    data.insert("toggle".into(), serde_json::json!(true));
    let result2 = evaluate_definition(&def, &data);
    assert_eq!(result2.values.get("status"), Some(&serde_json::json!("active")));
}

// 4. Expression default in repeat group
#[test]
fn expression_default_in_repeat_group() {
    let def = serde_json::json!({
        "$formspec": "1.0", "url": "test", "version": "1.0.0", "title": "T",
        "items": [
            { "key": "toggle", "type": "field", "dataType": "boolean", "label": "T" },
            { "key": "items", "type": "group", "label": "Items", "repeatable": true,
              "children": [
                { "key": "label", "type": "field", "dataType": "string", "label": "L" }
            ]}
        ],
        "binds": [
            { "path": "items[*].label", "relevant": "$toggle", "default": "=concat('item-', string(position()))" },
        ],
    });
    let mut data = HashMap::new();
    data.insert("toggle".into(), serde_json::json!(false));
    data.insert("items[0].label".into(), serde_json::Value::Null);
    let _result1 = evaluate_definition(&def, &data);
    data.insert("toggle".into(), serde_json::json!(true));
    let result2 = evaluate_definition(&def, &data);
    // Expression default should evaluate within repeat context
    let label = result2.values.get("items[0].label");
    assert!(label.is_some(), "expression default should apply in repeat group");
}
```

- [ ] **Step 2: Run all 4 tests, verify they fail**

- [ ] **Step 3: Implement**

In `rebuild.rs`, store expression defaults as a new field `default_expression: Option<String>` on `ItemInfo` (strip the `=` prefix). In `recalculate.rs:evaluate_single_item`, when a field becomes relevant and has no value and has `default_expression`, evaluate it in the FEL environment and apply the result.

- [ ] **Step 4: Run tests, verify all pass**

- [ ] **Step 5: Commit**

---

## Phase 1 — Wire Full Evaluator Through WASM

### Task 1: Extend WASM `evaluateDefinition` to accept instances and extensions

**Files:**
- Modify: `crates/formspec-wasm/src/lib.rs:587-654`
- Modify: `packages/formspec-engine/src/wasm-bridge.ts:247-279`

The PyO3 binding (`crates/formspec-py/src/lib.rs:305-355`) is the reference implementation. Port its `evaluate_def` pattern to WASM.

- [ ] **Step 1: Write failing Rust test for instances in WASM eval**

Add a test to `crates/formspec-wasm/src/lib.rs` (test module):

```rust
#[test]
fn evaluate_definition_with_instances() {
    let def = serde_json::json!({
        "$formspec": "1.0", "url": "test", "version": "1.0.0", "title": "T",
        "items": [{ "key": "name", "type": "field", "dataType": "string", "label": "N" }],
        "binds": [{ "path": "name", "calculate": "@instance('defaults').name" }],
        "instances": [{ "name": "defaults", "src": "static", "data": {} }],
    });
    let data = serde_json::json!({});
    let context = serde_json::json!({
        "instances": { "defaults": { "name": "Alice" } }
    });
    let result_json = evaluate_definition_inner(
        &serde_json::to_string(&def).unwrap(),
        &serde_json::to_string(&data).unwrap(),
        Some(serde_json::to_string(&context).unwrap()),
    ).unwrap();
    let result: serde_json::Value = serde_json::from_str(&result_json).unwrap();
    assert_eq!(result["values"]["name"], "Alice");
}
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cargo test -p formspec-wasm -- evaluate_definition_with_instances`
Expected: `name` is null (instances not passed through).

- [ ] **Step 3: Write failing test for extension constraints**

```rust
#[test]
fn evaluate_definition_with_extension_constraints() {
    let def = serde_json::json!({
        "$formspec": "1.0", "url": "test", "version": "1.0.0", "title": "T",
        "items": [{ "key": "email", "type": "field", "dataType": "string", "label": "E",
                    "extensions": { "x-formspec-email": true } }],
    });
    let data = serde_json::json!({ "email": "not-an-email" });
    let context = serde_json::json!({
        "registryDocuments": [{
            "entries": [{
                "name": "x-formspec-email",
                "status": "stable",
                "constraints": { "pattern": "^[^@]+@[^@]+$" },
                "metadata": { "displayName": "Email" }
            }]
        }]
    });
    let result_json = evaluate_definition_inner(
        &serde_json::to_string(&def).unwrap(),
        &serde_json::to_string(&data).unwrap(),
        Some(serde_json::to_string(&context).unwrap()),
    ).unwrap();
    let result: serde_json::Value = serde_json::from_str(&result_json).unwrap();
    let validations = result["validations"].as_array().unwrap();
    assert!(validations.iter().any(|v| v["source"] == "extension"),
        "should have extension validation");
}
```

- [ ] **Step 4: Implement — modify `evaluate_definition_inner`**

Port the PyO3 pattern from `crates/formspec-py/src/lib.rs:305-355`:

1. In `parse_eval_context`, extract `instances` from context JSON → `HashMap<String, Value>`
2. In `parse_eval_context`, extract `registryDocuments` from context JSON → `Vec<ExtensionConstraint>` (port `extract_extension_constraints` from PyO3 `lib.rs:395-480`)
3. Change `evaluate_definition_inner` to call `evaluate_definition_full_with_instances_and_context` instead of `evaluate_definition_with_context`
4. Update the import to include `evaluate_definition_full_with_instances_and_context` and `ExtensionConstraint`

```rust
// In evaluate_definition_inner, replace line 622:
// OLD:
let result = match trigger {
    EvalTrigger::Continuous => evaluate_definition_with_context(&definition, &data, &context),
    _ => evaluate_definition_with_trigger_and_context(&definition, &data, trigger, &context),
};

// NEW:
let result = evaluate_definition_full_with_instances_and_context(
    &definition, &data, trigger, &extension_constraints, &instances, &context,
);
```

- [ ] **Step 5: Run Rust tests, verify both pass**

Run: `cargo test -p formspec-wasm`

- [ ] **Step 6: Rebuild WASM**

Run: `npm -w formspec-engine run build:wasm`

- [ ] **Step 7: Update TS bridge `wasmEvaluateDefinition`**

In `packages/formspec-engine/src/wasm-bridge.ts`, update the context parameter to include `instances` and `registryDocuments`:

```typescript
export function wasmEvaluateDefinition(
    definition: unknown,
    data: Record<string, unknown>,
    context?: {
        nowIso?: string;
        trigger?: string;
        previousValidations?: unknown[];
        instances?: Record<string, unknown>;        // NEW
        registryDocuments?: unknown[];               // NEW
    },
): { ... }
```

The context is already JSON-serialized, so just ensure the new fields pass through.

- [ ] **Step 8: Build and run engine tests**

Run: `npm -w formspec-engine run build && npm -w formspec-engine run test:unit`
Expected: All 621 tests still pass (the TS engine isn't using the new fields yet).

- [ ] **Step 9: Commit**

```bash
git add crates/formspec-wasm/ crates/formspec-eval/ packages/formspec-engine/src/wasm-bridge.ts
git commit -m "feat(wasm): wire instances + extension constraints through evaluateDefinition"
```

### Task 2: Pass instances and registry entries from FormEngine to WASM

**Files:**
- Modify: `packages/formspec-engine/src/index.ts` (the `_evaluate` method and `evaluateResultForTrigger`)

- [ ] **Step 1: Update `_evaluate` to pass instances and registryDocuments to WASM**

In the `wasmEvaluateDefinition` call inside `_evaluate` (around line 2146), add:

```typescript
const baseResult = wasmEvaluateDefinition(this.definition, this._data, {
    nowIso: this.nowISO(),
    previousValidations: ...,
    instances: this.instanceData,                    // NEW
    registryDocuments: this._registryDocuments,       // NEW
}) as EvalResult;
```

Do the same for `evaluateResultForTrigger` (line 2199).

**API gap:** The current `setRegistryEntries(entries: any[])` receives flattened entries, not the original registry documents. But WASM's `extract_extension_constraints` (ported from PyO3) expects document-shaped objects with `entries[]` arrays.

Fix: Add `setRegistryDocuments(docs: any[])` to `FormEngine` and `IFormEngine`. Store raw documents in `_registryDocuments`. The existing `setRegistryEntries` can remain for backward compat (reconstruct a synthetic document wrapping the entries). The webcomponent's `set registryDocuments()` setter already has the documents in their original form — route them to the new method.

- [ ] **Step 2: Run tests**

Run: `npm -w formspec-engine run build && npm -w formspec-engine run test:unit`
Expected: All pass. WASM now gets full context, but TS supplements still run (they'll produce duplicate results that get deduplicated).

- [ ] **Step 3: Commit**

### Task 3: Delete TS evaluation supplements — trust WASM results

**Files:**
- Modify: `packages/formspec-engine/src/index.ts`

This is the big deletion. Remove the TS-side re-evaluation that compensates for incomplete WASM results. Work incrementally — delete one function at a time and verify tests.

- [ ] **Step 0: Capture golden-file baseline BEFORE deletion**

Before touching any code, snapshot the grant-app fixture's full signal state, validation report, and response. Save as `tests/fixtures/golden-grant-app-baseline.json`. After each deletion step, diff against this baseline to catch behavioral divergences that individual tests miss.

```javascript
// packages/formspec-engine/tests/golden-baseline-capture.mjs
const engine = createGrantEngine();
engine.setValue('budget.lineItems[0].quantity', 1);
engine.setValue('budget.lineItems[0].unitCost', 1000);
const snapshot = {
    signals: Object.fromEntries(Object.entries(engine.signals).map(([k, s]) => [k, s.value])),
    validations: engine.getValidationReport({ mode: 'continuous' }),
    response: engine.getResponse(),
};
writeFileSync('tests/fixtures/golden-grant-app-baseline.json', JSON.stringify(snapshot, null, 2));
```

- [ ] **Step 1: Delete the 3-pass settle loop**

Replace the inner loop in `_evaluate`:

```typescript
// BEFORE (lines 2181-2192):
for (let pass = 0; pass < 3; pass += 1) {
    this.patchDerivedMipSignals();
    this.patchBindValidationSignals();
    this.patchVariableSignals(fullResult);
    this.patchCalculatedSignals();
}
this.patchDerivedMipSignals();
this.patchBindValidationSignals();
this.syncInstanceCalculateSignals();
this.reevaluateContinuousShapes(fullResult);
this.patchErrorSignals();

// AFTER:
this.patchErrorSignals();
```

Keep `patchErrorSignals` — it derives error signals from validation results (not re-evaluation).

- [ ] **Step 2: Run tests, see what breaks**

Run: `npm -w formspec-engine run build && npm -w formspec-engine run test:unit`

Expect some failures — the diff-based signal patching (`patchDeltaSignals`) should now carry most of the load, but there may be edge cases where the WASM result doesn't include fields that the TS settle loop was creating signals for.

- [ ] **Step 3: Fix `patchDeltaSignals` to fully populate signals from WASM result**

The current `patchDeltaSignals` only patches **changed** fields (from the diff). After deleting the settle loop, it needs to also ensure all signals are initialized from the WASM result — not just deltas.

For values: `patchValueSignals(fullResult.values)` already runs (line 2179). Good.

For required/readonly: `patchDeltaSignals` patches from the diff. But on first eval, every field needs its required/readonly signal set. Ensure the diff produces entries for all fields on the first eval (when `_previousVisibleResult` is null).

For validations: the WASM result includes ALL validations. `patchDeltaSignals` should write them to `validationResults` and `shapeResults` signals.

- [ ] **Step 4: Delete `withExtraValidations` shape supplement**

Gut `withExtraValidations`. Remove:
- The extension validation filter (`validation.source !== 'extension'`) — WASM now produces correct extension results, stop stripping them
- The shape-by-shape TS evaluation loop — WASM handles all shapes with instances
- The registry validation supplement (`collectRegistryValidationFindings`) — WASM handles extensions

Keep only:
- Cardinality validation (TS owns repeat counts via signals)
- External validation merging (`this._externalValidation`)
- The `patchValueSignals` preference logic for user-entered fields (raw `_data` over WASM-transformed values)

**Critical:** Remove the `validation.source !== 'extension'` filter (line ~2232) or WASM's valid extension results get stripped.

- [ ] **Step 5: Delete `patchDerivedMipSignals`, `patchBindValidationSignals`, `patchCalculatedSignals`, `patchVariableSignals`, `reevaluateContinuousShapes`**

These are now dead code. Delete the method bodies but keep the method signatures temporarily if other code calls them — then trace and remove call sites.

- [ ] **Step 6: Simplify `normalizeExpressionForWasm` and `buildExpressionContext`**

These are still needed for `compileExpression()` and `evaluateScreener()`, but no longer called in the hot path (the settle loop is gone). No changes needed — they just run less frequently.

- [ ] **Step 7: Run full test suite, fix remaining failures**

Run: `npm -w formspec-engine run build && npm -w formspec-engine run test:unit`

Iterate until all 621+ tests pass. Key areas to watch:
- Constraint null-propagation (WASM handles this — `revalidate.rs:167-197`)
- Shape activeWhen (WASM handles this — `revalidate.rs:489-495`)
- Variable scoping (WASM handles this — `recalculate.rs:74-109`)
- Whitespace transforms (WASM handles this — signals now show WASM-transformed values, update tests if needed)

- [ ] **Step 8: Commit**

```bash
git commit -m "refactor(engine): delete TS evaluation supplements — trust WASM results"
```

### Task 4: Delete the fixpoint loop in `_evaluate`

**Files:**
- Modify: `packages/formspec-engine/src/index.ts`

**Depends on Phase 0 (Tasks 0a, 0b).** With instances plumbed into the Rust FEL environment (Task 0a) and expression defaults handled (Task 0b), the fixpoint loop is no longer needed — the Rust evaluator handles everything in one call.

- [ ] **Step 1: Remove `applyPendingInitialExpressions`**

Rust `rebuild.rs` handles literal initial values. After Task 0b, expression initial values (`=expr`) are also handled. Delete the TS function.

**Caveat:** Verify that `=expression` initial values are also fixed by Task 0b. If the Rust evaluator treats `initialValue` expression defaults differently from bind `default` expression defaults, a separate fix may be needed.

- [ ] **Step 2: Remove `applyRelevanceDefaults`**

After Task 0b, Rust handles both literal AND expression defaults on relevance transitions. Delete the TS function.

- [ ] **Step 3: Remove `applyInstanceCalculates`**

After Task 0a, `@instance('name').path` in calculate expressions resolves correctly in Rust for READS. Delete the read-evaluation path.

**Caveat:** `applyInstanceCalculates` also WRITES computed values back into `instanceData` (e.g., `@instance('summary').total: calculate: sum(...)`). This write-back pattern has no Rust equivalent — the Rust evaluator treats instances as read-only inputs. If any downstream code depends on instance write-back, keep that portion in TS. Check if any binds target `@instance(...)` paths with `calculate` — if none exist in practice, safe to delete entirely.

- [ ] **Step 4: Simplify `_evaluate` to single WASM call + diff + patch**

```typescript
private _evaluate(): void {
    const result = wasmEvaluateDefinition(this.definition, this._data, {
        nowIso: this.nowISO(),
        trigger: 'continuous',
        previousValidations: this._fullResult?.validations,
        instances: this.instanceData,
        registryDocuments: this._registryDocuments,
    }) as EvalResult;

    const visibleResult = this.filterContinuousShapeResults(result);
    const delta = diffEvalResults(this._previousVisibleResult, visibleResult);

    batch(() => {
        this.patchValueSignals(result.values);
        this.patchDeltaSignals(delta);
        this.patchCardinality(result);
        this.patchErrorSignals();
        this._evaluationVersion.value += 1;
    });

    this._previousVisibleResult = visibleResult;
    this._fullResult = result;
}
```

- [ ] **Step 5: Run tests, fix failures**

- [ ] **Step 6: Commit**

---

## Phase 2 — Replace TS Mapping Engine with WASM

### Task 5: Fix WASM mapping parser gaps

**Files:**
- Modify: `crates/formspec-wasm/src/lib.rs:1299-1413` (`parse_mapping_rules_inner`)
- Modify: `crates/formspec-wasm/src/lib.rs:1415-1431` (`parse_mapping_document_inner`)

- [ ] **Step 1: Write failing Rust test for `array` descriptor**

```rust
#[test]
fn mapping_rule_parses_array_descriptor() {
    let rules_json = r#"[{
        "sourcePath": "items",
        "targetPath": "rows",
        "transform": "preserve",
        "array": { "mode": "each" }
    }]"#;
    let rules = parse_mapping_rules_inner(
        &serde_json::from_str(rules_json).unwrap()
    ).unwrap();
    assert!(rules[0].array.is_some());
}
```

- [ ] **Step 2: Write failing test for `reverse` override**

- [ ] **Step 3: Implement `array` parsing in `parse_mapping_rules_inner`**

Parse `array.mode`, `array.innerRules`, `array.indices` from JSON into `ArrayDescriptor`.

- [ ] **Step 4: Implement `reverse` parsing**

Parse `reverse.transform`, `reverse.expression`, etc. into `ReverseOverride`.

- [ ] **Step 5: Parse `expression` transform type**

Line 1372 currently returns `Err("unknown transform type: expression")`. Add:
```rust
"expression" => formspec_core::TransformType::Expression(
    obj.get("expression").and_then(|v| v.as_str()).unwrap_or("$").to_string(),
),
```

- [ ] **Step 6: Parse `targetSchema` and `direction` in document parser**

In `parse_mapping_document_inner`, extract `targetSchema` and `direction` fields from the mapping document JSON.

- [ ] **Step 7: Run tests, verify they pass**

Run: `cargo test -p formspec-wasm`

- [ ] **Step 8: Rebuild WASM and commit**

### Task 6: Add adapter serialization to Rust mapping

**Files:**
- Create: `crates/formspec-core/src/mapping_adapters.rs`
- Modify: `crates/formspec-core/src/lib.rs` (pub mod)
- Modify: `crates/formspec-wasm/src/lib.rs` (call adapters after mapping execution)

The TS engine has CSV, XML, and JSON post-processing adapters. Port these to Rust.

- [ ] **Step 1: Write failing Rust tests for CSV adapter**

```rust
#[test]
fn csv_adapter_basic() {
    let data = serde_json::json!({"name": "Alice", "age": 30});
    let config = AdapterConfig { format: "csv", header: true, delimiter: ",", .. };
    let output = serialize_csv(&data, &config);
    assert_eq!(output, "age,name\n30,Alice\n");
}
```

- [ ] **Step 2: Implement CSV adapter (~60 lines)**

Handle: header row, delimiter, quote char, line ending, null handling.

- [ ] **Step 3: Write failing tests and implement XML adapter (~80 lines)**

Handle: rootElement, @attr attributes, CDATA, indentation, declaration, character escaping.

- [ ] **Step 4: Write failing tests and implement JSON post-processing (~30 lines)**

Handle: `nullHandling: 'omit'`, `sortKeys`.

- [ ] **Step 5: Wire adapters into WASM mapping document execution**

In `execute_mapping_doc_wasm`, after calling `execute_mapping_doc`, check `targetSchema.format` and apply the appropriate adapter serializer. Return the serialized string as `output` instead of the JSON object.

- [ ] **Step 6: Run all Rust tests**

- [ ] **Step 7: Rebuild WASM and commit**

### Task 7: Replace TS RuntimeMappingEngine with WASM wrapper

**Files:**
- Modify: `packages/formspec-engine/src/index.ts` (delete ~605 lines, add ~30 lines)

- [ ] **Step 1: Write the thin wrapper**

```typescript
export function createMappingEngine(mappingDoc: unknown): IRuntimeMappingEngine {
    return {
        forward(source: any): RuntimeMappingResult {
            const result = wasmExecuteMappingDoc(mappingDoc, source, 'forward');
            return {
                direction: result.direction as MappingDirection,
                output: result.output,
                appliedRules: result.rulesApplied,
                diagnostics: result.diagnostics,
            };
        },
        reverse(source: any): RuntimeMappingResult {
            const result = wasmExecuteMappingDoc(mappingDoc, source, 'reverse');
            return {
                direction: result.direction as MappingDirection,
                output: result.output,
                appliedRules: result.rulesApplied,
                diagnostics: result.diagnostics,
            };
        },
    };
}
```

- [ ] **Step 1.5: Run dual-implementation comparison BEFORE deleting old code**

Before deleting the TS mapping engine, add a temporary test that runs both implementations against the same inputs and asserts identical output. This catches behavioral divergences that individual tests miss.

```javascript
test('WASM mapping output matches TS mapping output', () => {
    // Use representative fixtures from existing test files
    const doc = { rules: [...], targetSchema: { format: 'json' } };
    const input = { name: 'Alice', age: 30 };
    const tsResult = new RuntimeMappingEngine(doc).forward(input);
    const wasmResult = createMappingEngine(doc).forward(input);
    assert.deepEqual(tsResult, wasmResult);
});
```

Run this for several mapping documents from the existing test fixtures. Delete these dual-run tests after the TS code is removed.

- [ ] **Step 2: Keep `RuntimeMappingEngine` as an exported class wrapping WASM**

87 test call sites use `new RuntimeMappingEngine(doc)`. Instead of updating all tests, keep the class name as a wrapper:

```typescript
export class RuntimeMappingEngine implements IRuntimeMappingEngine {
    constructor(private readonly doc: unknown) {}
    forward(source: any): RuntimeMappingResult { return createMappingEngine(this.doc).forward(source); }
    reverse(source: any): RuntimeMappingResult { return createMappingEngine(this.doc).reverse(source); }
}
```

Delete all `mapping*` helper functions (~500 lines). Keep the class as a 5-line wrapper.

- [ ] **Step 3: Run mapping tests**

Run: `npm -w formspec-engine run build && cd packages/formspec-engine && node --import ./tests/setup.mjs --test tests/runtime-mapping*.test.mjs`

- [ ] **Step 4: Fix any result shape mismatches between WASM output and test expectations**

Common mismatches:
- `rulesApplied` vs `appliedRules` naming
- `diagnostics` array structure (errorCode field name)
- Adapter output as string vs object

- [ ] **Step 5: Run full test suite**

- [ ] **Step 6: Commit**

```bash
git commit -m "refactor(engine): replace TS RuntimeMappingEngine with WASM wrapper — delete 605 lines"
```

---

## Phase 3 — Clean Up and Verify

### Task 8: Clean stale dist artifacts

- [ ] **Step 1: Clean and rebuild**

```bash
rm -rf packages/formspec-engine/dist
npm -w formspec-engine run build
```

- [ ] **Step 2: Verify dist contents**

Should contain only: `index.js`, `index.d.ts`, `interfaces.js`, `interfaces.d.ts`, `diff.js`, `diff.d.ts`, `wasm-bridge.js`, `wasm-bridge.d.ts`, `tsconfig.tsbuildinfo`.

- [ ] **Step 3: Commit**

### Task 9: Full verification

- [ ] **Step 1: Engine tests**

Run: `npm -w formspec-engine run test:unit`
Expected: All pass.

- [ ] **Step 2: Downstream builds**

```bash
npm -w formspec-core run build
npm -w formspec-webcomponent run build
npm -w formspec-studio-core run build
npm -w formspec-mcp run build
npm -w formspec-studio run build
```

- [ ] **Step 3: Downstream tests**

```bash
npm -w formspec-core run test
npm -w formspec-studio-core run test
```

- [ ] **Step 4: E2E tests**

```bash
npx playwright test --timeout 15000
```

- [ ] **Step 5: Python conformance suite**

```bash
python3 -m pytest tests/ -v
```

- [ ] **Step 6: Line count audit**

```bash
wc -l packages/formspec-engine/src/*.ts
```

Target: index.ts ≤ 2,500 lines (down from 4,293).

- [ ] **Step 7: Final commit**

---

## Verification Checklist

- [ ] `cargo test -p formspec-eval` — all Rust tests pass
- [ ] `cargo test -p formspec-wasm` — all WASM tests pass
- [ ] `npm -w formspec-engine run test:unit` — all engine tests pass
- [ ] `npm -w formspec-core run build && npm -w formspec-core run test`
- [ ] `npm -w formspec-studio-core run build && npm -w formspec-studio-core run test`
- [ ] `npm -w formspec-mcp run build`
- [ ] `npm -w formspec-webcomponent run build`
- [ ] `npm test` (E2E)
- [ ] `python3 -m pytest tests/ -v`
- [ ] `wasmEvaluateDefinition` accepts `instances` and `registryDocuments`
- [ ] No TS-side FEL re-evaluation in `_evaluate()` hot path
- [ ] `RuntimeMappingEngine` is a thin WASM wrapper (~30 lines)
- [ ] `index.ts` ≤ 2,500 lines
- [ ] Zero `safeEvaluateExpression` calls in the evaluate/patch cycle

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| WASM `sum()` on missing repeat group returns null (vs TS returning 0) | Rust evaluator seeds empty arrays for repeat groups in `rebuild.rs`. If not, add seeding. Signal patching preserves previous non-null values as defense. |
| Instance data serialization mismatch (TS objects vs Rust HashMap) | JSON round-trip normalizes. Test with complex nested instance data. |
| Extension constraint format mismatch between PyO3 and WASM parsing | Port `extract_extension_constraints` directly from `formspec-py/src/lib.rs:395-480`. |
| Mapping adapter output format difference (string vs object) | Tests verify exact output. Adapter flag controls whether output is serialized or raw JSON. |
| `compileExpression` still needs per-expression eval | Kept — only ~60 lines. Not in the hot path. Uses `normalizeExpressionForWasm` + `buildExpressionContext`. |
| Assembly stays in TS | Accepted — async resolver requirement is fundamental. Already lean (~400 lines). |
| Whitespace transforms change signal semantics | WASM applies transforms; signals show transformed values. Tests may need updates if they expected raw values. |
