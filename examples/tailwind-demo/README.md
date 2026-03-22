# Tailwind adapter reference

Small Formspec example that exercises the **Tailwind CSS** render adapter (`packages/formspec-adapters/src/tailwind/`): text fields, select, date picker, slider, checkbox group, textarea, toggle, star rating, validation summary, and submit — laid out with component `Card` / `Grid` / `Stack`.

The [reference examples dashboard](../refrences/) links here via **`tailwind-demo/`** on the same host: the site build drops this app’s `dist/` into `public/references/tailwind-demo/` (base path `/references/tailwind-demo/`). For local static preview without a second server, from `examples/refrences` run **`npm run build:with-tailwind`**.

## Artifacts

| File | Role |
|------|------|
| `demo.definition.json` | Items, binds (required email/name, numeric constraints) |
| `demo.component.json` | Presentation tree bound to definition paths |
| `demo.theme.json` | Tokens, selectors (Tailwind utilities come from `tailwind-app.css` + Vite, not theme `stylesheets`) |
| `fixtures/*.response.json` | In-progress and completed response samples |

## Validate

From the repo root:

```bash
PYTHONPATH=src python3 examples/tailwind-demo/validate.py
```

## Run the standalone app

The Vite app in this folder registers `tailwindAdapter` and bundles the three JSON documents (works offline after build).

```bash
# From repo root (builds engine + web packages once)
npm run start:tailwind-demo

# Or from this folder after workspace install
npm run dev
```

Dev server defaults to port **8083**.
