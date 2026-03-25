# Changelog Specification Reference Map

> specs/registry/changelog-spec.md -- 260 lines, ~12K -- Companion: Version Changelog Format, Impact Classification

## Overview

The Changelog Specification defines a JSON document format for enumerating structural differences between two versions of a Formspec Definition. It supports automated migration generation, CI/CD impact gating, and human-readable release notes. The spec builds on Formspec v1.0 semver semantics (core spec S6.2) and migration objects (core spec S6.7), providing the bridge between version comparison and data migration.

## Section Map

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 1 | Introduction | Defines the purpose of a Changelog Document: automated tooling, human review, and programmatic CI/CD consumers. States that terminology follows Formspec v1.0 and references S6.2 (semver) and S6.7 (migrations). | Changelog Document, migration generation, impact analysis, CI/CD gates | Understanding what changelogs are for, or why the format exists |
| BLUF | Bottom Line Up Front | Compact summary: a valid changelog requires `definitionUrl`, `fromVersion`, `toVersion`, `semverImpact`, and `changes`. Impact classification drives migration planning and semver governance. | Required fields, semver governance | Quick orientation before deeper reading |
| 2 | Changelog Document Schema | Defines the top-level JSON object structure with all properties. Contains a generated schema-ref table from `schemas/changelog.schema.json`. States that `semverImpact` MUST equal the max impact across all changes. | `$schema`, `changes`, `definitionUrl`, `fromVersion`, `toVersion`, `generatedAt`, `semverImpact`, `summary` | Building or validating a changelog document, understanding required vs optional top-level fields |
| 2.1 | Example | Full JSON example of a changelog with a `removed` (breaking) and `added` (compatible) change, showing all top-level fields and two Change objects with `before`/`after`/`migrationHint`. | Example structure, `migrationHint: "drop"` | Seeing a complete changelog document in practice |
| 3 | Change Object | Defines the schema for individual Change entries within the `changes` array. Covers all 9 properties: `type`, `target`, `path`, `key`, `impact`, `description`, `before`, `after`, `migrationHint`. | Change object, `type` enum (added/removed/modified/moved/renamed), `target` enum (item/bind/shape/optionSet/dataSource/screener/migration/metadata), `impact` enum (breaking/compatible/cosmetic), `migrationHint`, `before`/`after` | Constructing or parsing individual change entries, understanding what each property means |
| 3.1 | Change Type Examples | Provides concrete JSON examples for all five change types: added, removed, modified, renamed, moved. Each shows the appropriate `before`/`after` patterns and `migrationHint` usage. | added (after only), removed (before + migrationHint), modified (before + after partial), renamed (key change + FEL hint), moved (path change in before/after) | Implementing a changelog generator or understanding what each change type looks like |
| 4 | Impact Classification Rules | Declares that a conformant generator MUST classify each change per the rules in subsections. Unlisted changes default to **cosmetic**. | Impact classification, conformance requirement, default-to-cosmetic rule | Implementing impact classification logic, or understanding why a change gets a certain severity |
| 4.1 | Breaking (-> major) | Enumerates 7 change patterns that MUST be classified as breaking: item removed, key renamed, dataType changed, required added to existing field, repeat toggled, itemType changed, option removed from closed optionSet. | Breaking changes, major version bump, stored response invalidation | Determining whether a change is breaking, understanding what constitutes a major version bump |
| 4.2 | Compatible (-> minor) | Enumerates 7 change patterns classified as compatible: optional item added, required item added with default, option added, new shape, new bind, constraint relaxed, item moved with key preserved. | Compatible changes, minor version bump, additive changes | Determining whether a change is compatible, understanding safe additive modifications |
| 4.3 | Cosmetic (-> patch) | Enumerates 6 change patterns classified as cosmetic: label/hint/help/description changed, display order changed within group, shape property modified. | Cosmetic changes, patch version bump, display-only changes | Determining whether a change is purely cosmetic with zero data impact |
| 5 | Generation Algorithm | Defines the 8-step algorithm a conformant changelog generator MUST follow: load both versions, index by key, detect removals, detect additions, detect modifications, detect renames (optional heuristic), detect moves, compute semverImpact. States that steps 3-7 repeat for binds, shapes, optionSets, dataSources, and screeners. | Generation algorithm, key-based indexing, rename heuristic (same dataType + structure + binds), move detection (parent path change), semverImpact computation (max across changes) | Implementing a changelog generator, understanding the diff algorithm, or debugging incorrect changelogs |
| 6 | Relationship to S6.7 Migrations | Explains that a Changelog Document with `migrationHint` entries provides sufficient information to auto-generate a S6.7 `migration` object. Links changelog output to definition migration arrays. | Auto-generation, S6.7 migration objects, migrationHint-to-fieldMap translation | Understanding how changelogs feed into migration generation |
| 6.1 | Mapping Rules | Table mapping each change type + migrationHint combination to a generated `fieldMap` entry: removed/drop -> omit, removed/preserve -> carry forward, renamed -> FEL expression, modified dataType -> FEL coercion, modified required+default -> fallback expression. | fieldMap generation, drop vs preserve, FEL coercion expressions (`STRING()`, `$old.field ?? 'default'`), extension data carry-forward | Implementing migration auto-generation, understanding what fieldMap entries look like for each scenario |
| 6.2 | Generation Procedure | 4-step procedure for converting a Changelog Document into a migration object: create migration shell, process breaking changes with hints (skip drops, add others to fieldMap), process renames (after.key -> migrationHint), insert into definition's migrations array. Includes advisory note that auto-generated migrations SHOULD be reviewed. | Migration generation procedure, fieldMap assembly, advisory review requirement | Implementing the migration generator, or understanding the exact algorithm for fieldMap construction |
| 7 | Media Type and File Extension | Defines the media type (`application/vnd.formspec.changelog+json`), file extension (`.changelog.json`), and naming convention (`{definitionSlug}-{fromVersion}..{toVersion}.changelog.json`). | Media type, file extension, naming convention, double-dot version separator | File discovery, content-type headers, naming changelog files correctly |

## Cross-References

- **Formspec v1.0 S6.2** (semver semantics): Referenced in S1 and throughout. The changelog's `fromVersion`/`toVersion` are interpreted per the definition's `versionAlgorithm` (default: semver). The `semverImpact` field maps directly to semver bump levels.
- **Formspec v1.0 S6.7** (migrations): Referenced in S1, S6, S6.1, S6.2. Changelog `migrationHint` entries are designed to auto-generate S6.7 `migration` objects with `fieldMap` entries. The generated migration is insertable into the new Definition's `migrations` array.
- **`schemas/changelog.schema.json`**: The generated schema-ref table in S2 is sourced from this schema. The BLUF section states this schema is the governing structural contract.
- **Definition `url` property**: S2 states `definitionUrl` must match the definition's top-level `url` property.
- **Definition `versionAlgorithm`**: S2 notes versions are interpreted per this property (default: semver).

## Impact Classification Quick Reference

| Impact Level | Semver Bump | Default? | Trigger Patterns |
|---|---|---|---|
| **breaking** | major | No | Item removed, key renamed, dataType changed, required added to existing field, repeat/non-repeat toggled, itemType changed (group<->field), option removed from closed optionSet |
| **compatible** | minor | No | Optional item added, required item added with default, option added to optionSet, new shape/bind added, constraint relaxed, item moved (key preserved) |
| **cosmetic** | patch | YES (default for unlisted changes) | Label/hint/help/description changed, display order changed within group, shape property modified |

The `semverImpact` at the document level MUST equal the maximum impact: `breaking > compatible > cosmetic` maps to `major > minor > patch`.

## Critical Behavioral Rules

1. **Key is the stable identifier**: The generation algorithm indexes items by `key`, not by path or position. Keys are the identity anchor across versions. This means path changes alone trigger `moved`, not `modified`.

2. **Rename detection is optional and heuristic**: Conformant generators MAY detect renames by matching unpaired removed/added keys that share the same `dataType`, child structure, and binds. This is explicitly marked as OPTIONAL (step 6). Generators that skip this will emit separate `removed` + `added` entries instead.

3. **Steps 3-7 repeat for all target types**: The algorithm is not just for items. It must be repeated for `binds`, `shapes`, `optionSets`, `dataSources`, and `screeners` using their respective identifiers.

4. **Unlisted changes default to cosmetic**: Any change pattern not explicitly listed in S4.1 or S4.2 MUST be classified as cosmetic. This is a safe default that avoids false-positive breaking change alerts.

5. **Migration generation only processes breaking changes with hints**: The S6.2 procedure only creates fieldMap entries for changes where `impact` is `"breaking"` AND `migrationHint` is present. Compatible and cosmetic changes are ignored. Renamed items are processed separately regardless of their hint.

6. **`"drop"` hint means no fieldMap entry**: When `migrationHint` is `"drop"`, the migration generator skips the entry entirely (the value is discarded). This is distinct from `"preserve"`, which carries the old value forward into extension data.

7. **`"preserve"` on removed items carries data to extension storage**: `{ "oldKey": "oldKey" }` in the fieldMap means the old value is kept but placed into extension/overflow data, not into a regular form field.

8. **Auto-generated migrations are advisory**: The spec explicitly states migrations SHOULD be reviewed by a form author before deployment. The `migrationHint` is advisory, not normative.

9. **`before`/`after` presence rules by change type**: `added` has `after` only; `removed` has `before` only; `modified`, `renamed`, and `moved` have both `before` and `after`. For `modified`, these contain only the changed properties (partial fragments), not the full item.

10. **One Change per differing property for modifications**: Step 5 states the generator must emit a separate Change with `type: "modified"` for EACH differing property, not one Change per modified item.
