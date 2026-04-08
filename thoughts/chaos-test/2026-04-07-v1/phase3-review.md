# Phase 3: Independent Sanity Check

**Date:** 2026-04-07
**Reviewer:** Independent technical reviewer (no codebase access, opus model)

## Ship 3 This Week (Reviewer's Pick)

1. **FIX 1** (add `status: 'draft'`) — 1-line fix, 4 of 5 forms failing. "Not shipping this immediately is malpractice."
2. **FIX 2 + FIX 3 allowlist-only** — Kill phantom Checkbox + prevent future prop leaks. Together = all exports pass schema validation.
3. **FIX 4** (date coercion at context entry) — Date constraints don't work. Spec is explicit. Coerce at JSON→FEL boundary, NOT in the evaluator.

## Key Pushback

### Split FIX 3: Allowlist now, `_meta` refactor later
- The allowlist alone (20 lines of code) prevents any authoring property from leaking into export.
- The `_meta` namespace refactor is hundreds of lines across multiple packages. It's the *correct* long-term fix but not a prerequisite for the allowlist.
- "Don't let the perfect be the enemy of the good."

### FIX 4: Pick one — coerce at context entry, not in the evaluator
- Coercing in `compare()` is a slippery slope to JavaScript-style implicit coercion.
- Coercing at context entry (where JSON values enter FEL world) keeps the evaluator type-strict.
- The spec citation explicitly says "the engine MUST resolve `$field` for a date-typed field as a FEL `date` value" — that's context entry, not comparison-time.

### FIX 7 is a band-aid over a broken data model
- A canonical resolution function only helps if everyone calls it. Anyone who forgets recreates the bug.
- The real question: should TreeNode store full resolved paths or leaf keys? That's a data model question, not a utility function.
- "A helper function that fixes up bad data at read time is a band-aid. A data model that prevents bad data at write time is a fix."

### FIX 10 (type inference): Bound the scope
- "Type inference" is a rabbit hole. The 3 bugs it addresses are all simple cases.
- Rename to "operator type checking" — comparison operator type validation + sigil validation.
- Don't call it "type inference" because the name sets unbounded expectations.

### Deprioritize aggressively: UX-3, UX-10
- UX-3 (constraint-aware sample data) risks scope creep — it's basically a constraint solver for a sample data generator. Consider just adding a note "sample data may not satisfy constraints."
- UX-10 (dirty tracking) is a feature, not a fix. "Cross-layer" is a red flag for complexity.

### UX-2 (.strict() on Zod) only matters with FIX 3
- Without the allowlist, `.strict()` on MCP locks the front door while studio UI leaves the back door open.
- Ship FIX 3's allowlist before or simultaneously.

### FIX 5 (eval ordering) — Don't rush it
- Dependency graph ordering in eval pipelines is where subtle bugs hide.
- Take another week to design carefully. Don't ship with Tier 1.

## Conflict Detection

| Pair | Risk |
|------|------|
| FIX 3 + UX-2 | Ordering dependency — ship FIX 3 first or simultaneously |
| FIX 7 + FIX 8 | Both touch path normalization — design together |
| FIX 4 + FIX 5 | Both affect eval pipeline — test together |
| FIX 1 | Fully independent — ship immediately |

## Risk Assessment

| Fix | Risk | Notes |
|-----|------|-------|
| FIX 1 | Very low | 1-line default |
| FIX 2 | Low | Vocabulary constants |
| FIX 3 (allowlist only) | Low-medium | Export-time filter, testable |
| FIX 3 (+ _meta refactor) | **High** | Touches node read/write across packages |
| FIX 4 (context entry) | Medium | Well-scoped if at boundary |
| FIX 5 | **Medium-high** | Subtle ordering bugs |
| FIX 6 | Low | Guard clause |
| FIX 7 | **Medium-high** | Consolidation refactor |
| FIX 8 | Medium | Expression rewriting is tricky |
| FIX 9 | Low | Isolated change |
| FIX 10 (bounded) | Medium | If scoped to operator checking |
| UX-10 | **High** | Cross-layer state tracking |

## The Systemic Issue

> "There is one root cause behind at least 7 of these bugs: the component tree node is an untyped bag of properties."

The reviewer identifies that BUG-12, BUG-13/15, BUG-14, BUG-16, BUG-9, BUG-10 all exist because `TreeNode` is `{ [k: string]: unknown }`. The real fix is a discriminated union keyed on component type with authoring state in a separate store. But the allowlist is the pragmatic 80/20 solution — ship it now, design the typed TreeNode for when there's a week to do it right.
