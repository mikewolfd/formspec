# Phase 3: Independent Sanity Check

## Reviewer: Opus (no codebase access, context-free assessment)

---

## Fix-by-Fix Assessment

### B1 (Path resolution) — "Symptom fix, possibly correct anyway"
- Rejecting dot-path + parentPath is valid IF no legitimate use case exists. The "relative addressing" feature being untested supports killing it.
- **Concern:** Verify no implicit reliance on relative addressing exists beyond the 3 known tests.
- **Risk:** Medium-High. Changes path resolution semantics.
- **Verdict:** Ship it, but verify thoroughly.

### B5 (Money comparison) — "Genuine root cause fix"
- Clean. Mirrors existing pattern. No objections.
- **Concern:** Python FEL evaluator MUST be fixed simultaneously — not "maybe." Conformance divergence is worse than the original bug.
- **Risk:** Medium. Core evaluation change needs thorough edge case coverage.
- **Verdict:** Ship it. Fix Python at the same time.

### U2 (Screener diagnostic) — "Symptom fix"
- **Pushback:** The proposal tries to both add screener fields to the reference set AND reject them with a specific error. Pick one: either they're visible or they're not. Adding them to `FELReferenceSet` implies resolvability, which contradicts namespace isolation.
- **Recommendation:** Force a design decision on screener field namespace semantics before implementing. A better error message alone may be sufficient.
- **Verdict:** Defer until design decision is made.

### B6/U5/U3 (Zod schema drift) — "Symptom fix for systemic problem"
- Individual fixes are correct. But this is the third instance of a manual sync failure.
- **Recommendation:** Write a conformance test that extracts property keys from studio-core prop types and asserts MCP Zod schemas accept them.
- U3's `addGroup` dispatch fix is a genuine bug at the right layer.
- **Interaction with B1:** Page assignment involves path resolution. If group path contains dots and page is set, B1's rejection could fire. Test together.
- **Verdict:** Ship atomically. Add conformance test.

### B3 (update_rule) — "Missing API surface"
- Straightforward. Underlying capability exists.
- **Workaround exists:** remove + re-add. Annoying but functional.
- **Verdict:** Defer. Not blocking.

### B4 (Trace variable) — "Root cause fix with scope creep risk"
- The MCP classification fix is correct.
- **Pushback:** Adding `variableDependents` delegation is one of potentially many missing delegations. Fix one without auditing the rest = asking for the same bug report next month.
- **Recommendation:** Audit all `IProjectCore` delegations in `Project` before fixing just this one.
- **Verdict:** Defer until delegation audit.

### U6 (Describe enrichment) — "Proportionate"
- Simple additive change. No behavioral risk.
- **Verdict:** Defer. Nice-to-have.

### U1 (Tool descriptions) — "Correct layer, correct fix"
- Minimal risk. But 3/5 persona confusion suggests the abstraction itself might be the problem, not just the docs.
- **Verdict:** Defer. Ship when convenient.

---

## Conflict Detection
- **B1 + B6/U3 interaction:** Page assignment involves path resolution. Need joint testing.
- **B6/U3 must be atomic:** Adding `page` to Zod without `addGroup` dispatch = silent ignore (worse than current state).
- **No other conflicts.**

---

## Priority Ranking (Ship 3 This Week)

1. **B5 (Money comparison)** — Highest user impact, cleanest fix, mirrors existing pattern.
2. **B6/U5/U3 (Zod drift + addGroup)** — Silent data loss from stripped properties is the most confusing bug class.
3. **B1 (Path resolution)** — Data corruption severity, simple defensive fix.

---

## Systemic Issues Identified

### 1. MCP-to-Studio-Core Schema Synchronization
Three bugs from the same class. Recommendation: write a conformance test that validates Zod schemas against studio-core TypeScript interfaces.

### 2. Studio-Core Delegation Gaps
B4 reveals missing delegation. Could be one of many. Recommendation: audit `IProjectCore` → `Project` delegation completeness.

### 3. MCP Handler Classification Logic
Both U2 and B4 involve MCP failing to classify reference types. Consider extracting a shared `classifyReference(input)` function to prevent future omissions.

---

## Final Recommendation

Ship B5, B6/U5/U3, and B1 this week. Write a Zod conformance test. Audit studio-core delegations before fixing B4. Force screener namespace design decision before U2. Everything else can wait.
