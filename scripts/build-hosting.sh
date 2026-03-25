#!/usr/bin/env bash
set -euo pipefail

# Build all apps and assemble into public/ for Firebase Hosting.
#
# Layout:
#   public/
#   ├── index.html              ← marketing site
#   ├── docs/                   ← HTML specs + API docs (Python, TypeScript, Rust)
#   ├── studio/                 ← studio SPA
#   ├── references/             ← reference frontend
#   ├── examples/               ← form definition data (used by references)
#   ├── registries/             ← registry JSON (used by references)
#   └── schemas/                ← JSON Schema files (public spec)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC="$ROOT/public"

echo "==> Cleaning public/"
rm -rf "$PUBLIC"
mkdir -p "$PUBLIC"

# ── 0. Generate API docs + HTML specs (if tools are available) ──
# HTML specs require pandoc; API docs require pdoc, typedoc, and cargo.
# CI may not have all of these — generate what we can, skip what we can't.
# For a full build, run `make docs` locally before deploying.
if command -v pandoc &>/dev/null; then
  echo "==> Generating HTML specs (pandoc found)"
  (cd "$ROOT" && make html-docs)
else
  echo "==> Skipping HTML spec generation (pandoc not found)"
fi
if command -v cargo &>/dev/null; then
  echo "==> Generating Rust API docs"
  (cd "$ROOT" && cargo doc --workspace --no-deps && rm -rf docs/api/rust && cp -r target/doc docs/api/rust)
else
  echo "==> Skipping Rust API docs (cargo not found)"
fi
if command -v npx &>/dev/null && npx typedoc --version &>/dev/null 2>&1; then
  echo "==> Generating TypeScript API docs"
  (cd "$ROOT" && npx typedoc --entryPoints packages/formspec-engine/src/index.ts --tsconfig packages/formspec-engine/tsconfig.json --out docs/api/formspec-engine)
  (cd "$ROOT" && npx typedoc --entryPoints packages/formspec-webcomponent/src/index.ts --tsconfig packages/formspec-webcomponent/tsconfig.json --out docs/api/formspec-webcomponent)
  (cd "$ROOT" && npx typedoc --entryPoints packages/formspec-core/src/index.ts --tsconfig packages/formspec-core/tsconfig.json --out docs/api/formspec-core)
  (cd "$ROOT" && npx typedoc --entryPoints packages/formspec-chat/src/index.ts --tsconfig packages/formspec-chat/tsconfig.json --out docs/api/formspec-chat)
  (cd "$ROOT" && npx typedoc --entryPoints packages/formspec-mcp/src/index.ts --tsconfig packages/formspec-mcp/tsconfig.json --out docs/api/formspec-mcp)
else
  echo "==> Skipping TypeScript API docs (typedoc not found)"
fi

# ── 1. Marketing site + Studio (Astro SSG + Vite SPA) ──
echo "==> Building marketing site and studio"
(cd "$ROOT/site" && npm run build)
cp -r "$ROOT/site/dist/"* "$PUBLIC/"

# ── 2. Reference frontend ──
echo "==> Building references"
(cd "$ROOT/examples/refrences" && npx vite build --base=/references/)
cp -r "$ROOT/examples/refrences/dist/" "$PUBLIC/references/"

# References SPA uses base /references/ — example JSON must live under references/examples/
echo "==> Copying reference example data (nested under /references/)"
mkdir -p "$PUBLIC/references/examples"
for dir in clinical-intake grant-application grant-report invoice uswds-grant; do
  cp -r "$ROOT/examples/$dir" "$PUBLIC/references/examples/$dir"
done
mkdir -p "$PUBLIC/references/registries"
cp "$ROOT/registries/"*.json "$PUBLIC/references/registries/"

# ── 3. Example data + registries (site root /examples, /registries) ──
echo "==> Copying example data"
mkdir -p "$PUBLIC/examples"
for dir in clinical-intake grant-application grant-report invoice uswds-grant; do
  cp -r "$ROOT/examples/$dir" "$PUBLIC/examples/$dir"
done

echo "==> Copying registries"
cp -r "$ROOT/registries" "$PUBLIC/registries"

echo "==> Copying schemas"
cp -r "$ROOT/schemas" "$PUBLIC/schemas"

echo "==> Build complete. Contents of public/:"
ls -la "$PUBLIC"
echo ""
du -sh "$PUBLIC"
