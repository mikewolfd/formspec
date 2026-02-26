---
name: formspec-integrate
description: >
  Helps integrate Formspec into applications — embedding the <formspec-render> web component,
  authoring component documents (tree-based custom layout), authoring theme documents (design
  tokens and cascade), using FormEngine directly for reactive or headless use, handling form
  responses and validation reports, and running server-side validation with the Python toolkit.
  Use this skill whenever someone is: rendering a form in a browser, customizing layout with
  a component document, styling with a theme document, reading or handling submitted responses,
  using FormEngine signals for reactive UI, registering custom components, or validating
  form submissions on the server with Python.
---

# Formspec Integrate

You help people get a Formspec form working in a real application. This covers the rendering
layer (web component, component document, theme), the FormEngine API for advanced reactive use,
and the Python backend for server-side validation.

## Minimal browser integration

```html
<!-- 1. Import -->
<script type="module">
  import { FormspecRender } from 'formspec-webcomponent';
  customElements.define('formspec-render', FormspecRender);
</script>

<!-- 2. Place -->
<formspec-render id="form"></formspec-render>

<!-- 3. Wire -->
<script>
  const el = document.querySelector('formspec-render');
  el.definition = { /* your Formspec definition JSON */ };
  el.addEventListener('formspec-submit', (e) => {
    console.log(e.detail); // structured response object
  });
</script>
```

That's it for basic rendering. The element auto-renders from the definition using a built-in
default theme. A component document and theme document are optional enhancements.

## The response object

`formspec-submit` fires with `e.detail` shaped as:

```json
{
  "definitionUrl": "https://example.org/forms/my-form",
  "definitionVersion": "1.0.0",
  "status": "completed",
  "data": { "fieldKey": "value" },
  "validationResults": [],
  "authored": "2024-01-15T10:30:00Z"
}
```

`status` is `"completed"` only when all error-level validation passes (warnings don't block it).
`data` reflects `nonRelevantBehavior` — by default non-relevant fields are omitted (`"remove"`).

## Accessing the engine directly

Call `el.getEngine()` to access FormEngine for reactive UI or programmatic control:

```javascript
import { effect } from '@preact/signals-core';

const engine = el.getEngine();

// Read a field value
const value = engine.signals['fieldKey'].value;

// Subscribe to a variable reactively — variable signals are keyed "scope:name"
const cleanup = effect(() => {
  const total = engine.variableSignals['#:grandTotal'].value;
  document.getElementById('total').textContent = total?.amount ?? '—';
});

// Add/remove repeat instances programmatically
const newIndex = engine.addRepeatInstance('lineItems');
engine.removeRepeatInstance('lineItems', 0);

// Get full validation state
const report = engine.getValidationReport({ mode: 'submit' });
// report: { valid, results, counts: { error, warning, info }, timestamp }
```

For the full FormEngine API (all signal properties, methods, replay, diagnostics snapshot):
→ `packages/formspec-engine/README.md`

## Component document (custom layout)

Without a component document, the element auto-renders fields in definition order. Add a
component document for explicit layout control and widget selection.

```json
{
  "$formspecComponent": "1.0",
  "version": "1.0.0",
  "targetDefinition": { "url": "https://example.org/forms/my-form" },
  "tree": {
    "type": "Wizard",
    "children": [
      {
        "type": "Page", "id": "page1", "title": "Applicant Info",
        "children": [
          { "type": "Stack", "children": [
            { "type": "TextInput", "bind": "orgName" },
            { "type": "Select", "bind": "orgType" }
          ]}
        ]
      }
    ]
  }
}
```

Set it on the element: `el.componentDocument = componentDoc;`

Setting `definition`, `componentDocument`, and `themeDocument` are all microtask-deferred —
setting multiple properties in the same synchronous block causes only one render.

**Key rules:**
- Layout components (`Stack`, `Grid`, `Page`, `Wizard`, etc.) cannot have `bind` — structural only
- Input components require `bind` pointing to a definition item key
- `when` on any component is a FEL expression for visual conditional rendering; it does not
  affect data semantics (use `relevant` bind in the definition for data-level control)
- `DataTable` binds to a repeatable group key, renders one editable row per instance
- The `tree` must have exactly one root node — wrap multi-root layouts in `Stack` or `Page`

**Component categories:**

| Category | Components |
|----------|------------|
| Layout | `Page`, `Stack`, `Grid`, `Columns`, `Wizard`, `Tabs`, `Accordion`, `Collapsible`, `Panel`, `Modal`, `Popover` |
| Inputs | `TextInput`, `NumberInput`, `Select`, `Toggle`, `Checkbox`, `DatePicker`, `RadioGroup`, `CheckboxGroup`, `Slider`, `Rating`, `FileUpload`, `Signature`, `MoneyInput` |
| Display | `Heading`, `Text`, `Card`, `Spacer`, `Alert`, `Badge`, `ProgressBar`, `Summary` |
| Special | `ConditionalGroup`, `DataTable` |

**`Summary` `optionSet`**: when a summary item displays a `choice` field, set `optionSet` to
resolve the raw value to its display label:
```json
{ "label": "Org Type", "bind": "orgType", "optionSet": "orgTypes" }
```
Without it, the summary shows `"nonprofit"` instead of `"Nonprofit"`.

**`MoneyInput` fixed currency**: when `item.currency` or `formPresentation.defaultCurrency`
is set in the definition, the currency input is replaced with a read-only badge. No extra
component configuration needed — it follows the definition automatically.

For the full component catalog with all props, conformance levels, and responsive design:
→ `specs/component/component-spec.llm.md`

## Theme document

Without a theme document, the built-in default theme is used. Provide a theme for custom
tokens, widget defaults, and design-system integration:

```json
{
  "$formspecTheme": "1.0",
  "version": "1.0.0",
  "targetDefinition": { "url": "https://example.org/forms/my-form" },
  "tokens": {
    "color": { "primary": "#005ea2", "error": "#e52207" },
    "spacing": { "md": "16px", "lg": "24px" },
    "type": { "fontFamily": "system-ui, sans-serif", "baseSize": "16px" }
  },
  "defaults": {
    "labelPosition": "top",
    "widget": { "choice": "radio" }
  }
}
```

Set it: `el.themeDocument = themeDoc;`

Tokens emit as CSS custom properties on `.formspec-container`: `tokens.color.primary` →
`--formspec-color-primary`. Reference in CSS or via `$token.color.primary` in component props.

**Cascade order** (lowest → highest priority):
Tier 1 item hints → theme `defaults` → theme `selectors` (document order) → theme `items`
per-key → component document

For the full theme spec (selector matching, `x-classes` slot binding for design systems,
widget resolution, external stylesheet loading):
→ `specs/theme/theme-spec.llm.md`

## Custom component registration

Register custom components before setting `el.definition`:

```javascript
import { globalRegistry } from 'formspec-webcomponent/registry';

globalRegistry.register({
  type: 'x-star-rating',   // must start with x-
  render: (comp, parent, ctx) => {
    // comp = component node from the component document
    // ctx.engine = FormEngine instance
    // ctx.prefix = current repeat path prefix (e.g., "lineItems[0].")
    // ctx.renderComponent = recurse into children
    const el = document.createElement('div');
    parent.appendChild(el);
  }
});
```

## Server-side validation (Python)

Always re-validate on the server — the browser is untrusted.

```python
from formspec.validator import lint
from formspec.fel import evaluate
import json

# Load your definition
with open("definition.json") as f:
    definition = json.load(f)

# 1. Lint the definition (catches schema errors, bad FEL, broken bind paths)
diagnostics = lint(definition, mode="strict")
errors = [d for d in diagnostics if d.severity == "error"]

# 2. Re-evaluate FEL constraints against submitted data
result = evaluate(
    "$endDate > $startDate",
    {"startDate": response["data"]["startDate"], "endDate": response["data"]["endDate"]}
)
constraint_passed = result.value  # FelBoolean or FelNull

# 3. Validate the response envelope against the schema
import jsonschema
with open("schemas/response.schema.json") as f:
    response_schema = json.load(f)
jsonschema.validate(instance=response, schema=response_schema)
```

**CLI linter:**

```bash
python -m formspec.validator definition.json              # authoring (lenient)
python -m formspec.validator --mode strict definition.json  # CI (escalates warnings)
python -m formspec.validator --format json definition.json  # JSON output
```

Exit code 1 if errors, 0 if clean. Key diagnostic codes: `E101` schema error, `E300` unresolved
bind path, `E400` invalid FEL syntax, `E500` dependency cycle.

For the full Python API (FEL evaluator, all diagnostic codes, adapters, mapping engine):
→ `src/formspec/README.md`

## Reference files

Load these when you need full detail beyond what's covered above:

- `packages/formspec-webcomponent/README.md` — Full web component API, render lifecycle,
  accessibility attributes, theme resolution internals, slot binding (`x-classes`)
- `packages/formspec-engine/README.md` — All FormEngine signals and methods, validation
  logic, reactive patterns, replay/diagnostics snapshot
- `specs/component/component-spec.llm.md` — Full component catalog, all props, conformance
  levels, responsive `breakpoint` overrides
- `specs/theme/theme-spec.llm.md` — Theme cascade details, selector semantics, `x-classes`
  for design system integration, external stylesheet ref-counting
- `src/formspec/README.md` — Python: full validator diagnostic codes, FEL evaluator API,
  format adapters (JSON/XML/CSV), mapping engine
