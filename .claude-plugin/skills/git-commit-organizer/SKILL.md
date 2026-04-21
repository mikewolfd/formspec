---
name: git-commit-organizer
description: >-
  Organizes uncommitted work into logical, well-described commits. Analyzes
  diffs, groups changes by intent (feature, fix, refactor, docs, tests,
  chore), stages deliberately (whole files or hunks), and writes clear
  messages. Use when the user has messy or large uncommitted changes, asks to
  split commits, clean up history before push, commit properly, organize
  commits, or turn work into coherent commits. Common user phrases include
  help me commit, commit these changes, and split this into commits.
---

# Git commit organizer

## When to use

- Many unrelated edits in one working tree
- User wants **several small commits** instead of one giant commit
- Mix of fixes, refactors, tests, and docs that should not ship as one unit
- Preparing a branch for review or merge (readable history)

**Do not use** for: teaching git basics with no commit intent, or when the user only wants a single message for already-staged work (a lighter pass is enough).

## Principles

1. **One commit, one story** — each commit should be revertible and reviewable on its own.
2. **Order matters** — if commit B depends on files from commit A, commit A first (builds/tests stay green between commits when possible).
3. **Match project conventions** — follow existing `git log` style in the repo (prefixes, imperative mood, body wrapping at ~72 cols).

## Workflow

### 1. Inventory

Run (from repo root):

```bash
git status
git diff          # unstaged
git diff --cached # staged
```

If needed, summarize by path: `git diff --stat` and `git diff --stat --cached`.

Classify each changed path: **feature**, **bugfix**, **refactor**, **test**, **docs**, **build/chore**, **format-only**. Note coupling: files touched by two concerns may need **hunk-level** splits.

### 2. Plan commit buckets

Produce a short **commit plan** (for the user and for execution):

| Order | Intent (title) | Paths / scope | Risks (e.g. must pair with) |
|-------|----------------|---------------|-----------------------------|
| 1 | … | … | … |

Merge buckets that are too small to matter **only** if they share one intent and one rollback story.

### 3. Stage and commit each bucket

For each planned commit, in order:

1. **Unstage everything** if the tree is messy: `git reset` (mixed; does not discard edits).
2. Stage only what belongs in this commit:
   - Whole files: `git add path/to/file`
   - **Hunks**: `git add -p path/to/file` (or patch mode in the editor).
3. Verify the index matches intent: `git diff --cached`.
4. **Commit** with a message that states *why* and *what* in the first line; optional body for context, breaking changes, or ticket refs.
5. Repeat until `git status` is clean (or only intentional leftovers remain).

If a change is impossible to split cleanly without huge conflict risk, **one commit** with a clear message beats a broken tree—say so explicitly.

### 4. Verify

```bash
git log --oneline -n <number of new commits>
git show --stat HEAD   # spot-check latest
```

If the project has quick checks (e.g. `cargo check`, `npm test`), run the **minimal** command the user cares about after commits that touch buildable code.

## Commit message baseline

- **Subject**: imperative, ~50 chars or less when feasible; no trailing period.
- **Body**: what changed and why, not implementation diary, unless the team expects it.
- **Scopes**: align with repo (`feat(wos-lint): …`, `fix(fel-core): …`) if `git log` shows that pattern.

## Edge cases

- **Generated files** (lockfiles, golden traces): commit with the change that caused regeneration, or alone if the regeneration is the whole story—never half-update generated pairs.
- **Partial tests for partial features**: if tests only pass after a later commit, **reorder buckets** or combine so intermediate commits are not permanently red.
- **Secrets**: never commit; stop and tell the user to rotate and purge from history if needed.

## Handoff (optional)

If someone else (or another tool) will run the git commands, pass them the **commit plan** table, the intended **stage boundaries** (paths and, when relevant, which hunks), and the proposed **subject lines** so execution matches the plan.
