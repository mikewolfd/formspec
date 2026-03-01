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

**Form structure**
- **Item types** — field (data entry), group (container/section), display (read-only text like nonprofitPhoneHint)
- **Nested children** — field-under-field hierarchy (orgType > orgSubType yields path applicantInfo.orgType.orgSubType)
- **6 wizard pages** — Applicant Info, Project Narrative, Budget, Project Phases, Subcontractors, Review & Submit (via presentation.layout.page)

**Data types**
- **13 data types used** — string, integer, boolean, date, dateTime, time, choice, multiChoice, money, attachment, text, decimal, uri

**Bind MIPs**
- **calculate** — subtotals (unitCost * quantity), duration (dateDiff), phaseTotal (sum of taskCosts), orgNameUpper, indirectRateRounded, projectedEndDate, budgetDeviation, contactPhoneFallback, hasLineItems, scratchPad write-back
- **relevant** — nonprofitPhoneHint shown only for nonprofits, indirectRate hidden for government, subcontractors conditional on usesSubcontractors
- **required** — static (orgName, ein, abstract, startDate, endDate, focusAreas) and conditional (projectWebsite required only for universities)
- **readonly** — static (subtotal, duration, phaseTotal, projectedEndDate, budgetDeviation) and conditional (submissionDeadline readonly when both dates set)
- **constraint** — EIN pattern (XX-XXXXXXX), email contains @, phone format (XXX-XXX-XXXX), endDate > startDate
- **default** — orgType defaults to 'nonprofit', requestedAmount defaults to money(0, 'USD')

**Advanced bind features**
- **whitespace** — normalize (ein), trim (contactEmail), remove (orgSubType) — all three modes represented
- **nonRelevantBehavior** — form-level "remove" default, per-bind "keep" override on subcontractors, per-bind "empty" on nonprofitPhoneHint display item
- **constraintMessage** — custom validation messages on EIN, email, phone, and date ordering constraints
- **disabledDisplay** — "protected" on duration (readonly field styling hint)
- **excludedValue** — "null" on requestedAmount (exclude null from response data)

**Repeatable groups**
- **4 groups** — lineItems (1-20), projectPhases (1-10), phaseTasks (1-20), subcontractors (1-10)
- **Nested repeats** — phaseTasks nested inside projectPhases (two-level repeat)
- **Min/max cardinality** — minRepeat and maxRepeat set on all four groups

**Variables**
- **6 named computed values** — @totalDirect (line item sum), @indirectCosts (rate-based with government exemption), @grandTotal (direct + indirect), @projectPhasesTotal (phase sum), @budgetHasLineItems (presence check), @narrativeHasDateRange (date completeness)
- **Scoping** — @budgetHasLineItems scoped to budget, @narrativeHasDateRange scoped to projectNarrative; others form-wide

**Validation shapes**
- **12 shapes** — field-level and form-level (target "#"), all severity levels (error, warning, info)
- **Composition operators** — or (contactProvided), not (abstractNotPlaceholder), and (subcontractorEntryRequired), xone (budgetMethodExclusive), shape-id references (shapeRefCompositionCoverage)
- **activeWhen** — subcontractorCap and subcontractorEntryRequired active only when usesSubcontractors is true
- **Timing** — continuous (abstractLength), submit (narrativeDocRequired), demand (websiteFormat)
- **Context blocks** — budgetMatch includes computed metadata (grandTotal, requested, difference)
- **Shape codes** — every shape has a unique code (BUDGET_MISMATCH, SUBCONTRACTOR_CAP_EXCEEDED, etc.)

**Screener routing**
- **3 classification fields** — applicantType (choice), isReturning (boolean), requestedAmount (money)
- **4 conditional routes** — for-profit redirect, simplified renewal (returning + under $250K), standard renewal, new application (catch-all)

**Instance data**
- **Readonly** — agencyData (maxAward, fiscalYear, ein) with readonly: true
- **Writable with schema** — scratchPad (lastSavedTotal, budgetNotes) with typed schema and readonly: false
- **Source-based static** — priorYearData fetched from external API URL with static: true

**Pre-population**
- **orgName** — pre-populated from agencyData with editable: true (user can override)
- **ein** — pre-populated from agencyData with editable: false (locked to source value)

**Modular composition**
- **$ref** — alternateContact group references contact-fragment.json#contactCore with keyPrefix "altContact"

**Version migrations**
- **v0.9 to v1.0 fieldMap** — preserve (contactName), drop (faxNumber), expression (requestedAmountRaw to requestedAmount.amount with rounding)
- **Defaults for new fields** — requestedAmount.currency set to "USD", selfAssessment set to 3

**Option sets**
- **budgetCategories** — 7 choices (personnel, fringe, travel, equipment, supplies, contractual, other)
- **orgTypes** — 4 choices (nonprofit, university, government, forprofit)
- **Inline options** — focusAreas has 5 inline options on the field itself

**Presentation hints**
- **widgetHint** — Slider on indirectRate
- **Layout modes** — page (wizard pages), flow: grid with columns: 2 (budget), collapsible with collapsedByDefault (budget)
- **styleHints** — emphasis: primary, size: default on budget group
- **Accessibility** — role: region, description, liveRegion: polite on budget group
- **Labels** — multi-label support (short, aria, pdf, csv) on orgName and other fields
- **Prefix/suffix** — "$" prefix on unitCost, "%" suffix on indirectRate
- **initialValue** — contactPhone defaults to "202-555-0100", startDate uses FEL expression "=today()"
- **semanticType** — email and phone on contact fields

**Extensions**
- **x- properties** — at definition level (x-agency, x-program-code), bind level (x-validation-group), shape level (x-help-link), route level (x-route-category), instance level (x-purpose), item level (x-budget-version), screener level (x-screener-version)

**Form metadata**
- **url, version, versionAlgorithm** — semver versioning with canonical URL
- **status** — "active"
- **derivedFrom** — references parent template (generic-application-template v2.0.0)
- **title, description, date, name** — full identification metadata

### FEL (expression language)

- **Arithmetic** — `*` (e.g. `$unitCost * $quantity`), `-` (e.g. `moneyAmount($budget.requestedAmount) - moneyAmount(@grandTotal)`), `/` (e.g. `/ 100` in indirect cost calc)
- **Comparison** — `=` (e.g. `$applicantInfo.orgType = 'nonprofit'`), `!=` (e.g. `$applicantInfo.orgType != 'government'`), `<` `>` `<=` `>=` (e.g. `$projectNarrative.endDate > $projectNarrative.startDate`, `length(...) <= 3000`)
- **Logical** — `and` (e.g. `$isReturning = true and moneyAmount($requestedAmount) < 250000`), `or` (e.g. `empty($endDate) or empty($startDate) or ...`), `not` (e.g. `not empty($startDate)`)
- **Null coalescing** — `??` (e.g. `$projectNarrative.indirectRate ?? 0`, `$hourlyRate ?? money(0, 'USD')`)
- **if/then/else** — conditional expressions (e.g. `if $applicantInfo.orgType = 'government' then money(0, 'USD') else money(...)`)
- **Money** — `money()` constructor (e.g. `money(0, 'USD')`), `moneyAmount()` extractor, `moneyCurrency()` extractor, `moneyAdd()` (e.g. `moneyAdd(@totalDirect, @indirectCosts)`)
- **String** — `upper()` (e.g. `upper($applicantInfo.orgName)`), `lower()` (e.g. `lower($projectNarrative.abstract)`), `contains()` (e.g. `contains($contactEmail, '@')`), `matches()` regex (e.g. `matches($ein, '^[0-9]{2}-[0-9]{7}$')`), `length()` (e.g. `length($abstract) <= 3000`), `string()` type cast (e.g. `string(@budgetHasLineItems)`)
- **Date** — `today()` (e.g. `=today()` as initialValue), `year()` (e.g. `year($startDate)`), `dateDiff()` (e.g. `dateDiff($endDate, $startDate, 'months')`), `dateAdd()` (e.g. `dateAdd($startDate, $duration, 'months')`)
- **Aggregates** — `sum()` with wildcard paths (e.g. `sum($budget.lineItems[*].subtotal)`, `sum($phaseTasks[*].taskCost)`), `count()` (e.g. `count($subcontractors[*].subName) >= 1`)
- **Null/presence** — `empty()` (e.g. `empty($projectNarrative.endDate)`), `present()` (e.g. `present($attachments.narrativeDoc)`), `isNull()` (e.g. `isNull($lineItems[0].category)`), `coalesce()` (e.g. `coalesce($contactPhone, 'N/A')`)
- **Math** — `round()` (e.g. `round($indirectRate, 0)`), `abs()` (e.g. `abs(moneyAmount($requestedAmount) - moneyAmount(@grandTotal))`)
- **Type conversion** — `string()` and `number()` (e.g. migration expression `string(round(number($), 2))`)
- **Path references** — `$field` (simple), `$group.field` (dotted), `$repeat[n].field` (indexed, e.g. `$lineItems[0].category`), `$repeat[*].field` (wildcard/element-wise, e.g. `$budget.lineItems[*].subtotal`), `@variable` (named computed values, e.g. `@totalDirect`, `@grandTotal`)

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
