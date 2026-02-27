# Grant Application — Formspec Reference Implementation

A complete vertical slice demonstrating the full Formspec lifecycle:
**form authoring → browser rendering → submission → server re-validation → mapping output**

## What's here

| File | Purpose |
|---|---|
| `definition.json` | 4-page grant application definition (items, binds, variables, shapes) |
| `component.json` | Wizard layout tree with DataTable budget and ConditionalGroup subcontractors page |
| `theme.json` | USWDS-flavored token set |
| `mapping.json` | Transforms submission → grants-management flat JSON |
| `sample-submission.json` | A complete valid response for curl testing |
| `index.html` | Styled portal page with sticky totals footer |
| `main.js` | App entry point — loads artifacts, wires engine signals, handles submit |
| `grant-bridge.css` | Portal-specific styles layered on top of formspec-base.css |
| `vite.config.ts` | Vite dev server config (port 8081) |
| `server/main.py` | FastAPI server: POST /submit → re-validate + map |

## Running

### 1. Install and build (one-time)

```bash
# From repo root — installs workspaces including the grant-application example
npm install

# Build the TypeScript packages
npm run build
```

### 2. Start the form (browser)

```bash
# From examples/grant-application
npm run dev
```

Then open: `http://localhost:8081`

> **Note:** `npm run start:grant-app` from the repo root is an alias for the same thing.
> The `start:test-server` script (port 8080) serves the Playwright test harness — use `npm run dev` here for the demo.

### 3. Start the API server (separate terminal)

```bash
cd examples/grant-application
pip install -r server/requirements.txt
PYTHONPATH=../../src uvicorn server.main:app --reload --port 8000
```

### 4. Test with curl (no browser needed)

```bash
curl -X POST http://localhost:8000/submit \
  -H "Content-Type: application/json" \
  -d @sample-submission.json | python3 -m json.tool
```

## What this exercises

- **Repeatable groups** (`lineItems`, `subcontractors`) with min/max cardinality
- **Money calculations** — element-wise `moneyAmount($unitCost) * $quantity`, `moneySum()`, `moneyAdd()`
- **Variables** — `@totalDirect`, `@indirectCosts`, `@grandTotal` computed once, used in shapes
- **Conditional relevance** — subcontractors page only when `usesSubcontractors = true`; indirect rate hidden for government orgs
- **Validation shapes** — cross-field budget match, 49% subcontractor cap, $500k warning threshold
- **Mapping DSL** — value maps, expression transforms (money field splitting), conditional rules
- **Server-side re-validation** — Python FEL evaluator re-checks constraints independently of the client
- **Reactive footer** — sticky totals bar driven by `engine.variableSignals` and `@preact/signals-core` effects

## What this does NOT cover

See `specs/core/spec.llm.md` for: screener routing, modular composition (`$ref`), version migrations,
extension registry, remote data sources (`@instance()`), CSV/XML adapter output.
