# Grant Application README Audit & Rewrite

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Audit the grant-application example against the full Formspec ecosystem and rewrite README.md to accurately document every feature it demonstrates.

**Architecture:** Iterative audit — one section of the example per task, updating README.md after each. Each task reads source files, catalogs what they exercise, and appends/replaces the corresponding README section. Final task does a consistency pass.

**Tech Stack:** Markdown only — no code changes, no tests.

---

## Context

The grant-application example has grown from a simple 4-page demo into a kitchen-sink reference covering ~85% of the Formspec ecosystem. The current README.md lists 11 bullet points under "What this exercises" and 6 under "What this does NOT cover" — both are stale. New files added since the README was written:

**New files not in README:**
- `mapping-csv.json` (CSV adapter)
- `mapping-xml.json` (XML adapter)
- `changelog.json` (version migration changelog)
- `registry.json` (extension registry)
- `contact-fragment.json` (modular $ref fragment)
- `submission-in-progress.json`, `submission-amended.json`, `submission-stopped.json` (submission lifecycle states)
- `theme-pdf.json` (PDF rendering theme)
- `REVIEW-PROMPT.md` (design review workflow)

**Features not mentioned in README:**
- Screener routing (3 fields, 4 routes)
- Instance data (readonly, writable, source-based)
- Pre-population from instances
- Version migrations (0.9→1.0 fieldMap + defaults)
- Extension registry (custom dataTypes, functions, constraints)
- Changelog (1.0→1.1 migration guide)
- Modular composition ($ref to contact-fragment.json)
- CSV/XML adapter mappings
- PDF theme
- Nested repeatable groups (phases > tasks)
- Validation shape composition (or, not, xone, activeWhen, timing, context)
- 33 UI components (Wizard, Tabs, Accordion, DataTable, Rating, Slider, Badge, ProgressBar, Popovers, Modals, Signature, etc.)
- Custom components (ContactField, SummaryRow)
- Responsive design (breakpoints, grid adaptations)
- Accessibility (ARIA roles, descriptions, liveRegions)
- Whitespace normalization
- Non-relevant behavior (remove/keep/empty per-bind overrides)
- Extensions at every level (definition, bind, shape, route, instance, item)

---

### Task 1: Scaffold the new README structure

**Files:**
- Modify: `examples/grant-application/README.md`

**Step 1: Read the current README**

Read `examples/grant-application/README.md` to confirm current structure.

**Step 2: Replace with skeleton**

Overwrite README.md with this skeleton (sections will be filled by subsequent tasks):

```markdown
# Grant Application — Formspec Kitchen-Sink Reference

A complete vertical slice demonstrating the full Formspec lifecycle and nearly every feature across all specification tiers:
**screener routing → form authoring → browser rendering → submission → server re-validation → mapping output**

## What's here

| File | Purpose |
|---|---|
| <!-- filled by Task 2 --> |

## Running

### 1. Install and build (one-time)

\```bash
# From repo root
npm install
npm run build
\```

### 2. Start the form (browser)

\```bash
cd examples/grant-application
npm run dev
\```

Open: http://localhost:8081

> `npm run start:grant-app` from the repo root is an alias.
> The `test:serve` script (port 8080) serves the Playwright test harness — use `npm run dev` here for the demo.

### 3. Start the API server (separate terminal)

\```bash
cd examples/grant-application
pip install -r server/requirements.txt
PYTHONPATH=../../src uvicorn server.main:app --reload --port 8000
\```

### 4. Test with curl (no browser needed)

\```bash
curl -X POST http://localhost:8000/submit \
  -H "Content-Type: application/json" \
  -d @sample-submission.json | python3 -m json.tool
\```

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
```

**Step 3: Commit**

```bash
git add examples/grant-application/README.md
git commit -m "docs(grant-app): scaffold README for kitchen-sink audit"
```

---

### Task 2: Audit and fill the file inventory table

**Files:**
- Read: every file in `examples/grant-application/` (ls, then skim each)
- Modify: `examples/grant-application/README.md` — replace the "What's here" table

**Step 1: List all files**

```bash
ls -1A examples/grant-application/
ls -1A examples/grant-application/server/
```

**Step 2: Write the file table**

Replace the `<!-- filled by Task 2 -->` placeholder with a complete table. Group logically:

```markdown
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
```

Verify every file in the directory is accounted for. If any file exists that isn't in this table, add it.

**Step 3: Commit**

```bash
git add examples/grant-application/README.md
git commit -m "docs(grant-app): complete file inventory table"
```

---

### Task 3: Audit and fill Core spec features

**Files:**
- Read: `examples/grant-application/definition.json` (skim for: items, binds, variables, shapes, screener, instances, migrations, optionSets, formPresentation, extensions, nonRelevantBehavior, prePopulate)
- Read: `examples/grant-application/contact-fragment.json`
- Modify: `examples/grant-application/README.md` — replace `<!-- filled by Task 3 -->`

**Step 1: Catalog Core features in definition.json**

Read definition.json. For each Core spec feature, note whether it's present and give a concrete example.

**Step 2: Write the Core section**

Replace the placeholder with a bulleted feature list. Each bullet: feature name, brief description, concrete example from the file. Organize into sub-groups:

- **Form structure** — item types (field, group, display), nested children, 6 pages
- **Data types** — every dataType used (string, integer, boolean, date, dateTime, time, choice, multiChoice, money, attachment, text, decimal, uri)
- **Bind MIPs** — calculate, relevant, required, readonly, constraint, default (with examples)
- **Advanced bind features** — whitespace normalization, nonRelevantBehavior per-bind, constraintMessage, disabledDisplay, excludedValue
- **Repeatable groups** — 4 groups, nested repeats (phases > tasks), min/max cardinality
- **Variables** — 6 named computed values, form-wide and scoped
- **Validation shapes** — 11+ shapes, all severity levels, composition operators (or, not, xone), activeWhen, timing (continuous/submit/demand), context blocks, shape codes
- **Screener routing** — 3 classification fields, 4 conditional routes
- **Instance data** — readonly (agencyData), writable (scratchPad with schema), source-based (priorYearData)
- **Pre-population** — orgName and EIN from agencyData
- **Modular composition** — alternateContact via $ref to contact-fragment.json
- **Version migrations** — v0.9→v1.0 fieldMap (preserve/drop/expression) + defaults
- **Option sets** — budgetCategories (7), orgTypes (4)
- **Presentation hints** — widgetHint, layout modes, styleHints, accessibility
- **Extensions** — x- properties at definition, bind, shape, route, instance, and item levels
- **Form metadata** — url, version, versionAlgorithm, status, derivedFrom

**Step 3: Commit**

```bash
git add examples/grant-application/README.md
git commit -m "docs(grant-app): document Core spec feature coverage"
```

---

### Task 4: Audit and fill FEL features

**Files:**
- Read: `examples/grant-application/definition.json` (grep for FEL expressions in binds, variables, shapes)
- Modify: `examples/grant-application/README.md` — replace `<!-- filled by Task 4 -->`

**Step 1: Extract all FEL expressions**

Search definition.json for `calculate`, `relevant`, `required`, `constraint`, `expression`, `condition`, `activeWhen` values. Catalog every FEL function and operator used.

**Step 2: Write the FEL section**

Organize by category:
- **Operators** — arithmetic, comparison, logical, string concat, null-coalescing
- **Money functions** — money(), moneyAmount(), moneyCurrency(), moneyAdd(), moneySum()
- **String functions** — upper(), lower(), contains(), matches()
- **Date functions** — today(), year(), dateDiff(), dateAdd()
- **Aggregate functions** — sum() with wildcard paths
- **Logical functions** — if/then/else, not, empty(), present(), coalesce()
- **Type functions** — isNull()
- **Path references** — $field, $group.field, $repeat[n].field, $repeat[*].field, @variable, @current, @index, @count, @instance()

**Step 3: Commit**

```bash
git add examples/grant-application/README.md
git commit -m "docs(grant-app): document FEL expression coverage"
```

---

### Task 5: Audit and fill Theme features

**Files:**
- Read: `examples/grant-application/theme.json`
- Read: `examples/grant-application/theme-pdf.json`
- Modify: `examples/grant-application/README.md` — replace `<!-- filled by Task 5 -->`

**Step 1: Catalog theme features**

Read both theme files. Note: tokens, cascade levels (defaults/selectors/items), widget declarations, accessibility, breakpoints, pages, target definition binding, platform hints.

**Step 2: Write the Theme section**

Cover both web and PDF themes:
- **Web theme (theme.json)** — USWDS tokens, 3-level cascade, widget declarations (MoneyInput, RadioGroup, Toggle, FileUpload), responsive breakpoints, page grid regions, accessibility (liveRegion, ARIA descriptions)
- **PDF theme (theme-pdf.json)** — print-first tokens (Times New Roman, narrow spacing), static widget overrides, x-pdf metadata (letter, portrait, page numbers)
- **Cross-cutting** — targetDefinition binding with semver range, platform declarations

**Step 3: Commit**

```bash
git add examples/grant-application/README.md
git commit -m "docs(grant-app): document Theme spec coverage"
```

---

### Task 6: Audit and fill Component features

**Files:**
- Read: `examples/grant-application/component.json`
- Modify: `examples/grant-application/README.md` — replace `<!-- filled by Task 6 -->`

**Step 1: Catalog component usage**

Read component.json. List every component type used, slot bindings, conditional rendering (`when`), responsive props, custom components, tokens.

**Step 2: Write the Component section**

- **Core components** — Wizard, Page, Stack, Grid, Columns, TextInput, NumberInput, DatePicker, Select, CheckboxGroup, Toggle, FileUpload, Heading, Text, Divider, Card, Collapsible, ConditionalGroup
- **Progressive components** — Tabs, Accordion, RadioGroup, MoneyInput, Slider, Rating, Alert, Badge, ProgressBar, DataTable, Panel, Modal, Popovers, Signature, Summary
- **Custom components** — ContactField (parameterized), SummaryRow (parameterized)
- **Conditional rendering** — `when` expressions on ConditionalGroup, Text, Badge
- **Responsive design** — breakpoints (sm/md/lg), grid column adaptation
- **Token references** — `$token.space.lg`, `$token.color.accent`, etc.

**Step 3: Commit**

```bash
git add examples/grant-application/README.md
git commit -m "docs(grant-app): document Component spec coverage"
```

---

### Task 7: Audit and fill Mapping features

**Files:**
- Read: `examples/grant-application/mapping.json`
- Read: `examples/grant-application/mapping-csv.json`
- Read: `examples/grant-application/mapping-xml.json`
- Modify: `examples/grant-application/README.md` — replace `<!-- filled by Task 7 -->`

**Step 1: Catalog mapping features**

Read all three mapping files. Note: direction, transform types, array modes, priorities, defaults, conditions, adapter configs, version ranges.

**Step 2: Write the Mapping section**

- **JSON mapping (mapping.json)** — bidirectional, 18 rules: preserve, valueMap, coerce, concat, split, nest, expression, flatten; array modes (each, indexed, whole); priorities; defaults; version range
- **CSV adapter (mapping-csv.json)** — forward-only, UTF-8, column mapping, flatten for arrays
- **XML adapter (mapping-xml.json)** — namespaces, CDATA, element/attribute mapping, XML declaration
- **Server-side execution** — Python MappingEngine processes mapping.json on submit

**Step 3: Commit**

```bash
git add examples/grant-application/README.md
git commit -m "docs(grant-app): document Mapping DSL coverage"
```

---

### Task 8: Audit and fill Registry & Changelog features

**Files:**
- Read: `examples/grant-application/registry.json`
- Read: `examples/grant-application/changelog.json`
- Modify: `examples/grant-application/README.md` — replace `<!-- filled by Task 8 -->`

**Step 1: Catalog registry and changelog features**

Read both files. Note: extension categories, lifecycle statuses, publisher metadata, change types, impact levels, migration hints.

**Step 2: Write the section**

- **Extension registry (registry.json)** — 4 entries across all categories (dataType, function, constraint, property), all lifecycle statuses (stable, draft, deprecated, retired), namespace grouping, publisher metadata
- **Changelog (changelog.json)** — 8 change entries: added, removed, modified, moved, renamed; impact levels (breaking, compatible, cosmetic); migration hints; version range

**Step 3: Commit**

```bash
git add examples/grant-application/README.md
git commit -m "docs(grant-app): document Registry & Changelog coverage"
```

---

### Task 9: Update "What this does NOT cover" and final consistency pass

**Files:**
- Read: `specs/core/spec.llm.md` (skim for features NOT in the example)
- Read: `examples/grant-application/README.md` (full re-read)
- Modify: `examples/grant-application/README.md` — replace `<!-- filled by Task 9 -->` and fix any inconsistencies

**Step 1: Identify remaining gaps**

Compare the spec features against what's documented in the README. The known gaps are small:
- External option set `source` URIs (all option sets are inline)
- `formspec-fn:` data source URIs (host-provided function instances)
- Some FEL functions not used (~5-10 string/math/date functions)
- Shape ID composition (shapes referencing other shapes by ID)
- Recursive custom component nesting
- Full accordion showcase (Tabs used instead)

**Step 2: Write the "not covered" section**

```markdown
## What this does NOT cover

The following spec features are not yet demonstrated in this example:

- **External option set sources** — all optionSets use inline `options`; external `source` URIs are not shown
- **`formspec-fn:` data sources** — host-provided function URIs for instance data
- **Shape ID composition** — shapes referencing other shapes by `$ref` ID
- **Some FEL functions** — `countWhere()`, `min()`, `max()`, `avg()`, `floor()`, `ceil()`, `power()`, `selected()`, repeat navigation (`prev()`, `next()`, `parent()`), MIP state queries (`readonly()`, `required()`, `relevant()`)
- **Recursive custom components** — custom components nesting other custom components

See individual spec LLM docs for complete feature inventories:
`specs/core/spec.llm.md`, `specs/fel/fel-grammar.llm.md`, `specs/theme/theme-spec.llm.md`,
`specs/component/component-spec.llm.md`, `specs/mapping/mapping-spec.llm.md`
```

**Step 3: Final consistency pass**

Re-read the entire README. Check:
- Every file in the directory appears in the file table
- No feature is mentioned in "not covered" that IS actually demonstrated
- No feature is listed in a coverage section that doesn't actually exist in the source files
- Section headers are consistent
- No stale references to "4-page" (it's now 6 pages)

**Step 4: Commit**

```bash
git add examples/grant-application/README.md
git commit -m "docs(grant-app): complete README audit — gaps and consistency pass"
```

---

### Task 10: Final review — read README end-to-end, verify accuracy

**Files:**
- Read: `examples/grant-application/README.md` (complete)

**Step 1: Read the finished README**

Read the entire file. Verify it reads well as a standalone document for someone encountering the example for the first time.

**Step 2: Fix any issues found**

Typos, awkward phrasing, missing context, incorrect counts. Make a single cleanup commit if needed.

**Step 3: Commit (if changes)**

```bash
git add examples/grant-application/README.md
git commit -m "docs(grant-app): final README polish"
```
