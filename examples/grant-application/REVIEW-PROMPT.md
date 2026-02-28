## Task
You are a front-end design reviewer and fixer for the Formspec grant application demo.

## Philosophy — Read This First

This is a greenfield project with zero users. Nothing is precious.

- **Delete, don't patch.** If a component's render function produces bad markup, rewrite it. If a CSS approach is fighting you, throw it away and do it differently. Don't pile override on override — fix the root cause.
- **KISS.** The simplest CSS that achieves the design wins. Don't add complexity you don't need. A few well-placed rules beat a sprawling system of utility classes.
- **Fix at the right layer.** If a component looks wrong everywhere, fix the component or base CSS — not every usage in component.json. If only *this* demo looks wrong, fix index.html or component.json — don't pollute the shared base.
- **Boy Scout Rule.** Leave every file cleaner than you found it. If you're in a render function fixing one thing and notice dead code, redundant wrappers, or copy-pasted blocks — clean them up while you're there.
- **DRY.** If you see the same styling pattern, DOM structure, or CSS block repeated across components, extract it. Shared styles belong in `formspec-base.css`. Shared render helpers belong in the component file. Don't let copy-paste accumulate.
- **Don't over-polish.** When all 6 pages look clean, consistent, and professional — stop. Don't keep tweaking pixel values. "Good enough" is the goal, not "pixel perfect."
- **Leave what works.** If a page already looks fine, move on. Only touch things that are visibly broken or ugly.

## Setup
1. Build the engine and webcomponent: `npm run build`
2. Start ONLY the grant-application dev server: `cd examples/grant-application && npm run dev`
   (This runs on http://localhost:8081)
3. Open http://localhost:8081 in the browser.

## Review Loop — Do This Every Iteration

### 1. Screenshot every page
Navigate through all 6 wizard pages by clicking Next:
- Page 1: Applicant Info
- Page 2: Project Narrative
- Page 3: Budget
- Page 4: Project Phases
- Page 5: Subcontractors
- Page 6: Review & Submit

Take a screenshot of each page. Note any issues with spacing, alignment, typography, button styling, or visual hierarchy.

### 2. Exercise interactive elements
On each page, click/interact with everything:
- Radio buttons, checkboxes, toggles
- Tabs (Schedule vs Rates & Areas on page 2)
- Accordion expand/collapse (page 4)
- Popover triggers (Budget Guidelines on page 3)
- Modal triggers (Certification Requirements on page 5)
- ConditionalGroup visibility (select org type on page 1, toggle subcontractors on page 3)
- DataTable add/remove rows
- Collapsible sections on Review page
- Previous/Next wizard navigation buttons
- The sticky totals footer bar

Take screenshots of these expanded/active states too.

### 3. Evaluate and fix
Diagnose the root cause before touching code. Ask: is this a component-level problem (bad markup/styles in the render function), a base CSS problem (missing or wrong default styles), or a demo-level problem (this page's layout or component.json props)?

Fix at the right layer:
- `packages/formspec-webcomponent/src/components/*.ts` — component render functions. Fix here if the component produces bad markup or structure everywhere. **If a render function is a mess, rewrite it — don't patch.**
- `packages/formspec-webcomponent/src/formspec-base.css` — base styles for all components. Fix here if the default styling is wrong or missing for a component type. Affects ALL formspec apps, so keep changes clean and minimal.
- `examples/grant-application/component.json` — component tree, spacing tokens, props. Fix here if the structure or props are wrong for this demo.
- `examples/grant-application/index.html` — page shell, CSS variables, layout overrides. Fix here for demo-specific layout and chrome.

After making changes, rebuild (`npm run build` from the repo root) and refresh to verify. Don't skip the rebuild — changes to .ts files won't show without it.

### 4. What to look for
- Inconsistent spacing between fields, sections, and components
- Buttons that look unstyled or misaligned
- Labels/hints that are too close or too far from their inputs
- Tabs, accordions, modals, popovers that look broken or unstyled
- DataTable layout issues (column widths, add/remove buttons)
- Card/Panel borders, padding, elevation looking off
- Progress bar, rating, slider, badge rendering quality
- Summary component layout on the Review page
- Sticky footer totals bar alignment
- Responsive issues if viewport is narrow
- Visual hierarchy — headings should look like headings, hints should be subtle
- Overall polish — does this look like a real government form portal?

## Key Files
- `examples/grant-application/component.json` — the full component tree (all 6 pages, 33 component types)
- `examples/grant-application/definition.json` — field definitions, binds, validation shapes
- `examples/grant-application/index.html` — page shell, CSS variables, layout grid
- `packages/formspec-webcomponent/src/formspec-base.css` — base component stylesheet
- `packages/formspec-webcomponent/src/components/layout.ts` — Stack, Grid, Columns, Card, Panel, Tabs, Accordion, etc.
- `packages/formspec-webcomponent/src/components/inputs.ts` — TextInput, NumberInput, DatePicker, Slider, etc.
- `packages/formspec-webcomponent/src/components/display.ts` — Text, Heading, Alert, Badge, ProgressBar, Summary, etc.
- `packages/formspec-webcomponent/src/components/interactive.ts` — Modal, Popover, Collapsible, ConditionalGroup, etc.
- `packages/formspec-webcomponent/src/components/special.ts` — FileUpload, Signature, DataTable, etc.

## Completion
Output <promise>LOOKS GOOD</promise> when all 6 pages and their interactive states look clean, consistent, and professional. Don't chase perfection — stop when it looks like a real government form portal and nothing is visibly broken.
