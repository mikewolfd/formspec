# Formspec Studio — Visual Design Specification

## Audience & Context

Primary users are **federal government employees** — grants program officers, compliance staff, and agency IT teams — who configure forms for public-facing programs. They work in institutional environments with mandated accessibility, often on standard-issue laptops with 1366×768 or 1920×1080 displays.

The tool must feel **modern, sharp, and trustworthy** — not consumer-playful, not corporate-bland. Think: the confidence of Bloomberg Terminal meets the clarity of Linear. Government users deserve software that respects their expertise rather than dumbing things down.

---

## Design Direction: "Federal Precision"

A dark professional workspace with controlled warmth. Every pixel earns its place.

**Tone keywords:** authoritative, precise, modern, warm-not-cold, tool-not-toy

**Inspirations:**
- Bloomberg Terminal — information density done right, dark UI that signals "pro tool"
- Linear — modern project management with sharp typography and purposeful space
- Figma — three-panel workspace layout, contextual properties, clean iconography
- VS Code — proven dark editor palette that millions use daily without fatigue

**What this is NOT:**
- Not a consumer SaaS landing page (no gradients-for-gradients-sake, no rounded-everything)
- Not brutalist (gov users need clarity, not rawness)
- Not "government ugly" — the entire point is proving gov tools can look as good as anything in the private sector

---

## Color System

### Dark theme (primary — ship this first)

```
Background hierarchy (darkest → lightest):
  --bg-0: #0E1117          Canvas / deepest background
  --bg-1: #161B22          Panel backgrounds (sidebar, inspector)
  --bg-2: #1C2128          Elevated surfaces (cards, dropdowns)
  --bg-3: #252C35          Hover states, toggle backgrounds
  --bg-active: #2D3540     Active/pressed states

Text hierarchy:
  --text-0: #E6EDF3        Primary text (headings, labels, selected items)
  --text-1: #9BA4AE        Secondary text (descriptions, metadata)
  --text-2: #545D68        Tertiary text (placeholders, disabled, timestamps)
  --text-3: #353C45        Ghost text (hints, decorative)

Primary accent — Warm Amber:
  --accent: #D4A34A        Primary actions, active tab indicators, focus rings
  --accent-hover: #E0B45C  Hover state for accent elements
  --accent-dim: #8B6E35    Muted accent (inactive indicators, subtle badges)
  --accent-bg: rgba(212, 163, 74, 0.08)   Selection backgrounds
  --accent-bg-strong: rgba(212, 163, 74, 0.14)  Active tab backgrounds

Semantic colors:
  --success: #3FB950       Valid, configured, passing
  --warning: #D29922       Caution, draft status, info-level diagnostics
  --error:   #DA3633       Errors, blocking issues, destructive actions
  --info:    #58A6FF       Informational, links, secondary callouts

Borders:
  --border-0: #1B2028      Subtle dividers (between panels)
  --border-1: #262E38      Standard borders (inputs, cards)
  --border-2: #353D48      Emphasized borders (hover states)
  --border-focus: #D4A34A  Focus ring color (matches accent)
```

### Why warm amber, not blue?

Government tools are drowning in blue. Every agency portal, every .gov site, every USWDS implementation is blue-on-white. Amber signals "this is a *builder* tool, not a public-facing form." It creates psychological separation: you're backstage, crafting the experience. The warmth also reduces eye strain in extended dark-UI sessions.

### Light theme (future — Phase 2+)

Not specified here. When added, invert the background hierarchy to white/gray, keep amber accent, darken text colors. The accent should remain amber — it works on both light and dark grounds.

---

## Typography

### Font stack

```
Display / Branding:    'Fraunces', Georgia, serif
  — Variable serif with optical size axis. Used ONLY for the Studio wordmark
    and the form title in the tree header. Its italic gives "Studio" character.

UI / Body:             'Plus Jakarta Sans', system-ui, -apple-system, sans-serif
  — Geometric sans with friendly but professional personality. Superior
    readability at small sizes. Weights: 400 (body), 500 (labels), 600 (emphasis),
    700 (headings).

Code / Data:           'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace
  — For field keys, FEL expressions, JSON editor, diagnostic paths.
    Weights: 400 (body), 500 (emphasis).
```

### Type scale

```
Root:                 13px / 1.5 line-height (base for all UI text)
Form title (tree):    17px Fraunces Medium, -0.02em tracking
Section headings:     10.5px Plus Jakarta 600, uppercase, 0.06em tracking
Tree node labels:     13px Plus Jakarta 500
Tree node keys:       10px JetBrains Mono 400 (revealed on hover, 70% opacity)
Property labels:      11.5px Plus Jakarta 500, --text-1 color
Property inputs:      12.5px Plus Jakarta 400
Badges (data types):  10px JetBrains Mono 400
Sidebar tabs:         12.5px Plus Jakarta 500
Inspector tabs:       11.5px Plus Jakarta 500
JSON editor:          12.5px JetBrains Mono 400, 1.6 line-height
Toast messages:       12.5px Plus Jakarta 500
Keyboard hints:       10.5px JetBrains Mono 400, --text-3 color
```

### Typography rules

1. **Never use Inter, Roboto, Arial, or system defaults** as primary. The font stack falls back to system fonts, but the loaded fonts must render first.
2. **Fraunces is display-only.** Never use it for body text, labels, or inputs.
3. **All FEL expressions, field keys, JSON, and technical paths use monospace.** No exceptions.
4. **Section headings are always uppercase with letter-spacing.** This creates a clear visual break between property groups without needing heavy dividers.
5. **Line-height 1.5 for all body text.** Tighter (1.2–1.3) only for headings.

---

## Layout

### Three-panel workspace

```
┌─────────────────────────────────────────────────────────────────────┐
│ Topbar (50px fixed)                                                 │
│ [Brand] ──────── [Form Title · v0.1.0 · draft] ──────── [Actions]  │
├──────────┬──────────────────────────────────┬───────────────────────┤
│ Sidebar  │          Editor                  │      Inspector        │
│ (200px)  │          (flex: 1)               │      (340px)          │
│          │                                  │                       │
│ ◆ Defn   │  [Guided] [JSON]                │  [Props|Preview|Diag] │
│ ◇ Comp   │                                  │                       │
│ ◈ Theme  │  Tree view or JSON editor        │  Context-sensitive    │
│ ⬡ Map    │  centered, max-width 720px       │  panel content        │
│ ▢ Reg    │                                  │                       │
│ ▤ Log    │                                  │                       │
│          │                                  │                       │
│ ──────── │                                  │                       │
│ Shortcuts│                                  │                       │
└──────────┴──────────────────────────────────┴───────────────────────┘
```

**Minimum supported width:** 1280px (most gov-issue laptops are 1366+)
**Optimal width:** 1440–1920px
**Below 1280px:** Inspector collapses to an overlay panel triggered by button

### Panel specifications

| Panel | Width | Background | Border |
|-------|-------|-----------|--------|
| Sidebar | 200px fixed | --bg-1 | right: --border-0 |
| Editor | flex: 1 | --bg-0 | none |
| Inspector | 340px fixed | --bg-1 | left: --border-0 |
| Topbar | 100% × 50px | --bg-1 | bottom: --border-0 |

### Sidebar anatomy

```
┌──────────────────┐
│ ◆ Definition     │ ← Active: --accent-bg-strong bg, --accent text,
│                  │   2px left accent border
│ ◇ Component   —  │ ← Inactive unconfigured: --text-1, "—" status
│ ◈ Theme       —  │
│ ⬡ Mapping     —  │
│ ▢ Registry    —  │
│ ▤ Changelog   —  │
│                  │
│ ◇ Component   ✓  │ ← Configured: "✓" in --success color
│                  │
│──────────────────│
│ Ctrl+S Export    │ ← Keyboard hints in --text-3 monospace
│ Ctrl+I Import    │
└──────────────────┘

Tab specs:
  Padding: 8px 12px
  Gap between icon and label: 10px
  Icon: 14px, 18px wide (centered)
  Border-radius: 6px
  Hover: --bg-3 background
  Active: --accent-bg-strong bg, --accent color, 2px left border
```

### Inspector tabs

```
┌──────────┬──────────┬──────────────┐
│Properties│ Preview  │ Diagnostics 3│
└──────────┴──────────┴──────────────┘

  Active tab: --text-0, 1px --accent bottom border
  Inactive: --text-2
  Badge (diagnostic count): --error bg, white text, pill shape, 10px font
```

---

## Tree Editor

The tree is the primary interaction surface. It must feel fast, scannable, and forgiving.

### Node anatomy

```
┌──────────────────────────────────────────────────────────────────┐
│ [▸] ● Label Text                          string  *   ↑  ↓  ×  │
│ tog dot label                             badge  bind  actions  │
└──────────────────────────────────────────────────────────────────┘

Default state:
  - Toggle arrow (groups only): 18×18px, --text-2, rotates 90° when expanded
  - Type dot: 8×8px circle, color by type (field: amber, group: blue, display: gray)
  - Label: 13px Plus Jakarta 500, --text-0
  - Key: 10px JetBrains Mono — HIDDEN by default, revealed on hover/select
  - Badge: 10px JetBrains Mono, --bg-3 background, type-specific color
  - Bind indicators: tiny symbols (⚡ relevant, * required, ƒ calculate, ✓ constraint)
  - Actions (↑ ↓ ×): HIDDEN by default, revealed on hover

Hover state:
  - Background: --bg-2
  - Key text fades in (opacity 0 → 0.7, max-width 0 → 150px, 150ms ease)
  - Actions fade in (opacity 0 → 1, 150ms)

Selected state:
  - Background: --accent-bg
  - Left border: 2px solid --accent (box-shadow inset)
  - Key text visible
  - Actions visible

Spacing:
  - Node height: 34px min
  - Padding: 6px 12px
  - Depth indentation: 24px per level
  - Gap between elements: 8px
```

### Node type colors

```
Field:   #D4A34A (amber — matches accent, these are the primary objects)
Group:   #5A8FBB (steel blue — containers, structural)
Display: #706C68 (warm gray — secondary, informational)
Root:    #D4A34A (amber, 10×10px dot — slightly larger to signal hierarchy)
```

### Data type badge colors

Use subtle, muted tones so badges don't compete with labels:

```
string/text:     inherits default (--text-1 on --bg-3)
integer/decimal/number: #5AAFBB (teal)
boolean:         #5FAF5F (green)
date/dateTime/time: #C47AB0 (soft purple)
choice/multiChoice: #D48A4A (warm orange)
money:           #5FAF5F (green, same as boolean — currency is a value type)
uri:             #5ABBB0 (teal-cyan)
attachment:      #706C68 (gray)
```

### Depth guide lines

Subtle vertical lines at each depth level to visually connect parent-child relationships:

```
  ● Basic Information
  │
  │  ● Full Name           string  *
  │  ● Email Address       string
  │  + Add Item
  + Add Item
```

Implementation: `::before` pseudo-element on nodes with `data-depth >= 1`. Width: 1px, color: --border-0. Position: absolute, aligned to parent's indent column.

### Add Item interaction

```
Click "+ Add Item" →

┌─────────────────────────┐
│ ◆ Field                 │  ← Amber icon
│   Data input (text, ...) │
│─────────────────────────│
│ ▣ Group                 │  ← Blue icon
│   Container for fields   │
│─────────────────────────│
│ ◉ Display               │  ← Gray icon
│   Read-only text         │
└─────────────────────────┘

  Background: --bg-2
  Border: 1px solid --border-1
  Border-radius: 10px
  Shadow: 0 8px 32px rgba(0,0,0,0.4)
  Animation: fade in + slight upward shift (150ms cubic-bezier)
  Min-width: 220px
  Option padding: 8px 10px
  Option hover: --bg-hover
```

### Tree header (root node)

```
● My Form                                    my-form · v0.1.0
──────────────────────────────────────────────────────────────

  Title: 17px Fraunces 500, --text-0
  Meta: 10.5px JetBrains Mono, --text-2, right-aligned
  Separator: 1px --border-0 below header
  Root dot: 10×10px --accent
  Clickable (selects root, shows form metadata properties)
```

---

## Property Panel

Context-sensitive editor in the Inspector's "Properties" tab. Content changes based on what's selected in the tree.

### Empty state

```
        Select an item to edit
        its properties

  Text: 12.5px, --text-2, centered, 32px vertical padding
```

### When a node is selected

```
● Field                              ← Type header
─────────────────────────────────────

IDENTITY                             ← Section title (uppercase, --text-2)
Key          [fullName           ]
Label        [Full Name          ]

DATA
Data Type    [string          ▾  ]
Placeholder  [                   ]

BEHAVIOR
Relevant     [                   ]   placeholder: "FEL expression"
Required     [true()             ]   monospace input
Read Only    [                   ]
Calculate    [                   ]

VALIDATION
Constraint   [                   ]   monospace input
Message      [                   ]
```

### Input styling

```
All inputs:
  Background: --bg-2
  Border: 1px solid --border-1
  Border-radius: 4px
  Padding: 6px 8px
  Font: 12.5px Plus Jakarta Sans (or JetBrains Mono for FEL fields)
  Color: --text-0
  Focus: border-color → --accent
  Placeholder: --text-3

Select dropdowns:
  Same as inputs + custom chevron SVG right-aligned
  appearance: none

Checkboxes:
  accent-color: --accent
  16×16px

Textareas:
  Same as inputs, resize: vertical, min-height 64px
```

### Options editor (for choice/multiChoice fields)

```
OPTIONS
[opt1     ] [Option 1     ] [×]
[opt2     ] [Option 2     ] [×]
+ Add Option

  Two inline text inputs per row (value + label), 4px gap
  Delete button: tree-action danger style
  Add button: dashed border, --text-2, hover → --accent
```

### Section titles

```
  Font: 10.5px Plus Jakarta 600
  Text-transform: uppercase
  Letter-spacing: 0.06em
  Color: --text-2
  Margin-bottom: 8px
  Padding-top: 4px
```

---

## JSON Editor

Full JSON editing mode for any artifact. Toggled via the Guided/JSON mode switcher in the editor toolbar.

```
┌──────────────────────────────────────┐
│  {                                    │
│    "$formspec": "1.0",               │
│    "url": "my-form",                 │
│    "version": "0.1.0",              │
│    ...                               │
│  }                                    │
├──────────────────────────────────────┤
│ [Apply Changes]    ✓ Applied         │
└──────────────────────────────────────┘

  Font: 12.5px JetBrains Mono, 1.6 line-height
  Background: --bg-1
  Tab-size: 2
  Apply button: btn-primary style
  Status text: 12px, --success (ok) or --error (parse error)
  Action bar: 8px 16px padding, --bg-1 bg, top border --border-0
```

**Future enhancement:** Replace textarea with CodeMirror 6 for syntax highlighting, error markers, and bracket matching.

---

## Preview Panel

Live-rendered form in the Inspector's "Preview" tab. Uses `<formspec-render>` with the current definition.

```
  Container: --bg-2 background, 12px padding, 6px border-radius
  Updates: debounced 500ms after any definition change
  Content: standard formspec-webcomponent rendering (inherits formspec-base.css)
  Overflow: auto (scrollable for long forms)
```

---

## Diagnostics Panel

Normalized validation results from FormEngine and structural checks.

### Empty state (no issues)

```
        ✓
    No issues found

  Checkmark: 24px, --success color
  Text: --text-2
```

### With issues

```
┌──────────────────────────────────────┐
│ 2 errors  1 warning                  │  ← Summary bar
├──────────────────────────────────────┤
│ ● Required field has no value        │
│   basicInfo.fullName                 │
│                                      │
│ ● Missing constraint message         │
│   basicInfo.email                    │
│                                      │
│ ▲ Form URL is "untitled"             │
│   url                                │
└──────────────────────────────────────┘

Summary:
  Flex row, 8px gap, 8px vertical padding
  Count pills: 11px 600, 2px 8px padding, 4px radius
    Error: rgba(218, 54, 51, 0.15) bg, --error text
    Warning: rgba(210, 153, 34, 0.12) bg, --warning text
    Info: rgba(88, 166, 255, 0.12) bg, --info text

Rows:
  6px 4px padding, 8px gap
  Hover: --bg-2 background
  Icon: ● (error), ▲ (warning), ℹ (info), colored by severity
  Message: 12px --text-0
  Path: 10.5px JetBrains Mono, --text-2
```

---

## Topbar

```
┌─────────────────────────────────────────────────────────────────────┐
│ [⊞] Formspec Studio    │  My Form  · v0.1.0 · draft  │ [↓ Import] [↑ Export] │
└─────────────────────────────────────────────────────────────────────┘

Brand mark: 20×20px SVG — four rounded squares in 2×2 grid, amber at varying opacity
Brand text: "Formspec" in Plus Jakarta 400, "Studio" in Fraunces italic, --accent color
Title input: transparent background, 1px transparent border, 13px 600
  Hover: --border-1 border
  Focus: --accent border, --bg-2 background
Version/status: 12px --text-2
Dot separator: --text-3

Buttons:
  Import: btn-ghost (transparent bg, --border-1 border, --text-1)
  Export: btn-primary (--accent bg, --bg-0 text)
  Both: 6px 12px padding, 6px radius, 12px 500 font
  Both: include 16×16 SVG icon before text
```

---

## Empty Tab States

When an optional artifact tab (Component, Theme, etc.) has no data:

```
                    ◇

        Component not configured

    Component documents define how
    your form renders.

    [Create from Scratch]  [Import JSON]

  Icon: 40px, 30% opacity
  Heading: 18px Fraunces 500, --text-0
  Description: 13px --text-2
  Buttons: centered row, 8px gap
    Primary: btn-primary
    Secondary: btn-ghost
  Centered vertically and horizontally, max-width 360px
```

---

## Motion & Animation

### Principles

1. **Motion serves comprehension, not decoration.** Every animation answers: "what just happened?"
2. **Fast by default.** Nothing exceeds 300ms. Most transitions are 120–200ms.
3. **Ease-out for entrances, ease-in for exits.** Use `cubic-bezier(0.16, 1, 0.3, 1)` as the primary curve.

### Catalog

| Element | Trigger | Animation | Duration |
|---------|---------|-----------|----------|
| Tree node entrance | Item added | Fade in + slide left 6px | 200ms |
| Key text reveal | Hover/select | opacity 0→0.7, max-width 0→150px | 150ms |
| Action buttons reveal | Hover | opacity 0→1 | 150ms |
| Toggle arrow rotation | Expand/collapse | rotate 0→90° | 200ms |
| Add menu dropdown | Click | Fade in + scale 0.97→1 + slide up 4px | 150ms |
| Tab switch (inspector) | Click | Immediate (no transition — tabs should feel instant) |
| Toast notification | Show | opacity 0→1, translateY 8px→0, scale 0.96→1 | 250ms |
| Toast notification | Auto-dismiss | opacity 1→0 | 300ms |
| Input focus ring | Focus | border-color transition | 150ms |
| Sidebar tab active | Click | Immediate background swap (no transition) |

### Toast notifications

```
  Position: fixed bottom-right, 16px margin
  Stack: column-reverse (newest on bottom)
  Duration: 2500ms visible, then 300ms fade out
  Style: --bg-3 bg, 1px --border-1 border, 6px radius
  Shadow: 0 4px 16px rgba(0,0,0,0.3)
  Left border: 3px solid (--success / --error / --info by type)
  Font: 12.5px 500
```

---

## Accessibility

### Requirements (WCAG 2.1 AA minimum)

1. **Color contrast:** All text meets 4.5:1 against its background. Large text (18px+) meets 3:1.
2. **Focus indicators:** 2px solid --accent outline on all interactive elements when using keyboard (`:focus-visible`). No focus ring on mouse click.
3. **Keyboard navigation:** All tree operations accessible via keyboard (Tab, Enter, Arrow keys, Delete).
4. **Screen reader support:** Tree uses `role="tree"` / `role="treeitem"` ARIA patterns. Inspector tabs use proper `role="tablist"` / `role="tab"` / `role="tabpanel"`.
5. **No color-only semantics:** Diagnostic severity uses icons (● ▲ ℹ) alongside color.
6. **Reduced motion:** Respect `prefers-reduced-motion` — disable all animations, use instant transitions.

### Contrast verification (key pairs)

| Foreground | Background | Ratio | Pass? |
|-----------|-----------|-------|-------|
| --text-0 (#E6EDF3) | --bg-0 (#0E1117) | 14.2:1 | AAA |
| --text-1 (#9BA4AE) | --bg-0 (#0E1117) | 6.8:1 | AA |
| --text-1 (#9BA4AE) | --bg-1 (#161B22) | 5.5:1 | AA |
| --text-2 (#545D68) | --bg-0 (#0E1117) | 3.1:1 | Decorative only |
| --accent (#D4A34A) | --bg-0 (#0E1117) | 8.2:1 | AAA |
| --bg-0 (#0E1117) | --accent (#D4A34A) | 8.2:1 | AAA (btn text) |
| --error (#DA3633) | --bg-0 (#0E1117) | 5.0:1 | AA |
| --success (#3FB950) | --bg-0 (#0E1117) | 6.7:1 | AA |

---

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|---------|
| ≥ 1440px | Full three-panel layout, centered tree (max-width 720px) |
| 1280–1439px | Full three-panel layout, tree fills editor width |
| 1024–1279px | Inspector becomes overlay panel (triggered by button in toolbar) |
| < 1024px | Not supported in V1 (show "desktop required" message) |

---

## Canvas Background

The editor area uses a subtle dot grid pattern to create visual texture without distraction:

```css
background-image: radial-gradient(
  circle at 1px 1px,
  rgba(255, 255, 255, 0.012) 1px,
  transparent 0
);
background-size: 24px 24px;
```

This is barely perceptible but prevents the large empty canvas from feeling like a void. It also subtly signals "workspace / design surface" rather than "content page."

---

## Custom Scrollbars

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: --border-2; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: --text-2; }
```

Thin, unobtrusive scrollbars that don't steal attention or space. Visible enough to find when needed.

---

## Icon System

V1 uses Unicode symbols for simplicity. Replace with a custom SVG icon set in V2.

| Usage | Symbol | Notes |
|-------|--------|-------|
| Field type | ◆ | Filled diamond |
| Group type | ▣ | Nested square |
| Display type | ◉ | Bullseye |
| Expand toggle | ▸ / ▾ | SVG chevron, rotates |
| Move up/down | ↑ / ↓ | Text buttons |
| Delete | × | Danger color on hover |
| Error severity | ● | Filled circle |
| Warning severity | ▲ | Triangle |
| Info severity | ℹ | Info symbol |
| Configured | ✓ | Success color |
| Not configured | — | Ghost color |
| Import | ↓ + tray | 16×16 SVG |
| Export | ↑ + tray | 16×16 SVG |

---

## File Structure

```
examples/form-builder/
├── index.html          HTML shell, font loading, structural markup
├── styles.css          All CSS (custom properties, layout, components)
├── main.js             All JS (state, tree editor, properties, preview, I/O)
└── vite.config.js      Dev server + package aliases
```

No framework. No build step beyond Vite. Vanilla HTML/CSS/JS to match the rest of the codebase.
