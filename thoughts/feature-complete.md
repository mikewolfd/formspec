# Formspec Feature Completeness Matrix

Cross-cutting audit of every feature across all four implementation layers.

## Executive Summary

### Coverage by Layer

| Layer | Coverage | Notes |
|-------|:--------:|-------|
| **Spec ↔ Schema** | **97%** | 200 full, 9 partial, 3 missing (JSON Schema limitations) |
| **Spec → TS Engine** (core logic) | **85%** | Strong on binds, FEL, validation, repeats |
| **Spec → TS WebComp** (components) | **67%** | 22 of 33 components registered |
| **Spec → TS WebComp** (props) | **~22%** | Most component-specific props ignored |
| **Spec → Python Backend** | **89%** | Full FEL, 3 adapters, comprehensive linter |
| **E2E Tests** | **53%** | Good on core logic, weak on progressive components |

### FEL Parity: TS vs Python — Excellent

Both implementations have full parity on: 47+ functions, 14 precedence levels, all operators, null propagation, date literals, let bindings, money type, wildcard resolution, dependency extraction. One caveat: TS uses float64 (~15 digits), Python uses Decimal (34 digits).

### Biggest Gaps

**TS Engine — 10 missing core features:**
screener, migrations, `$ref`/`keyPrefix`, whitespace/excludedValue/disabledDisplay binds, precision, semanticType/prePopulate, labels (i18n), response id/author/subject, shape timing (submit/demand)

**TS WebComponent — 12 unregistered components:**
FileUpload, Divider, Collapsible, Columns, Accordion, MoneyInput, Slider, Rating, Signature, ProgressBar, Panel, Modal

**TS WebComponent — ~43 unimplemented props:**
Most component-specific props beyond basic binding (e.g. wrap, rowGap, showStepper, searchable, clearable, orientation, dragDrop, elevation, dismissible, etc.)

**TS WebComponent — 3 missing capabilities:**
Custom component instantiation, responsive overrides, accessibility block rendering

**Python — 4 missing runtime features:**
Mapping DSL rule execution engine (adapters exist, but no transform pipeline), changelog generation/impact classification, extension registry resolution, custom adapters

**E2E — 6 coverage gaps:**
No theme rendering tests, no custom component tests, no accessibility tests, no mapping/adapter tests, limited progressive component coverage, demo test skipped

### What's Strong

- **Schema coverage is near-perfect** — only 3 features structurally impossible in JSON Schema
- **FEL is fully implemented in both languages** — all 47+ functions, all operators, full test coverage
- **Python linter is comprehensive** — 16 error/warning codes, multi-phase pipeline, theme + component semantic validation
- **Core form logic works end-to-end** — binds, calculations, relevance, validation, repeats all tested in E2E

---

## Legend

| Icon | Meaning |
|------|---------|
| S | **Spec** — Feature defined in specification |
| J | **JSON Schema** — Feature validated by schema |
| T | **TypeScript** — Feature implemented in TS engine/webcomponent |
| P | **Python** — Feature implemented in Python backend |
| E | **E2E** — Feature covered by Playwright tests |
| `-` | Not applicable to this layer |
| `?` | Partially implemented / incomplete |

Each cell shows: `✅` (done), `?` (partial), `❌` (missing), `-` (N/A)

---

## 1. Core Definition Structure

| Feature | Spec | Schema | TS Engine | Py Linter | E2E |
|---------|:----:|:------:|:---------:|:---------:|:---:|
| `$formspec` version const | S | ✅ | ✅ | ✅ | - |
| `url` (canonical URI) | S | ✅ | ✅ | ✅ | - |
| `version` | S | ✅ | ✅ | ✅ | - |
| `versionAlgorithm` | S | ✅ | - | ✅ | - |
| `status` (draft/active/retired) | S | ✅ | ✅ | ✅ | - |
| `title` | S | ✅ | ✅ | ✅ | - |
| `description` | S | ✅ | ✅ | ✅ | - |
| `date` | S | ✅ | - | ✅ | - |
| `name` (machine-friendly) | S | ✅ | - | ✅ | - |
| `derivedFrom` (URI or {url,version}) | S | ✅ | - | ✅ | - |
| `items` array | S | ✅ | ✅ | ✅ | ✅ |
| `binds` array | S | ✅ | ✅ | ✅ | ✅ |
| `shapes` array | S | ✅ | ✅ | ✅ | ✅ |
| `instances` (data sources) | S | ✅ | ✅ | ✅ | - |
| `variables` | S | ✅ | ✅ | ✅ | - |
| `nonRelevantBehavior` (remove/empty/keep) | S | ✅ | ✅ | ✅ | ✅ |
| `optionSets` | S | ✅ | ✅ | ✅ | - |
| `screener` | S | ✅ | ❌ | ✅ | - |
| `migrations` | S | ✅ | ❌ | ✅ | - |
| `extensions` (x- prefixed) | S | ✅ | - | ✅ | - |
| `formPresentation` (pageMode/labelPosition/density) | S | ✅ | ? | ✅ | - |

## 2. Item Types & Properties

| Feature | Spec | Schema | TS Engine | Py Linter | E2E |
|---------|:----:|:------:|:---------:|:---------:|:---:|
| `type: group` | S | ✅ | ✅ | ✅ | ✅ |
| `type: field` | S | ✅ | ✅ | ✅ | ✅ |
| `type: display` | S | ✅ | ✅ | ✅ | - |
| `key` (pattern-validated) | S | ✅ | ✅ | ✅ | ✅ |
| `label` (required) | S | ✅ | ✅ | ✅ | ✅ |
| `description`, `hint` | S | ✅ | ✅ | ✅ | - |
| `labels` (context-keyed) | S | ✅ | ❌ | ✅ | - |
| `extensions` on items | S | ✅ | - | ✅ | - |
| Group: `children` | S | ✅ | ✅ | ✅ | ✅ |
| Group: `repeatable` | S | ✅ | ✅ | ✅ | ✅ |
| Group: `minRepeat` / `maxRepeat` | S | ✅ | ✅ | ✅ | ✅ |
| Group: `$ref` (modular composition) | S | ✅ | ❌ | ✅ | - |
| Group: `keyPrefix` | S | ✅ | ❌ | ✅ | - |
| Group: `presentation` | S | ✅ | ? | ✅ | - |
| Field: `dataType` (13 types) | S | ✅ | ✅ | ✅ | ✅ |
| Field: `precision` | S | ✅ | ❌ | ✅ | - |
| Field: `prefix` / `suffix` | S | ✅ | ❌ | ✅ | - |
| Field: `options` (array or URI) | S | ✅ | ✅ | ✅ | ✅ |
| Field: `optionSet` (reference) | S | ✅ | ✅ | ✅ | - |
| Field: `initialValue` | S | ? | ✅ | ✅ | - |
| Field: `semanticType` | S | ✅ | ❌ | ✅ | - |
| Field: `prePopulate` | S | ✅ | ❌ | ✅ | - |
| Field: dependent `children` | S | ✅ | ✅ | ✅ | - |

## 3. Data Types

| Data Type | Spec | Schema | TS Engine | Py FEL | E2E |
|-----------|:----:|:------:|:---------:|:------:|:---:|
| `string` | S | ✅ | ✅ | ✅ | ✅ |
| `text` | S | ✅ | ✅ | ✅ | - |
| `integer` | S | ✅ | ✅ | ✅ | ✅ |
| `decimal` | S | ✅ | ✅ | ✅ | ✅ |
| `boolean` | S | ✅ | ✅ | ✅ | ✅ |
| `date` | S | ✅ | ✅ | ✅ | ✅ |
| `dateTime` | S | ✅ | ✅ | ✅ | ✅ |
| `time` | S | ✅ | ✅ | ✅ | ✅ |
| `uri` | S | ✅ | ✅ | ✅ | - |
| `attachment` | S | ✅ | ✅ | ✅ | - |
| `choice` | S | ✅ | ✅ | ✅ | ✅ |
| `multiChoice` | S | ✅ | ✅ | ✅ | ✅ |
| `money` | S | ✅ | ✅ | ✅ | ✅ |

## 4. Bind Properties

| Feature | Spec | Schema | TS Engine | Py Linter | E2E |
|---------|:----:|:------:|:---------:|:---------:|:---:|
| `path` (required) | S | ✅ | ✅ | ✅ | ✅ |
| `calculate` (FEL) | S | ✅ | ✅ | ✅ | ✅ |
| `relevant` (FEL) | S | ✅ | ✅ | ✅ | ✅ |
| `required` (FEL) | S | ✅ | ✅ | ✅ | ✅ |
| `readonly` (FEL) | S | ✅ | ✅ | ✅ | ✅ |
| `constraint` (FEL) | S | ✅ | ✅ | ✅ | ✅ |
| `constraintMessage` | S | ✅ | ✅ | ✅ | ✅ |
| `default` | S | ✅ | ✅ | ✅ | - |
| `whitespace` (preserve/trim/normalize/remove) | S | ✅ | ❌ | ✅ | - |
| `excludedValue` | S | ✅ | ❌ | ✅ | - |
| `nonRelevantBehavior` (per-path) | S | ✅ | ? | ✅ | - |
| `disabledDisplay` | S | ✅ | ❌ | ✅ | - |
| Multiple bind inheritance (AND/OR) | S | - | ✅ | - | - |

## 5. Validation Shapes

| Feature | Spec | Schema | TS Engine | Py Linter | E2E |
|---------|:----:|:------:|:---------:|:---------:|:---:|
| `id`, `target`, `message` (required) | S | ✅ | ✅ | ✅ | ✅ |
| `severity` (error/warning/info) | S | ✅ | ✅ | ✅ | - |
| `constraint` (FEL) | S | ✅ | ✅ | ✅ | ✅ |
| `code` | S | ✅ | ✅ | ✅ | - |
| `context` (FEL expressions map) | S | ✅ | ✅ | ✅ | - |
| `activeWhen` (FEL) | S | ✅ | ✅ | ✅ | - |
| `timing` (continuous/submit/demand) | S | ✅ | ? | ✅ | - |
| Composition: `and`/`or`/`not`/`xone` | S | ✅ | ✅ | ✅ | - |
| Message interpolation `{{expr}}` | S | - | ✅ | - | - |

## 6. Processing Model

| Feature | Spec | Schema | TS Engine | Py | E2E |
|---------|:----:|:------:|:---------:|:--:|:---:|
| 4-phase processing (Rebuild/Recalc/Revalidate/Notify) | S | - | ✅ | - | ✅ |
| Dependency DAG construction | S | - | ✅ | ✅ | ✅ |
| Cycle detection | S | - | ✅ | ✅ | ✅ |
| Reactive signals (auto-update) | S | - | ✅ | - | ✅ |
| Non-relevant field pruning in response | S | - | ✅ | - | ✅ |

## 7. Response & Validation Report

| Feature | Spec | Schema | TS Engine | Py | E2E |
|---------|:----:|:------:|:---------:|:--:|:---:|
| `definitionUrl` | S | ✅ | ✅ | ✅ | ✅ |
| `definitionVersion` | S | ✅ | ✅ | ✅ | ✅ |
| `status` (in-progress/completed/amended/stopped) | S | ✅ | ✅ | ✅ | ✅ |
| `data` (instance) | S | ✅ | ✅ | ✅ | ✅ |
| `authored` (ISO 8601) | S | ✅ | ✅ | ✅ | ✅ |
| `id` (UUID) | S | ✅ | ❌ | ✅ | - |
| `author` | S | ? | ❌ | ✅ | - |
| `subject` | S | ✅ | ❌ | ✅ | - |
| `validationResults` array | S | ✅ | ✅ | ✅ | ✅ |
| ValidationResult: all fields | S | ✅ | ✅ | ✅ | - |
| ValidationReport: `valid`, `results`, `counts`, `timestamp` | S | ✅ | ✅ | ✅ | - |

## 8. FEL — Operators & Syntax

| Feature | Spec | Schema | TS Engine | Py Evaluator | E2E |
|---------|:----:|:------:|:---------:|:------------:|:---:|
| Arithmetic: `+`, `-`, `*`, `/`, `%` | S | - | ✅ | ✅ | ✅ |
| Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=` | S | - | ✅ | ✅ | ✅ |
| Logical: `and`, `or`, `not` | S | - | ✅ | ✅ | ✅ |
| String concat: `&` | S | - | ✅ | ✅ | ✅ |
| Null coalesce: `??` | S | - | ✅ | ✅ | - |
| Membership: `in`, `not in` | S | - | ✅ | ✅ | - |
| Ternary: `? :` | S | - | ✅ | ✅ | ✅ |
| If-then-else | S | - | ✅ | ✅ | ✅ |
| Let bindings | S | - | ✅ | ✅ | - |
| Field refs: `$fieldName`, `.nested`, `[0]`, `[*]` | S | - | ✅ | ✅ | ✅ |
| Context refs: `@index`, `@current`, `@count` | S | - | ✅ | ✅ | ✅ |
| Instance refs: `@instance('name')` | S | - | ✅ | ✅ | - |
| Literals: string, number, boolean, null | S | - | ✅ | ✅ | ✅ |
| Date literals: `@YYYY-MM-DD` | S | - | ✅ | ✅ | ✅ |
| DateTime literals | S | - | ✅ | ✅ | - |
| Array literals: `[1, 2, 3]` | S | - | ✅ | ✅ | - |
| Object literals: `{key: value}` | S | - | ✅ | ✅ | - |
| Comments: `//` and `/* */` | S | - | ✅ | ✅ | - |
| Null propagation rules | S | - | ✅ | ✅ | ✅ |
| Short-circuit evaluation | S | - | ✅ | ✅ | - |
| Unary negation: `-expr`, `not expr` | S | - | ✅ | ✅ | - |

## 9. FEL — Standard Library Functions

| Function | Spec | TS Engine | Py Evaluator | E2E |
|----------|:----:|:---------:|:------------:|:---:|
| **Aggregate** | | | | |
| `sum(array)` | S | ✅ | ✅ | ✅ |
| `avg(array)` | S | ✅ | ✅ | ✅ |
| `min(array)` | S | ✅ | ✅ | ✅ |
| `max(array)` | S | ✅ | ✅ | ✅ |
| `count(array)` | S | ✅ | ✅ | ✅ |
| `countWhere(array, predicate)` | S | ✅ | ✅ | - |
| **String** | | | | |
| `upper(s)` | S | ✅ | ✅ | ✅ |
| `lower(s)` | S | ✅ | ✅ | ✅ |
| `trim(s)` | S | ✅ | ✅ | ✅ |
| `length(s)` | S | ✅ | ✅ | ✅ |
| `substring(s, start, len?)` | S | ✅ | ✅ | ✅ |
| `replace(s, old, new)` | S | ✅ | ✅ | ✅ |
| `contains(s, sub)` | S | ✅ | ✅ | ✅ |
| `startsWith(s, prefix)` | S | ✅ | ✅ | ✅ |
| `endsWith(s, suffix)` | S | ✅ | ✅ | ✅ |
| `matches(s, regex)` | S | ✅ | ✅ | ✅ |
| `format(fmt, ...args)` | S | ✅ | ✅ | ✅ |
| **Date/Time** | | | | |
| `today()` | S | ✅ | ✅ | ✅ |
| `now()` | S | ✅ | ✅ | ✅ |
| `year(d)` | S | ✅ | ✅ | ✅ |
| `month(d)` | S | ✅ | ✅ | ✅ |
| `day(d)` | S | ✅ | ✅ | ✅ |
| `hours(dt)` | S | ✅ | ✅ | ✅ |
| `minutes(dt)` | S | ✅ | ✅ | ✅ |
| `seconds(dt)` | S | ✅ | ✅ | ✅ |
| `time(dt)` | S | ✅ | ✅ | ✅ |
| `dateAdd(d, n, unit)` | S | ✅ | ✅ | ✅ |
| `dateDiff(d1, d2, unit)` | S | ✅ | ✅ | ✅ |
| `timeDiff(t1, t2, unit)` | S | ✅ | ✅ | ✅ |
| **Type/Conversion** | | | | |
| `typeOf(v)` | S | ✅ | ✅ | - |
| `isNumber(v)` | S | ✅ | ✅ | ✅ |
| `isString(v)` | S | ✅ | ✅ | ✅ |
| `isDate(v)` | S | ✅ | ✅ | ✅ |
| `number(v)` | S | ✅ | ✅ | - |
| **Null/Presence** | | | | |
| `isNull(v)` | S | ✅ | ✅ | ✅ |
| `present(v)` | S | ✅ | ✅ | - |
| `empty(array)` | S | ✅ | ✅ | - |
| `coalesce(...args)` | S | ✅ | ✅ | - |
| **Math** | | | | |
| `abs(n)` | S | ✅ | ✅ | ✅ |
| `round(n, precision?)` | S | ✅ | ✅ | ✅ |
| `floor(n)` | S | ✅ | ✅ | ✅ |
| `ceil(n)` | S | ✅ | ✅ | ✅ |
| `power(base, exp)` | S | ✅ | ✅ | ✅ |
| **Conditional** | | | | |
| `if(cond, then, else)` | S | ✅ | ✅ | ✅ |
| **Form State (MIP)** | | | | |
| `relevant(path)` | S | ✅ | ✅ | - |
| `required(path)` | S | ✅ | ✅ | - |
| `readonly(path)` | S | ✅ | ✅ | - |
| **Choice** | | | | |
| `selected(val, option)` | S | ✅ | ✅ | ✅ |
| **Money** | | | | |
| `money(amount, currency)` | S | ✅ | ✅ | ✅ |
| `moneyAmount(m)` | S | ✅ | ✅ | ✅ |
| `moneyCurrency(m)` | S | ✅ | ✅ | ✅ |
| `moneyAdd(a, b)` | S | ✅ | ✅ | ✅ |
| `moneySum(array)` | S | ✅ | ✅ | ✅ |
| **Repeat Navigation** | | | | |
| `prev(fieldName)` | S | ✅ | ✅ | ✅ |
| `next(fieldName)` | S | ✅ | ✅ | ✅ |
| `parent(fieldName)` | S | ✅ | ✅ | ✅ |

## 10. Theme Specification

| Feature | Spec | Schema | TS WebComp | Py Linter | E2E |
|---------|:----:|:------:|:----------:|:---------:|:---:|
| `$formspecTheme` version const | S | ✅ | - | ✅ | - |
| `version`, `targetDefinition` | S | ✅ | - | ✅ | - |
| Optional metadata (url, name, title, desc) | S | ✅ | - | ✅ | - |
| `platform` | S | ? | - | ✅ | - |
| **Design Tokens** | | | | | |
| Flat key-value map (string/number) | S | ✅ | ✅ | ✅ | - |
| `$token.` reference syntax | S | - | ✅ | ✅ | - |
| Token category prefixes (color, spacing, etc.) | S | - | - | ✅ | - |
| **Widget Catalog** | | | | | |
| `widget` property | S | ✅ | - | ✅ | - |
| `widgetConfig` | S | ? | - | ✅ | - |
| `fallback` arrays | S | ✅ | - | ✅ | - |
| **Selector Cascade** | | | | | |
| `defaults` (level 1) | S | ✅ | - | ✅ | - |
| `selectors` match/apply (level 2) | S | ✅ | - | ✅ | - |
| `items` per-key overrides (level 3) | S | ✅ | - | ✅ | - |
| Cascade priority/merge semantics | S | - | ❌ | - | - |
| Null suppression (`"none"` sentinel) | S | ✅ | - | ✅ | - |
| **PresentationBlock** | | | | | |
| widget, widgetConfig, labelPosition | S | ✅ | - | ✅ | - |
| style, accessibility, fallback | S | ✅ | - | ✅ | - |
| AccessibilityBlock (role, desc, liveRegion) | S | ✅ | - | ✅ | - |
| **Page Layout** | | | | | |
| `pages` array (id, title, regions) | S | ✅ | - | ✅ | - |
| 12-column grid regions | S | ✅ | - | ✅ | - |
| `breakpoints` (name-to-px map) | S | ✅ | - | ✅ | - |
| Responsive regions (per-breakpoint span) | S | ✅ | - | - | - |
| Token validation (colors, spacing, etc.) | - | - | - | ✅ | - |

## 11. Component Specification

### 11.1 Document Structure

| Feature | Spec | Schema | TS WebComp | Py Linter | E2E |
|---------|:----:|:------:|:----------:|:---------:|:---:|
| `$formspecComponent` version const | S | ✅ | ✅ | ✅ | - |
| `version`, `targetDefinition` | S | ✅ | ✅ | ✅ | - |
| Optional metadata | S | ✅ | - | ✅ | - |
| `tree` (single root) | S | ✅ | ✅ | ✅ | ✅ |
| `breakpoints` | S | ✅ | - | ✅ | - |
| `tokens` | S | ✅ | ✅ | ✅ | - |
| `components` (custom registry) | S | ✅ | ❌ | ✅ | - |
| `x-` extension keys | S | ✅ | - | ✅ | - |

### 11.2 Common Component Properties

| Feature | Spec | Schema | TS WebComp | Py Linter | E2E |
|---------|:----:|:------:|:----------:|:---------:|:---:|
| `component` type string | S | ✅ | ✅ | ✅ | ✅ |
| `when` (FEL condition) | S | ✅ | ✅ | ✅ | ✅ |
| `responsive` overrides | S | ? | ❌ | ✅ | - |
| `style` object | S | ✅ | ✅ | ✅ | ✅ |
| `accessibility` block | S | ✅ | ❌ | ✅ | - |

### 11.3 Built-In Components — Core (18)

| Component | Spec | Schema | TS WebComp | Py Linter | E2E |
|-----------|:----:|:------:|:----------:|:---------:|:---:|
| Page | S | ✅ | ✅ | ✅ | ✅ |
| Stack | S | ✅ | ✅ | ✅ | ✅ |
| Grid | S | ✅ | ✅ | ✅ | - |
| Wizard | S | ✅ | ✅ | ✅ | ✅ |
| Spacer | S | ✅ | ✅ | ✅ | - |
| TextInput | S | ✅ | ✅ | ✅ | ✅ |
| NumberInput | S | ✅ | ✅ | ✅ | ✅ |
| DatePicker | S | ✅ | ✅ | ✅ | ✅ |
| Select | S | ✅ | ✅ | ✅ | ✅ |
| CheckboxGroup | S | ✅ | ✅ | ✅ | ✅ |
| Toggle | S | ✅ | ✅ | ✅ | ✅ |
| FileUpload | S | ✅ | ❌ | ✅ | - |
| Heading | S | ✅ | ✅ | ✅ | ✅ |
| Text | S | ✅ | ✅ | ✅ | ✅ |
| Divider | S | ✅ | ❌ | ✅ | - |
| Card | S | ✅ | ✅ | ✅ | ✅ |
| Collapsible | S | ✅ | ❌ | ✅ | - |
| ConditionalGroup | S | ✅ | ✅ | ✅ | ✅ |

### 11.4 Built-In Components — Progressive (15)

| Component | Spec | Schema | TS WebComp | Py Linter | E2E |
|-----------|:----:|:------:|:----------:|:---------:|:---:|
| Columns | S | ✅ | ❌ | ✅ | - |
| Tabs | S | ✅ | ✅ | ✅ | ✅ |
| Accordion | S | ✅ | ❌ | ✅ | - |
| RadioGroup | S | ✅ | ✅ | ✅ | - |
| MoneyInput | S | ✅ | ❌ | ✅ | - |
| Slider | S | ✅ | ❌ | ✅ | - |
| Rating | S | ✅ | ❌ | ✅ | - |
| Signature | S | ✅ | ❌ | ✅ | - |
| Alert | S | ✅ | ✅ | ✅ | - |
| Badge | S | ✅ | ✅ | ✅ | - |
| ProgressBar | S | ✅ | ❌ | ✅ | - |
| Summary | S | ✅ | ✅ | ✅ | ✅ |
| DataTable | S | ✅ | ✅ | ✅ | ✅ |
| Panel | S | ✅ | ❌ | ✅ | - |
| Modal | S | ✅ | ❌ | ✅ | - |

### 11.5 Custom Components

| Feature | Spec | Schema | TS WebComp | Py Linter | E2E |
|---------|:----:|:------:|:----------:|:---------:|:---:|
| `components` registry (params/tree) | S | ✅ | ❌ | ✅ | - |
| PascalCase naming | S | ✅ | - | ✅ | - |
| `{param}` interpolation | S | - | ❌ | - | - |
| Custom component instantiation | S | ✅ | ❌ | ✅ | - |
| Recursion prohibition / cycle detection | S | - | - | ✅ | - |

### 11.6 Component-Specific Props (not exhaustive — highlights)

| Prop | Component | Spec | Schema | TS WebComp | E2E |
|------|-----------|:----:|:------:|:----------:|:---:|
| `direction` | Stack | S | ✅ | ✅ | ✅ |
| `gap` | Stack/Grid | S | ✅ | ✅ | ✅ |
| `wrap` | Stack | S | ✅ | ❌ | - |
| `columns` | Grid | S | ✅ | ✅ | - |
| `rowGap` | Grid | S | ✅ | ❌ | - |
| `showProgress` | Wizard | S | ✅ | ❌ | - |
| `allowSkip` | Wizard | S | ✅ | ❌ | - |
| `placeholder` | TextInput | S | ✅ | ✅ | ✅ |
| `maxLines` | TextInput | S | ✅ | ✅ | - |
| `inputMode` | TextInput | S | ✅ | ✅ | - |
| `prefix`/`suffix` | TextInput | S | ✅ | ❌ | - |
| `step`/`min`/`max` | NumberInput | S | ✅ | ❌ | - |
| `showStepper` | NumberInput | S | ✅ | ❌ | - |
| `locale` | NumberInput | S | ✅ | ❌ | - |
| `format` | DatePicker | S | ✅ | ❌ | - |
| `minDate`/`maxDate` | DatePicker | S | ✅ | ❌ | - |
| `showTime` | DatePicker | S | ✅ | ❌ | - |
| `searchable` | Select | S | ✅ | ❌ | - |
| `clearable` | Select | S | ✅ | ❌ | - |
| `orientation` | RadioGroup | S | ✅ | ❌ | - |
| `selectAll` | CheckboxGroup | S | ✅ | ❌ | - |
| `dragDrop` | FileUpload | S | ✅ | ❌ | - |
| `showCurrency` | MoneyInput | S | ✅ | ❌ | - |
| `showValue`/`showTicks` | Slider | S | ✅ | ❌ | - |
| `icon`/`allowHalf` | Rating | S | ✅ | ❌ | - |
| `strokeColor`/`height` | Signature | S | ✅ | ❌ | - |
| `dismissible` | Alert | S | ✅ | ❌ | - |
| `variant` | Badge | S | ✅ | ❌ | - |
| `showPercent` | ProgressBar | S | ✅ | ❌ | - |
| `showRowNumbers` | DataTable | S | ✅ | ❌ | - |
| `allowAdd`/`allowRemove` | DataTable | S | ✅ | ❌ | - |
| `elevation` | Card | S | ✅ | ❌ | - |
| `tabLabels`/`defaultTab` | Tabs | S | ✅ | ✅ | ✅ |
| `position` | Tabs | S | ✅ | ❌ | - |
| `defaultOpen` | Accordion | S | ✅ | ❌ | - |
| `title`/`width` | Panel | S | ✅ | ❌ | - |
| `trigger`/`triggerLabel`/`closable` | Modal | S | ✅ | ❌ | - |
| `size` | Modal | S | ✅ | ❌ | - |

## 12. Mapping DSL

| Feature | Spec | Schema | TS Engine | Py Adapters | E2E |
|---------|:----:|:------:|:---------:|:-----------:|:---:|
| Document structure (`version`, `definitionRef`, etc.) | S | ✅ | - | - | - |
| `direction` (forward/reverse/both) | S | ✅ | - | - | - |
| `defaults` | S | ✅ | - | - | - |
| `autoMap` | S | ✅ | - | - | - |
| `conformanceLevel` | S | ✅ | - | - | - |
| **Field Rules** | | | | | |
| `sourcePath` / `targetPath` | S | ✅ | - | - | - |
| 10 transform types | S | ✅ | - | - | - |
| `expression` (FEL) | S | ✅ | - | - | - |
| `coerce` (object + shorthand) | S | ✅ | - | - | - |
| `valueMap` (forward/reverse/unmapped) | S | ✅ | - | - | - |
| `reverse` override | S | ✅ | - | - | - |
| `bidirectional` flag | S | ✅ | - | - | - |
| `condition` (FEL guard) | S | ✅ | - | - | - |
| `default` fallback | S | ✅ | - | - | - |
| `array` descriptor (each/whole/indexed) | S | ✅ | - | - | - |
| `priority` / `reversePriority` | S | ✅ | - | - | - |
| **Execution Pipeline** | S | - | - | ❌ | - |
| **Bidirectional Semantics** | S | - | - | ❌ | - |
| **Format Adapters** | | | | | |
| JSON adapter (pretty, sortKeys, nullHandling) | S | ✅ | - | ✅ | - |
| XML adapter (declaration, indent, cdata, NS) | S | ✅ | - | ✅ | - |
| CSV adapter (delimiter, quote, header, encoding) | S | ✅ | - | ✅ | - |
| Custom adapters (`x-` prefix) | S | ✅ | - | ❌ | - |

## 13. Extension Registry

| Feature | Spec | Schema | TS | Py | E2E |
|---------|:----:|:------:|:--:|:--:|:---:|
| `$formspecRegistry` version const | S | ✅ | - | ✅ | - |
| `publisher` (name, url, contact) | S | ✅ | - | ✅ | - |
| `published` (ISO 8601) | S | ✅ | - | ✅ | - |
| `entries` array | S | ✅ | - | ✅ | - |
| Entry: `name` (x- pattern) | S | ✅ | - | ✅ | - |
| Entry: `category` (5 values) | S | ✅ | - | ✅ | - |
| Entry: `version` (SemVer) | S | ✅ | - | ✅ | - |
| Entry: `status` lifecycle | S | ✅ | - | ✅ | - |
| Entry: `compatibility` | S | ✅ | - | ✅ | - |
| Category-specific props (dataType/function/constraint/namespace) | S | ✅ | - | ✅ | - |
| `deprecationNotice` when deprecated | S | ✅ | - | ✅ | - |
| Well-known URL discovery | S | - | - | ❌ | - |
| Extension resolution in processors | S | - | ❌ | ❌ | - |
| `x-formspec-` prefix reservation | S | ❌ | - | - | - |
| `(name, version)` uniqueness | S | ❌ | - | - | - |
| Valid state transition enforcement | S | ❌ | - | - | - |

## 14. Changelog

| Feature | Spec | Schema | TS | Py | E2E |
|---------|:----:|:------:|:--:|:--:|:---:|
| Document structure | S | ✅ | - | ✅ | - |
| `semverImpact` (major/minor/patch) | S | ✅ | - | ✅ | - |
| Change: `type` (5 values) | S | ✅ | - | ✅ | - |
| Change: `target` (8 categories) | S | ✅ | - | ✅ | - |
| Change: `impact` classification | S | ✅ | - | ✅ | - |
| Change: `before`/`after`/`migrationHint` | S | ✅ | - | ✅ | - |
| Impact classification rules | S | - | - | ❌ | - |
| Generation algorithm | S | - | - | ❌ | - |
| Migration auto-generation (→ §6.7) | S | - | - | ❌ | - |

## 15. Python Validator (Lint) — Error Codes

| Code | Check | Implemented | Tested |
|------|-------|:-----------:|:------:|
| E200 | Duplicate item keys | ✅ | ✅ |
| E201 | Duplicate full paths | ✅ | ✅ |
| E300 | Bind path resolution | ✅ | ✅ |
| E301 | Shape target resolution | ✅ | ✅ |
| E302 | Option set reference | ✅ | ✅ |
| W300 | Option set dataType compatibility | ✅ | ✅ |
| E400 | FEL syntax errors | ✅ | ✅ |
| E500 | Dependency cycle detection | ✅ | ✅ |
| W700 | Color token validation | ✅ | ✅ |
| W701 | Spacing/size token validation | ✅ | ✅ |
| W702 | Font weight token validation | ✅ | ✅ |
| W703 | Line height token validation | ✅ | ✅ |
| E800 | Root component must be layout | ✅ | ✅ |
| — | Component/dataType compatibility | ✅ | ✅ |
| — | Option source requirement | ✅ | ✅ |
| — | Custom component cycle detection | ✅ | ✅ |

---

## Summary Scorecard

| Layer | Total Features | Fully Done | Partial | Missing | N/A | Coverage |
|-------|:--------------:|:----------:|:-------:|:-------:|:---:|:--------:|
| **Spec ↔ Schema** | ~212 | 200 | 9 | 3 | 49 | **97%** |
| **Spec → TS Engine** (core logic) | ~85 | 72 | 3 | 10 | — | **85%** |
| **Spec → TS WebComp** (33 components) | 33 | 22 | 0 | 11 | — | **67%** |
| **Spec → TS WebComp** (component props) | ~55 | ~12 | 0 | ~43 | — | **~22%** |
| **Spec → Python Backend** | ~95 | 85 | 0 | 10 | — | **89%** |
| **E2E Coverage** | ~85 testable features | 45 | 0 | 40 | — | **53%** |

### TS WebComponent — 22 Registered Components

Page, Stack, Grid, Wizard, Spacer, TextInput, NumberInput, Select, Toggle, Checkbox*, DatePicker, RadioGroup, CheckboxGroup, Heading, Text, Card, Alert, Badge, Summary, Tabs, ConditionalGroup, DataTable

*\*Checkbox is a non-spec extra (Toggle covers boolean in the spec)*

**Not registered (12 of 33 spec components):** FileUpload, Divider, Collapsible, Columns, Accordion, MoneyInput, Slider, Rating, Signature, ProgressBar, Panel, Modal

### Key Gaps by Priority

#### TS Engine — Missing Core Features
1. `screener` — Conditional branching not implemented
2. `migrations` — Version migration not implemented
3. `$ref` / `keyPrefix` — Modular composition not implemented
4. `whitespace` / `excludedValue` / `disabledDisplay` — Bind processing options
5. `semanticType` / `prePopulate` / `precision` — Field metadata
6. `labels` (context-keyed) — Internationalization support
7. `id` / `author` / `subject` on Response — Response metadata
8. `formPresentation` — Partial (pageMode may work via Wizard)
9. Shape `timing` — Only continuous implemented (no submit/demand)

#### TS WebComponent — Missing Components (12 of 33)
- **Not registered:** FileUpload, Divider, Collapsible, Columns, Accordion, MoneyInput, Slider, Rating, Signature, ProgressBar, Panel, Modal
- **Also not implemented:** Custom component instantiation, responsive overrides, accessibility block rendering

#### TS WebComponent — Missing Prop Support
- Most component-specific props beyond basic binding are not implemented
- ~40+ individual props defined in spec/schema but not rendered

#### Python — Missing Runtime Features
- Mapping DSL transform execution (adapters exist but no rule engine)
- Changelog generation algorithm / impact classification
- Extension registry resolution and discovery
- Custom adapters beyond JSON/XML/CSV

#### E2E — Coverage Gaps
- No Theme (Tier 2) rendering tests
- No custom component tests
- No accessibility tests
- No mapping/adapter tests
- Limited progressive component coverage
- Demo test (`demo.spec.ts`) is skipped

---

## Cross-Implementation Parity: TS vs Python FEL

| Aspect | TS (Chevrotain) | Python (Scannerless) | Parity |
|--------|:---------------:|:--------------------:|:------:|
| Token types | ~40 | Equivalent | ✅ |
| Operator precedence | 14 levels | 14 levels | ✅ |
| Built-in functions | 47+ | 47+ | ✅ |
| Null propagation | ✅ | ✅ | ✅ |
| Date literals | ✅ | ✅ | ✅ |
| Let bindings | ✅ | ✅ | ✅ |
| Comments | ✅ | ✅ | ✅ |
| Money type | ✅ | ✅ | ✅ |
| Decimal precision | JS Number (float64) | Decimal (34-digit) | ⚠️ |
| Wildcard resolution | ✅ | ✅ | ✅ |
| Extension functions | ✅ | ✅ | ✅ |
| Dependency extraction | ✅ | ✅ | ✅ |

> **Note:** Numeric precision differs: TS uses JS Number (IEEE 754 float64, ~15 significant digits) while Python uses `Decimal` with 34-digit precision. This could cause subtle rounding differences for edge-case decimal calculations.
