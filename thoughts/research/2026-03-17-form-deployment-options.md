# Form Deployment Options — Research

**Date:** 2026-03-17
**Goal:** Find the easiest way for someone to take a Formspec form and deploy it as a live, publicly accessible page.

---

## Current State

Formspec forms are rendered by `<formspec-render>`, a standard Web Component. A minimal deployable form needs:

1. **One HTML file** — loads the JS bundle and mounts the component
2. **One JS bundle** — `formspec-webcomponent` (includes `formspec-engine`, Preact signals, Chevrotain parser)
3. **One CSS file** — `formspec-base.css`
4. **Form artifacts** — `definition.json` (required), plus optional `component.json`, `theme.json`, `registry.json`

No server-side rendering. No backend required for basic form display and client-side validation. It's a pure static site — a perfect fit for edge/CDN hosting.

---

## The Simplest Possible Deploy: Single HTML File + CDN Bundle

The absolute fastest path is a **single `index.html`** that inlines or fetches everything:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Form</title>
  <link rel="stylesheet" href="./formspec-base.css">
</head>
<body>
  <formspec-render></formspec-render>
  <script type="module">
    import { FormspecRender } from './formspec-bundle.esm.js';
    customElements.define('formspec-render', FormspecRender);

    const el = document.querySelector('formspec-render');
    const def = await fetch('./definition.json').then(r => r.json());
    el.definition = def;

    // Optional: component doc + theme
    // const comp = await fetch('./component.json').then(r => r.json());
    // const theme = await fetch('./theme.json').then(r => r.json());
    // el.componentDocument = comp;
    // el.themeDocument = theme;
  </script>
</body>
</html>
```

This means a deployable form is just a folder with 3-5 files. Drag it anywhere.

---

## Platform Comparison

### 1. Vercel (Recommended for Git-integrated teams)

**How:** `vercel deploy` or connect a Git repo.

- Auto-detects static sites — no config needed for a plain HTML folder.
- Add `vercel.json` only if you want SPA routing:
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
- **Deploy from CLI:** `npx vercel --prod` (zero config for static files)
- **Deploy from Git:** Push to GitHub → Vercel auto-builds and deploys on every push
- **Free tier:** 100 GB bandwidth/month, unlimited sites

**Pros:** Fastest deploys (~10s), great preview URLs per PR, zero config for static
**Cons:** 100 GB bandwidth cap on free tier, commercial projects need Pro ($20/mo)

### 2. Cloudflare Pages (Recommended for maximum free tier)

**How:** `npx wrangler pages deploy ./dist` or connect Git repo.

- No config file needed for static sites.
- **Deploy from CLI:** `npx wrangler pages deploy ./my-form-folder`
- **Deploy from Git:** Connect GitHub repo → set build output directory
- **Free tier:** Unlimited bandwidth, unlimited sites, 500 builds/month

**Pros:** Unlimited free bandwidth (best free tier), global edge network, fast
**Cons:** No server-side execution without Workers (not needed for forms)

### 3. Firebase Hosting (Already configured in this repo)

**How:** `firebase deploy` — we already have `firebase.json`.

- Already the deployment target for formspec.org.
- For a standalone form, a user would need `firebase init hosting` and set the public directory.
- **Deploy:** `firebase deploy --only hosting`
- **Free tier:** 10 GB storage, 360 MB/day transfer

**Pros:** Familiar, good integration with Firebase backend services (auth, Firestore for submission storage), already in use
**Cons:** Smallest free bandwidth, requires Firebase CLI setup, most config friction

### 4. Netlify

**How:** Drag-and-drop folder in dashboard, or `netlify deploy --prod`.

- **Deploy from CLI:** `npx netlify-cli deploy --prod --dir=./my-form`
- **Deploy from Git:** Connect repo → auto-builds
- **Free tier:** 100 GB bandwidth/month

**Pros:** Drag-and-drop deploy (literally zero tooling), good form handling built-in
**Cons:** Similar limits to Vercel, slightly slower builds

### 5. GitHub Pages (Simplest for open-source)

**How:** Push to `gh-pages` branch or enable in repo settings.

- No CLI needed — just push static files.
- **Free tier:** Unlimited for public repos, 100 GB bandwidth/month
- Can use GitHub Actions to auto-build and deploy

**Pros:** Zero additional accounts needed if already on GitHub, completely free for public repos
**Cons:** Only public repos on free tier, no SPA routing without a 404.html hack, slower propagation

---

## Recommended Strategy: `formspec deploy` CLI Command

The easiest mechanism for users is a **single command** that takes a form's artifact folder and produces a deployable package (or deploys directly). Three tiers of ease:

### Tier 1 — Export a deployable folder (no account needed)

```bash
npx formspec deploy export ./my-form --out ./deploy
# Produces:
#   deploy/
#   ├── index.html          (generated, loads form)
#   ├── formspec-bundle.esm.js  (pre-built web component bundle)
#   ├── formspec-base.css
#   ├── definition.json     (copied from input)
#   ├── component.json      (if present)
#   └── theme.json          (if present)
```

User can then drag this folder to Netlify, Cloudflare Pages, or any static host. This is the **minimum viable product** — generate a self-contained static site from form artifacts.

### Tier 2 — One-command deploy to a platform

```bash
# Deploy to Vercel
npx formspec deploy vercel ./my-form

# Deploy to Cloudflare Pages
npx formspec deploy cloudflare ./my-form

# Deploy to Netlify
npx formspec deploy netlify ./my-form
```

Under the hood: Tier 1 export → platform CLI deploy. Requires the user to have authenticated with the target platform. Could be a thin wrapper around `vercel deploy`, `wrangler pages deploy`, etc.

### Tier 3 — Hosted deploy (formspec.org/forms/abc123)

Future: Upload form artifacts to formspec.org and get a live URL instantly. No CLI, no platform accounts. This is the "Typeform experience" — but that's a bigger investment.

---

## What We'd Need to Build

### For Tier 1 (Export — do this first)

1. **Pre-built UMD/ESM bundle** of `formspec-webcomponent` published to npm or included as a build artifact. Currently the package is source-only with bare imports — it needs Vite/bundler to resolve. A self-contained bundle is essential.

2. **HTML template generator** — takes a form artifact directory and produces an `index.html` that:
   - Loads the bundle from a relative path (or a CDN like unpkg/esm.sh)
   - Fetches definition/component/theme JSON
   - Mounts `<formspec-render>`
   - Optionally includes a submit button that posts to a configurable endpoint

3. **`npx formspec export`** CLI command (or a script in this repo) that:
   - Copies the bundle + CSS
   - Copies form artifacts
   - Generates `index.html` from template
   - Outputs a ready-to-deploy folder

### For Tier 2 (Platform deploy)

4. **Platform adapters** — thin wrappers that:
   - Run Tier 1 export to a temp directory
   - Invoke the platform's CLI (`vercel`, `wrangler`, `netlify`, `firebase`)
   - Print the live URL

### CDN Bundle Alternative (Zero-build option)

If we publish `formspec-webcomponent` as a bundled ESM to npm, users could skip all tooling:

```html
<script type="module">
  import { FormspecRender } from 'https://esm.sh/formspec-webcomponent';
  customElements.define('formspec-render', FormspecRender);
  // ... load definition, mount
</script>
```

This is the absolute minimum friction — a single HTML file with no build step. The form definition JSON could even be inlined in a `<script type="application/json">` tag.

---

## Recommendation

**Start with Tier 1 (export command) + CDN bundle.**

1. Add a Vite library-mode build to `formspec-webcomponent` that outputs a single self-contained ESM bundle (all dependencies inlined). Publish this to npm so `esm.sh` / `unpkg` / `jsdelivr` can serve it.

2. Build a simple `scripts/export-form.mjs` that generates a deployable folder from form artifacts.

3. Document the "deploy in 60 seconds" flow for each platform:
   - **Cloudflare Pages:** `npx wrangler pages deploy ./my-form-deploy`
   - **Vercel:** `npx vercel ./my-form-deploy`
   - **Netlify:** drag folder to netlify.com/drop
   - **GitHub Pages:** push to `gh-pages` branch

Cloudflare Pages is the best default recommendation — unlimited free bandwidth, zero config, fast global edge.

---

## Sources

- [Cloudflare Pages — free hosting with unlimited bandwidth](https://pages.cloudflare.com/)
- [Cloudflare SPA routing docs](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Deploy React/SPA to Cloudflare, Vercel, Netlify](https://www.freecodecamp.org/news/deploy-react-app/)
- [Cloudflare Pages + Firebase MVP stack](https://medium.com/@able_wong/building-your-startup-mvp-a-simple-guide-to-cloudflare-pages-firebase-f30d2beac4d8)
- [Vercel migration guide](https://vercel.com/kb/guide/migrate-to-vercel-from-cloudflare)
