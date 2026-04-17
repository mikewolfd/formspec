# Changelog generation fails document-type detection

**Status:** Proposed
**Date:** 2026-04-17
**Raised by:** benchmark harness work (`benchmarks/tasks/grant-report/`)

## Problem

`generate_changelog(parent_def, child_def, child_url)` in `formspec._rust` produces a
document that `detect_document_type` cannot classify. When the validator's
changelog-generation pass (`src/formspec/validate.py:493 _pass_changelog_generation`)
then pipes the generated document through `lint()` (same file, line 531), the
linter's pass-1 document-type detection emits:

```
E100  $  Cannot determine document type
```

Reproducer: place the grant-report base + short + long definitions in a single
directory (`examples/grant-report/` does exactly this) and run
`python3 -m formspec.validate examples/grant-report/`. The validator runs clean
on each definition individually; it fails on the generated changelog.

The benchmark harness works around this by scoping `benchmarks/tasks/grant-report/`
to the short form only (see `benchmarks/README.md` §"Why response fixtures are excluded").
That workaround must not become permanent — it hides the defect.

## Root cause (hypothesis)

Either:

1. `generate_changelog` returns a document shape that does not carry the
   `$formspecChangelog` (or equivalent) root marker `detect_document_type`
   keys off, OR
2. `detect_document_type` has a gap — it knows about definition/theme/component/
   mapping/etc. but not about changelogs, OR
3. The wrapper envelope the Rust changelog generator emits is stale relative to
   the current changelog schema (schema was renamed or the envelope key changed
   and the generator was not updated).

Quick verification step: in a Python REPL, run
`generate_changelog(...)` and print the top-level keys of the returned dict;
cross-reference against `schemas/*.schema.json` for a changelog envelope marker.

## Impact

- Anyone running the directory-based validator over a multi-version definition
  tree sees a spurious E100.
- The benchmark harness had to narrow scope to avoid tripping this.
- Downstream consumers of `generate_changelog` who then validate the output
  with `lint()` hit the same wall.

## Proposed fix

1. Print the actual shape of the generator output (one command).
2. If missing/wrong envelope: fix the generator in
   `crates/formspec-changeset/` (or wherever `generate_changelog` lives on
   the Rust side) to emit the correct root marker.
3. If `detect_document_type` is missing a changelog branch: add it in
   `crates/formspec-core/src/document_type.rs` (or equivalent) and grow
   the `DocumentType::from_root` / `schema_key` mapping.
4. Add a fixture under `tests/conformance/` asserting that a generated
   changelog round-trips through `detect_document_type` → `lint()` clean.
5. Once fixed, widen the benchmark task `grant-report` to include base +
   long alongside short, and remove the workaround note from
   `benchmarks/README.md`.

## Out of scope

- Changing the generator's change-object shape or semver-impact heuristics.
- Extending the validator to handle generator failures more gracefully —
  that's a follow-on if step 3 needs breathing room.

## References

- `src/formspec/validate.py:493-528` — pass that triggers the defect
- `src/formspec/validate.py:531` — the `lint(changelog)` call that fails E100
- `benchmarks/README.md` — current workaround documentation
- `benchmarks/tasks/grant-report/` — scoped-down benchmark task
