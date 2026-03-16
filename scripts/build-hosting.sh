#!/usr/bin/env bash
set -euo pipefail

# Build all apps and assemble into public/ for Firebase Hosting.
#
# Layout:
#   public/
#   ├── index.html              ← marketing site
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

# ── 1. Marketing site (Astro SSG) ──
echo "==> Building marketing site"
(cd "$ROOT/site" && npm run build)
cp -r "$ROOT/site/dist/"* "$PUBLIC/"

# ── 2. Studio (React SPA) ──
echo "==> Building studio"
npm run build --workspace=formspec-engine
npm run build --workspace=formspec-layout
npm run build --workspace=formspec-webcomponent
npm run build --workspace=formspec-studio-core
npm run build --workspace=formspec-studio
cp -r "$ROOT/packages/formspec-studio/dist/" "$PUBLIC/studio/"

# ── 3. Reference frontend ──
echo "==> Building references"
(cd "$ROOT/examples/refrences" && npx vite build --base=/references/)
cp -r "$ROOT/examples/refrences/dist/" "$PUBLIC/references/"

# ── 4. Example data + registries (static JSON used by references frontend) ──
echo "==> Copying example data"
mkdir -p "$PUBLIC/examples"
for dir in clinical-intake grant-application grant-report invoice; do
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
