# Formspec Changelog Format v1.0

**Status:** Draft · **Companion to:** Formspec v1.0 · **Date:** 2025-07

---

## Quick Reference

This section is a compact checklist of the normative requirements in §§2–7.

### Document schema requirements (§2)

- A changelog document is a top-level JSON object.
- Required fields: `definitionUrl`, `fromVersion`, `toVersion`, `semverImpact`, `changes`.
- `changes` is an ordered array of Change objects (§3).
- `semverImpact` MUST equal the maximum impact in `changes`:
  - breaking -> major
  - compatible -> minor
  - cosmetic -> patch
- `$schema` and `generatedAt` are RECOMMENDED; `summary` is OPTIONAL.

### Change object requirements (§3)

- Required properties: `type`, `target`, `path`, `impact`.
- `type` MUST be one of: `"added"`, `"removed"`, `"modified"`, `"moved"`, `"renamed"`.
- `target` MUST be one of: `"item"`, `"bind"`, `"shape"`, `"optionSet"`, `"dataSource"`, `"screener"`, `"migration"`, `"metadata"`.
- `impact` MUST be one of: `"breaking"`, `"compatible"`, `"cosmetic"`.
- `migrationHint` MAY be a FEL expression, `"drop"`, or `"preserve"`.

### Impact classification essentials (§4)

- Breaking: removals, key renames, structural/type-hardening changes that can invalidate stored responses.
- Compatible: additive or relaxed changes that preserve existing response validity.
- Cosmetic: presentation-only or wording-only changes.

### Generator requirements (§5)

- Conformant generators MUST: load both versions, index by stable identifiers, detect removals/additions/modifications/renames/moves, and compute `semverImpact` from max impact.
- The same detection pattern MUST be applied to `binds`, `shapes`, `optionSets`, `dataSources`, and `screeners`.

### Migration linkage (§6.7 relationship)

- Breaking changes with `migrationHint` can be converted into migration `fieldMap` entries.
- `"drop"` means no `fieldMap` entry; expression-based hints map to concrete output keys.
- Auto-generated migrations are advisory and SHOULD be reviewed before deployment.

## 2. Changelog Document Schema

A Changelog Document is a JSON object at the top level.

| Property | Type | Req | Description |
|---|---|---|---|
| `$schema` | string (URI) | RECOMMENDED | URI of this specification's JSON Schema. |
| `definitionUrl` | string (URI) | REQUIRED | The `url` of the Definition this changelog describes. |
| `fromVersion` | string (semver) | REQUIRED | Base version being compared. |
| `toVersion` | string (semver) | REQUIRED | Target version being compared. |
| `generatedAt` | string (date-time) | RECOMMENDED | ISO 8601 timestamp of generation. |
| `semverImpact` | enum | REQUIRED | Computed overall impact: `"major"`, `"minor"`, or `"patch"`. |
| `summary` | string | OPTIONAL | Human-readable summary of the change set. |
| `changes` | array of Change | REQUIRED | Ordered list of Change objects (§3). |

`semverImpact` MUST equal the maximum impact across all entries in `changes`
(breaking → major, compatible → minor, cosmetic → patch).

## 3. Change Object

Each Change describes a single atomic modification to a Definition element.

| Property | Type | Req | Description |
|---|---|---|---|
| `type` | enum | REQUIRED | `"added"`, `"removed"`, `"modified"`, `"moved"`, `"renamed"` |
| `target` | enum | REQUIRED | `"item"`, `"bind"`, `"shape"`, `"optionSet"`, `"dataSource"`, `"screener"`, `"migration"`, `"metadata"` |
| `path` | string | REQUIRED | Dot-path to the affected element (e.g., `"items.budget.personnel"`). |
| `key` | string | OPTIONAL | The item `key` when `target` is `"item"`. |
| `impact` | enum | REQUIRED | `"breaking"`, `"compatible"`, `"cosmetic"` |
| `description` | string | RECOMMENDED | Human-readable description of the change. |
| `before` | any | OPTIONAL | Previous value or structural fragment. Present for `modified`, `removed`, `renamed`, `moved`. |
| `after` | any | OPTIONAL | New value or structural fragment. Present for `added`, `modified`, `renamed`, `moved`. |
| `migrationHint` | string | OPTIONAL | Suggested transform: a FEL expression, `"drop"`, or `"preserve"`. See §6. |

## 4. Impact Classification Rules

A conformant generator MUST classify each change per the table below.
Unlisted changes default to **cosmetic**.

### 4.1 Breaking (→ major)

| Change | Rationale |
|---|---|
| Item removed | Existing responses lose a field. |
| Item key renamed | Stored response keys no longer match. |
| `dataType` changed | Stored values may be invalid under new type. |
| `required` constraint added to existing field | Previously valid responses may fail. |
| `repeat` → non-repeat (or vice versa) | Structural change to stored data. |
| `itemType` changed (e.g., group → field) | Structural change to stored data. |
| Option removed from closed optionSet | Existing selections become invalid. |

### 4.2 Compatible (→ minor)

| Change | Rationale |
|---|---|
| Item added (optional) | No impact on existing responses. |
| Item added (required) with default | Fillable from default; no data loss. |
| Option added to optionSet | Existing selections remain valid. |
| New shape added | Presentation only; additive. |
| New bind added | Additive data mapping. |
| Constraint relaxed (e.g., maxLength increased) | Existing data still valid. |
| Item moved between groups (key preserved) | Data intact; layout change only. |

### 4.3 Cosmetic (→ patch)

| Change | Rationale |
|---|---|
| `label` changed | Display-only. |
| `hint` changed | Display-only. |
| `help` changed | Display-only. |
| `description` changed | Display-only. |
| Display order changed within a group | No data impact. |
| Shape property modified (e.g., width) | Presentation-only. |

## 5. Generation Algorithm

A conformant changelog generator MUST perform the following steps:

1. **Load** both Definition versions (identified by `fromVersion` and `toVersion`).
1. **Index items by `key`** — the `key` property is the stable identifier across versions.
1. **Detect removals** — for each key present in the old Definition but absent in the new,
   emit a Change with `type: "removed"`.
1. **Detect additions** — for each key present in the new Definition but absent in the old,
   emit a Change with `type: "added"`.
1. **Detect modifications** — for each key present in both versions, compare all properties.
   Emit a separate Change with `type: "modified"` for each differing property.
1. **Detect renames** (OPTIONAL heuristic) — among unpaired removed/added keys, if two
   items share the same `dataType`, child structure, and binds, emit `type: "renamed"`
   instead and remove them from the added/removed sets.
1. **Detect moves** — for keys present in both versions whose parent path differs,
   emit `type: "moved"`.
1. **Compute `semverImpact`** — take the maximum impact across all changes:
   breaking > compatible > cosmetic → major > minor > patch.

Repeat steps 3–7 for `binds`, `shapes`, `optionSets`, `dataSources`, and `screeners`
using their respective identifiers.

## 6. Relationship to §6.7 Migrations

A Changelog Document with `migrationHint` entries on breaking changes provides
sufficient information to **auto-generate** a §6.7 `migration` object.

### 6.1 Mapping Rules

| Change type | `migrationHint` | Generated `fieldMap` entry |
|---|---|---|
| `removed` | `"drop"` | *(omit key — value is discarded)* |
| `removed` | `"preserve"` | `{ "oldKey": "oldKey" }` — carry forward into extension data |
| `renamed` | FEL expression (e.g., `$old.cost`) | `{ "newKey": "$old.cost" }` |
| `modified` (dataType change) | FEL expression (e.g., `STRING($old.amount)`) | `{ "amount": "STRING($old.amount)" }` |
| `modified` (added required + default) | `"preserve"` | `{ "field": "$old.field ?? 'default'" }` |

### 6.2 Generation Procedure

Given a Changelog Document `C` for `fromVersion` → `toVersion`:

1. Create a new migration object: `{ "fromVersion": C.fromVersion, "fieldMap": {} }`.
1. For each change in `C.changes` where `impact` is `"breaking"` and `migrationHint`
   is present:
   - If `migrationHint` is `"drop"`, skip (no fieldMap entry needed).
   - Otherwise, add `{ [change.key]: change.migrationHint }` to `fieldMap`.
1. For each change where `type` is `"renamed"`, add
   `{ [after.key]: migrationHint }` to `fieldMap`.
1. The resulting migration object is valid per §6.7 and can be inserted into the
   new Definition's `migrations` array.

> **Note:** Auto-generated migrations SHOULD be reviewed by a form author before
> deployment. The `migrationHint` is advisory, not normative.

## 7. Media Type and File Extension

- Media type: `application/vnd.formspec.changelog+json`
- File extension: `.changelog.json`
- A changelog file SHOULD be named `{definitionSlug}-{fromVersion}..{toVersion}.changelog.json`
  (e.g., `grant-application-2.1.0..3.0.0.changelog.json`).

---

*End of Formspec Changelog Format v1.0.*
