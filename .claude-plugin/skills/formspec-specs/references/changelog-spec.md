# Changelog Specification Reference Map

> specs/registry/changelog-spec.md -- 267 lines, ~18K -- Companion: Registry tier; Changelog JSON format, impact classification, and migration hints

## Overview

The Changelog Specification defines a JSON document format that enumerates structural differences between two versions of a Formspec Definition. It supports migration tooling, impact analysis, reviewer notifications, human-readable release notes, and CI/CD gates on breaking changes. Terminology and Definition structure follow Formspec v1.0; semver interpretation follows Core §6.2 and migration objects follow Core §6.7.

## Section Map

### Front Matter, Title, Introduction, and BLUF (Lines 1-34)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| YAML | Front matter | `title`, `version` (e.g. 1.0.0-draft.1), `date`, `status: draft` for the spec document itself (not the changelog JSON). | draft, version, status | Checking spec document metadata |
| -- | Formspec Changelog Format v1.0 | Title block: Draft status, companion to Formspec v1.0, body date note (2025-07). | companion spec, Draft | Orientation on spec maturity |
| 1 | Introduction | Defines a **Changelog Document** as JSON enumerating diffs between two Definition versions; use cases are automated tooling, human review, and programmatic consumers (e.g. CI rejecting breaking changes on minor branches). | Changelog Document, CI/CD gates, migration generation | Why the format exists and who consumes it |
| BLUF | Bottom Line Up Front | Embedded BLUF: required top-level fields; impact classification drives migration planning and semver governance; governed by `schemas/changelog.schema.json`. | `$formspecChangelog`, `definitionUrl`, `fromVersion`, `toVersion`, `semverImpact`, `changes`, changelog.schema.json | Quick validation checklist before deep read |

### Changelog Document Schema (Lines 35-93)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 2 | Changelog Document Schema | Top-level object is JSON; generated schema-ref table from `schemas/changelog.schema.json` lists pointers for every property. `semverImpact` MUST equal the maximum impact across `changes` (breaking→major, compatible→minor, cosmetic→patch). | `$formspecChangelog` const `"1.0"`, `$schema`, `changes`, `definitionUrl`, `fromVersion`, `toVersion`, `generatedAt`, `semverImpact`, `summary` | Authoring or validating top-level changelog JSON |
| 2.1 | Example | Full example: `$schema` URL, versions 2.1.0→3.0.0, `semverImpact` major, `removed` + `added` changes with `before`/`after`/`migrationHint`. | example JSON, `migrationHint: "drop"` | Concrete document shape |

### Change Object (Lines 95-161)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 3 | Change Object | One atomic modification per entry in `changes`: required `type`, `target`, `path`, `impact`; optional `key` (item target); recommended `description`; optional `before`/`after`; optional `migrationHint` (FEL, `"drop"`, or `"preserve"`; see §6). | `type`, `target`, `path`, `key`, `impact`, `description`, `before`, `after`, `migrationHint` | Parsing or emitting a single Change |
| 3.1 | Change Type Examples | JSON examples for `added`, `removed`, `modified`, `renamed`, `moved` with the expected `before`/`after`/`migrationHint` patterns. | added, removed, modified, renamed, moved | Implementing diff presentation or generators |

### Impact Classification Rules (Lines 163-201)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 4 | Impact Classification Rules | Conformant generators MUST classify each change per §4.1–4.3; **unlisted changes default to cosmetic**. | default cosmetic, MUST classify | Ambiguous change severity |
| 4.1 | Breaking (→ major) | Table: item removed; key renamed; `dataType` changed; `required` added on existing field; repeat ↔ non-repeat; `itemType` changed; option removed from **closed** optionSet. | breaking, major, closed optionSet | Major bump justification |
| 4.2 | Compatible (→ minor) | Table: optional item added; required item added with default; option added; new shape; new bind; constraint relaxed; item moved between groups with key preserved. | compatible, minor, additive | Minor bump justification |
| 4.3 | Cosmetic (→ patch) | Table: `label`/`hint`/`help`/`description` changes; display order within group; shape property (e.g. width). | cosmetic, patch, presentation-only | Patch-only diffs |

### Generation Algorithm (Lines 203-224)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 5 | Generation Algorithm | Eight mandatory steps: load both versions; index items by `key`; detect removed/added/modified; optional rename heuristic among unpaired removed+added (same `dataType`, child structure, binds); detect moves (parent path differs); compute `semverImpact` as max impact. **Repeat** the detection steps for `binds`, `shapes`, `optionSets`, `dataSources`, and `screeners` using their respective identifiers. | key indexing, rename heuristic, move detection, semverImpact max, binds, shapes, optionSets, dataSources, screeners | Implementing or auditing a changelog generator |

### Relationship to Core §6.7 Migrations (Lines 226-256)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 6 | Relationship to §6.7 Migrations | Changelog with `migrationHint` on breaking changes is enough to **auto-generate** a Core §6.7 `migration` object. | auto-generate migration, §6.7 | Changelog → migration pipeline |
| 6.1 | Mapping Rules | Table: `removed`+`drop` → omit from fieldMap; `removed`+`preserve` → `{ "oldKey": "oldKey" }` extension carry-forward; `renamed`+FEL → `{ "newKey": "$old..." }`; `modified` (dataType)+FEL coercion; `modified` (required+default)+`preserve` with `??` default. | fieldMap, drop, preserve, FEL, `$old` | Translating hints to fieldMap |
| 6.2 | Generation Procedure | Build `{ fromVersion, fieldMap }`; for each **breaking** change with `migrationHint`, skip `drop`, else add key→hint; for `renamed`, add `{ [after.key]: migrationHint }`; result valid per §6.7 for `migrations` array. Note: auto-generated migrations SHOULD be author-reviewed; hints are **advisory**. | breaking + migrationHint, renamed fieldMap, advisory | Implementing migration synthesis |

### Media Type and Closing (Lines 258-267)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 7 | Media Type and File Extension | IANA-style media type `application/vnd.formspec.changelog+json`; extension `.changelog.json`; SHOULD name `{definitionSlug}-{fromVersion}..{toVersion}.changelog.json`. | media type, `.changelog.json`, double-dot `..` in filename | HTTP Content-Type, file naming |

## Cross-References

- **Formspec v1.0 Core §6.2** -- Semver semantics; `fromVersion`/`toVersion` interpreted per definition `versionAlgorithm` (default semver); `semverImpact` aligns with major/minor/patch.
- **Formspec v1.0 Core §6.7** -- Migration objects and `migrations` array; changelog §6 defines how hints become `fieldMap` entries.
- **`schemas/changelog.schema.json`** -- Structural contract; BLUF and §2 generated schema-ref table cite this schema.
- **Definition `url`** -- `definitionUrl` MUST match the definition’s top-level `url`.
- **Definition `versionAlgorithm`** -- Governs interpretation of version strings in `fromVersion`/`toVersion`.
- **FEL** -- `migrationHint` may be a FEL expression (e.g. `$old.cost`, `STRING($old.amount)`); normative FEL grammar is in the Core/FEL specs (changelog references usage only).

## Impact Classification Quick Reference

| Impact Level | Semver bump | Default for unlisted? | Trigger patterns (summary) |
|--------------|-------------|------------------------|----------------------------|
| breaking | major | No | Remove item, rename key, change `dataType`, add `required` to existing field, toggle repeat, change `itemType`, remove option from closed optionSet |
| compatible | minor | No | Optional add, required add with default, option add, new shape/bind, relaxed constraint, move with key preserved |
| cosmetic | patch | **Yes** | Label/hint/help/description, in-group order, shape-only property changes |

Document-level `semverImpact` MUST equal the **maximum** impact across all `changes` (breaking > compatible > cosmetic → major > minor > patch).

## Change Type Quick Reference

| Type | `before` | `after` | `migrationHint` | Notes |
|------|----------|---------|-----------------|-------|
| `added` | absent | present | uncommon | New element |
| `removed` | present | absent | common | Often `drop` or `preserve` |
| `modified` | partial | partial | when needed | One Change **per differing property** |
| `renamed` | old key | new key | often FEL | Optional heuristic vs removed+added |
| `moved` | old `path` | new `path` | uncommon | Key unchanged, parent path differs |

## Critical Behavioral Rules

1. **`$formspecChangelog` MUST be `"1.0"`** -- Top-level discriminator for the changelog document format (schema const).

2. **`semverImpact` MUST equal the max over `changes`** -- Not independently set; breaking → major, compatible → minor, cosmetic → patch, aggregated as the strictest change.

3. **Keys index identity for items** -- Stable identifier across versions; removals/additions keyed by presence of `key`; parent path change → `moved`, not a rename of identity.

4. **Rename detection is OPTIONAL** -- Heuristic among unpaired removed/added with same `dataType`, child structure, and binds; otherwise emit separate `removed` and `added`.

5. **Repeat detection for all targets** -- After the item walk, repeat the same class of steps for `binds`, `shapes`, `optionSets`, `dataSources`, and `screeners` with their native identifiers.

6. **One `modified` Change per property delta** -- Same item with multiple property diffs yields multiple Change rows.

7. **Unlisted patterns default to cosmetic** -- Safe default for classification when not covered by §4.1 or §4.2.

8. **`migrationHint` semantics** -- May be FEL, `"drop"`, or `"preserve"`; see §6 for migration mapping.

9. **`"drop"` yields no `fieldMap` entry** -- Discards old value; contrast `"preserve"` on remove → `{ "oldKey": "oldKey" }` for extension carry-forward.

10. **`renamed` contributes `{ [after.key]: migrationHint }` to `fieldMap`** -- In addition to the breaking-change loop rules in §6.2.

11. **Migration auto-generation is advisory** -- SHOULD be reviewed before deploy; `migrationHint` is not normative proof of correct migration.

12. **`definitionUrl` must match Definition `url`** -- Ensures the changelog describes the intended canonical definition.

13. **Closed optionSet option removal is breaking** -- Explicit in §4.1; distinguishes invalidating existing stored selections.

14. **Media type and extension** -- Use `application/vnd.formspec.changelog+json` and `.changelog.json` for interchange and discovery.
