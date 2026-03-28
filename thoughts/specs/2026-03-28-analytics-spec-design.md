# Analytics Specification Design

**Status:** Draft
**Date:** 2026-03-28
**Author:** Claude
**Audience:** Formspec spec editors, platform engineers, analytics/product teams

---

## 1. Problem Statement

Form authors and platform operators need insight into how forms are used: where respondents struggle, which fields cause abandonment, how long completion takes, and what patterns emerge across submissions. Today there is no standard way to capture, describe, or route these signals. Every platform reinvents the same plumbing — and the analytics layer inevitably becomes tightly coupled to a specific vendor (GA4, Mixpanel, Amplitude, Segment, Posthog, etc.).

Formspec already has the **Respondent Ledger** for compliance-grade audit history. Analytics is a different concern: it's about **aggregate insight**, not individual record-keeping. The ledger answers "what happened to *this* submission?" — analytics answers "what's happening across *all* submissions?"

---

## 2. Design Principles

1. **Optional sidecar** — like Theme and Component, analytics is a separate document that layers on top of a Definition. A form works perfectly without it.
2. **Declarative, not imperative** — authors declare *what* to measure, not *how* to send it. No JavaScript callbacks in the spec.
3. **Sensible defaults** — a single `"$formspecAnalytics": "1.0"` with zero configuration should produce useful data. You opt in to analytics, then opt out of specific signals if needed.
4. **Privacy by design** — field values are never included in analytics events by default. Authors must explicitly allowlist value capture, and even then the spec encourages aggregation over raw values.
5. **Platform-agnostic routing** — events flow through an adapter layer (like Mapping adapters). The spec defines the event shape; adapters translate to vendor wire formats.
6. **FEL-powered customization** — custom metrics and event conditions use the same expression language as the rest of Formspec.

---

## 3. Tiered Architecture

Following the Formspec layering model:

```
┌─────────────────────────────────────────────────┐
│  Tier 0: Built-in Signals (zero config)         │
│  Form lifecycle + field interaction telemetry    │
│  Emitted automatically when analytics enabled    │
├─────────────────────────────────────────────────┤
│  Tier 1: Configured Signals (analytics sidecar) │
│  Custom events, metrics, funnels, segments       │
│  Author-declared in the analytics document       │
├─────────────────────────────────────────────────┤
│  Tier 2: Adapters (platform routing)             │
│  GA4, Segment, Amplitude, Posthog, custom        │
│  Translate canonical events → vendor payloads    │
└─────────────────────────────────────────────────┘
```

### Tier 0 — Built-in Signals

These fire automatically when analytics is enabled. No configuration needed. They represent the universal questions every form owner asks.

| Signal | Fires When | Default Payload |
|--------|-----------|-----------------|
| `form.loaded` | Definition rendered and interactive | `{ formId, definitionVersion, variant, locale, device }` |
| `form.started` | First user interaction (focus/input) | `{ formId, timeToStart }` |
| `form.completed` | Successful submission | `{ formId, completionTime, fieldCount, pagesVisited }` |
| `form.abandoned` | Session end without submission | `{ formId, lastFieldPath, duration, percentComplete, lastPage }` |
| `form.error` | Validation block on submit attempt | `{ formId, errorCount, errorPaths[], errorKinds[] }` |
| `page.entered` | Page/section becomes visible | `{ formId, pageKey, pageIndex, source }` |
| `page.exited` | Page/section leaves view | `{ formId, pageKey, dwellTime }` |
| `field.focused` | Field receives focus | `{ formId, fieldPath, fieldType }` |
| `field.blurred` | Field loses focus | `{ formId, fieldPath, dwellTime, changed, isEmpty }` |
| `field.error.shown` | Validation error displayed | `{ formId, fieldPath, constraintKind, severity }` |
| `field.error.resolved` | Validation error cleared | `{ formId, fieldPath, constraintKind, timeToResolve }` |
| `repeat.added` | Repeat instance added | `{ formId, groupPath, newCount }` |
| `repeat.removed` | Repeat instance removed | `{ formId, groupPath, newCount }` |

**Privacy guarantee:** No field *values* in Tier 0 events. Paths and types only.

### Tier 1 — Configured Signals

Authors declare custom analytics in a sidecar document:

```json
{
  "$formspecAnalytics": "1.0",
  "targetDefinition": "https://forms.example.gov/intake/housing",
  "targetVersion": ">=2.0.0 <3.0.0",

  "settings": {
    "enabled": true,
    "sampling": 1.0,
    "builtins": {
      "field.focused": false,
      "field.blurred": false
    },
    "privacy": {
      "hashFieldPaths": false,
      "excludePaths": ["ssn", "items[*].bankAccount"]
    }
  },

  "properties": {
    "formVariant": { "value": "variant-b", "scope": "session" },
    "userCohort":  { "bind": "$experimentCohort", "scope": "session" },
    "orgSize":     { "bind": "$organizationSize", "scope": "event" }
  },

  "metrics": {
    "eligibilityDropoff": {
      "description": "Respondent answered 'no' to eligibility question",
      "trigger": "$eligible = false",
      "properties": {
        "reason": { "bind": "$ineligibleReason" }
      }
    },
    "highValueApplication": {
      "description": "Requested amount exceeds threshold",
      "trigger": "$requestedAmount > 50000",
      "once": true
    }
  },

  "funnels": {
    "completionFunnel": {
      "steps": [
        { "name": "started",    "event": "form.started" },
        { "name": "contact",    "event": "page.entered", "filter": "pageKey = 'contact'" },
        { "name": "financial",  "event": "page.entered", "filter": "pageKey = 'financial'" },
        { "name": "review",     "event": "page.entered", "filter": "pageKey = 'review'" },
        { "name": "submitted",  "event": "form.completed" }
      ]
    }
  },

  "segments": {
    "mobileUsers":  { "condition": "device.type = 'mobile'" },
    "returningUsers": { "condition": "session.isReturn = true" }
  },

  "valueCapture": {
    "allowlist": ["state", "programType", "householdSize"],
    "mode": "category",
    "note": "Only categorical fields — never PII or free text"
  },

  "extensions": {}
}
```

#### Key Tier 1 Concepts

**Settings** — global controls:
- `enabled` — master kill switch
- `sampling` — 0.0–1.0, for high-traffic forms. Deterministic per-session (hash of sessionId).
- `builtins` — opt out of specific Tier 0 signals (e.g., disable noisy `field.focused` events)
- `privacy.excludePaths` — fields that must never appear in any analytics event, even custom ones. Supports wildcards.
- `privacy.hashFieldPaths` — if true, field paths are SHA-256 hashed in events (for forms where even the *structure* is sensitive)

**Properties** — named values attached to events:
- `value` — static literal
- `bind` — FEL expression evaluated against current form state
- `scope` — `"session"` (set once, carried on all events) or `"event"` (re-evaluated per event)
- These become dimensions in your analytics platform.

**Metrics** — custom events:
- `trigger` — FEL expression. Event fires when expression becomes truthy.
- `once` — if true, fires at most once per session (default: false).
- `properties` — additional key-value pairs attached to this event. Values can be literals or FEL binds.

**Funnels** — ordered step sequences:
- Declarative definition of conversion funnels. Each step references a built-in or custom event with an optional FEL `filter`.
- Adapters that support funnel analysis (Amplitude, Mixpanel) can translate directly. Others receive the raw events and you build funnels in-platform.

**Segments** — respondent classifications:
- FEL conditions evaluated against session/form state.
- Attached as properties to all events for the session once the condition becomes true.

**Value Capture** — explicit opt-in to including field values:
- `allowlist` — only these field paths may have values included
- `mode` — `"raw"` (actual value), `"category"` (categorical fields only — select, radio, checkbox), `"hashed"` (SHA-256 of value)
- This is the only way field values enter analytics events. Without this block, values are never sent.

### Tier 2 — Adapters

Adapters translate the canonical Formspec analytics event shape into vendor-specific payloads.

```
Canonical Event (JSON)
       ↓
  ┌─────────────┐
  │  Adapter     │
  │  Registry    │
  │              │
  │  ┌─────────┐ │
  │  │ GA4     │ │  → gtag('event', ...)
  │  ├─────────┤ │
  │  │ Segment │ │  → analytics.track(...)
  │  ├─────────┤ │
  │  │ Posthog │ │  → posthog.capture(...)
  │  ├─────────┤ │
  │  │ Custom  │ │  → your callback
  │  └─────────┘ │
  └─────────────┘
```

#### Adapter Interface

```typescript
interface AnalyticsAdapter {
  name: string;

  /** Called once when analytics initializes */
  init(config: AdapterConfig): void | Promise<void>;

  /** Translate and send a single canonical event */
  track(event: AnalyticsEvent): void;

  /** Set session-scoped properties (called when properties change) */
  identify(properties: Record<string, unknown>): void;

  /** Flush any buffered events (e.g., on form.completed or page unload) */
  flush(): void | Promise<void>;

  /** Cleanup */
  dispose(): void;
}
```

#### Canonical Event Shape

Every event — built-in or custom — flows through adapters as:

```typescript
interface AnalyticsEvent {
  /** e.g., "form.started", "field.blurred", "custom.eligibilityDropoff" */
  event: string;

  /** ISO 8601 timestamp */
  timestamp: string;

  /** Stable session identifier (no PII) */
  sessionId: string;

  /** Form identity */
  formId: string;
  definitionVersion: string;

  /** Event-specific payload (varies by event type) */
  data: Record<string, unknown>;

  /** Session-scoped properties (from analytics doc + segments) */
  properties: Record<string, unknown>;

  /** Which analytics doc version produced this event */
  analyticsVersion: string;
}
```

#### Built-in Adapters

The spec defines adapter contracts for common platforms. Implementations MAY ship these or leave them to the community:

| Adapter | Maps To | Notes |
|---------|---------|-------|
| `console` | `console.table()` | Development/debugging. Ships by default. |
| `callback` | User-provided function | Escape hatch. `(event: AnalyticsEvent) => void` |
| `beacon` | `navigator.sendBeacon()` | Raw JSON to a URL endpoint. Survives page unload. |
| `ga4` | `gtag('event', ...)` | Maps canonical events to GA4 event model. Respects GA4 parameter limits. |
| `segment` | `analytics.track()` / `.identify()` | Maps properties to Segment traits. |
| `posthog` | `posthog.capture()` | Direct mapping. Supports feature flags via properties. |
| `amplitude` | `amplitude.track()` | Maps funnels to Amplitude event sequences. |

Custom adapters follow the same `x-` prefix convention as the rest of Formspec:

```json
{
  "adapters": [
    { "type": "ga4", "config": { "measurementId": "G-XXXXXXXXXX" } },
    { "type": "beacon", "config": { "endpoint": "https://analytics.example.gov/collect" } },
    { "type": "x-internal-datalake", "config": { "topic": "form-events" } }
  ]
}
```

Multiple adapters can run simultaneously (fan-out). The runtime sends every event to every configured adapter.

---

## 4. Relationship to Respondent Ledger

The Respondent Ledger and Analytics are complementary but distinct:

| Concern | Respondent Ledger | Analytics |
|---------|-------------------|-----------|
| **Question answered** | What happened to *this* submission? | What's happening across *all* submissions? |
| **Granularity** | Individual record | Aggregate patterns |
| **Values captured** | Full field values (material changes) | Never by default; opt-in categorical only |
| **Storage** | Per-response, append-only, integrity-chained | Streaming to external platforms |
| **Privacy model** | Audit trail with identity tiers | Anonymous/pseudonymous by default |
| **Audience** | Compliance, legal, dispute resolution | Product, UX, operations |
| **Required?** | Optional add-on | Optional sidecar |

An implementation MAY feed ledger events into the analytics pipeline as a data source, but the two systems MUST remain independently operable.

---

## 5. Privacy & Consent

### 5.1 Default Posture

Analytics is **off by default**. The presence of `$formspecAnalytics` enables it. Within that:

- Field values are **never** included unless `valueCapture.allowlist` explicitly names them
- Field paths are included (to know *where* users struggle) but can be hashed via `privacy.hashFieldPaths`
- Sensitive paths can be globally excluded via `privacy.excludePaths`
- No PII is ever included in Tier 0 signals

### 5.2 Consent Integration

The analytics runtime exposes a consent API that adapters respect:

```typescript
interface ConsentState {
  analytics: boolean;      // Core form analytics
  thirdParty: boolean;     // Vendor-specific tracking (GA4, etc.)
  performance: boolean;    // Timing and performance metrics
}
```

Adapters declare which consent categories they require. If consent is not granted, the adapter is not initialized:

```json
{
  "adapters": [
    { "type": "beacon", "config": { "endpoint": "..." }, "consent": ["analytics"] },
    { "type": "ga4", "config": { "measurementId": "..." }, "consent": ["analytics", "thirdParty"] }
  ]
}
```

The host application sets consent state; Formspec does not render consent UI (that's the host's responsibility).

### 5.3 Data Minimization

Adapters SHOULD support a `minimize` mode where:
- `field.focused` and `field.blurred` events are suppressed
- Timing values are bucketed (e.g., "0-5s", "5-30s", "30s+") rather than exact
- Session IDs rotate per page rather than per form session

---

## 6. Runtime Integration

### 6.1 Engine Hook Points

The FormEngine already tracks the state needed for analytics. The analytics layer hooks into existing signals:

| Signal Source | Analytics Events |
|---------------|-----------------|
| `setValue()` calls | `field.blurred` (on commit), value change detection |
| Validation signal changes | `field.error.shown`, `field.error.resolved` |
| Relevance signal changes | Funnel step evaluation, segment re-evaluation |
| Repeat count changes | `repeat.added`, `repeat.removed` |
| Page/section navigation | `page.entered`, `page.exited` |
| Submit flow | `form.completed`, `form.error` |

The analytics runtime is a **subscriber**, not an interceptor. It reads signals; it never modifies form state.

### 6.2 Registration API

```typescript
import { FormspecAnalytics } from 'formspec-analytics';

const analytics = new FormspecAnalytics(engine, analyticsDocument);
analytics.registerAdapter(ga4Adapter({ measurementId: 'G-XXX' }));
analytics.registerAdapter(beaconAdapter({ endpoint: '/collect' }));
analytics.setConsent({ analytics: true, thirdParty: false });
analytics.start();

// Later...
analytics.dispose();
```

For `<formspec-render>`, the web component auto-initializes analytics when:
1. An analytics sidecar is provided (via attribute or property)
2. At least one adapter is configured

```html
<formspec-render
  definition="./form.json"
  analytics="./analytics.json"
  analytics-adapters='[{"type":"beacon","config":{"endpoint":"/collect"}}]'>
</formspec-render>
```

---

## 7. Extensibility

### 7.1 Custom Event Types

Custom events defined in `metrics` are namespaced as `custom.*`:

```
custom.eligibilityDropoff
custom.highValueApplication
```

Registry extensions can declare reusable analytics event types:

```json
{
  "extensions": [
    {
      "id": "x-gov-analytics",
      "category": "analyticsEvent",
      "entries": {
        "x-gov-digitalServiceCompletion": {
          "description": "Standard government digital service completion metric",
          "properties": {
            "serviceId": { "type": "string", "required": true },
            "channel": { "type": "string", "enum": ["web", "mobile", "assisted"] }
          }
        }
      }
    }
  ]
}
```

### 7.2 Custom Adapters

Custom adapters follow the standard `x-` prefix convention and are registered via the extension registry:

```json
{
  "id": "x-org-snowflake-adapter",
  "category": "analyticsAdapter",
  "description": "Routes analytics events to Snowflake via Snowpipe",
  "config": {
    "required": ["accountUrl", "database", "schema"],
    "optional": ["warehouse", "role"]
  }
}
```

### 7.3 Computed Metrics

Beyond simple triggers, authors can define computed metrics using FEL:

```json
{
  "metrics": {
    "completionScore": {
      "type": "gauge",
      "value": "count(filter(items, item -> item.value != null)) / count(items) * 100",
      "emitOn": ["page.exited", "form.completed"]
    },
    "averageFieldTime": {
      "type": "gauge",
      "value": "$totalFieldDwellTime / $fieldsCompleted",
      "emitOn": ["form.completed"]
    }
  }
}
```

Metric types:
- `event` (default) — fires when trigger becomes truthy
- `gauge` — numeric value emitted at specified event boundaries
- `counter` — incrementing count, reset per session

---

## 8. What You Get for Free (Zero-Config Value)

If a form author simply adds:

```json
{ "$formspecAnalytics": "1.0" }
```

...and the platform has any adapter configured, they immediately get:

1. **Completion rate** — `form.started` vs `form.completed` count
2. **Abandonment analysis** — `form.abandoned` with `lastFieldPath` and `percentComplete`
3. **Error hotspots** — `field.error.shown` aggregated by `fieldPath` and `constraintKind`
4. **Time to complete** — `form.completed.completionTime`
5. **Page flow** — `page.entered` / `page.exited` sequence with dwell times
6. **Error recovery** — `field.error.resolved.timeToResolve` per field
7. **Device breakdown** — `device` property on all events
8. **Repeat section usage** — `repeat.added` / `repeat.removed` patterns

No configuration. No code. Just data.

---

## 9. Package Placement

Following the monorepo layering:

| Layer | Package | Role |
|-------|---------|------|
| 1 | `formspec-engine` | Exposes hook points (signals, lifecycle events). No analytics awareness. |
| 2 | `formspec-analytics` (new, layer 2) | Core analytics runtime: event emission, metric evaluation, adapter fan-out. Depends on engine signals. |
| 2 | `formspec-webcomponent` | Auto-wires analytics when sidecar provided. |
| 3 | `formspec-adapters` | Ships built-in analytics adapters (GA4, Segment, etc.) alongside mapping adapters. |

The analytics package sits at layer 2 — it depends on the engine (layer 1) and is consumed by the webcomponent (layer 2, peer) and adapters (layer 3).

---

## 10. Schema Sketch

New schema: `schemas/analytics.schema.json`

Top-level properties:
- `$formspecAnalytics` (required, version string)
- `targetDefinition` (URI)
- `targetVersion` (semver range)
- `settings` (object: enabled, sampling, builtins, privacy)
- `properties` (map of named session/event properties)
- `metrics` (map of custom event/gauge/counter definitions)
- `funnels` (map of ordered step sequences)
- `segments` (map of FEL condition-based classifications)
- `valueCapture` (allowlist + mode)
- `adapters` (array of adapter configurations)
- `extensions` (standard extension object)

---

## 11. Open Questions

1. **Server-side analytics?** Should the Python backend also evaluate analytics rules (for server-rendered forms or API-only submissions)? Likely yes — the Rust/WASM kernel could own the metric evaluation, with thin bridges in both TS and Python.

2. **Sampling strategy** — Session-based deterministic sampling is proposed. Should we also support event-level sampling for very high-frequency signals?

3. **Real-time vs. batch** — The adapter interface assumes real-time (`track()` per event). Should we also define a batch interface for adapters that prefer periodic flushes?

4. **Funnel timeout** — Should funnel steps have a timeout (e.g., "step must occur within 30 minutes of previous step")?

5. **A/B testing integration** — Properties support experiment cohorts via FEL. Should we go further and define a first-class variant/experiment model?

6. **Rate limiting** — Should the spec define maximum event emission rates to protect adapters and networks?

---

## 12. Non-Goals

- **Rendering analytics UI** — The spec defines the data. Dashboards are the adapter platform's job.
- **Session management** — The host app owns sessions. Analytics receives a `sessionId`, it doesn't generate one.
- **User identity** — Analytics is pseudonymous by default. Identity resolution is the host platform's concern.
- **Replacing the Respondent Ledger** — Analytics and audit are complementary, not overlapping.
- **Defining storage** — Events go to adapters. How they're stored is an implementation concern.
