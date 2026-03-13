# Investigation: How Do the Three Page/Wizard Documents Interconnect?

A user opens the studio and wants a 3-step wizard form. Three separate JSON documents — definition, theme, component — all have page/wizard concepts, each with different schemas, different semantics, and different levels of control. This investigation traces exactly how they wire together and what happens when you edit them in parallel.

## What Each Document Owns

### Definition — "I want a wizard"

The definition carries two advisory hints. Neither participates in the processing model. FEL can't see them. They exist purely as suggestions to renderers.

**`formPresentation.pageMode`** on the definition root:
```json
{ "formPresentation": { "pageMode": "wizard" } }
```
Three values: `"single"` (default), `"wizard"`, `"tabs"`. A processor that doesn't support wizards ignores this and renders flat. This is cascade level -1 — the absolute lowest priority signal in the system.

**`presentation.layout.page`** on group items:
```json
{ "key": "personal", "type": "group", "presentation": { "layout": { "page": "Step 1" } } }
```
A free-form string label. Groups sharing the same `page` value render together. Groups without `page` attach to the preceding page. This is how a definition author sketches page structure without creating a separate document.

**Spec refs:** `specs/core/spec.md` §4.1.1, §4.2.5.2. Schema: `schemas/definition.schema.json` lines 330-343 (formPresentation), 1580-1589 (layout.page).

### Theme — "Here's the page structure and grid layout"

When the theme's `pages` array exists, it **replaces** the definition's page grouping entirely. The theme doesn't consult `layout.page` strings — it assigns items to pages by key.

```json
{
  "pages": [
    {
      "id": "info",
      "title": "Project Information",
      "regions": [
        { "key": "projectName", "span": 8 },
        { "key": "projectCode", "span": 4 }
      ]
    },
    {
      "id": "review",
      "title": "Review & Submit",
      "regions": [
        { "key": "certify", "span": 12 }
      ]
    }
  ],
  "breakpoints": { "sm": 576, "md": 768, "lg": 1024 }
}
```

Each `Page` has `id`, `title`, optional `description`, and `regions`. Each `Region` assigns a definition item (by `key`) to a position in a 12-column grid (`span`, `start`, plus `responsive` overrides per breakpoint). A region referencing a group key includes the group's entire subtree — inner layout stays under the group's own Tier 1 `presentation.layout`.

Important edge cases:
- Items not referenced by any region render after all pages in default order
- Unknown region keys → warn, don't fail
- `title` is required on Page (schema enforces this)
- When `pages` is absent or empty → **fall back to Tier 1's `formPresentation.pageMode`** (theme spec §6.5)

**Spec refs:** `specs/theme/theme-spec.md` §6 (full page layout system), §6.5 (fallback). Schema: `schemas/theme.schema.json` — `Page` def (lines 598-649), `Region` def (lines 650-739).

### Component — "Here's exactly how to render the wizard"

A `Wizard` component with `Page` children is the highest-fidelity representation. It **completely replaces** the theme's page layout for any items it binds. The component tree is an explicit render tree — no cascade resolution, no region assignment, just "render this component here."

```json
{
  "component": "Wizard",
  "showProgress": true,
  "allowSkip": false,
  "children": [
    {
      "component": "Page",
      "title": "Step 1: Basics",
      "children": [
        { "component": "TextInput", "bind": "name" },
        { "component": "DatePicker", "bind": "startDate" }
      ]
    },
    {
      "component": "Page",
      "title": "Step 2: Review",
      "children": [
        { "component": "Summary" },
        { "component": "Signature", "bind": "approverSig" }
      ]
    }
  ]
}
```

This adds capabilities that neither Tier 1 nor Tier 2 can express:
- `showProgress` — render a step counter/bar/breadcrumb
- `allowSkip` — allow non-linear step navigation
- Per-page validation gating — the Wizard validates the current page's bound items before allowing forward navigation
- Arbitrary component subtrees — each page can contain any mix of components, not just flat field references

The `Tabs` component is the tabbed alternative (progressive level, falls back to `Stack`). Same structural pattern — `Page` children — but different navigation semantics.

**Spec refs:** `specs/component/component-spec.md` §5.1 (Page), §5.4 (Wizard), §5.7 (Tabs), Appendix A (full budget wizard example). Schema: `schemas/component.schema.json` — Wizard (lines 426-462), Page (lines 310-341), Tabs (lines 872-913).

## How Override Works When Multiple Tiers Are Present

```
Tier 3 component tree  ──  wins absolutely. If a Wizard exists, theme pages are
                            ignored for any items the component tree binds.

Tier 2 theme pages     ──  wins over Tier 1. If theme.pages exists, definition's
                            layout.page strings and pageMode are superseded.

Tier 1 definition      ──  baseline. Only consulted when no theme pages and
                            no component wizard exist.
```

This is not a merge — it's a full replacement at each level. If the theme defines pages, Tier 1's page grouping is completely ignored (not blended). If a component Wizard exists, the theme's pages are completely ignored (not blended).

The one exception: the presentation cascade (defaults → selectors → item overrides for styling) still applies regardless of which tier controls page structure. A field can get its `widget` from theme selectors even if the page layout comes from a Tier 3 Wizard.

## What Happens When You Edit Them in Parallel

This is where things get interesting for the studio. A user could have all three documents populated simultaneously.

### Scenario: Theme pages exist, user adds a Wizard component

The Wizard takes over. Theme pages become dead data — they're still in the theme document but no renderer will consult them. The studio should either:
- Warn that theme pages are now shadowed
- Offer to delete the theme pages (they serve no purpose)
- Or, treat the Wizard as auto-generated from theme pages and keep them in sync

### Scenario: User adds a page in the theme, but definition says `pageMode: "single"`

Technically fine — the theme overrides the definition. But confusing. A renderer processing only the definition (without the theme) would render a single-page form. The studio should probably auto-set `formPresentation.pageMode: "wizard"` when theme pages are added, so the definition's intent matches reality.

### Scenario: User renames a field key in the definition

Theme regions reference items by `key`. If the user renames `projectName` to `name`, the theme region still says `{ "key": "projectName" }` — now pointing at nothing. The studio needs cross-document key tracking: when a definition key changes, propagate to theme regions (and component binds).

### Scenario: User deletes a field that's assigned to a theme region

The region becomes orphaned. Spec says warn, don't fail. The studio should surface this — either in the PageDefinitions pillar ("region references unknown field") or as a project-level diagnostic.

### Scenario: User reorders definition items

No effect on theme pages — regions reference by key, not position. This is by design. But the canvas view might look different from the page view, which could confuse users.

## The Same Concept at Three Fidelity Levels

| | Tier 1 (Definition) | Tier 2 (Theme) | Tier 3 (Component) |
|---|---|---|---|
| **What is a "page"?** | A string label on groups | A structural object with id, title, regions | A component node with arbitrary children |
| **Layout control** | None — just groups items | 12-column grid with responsive breakpoints | Full component tree |
| **Navigation behavior** | Implied by `pageMode` enum | Implied by page array order | Explicit: `showProgress`, `allowSkip`, validation gating |
| **How items are assigned** | `presentation.layout.page` string on groups | `Region.key` referencing any definition item | `bind` attribute on leaf components |
| **Who creates this** | Form definition author | Theme designer | Component developer / power user |
| **Editing surface in studio** | Settings dialog | Theme workspace → PageDefinitions pillar | Component Tree sidebar |

## Cross-Document Data Flow

When all three documents exist for the same form, the data flows like this:

```
Definition                    Theme                         Component
──────────                    ─────                         ─────────
items: [                      pages: [                      { Wizard,
  { key: "name", ... },         { id: "step1",               children: [
  { key: "age", ... },           regions: [                    { Page, title: "...",
  { key: "email", ... }            { key: "name", span: 8 },    children: [
]                                   { key: "age", span: 4 }       { TextInput, bind: "name" },
                                  ] },                             { NumberInput, bind: "age" }
formPresentation:               { id: "step2",                   ] },
  pageMode: "wizard"              regions: [                    { Page, title: "...",
                                    { key: "email", span: 12 }    children: [
group[0].presentation:            ] }                              { TextInput, bind: "email" }
  layout:                       ]                                ] }
    page: "Step 1"                                             ] }
                              breakpoints:
                                { sm: 576, md: 768 }
```

All three reference the same items (`name`, `age`, `email`) but through different mechanisms (group containment, region keys, component binds). They must stay in sync, and the studio is the only place that can enforce that.

## What We Need to Decide

1. **Single editing surface or three?** The PageDefinitions pillar is Tier 2 only. Should it be aware of Tier 1 hints and Tier 3 components, or should we build a cross-tier "Pages" workspace?

2. **Auto-sync between tiers.** When a user adds theme pages, should we auto-set `formPresentation.pageMode`? When they add a Wizard component, should we auto-clear theme pages? Or is explicit user action required?

3. **Key rename propagation.** Definition key renames need to ripple into theme regions and component binds. This is a general cross-document problem, not wizard-specific, but pages make it visible.

4. **Conflict diagnostics.** What tier conflicts should the studio flag? Dead theme pages shadowed by a component Wizard? Orphaned regions pointing at deleted items? `pageMode: "single"` contradicted by theme pages?

5. **Preview fidelity.** The preview currently renders Tier 1 + Tier 2 (FormEngine + webcomponent). If Tier 3 components exist, should the preview use those? If not, the preview shows a different wizard than what the component tree describes.

## File Index

### Schemas
- `schemas/definition.schema.json` — `formPresentation` (lines 330-343), `Presentation.layout.page` (lines 1580-1589)
- `schemas/theme.schema.json` — `pages` (lines 205-233), `Page` (lines 598-649), `Region` (lines 650-739), `Breakpoints` (lines 740-759)
- `schemas/component.schema.json` — `Wizard` (lines 426-462), `Page` (lines 310-341), `Tabs` (lines 872-913)
- `schemas/studio-commands.schema.json` — `definition.setFormPresentation`, `theme.addPage`/etc, `component.setWizardProperty`

### Canonical Specs
- `specs/core/spec.md` §4.1.1 (formPresentation), §4.2.5.2 (layout.page), §4.2.5.5 (precedence)
- `specs/theme/theme-spec.md` §6 (Page Layout System), §6.5 (Tier 1 fallback), §7.3 (processing model step 5)
- `specs/component/component-spec.md` §5.1 (Page), §5.4 (Wizard), §5.7 (Tabs), Appendix A (budget wizard)

### Studio Implementation
- `packages/formspec-studio/src/workspaces/theme/PageDefinitions.tsx` — Tier 2 page editor
- `packages/formspec-studio/src/workspaces/theme/ScreenSizes.tsx` — Tier 2 breakpoint editor
- `packages/formspec-studio-core/src/handlers/theme.ts` — page/region command handlers
- `packages/formspec-studio/src/components/blueprint/SettingsSection.tsx` — formPresentation lives here
- `packages/formspec-studio/src/workspaces/preview/PreviewTab.tsx` — preview rendering
