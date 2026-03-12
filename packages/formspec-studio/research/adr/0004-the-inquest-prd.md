# The Inquest — Guided Creation Flow

**Version:** 1.0  
**Status:** Draft  
**Date:** March 11, 2026  
**Parent Document:** The Stack PRD v2.0  
**Mutation Layer:** formspec-studio-core v0.1

---

## 1. Purpose

The Inquest is the guided creation flow that bridges the gap between "I have a regulatory requirement" and "I'm editing a structured form in The Stack." It replaces the blank-canvas problem with a conversational process that accepts unstructured input — plain language descriptions, scanned paper forms, policy PDFs, existing spreadsheets — and progressively transforms it into a valid Formspec definition.

The flow exists because the people who need The Stack cannot start from an empty editor. An analyst who knows that Section 8 eligibility requires income verification, household size thresholds, and citizenship checks cannot translate that knowledge into items, binds, and shapes without first understanding Formspec's structural vocabulary. The Inquest teaches by doing: the analyst describes what they need, the system proposes structure, the analyst refines, and the result is a populated project ready for detailed editing.

---

## 2. Entry Points

The Inquest is accessible from three locations.

**New Project.** When the analyst creates a new project, they are presented with a choice: "Start from scratch" (opens an empty Stack editor), "Import existing" (opens a file picker for Formspec JSON), or "Describe your form" (opens The Inquest). The Inquest is the default highlighted option.

**Empty State.** If the analyst opens The Stack with an empty definition (no items), the editor canvas shows an empty state with a prominent "Start with The Inquest" call-to-action.

**Command Palette.** ⌘K → "New Inquest" opens the flow at any time, even with an existing project. In this case, the generated structure is merged into the current definition via `project.importSubform` rather than replacing it.

---

## 3. Flow Architecture

The Inquest is a five-phase flow. Each phase produces an intermediate artifact that feeds the next. The analyst can exit at any phase and enter The Stack with whatever has been generated so far.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  1. INTAKE   │────▶│  2. ANALYSIS │────▶│  3. PROPOSAL │────▶│  4. REFINE   │────▶│  5. HANDOFF   │
│              │     │              │     │              │     │              │     │               │
│  Chat + Upload│     │  LLM extracts│     │  Structured  │     │  Visual edit │     │  Dispatch to  │
│  Describe need│     │  requirements│     │  scaffold    │     │  of scaffold │     │  The Stack    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └──────────────┘
```

**Phase 1: Intake** — Conversational input gathering.  
**Phase 2: Analysis** — LLM processes inputs and extracts structured requirements.  
**Phase 3: Proposal** — System generates a Formspec scaffold and presents it for review.  
**Phase 4: Refine** — Analyst edits the scaffold in a simplified visual editor.  
**Phase 5: Handoff** — Approved scaffold is dispatched as commands into The Stack.

---

## 4. Phase 1: Intake

### 4.1 Layout

Full-screen modal over The Stack. Dark background (`#0F172A`) with a centered content area (max-width 720px). The dark background signals a distinct mode — this is not the editor, this is a conversation.

Left side: chat stream. Right side: an "Inputs" panel showing uploaded files and extracted context as a growing inventory.

### 4.2 Chat Interface

The chat is a conversational thread between the analyst and an LLM assistant. The assistant's personality is professional, precise, and gently guiding — it asks clarifying questions, but never requires them. It can work with whatever the analyst provides.

**System opening message:**

> What form are you building? You can describe it in your own words, upload an existing paper form or PDF, or paste regulatory text. I'll help translate it into a structured specification.

The assistant is trained to ask follow-up questions across five dimensions, but only as needed — it adapts to how much information the analyst volunteers:

1. **Regulatory basis.** "What regulation, program, or policy does this form serve?" The answer populates `definition.description` and informs field naming conventions.

2. **Audience.** "Who fills this out — applicants, case workers, or reviewers?" The answer influences density, hint text, and presentation defaults.

3. **Data collected.** "What information do you need to capture?" This is the core question. The analyst may describe fields in natural language, upload a reference document, or both.

4. **Logic and conditions.** "Are there parts of the form that should only appear under certain conditions?" This surfaces the visibility rules, calculations, and validation constraints that will become binds and shapes.

5. **Flow and structure.** "Should this be a single page or multiple steps? Are there sections that repeat (like listing household members)?" This informs page mode, group structure, and repeat configuration.

### 4.3 Upload Handling

The chat input supports three upload types, each processed by the LLM with specialized extraction.

**Images** (JPEG, PNG, TIFF, HEIC). The analyst photographs or screenshots an existing paper form. The LLM performs visual analysis to extract: field labels, field types (text boxes, checkboxes, dropdowns, signature lines), section headers, page structure, and any instructional text. The extracted structure appears in the Inputs panel as a "Form Scan" card with a thumbnail and a list of detected fields.

Typical use case: An analyst at a housing authority photographs the paper HUD-50058 form they've been using for 20 years. The LLM identifies 47 fields across 4 sections, detects that "Household Members" is a repeating table, and recognizes the income calculation section.

**PDFs.** The analyst uploads a regulatory document, policy manual, or existing digital form. The LLM extracts: section structure, defined terms, eligibility criteria, required data points, calculation formulas, conditional requirements, and cross-references. The extracted requirements appear in the Inputs panel as a "Policy Document" card with key excerpts highlighted.

Typical use case: An analyst uploads the 24 CFR §982 regulation governing the Housing Choice Voucher program. The LLM identifies income limits, household size thresholds, citizenship requirements, and documentation rules — then maps these to form fields, validation shapes, and conditional binds.

**Spreadsheets** (CSV, XLSX). The analyst uploads an existing data collection spreadsheet. The LLM maps column headers to field labels, infers data types from cell values, and detects implicit validation rules (dropdown lists, conditional formatting, formula cells). The result appears as a "Spreadsheet Import" card.

### 4.4 Inputs Panel

The right-side panel accumulates everything the analyst has provided. Each input renders as a card:

- **Chat excerpts:** Key statements extracted from the conversation, tagged by dimension (regulatory basis, audience, data, logic, flow).
- **Uploaded files:** Thumbnail with filename, file type badge, and a "Detected N fields" or "Extracted N requirements" summary.
- **Extracted items:** As the LLM processes inputs, individual detected fields appear as compact rows with an inferred label, data type, and confidence indicator (high/medium/low).

The analyst can delete inputs, correct extracted labels, and flag items as "ignore" before proceeding. This panel persists across all phases as a reference.

### 4.5 Progression

The analyst proceeds to Phase 2 by clicking "Analyze" or by the assistant suggesting it's ready: "I think I have enough to propose a structure. Shall I analyze what we have?" The analyst can also continue adding inputs — the flow never forces progression.

A minimum threshold for progression: at least one meaningful input (a description of more than 20 words, an uploaded file, or 3+ chat exchanges). Below this threshold, the "Analyze" button is disabled with a tooltip: "Tell me more about your form first."

---

## 5. Phase 2: Analysis

### 5.1 Processing

The LLM processes all accumulated inputs and produces a structured requirements document. This is not yet a Formspec definition — it's an intermediate representation that the analyst can review before structure is generated. The processing happens in the background; the analyst sees an animated progress indicator.

The analysis produces five outputs:

1. **Field inventory.** A flat list of every detected data point with: proposed label, inferred data type, whether it's required, and the source input that suggested it (chat excerpt, form scan region, PDF section).

2. **Section structure.** Proposed grouping of fields into logical sections (e.g., "Applicant Information," "Household Composition," "Income & Assets").

3. **Conditional logic.** Detected visibility rules, calculations, and validation constraints expressed in natural language (not yet FEL). Each rule shows: the triggering condition, the affected fields, and the source reasoning.

4. **Repeating structures.** Detected one-to-many relationships (household members, line items, employment history) with proposed min/max bounds.

5. **Routing logic.** If the inputs suggest pre-qualification or branching (e.g., "applicants over the income limit are redirected to a different form"), the analysis proposes screener fields and routes.

### 5.2 Review Screen

The analysis results render as a structured report in the same full-screen modal. The dark background persists. The report is organized into the five sections above, each rendered as a card.

**Field Inventory Card.** A scrollable table showing each detected field with: checkbox (include/exclude), proposed label (editable inline), inferred data type (dropdown: string, integer, boolean, date, choice, money, attachment), required flag (toggle), and source citation (expandable to show the original input text or image region).

**Section Structure Card.** A visual tree showing proposed sections as headers with their assigned fields listed below. Fields can be dragged between sections. Sections can be renamed, reordered, or merged. An "Add Section" button at the bottom allows manual section creation.

**Logic Card.** A list of detected rules in natural language. Each rule has: a toggle (include/exclude), an editable condition description, and a list of affected fields. The analyst can modify the natural-language description; FEL translation happens in Phase 3.

**Repeating Structures Card.** Each detected repeat group shows: the group name, which fields are inside it, and proposed min/max instance counts (editable).

**Routing Card.** If routing was detected: proposed screener fields, routing conditions, and target destinations. If no routing was detected, this card shows "No pre-qualification routing detected" with an "Add Screener" button.

### 5.3 Analyst Actions

The analyst can:

- **Edit** any proposed element inline (labels, types, grouping, conditions).
- **Exclude** elements by unchecking them (they remain visible but greyed out, available for re-inclusion).
- **Add** elements manually that the LLM missed.
- **Re-analyze** by clicking "Re-analyze with changes," which sends the modified requirements back to the LLM for a refined pass.
- **Continue** to Phase 3 by clicking "Generate Structure."

### 5.4 Confidence Indicators

Each detected element shows a confidence indicator: green (high confidence — the element was explicitly stated or clearly visible in a form scan), amber (medium — inferred from context), or red (low — guessed from ambiguous input). Low-confidence elements are flagged for the analyst's attention. The threshold for a "complete" analysis is that fewer than 20% of elements are low-confidence.

---

## 6. Phase 3: Proposal

### 6.1 Generation

The system transforms the reviewed analysis into a Formspec definition scaffold. This is a real, valid Formspec JSON document — but it's presented visually, not as raw JSON. The generation produces:

- **Items** with keys, labels, data types, hints, and nested structure.
- **Binds** with FEL expressions for required, relevant, calculate, and constraint properties, translated from the natural-language rules.
- **Shapes** for cross-field validation rules.
- **Variables** for computed intermediate values.
- **Pages** based on the section structure, with `formPresentation.pageMode` set to wizard if the analysis detected multi-step flow.
- **Option sets** for any choice fields with reusable options.
- **Screener** if routing was detected.

A parallel Component Document scaffold is also generated with a basic layout tree (Wizard → Pages → Cards → Grid/Stack → Input components).

### 6.2 Presentation

The proposal renders in a split view. Left: a visual summary of the generated structure. Right: the Inputs panel from Phase 1, allowing the analyst to cross-reference the proposal against their original inputs.

The visual summary uses the same block rendering as The Stack's Editor tab — group headers, field cards with type icons, bind summary strips — but in a simplified, read-only format. This teaches the analyst The Stack's visual vocabulary before they arrive in the full editor.

Each generated element shows a "Source" link that highlights the original input (chat excerpt, form scan region, PDF section) that produced it. This traceability is essential for analyst trust: they can verify that the system understood their intent.

### 6.3 Statistics

A summary bar shows: total fields generated, pages, logic rules, validation shapes, and a "coverage" percentage indicating how many of the detected requirements were successfully translated into Formspec constructs. Elements that couldn't be translated (ambiguous logic, unsupported patterns) are listed in a "Needs Manual Configuration" section with explanations.

### 6.4 Analyst Actions

- **Accept** the proposal as-is and proceed to Phase 5 (Handoff).
- **Refine** by proceeding to Phase 4 for visual editing.
- **Regenerate** with adjusted parameters (e.g., "Make all fields required by default," "Use a single page instead of wizard," "Split the income section into two pages").
- **Back** to Phase 2 to modify the analysis.

---

## 7. Phase 4: Refine

### 7.1 Purpose

A lightweight visual editor for the scaffold that sits between the Proposal view and the full Stack editor. It exposes the most common modifications analysts need to make before committing, without the full complexity of The Stack's nine-section Blueprint.

### 7.2 Layout

The dark background transitions to the standard Stack canvas background (`#F8FAFC`). The layout mirrors The Stack's three-column structure — but simplified:

- **Left:** A flat section list (not the full Blueprint). Shows pages and their top-level groups. Drag to reorder.
- **Center:** The block editor, identical to The Stack's Editor tab but with a reduced toolbar. Only the most common operations are exposed: reorder, rename, change type, toggle required, delete.
- **Right:** A simplified Properties panel showing only Identity, Field Config, and Behavior Rules. No extensions, no presentation hints, no repeat config. These are available in the full editor.

### 7.3 Guided Prompts

The refine phase includes contextual prompts that surface common next actions:

- After generating a money field: "Would you like to set a currency? Default is USD."
- After generating a conditional rule: "This field will be hidden when [condition]. Does that look right?"
- After generating a repeating group: "Members can repeat 0–12 times. Should I adjust the limits?"
- When a required field has no validation: "Should [field] have a format requirement? (e.g., SSN as XXX-XX-XXXX)"

These prompts appear as non-blocking toast-style cards at the bottom of the center column. Dismissing a prompt removes it permanently. Acting on a prompt opens the relevant property in the Properties panel.

### 7.4 Chat Continuation

The LLM chat from Phase 1 remains accessible as a collapsible drawer at the bottom of the screen. The analyst can continue the conversation:

> "Actually, make the employer fields only show up when the income source is 'Employment'."

The assistant translates this into the appropriate bind modification and applies it to the scaffold. This is the key interaction: the analyst can make structural changes through conversation rather than direct manipulation, using whichever modality feels more natural. Conversational edits dispatch commands just like UI edits.

### 7.5 Progression

The analyst proceeds to Phase 5 by clicking "Open in The Stack" or by the chat suggesting: "Your form looks ready. Want to open it in the full editor?"

---

## 8. Phase 5: Handoff

### 8.1 Dispatch

The finalized scaffold is committed to the project as a series of dispatched commands. The handoff does not use `project.import` (which clears undo history). Instead, it dispatches individual `definition.addItem`, `definition.setBind`, `definition.addShape`, `definition.addVariable`, `definition.setOptionSet`, `definition.addInstance`, `definition.addPage`, and `component.addNode` commands in sequence. This means:

- The entire creation is undoable — ⌘Z walks back through every generated item.
- The command history shows a clear provenance: "Generated by The Inquest" markers on each batch of commands.
- If the analyst opened The Inquest from an existing project (`project.importSubform` mode), only the new items are added without disturbing existing structure.

### 8.2 Transition

The Inquest modal fades out and The Stack editor fades in, with the first page selected and the first field highlighted in the Properties panel. A one-time welcome banner appears at the top of the editor:

> ✨ Your form has been generated with [N] fields, [N] rules, and [N] pages. Everything here is editable — click any block to customize it, or use the Logic tab to fine-tune behavior.

The banner includes a "Show me around" link that triggers a lightweight feature tour highlighting the Blueprint sections, Properties panel, and Logic tab.

### 8.3 Inquest History

The Inputs panel content (chat transcript, uploaded files, extracted requirements) is preserved in the project metadata as an `x-inquest` extension. This allows the analyst to revisit the original conversation and inputs later — useful when another team member asks "why was this field structured this way?"

---

## 9. LLM Integration

### 9.1 Model Requirements

The Inquest requires a multimodal LLM capable of: text conversation, image analysis (form scans), PDF text extraction and reasoning, and structured JSON output generation. The model must support the Anthropic Messages API with document and image content types.

### 9.2 System Prompt Architecture

The LLM system prompt includes:

- The Formspec Definition schema (summary, not full JSON Schema) — enough for the model to understand item types, data types, bind properties, shape structure, and FEL syntax.
- The FEL function catalog — so the model can generate valid expressions.
- The Studio Command Catalog — so the model can generate valid command payloads for the dispatch layer.
- Domain-specific context about common form patterns (government intake forms, grant applications, compliance checklists, clinical research instruments).
- Persona instructions: professional, precise, never condescending, comfortable with ambiguity, asks clarifying questions only when genuinely uncertain.

### 9.3 Structured Output

The LLM's analysis and proposal outputs are requested as structured JSON matching predefined schemas. The system prompt specifies the output format explicitly, and the response is parsed and validated before rendering. Malformed outputs trigger a retry with diagnostic feedback.

### 9.4 Image Processing

For uploaded form images, the LLM is prompted with:

> Analyze this image of a paper form. Extract every visible field, section header, instructional text, checkbox group, dropdown, signature line, and repeating table. For each element, provide: the label text (exactly as written), the inferred data type, whether it appears required (marked with an asterisk or "Required"), and its position in the form's visual hierarchy (which section it belongs to). Note any conditional instructions (e.g., "Complete only if...") as logic rules.

The response is rendered in the Inputs panel as a structured field list with a minimap showing detected regions overlaid on the original image.

### 9.5 PDF Processing

For uploaded PDFs, the document is sent as base64-encoded content. The LLM is prompted to distinguish between: form-like content (fields to extract directly), regulatory text (requirements to translate into fields and rules), and reference material (definitions, thresholds, schedules to potentially populate as instances or option sets).

### 9.6 Conversation State

The full conversation history is maintained in the LLM context window across all phases. When the analyst asks a follow-up question in Phase 4 ("Actually, make the employer fields conditional"), the model has access to all prior exchanges, uploaded files, the generated analysis, and the current scaffold state. This continuity is essential — the analyst should never have to re-explain context.

### 9.7 Error Handling

If the LLM produces an invalid Formspec structure (e.g., duplicate keys, invalid FEL syntax, circular variable references), the system:

1. Attempts automatic repair (deduplicating keys with suffixes, simplifying invalid FEL to placeholder expressions).
2. If repair succeeds, flags the repaired elements with amber confidence indicators.
3. If repair fails, shows the element in a "Needs Manual Configuration" section with the error description in plain language.
4. Never blocks progression — the analyst can always proceed with partial results and fix issues in The Stack.

---

## 10. Edge Cases

### 10.1 Minimal Input

The analyst provides only a single sentence: "I need a patient intake form." The LLM generates a reasonable scaffold based on common patterns for the form type, with all elements at medium confidence. The analyst is encouraged to provide more detail but is not required to.

### 10.2 Excessive Input

The analyst uploads a 200-page regulatory document. The LLM summarizes the document structure, identifies the sections most likely to produce form fields, and generates a scaffold from those sections. A "Coverage" indicator shows which document sections were processed and which were skipped. The analyst can direct the LLM to specific sections: "Focus on Chapter 4, Section 982.201."

### 10.3 Contradictory Input

The analyst says "all fields are optional" in the chat but uploads a form scan where fields are marked with asterisks. The LLM surfaces the contradiction: "I noticed some fields in the uploaded form appear required, but you mentioned all fields should be optional. Which should I follow?" The analyst resolves the contradiction, and the LLM proceeds.

### 10.4 Multiple Form Scans

The analyst uploads three images of a multi-page paper form. The LLM processes them in sequence, maintaining field numbering and section structure across pages. The result is a single unified field inventory with page-break markers that translate into Formspec pages.

### 10.5 Existing Project Merge

When invoked from an existing project (⌘K → "New Inquest"), the LLM is provided with the existing definition's item keys to avoid collisions. Generated items use unique keys that don't conflict with existing ones. The handoff dispatches `project.importSubform` with the target group path selected by the analyst.

### 10.6 Re-entry

If the analyst closes The Inquest mid-flow and reopens it, the previous session state is restored. The conversation, uploads, analysis, and scaffold are all preserved. A banner shows: "Welcome back. You were on step [N] of The Inquest. Pick up where you left off?"

---

## 11. Command Mapping

Every mutation during The Inquest maps to Studio commands. The following table shows which commands each phase uses.

| Phase | Commands Used |
|-------|--------------|
| Phase 1: Intake | None (accumulates inputs, no state mutation) |
| Phase 2: Analysis | None (LLM processing, no state mutation) |
| Phase 3: Proposal | None (generates scaffold in memory, not yet committed) |
| Phase 4: Refine | `definition.addItem`, `definition.deleteItem`, `definition.renameItem`, `definition.moveItem`, `definition.reorderItem`, `definition.setBind`, `definition.setItemProperty`, `definition.setFieldDataType`, `definition.setFieldOptions`, `definition.addShape`, `definition.addVariable`, `definition.setOptionSet`, `definition.addPage`, `definition.setFormPresentation`, `definition.addInstance`, `definition.setScreener`, `definition.addScreenerItem`, `definition.addRoute`, `component.addNode`, `component.setNodeProperty` |
| Phase 5: Handoff | Same as Phase 4 (dispatched in batch), or `project.importSubform` for merge mode |

In Phase 4, the chat continuation can dispatch any command — the LLM generates command payloads from natural language and the system validates and executes them through `Project.dispatch()`.

---

## 12. Design Specifications

### 12.1 Phase 1 Visual Treatment

Dark background (`#0F172A`). Chat bubbles: system messages left-aligned, no bubble, raw text in Space Grotesk 14px. User messages right-aligned with subtle dark surface background (`#1E293B`), JetBrains Mono 13px. Upload cards render with file-type icons, thumbnails for images, and extraction progress indicators. The Inputs panel uses the same dark treatment with cards at `#1E293B` surface.

The overall feel is a terminal-meets-design-tool aesthetic — technical enough to signal precision, warm enough to not intimidate. The dark mode creates a clear visual break from The Stack's light editor, reinforcing that this is a distinct mode.

### 12.2 Phase 2–3 Visual Treatment

Remains dark. The analysis report and proposal use cards with `#1E293B` backgrounds and `#E2E8F0` borders. Confidence indicators use the standard color system: green (`#059669`), amber (`#D97706`), red (`#DC2626`). The field inventory table uses JetBrains Mono for data types and keys, Space Grotesk for labels.

### 12.3 Phase 4 Transition

The background transitions from dark to light (`#F8FAFC`) with a 300ms cross-fade. The block editor renders identically to The Stack's Editor tab, using the same block components. The simplified Properties panel uses the same Row, Sec, BindCard, and Pill components. The chat drawer at the bottom uses a dark strip (`#1E293B`) to maintain continuity with the earlier phases.

### 12.4 Phase 5 Transition

The Inquest modal fades out (opacity 0 over 400ms) while The Stack's editor fades in behind it. The first generated page is selected, the first field is highlighted, and the Properties panel is populated. The welcome banner uses a subtle accent-tinted background (`#2563EB` at 6% opacity) with a left border.

### 12.5 Typography

All phases use the same Space Grotesk / JetBrains Mono split as The Stack. The chat uses slightly larger sizes (14px body, 13px mono) for readability in the dark context. Minimum font size across The Inquest is 12px — slightly higher than The Stack's 11px floor, because the dark background reduces perceived contrast.

---

## 13. Analytics and Feedback

### 13.1 Tracked Events

- Inquest started (entry point: new project / empty state / command palette)
- Input provided (type: chat / image / pdf / spreadsheet)
- Analysis completed (field count, section count, rule count, confidence distribution)
- Proposal generated (field count, bind count, shape count, coverage percentage)
- Refine edits (count, type: rename / delete / reorder / add / modify bind)
- Chat continuation edits in Phase 4 (count, success rate)
- Handoff completed (total commands dispatched, merge vs. new project)
- Inquest abandoned (phase at abandonment, time spent)
- Re-entry (phase resumed from)

### 13.2 Quality Metrics

- **Extraction accuracy.** Percentage of LLM-detected fields that survive into the final definition without label changes. Target: 80%.
- **Logic translation accuracy.** Percentage of natural-language rules that produce valid FEL without manual correction. Target: 70%.
- **Time to first edit.** Time from Inquest start to first manual edit in The Stack editor. Target: under 5 minutes for a 30-field form.
- **Scaffold retention.** Percentage of generated items that remain in the published definition (not deleted by the analyst). Target: 75%.

---

## 14. Future Enhancements

### 14.1 Template Gallery

Pre-built Inquest sessions for common form types: government intake forms (Section 8, SF-425, SF-424), clinical trial case report forms, grant applications, compliance checklists, employee onboarding. The analyst selects a template, which pre-populates the analysis with a known structure, then customizes from there.

### 14.2 Iterative Re-Inquest

After a form has been in production, the analyst uploads new regulatory guidance and asks The Inquest to identify what needs to change. The system diffs the new requirements against the existing definition and proposes targeted modifications (new fields, updated validation thresholds, deprecated sections) rather than regenerating from scratch.

### 14.3 Multi-Form Programs

For programs that involve multiple related forms (application, annual review, recertification), The Inquest could generate a suite of definitions with shared option sets, common field groups via `$ref`, and pre-configured migration paths between versions.

### 14.4 Collaborative Inquest

Multiple analysts contribute to the same Inquest session — one uploads the regulatory document, another describes field-level requirements, a third reviews the proposal. Each participant's contributions are attributed in the Inputs panel.

---

*End of document.*
