    1 # ADR 0039: Visual Fidelity Fixes for formspec-studio
    2
    3 ## Objective
    4 Address the visual UX and design gaps identified during the audit to bring the current `formspec-studio` implementation into full alignment with the "Swiss Brutalist" aesthetic defined in the mockups
      and prototype.
    5
    6 ## Key Files & Context
    7 - `packages/formspec-studio/src/index.css`: Tailwind variables need updating.
    8 - `packages/formspec-studio/src/components/Header.tsx`: Needs global search bar and Preview/Publish buttons.
    9 - `packages/formspec-studio/src/workspaces/editor/FieldBlock.tsx`: Needs layout update, inline hint, and summary strip.
   10 - `packages/formspec-studio/src/workspaces/editor/GroupBlock.tsx`: Needs heavy bottom border and layout adjustment.
   11 - `packages/formspec-studio/src/workspaces/editor/PageTabs.tsx`: Needs "bubble" breadcrumb styling.
   12 - `packages/formspec-studio/src/workspaces/editor/ItemProperties.tsx`: Needs `Sec`, `Row`, `BindCard`, `ShapeCard` high-density structure.
   13 - `packages/formspec-studio/src/components/Shell.tsx` & `Blueprint.tsx`: Needs persistent structure tree layout adjustment.
   14
   15 ## Implementation Steps
   16
   17 1. **Update Design Tokens**
   18    - Edit `src/index.css` to update Tailwind variables (e.g., `--color-ink: #0F172A`, `--color-accent: #2563EB`, `--color-logic: #7C3AED`) to match the exact hex codes from the prototype
      `00-preamble.tsx`.
   19
   20 2. **Revamp Header Component**
   21    - Update `src/components/Header.tsx`.
   22    - Add a centralized search input (read-only trigger) that opens the `CommandPalette`.
   23    - Add `Preview` and `Publish` action buttons.
   24    - Re-align tabs to the left next to the logo.
   25
   26 3. **Enhance Editor Blocks**
   27    - Update `FieldBlock.tsx` to use a multi-line layout with a dedicated hint line and a bottom "Summary Strip" for active binds (`calculate`, `relevant`, `constraint`, etc.).
   28    - Update `GroupBlock.tsx` to include a heavy `2px border-ink` bottom border and `min/max` repeat indicators.
   29    - Update `PageTabs.tsx` to render page navigation as numbered bubble breadcrumbs.
   30
   31 4. **Upgrade Properties Panel**
   32    - Refactor `ItemProperties.tsx`.
   33    - Integrate `Sec` (Section headers) and `Row` components to mimic the high-contrast uppercase headers (e.g., `IDENTITY`, `FIELD CONFIG`).
   34    - Use `BindCard` and `ShapeCard` from the UI components to render bind and shape details directly in the properties panel instead of simple text.
   35    - Restyle action buttons (Duplicate, Delete) to be full-width and letter-spaced at the bottom.
   36
   37 5. **Adjust Blueprint Sidebar Layout**
   38    - Update `Shell.tsx` and/or `Blueprint.tsx` so that the `StructureTree` (or at least the `Wizard Pages` and `Items` tree) is persistently visible when the Structure section is active, mirroring
      the dual-pane sidebar seen in the mockup.
   39
   40 ## Verification & Testing
   41 - Run `npm run dev` and visually verify the changes against the mockup screenshots.
   42 - Ensure all existing Playwright E2E tests (`npm run test:e2e`) still pass, as the structural `data-testid` attributes should remain intact.
   43 - Verify that clicking the new Header search bar opens the Command Palette correctly.
