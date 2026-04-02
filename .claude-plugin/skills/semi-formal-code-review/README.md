# Semi-Formal Code Review Skill

`semi-formal-code-review` is an agent skill for reviewing PRs, diffs, and patches with a disciplined, evidence-first workflow. It is designed to push review output past surface commentary and toward grounded findings, function traces, data-flow checks, and explicit verdicts.

The skill is informed by *Agentic Code Reasoning* by Shubham Ugare and Satish Chandra (`arXiv:2603.01896v2`). This repository includes the paper as `Agentic Code Reasoning - arXiv 2603.01896v2.pdf`, and the skill adapts its semi-formal reasoning approach to practical code review.

## Installation

Install directly from this GitHub repository with `npx skills`:

```bash
npx skills add https://github.com/mikewolfd/semi-formal-code-review-skill --skill semi-formal-code-review
```

If you want to target a specific agent explicitly:

```bash
npx skills add mikewolfd/semi-formal-code-review-skill --skill semi-formal-code-review --agent codex
```

## When It Triggers

Use this skill when asking an agent to review changes, for example:

- `review this PR`
- `review these changes`
- `check this diff`
- `review the patch`

It is meant for code review, not general implementation help.

## What The Skill Enforces

- Evidence-first review comments with concrete `file:line` support
- Reading changed implementations, not just diff summaries
- Tracing important callers and callees for changed code paths
- Inspecting relevant tests before claiming coverage
- Explicitly calling out missing coverage or unresolved gaps
- Findings-first output, ordered by severity

## Review Output Shape

The skill directs the agent to produce a structured review with:

1. Patch summary
2. Function trace
3. Data flow and invariants
4. Test behavior and edge cases
5. Findings
6. Conclusion with a final verdict

## Repository Contents

- `SKILL.md`: the skill definition and operating instructions
- `Agentic Code Reasoning - arXiv 2603.01896v2.pdf`: the source paper that informed the workflow

## Notes

This is a stricter adaptation of the paper's reasoning style for software review. It does not claim to reproduce the paper verbatim; it applies the same general method to produce higher-signal code reviews.
