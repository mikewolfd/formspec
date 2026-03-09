# Formspec Studio — Thought Artifacts

Design documents, plans, ADRs, and testing strategies for Formspec Studio (the visual form builder).

## Product & Vision

| File | Description |
|------|-------------|
| `product-requirements-v2.md` | **PRD for Studio v2.** Vision, design language (document-first, selection-driven, progressive disclosure), editing experience, and interaction patterns across field management, logic, validation, styling, and data mapping. |

## Design

| File | Description |
|------|-------------|
| `design-visual-spec.md` | **Visual design specification.** Complete design system: dark theme with warm amber accents, Fraunces/Plus Jakarta Sans typography, four-zone collapsible workspace layout, component specs, WCAG 2.1 AA accessibility, and animation principles. |
| `design-review-v2.md` | **Design review & prioritized task list.** Comprehensive review against spec/schema parity goals. Prioritized work breakdown (P0-P7) covering spec violations, core editor features, document authoring, and a smoke test scenario. |

## Architecture Decisions

| File | Description |
|------|-------------|
| `adr-0000-inspector-ux-redesign.md` | **Inspector panel UX redesign (ADR 0000).** Shifts inspector from spec-centric model to user-centric "question + answer type + rules + appearance" mental model. Three-tier progressive disclosure (Simple/Standard/Advanced), zero-jargon vocabulary. |

## Implementation Plans

| File | Description |
|------|-------------|
| `plan-v1-implementation.md` | **V1 implementation plan.** Reuse-first architecture, four-zone workspace, tree editor, import/export, validation pipeline, four-phase rollout with milestones. |
| `plan-v1-phase1-tasks.md` | **V1 Phase 1 granular tasks.** Detailed task breakdown: app scaffolding, core UI components, tree editor, form preview, properties panel, validation integration. Code examples included. |
| `plan-v2-architecture.md` | **V2 architecture & product strategy.** Replaces tab-based artifact model with unified composite editing surface. Sidebar drawers, 3-tier presentation cascade, guided-first UI for non-technical authors. |
| `plan-v2-roadmap.md` | **V2 implementation roadmap.** 26-step, three-phase build plan from "Google Forms Moment" through power-user features to integration (mappings, extensions, versioning). Tech stack and verification strategy. |
| `plan-v2-sidecars.md` | **V2 sidecar features.** Mappings and Changelog/History editing. Field-centric authoring UX, inline properties + global drawers, four-phase delivery with TDD approach. |
| `plan-definition-assembler.md` | **Definition Assembler technical spec.** `$ref` resolution, key namespacing, FEL path rewriting. Documents current state, gaps, and 5-phase TDD plan for missing FEL rewriting. |
| `plan-documentation.md` | **Documentation strategy.** Inline JSDoc on public APIs, automated TypeDoc/LLM markdown generation, priority-ordered file list, build integration. |

## Testing

| File | Description |
|------|-------------|
| `testing-phase2-e2e.md` | **Phase 2-3 integration & E2E tests.** 7 tasks, ~34 new tests across unit (Vitest), E2E (Playwright), and integration layers. Covers preview rendering, import/export, selection sync, JSON editor. |
| `testing-prod-mvp.md` | **Production MVP testing strategy.** Three-layer testing approach with quality gates and prioritized scenario matrix (P0/P1/P2) for critical user workflows. |
