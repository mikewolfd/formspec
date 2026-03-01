# Grant Application — Formspec Kitchen-Sink Reference

A complete vertical slice demonstrating the full Formspec lifecycle and nearly every feature across all specification tiers:
**screener routing → form authoring → browser rendering → submission → server re-validation → mapping output**

## What's here

**Spec artifacts (the form itself):**

| File | Spec | Purpose |
|---|---|---|
| `definition.json` | Core | 6-page grant application: items, binds, variables, shapes, screener, instances, migrations |
| `component.json` | Component | Wizard layout tree with 33 components, custom components, responsive design |
| `theme.json` | Theme | USWDS-flavored web theme: tokens, selectors, cascade, pages |
| `theme-pdf.json` | Theme | PDF-specific theme with print-first tokens and static selectors |
| `mapping.json` | Mapping | Bidirectional JSON transform (18 rules, valueMap, coerce, expression, array modes) |
| `mapping-csv.json` | Mapping | CSV export adapter (6 rules, flatten, column mapping) |
| `mapping-xml.json` | Mapping | XML export with namespaces, CDATA, element/attribute mapping |
| `changelog.json` | Changelog | Version 1.0→1.1 migration guide (8 change entries, impact levels) |
| `registry.json` | Registry | Extension registry: custom SSN type, fiscal-year function, DUNS constraint |
| `contact-fragment.json` | Core | Reusable contact group ($ref target for modular composition) |

**Submission samples:**

| File | Purpose |
|---|---|
| `sample-submission.json` | Complete valid response for curl testing |
| `submission-in-progress.json` | Partial submission (missing required fields) |
| `submission-amended.json` | Previously submitted form with corrections |
| `submission-stopped.json` | Abandoned/stopped submission state |

**Application shell:**

| File | Purpose |
|---|---|
| `index.html` | Portal page: gov header, sidebar progress nav, grid layout, sticky totals footer |
| `main.js` | Entry point: loads artifacts, wires reactive footer, handles wizard nav + submit |
| `grant-bridge.css` | Component styling layered on formspec-base.css (cards, tables, popovers, etc.) |
| `vite.config.js` | Dev server (port 8081) with repo-root middleware |
| `package.json` | Workspace config |

**Server:**

| File | Purpose |
|---|---|
| `server/main.py` | FastAPI: POST /submit → Python FEL re-validation + mapping output |
| `server/requirements.txt` | Python dependencies (fastapi, uvicorn, jsonschema, pydantic) |

**Documentation:**

| File | Purpose |
|---|---|
| `README.md` | This file |
| `REVIEW-PROMPT.md` | Design review workflow for frontend polish |

## Running

### 1. Install and build (one-time)

```bash
# From repo root
npm install
npm run build
```

### 2. Start the form (browser)

```bash
cd examples/grant-application
npm run dev
```

Open: http://localhost:8081

> `npm run start:grant-app` from the repo root is an alias.
> The `test:serve` script (port 8080) serves the Playwright test harness — use `npm run dev` here for the demo.

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

## Feature coverage by spec tier

### Core (data & logic)

<!-- filled by Task 3 -->

### FEL (expression language)

<!-- filled by Task 4 -->

### Theme (presentation)

<!-- filled by Task 5 -->

### Components (interaction)

<!-- filled by Task 6 -->

### Mapping DSL (data transforms)

<!-- filled by Task 7 -->

### Registry & Changelog (extensions & versioning)

<!-- filled by Task 8 -->

## What this does NOT cover

<!-- filled by Task 9 -->
