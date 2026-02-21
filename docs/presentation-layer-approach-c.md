# Approach C: Component Model with Slots

**Formspec v1.0 — Presentation Layer Proposal**

---

## 1. Philosophy

The Definition declares *what* data to collect. Binds declare *when* and *whether*. But neither answers *how* — how fields are spatially arranged, how a 40-field form becomes a navigable wizard, how a summary sidebar floats beside inputs on desktop but collapses below them on mobile.

Hint-based approaches (Approach A) can nudge renderers, but they can't reorganize. Theme maps (Approach B) can style, but they can't restructure. Only a **full component tree** can express:

- **Cross-cutting layouts:** A wizard step that pulls fields from three different groups.
- **Decorative wrapping:** A card around a subset of fields, with a heading that doesn't exist in the data model.
- **Multiplexed views:** The same data rendered as an input form on one page and a read-only summary on another.
- **Presentation-only elements:** Progress bars, dividers, help panels — things with no data identity.

The cost is real: a component document is a second tree to author and maintain. This approach is warranted when forms are complex, when pixel-level layout matters across breakpoints, or when the same Definition must support radically different presentations (e.g., public intake vs. internal review).

For simple forms, renderers SHOULD auto-generate a component tree from the Definition. The component document is an *override*, not a requirement.

---

## 2. Component Vocabulary

Every component is `{"component": "<Name>", ...props}`. Children go in a `children` array. Components that bind to a Definition item carry `"bind": "<itemKey>"`.

### Layout

| Component | Props | Notes |
|-----------|-------|-------|
| **Page** | `title`, `children` | Top-level container. Wizard uses multiple Pages. |
| **Stack** | `direction`: `"vertical"` \| `"horizontal"`, `gap`, `align`, `children` | Flexbox-style stacking. |
| **Grid** | `columns` (int or pattern like `"1fr 2fr"`), `gap`, `children` | CSS-Grid-style layout. |
| **Columns** | `widths` (array of fractions), `gap`, `children` | Shorthand for common multi-column layouts. |
| **Tabs** | `children` (each a **Tab**) | Tab has `label`, `children`. |
| **Wizard** | `children` (each a **Page**), `showProgress` | Sequential step navigation. |
| **Accordion** | `children` (each a **Collapsible**) | Mutex or independent expand. |
| **Spacer** | `size` | Empty space. |

### Input

Input components always carry `bind` linking to a Definition field key. The renderer resolves `label`, `hint`, `description`, `required`, `readonly`, and validation errors from the Definition and Binds — the component does NOT redeclare them unless overriding.

| Component | Props | Binds to dataType |
|-----------|-------|-------------------|
| **TextInput** | `placeholder`, `maxLines` | string, text |
| **NumberInput** | `step`, `min`, `max` | integer, decimal |
| **DatePicker** | `format`, `minDate`, `maxDate` | date, dateTime, time |
| **Select** | `searchable`, `placeholder` | choice |
| **RadioGroup** | `layout`: `"vertical"` \| `"horizontal"` | choice |
| **CheckboxGroup** | `layout`, `selectAll` | multiChoice |
| **Toggle** | `onLabel`, `offLabel` | boolean |
| **FileUpload** | `accept`, `maxSize`, `multiple` | attachment |
| **MoneyInput** | `currencyDisplay` | money |
| **Slider** | `min`, `max`, `step`, `showValue` | integer, decimal |
| **Rating** | `max`, `icon` | integer |

### Display

| Component | Props | Notes |
|-----------|-------|-------|
| **Heading** | `level` (1–6), `text` | Presentation-only. |
| **Text** | `text`, `format`: `"plain"` \| `"markdown"` | Static or dynamic via FEL. |
| **Divider** | `label` | Horizontal rule. |
| **Alert** | `severity`: `"info"` \| `"warning"` \| `"error"`, `text` | Callout box. |
| **Badge** | `text`, `variant` | Inline status label. |
| **ProgressBar** | `value` (FEL expression), `max` | Visual progress. |
| **Summary** | `items` (array of `{label, value}`), `direction` | Key-value display; `value` can be FEL. |
| **DataTable** | `bind` (repeatable group key), `columns` | Tabular view of repeat data. |

### Container

| Component | Props | Notes |
|-----------|-------|-------|
| **Card** | `title`, `subtitle`, `children` | Bordered surface. |
| **Panel** | `position`: `"inline"` \| `"sidebar"`, `children` | Structural region. |
| **Collapsible** | `title`, `defaultOpen`, `children` | Expandable section. |
| **Modal** | `trigger`, `title`, `children` | Dialog overlay. |
| **Popover** | `trigger`, `children` | Contextual popup. |
| **ConditionalGroup** | `when` (FEL), `children`, `fallback` | Presentation conditional. |

---

## 3. Slot Binding

The `bind` property is the slot mechanism. It links a component to a Definition item by its globally unique `key`.

```json
{"component": "TextInput", "bind": "entity_name", "placeholder": "Enter name"}
```

**Data flow rules:**

1. **Label resolution:** The renderer reads `label` from the Definition item. The component MAY override with `"labelOverride": "..."`.
2. **Error display:** Constraint violations from Binds are routed to whichever component binds that key. The component doesn't define validation — Binds do.
3. **Required/readonly:** Resolved from Binds at runtime. The component can set `"hideLabel": true` or `"compact": true` but cannot override behavioral properties.
4. **Prefix/suffix:** Inherited from the Definition field. Component may override with `"prefixOverride"` / `"suffixOverride"`.
5. **Unbound items:** Any Definition item not referenced by `bind` in the component tree is **not rendered**. This is intentional — it lets a presentation show a subset of fields. Tooling SHOULD warn about unbound required fields.
6. **Repeatable groups:** Binding to a repeatable group key makes the component repeat. A `DataTable` bound to a repeatable group renders its children as columns.

---

## 4. Composition & Reuse

The top-level `components` registry defines reusable fragments:

```json
{
  "components": {
    "AddressBlock": {
      "params": ["prefix"],
      "tree": {
        "component": "Stack",
        "direction": "vertical",
        "gap": "sm",
        "children": [
          {"component": "TextInput", "bind": "{prefix}_street"},
          {"component": "Grid", "columns": 3, "children": [
            {"component": "TextInput", "bind": "{prefix}_city"},
            {"component": "Select", "bind": "{prefix}_state"},
            {"component": "TextInput", "bind": "{prefix}_zip"}
          ]}
        ]
      }
    }
  }
}
```

Usage: `{"component": "AddressBlock", "params": {"prefix": "home"}}`

Parameters use simple string interpolation in `bind` values only — this is deliberately limited to prevent the component model from becoming a programming language.

---

## 5. Conditional Presentation

`when` uses FEL expressions to control **visual** display, distinct from Bind `relevant` which controls **data** inclusion:

```json
{
  "component": "ConditionalGroup",
  "when": "$expense_type = 'travel'",
  "children": [
    {"component": "Alert", "severity": "info", "text": "Attach receipts for travel over $50."}
  ],
  "fallback": [
    {"component": "Text", "text": "No additional documentation required."}
  ]
}
```

Any component can carry a `when` prop. If the expression evaluates to `false`, the component (and its children) is removed from the rendered tree. `ConditionalGroup` adds `fallback` for if/else patterns.

**Key distinction:** A Bind `relevant: false` removes the field from the *data model* (it won't appear in submission). A component `when: false` hides a *visual element* while the data remains. A help panel shown conditionally is purely presentational — `when` is the right tool. A field that shouldn't exist unless another field is answered — that's `relevant`.

---

## 6. Responsive Variants

The top-level `breakpoints` defines named size thresholds. Any component can provide per-breakpoint overrides via `responsive`:

```json
{
  "breakpoints": {"sm": 640, "md": 1024, "lg": 1440},
  "tree": {
    "component": "Grid",
    "columns": "1fr 1fr",
    "responsive": {
      "sm": {"columns": "1fr"}
    }
  }
}
```

Overrides are shallow-merged onto the component's props at the matching breakpoint (mobile-first: `sm` applies to `sm` and below). For wholesale tree changes, `responsive` can include a replacement `children` array — but this should be rare. Breakpoint-level `children` replacement is the escape hatch, not the norm.

---

## 7. Theming

Design tokens live in `tokens` at the document root:

```json
{
  "tokens": {
    "colorPrimary": "#1e40af",
    "colorError": "#dc2626",
    "fontFamily": "Inter, system-ui, sans-serif",
    "borderRadius": "8px",
    "spacingSm": "8px",
    "spacingMd": "16px",
    "spacingLg": "24px"
  }
}
```

Tokens are referenced in component props as `"$token.spacingMd"`. Individual components can override via a `style` prop containing token-level overrides:

```json
{"component": "Card", "style": {"borderRadius": "0px"}, "children": [...]}
```

Tokens are deliberately limited to a flat map of scalar values. No nesting, no computation. Theming is cosmetic — the component tree handles structural variation.

---

## 8. Document Structure

```json
{
  "url": "https://example.com/presentations/budget-wizard-v2",
  "version": "1.0",
  "targetDefinition": "https://example.com/definitions/budget-form",
  "breakpoints": {"sm": 640, "md": 1024},
  "tokens": { ... },
  "components": { ... },
  "tree": { ... }
}
```

- `url`: Unique identifier for this presentation document.
- `version`: Formspec presentation schema version.
- `targetDefinition`: The Definition this presentation is designed for. Renderers MUST validate that all `bind` references resolve to items in this Definition.
- `breakpoints`: Named width thresholds.
- `tokens`: Design token map.
- `components`: Reusable component registry.
- `tree`: The root component (typically a `Wizard`, `Stack`, or `Tabs`).

---

## 9. Limitations

**Complexity.** This is a second document to author. For a 5-field feedback form, it's overkill. Renderers MUST support auto-layout from bare Definitions.

**Tooling dependency.** Authoring component trees by hand is error-prone. This approach practically requires a visual builder. Without one, adoption will suffer.

**Drift risk.** When the Definition adds fields, the component document must be updated. Unbound fields are silently invisible — a dangerous default without CI validation.

**Learning curve.** Authors must understand the Definition, Binds, AND the component vocabulary. Three mental models.

**Turing-completeness creep.** FEL in `when`, string interpolation in params, `responsive` children swaps — each is small, but combined they approach a layout programming language. We must resist adding loops, variables, or further computation. The boundary is: FEL evaluates to a boolean or string; components compose; that's it.

**Portability tension.** Components like `Modal` and `Popover` assume a graphical, pointer-capable environment. Voice interfaces and CLI renderers would ignore large parts of the tree. The vocabulary is implicitly web/mobile-biased.

---

## 10. Full Example: Budget Request Wizard

Definition fields assumed: `department` (choice), `fiscal_year` (choice), `project_name` (string), `budget_amount` (money), `justification` (text), `expense_type` (choice), `travel_destination` (string), `start_date` (date), `end_date` (date), `approver_email` (string), `attachments` (attachment), `is_urgent` (boolean).

```json
{
  "url": "https://acme.org/presentations/budget-wizard",
  "version": "1.0",
  "targetDefinition": "https://acme.org/definitions/budget-request",
  "breakpoints": {"sm": 640, "md": 1024},
  "tokens": {
    "colorPrimary": "#1e40af",
    "colorSurface": "#f8fafc",
    "borderRadius": "8px",
    "spacingMd": "16px"
  },
  "components": {
    "LiveSummary": {
      "params": [],
      "tree": {
        "component": "Card",
        "title": "Request Summary",
        "style": {"background": "$token.colorSurface"},
        "children": [
          {"component": "Summary", "items": [
            {"label": "Department", "value": "$department"},
            {"label": "Project", "value": "$project_name"},
            {"label": "Amount", "value": "$budget_amount"},
            {"label": "Period", "value": "concat($start_date, ' – ', $end_date)"}
          ]},
          {"component": "Divider"},
          {"component": "ProgressBar", "value": "wizardProgress()", "max": 100}
        ]
      }
    }
  },
  "tree": {
    "component": "Columns",
    "widths": ["2fr", "1fr"],
    "gap": "$token.spacingMd",
    "responsive": {
      "sm": {"widths": ["1fr"], "children": "$onlyFirstChild"}
    },
    "children": [
      {
        "component": "Wizard",
        "showProgress": true,
        "children": [
          {
            "component": "Page",
            "title": "Project Info",
            "children": [
              {"component": "Heading", "level": 2, "text": "Project Information"},
              {"component": "Grid", "columns": "1fr 1fr", "gap": "$token.spacingMd",
                "responsive": {"sm": {"columns": "1fr"}},
                "children": [
                  {"component": "Select", "bind": "department", "searchable": true},
                  {"component": "Select", "bind": "fiscal_year"}
                ]
              },
              {"component": "TextInput", "bind": "project_name", "placeholder": "e.g., Q3 Marketing Campaign"}
            ]
          },
          {
            "component": "Page",
            "title": "Budget Details",
            "children": [
              {"component": "Heading", "level": 2, "text": "Budget Details"},
              {"component": "MoneyInput", "bind": "budget_amount"},
              {"component": "RadioGroup", "bind": "expense_type", "layout": "horizontal"},
              {
                "component": "ConditionalGroup",
                "when": "$expense_type = 'travel'",
                "children": [
                  {"component": "Alert", "severity": "info", "text": "Travel requests over $5,000 require VP approval."},
                  {"component": "TextInput", "bind": "travel_destination"},
                  {"component": "Grid", "columns": "1fr 1fr", "gap": "$token.spacingMd",
                    "responsive": {"sm": {"columns": "1fr"}},
                    "children": [
                      {"component": "DatePicker", "bind": "start_date"},
                      {"component": "DatePicker", "bind": "end_date"}
                    ]
                  }
                ]
              },
              {"component": "TextInput", "bind": "justification", "maxLines": 5}
            ]
          },
          {
            "component": "Page",
            "title": "Review & Submit",
            "children": [
              {"component": "Heading", "level": 2, "text": "Review & Submit"},
              {"component": "TextInput", "bind": "approver_email", "placeholder": "approver@acme.org"},
              {"component": "Toggle", "bind": "is_urgent", "onLabel": "Urgent", "offLabel": "Normal"},
              {"component": "FileUpload", "bind": "attachments", "accept": ".pdf,.xlsx", "multiple": true},
              {"component": "Divider"},
              {"component": "LiveSummary"}
            ]
          }
        ]
      },
      {
        "component": "Panel",
        "position": "sidebar",
        "children": [
          {"component": "LiveSummary"},
          {
            "component": "Collapsible",
            "title": "Need Help?",
            "defaultOpen": false,
            "when": "$budget_amount > 10000",
            "children": [
              {"component": "Text", "format": "markdown", "text": "Requests over **$10,000** require additional documentation. [See policy](https://acme.org/policy)."}
            ]
          }
        ]
      }
    ]
  }
}
```

**What this achieves:** On desktop (`md`+), the wizard occupies the left two-thirds with a persistent summary sidebar on the right. The help panel appears only when the budget exceeds $10,000. Travel-specific fields appear only when `expense_type` is "travel". On mobile (`sm`), the layout collapses to a single column — the sidebar disappears, but `LiveSummary` is reused inline on the final review page. The `LiveSummary` custom component is defined once, used twice.

This is what a component model makes possible: presentation structures that are independent of, but bound to, the data they serve.
