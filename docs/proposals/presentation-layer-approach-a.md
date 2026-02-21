# Formspec v1.0 Presentation Layer — Approach A: "Presentation Hints"

**Status:** Proposal Draft  
**Layer:** 3 (Presentation)  
**Principle:** AD-02 — Separate structure from behavior from presentation.

---

## 1. Philosophy

Renderers already make excellent widget decisions from Layer 1 alone. A `dataType: "choice"` with four options practically screams "radio buttons"; a `dataType: "boolean"` is obviously a checkbox; `semanticType: "ietf:email"` tells a mobile renderer to show an email keyboard. The existing spec is already presentation-*aware* — `prefix`, `suffix`, `labels`, `hint`, and `disabledDisplay` are all rendering guidance smuggled into Layers 1 and 2.

Approach A embraces this reality instead of fighting it. Rather than introducing a separate presentation document with its own schema, lifecycle, and referencing mechanism, we add a **small, optional set of hint properties** directly to Items and Binds. The hints are:

- **Semantic, not visual.** We say `"widgetHint": "autocomplete"`, not `"display": "combobox with dropdown arrow"`.
- **Non-binding.** A renderer SHOULD respect hints but MAY ignore any hint it cannot support. A voice interface ignores `"columns": 2`. A PDF renderer ignores `"widgetHint": "slider"`. The form still works.
- **Discoverable.** Authors see hints inline next to the items they affect — no cross-referencing a separate file.

**Tradeoffs acknowledged:**

| Advantage | Disadvantage |
|---|---|
| Zero new documents or referencing | Cannot swap presentation without editing the definition |
| Trivial to implement incrementally | Mixes concerns at the JSON level (though namespaced clearly) |
| No new resolution/cascade rules | Cannot express platform-specific variants (web vs. mobile vs. PDF) |
| Works today with `x-` prefixed fields | Limited expressive power for complex layouts |

The bet: for 90% of real-world forms, these hints are sufficient. The remaining 10% (pixel-perfect branded layouts, adaptive multi-platform UIs) need a full Approach B/C companion spec — and that spec can *consume* these hints as defaults.

---

## 2. Schema Additions

All new properties live under a single **`presentation`** object on each Item (Field, Group, or Display). This keeps them namespaced, greppable, and trivially strippable by processors that want a "pure structure" view.

A top-level **`formPresentation`** object on the Definition provides form-wide defaults.

```json
{
  "formPresentation": {
    "pageMode": "wizard",
    "labelPosition": "top",
    "styleHints": { "density": "comfortable" }
  }
}
```

Per-item:

```json
{
  "key": "email",
  "type": "field",
  "dataType": "string",
  "semanticType": "ietf:email",
  "label": "Email Address",
  "presentation": {
    "widgetHint": "email",
    "layout": { "colSpan": 2 },
    "styleHints": { "emphasis": "primary" },
    "accessibility": { "description": "We will use this for account recovery." }
  }
}
```

**Property summary:**

| Property | On | Type | Purpose |
|---|---|---|---|
| `presentation.widgetHint` | Field, Display | string (enum) | Preferred widget |
| `presentation.layout` | Field, Group, Display | object | Layout participation |
| `presentation.styleHints` | Any Item | object | Semantic styling tokens |
| `presentation.accessibility` | Any Item | object | ARIA/a11y overrides |
| `formPresentation.pageMode` | Definition | `"single"` \| `"wizard"` \| `"tabs"` | Top-level page strategy |
| `formPresentation.labelPosition` | Definition | `"top"` \| `"start"` \| `"hidden"` | Default label placement |
| `formPresentation.styleHints` | Definition | object | Form-wide style tokens |

All `presentation` properties are OPTIONAL. An empty `presentation: {}` and an absent `presentation` are equivalent. Unrecognized keys inside `presentation` MUST be ignored (forward-compatible).

---

## 3. Widget Hints

The `widgetHint` value is a **semantic preference**, not a control name. Renderers use it to disambiguate when `dataType` alone is ambiguous.

| dataType | Valid `widgetHint` values | Default (if omitted) |
|---|---|---|
| `string` | `"text"`, `"email"`, `"phone"`, `"password"`, `"color"` | `"text"` |
| `text` | `"textarea"`, `"richText"` | `"textarea"` |
| `integer` | `"number"`, `"slider"`, `"stepper"` | `"number"` |
| `decimal` | `"number"`, `"slider"` | `"number"` |
| `boolean` | `"checkbox"`, `"toggle"`, `"yesNo"` | `"checkbox"` |
| `date` | `"calendar"`, `"threePart"`, `"text"` | `"calendar"` |
| `dateTime` | `"calendar"`, `"text"` | `"calendar"` |
| `time` | `"clock"`, `"text"` | `"clock"` |
| `choice` | `"dropdown"`, `"radio"`, `"autocomplete"`, `"likert"` | renderer decides by option count |
| `multiChoice` | `"checkboxGroup"`, `"multiSelect"`, `"autocomplete"` | `"checkboxGroup"` |
| `attachment` | `"filePicker"`, `"camera"`, `"signature"` | `"filePicker"` |
| `money` | `"money"` | `"money"` |
| `uri` | `"url"`, `"text"` | `"url"` |

**Rules:**
- A `widgetHint` that is invalid for the item's `dataType` MUST be ignored.
- A renderer that does not support a given hint SHOULD fall back to its default for that `dataType`.
- Display items accept: `"heading"`, `"divider"`, `"banner"`, `"instructions"`. Default is `"instructions"`.

This vocabulary is deliberately **closed** in v1.0. Custom widget hints use the `x-` prefix: `"widgetHint": "x-orgChart"`.

---

## 4. Layout Hints

The `presentation.layout` object controls how an item participates in its parent group's layout.

### On Groups

```json
"presentation": {
  "layout": {
    "flow": "grid",
    "columns": 3,
    "collapsible": true,
    "collapsedByDefault": false,
    "page": "Budget Details"
  }
}
```

| Property | Type | Meaning |
|---|---|---|
| `flow` | `"stack"` \| `"grid"` \| `"inline"` | How children are arranged. `"stack"` = vertical (default). `"grid"` = multi-column grid. `"inline"` = horizontal wrap. |
| `columns` | integer (1–12) | Column count when `flow` is `"grid"`. Default: 1. |
| `collapsible` | boolean | Whether the group can be collapsed. Default: false. |
| `collapsedByDefault` | boolean | Initial collapsed state. Default: false. |
| `page` | string | Page/step label. When `formPresentation.pageMode` is `"wizard"` or `"tabs"`, each group with a `page` value becomes a distinct page. Groups without `page` attach to the previous page. |

### On Fields and Display Items

```json
"presentation": {
  "layout": {
    "colSpan": 2,
    "newRow": true
  }
}
```

| Property | Type | Meaning |
|---|---|---|
| `colSpan` | integer | How many grid columns this item spans. Default: 1. |
| `newRow` | boolean | Force this item to start a new row. Default: false. |

This is enough to express: wizard forms, two-column address sections, full-width "notes" fields in a grid, and collapsible "advanced settings" panels.

---

## 5. Style Hints

Style hints are **semantic tokens only** — never CSS, never hex colors, never font names.

```json
"presentation": {
  "styleHints": {
    "emphasis": "warning",
    "size": "compact"
  }
}
```

| Token | Values | Meaning |
|---|---|---|
| `emphasis` | `"primary"`, `"success"`, `"warning"`, `"danger"`, `"muted"` | Semantic importance/tone. Renderer maps to its own palette. |
| `size` | `"compact"`, `"default"`, `"large"` | Relative sizing. |
| `density` | `"compact"`, `"comfortable"`, `"spacious"` | Form-wide only (on `formPresentation.styleHints`). Spacing density. |

This vocabulary is intentionally tiny. It exists for cases where structural information alone doesn't convey intent — a "warning" banner vs. a regular one, a primary action field vs. secondary ones.

Custom tokens use `x-` prefix: `"x-brand": "premium-tier"`.

---

## 6. Accessibility

The `presentation.accessibility` object provides ARIA-level guidance without requiring renderers to understand ARIA itself.

```json
"presentation": {
  "accessibility": {
    "role": "alert",
    "description": "This total updates automatically as you change line items.",
    "liveRegion": "polite"
  }
}
```

| Property | Type | Meaning |
|---|---|---|
| `role` | string | ARIA role hint. Renderers map to platform equivalent. Suggested values: `"alert"`, `"status"`, `"navigation"`, `"complementary"`, `"region"`. |
| `description` | string | Extended accessible description (supplements `hint` and `description` from Layer 1, which serve as visible text; this is for screen-reader-only context). |
| `liveRegion` | `"off"` \| `"polite"` \| `"assertive"` | For calculated/dynamic fields: how aggressively to announce updates. Default: `"off"`. |

Note: the existing `labels.accessibility` from Layer 1 provides the accessible *label*. The `presentation.accessibility.description` provides the accessible *description* — these are distinct ARIA concepts (`aria-label` vs. `aria-describedby`).

---

## 7. Limitations

This approach **honestly cannot** do the following:

1. **Platform-specific variants.** You cannot say "radio on desktop, dropdown on mobile." One hint, one value. A companion spec could add a `mediaQuery`-keyed map.
2. **Pixel-level layout.** No absolute positioning, no percentage widths beyond column spans, no z-ordering. This is intentional.
3. **Theming and branding.** No colors, fonts, logos, or CSS. A design-system integration layer is out of scope.
4. **Conditional presentation.** You cannot say "show as warning style WHEN total > budget." Layer 2 `relevant`/`readonly` covers visibility and editability; dynamic styling requires a richer model.
5. **Reusable presentation profiles.** You cannot define a "compact mobile" profile and apply it. Each form carries its hints inline.
6. **Rich display templating.** No HTML fragments, no markdown rendering directives, no interpolated display strings.
7. **Animation and transitions.** No page transition styles, no progressive disclosure animations.

For use cases requiring any of the above, a separate **Presentation Document** companion spec (Approach B/C) is the right path. These inline hints serve as sensible defaults that such a spec can override.

---

## 8. Full JSON Example — Budget Form Section

```json
{
  "formspec": "1.0",
  "title": "Project Budget Request",
  "formPresentation": {
    "pageMode": "wizard",
    "labelPosition": "top",
    "styleHints": { "density": "comfortable" }
  },
  "items": [
    {
      "key": "overview",
      "type": "group",
      "label": "Project Overview",
      "presentation": {
        "layout": { "flow": "grid", "columns": 2, "page": "Overview" }
      },
      "items": [
        {
          "key": "projectName",
          "type": "field",
          "dataType": "string",
          "label": "Project Name",
          "presentation": {
            "layout": { "colSpan": 2 },
            "styleHints": { "size": "large" }
          }
        },
        {
          "key": "department",
          "type": "field",
          "dataType": "choice",
          "label": "Department",
          "options": [
            { "value": "eng", "label": "Engineering" },
            { "value": "mktg", "label": "Marketing" },
            { "value": "ops", "label": "Operations" },
            { "value": "hr", "label": "Human Resources" },
            { "value": "finance", "label": "Finance" },
            { "value": "legal", "label": "Legal" }
          ],
          "presentation": {
            "widgetHint": "autocomplete"
          }
        },
        {
          "key": "priority",
          "type": "field",
          "dataType": "choice",
          "label": "Priority",
          "options": [
            { "value": "low", "label": "Low" },
            { "value": "medium", "label": "Medium" },
            { "value": "high", "label": "High" }
          ],
          "presentation": {
            "widgetHint": "radio"
          }
        },
        {
          "key": "justification",
          "type": "field",
          "dataType": "text",
          "label": "Justification",
          "hint": "Explain why this budget is needed.",
          "presentation": {
            "widgetHint": "textarea",
            "layout": { "colSpan": 2 }
          }
        }
      ]
    },
    {
      "key": "lineItems",
      "type": "group",
      "label": "Budget Line Items",
      "presentation": {
        "layout": { "flow": "grid", "columns": 4, "page": "Line Items" }
      },
      "items": [
        {
          "key": "item1Desc",
          "type": "field",
          "dataType": "string",
          "label": "Item Description",
          "presentation": { "layout": { "colSpan": 2 } }
        },
        {
          "key": "item1Qty",
          "type": "field",
          "dataType": "integer",
          "label": "Quantity",
          "presentation": { "widgetHint": "stepper" }
        },
        {
          "key": "item1Cost",
          "type": "field",
          "dataType": "money",
          "label": "Unit Cost",
          "prefix": "$"
        }
      ]
    },
    {
      "key": "summary",
      "type": "group",
      "label": "Review & Submit",
      "presentation": {
        "layout": { "flow": "stack", "page": "Summary" }
      },
      "items": [
        {
          "key": "budgetWarning",
          "type": "display",
          "label": "Budgets over $50,000 require VP approval.",
          "presentation": {
            "widgetHint": "banner",
            "styleHints": { "emphasis": "warning" },
            "accessibility": { "role": "alert" }
          }
        },
        {
          "key": "totalBudget",
          "type": "field",
          "dataType": "money",
          "label": "Total Budget",
          "prefix": "$",
          "presentation": {
            "styleHints": { "emphasis": "primary", "size": "large" },
            "accessibility": {
              "liveRegion": "polite",
              "description": "This total updates automatically as you change line items."
            }
          }
        },
        {
          "key": "attachments",
          "type": "group",
          "label": "Supporting Documents",
          "presentation": {
            "layout": { "collapsible": true, "collapsedByDefault": true }
          },
          "items": [
            {
              "key": "receipt",
              "type": "field",
              "dataType": "attachment",
              "label": "Upload Quote or Receipt",
              "presentation": { "widgetHint": "filePicker" }
            },
            {
              "key": "signature",
              "type": "field",
              "dataType": "attachment",
              "label": "Manager Signature",
              "presentation": { "widgetHint": "signature" }
            }
          ]
        },
        {
          "key": "agree",
          "type": "field",
          "dataType": "boolean",
          "label": "I certify this request is accurate.",
          "presentation": {
            "widgetHint": "checkbox",
            "styleHints": { "emphasis": "primary" }
          }
        }
      ]
    }
  ],
  "binds": [
    {
      "path": "/totalBudget",
      "calculate": "item1Qty * item1Cost",
      "readonly": true
    },
    {
      "path": "/agree",
      "required": true
    }
  ]
}
```

This example demonstrates: wizard paging via `page` on groups, grid layout with `columns` and `colSpan`, widget disambiguation (`autocomplete` vs `radio` for two different choice fields, `stepper` for quantity), semantic styling (`warning` banner, `primary` total), accessibility (`liveRegion` on a calculated field, `role: "alert"` on a warning), collapsible sections, and attachment widget variants (`filePicker` vs `signature`) — all with zero CSS and zero platform coupling.

---

*End of proposal.*
