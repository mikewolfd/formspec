# formspec-eval — generated API (Markdown)

Generated: 2026-03-22T12:50:44.890Z (do not edit by hand; regenerate via npm script / cargo doc-md + this bundler)

Bundled from [cargo-doc-md](https://github.com/Crazytieguy/cargo-doc-md). Nested module paths are preserved in headings. Relative links may not resolve; search by heading.

---

## doc-md index

# Documentation Index

Generated markdown documentation for this project.

## Dependencies (1)

- [`formspec-eval`](formspec_eval/index.md)

---

Generated with [cargo-doc-md](https://github.com/Crazytieguy/cargo-doc-md)

---

## Source: formspec_eval/index.md

# formspec_eval

Formspec Definition Evaluator — 4-phase batch processor.

## Layout
The main path is [`pipeline::evaluate_definition_full_with_instances_and_context`]:
1. [`mod@rebuild`] — definition → item tree, initial values, repeat expansion, wildcard binds
2. [`mod@recalculate`] — relevance, required, readonly, variables, calculate ([`recalculate()`])
3. [`mod@revalidate`] — required/type/constraint, extensions, shapes ([`revalidate()`])
4. [`mod@nrb`] — output shaping for non-relevant fields

Cross-cutting: [`mod@convert`] (path resolution), private `fel_json` (money-aware JSON→`FelValue` for env fields),
private `runtime_seed` (prePopulate / previous non-relevant). [`mod@screener`] evaluates routes in an isolated env.

## Documentation

- Human overview: crate `README.md` (phases, API map, context).
- API reference: `cargo doc -p formspec-eval --no-deps --open`.
- Markdown API export: `docs/rustdoc-md/API.md` (regenerate with `npm run docs:formspec-eval`).

## Modules

### [`formspec_eval`](formspec_eval.md)

*7 modules*

### [`convert`](convert.md)

*1 function*

### [`eval_json`](eval_json.md)

*1 struct, 4 functions*

### [`nrb`](nrb.md)

*2 functions*

### [`pipeline`](pipeline.md)

*8 functions*

### [`rebuild::item_tree`](rebuild/item_tree.md)

*2 functions*

### [`rebuild::repeat_data`](rebuild/repeat_data.md)

*1 function*

### [`rebuild::repeat_expand`](rebuild/repeat_expand.md)

*1 function*

### [`recalculate`](recalculate.md)

*1 function*

### [`recalculate::variables`](recalculate/variables.md)

*1 function*

### [`registry_constraints`](registry_constraints.md)

*1 function*

### [`revalidate`](revalidate.md)

*1 function*

### [`screener`](screener.md)

*1 function, 1 struct*

### [`types::definition`](types/definition.md)

*1 struct*

### [`types::evaluation`](types/evaluation.md)

*1 enum, 3 structs*

### [`types::extensions`](types/extensions.md)

*1 struct*

### [`types::item_tree`](types/item_tree.md)

*1 struct*

### [`types::modes`](types/modes.md)

*2 enums*

---

## Source: formspec_eval/formspec_eval.md

**formspec_eval**

# Module: formspec_eval

## Contents

**Modules**

- [`convert`](#convert) - Value resolution helpers for dotted paths and nested objects.
- [`nrb`](#nrb) - Phase 4: NRB (Non-Relevant Behavior) application.
- [`rebuild`](#rebuild) - Phase 1: Rebuild — build the item tree from a definition JSON.
- [`recalculate`](#recalculate) - Phase 2: Recalculate — evaluate computed values and bind expressions.
- [`revalidate`](#revalidate) - Phase 3: Revalidate — validate all constraints and shapes.
- [`screener`](#screener) - Screener evaluation — evaluate screener routes and return the first matching route.
- [`types`](#types) - Core types for the Formspec evaluator.

---

## Module: convert

Value resolution helpers for dotted paths and nested objects.



## Module: nrb

Phase 4: NRB (Non-Relevant Behavior) application.



## Module: rebuild

Phase 1: Rebuild — build the item tree from a definition JSON.



## Module: recalculate

Phase 2: Recalculate — evaluate computed values and bind expressions.

Submodules follow data flow: `json_fel` (coercion) → `variables` / `repeats` →
`bind_pass` (relevance, required, readonly, whitespace) → `calculate_pass` (fixpoint).



## Module: revalidate

Phase 3: Revalidate — validate all constraints and shapes.



## Module: screener

Screener evaluation — evaluate screener routes and return the first matching route.



## Module: types

Core types for the Formspec evaluator.

---

## Source: formspec_eval/convert.md

**formspec_eval > convert**

# Module: convert

## Contents

**Functions**

- [`resolve_value_by_path`](#resolve_value_by_path) - Resolve a value from a flat HashMap by dotted path, walking nested objects if needed.

---

## formspec_eval::convert::resolve_value_by_path

*Function*

Resolve a value from a flat HashMap by dotted path, walking nested objects if needed.
Returns an owned Value because the result may not exist in the HashMap.

```rust
fn resolve_value_by_path(values: &std::collections::HashMap<String, serde_json::Value>, path: &str) -> serde_json::Value
```

---

## Source: formspec_eval/eval_json.md

**formspec_eval > eval_json**

# Module: eval_json

## Contents

**Structs**

- [`EvalHostContextBundle`](#evalhostcontextbundle) - Parsed WASM / JSON evaluation context bundle.

**Functions**

- [`eval_host_context_from_json_map`](#eval_host_context_from_json_map) - Parse the optional JSON context object passed to `evaluateDefinition` from JavaScript.
- [`evaluation_result_to_json_value`](#evaluation_result_to_json_value) - Full batch evaluation output as JSON (matches `evaluateDefinition` WASM shape, camelCase).
- [`evaluation_result_to_json_value_styled`](#evaluation_result_to_json_value_styled) - Serialize [`EvaluationResult`] for host bindings (`JsCamel` vs `PythonSnake` keys).
- [`screener_route_to_json_value`](#screener_route_to_json_value) - Serialize a screener route for `evaluateScreener` (`null` when no match).

---

## formspec_eval::eval_json::EvalHostContextBundle

*Struct*

Parsed WASM / JSON evaluation context bundle.

**Fields:**
- `context: crate::types::EvalContext` - Clock, prior validations, and prior non-relevant paths.
- `trigger: crate::types::EvalTrigger` - Shape-rule timing for this batch (`submit` / `continuous` / …).
- `instances: std::collections::HashMap<String, serde_json::Value>` - Named instance payloads merged into the FEL environment.
- `constraints: Vec<crate::types::ExtensionConstraint>` - Extension constraints derived from optional registry documents in the context object.



## formspec_eval::eval_json::eval_host_context_from_json_map

*Function*

Parse the optional JSON context object passed to `evaluateDefinition` from JavaScript.

```rust
fn eval_host_context_from_json_map(ctx_obj: &serde_json::Map<String, serde_json::Value>) -> Result<EvalHostContextBundle, String>
```



## formspec_eval::eval_json::evaluation_result_to_json_value

*Function*

Full batch evaluation output as JSON (matches `evaluateDefinition` WASM shape, camelCase).

```rust
fn evaluation_result_to_json_value(result: &crate::types::EvaluationResult) -> serde_json::Value
```



## formspec_eval::eval_json::evaluation_result_to_json_value_styled

*Function*

Serialize [`EvaluationResult`] for host bindings (`JsCamel` vs `PythonSnake` keys).

```rust
fn evaluation_result_to_json_value_styled(result: &crate::types::EvaluationResult, style: formspec_core::JsonWireStyle) -> serde_json::Value
```



## formspec_eval::eval_json::screener_route_to_json_value

*Function*

Serialize a screener route for `evaluateScreener` (`null` when no match).

```rust
fn screener_route_to_json_value(route: Option<&crate::ScreenerRouteResult>) -> serde_json::Value
```

---

## Source: formspec_eval/nrb.md

**formspec_eval > nrb**

# Module: nrb

## Contents

**Functions**

- [`apply_nrb`](#apply_nrb) - Apply NRB to non-relevant fields.
- [`resolve_nrb`](#resolve_nrb) - Get the NRB mode for a given path using the lookup precedence:

---

## formspec_eval::nrb::apply_nrb

*Function*

Apply NRB to non-relevant fields.

```rust
fn apply_nrb(values: & mut std::collections::HashMap<String, serde_json::Value>, items: &[crate::types::ItemInfo], definition_default: &str)
```



## formspec_eval::nrb::resolve_nrb

*Function*

Get the NRB mode for a given path using the lookup precedence:
exact path -> wildcard -> stripped indices -> parent -> definition default.

```rust
fn resolve_nrb(path: &str, items: &[crate::types::ItemInfo], definition_default: &str) -> crate::types::NrbMode
```

---

## Source: formspec_eval/pipeline.md

**formspec_eval > pipeline**

# Module: pipeline

## Contents

**Functions**

- [`evaluate_definition`](#evaluate_definition) - Produce the final evaluation result.
- [`evaluate_definition_full`](#evaluate_definition_full) - Evaluate a definition with trigger mode and extension constraints from registries.
- [`evaluate_definition_full_with_context`](#evaluate_definition_full_with_context) - Evaluate a definition with trigger mode, extension constraints, and runtime context.
- [`evaluate_definition_full_with_instances`](#evaluate_definition_full_with_instances) - Evaluate a definition with trigger mode, extension constraints, and named instances.
- [`evaluate_definition_full_with_instances_and_context`](#evaluate_definition_full_with_instances_and_context) - Evaluate a definition with trigger mode, extension constraints, named instances, and runtime context.
- [`evaluate_definition_with_context`](#evaluate_definition_with_context) - Evaluate a definition with an explicit runtime context.
- [`evaluate_definition_with_trigger`](#evaluate_definition_with_trigger) - Evaluate a definition with an explicit trigger mode for shape timing.
- [`evaluate_definition_with_trigger_and_context`](#evaluate_definition_with_trigger_and_context) - Evaluate a definition with explicit trigger mode and runtime context.

---

## formspec_eval::pipeline::evaluate_definition

*Function*

Produce the final evaluation result.
Evaluate a definition with the default continuous trigger.

```rust
fn evaluate_definition(definition: &serde_json::Value, data: &std::collections::HashMap<String, serde_json::Value>) -> crate::types::EvaluationResult
```



## formspec_eval::pipeline::evaluate_definition_full

*Function*

Evaluate a definition with trigger mode and extension constraints from registries.

```rust
fn evaluate_definition_full(definition: &serde_json::Value, data: &std::collections::HashMap<String, serde_json::Value>, trigger: crate::types::EvalTrigger, extension_constraints: &[crate::types::ExtensionConstraint]) -> crate::types::EvaluationResult
```



## formspec_eval::pipeline::evaluate_definition_full_with_context

*Function*

Evaluate a definition with trigger mode, extension constraints, and runtime context.

```rust
fn evaluate_definition_full_with_context(definition: &serde_json::Value, data: &std::collections::HashMap<String, serde_json::Value>, trigger: crate::types::EvalTrigger, extension_constraints: &[crate::types::ExtensionConstraint], context: &crate::types::EvalContext) -> crate::types::EvaluationResult
```



## formspec_eval::pipeline::evaluate_definition_full_with_instances

*Function*

Evaluate a definition with trigger mode, extension constraints, and named instances.

```rust
fn evaluate_definition_full_with_instances(definition: &serde_json::Value, data: &std::collections::HashMap<String, serde_json::Value>, trigger: crate::types::EvalTrigger, extension_constraints: &[crate::types::ExtensionConstraint], instances: &std::collections::HashMap<String, serde_json::Value>) -> crate::types::EvaluationResult
```



## formspec_eval::pipeline::evaluate_definition_full_with_instances_and_context

*Function*

Evaluate a definition with trigger mode, extension constraints, named instances, and runtime context.

```rust
fn evaluate_definition_full_with_instances_and_context(definition: &serde_json::Value, data: &std::collections::HashMap<String, serde_json::Value>, trigger: crate::types::EvalTrigger, extension_constraints: &[crate::types::ExtensionConstraint], instances: &std::collections::HashMap<String, serde_json::Value>, context: &crate::types::EvalContext) -> crate::types::EvaluationResult
```



## formspec_eval::pipeline::evaluate_definition_with_context

*Function*

Evaluate a definition with an explicit runtime context.

```rust
fn evaluate_definition_with_context(definition: &serde_json::Value, data: &std::collections::HashMap<String, serde_json::Value>, context: &crate::types::EvalContext) -> crate::types::EvaluationResult
```



## formspec_eval::pipeline::evaluate_definition_with_trigger

*Function*

Evaluate a definition with an explicit trigger mode for shape timing.

```rust
fn evaluate_definition_with_trigger(definition: &serde_json::Value, data: &std::collections::HashMap<String, serde_json::Value>, trigger: crate::types::EvalTrigger) -> crate::types::EvaluationResult
```



## formspec_eval::pipeline::evaluate_definition_with_trigger_and_context

*Function*

Evaluate a definition with explicit trigger mode and runtime context.

```rust
fn evaluate_definition_with_trigger_and_context(definition: &serde_json::Value, data: &std::collections::HashMap<String, serde_json::Value>, trigger: crate::types::EvalTrigger, context: &crate::types::EvalContext) -> crate::types::EvaluationResult
```

---

## Source: formspec_eval/rebuild/item_tree.md

**formspec_eval > rebuild > item_tree**

# Module: rebuild::item_tree

## Contents

**Functions**

- [`parse_variables`](#parse_variables) - Parse variables from definition JSON.
- [`rebuild_item_tree`](#rebuild_item_tree) - Build the item tree from a definition JSON.

---

## formspec_eval::rebuild::item_tree::parse_variables

*Function*

Parse variables from definition JSON.

```rust
fn parse_variables(definition: &serde_json::Value) -> Vec<crate::types::VariableDef>
```



## formspec_eval::rebuild::item_tree::rebuild_item_tree

*Function*

Build the item tree from a definition JSON.

```rust
fn rebuild_item_tree(definition: &serde_json::Value) -> Vec<crate::types::ItemInfo>
```

---

## Source: formspec_eval/rebuild/repeat_data.md

**formspec_eval > rebuild > repeat_data**

# Module: rebuild::repeat_data

## Contents

**Functions**

- [`expand_wildcard_path`](#expand_wildcard_path) - Expand wildcard paths against actual repeat data.

---

## formspec_eval::rebuild::repeat_data::expand_wildcard_path

*Function*

Expand wildcard paths against actual repeat data.
For example, `items[*].total` with 3 items returns:
`["items[0].total", "items[1].total", "items[2].total"]`

```rust
fn expand_wildcard_path(pattern: &str, data: &std::collections::HashMap<String, serde_json::Value>) -> Vec<String>
```

---

## Source: formspec_eval/rebuild/repeat_expand.md

**formspec_eval > rebuild > repeat_expand**

# Module: rebuild::repeat_expand

## Contents

**Functions**

- [`expand_repeat_instances`](#expand_repeat_instances) - Expand repeatable groups into concrete indexed instances based on data.

---

## formspec_eval::rebuild::repeat_expand::expand_repeat_instances

*Function*

Expand repeatable groups into concrete indexed instances based on data.

For each repeatable group, counts instances in data and clones the
template children N times with indexed paths: `group[0].child`, `group[1].child`.

```rust
fn expand_repeat_instances(items: & mut [crate::types::ItemInfo], data: &std::collections::HashMap<String, serde_json::Value>)
```

---

## Source: formspec_eval/recalculate.md

**formspec_eval > recalculate**

# Module: recalculate

## Contents

**Functions**

- [`recalculate`](#recalculate) - Recalculate all computed values with full processing model.

---

## formspec_eval::recalculate::recalculate

*Function*

Recalculate all computed values with full processing model.

```rust
fn recalculate(items: & mut [crate::types::ItemInfo], data: &std::collections::HashMap<String, serde_json::Value>, definition: &serde_json::Value, now_iso: Option<&str>, previous_validations: Option<&[crate::types::ValidationResult]>, instances: &std::collections::HashMap<String, serde_json::Value>) -> (std::collections::HashMap<String, serde_json::Value>, std::collections::HashMap<String, serde_json::Value>, Option<String>)
```

---

## Source: formspec_eval/recalculate/variables.md

**formspec_eval > recalculate > variables**

# Module: recalculate::variables

## Contents

**Functions**

- [`topo_sort_variables`](#topo_sort_variables) - Topologically sort variables by their dependencies.

---

## formspec_eval::recalculate::variables::topo_sort_variables

*Function*

Topologically sort variables by their dependencies.

```rust
fn topo_sort_variables(variables: &[crate::types::VariableDef]) -> Result<Vec<String>, String>
```

---

## Source: formspec_eval/registry_constraints.md

**formspec_eval > registry_constraints**

# Module: registry_constraints

## Contents

**Functions**

- [`extension_constraints_from_registry_documents`](#extension_constraints_from_registry_documents) - Extract extension constraint payloads from raw registry documents (`entries` arrays).

---

## formspec_eval::registry_constraints::extension_constraints_from_registry_documents

*Function*

Extract extension constraint payloads from raw registry documents (`entries` arrays).

```rust
fn extension_constraints_from_registry_documents(docs: &[serde_json::Value]) -> Vec<crate::ExtensionConstraint>
```

---

## Source: formspec_eval/revalidate.md

**formspec_eval > revalidate**

# Module: revalidate

## Contents

**Functions**

- [`revalidate`](#revalidate) - Validate all constraints and shapes.

---

## formspec_eval::revalidate::revalidate

*Function*

Validate all constraints and shapes.

```rust
fn revalidate(items: &[crate::types::ItemInfo], values: &std::collections::HashMap<String, serde_json::Value>, variables: &std::collections::HashMap<String, serde_json::Value>, shapes: Option<&[serde_json::Value]>, trigger: crate::types::EvalTrigger, extension_constraints: &[crate::types::ExtensionConstraint], formspec_version: &str, now_iso: Option<&str>, instances: &std::collections::HashMap<String, serde_json::Value>) -> Vec<crate::types::ValidationResult>
```

---

## Source: formspec_eval/screener.md

**formspec_eval > screener**

# Module: screener

## Contents

**Structs**

- [`ScreenerRouteResult`](#screenerrouteresult) - Result of evaluating screener routes.

**Functions**

- [`evaluate_screener`](#evaluate_screener) - Evaluate screener routes and return the first matching route.

---

## formspec_eval::screener::ScreenerRouteResult

*Struct*

Result of evaluating screener routes.

**Fields:**
- `target: String` - Route `target` id from the matched screener route.
- `label: Option<String>` - Optional human-facing route label.
- `message: Option<String>` - Optional message shown when this route matches.
- `extensions: Option<serde_json::Value>` - Optional extension payload copied from the route object.

**Trait Implementations:**

- **PartialEq**
  - `fn eq(self: &Self, other: &ScreenerRouteResult) -> bool`
- **Clone**
  - `fn clone(self: &Self) -> ScreenerRouteResult`
- **Debug**
  - `fn fmt(self: &Self, f: & mut $crate::fmt::Formatter) -> $crate::fmt::Result`



## formspec_eval::screener::evaluate_screener

*Function*

Evaluate screener routes and return the first matching route.

Screener answers are evaluated in an isolated environment —
they never pollute the main form data.

```rust
fn evaluate_screener(definition: &serde_json::Value, answers: &std::collections::HashMap<String, serde_json::Value>) -> Option<ScreenerRouteResult>
```

---

## Source: formspec_eval/types/definition.md

**formspec_eval > types > definition**

# Module: types::definition

## Contents

**Structs**

- [`VariableDef`](#variabledef) - A definition variable with optional scope.

---

## formspec_eval::types::definition::VariableDef

*Struct*

A definition variable with optional scope.

**Fields:**
- `name: String` - Variable name as declared in `variables`.
- `expression: String` - FEL expression body (after optional `=` prefix stripped upstream).
- `scope: Option<String>` - Optional dotted path limiting where the variable is visible.

**Trait Implementations:**

- **Clone**
  - `fn clone(self: &Self) -> VariableDef`
- **Debug**
  - `fn fmt(self: &Self, f: & mut $crate::fmt::Formatter) -> $crate::fmt::Result`

---

## Source: formspec_eval/types/evaluation.md

**formspec_eval > types > evaluation**

# Module: types::evaluation

## Contents

**Structs**

- [`EvalContext`](#evalcontext) - Optional runtime context injected into a single evaluation cycle.
- [`EvaluationResult`](#evaluationresult) - Result of the full evaluation cycle.
- [`ValidationResult`](#validationresult) - Validation result for a single field.

**Enums**

- [`EvalTrigger`](#evaltrigger) - When to evaluate shape rules.

---

## formspec_eval::types::evaluation::EvalContext

*Struct*

Optional runtime context injected into a single evaluation cycle.

**Fields:**
- `now_iso: Option<String>` - Wall-clock instant for FEL `now()` / date helpers (ISO-8601 string).
- `previous_validations: Option<Vec<ValidationResult>>` - Prior cycle validation results (e.g. for host-driven revalidation hints).
- `previous_non_relevant: Option<Vec<String>>` - Paths that were non-relevant in the prior evaluation cycle.

**Trait Implementations:**

- **Debug**
  - `fn fmt(self: &Self, f: & mut $crate::fmt::Formatter) -> $crate::fmt::Result`
- **Default**
  - `fn default() -> EvalContext`
- **Clone**
  - `fn clone(self: &Self) -> EvalContext`



## formspec_eval::types::evaluation::EvalTrigger

*Enum*

When to evaluate shape rules.

**Variants:**
- `Continuous` - Evaluate only shapes with timing "continuous" (or no timing).
- `Submit` - Evaluate shapes with timing "continuous" or "submit" (skip "demand").
- `Demand` - Evaluate only shapes with timing "demand".
- `Disabled` - Skip all shape evaluation.

**Methods:**

- `fn from_python_eval_def_option(trigger: Option<&str>) -> Self` - Python `evaluate_def` trigger strings (`submit` / `disabled` / default → continuous).

**Traits:** Copy, Eq

**Trait Implementations:**

- **Clone**
  - `fn clone(self: &Self) -> EvalTrigger`
- **Debug**
  - `fn fmt(self: &Self, f: & mut $crate::fmt::Formatter) -> $crate::fmt::Result`
- **PartialEq**
  - `fn eq(self: &Self, other: &EvalTrigger) -> bool`



## formspec_eval::types::evaluation::EvaluationResult

*Struct*

Result of the full evaluation cycle.

**Fields:**
- `values: std::collections::HashMap<String, serde_json::Value>` - All field values after recalculation (post-NRB).
- `validations: Vec<ValidationResult>` - Validation results.
- `non_relevant: Vec<String>` - Fields marked non-relevant.
- `variables: std::collections::HashMap<String, serde_json::Value>` - Evaluated variable values.
- `required: std::collections::HashMap<String, bool>` - Required state by path.
- `readonly: std::collections::HashMap<String, bool>` - Readonly state by path.

**Trait Implementations:**

- **Clone**
  - `fn clone(self: &Self) -> EvaluationResult`
- **Debug**
  - `fn fmt(self: &Self, f: & mut $crate::fmt::Formatter) -> $crate::fmt::Result`



## formspec_eval::types::evaluation::ValidationResult

*Struct*

Validation result for a single field.

**Fields:**
- `path: String` - Path to the field.
- `severity: String` - Severity: error, warning, info.
- `constraint_kind: String` - Constraint kind: required, constraint, type, cardinality, shape.
- `code: String` - Validation code: REQUIRED, CONSTRAINT_FAILED, TYPE_MISMATCH, etc.
- `message: String` - Human-readable message.
- `constraint: Option<String>` - Original constraint expression when available.
- `source: String` - Source of the validation: bind, shape, definition.
- `shape_id: Option<String>` - Shape ID (for shape validations only).
- `context: Option<std::collections::HashMap<String, serde_json::Value>>` - Evaluated shape failure context values.

**Trait Implementations:**

- **PartialEq**
  - `fn eq(self: &Self, other: &ValidationResult) -> bool`
- **Clone**
  - `fn clone(self: &Self) -> ValidationResult`
- **Debug**
  - `fn fmt(self: &Self, f: & mut $crate::fmt::Formatter) -> $crate::fmt::Result`

---

## Source: formspec_eval/types/extensions.md

**formspec_eval > types > extensions**

# Module: types::extensions

## Contents

**Structs**

- [`ExtensionConstraint`](#extensionconstraint) - Pre-parsed extension constraint data from a registry entry.

---

## formspec_eval::types::extensions::ExtensionConstraint

*Struct*

Pre-parsed extension constraint data from a registry entry.
Passed into the evaluator from the PyO3 layer — no registry parsing here.

**Fields:**
- `name: String` - Extension name (e.g. "x-formspec-email").
- `display_name: Option<String>` - Display name for human-readable messages (e.g. "Email address").
- `pattern: Option<String>` - Regex pattern constraint (anchored).
- `max_length: Option<u64>` - Maximum string length.
- `minimum: Option<f64>` - Minimum numeric value.
- `maximum: Option<f64>` - Maximum numeric value.
- `base_type: Option<String>` - Base data type this extension expects (e.g. "string", "decimal").
- `status: String` - Lifecycle status: "stable", "deprecated", "retired", "draft".
- `deprecation_notice: Option<String>` - Deprecation notice text (when status is "deprecated").
- `compatibility_version: Option<String>` - Formspec version compatibility range (e.g. ">=1.0.0 <2.0.0").

**Trait Implementations:**

- **Clone**
  - `fn clone(self: &Self) -> ExtensionConstraint`
- **Debug**
  - `fn fmt(self: &Self, f: & mut $crate::fmt::Formatter) -> $crate::fmt::Result`

---

## Source: formspec_eval/types/item_tree.md

**formspec_eval > types > item_tree**

# Module: types::item_tree

## Contents

**Structs**

- [`ItemInfo`](#iteminfo) - A node in the evaluation item tree.

---

## formspec_eval::types::item_tree::ItemInfo

*Struct*

A node in the evaluation item tree.

**Fields:**
- `key: String` - Item key (leaf name, not full path).
- `path: String` - Full dotted path from root (e.g. "address.city").
- `item_type: String` - Normalized item type ("field", "group", "display", etc.).
- `data_type: Option<String>` - Data type (string, number, boolean, date, etc.).
- `currency: Option<String>` - Fixed currency for money fields, or the definition default currency.
- `value: serde_json::Value` - Current value.
- `relevant: bool` - Whether the item is relevant (visible).
- `required: bool` - Whether the item is required.
- `readonly: bool` - Whether the item is readonly.
- `calculate: Option<String>` - Calculated expression (if any).
- `precision: Option<u32>` - Numeric precision for calculated values.
- `constraint: Option<String>` - Constraint expression (if any).
- `constraint_message: Option<String>` - Author-provided constraint failure message (if any).
- `relevance: Option<String>` - Relevance expression (if any).
- `required_expr: Option<String>` - Required expression (if any).
- `readonly_expr: Option<String>` - Readonly expression (if any).
- `whitespace: Option<String>` - Whitespace normalization mode (if any).
- `nrb: Option<String>` - Non-relevant behavior override for this bind.
- `excluded_value: Option<String>` - Excluded value behavior when non-relevant ("null" or "keep").
- `default_value: Option<serde_json::Value>` - Default value to apply on non-relevant → relevant transition when field is empty.
- `default_expression: Option<String>` - FEL expression default (without `=` prefix) for relevance transitions.
- `initial_value: Option<serde_json::Value>` - Initial value for field seeding (literal or "=expr").
- `prev_relevant: bool` - Previous relevance state (for tracking transitions).
- `parent_path: Option<String>` - Parent path (None for top-level items).
- `repeatable: bool` - Whether this group is repeatable.
- `repeat_min: Option<u64>` - Minimum repeat count (for repeatable groups).
- `repeat_max: Option<u64>` - Maximum repeat count (for repeatable groups).
- `extensions: Vec<String>` - Extension names declared on this item (only enabled ones, value=true).
- `pre_populate_instance: Option<String>` - Pre-populate instance name (e.g. "userProfile").
- `pre_populate_path: Option<String>` - Pre-populate path within the instance (e.g. "contactEmail").
- `children: Vec<ItemInfo>` - Child items.

**Trait Implementations:**

- **Clone**
  - `fn clone(self: &Self) -> ItemInfo`
- **Debug**
  - `fn fmt(self: &Self, f: & mut $crate::fmt::Formatter) -> $crate::fmt::Result`

---

## Source: formspec_eval/types/modes.md

**formspec_eval > types > modes**

# Module: types::modes

## Contents

**Enums**

- [`NrbMode`](#nrbmode) - NRB (Non-Relevant Behavior) mode.
- [`WhitespaceMode`](#whitespacemode) - Whitespace normalization mode.

---

## formspec_eval::types::modes::NrbMode

*Enum*

NRB (Non-Relevant Behavior) mode.

**Variants:**
- `Remove` - Remove the field from output data.
- `Empty` - Set the field to null.
- `Keep` - Leave the field value unchanged.

**Traits:** Copy

**Trait Implementations:**

- **PartialEq**
  - `fn eq(self: &Self, other: &NrbMode) -> bool`
- **Clone**
  - `fn clone(self: &Self) -> NrbMode`
- **Debug**
  - `fn fmt(self: &Self, f: & mut $crate::fmt::Formatter) -> $crate::fmt::Result`



## formspec_eval::types::modes::WhitespaceMode

*Enum*

Whitespace normalization mode.

**Variants:**
- `Trim` - Strip leading and trailing Unicode whitespace.
- `Normalize` - Collapse internal runs of whitespace to a single ASCII space.
- `Remove` - Remove all Unicode whitespace characters.
- `Preserve` - Leave string values unchanged.

**Traits:** Copy

**Trait Implementations:**

- **PartialEq**
  - `fn eq(self: &Self, other: &WhitespaceMode) -> bool`
- **Clone**
  - `fn clone(self: &Self) -> WhitespaceMode`
- **Debug**
  - `fn fmt(self: &Self, f: & mut $crate::fmt::Formatter) -> $crate::fmt::Result`

---

