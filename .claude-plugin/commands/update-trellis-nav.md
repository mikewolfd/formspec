---
description: Launch a swarm of agents to update all Trellis spec and Rust crate reference maps, then update SKILL.md
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
argument-hint: [--specs-only | --crates-only | --skill-only | spec-or-crate-name]
---

Update the trellis-core skill's reference maps and SKILL.md navigator.

Trellis has **no separate JSON Schema files** — structural authority lives in CDDL embedded in `trellis/specs/trellis-core.md` §28 Appendix A, and Rust crates under `trellis/crates/` are the byte authority (ADR 0004). This command therefore walks two corpora: spec markdown under `trellis/specs/` and Rust crate source under `trellis/crates/`.

## Step 1: Discover source files

### Specs

Skip the archive — `specs/archive/` is non-normative per `trellis/CLAUDE.md`.

```bash
find trellis/specs/ -maxdepth 1 -name '*.md' ! -name 'README.md' | sort
```

The README is excluded because it is a narrative reading-order guide, not a normative document. New top-level normative specs are auto-picked up by this glob.

### Crates

```bash
find trellis/crates/ -maxdepth 2 -name 'Cargo.toml' | sort
```

Each crate directory becomes one reference map. New crates are auto-picked up.

## Step 2: Build the mapping table

### Spec reference mappings (`references/{name}.md`)

| Source | Reference Target |
|--------|-----------------|
| `trellis/specs/trellis-core.md` | `references/trellis-core.md` |
| `trellis/specs/trellis-operational-companion.md` | `references/trellis-operational-companion.md` |
| `trellis/specs/trellis-agreement.md` | `references/trellis-agreement.md` |
| `trellis/specs/trellis-requirements-matrix.md` | `references/trellis-requirements-matrix.md` |
| `trellis/specs/cross-reference-map.md` | `references/cross-reference-map.md` |

For any newly discovered spec not in this table, derive the reference filename from the spec filename.

### Crate reference mappings (`references/crates/{crate-name}.md`)

| Source | Reference Target | Authority context |
|--------|-----------------|-------------------|
| `trellis/crates/trellis-core/` | `references/crates/trellis-core.md` | Append/verify state machine; canonical for `trellis-core.md` §10 (chain), §17 (idempotency), and the `LedgerStore` seam. |
| `trellis/crates/trellis-types/` | `references/crates/trellis-types.md` | Public type surface; canonical for domain-separation tag values (`EVENT_DOMAIN`, `AUTHOR_EVENT_DOMAIN`, `CONTENT_DOMAIN`) per Core §9. |
| `trellis/crates/trellis-cddl/` | `references/crates/trellis-cddl.md` | CDDL grammar mirror of `trellis-core.md` §28 Appendix A; structural authority per ADR 0004. |
| `trellis/crates/trellis-cose/` | `references/crates/trellis-cose.md` | Byte authority for `trellis-core.md` §7 Signature Profile and §8 Signing-Key Registry. |
| `trellis/crates/trellis-verify/` | `references/crates/trellis-verify.md` | Byte authority for `trellis-core.md` §19 Verification Algorithm and §16 Verification Independence Contract. Stranger-test target. |
| `trellis/crates/trellis-export/` | `references/crates/trellis-export.md` | Byte authority for `trellis-core.md` §18 Export Package Layout (deterministic ZIP). |
| `trellis/crates/trellis-store-memory/` | `references/crates/trellis-store-memory.md` | In-process `LedgerStore` adapter; conformance-test backing. |
| `trellis/crates/trellis-store-postgres/` | `references/crates/trellis-store-postgres.md` | Production storage seam; composes wos-server's `EventStore` port. |
| `trellis/crates/trellis-conformance/` | `references/crates/trellis-conformance.md` | G-4 oracle — full-corpus vector replay against the Rust runtime. |
| `trellis/crates/trellis-cli/` | `references/crates/trellis-cli.md` | Operator surface for append/verify/export. |

For any newly discovered crate not in this table, derive the reference filename from the crate name and prompt the agent with a one-line authority context (best-guess from `Cargo.toml` description and `lib.rs` header doc).

## Step 3: Handle arguments

If `$ARGUMENTS` is provided:
- `--specs-only` → run the spec swarm, skip the crate swarm and SKILL.md update
- `--crates-only` → run the crate swarm, skip the spec swarm and SKILL.md update
- `--skill-only` → skip both swarms, only update SKILL.md
- Any other value → treat as a name filter applied to both corpora (e.g., `core` matches `trellis-core.md` and `trellis-core/` crate; `cose` matches `trellis-cose/`)

If no arguments, update everything.

## Step 4: Launch the spec reference swarm

For each spec → reference mapping, launch a `formspec-specs:spec-reference-writer` agent **in parallel**. The writer is content-agnostic — it takes a source path and a target path and produces a reference map.

Each agent gets this prompt:

```
Read the canonical Trellis spec at `{source path}` and generate/update the reference map at `{target path}`.

Source: {absolute source path}
Target: {absolute target path}

Notes specific to Trellis:
- Trellis is the cryptographic integrity substrate beneath Formspec (intake) and WOS (governance).
- Authority order: Rust crates (byte authority, ADR 0004) > CDDL in trellis-core.md §28 (structural) > normative prose > matrix > Python cross-check > archives (non-normative, do not cite).
- Cross-stack seams are load-bearing: Formspec Respondent Ledger §6.2 (eventHash/priorEventHash), Formspec Respondent Ledger §13 (LedgerCheckpoint), WOS Kernel §10.5 (custodyHook). Surface every cross-spec reference in the Cross-References section.
- TR-CORE-* and TR-OP-* identifiers are traceability anchors — list them in a Quick Reference table when the spec contains them.
- "Nothing is released" — Trellis 1.0.0 is a coherent-snapshot tag, not a freeze. Do not treat ratification labels as a reason to omit drift findings.
```

Launch ALL spec agents in a single message with multiple Agent tool calls so they run concurrently.

## Step 5: Launch the crate reference swarm

For each crate → reference mapping, launch a `formspec-specs:crate-reference-writer` agent **in parallel**. This agent is specialized for Rust source — it extracts public types, traits, functions, constants, derives, cross-crate deps, and doc-comment spec anchors.

Each agent gets this prompt:

```
Read the Rust crate at `{crate path}` and generate/update the reference map at `{target path}`.

Source crate: {absolute crate path}
Target: {absolute target path}
Authority context: {authority context string from the mapping table}

Trellis-specific discipline:
- Rust is the byte authority per ADR 0004. When source disagrees with prose, the source wins; surface the disagreement in "Spec Anchors Cited in Source", do not silently reconcile.
- Maximalist envelope, restrictive Phase-1 runtime — reserved fields, cfg-gated codepaths, and "Phase-1 scaffold" comments should be surfaced in "Byte-Level Notes".
- No stubs — `unimplemented!()`, `todo!()`, `panic!("not yet")` are forbidden in Trellis. Flag any occurrence as a finding.
- Spec + matrix + fixture in lockstep. If a public item lacks a corresponding TR-CORE-* / TR-OP-* row or fixture coverage, note the gap in "Test Surface".
- Domain-separation tags, COSE labels, suite IDs, and ZIP magic constants are byte-load-bearing. List every public `const` with its value in "Public Constants".
- Single-file `lib.rs` is the common shape — do not skip submodules when present (some crates have `mod` files).
```

Launch ALL crate agents in a single message with multiple Agent tool calls so they run concurrently. The spec swarm and crate swarm are independent — they can run together if desired (Agent calls in the same message run in parallel).

## Step 6: Update SKILL.md

After ALL spec and crate reference agents have completed, launch a single `formspec-specs:skill-updater` agent:

```
All Trellis specification and crate reference maps have been updated. Read all reference files and update SKILL.md to reflect the current state.

Reference directories:
- Spec references: .claude-plugin/skills/trellis-core/references/*.md
- Crate references: .claude-plugin/skills/trellis-core/references/crates/*.md
- SKILL.md: .claude-plugin/skills/trellis-core/SKILL.md

Notes specific to Trellis:
- There are no JSON Schema files for Trellis. Structural authority is CDDL (trellis-core.md §28) and Rust crates (trellis/crates/). The "Structural Authority — CDDL and Rust Crates" section in SKILL.md plays the role that "JSON Schemas" plays in formspec-specs/wos-core. Keep it; do NOT add a "schemas" section pointing at .schema.json files.
- The crate reference maps under references/crates/ are first-class navigation targets, parallel in importance to the spec reference maps. Both should appear in the "Reference Maps (LLM quick-links)" section.
- Preserve the YAML frontmatter (name, version, description), the document architecture diagram, the cross-stack seams table, the critical behavioral rules, and the navigation strategy. Update line counts and any new section anchors.
- If a new spec was added under trellis/specs/, add it to the document architecture diagram, the decision tree, and the spec reference maps list.
- If a new crate was added under trellis/crates/, add it to the Rust Crates table inside the "Structural Authority" section, the crate reference maps list, and the crate-vs-prose disagreement protocol if its authority claim warrants it.
- Surface any disagreement findings the crate-reference-writer agents flagged (Rust source disagreeing with prose, missing TR-CORE/TR-OP coverage, stubs encountered) in a brief "Findings since last sync" callout near the top — these are the highest-value drift signals.
```

## Step 7: Report results

After all agents complete, report:
- How many spec references were updated/created
- How many crate references were updated/created
- Whether SKILL.md was updated
- Any errors or issues from individual agents
- Whether any new top-level specs or crates were discovered (and now appear in SKILL.md)
- Any disagreement findings between Rust source and prose surfaced by the crate-reference-writer agents (these are the most valuable output of a sync run — they signal where the spec lags reality)
