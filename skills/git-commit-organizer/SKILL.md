---
name: git-commit-organizer
description: Organize uncommitted Git changes into clean, logical commits with semantic messages and deterministic staging. Use when asked to review local diffs, split mixed changes into coherent commit units, create multiple commits in reviewable order, or clean up messy working trees into a clear history.
---

# Git Commit Organizer

Analyze working tree changes and turn them into a clean, reviewable commit series.

## Workflow

1. Inspect repository state.
2. Propose logical commit groupings and commit order.
3. Share planned commit messages before committing.
4. Stage only files or hunks for one concern.
5. Commit and verify each commit.
6. Repeat until all intended changes are committed.
7. Confirm final clean state and summarize.

## 1) Inspect Repository State

Run:

```bash
git status --short
git diff
git diff --staged
```

Include new, modified, deleted, and renamed files in the analysis.

## 2) Build Logical Groupings

Group by coherent intent, such as:

- Feature additions or enhancements
- Bug fixes
- Refactors or cleanup
- Test updates
- Documentation updates
- Configuration changes
- Schema or migration changes

Keep each commit independently reviewable and revertible.

## 3) Order Commits Intentionally

Use this default order unless a stronger dependency exists:

1. Setup or infrastructure changes
2. Core functionality changes
3. Tests validating those changes
4. Documentation updates

If one change depends on another, commit the dependency first.

## 4) Craft Commit Messages

Use concise imperative subjects and semantic prefixes when appropriate.

Rules:

- Use prefixes like `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `build:`
- Keep subject line at 50 characters or fewer
- Describe what the commit does, not that files changed
- Avoid generic subjects like "updates" or "changes"

## 5) Stage Precisely

For whole-file grouping:

```bash
git add <file1> <file2>
```

For mixed concerns in one file, stage interactively:

```bash
git add -p <file>
```

Do not stage unrelated hunks together.

## 6) Commit and Verify

For each group:

```bash
git commit -m "<type>: <subject>"
git show --stat --oneline HEAD
```

Confirm the commit contains only the intended concern before moving on.

## 7) Handle Edge Cases

- Skip submodules and other advanced Git structures unless explicitly requested.
- If grouping is ambiguous and risk is meaningful, ask for clarification.
- Leave no uncommitted changes unless explicitly asked to keep some unstaged.

## Communication Contract

Before executing commits:

- Explain grouping strategy
- List planned commits in order
- Show exact commit message subjects

After execution:

- Confirm final state with `git status --short`
- Summarize the created commit series
