# Cloudflare Form Deployment — Implementation Plan

**Date:** 2026-03-17
**Goal:** Let anyone deploy a live, functional Formspec form (with server-side Python validation) to Cloudflare in under 5 minutes.

---

## Architecture

```
Cloudflare (single project)
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Static Assets (Pages)              Python Worker                │
│  ┌────────────────────┐             ┌──────────────────────┐    │
│  │ index.html          │   /api/*   │ FastAPI (ASGI)       │    │
│  │ formspec.bundle.js  │ ─────────► │   POST /api/submit   │    │
│  │ formspec-base.css   │            │   POST /api/export/* │    │
│  │ definition.json     │ ◄───────── │                      │    │
│  │ component.json      │   JSON     │ formspec.evaluator   │    │
│  │ theme.json          │            │ formspec.mapping     │    │
│  └────────────────────┘             │ formspec.adapters    │    │
│                                      └──────┬───────────────┘    │
│                                             │                    │
│                                      ┌──────▼───────────────┐    │
│                                      │ D1 (SQLite)          │    │
│                                      │  submissions table   │    │
│                                      └──────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**How it works:**
- Static assets serve the form UI (HTML + bundled web component + JSON artifacts)
- `run_worker_first = ["/api/*"]` routes API calls to the Python Worker
- Worker runs `DefinitionEvaluator.process()` for server-side validation
- Worker optionally stores validated submissions in D1 (Cloudflare's SQLite)
- Everything deploys with `pywrangler deploy`

---

## Phases

### Phase 1: Self-Contained ESM Bundle

**What:** Add a Vite library-mode build to `formspec-webcomponent` that outputs a single `.js` file with all dependencies inlined.

**Why:** Currently the web component requires a bundler (bare workspace imports). A self-contained bundle is the prerequisite for any deploy story.

**Files to create/modify:**
- `packages/formspec-webcomponent/vite.config.bundle.ts` — Vite library-mode config
- `packages/formspec-webcomponent/package.json` — add `build:bundle` script, add `browser` export

**Vite config (sketch):**
```ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'formspec',
    },
    rollupOptions: {
      // Inline everything — no external deps
    },
    outDir: 'dist/bundle',
  },
});
```

**Output:**
- `dist/bundle/formspec.js` — single ESM file (~200-400 KB estimated, includes Chevrotain, Preact signals, AJV, all components)
- `dist/bundle/formspec-base.css` — base stylesheet

**Verification:** A plain `index.html` with `<script type="module">import { FormspecRender } from './formspec.js'</script>` works in a browser with no build tools.

**Estimated effort:** Small. Vite library mode is well-documented, the dependency tree is clean.

---

### Phase 2: Form Export CLI

**What:** A script that takes a form artifact directory and produces a ready-to-deploy folder.

**File to create:**
- `scripts/export-form.mjs` (Node.js script, runnable via `npx` or `node`)

**Input:** A directory containing form artifacts:
```
my-form/
├── definition.json       (required)
├── component.json        (optional)
├── theme.json            (optional)
└── registry.json         (optional)
```

**Output:** A deploy-ready folder:
```
deploy/
├── index.html            (generated — loads bundle, fetches artifacts, mounts <formspec-render>)
├── formspec.js           (copied from formspec-webcomponent/dist/bundle/)
├── formspec-base.css     (copied)
├── definition.json       (copied)
├── component.json        (copied if present)
├── theme.json            (copied if present)
└── registry.json         (copied if present)
```

**Generated `index.html` template:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{formTitle}}</title>
  <link rel="stylesheet" href="./formspec-base.css">
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem; }
    formspec-render { max-width: 48rem; margin: 0 auto; display: block; }
  </style>
</head>
<body>
  <formspec-render></formspec-render>
  <script type="module">
    import { FormspecRender } from './formspec.js';
    customElements.define('formspec-render', FormspecRender);

    const el = document.querySelector('formspec-render');

    const [def, comp, theme, reg] = await Promise.all([
      fetch('./definition.json').then(r => r.json()),
      fetch('./component.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('./theme.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('./registry.json').then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    if (reg) el.registryDocuments = [reg];
    el.definition = def;
    if (comp) el.componentDocument = comp;
    if (theme) el.themeDocument = theme;

    // Submit handler — POST to /api/submit if available, else log to console
    el.addEventListener('formspec-submit', async (e) => {
      const { response, validationReport } = e.detail;
      if (!validationReport.valid) return; // scroll-to-error already handled

      try {
        const res = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });
        const result = await res.json();
        console.log('Server validation:', result);
        // TODO: success UI
      } catch {
        console.log('No backend — client-only mode. Response:', response);
      }
    });
  </script>
</body>
</html>
```

**CLI interface:**
```bash
node scripts/export-form.mjs ./examples/grant-application --out ./deploy
# or eventually:
# npx formspec export ./examples/grant-application --out ./deploy
```

**Estimated effort:** Small. String templating + file copy.

---

### Phase 3: Cloudflare Worker for Python Validation

**What:** A Python Worker that runs `DefinitionEvaluator` and `MappingEngine` on submitted form data. The form definition is sent in the request body (no filesystem access needed).

**Directory structure to create:**
```
deploy-templates/cloudflare/
├── wrangler.jsonc              (Cloudflare config)
├── src/
│   └── entry.py                (Python Worker entry point — FastAPI app)
├── requirements.txt            (fastapi, pydantic)
└── README.md                   (setup instructions)
```

**`wrangler.jsonc`:**
```jsonc
{
  "name": "formspec-form",
  "compatibility_date": "2026-03-17",
  "compatibility_flags": ["python_workers"],
  "main": "src/entry.py",
  "assets": {
    "directory": "./public"       // static form files
  },
  // Route /api/* to Worker, everything else to static assets
  "run_worker_first": ["/api/*"],
  // D1 database for submission storage
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "formspec-submissions",
      "database_id": ""            // filled in by user after `wrangler d1 create`
    }
  ]
}
```

**`src/entry.py` (Python Worker):**
```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime, timezone

# formspec core — bundled as local package
from formspec.evaluator import DefinitionEvaluator
from formspec.mapping.engine import MappingEngine
from formspec.adapters import get_adapter

app = FastAPI()

class SubmitRequest(BaseModel):
    definition: dict          # full definition JSON (sent by client)
    definitionUrl: str
    definitionVersion: str
    status: str
    authored: str
    data: dict
    mapping: dict | None = None    # optional mapping document
    registry: dict | None = None   # optional registry document

class SubmitResponse(BaseModel):
    valid: bool
    results: list[dict]
    counts: dict[str, int]
    timestamp: str
    mapped: dict

@app.post("/api/submit")
async def submit(request: SubmitRequest, req: Request):
    # Run 4-phase validation
    evaluator = DefinitionEvaluator(request.definition)
    result = evaluator.process(request.data)

    # Optional mapping
    mapped = {}
    if request.mapping:
        engine = MappingEngine(request.mapping)
        mapped = engine.forward(result.data)

    response = SubmitResponse(
        valid=result.valid,
        results=result.results,
        counts=result.counts,
        timestamp=datetime.now(timezone.utc).isoformat(),
        mapped=mapped,
    )

    # Store in D1 if available
    try:
        db = req.scope["env"].DB
        await db.prepare(
            "INSERT INTO submissions (definition_url, version, data, valid, created_at) VALUES (?, ?, ?, ?, ?)"
        ).bind(
            request.definitionUrl,
            request.definitionVersion,
            __import__('json').dumps(request.data),
            result.valid,
            response.timestamp,
        ).run()
    except Exception:
        pass  # D1 is optional

    return response

@app.post("/api/export/{format}")
async def export_data(format: str, request: SubmitRequest):
    evaluator = DefinitionEvaluator(request.definition)
    result = evaluator.process(request.data)

    if not request.mapping:
        return JSONResponse({"error": "No mapping document provided"}, status_code=400)

    engine = MappingEngine(request.mapping)
    mapped = engine.forward(result.data)

    adapter_config = request.mapping.get("adapters", {}).get(format)
    target_schema = request.mapping.get("targetSchema")
    adapter = get_adapter(format, config=adapter_config, target_schema=target_schema)

    content_types = {"json": "application/json", "csv": "text/csv", "xml": "application/xml"}
    content = adapter.serialize(mapped)

    from fastapi.responses import Response
    return Response(content=content, media_type=content_types.get(format, "application/octet-stream"))

@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

**Key design decisions:**
- **Definition sent in request body** — no filesystem access needed. The client already has the definition JSON loaded; it sends it along with the submission. This avoids the Worker needing to know about file paths.
- **D1 storage is optional** — if the binding exists, submissions are stored. If not, the Worker is validation-only.
- **Mapping document also sent in body** — keeps the Worker stateless.

**Python package bundling:**
- The `formspec` package (minus `validator/`) needs to be available to the Worker
- Use `pywrangler` which bundles packages into the Worker automatically
- Add `formspec` as a local dependency in `requirements.txt`, or copy the source files into the Worker's `src/` directory

**Estimated effort:** Medium. The FastAPI app is simple (port of existing reference server), but Python Workers are beta — may hit packaging edge cases.

---

### Phase 4: Deploy CLI (`formspec deploy cloudflare`)

**What:** A single command that assembles a complete Cloudflare project (static + Worker) and deploys it.

**File to create:**
- `scripts/deploy-cloudflare.mjs`

**Flow:**
```
1. Run export-form.mjs → produces static files in temp/public/
2. Copy deploy-templates/cloudflare/ → temp/
3. Copy formspec Python package into temp/src/formspec/
4. Move static output to temp/public/
5. Run `pywrangler deploy` (or `wrangler deploy`) in temp/
6. Print live URL
```

**CLI interface:**
```bash
node scripts/deploy-cloudflare.mjs ./examples/grant-application
# → Deploying to Cloudflare...
# → ✓ Static assets: 6 files
# → ✓ Python Worker: formspec evaluator + mapping
# → ✓ D1 database: formspec-submissions
# →
# → Live at: https://formspec-form.your-account.workers.dev
```

**Prerequisites the user needs:**
1. Cloudflare account (free)
2. `wrangler` CLI authenticated (`wrangler login`)
3. Optionally: `wrangler d1 create formspec-submissions` for persistence

**Estimated effort:** Medium. Mostly glue code, but needs testing of the `pywrangler` deploy flow.

---

### Phase 5: Submission Storage & Retrieval

**What:** D1 schema for persisting form submissions, plus a simple retrieval endpoint.

**D1 Schema:**
```sql
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  definition_url TEXT NOT NULL,
  version TEXT NOT NULL,
  data TEXT NOT NULL,            -- JSON blob
  valid INTEGER NOT NULL,        -- 0 or 1
  validation_results TEXT,       -- JSON blob
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX idx_submissions_definition ON submissions(definition_url);
CREATE INDEX idx_submissions_created ON submissions(created_at);
```

**Additional endpoints on the Worker:**
```python
@app.get("/api/submissions")
async def list_submissions(req: Request, limit: int = 50, offset: int = 0):
    db = req.scope["env"].DB
    rows = await db.prepare(
        "SELECT id, definition_url, version, valid, created_at FROM submissions ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(limit, offset).all()
    return {"submissions": rows.results}

@app.get("/api/submissions/{id}")
async def get_submission(id: int, req: Request):
    db = req.scope["env"].DB
    row = await db.prepare(
        "SELECT * FROM submissions WHERE id = ?"
    ).bind(id).first()
    if not row:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return row
```

**Estimated effort:** Small. D1 API is straightforward.

---

## Build Order & Dependencies

```
Phase 1: ESM Bundle
   │  (no deps — can start immediately)
   ▼
Phase 2: Export CLI
   │  (depends on Phase 1 output)
   ▼
Phase 3: Python Worker  ◄── can start in parallel with Phase 2
   │  (needs formspec Python package, independent of JS bundle)
   ▼
Phase 4: Deploy CLI
   │  (depends on Phase 2 + Phase 3)
   ▼
Phase 5: D1 Storage
   (depends on Phase 3 Worker being functional)
```

**Phases 1 and 3 can be developed in parallel** — the JS bundle and Python Worker are independent until Phase 4 combines them.

---

## Client-Side Changes

The generated `index.html` (Phase 2) needs to send the **definition JSON along with the submission** to the Worker. This is a small change from the current reference app pattern (where the server loads definitions from disk). The client already has the definition in memory — it just needs to include it in the POST body.

**Modified submit payload:**
```javascript
el.addEventListener('formspec-submit', async (e) => {
  const { response } = e.detail;
  const body = {
    ...response,                    // definitionUrl, definitionVersion, data, etc.
    definition: currentDefinition,  // full definition JSON
    mapping: currentMapping,        // optional
    registry: currentRegistry,      // optional
  };
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
});
```

---

## Cloudflare-Specific Constraints & Risks

| Constraint | Impact | Mitigation |
|---|---|---|
| Python Workers are **beta** | API may change | Pin `compatibility_date`, test thoroughly |
| 10ms CPU free tier limit | Complex forms may timeout | Paid plan has 50ms; or move to unbound (30s) |
| 1s cold start (with snapshots) | First request slow-ish | Acceptable for form submission; not for page load |
| `formspec` not on PyPI | Can't `pip install` in Worker | Bundle source directly into Worker `src/` |
| `jsonschema` availability unclear | Validator won't work | Excluded from Worker scope (Phase 3 excludes `validator/`) |
| D1 10 GB limit (free) | Fine for form data | Thousands of submissions before this matters |
| Pyodide package size | Worker bundle may be large | Snapshots reduce cold start impact |

---

## What This Enables

After all 5 phases, a user can:

```bash
# 1. Author a form (definition + component + theme JSON)
# 2. Deploy it
node scripts/deploy-cloudflare.mjs ./my-form/

# Result:
# - Live form at https://my-form.workers.dev
# - Server-side Python validation on submit
# - Submissions stored in D1 SQLite
# - Global edge deployment (330 locations)
# - Free tier covers most use cases
```

---

## Sources

- [Cloudflare Workers Python docs](https://developers.cloudflare.com/workers/languages/python/)
- [FastAPI on Cloudflare Workers](https://developers.cloudflare.com/workers/languages/python/packages/fastapi/)
- [Python Workers — fast cold starts (Jan 2026)](https://blog.cloudflare.com/python-workers-advancements/)
- [Wrangler configuration reference](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare Workers static assets routing](https://developers.cloudflare.com/workers/static-assets/)
- [Query D1 from Python Workers](https://developers.cloudflare.com/d1/examples/query-d1-from-python-workers/)
- [D1 overview](https://developers.cloudflare.com/d1/)
- [Python packages supported in Workers](https://developers.cloudflare.com/workers/languages/python/packages/)
- [Pyodide built-in packages](https://pyodide.org/en/stable/usage/packages-in-pyodide.html)
