# Locale Translation Management — Design Specification

**Date:** 2026-03-26
**Status:** Draft
**Relates to:** Locale Spec (specs/locale/locale-spec.md), ADR-0048 (i18n-as-locale-artifact), References Schema, Ontology Schema

## Problem Statement

Formspec has a complete Locale Document specification, schema, and runtime engine — but no authoring UX. Form authors and translators have no visual tool for creating, editing, reviewing, or AI-assisting translations. Additionally, the translation quality ceiling is limited by context: an AI translator working with raw string keys produces worse output than one that understands what each field *means*, what domain it belongs to, and what regulatory context surrounds it.

The References and Ontology sidecar documents already capture this context — but the translation workflow doesn't consume them yet.

## Core Insight: References + Ontology = Translation Context

A flat list of string keys (`projectName.label`, `budgetSection.hint`) gives an AI translator almost nothing to work with. But when you combine:

1. **The Definition** — field types, option values, group structure, validation rules
2. **The References Document** — regulatory guidance, documentation, domain-specific context, glossary entries
3. **The Ontology Document** — concept bindings (FHIR, schema.org, ICD-10), vocabulary system mappings, semantic alignment

...you get a rich semantic context that dramatically improves translation quality. An AI translating `mrn.label` from English to Spanish produces better output when it knows:

- The field is bound to `http://terminology.hl7.org/CodeSystem/v2-0203#MR` (Medical Record Number)
- The References Document includes a `glossary` entry defining MRN in the clinical intake context
- The Ontology Document maps the option set to ICD-10-CM codes
- The field is `type: "string"` with a constraint pattern, inside a group labeled "Patient Demographics"

This context turns generic translation into domain-aware, terminology-consistent localization.

## Architecture: Translation Context Assembly

### Context Object

When translating a string key, the system assembles a **TranslationContext** from all available sidecar documents:

```typescript
interface TranslationContext {
  /** The string key being translated */
  key: string;

  /** The source string (from source locale or Definition inline) */
  sourceText: string;

  /** Source and target locale codes */
  sourceLocale: string;
  targetLocale: string;

  /** Field metadata from the Definition */
  field?: {
    type: string;                    // "string", "integer", "choice", etc.
    path: string;                    // Full dot-path in the Definition
    groupLabel?: string;             // Parent group's label
    options?: { value: string; label: string }[];  // For choice fields
    constraint?: string;             // FEL constraint expression
    validationMessages?: Record<string, string>;   // Error code → source message
  };

  /** String property being translated */
  property: StringProperty;          // "label" | "hint" | "description" | "error" | "optionLabel" | ...

  /** Context variant, if applicable */
  contextVariant?: string;           // "short", "pdf", "accessibility", etc.

  /** References bound to this field (from References Document) */
  references?: {
    type: string;                    // "regulation", "glossary", "documentation", "context"
    title?: string;
    content?: string;                // Inline content (most useful for translation)
    uri?: string;                    // External link
    language?: string;               // BCP 47 of the reference content
  }[];

  /** Ontology concept binding (from Ontology Document) */
  concept?: {
    uri: string;                     // e.g. "http://terminology.hl7.org/CodeSystem/v2-0203#MR"
    system: string;                  // e.g. "http://terminology.hl7.org/CodeSystem/v2-0203"
    display: string;                 // e.g. "Medical Record Number"
    code?: string;                   // e.g. "MR"
  };

  /** Vocabulary binding for option sets (from Ontology Document) */
  vocabulary?: {
    system: string;                  // e.g. "http://hl7.org/fhir/sid/icd-10"
    display: string;                 // e.g. "ICD-10-CM"
  };

  /** Already-translated strings in the same locale (for consistency) */
  existingTranslations?: Record<string, string>;

  /** Translation glossary / terminology constraints */
  glossary?: { source: string; target: string; notes?: string }[];

  /** Form-level metadata */
  form?: {
    title: string;
    description?: string;
    domain?: string;                 // Inferred from ontology/references
  };
}
```

### Context Assembly Pipeline

```
Definition ──┐
              ├──→ ContextAssembler ──→ TranslationContext per key
References ──┤                              │
Ontology ────┤                              ▼
Locale(s) ───┘                     AI Translation Engine
                                            │
                                            ▼
                                   Translated strings
                                            │
                                            ▼
                                   Locale Document (target)
```

The assembler walks every translatable key in the source locale, resolves the corresponding Definition item, looks up References and Ontology bindings for that item path, and produces a `TranslationContext`. This context is what gets sent to the AI — not just the raw string.

## Interface Approaches

### Approach A: Studio Locale Tab (Recommended First Step)

A 7th workspace tab in Studio, purpose-built for translation management.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Editor] [Logic] [Data] [Pages] [Theme] [Mapping] [✦ Locale]      │
├──────────┬──────────────────────────────────────────┬───────────────┤
│ Locales  │  Translation Grid                        │  Context      │
│          │                                          │               │
│ ● en  ✓  │  Key              │ en (source)│ fr     │  Field Info   │
│ ○ fr  87%│  ─────────────────┼───────────┼─────── │  type: string │
│ ○ es  0% │  $form.title      │ Annual... │ Rapport│  group: —     │
│ ○ fr-CA  │  projectName.label│ Project   │ Nom du │               │
│   ↳ fr   │  projectName.hint │ Enter the │ Entrez │  References   │
│          │  budget.label      │ Budget    │ Budget │  📄 2 CFR 200 │
│ [+ Add]  │  budget.label@short│ Budget   │ Budget │  📋 Glossary  │
│          │  status.options... │ Yes       │ Oui    │               │
│          │                    │           │        │  Ontology     │
│ ──────── │  [Filter: All ▾] [Untranslated ▾]      │  schema.org/  │
│ Coverage │                                          │  birthDate    │
│ ████░░ 87%│ [🤖 AI Translate All]  [Review Mode]  │               │
│ 142/163  │                                          │  [AI Suggest] │
└──────────┴──────────────────────────────────────────┴───────────────┘
```

**Left panel — Locale List:**
- All loaded Locale Documents with coverage percentage
- Fallback chain visualization (fr-CA → fr)
- Add / remove / duplicate locale
- Import locale JSON / Export locale JSON

**Center — Translation Grid:**
- Two-column (or multi-column for comparison): source locale + one or more target locales
- Keys grouped by namespace: items, `$form.*`, `$shape.*`, `$page.*`, `$component.*`, `$optionSet.*`
- Filter: all, untranslated, fuzzy/AI-generated, manually approved
- Inline editing — click a cell to edit the translation
- Batch AI translate button: translates all missing/selected strings
- Review mode: step through AI-generated translations one by one, approve/edit/reject

**Right panel — Context (the key differentiator):**
- **Field Info**: type, constraints, parent group, option values — from Definition
- **References**: all References bound to the selected field's path, with inline content and links. Regulatory references, glossary entries, documentation — all surfaced for the translator
- **Ontology**: concept binding, vocabulary binding, cross-system equivalences. Tells the translator "this field represents a Medical Record Number in FHIR R4"
- **AI Suggest**: generates a translation for the selected key using the full TranslationContext
- **Preview snippet**: shows the field rendered with the current translation applied (mini form preview)

**AI Translation Features:**
- **Single string**: click AI Suggest in context panel, get a translation with explanation
- **Batch**: select keys or "translate all untranslated" — AI processes each with its TranslationContext
- **Consistency check**: AI reviews all translations for terminology consistency (does "budget" always translate to "presupuesto" or sometimes "presupuesto" and sometimes "gasto"?)
- **Glossary extraction**: AI proposes a glossary from the References/Ontology documents before translating
- **Regional adaptation**: given fr locale, AI generates fr-CA with only the regional differences (fallback handles the rest)
- **Formality control**: user selects register (formal/informal) — AI adjusts (vous/tu, usted/tú)
- **Interpolation safety**: AI preserves `{{expression}}` tokens, warns if a translation changes interpolation structure

### Approach B: Standalone Translation App

A separate lightweight web app for dedicated translators who don't need Studio's full authoring environment.

**When to build this:** When translation teams are separate from form authoring teams, and granting them Studio access is overkill or a security concern.

**Architecture:** Same `TranslationContext` assembly pipeline, same AI backend. The app loads a project bundle (Definition + References + Ontology + source Locale) and produces target Locale Documents. Can be deployed as a static site with no server dependency (AI calls go direct to the LLM API).

**Key difference from Studio:** No form editing. No theme/component/mapping tabs. Read-only Definition view. The entire UX is the translation grid + context panel. Think "Crowdin for Formspec."

**Integration with Studio:**
- Studio "Export for Translation" → bundles Definition + sidecar docs + source locale + target locale stubs
- Translator works in standalone app
- Studio "Import Translations" → merges completed locales back into the project
- Round-trip format is just the standard Locale Document JSON

### Approach C: Embedded Drawer (Lightweight Studio Integration)

Instead of a full tab, a slide-out drawer accessible from any workspace tab.

**When this makes sense:** For form authors who occasionally translate, not dedicated translators. The drawer shows translations for the currently selected field across all locales.

**Combine with:** Approach A or B. The drawer provides quick access; the full tab or standalone app handles bulk work.

### Approach D: MCP-First / Chat-Driven

New MCP tools for locale management:

| Tool | Purpose |
|------|---------|
| `formspec_locale` | CRUD: create, list, select, remove locale documents |
| `formspec_translate` | AI batch translate with context assembly |
| `formspec_locale_coverage` | Coverage report (translated/total per locale) |
| `formspec_locale_diff` | Keys added/removed/changed since locale was last updated |
| `formspec_locale_review` | AI quality review of existing translations |
| `formspec_locale_glossary` | Extract/manage translation glossary from References + Ontology |

**Chat workflow example:**
```
User: "Create Spanish and French locales for this form"
AI:   [assembles context from Definition + References + Ontology]
      [translates all 163 keys with domain-aware context]
      "Created es locale (163/163 strings) and fr locale (163/163 strings).
       Used FHIR R4 terminology for clinical fields and 2 CFR 200
       glossary for budget terms. Review?"

User: "The Spanish should use formal register (usted)"
AI:   [re-translates with formality constraint]
      "Updated 23 strings that used informal register."

User: "Create fr-CA from fr with Quebec-specific terms"
AI:   [diffs fr against fr-CA conventions]
      "Created fr-CA with 12 regional overrides. Fallback to fr for
       remaining 151 strings."
```

**This approach is the foundation for all others.** The MCP tools power the Studio tab's AI features, the standalone app's backend, and the chat interface. Build these first.

## Recommended Phasing

### Phase 1: Context Assembly + MCP Tools
Build the `TranslationContext` assembler and MCP tools. This unlocks AI-driven translation in the chat interface immediately, with no UI work.

**Key deliverables:**
- `TranslationContext` type and assembler (consumes Definition + References + Ontology)
- `formspec_locale` MCP tool (CRUD)
- `formspec_translate` MCP tool (batch AI translate with context)
- `formspec_locale_coverage` MCP tool
- `formspec_locale_diff` MCP tool
- Glossary extraction from References `type: "glossary"` entries

### Phase 2: Studio Locale Tab
Add the Locale workspace tab to Studio with the translation grid, context panel, and AI integration.

**Key deliverables:**
- Locale tab UI (grid, context panel, locale list)
- `formspec-core` locale handlers already exist — wire them to the UI
- AI suggest/batch translate using Phase 1 MCP tools
- Review mode for AI-generated translations
- Coverage metrics and filtering

### Phase 3: Standalone Translation App (If Needed)
Extract the translation grid + context panel into a standalone app for dedicated translation teams.

**Key deliverables:**
- Standalone deployment (static site or lightweight server)
- Project bundle import/export
- Translation memory across projects
- TMS integration hooks (Crowdin, Lokalise, Phrase)

### Phase 4: Advanced AI Features
- Glossary management UI (extract from References/Ontology, manual additions, enforce during translation)
- Translation memory (cross-project terminology consistency)
- Pluralization assistant (generates plural variants for complex languages like Arabic/Polish)
- Quality gate: AI reviews translations before locale document is "published"
- Change propagation: when source locale changes, AI identifies which target translations are stale and suggests updates

## How References and Ontology Improve Translation Quality

### Without context (raw key → translation):
```
Key:    indirectCostRate.label
Source: "Indirect Cost Rate"
AI:     "Taux de coût indirect"  ← generic, possibly wrong domain term
```

### With References context:
```
Key:    indirectCostRate.label
Source: "Indirect Cost Rate"
Reference (type: regulation):
  "2 CFR § 200.414 — Indirect (F&A) Costs"
  "The indirect cost rate is a percentage negotiated with the
   cognizant federal agency..."
Reference (type: glossary):
  "Indirect Cost Rate: The percentage applied to modified total
   direct costs to recover facilities and administrative costs."

AI: "Taux de coûts indirects (F&A)"  ← uses the regulatory term
```

### With Ontology context:
```
Key:    mrn.label
Source: "Medical Record Number"
Concept: http://terminology.hl7.org/CodeSystem/v2-0203#MR
System:  HL7 FHIR R4
Display: "Medical Record Number"
Equivalent: { system: "https://schema.org", code: "identifier" }

AI (es): "Número de Historia Clínica"  ← correct clinical Spanish term
         (not "Número de Registro Médico" which is a literal translation)
```

### With both:
The AI can build a domain glossary *before* translating, ensuring every term is consistent across all 163 strings. It knows "MRN" in FHIR context should match how the same concept appears in ICD-10 vocabulary bindings. It knows "indirect cost rate" has a specific regulatory definition and should use the standard French accounting term, not a literal translation.

## Glossary Extraction Strategy

References and Ontology documents contain implicit glossary material:

| Source | Extraction |
|--------|------------|
| Reference `type: "glossary"` | Direct — content is glossary entries |
| Reference `type: "context"`, `audience: "agent"` | AI extracts domain terms from content |
| Reference `type: "regulation"` | AI extracts defined terms from regulatory text |
| Ontology `concept.display` | Standard term for the concept (e.g., "Medical Record Number") |
| Ontology `vocabulary.display` | Standard terminology system name (e.g., "ICD-10-CM") |
| Ontology `equivalent.display` | Cross-system term mappings |
| Definition `optionSets` values | Domain-specific choice labels |

The glossary becomes a constraint during translation: the AI must use glossary terms consistently and flag any deviation.

## Open Questions

1. **Where does the AI call happen?** Browser-side (user provides API key) vs. server-side (Formspec-hosted translation service)? For Studio, browser-side is simpler. For standalone app, either works.

2. **Translation memory persistence.** Should approved translations feed into a project-level or org-level translation memory? If so, where is it stored? Extension namespace (`x-translationMemory`) or separate artifact?

3. **Glossary as a first-class artifact?** Currently implicit (extracted from References + Ontology). Should there be a `glossary.schema.json` sidecar document? Probably not yet — extract from what we have, add a schema only if the implicit approach proves insufficient.

4. **Review workflow.** Should AI-generated translations be marked as "fuzzy" (needing human review) like TMS tools do? The locale schema's `extensions` namespace could carry `x-status` per key, but that's heavyweight. Simpler: a separate review state in Studio that doesn't persist to the locale JSON.

5. **Multi-locale comparison.** Translators often want to see en | fr | es | de side by side. The grid should support N columns, but screen real estate is limited. Horizontal scrolling? Column selection?

## Non-Goals

- **Building a full TMS (Translation Management System).** We're building a translation *interface* for Formspec artifacts, not competing with Crowdin/Lokalise. Integration with those tools (via import/export) is a better long-term strategy.
- **Machine translation without AI.** No plans for rule-based MT or integration with Google Translate / DeepL as a non-AI fallback. The value proposition is context-aware AI translation, not generic MT.
- **Locale negotiation.** How a host app selects the right locale (Accept-Language, user preference, URL-based) is out of scope — the spec already defers this to the host.
