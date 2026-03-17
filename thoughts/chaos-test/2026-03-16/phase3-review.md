# Phase 3: Independent Sanity Check

## Reviewer's Top 3 for This Week

1. **B7** — Branch expression consolidation (silent data loss, localized fix, clearly correct)
2. **U7** — `number("")` returns null (correctness bug, self-contained)
3. **B5 + U3 + U6 bundle** — Evaluation helper cleanup (3 low-risk fixes, same area)

## Key Pushbacks

### B4/B6 — DEFER (fix is too shallow)
- Regex-based rebasing will fail on nested repeats
- The engine needs a proper "repeat scope" model, not another string-manipulation heuristic
- Workaround exists (`$field` sibling references)
- Recommendation: Design scope model first, ship next week

### B2 — Adding a layer to avoid fixing the abstraction
- `_resolvePageGroup` is a resolution helper bridging a leaky abstraction
- Better: pages should own their group path explicitly
- B3 and B2 have ordering dependency — must ship together

### U5 — Whack-a-mole
- Merging dispatches for this one case doesn't fix the pattern
- The real fix is a transaction/batch mechanism in core dispatch
- Every future multi-step helper will have the same issue

### B9 — Underspecified
- `wasLast` flag is a heuristic, not a proper "pinned position" concept
- Needs more design before implementing

### C1 — Simpler alternative exists
- Instead of making `formspec_create` conditionally smart, make `formspec_load` cheap/implicit
- Don't add conditional behavior when reducing friction suffices

## Risk Assessment (reviewer)

| Fix | Risk | Notes |
|-----|------|-------|
| C2, C3 | Trivial | Ship immediately |
| U6, B1, U3, B5, B8, U2 | Low | Safe, localized |
| U7, B7 | Medium | Well-testable, behavior changes |
| B3/B2, C1 | Medium-High | Identity/lifecycle changes |
| B4/B6 | **High** | Core path resolution, insufficient design |
| U5, B9 | **High** | Architecture-level changes |

## Systemic Patterns Identified

1. **Engine path resolution has no scope model** — all repeat group issues stem from string-manipulation heuristics
2. **Studio-core helpers don't compose atomically** — no transaction mechanism in core dispatch
3. **MCP layer has no consistency enforcement** — schema drift will accelerate
4. **Page/group duality is a leaky abstraction** — users see one concept, architecture has two

## Conflicts/Dependencies

- **B3 must ship before or with B2** — resolution helper depends on predictable keys
- **B5 and U7 could interact** — null propagation changes validation results
- **U5 and B9 both touch dispatch/reconciliation** — non-trivial interaction surface
