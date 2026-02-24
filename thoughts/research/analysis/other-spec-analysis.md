# Secondary Influences Research: Declarative Form Standard

Research conducted by examining live documentation for each system.

---

## 1. ODK XLSForm

**Sources:** <https://docs.getodk.org/form-logic/>, <https://xlsform.org/en/>

### Expression Syntax

- **`${field_name}` reference syntax**: A convenient shortcut that gets expanded to full XPath paths during XLSForm-to-XForm conversion. E.g., `${bill_amount}` expands to `/data/bill_amount`. This is the key usability innovation — it hides XPath complexity behind a simple template syntax.
- **Self-reference with `.` (dot)**: In constraint expressions, `.` refers to the current question's value. E.g., `. >= 18` means "the current field's value must be >= 18".
- **Parent reference with `..`**: `position(..)` gets the parent repeat instance's index. Standard XPath relative navigation.
- **Mixed notation**: `${field}` shorthand and raw XPath can be freely intermixed. E.g., `${people}[age < 18]/pet_count` mixes `${}` with XPath predicates.

### Calculations and Constraints

- **Calculations**: Defined via a `calculate` row type with the expression in a `calculation` column. The calculated value is referenced by the row's `name`. E.g., `round((${bill_amount} * 0.18), 2)`.
- **Constraints**: The `constraint` column holds a boolean expression evaluated on advance. `.` represents the entered value. E.g., `. > 20 and . < 200`. Failed constraints show a `constraint_message`.
- **Relevance (conditional visibility)**: The `relevant` column holds a boolean expression. If true, the question/group is shown. E.g., `${watch_sports} = 'yes'`.
- **Trigger column**: Controls *when* a calculation re-evaluates — only when the referenced field changes. This is a manual dependency declaration. E.g., `trigger: ${current_age}` means "recalculate only when current_age changes."
- **Dynamic defaults**: The `default` column can hold expressions evaluated once on record/repeat creation (not continuously).

### Repeat Groups and Indexed References

- **`begin_repeat` / `end_repeat`** wraps repeating question sets.
- **`repeat_count`** can be a fixed number or expression for dynamic counts.
- **`position()`** function returns the current repeat instance index (1-based).
- **Cross-instance references**: `${tree}[position() = position(current()/..) - 1]/species` — references a field from the *previous* repeat instance.
- **Nodeset filtering with predicates**: `${people}[age < 18]/pet_count` filters repeat instances; can pass to `sum()`, `count()`, etc.
- **`last-saved` references**: `${last-saved#street}` pulls values from the last saved record of the same form definition.

### Re-evaluation Model

Expressions are re-evaluated when:

- Form is opened
- Any question value changes
- A repeat group is added/deleted
- Form is saved/finalized

This is a **global reactive model** — every expression recalculates on every change (no dependency graph optimization mentioned).

### (a) Key Innovation Worth Borrowing

The **`${field_name}` shorthand** that compiles down to XPath. It proves you can have a human-friendly surface syntax that maps to a rigorous underlying model. The mixed-notation approach (simple refs + escape to full XPath when needed) is exactly the right layering.

Also: the **`.` (dot) self-reference** in constraints is elegant — it lets you write validation rules without naming the field being validated.

### (b) Main Limitation / Gap

- **No dependency graph**: All expressions re-evaluate on every change. The `trigger` column is a manual workaround for controlling evaluation timing, which is error-prone.
- **XPath is the ceiling**: Complex expressions require XPath knowledge, which is notoriously hard for non-developers.
- **Spreadsheet authoring only**: The XLSForm format is great for survey designers but doesn't translate to programmatic/API-driven form definition.
- **No typed expression language**: Empty numeric values become NaN silently; requires manual `coalesce()` workarounds.

### (c) Relation to XForms Concepts

XLSForm is a **direct sugar layer over XForms**. It compiles to ODK XForms XML. The `relevant`, `constraint`, `calculate`, and `required` columns map 1:1 to XForms bind attributes. The `${field}` syntax is literally a macro that expands to XPath `instance('...')/path/to/field`.

---

## 2. SurveyJS

**Source:** <https://surveyjs.io/form-library/documentation/design-survey/conditional-logic>, <https://surveyjs.io/form-library/documentation/data-validation>

### Expression Syntax and Field References

- **Curly brace syntax `{fieldName}`**: References question values. E.g., `"{q1} + {q2} > 20"`. Clean and simple.
- **Dot notation for nested values**: `{maxtrixid.rowid.columnid}`, `{dpanelid[index].qid}` for dynamic panels.
- **Array indexing**: `{qid[0]}`, `{dpanelid[-1].qid}` (negative indexes for "last", "second-to-last").
- **Relative context prefixes**: `{row.columnid}`, `{prevRow.columnid}`, `{panel.qid}`, `{parentPanel.qid}` — context-aware references within matrices and dynamic panels.
- **Element properties**: `{$elname.propname}` accesses metadata (visibility, custom properties), not just values. `{$self.propname}` for the current element. `{$item.propname}` for choice items in filtering expressions.
- **`#` prefix disables type coercion**: `{#q1}` prevents auto-conversion of "true"/"123" strings.

### Expression Engine

- **Built on PEG.js parser generator** — a proper grammar-based parser, not regex.
- **Rich operator set**: `empty`, `notempty`, `contains`, `anyof`, `allof`, `noneof` operators alongside standard comparison/arithmetic. Both symbolic (`>=`, `!=`) and word-form (`greaterorequal`, `notequal`) supported.
- **Built-in functions**: `iif()`, `age()`, `today()`, `sum()`, `avg()`, `round()`, `dateDiff()`, `dateAdd()`, `sumInArray()`, `countInArray()`, `displayValue()`, `propertyValue()`, `isContainerReady()`.
- **Custom function registration**: `registerFunction({ name, func, isAsync?, useCache? })`. Functions receive all args as a single array. Async functions supported with `this.returnResult()` callback or Promise return.
- **Expression validation**: `survey.validateExpressions()` detects unknown variables, unknown functions, semantic errors (always-true/false), and syntax errors. This is excellent for authoring tooling.

### Dependency Tracking

- Expressions are **parsed on model instantiation** and **re-evaluated each time dynamic values within them change**.
- The survey parses all expressions on startup and tracks which values they reference.
- Calculated values: `calculatedValues` array with `{ name, expression, includeIntoResult }` — these are re-evaluated when referenced values change.
- Variables vs. Calculated Values: Variables are set imperatively via `setVariable()` and evaluated once. Calculated values are declarative and continuously re-evaluated.

### Conditional Logic

- **`visibleIf`**: Boolean expression controls visibility. E.g., `"age({birthdate}) >= 16"`.
- **`enableIf`**: Controls read-only state.
- **`requiredIf`**: Controls required state dynamically.
- **`choicesVisibleIf`** / `rowsVisibleIf` / `columnsVisibleIf`: Filter items within a question using `{item}` placeholder.
- **Triggers**: `complete`, `setvalue`, `copyvalue`, `runexpression`, `skip` — action-oriented rules that fire when an expression becomes true.

### Validation

- **`checkErrorsMode`**: `"onValueChanged"` (immediate), `"onNextPage"` (default), `"onComplete"` (deferred).
- **Built-in validators**: `numeric`, `text` (length), `email`, `expression`, `answercount`, `regex`.
- **Expression validator**: `{ type: "expression", expression: "...", text: "error msg" }` — the most powerful, allows any boolean expression as a validator.
- **Server-side validation**: `onServerValidateQuestions` event with async `complete()` callback.
- **Async validator functions**: Register with `isAsync: true, useCache: true` for server-round-trip validations.
- **`validationAllowSwitchPages`**: Lets users navigate away from pages with errors.

### (a) Key Innovation Worth Borrowing

1. **PEG.js-based expression parser with rich operators**: `empty`, `notempty`, `contains`, `anyof`, `allof` are much more readable than function calls. The dual symbolic/word-form operators are inclusive.
2. **Expression validation API**: `validateExpressions()` that detects unknown refs, unknown functions, semantic errors — critical for form authoring tools.
3. **Async function support with caching**: `registerFunction({ isAsync: true, useCache: true })` is a clean pattern for server-validated expressions.
4. **Relative context prefixes** (`row.`, `panel.`, `prevRow.`): Elegant solution for referencing within repeating structures without XPath.
5. **Trigger system**: Declarative action rules (`setvalue`, `copyvalue`, `skip`) that complement the expression system.

### (b) Main Limitation / Gap

- **JSON-only definition**: No schema separation — the survey JSON mixes data model, UI layout, and logic. Hard to validate data shape independently.
- **Proprietary expression language**: Not based on any standard (not XPath, not JSONPath, not JavaScript). Lock-in risk.
- **No formal dependency graph exposure**: While it tracks dependencies internally, there's no API to inspect/visualize the dependency graph.
- **Commercial license**: Core is MIT but the ecosystem (Creator, Dashboard, PDF) is commercial.

### (c) Relation to XForms Concepts

- `visibleIf` = XForms `relevant`
- `enableIf` = XForms `readonly` (inverted)
- `requiredIf` = XForms `required`
- `calculatedValues` = XForms `calculate`
- Triggers map loosely to XForms actions/events
- **Missing**: No equivalent of XForms `bind` — logic is attached directly to questions rather than to a separate binding layer. This is the key architectural difference.

---

## 3. JSON Forms

**Source:** <https://jsonforms.io/docs/>, <https://jsonforms.io/docs/validation>, <https://jsonforms.io/docs/uischema/rules>

### Schema Separation (Data vs. UI)

This is JSON Forms' **core architectural insight**: complete separation of concerns into two schemas.

**JSON Schema (Data Schema):**

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "done": { "type": "boolean" },
    "rating": { "type": "integer" }
  },
  "required": ["name"]
}
```

**UI Schema:**

```json
{
  "type": "VerticalLayout",
  "elements": [
    { "type": "Control", "scope": "#/properties/name" },
    { "type": "Control", "scope": "#/properties/description", "options": { "multi": true } },
    { "type": "Control", "label": "Done?", "scope": "#/properties/done" }
  ]
}
```

- **`scope`** uses JSON Pointer syntax (`#/properties/name`) to reference the data schema.
- **Layout types**: `VerticalLayout`, `HorizontalLayout`, `Group`, `Categorization`.
- UI schema is optional — JSON Forms can auto-generate a default layout from the data schema alone.

### Rules (Conditional Logic)

Rules are attached to UI schema elements:

```json
{
  "rule": {
    "effect": "HIDE" | "SHOW" | "ENABLE" | "DISABLE",
    "condition": {
      "scope": "#/properties/counter",
      "schema": { "const": 10 }
    }
  }
}
```

**Key insight**: Conditions are expressed as **JSON Schema validation against scope data**. If the data at `scope` matches the `schema`, the condition is true. This means:

- `{ "const": 10 }` — exact match
- `{ "enum": ["foo", "bar"] }` — one of several values
- `{ "minimum": 1, "exclusiveMaximum": 10 }` — range
- `{ "not": { "const": 10 } }` — negation
- Can scope to `"#"` (root) for multi-property conditions with `required` and `properties`.
- `failWhenUndefined: true` option to fail when scope resolves to undefined.

### Validation Modes

- **`ValidateAndShow`** (default): Validates continuously, shows errors inline.
- **`ValidateAndHide`**: Validates and emits errors (available programmatically) but doesn't show them in UI.
- **`NoValidation`**: Skips validation entirely.

Validation is powered by **AJV** (Another JSON Validator) configured with `allErrors: true, verbose: true, strict: false`.

### External Error Injection

```jsx
<JsonForms additionalErrors={[
  { instancePath: '/lastname', message: 'Server says invalid', schemaPath: '', keyword: '', params: {} }
]} />
```

- External errors use AJV's `ErrorObject` format.
- They are **mixed in with** regular validation errors.
- They display **regardless of validationMode** — even with `NoValidation`, additional errors show.
- Must be stable/memoized to avoid unnecessary rerenders.

### Renderer Architecture

- **Custom renderers**: You can replace how any data type or UI element is rendered.
- **Renderer sets**: Swap between Material UI, Vanilla, Angular Material, Vue Vuetify.
- **Middleware**: Intercept and modify form behavior.

### (a) Key Innovation Worth Borrowing

1. **Clean data/UI schema separation**: The JSON Schema defines WHAT data exists and its constraints; the UI Schema defines HOW it's presented. This is the right architecture for a standard.
2. **JSON Schema as rule condition language**: Using JSON Schema itself (not a custom expression language) to evaluate rule conditions. Elegant reuse — no new syntax to learn for conditions.
3. **Three validation modes**: `ValidateAndShow`/`ValidateAndHide`/`NoValidation` is a practical tri-state that covers real-world needs (progressive disclosure, background validation, skip-for-now).
4. **External error injection via `additionalErrors`**: Critical for server-side validation integration. Uses the same error format as client-side validation.
5. **`scope` with JSON Pointer syntax**: `#/properties/name` is a standardized way to reference schema paths.

### (b) Main Limitation / Gap

- **No expression language**: Rules can only test conditions against JSON Schema patterns (const, enum, range). No calculations, no cross-field expressions like `fieldA + fieldB > 100`. This is a severe limitation for dynamic forms.
- **No calculation/compute model**: No equivalent of XForms `calculate`. You'd need to handle computed values in application code.
- **Rule conditions are single-scope**: Each condition evaluates one scope against one schema. Multi-field conditions require scoping to root `#` and writing nested JSON Schema, which is verbose.
- **No repeat/array-level expressions**: No way to express "sum of all items in this array" declaratively.

### (c) Relation to XForms Concepts

- JSON Schema = XForms model/schema (data structure + type constraints)
- UI Schema = XForms UI elements (group, input, select, etc.)
- Rules = simplified version of XForms `relevant`/`readonly` (but only HIDE/SHOW/ENABLE/DISABLE)
- **Missing**: No `calculate`, no `constraint` (beyond JSON Schema validation), no `bind` layer, no expression language.
- CommonGrants explicitly adopted JSON Forms' UI Schema format for their Form model.

---

## 4. CommonGrants

**Source:** <https://commongrants.org/protocol/models/mapping/>, <https://commongrants.org/governance/adr/0017-mapping-format/>, <https://commongrants.org/protocol/models/form/>

### Data Mapping DSL

CommonGrants defines a **JSON-based mapping schema** for bidirectional translation between platform-specific data and the canonical CommonGrants model.

**Three mapping operations:**

1. **`field`** — Direct field reference (dot-notation path):

   ```json
   { "field": "summary.opportunity_amount" }
   ```

2. **`const`** — Constant value:

   ```json
   { "const": "USD" }
   ```

3. **`switch`** — Value mapping (enum translation):

   ```json
   {
     "switch": {
       "field": "summary.opportunity_status",
       "case": { "active": "open", "inactive": "closed" },
       "default": "custom"
     }
   }
   ```

### Bidirectional Mappings on Form Model

The `FormBase` model includes:

- `mappingToCommonGrants: MappingSchema` — maps form data → CommonGrants canonical model
- `mappingFromCommonGrants: MappingSchema` — maps CommonGrants model → form data

Example showing both directions:

```json
{
  "mappingToCommonGrants": {
    "name": {
      "firstName": { "field": "name.first" },
      "lastName": { "field": "name.last" }
    }
  },
  "mappingFromCommonGrants": {
    "name": {
      "first": { "field": "name.firstName" },
      "last": { "field": "name.lastName" }
    }
  }
}
```

### Form Model Architecture

CommonGrants' `FormBase` combines:

- `jsonSchema: FormJsonSchema` — JSON Schema for data validation
- `uiSchema: FormUISchema` — JSON Forms-style UI schema for rendering
- `mappingToCommonGrants` / `mappingFromCommonGrants` — bidirectional data translation
- `customFields` — extensibility via `CustomField` model

This is a **four-layer architecture**: data schema + UI schema + mapping layer + extension points.

### ADR Analysis (ADR-0017)

They evaluated four options:

1. **JSON Mapping** (chosen) — Human-readable, serializable, validatable
2. **Schema Overlay** (x-map-from annotations) — Co-locates with schema but verbose
3. **JQ** — Powerful but not serializable, hard to validate
4. **Custom DSL** — Too expensive to maintain

**Planned future transformations:**

- Type conversion (string → number)
- String manipulation (concat, split, replace)
- Date/time manipulation
- Conditional logic
- Array manipulation (map, filter, reduce)

### (a) Key Innovation Worth Borrowing

1. **The mapping DSL itself**: `field`/`const`/`switch` is a minimal but effective vocabulary for data transformation. The output structure mirrors the target schema, making mappings self-documenting.
2. **Bidirectional mapping pairs**: `mappingTo` and `mappingFrom` on the same form model enables round-trip data translation — critical for interoperability.
3. **Four-layer form model**: Separating data schema, UI schema, mapping, and extensions is the most complete architecture of any system reviewed.
4. **ADR-driven design process**: Their evaluation criteria (human-readable, serializable, easy to validate, supports transformations, multi-runtime) are directly applicable.

### (b) Main Limitation / Gap

- **Extremely limited transformation vocabulary**: Only `field`, `const`, and `switch` today. No expressions, no arithmetic, no string manipulation yet.
- **No form logic layer**: The form model has data schema and UI schema but no equivalent of XForms bind for calculations, constraints, or relevance conditions.
- **Protocol focus, not runtime**: CommonGrants is a data exchange standard, not a form execution engine. Mappings are meant to be applied by SDKs, not executed in-browser.
- **Nascent (v0.2.0)**: Very early stage — the mapping format was only added recently.

### (c) Relation to XForms Concepts

- The mapping DSL is conceptually closest to **XForms submissions with transforms** — translating form instance data to/from external formats.
- The `FormBase` model's combination of jsonSchema + uiSchema echoes XForms' model + UI separation.
- **Missing**: Everything in the XForms `bind` layer (calculate, relevant, constraint, type). CommonGrants delegates form logic entirely to the rendering platform.

---

## 5. React JSON Schema Form (RJSF)

**Source:** <https://rjsf-team.github.io/react-jsonschema-form/docs/>, validation docs, dependencies docs

### How It Uses JSON Schema for Form Generation

- **Schema-driven**: Pass a JSON Schema → get a fully rendered form. No UI schema required (but supported via `uiSchema` prop for customization).
- **Type → Widget mapping**: `string` → text input, `boolean` → checkbox, `integer` → number input, `array` → dynamic list, `object` → fieldset.
- **JSON Schema features supported**:
  - `required`, `minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `enum`
  - `oneOf`, `anyOf`, `allOf` — rendered as selection widgets
  - `dependencies` (from draft-04) — property and schema dependencies
  - `if/then/else` — conditional schema
  - `$ref` and `$defs` — schema reuse

### Conditional Logic via JSON Schema

**Property dependencies** (make fields required based on other fields):

```json
{ "dependencies": { "credit_card": ["billing_address"] } }
```

**Schema dependencies** (show/modify fields based on values):

```json
{
  "dependencies": {
    "Do you have any pets?": {
      "oneOf": [
        { "properties": { "Do you have any pets?": { "enum": ["No"] } } },
        { "properties": { "Do you have any pets?": { "enum": ["Yes: One"] }, "How old is your pet?": { "type": "number" } } }
      ]
    }
  }
}
```

### Validation

- **AJV-based** (same as JSON Forms): Uses `@rjsf/validator-ajv8`.
- **`liveValidate`** prop: Validates on every change (expensive).
- **`customValidate` function**: Post-schema validation hook for cross-field validation:

  ```js
  function customValidate(formData, errors) {
    if (formData.pass1 !== formData.pass2) {
      errors.pass2.addError("Passwords don't match");
    }
    return errors;
  }
  ```

- **`extraErrors` prop**: Inject server-side errors.
- **`noHtml5Validate`**: Disable browser-native validation.
- **Precompiled validators**: For CSP-strict environments, compile AJV validators ahead of time.
- **Pluggable validator**: Implement `ValidatorType` interface for custom validator backends.

### uiSchema (Presentation Customization)

```json
{
  "ui:order": ["name", "age", "*"],
  "name": { "ui:widget": "textarea", "ui:placeholder": "Enter name" },
  "age": { "ui:widget": "updown" }
}
```

- `ui:widget` — override the default widget
- `ui:field` — override the entire field component
- `ui:order` — control field ordering
- `ui:options` — pass custom options
- Custom widgets and fields via props

### (a) Key Innovation Worth Borrowing

1. **"Schema-first, zero-config" philosophy**: Given just a JSON Schema, generate a usable form with validation. No UI schema required. This lowers the barrier to entry massively.
2. **JSON Schema `dependencies` for conditional logic**: Using standard JSON Schema constructs (dependencies, oneOf, if/then/else) for dynamic form behavior means no custom expression language needed for simple cases.
3. **Pluggable validator architecture**: `ValidatorType` interface allows swapping AJV for any validator. Precompiled validators solve real-world CSP issues.
4. **`customValidate` as escape hatch**: Simple function that receives formData and an errors proxy — lets you do arbitrary cross-field validation in plain JavaScript.

### (b) Main Limitation / Gap

- **No expression/calculation engine**: RJSF has ZERO support for computed fields, derived values, or expressions. If field C = field A + field B, you must handle this entirely in application code.
- **No declarative conditional visibility**: Visibility is controlled only through JSON Schema `dependencies` and `if/then/else`, which are extremely verbose for simple show/hide logic. No equivalent of `visibleIf: "{age} > 18"`.
- **No server-side rendering**: React-only (though themes exist for Material UI, Ant Design, Chakra, Bootstrap, Fluent UI).
- **Performance issues with liveValidate**: Full AJV validation on every keystroke is expensive for large forms.
- **`dependencies` is deprecated in JSON Schema**: RJSF relies on draft-04 `dependencies` which is not in modern JSON Schema specs.
- **uiSchema is a flat key-value overlay**, not a structured layout description like JSON Forms' UI Schema. Less expressive for complex layouts.

### (c) Relation to XForms Concepts

- JSON Schema properties = XForms instance + schema
- `dependencies` / `if-then-else` = very limited version of XForms `relevant`
- `customValidate` = imperative version of XForms `constraint`
- **Missing**: `calculate` (no computed values), `relevant` (no simple show/hide), proper `bind` (no separate binding layer), `submission` (form submission is a React callback, not declarative).
- RJSF is essentially "XForms minus the model layer" — it has the schema and the UI but no binding/computation layer in between.

---

## Cross-Cutting Synthesis

### Architecture Comparison

| System | Data Schema | UI Schema | Bind/Logic Layer | Expression Language | Mapping Layer |
|--------|------------|-----------|-------------------|--------------------|--------------|
| XForms | XML Schema | XForms UI | `<bind>` element | XPath | Submission transforms |
| ODK XLSForm | (implicit) | Spreadsheet rows | Columns (relevant, constraint, calculate) | XPath + `${}` sugar | N/A |
| SurveyJS | (embedded in JSON) | (embedded in JSON) | Properties (visibleIf, enableIf, etc.) | Custom PEG.js-based | N/A |
| JSON Forms | JSON Schema | UI Schema (separate) | Rules (limited) | JSON Schema conditions | N/A |
| RJSF | JSON Schema | uiSchema (flat overlay) | None | None | N/A |
| CommonGrants | JSON Schema | JSON Forms UI Schema | None (delegated) | None | `field`/`const`/`switch` DSL |

### Key Patterns to Adopt

1. **From ODK XLSForm**: The `${field}` → XPath compilation pattern. Prove you can have friendly syntax that compiles to a rigorous model. The `.` self-reference in constraints.

2. **From SurveyJS**: The PEG.js-based expression engine with rich operators (`empty`, `contains`, `anyof`). Expression validation API. Async function support with caching. Relative context prefixes for repeats (`row.`, `panel.`).

3. **From JSON Forms**: Clean data schema / UI schema separation. JSON Schema as a rule condition language. Three validation modes. External error injection. JSON Pointer scoping.

4. **From CommonGrants**: The `field`/`const`/`switch` mapping DSL. Bidirectional mapping pairs on form models. The four-layer architecture (data + UI + mapping + extensions).

5. **From RJSF**: Zero-config form generation from schema alone. Pluggable validator architecture. `customValidate` as an escape hatch pattern.

### The Gap None of Them Fill

No system reviewed has all three of:

1. A proper **expression language** (SurveyJS has this, others don't)
2. A clean **data/UI schema separation** (JSON Forms has this, SurveyJS doesn't)
3. A **formal bind layer** connecting data to logic (only XForms has this)

This is the opportunity space for a new declarative form standard: combine JSON Forms' schema separation with SurveyJS-quality expressions and XForms' bind architecture, add CommonGrants-style mapping, and make it all work with standard JSON Schema.
