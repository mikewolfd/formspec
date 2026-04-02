---
name: semi-formal-code-review
description: >
  Use when the user asks to review code changes, a PR, a diff, or a patch.
  Apply a semi-formal review workflow: explore methodically, ground claims in
  file:line evidence, trace callers/callees and tests, and produce a
  structured findings-first review.
---

# Semi-Formal Code Review

Use this skill when the user asks for a review of code changes.

This skill is informed by *Agentic Code Reasoning* by Shubham Ugare and Satish Chandra (`arXiv:2603.01896v2`, March 4, 2026), bundled locally as `Agentic Code Reasoning - arXiv 2603.01896v2.pdf`.

The paper does not publish this exact code-review workflow, but it does support the underlying method: semi-formal, evidence-first reasoning with explicit traces, data flow, semantic properties, and formal conclusions. This skill is a stricter code-review adaptation of that method.

## Trigger

Activate when the user asks for a review of changes against a codebase, for example:

- "review this PR"
- "review these changes"
- "do a code review"
- "check this diff"
- "review the patch"
- "what do you think of these changes?"

Do not activate for general code questions or implementation help.

## Non-Negotiables

- Treat the review as static analysis unless the user explicitly asks for execution.
- Never guess. Every substantive claim must cite file:line evidence from code you actually read.
- Read implementations, not just names. Check for shadowing, framework behavior, configuration, constants, and type definitions when they matter.
- Trace at least one level of callers and callees for changed functions, and inspect relevant tests that exercise the changed path.
- If no tests cover a changed path, call that out explicitly as a finding.
- If a required section cannot be completed, state the gap explicitly instead of filling it with speculation.
- Verdicts follow evidence, not the other way around.

## Scope Discovery

Determine what to review from the user request:

- **PR number**: fetch the PR diff and summary from the available repo or platform tools.
- **Branch comparison**: inspect `git diff <base>...<head>`.
- **Staged changes**: inspect `git diff --cached`.
- **Unstaged changes**: inspect `git diff`.
- **Specific commits**: inspect `git show <commit>` or `git diff <commit1>..<commit2>`.

If the user does not specify a scope, inspect uncommitted changes first.

## Exploration Protocol

Use lightweight structured notes while exploring.

Before reading a file:

```text
HYPOTHESIS H[N]: [What you expect to find and why]
EVIDENCE: [What from the diff or previously read files motivates this]
CONFIDENCE: high | medium | low
```

After reading a file:

```text
OBSERVATIONS from [filename]:
  O[N]: [Key observation, with line numbers]

HYPOTHESIS UPDATE:
  H[N]: CONFIRMED | REFUTED | REFINED - [explanation]

UNRESOLVED:
  - [Remaining questions]
  - [Other files/functions to examine]

NEXT ACTION RATIONALE: [Why read another file, or why enough evidence exists]
```

During exploration:

- Read every file touched by the diff.
- For changed functions, trace at least one level of important callees and callers when that affects behavior.
- Inspect tests that exercise the changed path, and verify their assertions before claiming coverage.
- Check related configuration, constants, schemas, and type definitions when the patch depends on them.
- If the code has materially different branches or error paths, trace each relevant branch instead of stopping at the happy path.
- If source for a relied-on library or framework behavior is unavailable, state that explicitly and lower confidence.

## Review Structure

Produce a structured findings-first review with these sections.

### 1. Patch Summary

State:

- what the patch changes
- the stated intent
- directly affected functions or methods with file:line
- important callers with file:line, or `none found`

### 2. Function Trace

Include a trace table for every touched or behavior-critical function:

```markdown
| Function / Method | File:Line | Parameters / Inputs | Return / Output | Verified Behavior |
| --- | --- | --- | --- | --- |
| ... | ... | ... | ... | ... |
```

### 3. Data Flow And Invariants

For each key variable or state transition introduced or modified by the patch, note:

- where it is created
- where it is modified
- where it is used
- whether it escapes scope

Also list semantic properties or invariants the patch relies on, with evidence and what would break them.

### 4. Test Behavior And Edge Cases

For each relevant test:

- name and file:line
- whether it will pass, fail, or behave differently under the patch
- the execution trace that supports that claim

For edge cases, enumerate only concrete scenarios that are plausible from the code or exercised by tests. State:

- the scenario
- patch behavior
- risk level
- whether existing tests cover it

If no tests cover the changed path, say so explicitly.

### 5. Findings

Each finding should include:

```text
FINDING [N]:
  Severity: BLOCKER | WARNING | NIT | OBSERVATION
  Category: correctness | performance | security | maintainability | test-coverage
  Location: [file:line]
  Description: [concise description]
  Evidence chain: [premise/observation/trace that supports the finding]
  Suggestion: [concrete fix or next step, if applicable]
```

Order findings by severity. Prioritize behavioral regressions, correctness bugs, broken assumptions, and missing test coverage over style concerns.

### 6. Conclusion

End with:

```text
VERDICT: APPROVE | REQUEST CHANGES | NEEDS DISCUSSION

Justification:
  - The patch [does / does not] achieve its stated intent because [evidence]
  - Coverage of changed paths: ADEQUATE | INSUFFICIENT
  - Confidence: HIGH | MEDIUM | LOW
```

## Anti-Patterns To Avoid

- Name-trusting: never assume a function does what its name implies.
- Builtin assumption: check for shadowing of standard names and framework overrides.
- Single-path reasoning: trace relevant branches and error paths, not just the happy path.
- Phantom tests: do not claim coverage unless you read the test and verified the assertion path.
- Premature conclusion: do not anchor on a verdict before tracing the affected code paths.

## Step Budget

Use up to 100 tool-use steps. Aim for 20 to 40 on typical reviews, and spend more when patches touch shared utilities, cross module boundaries, or error-handling behavior.
