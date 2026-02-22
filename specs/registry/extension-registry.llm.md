# Formspec Extension Registry v1.0

**Version:** 1.0.0-draft.1\
**Date:** 2025-07-10\
**Editors:** Formspec Working Group\
**Companion to:** Formspec v1.0 — A JSON-Native Declarative Form Standard

---

## 1. Purpose and Scope

Formspec v1.0 §8 defines five extension categories and requires all extension
identifiers to carry an `x-` prefix. The core specification deliberately leaves
extension *publication* and *discovery* out of scope. This companion
specification fills that gap by defining:

1. A machine-readable **Registry Entry** format for describing a single
   extension.
1. A **Registry Document** format that collects entries into a publishable
   catalog.
1. **Naming rules** that codify and extend the `x-` prefix conventions.
1. A **discovery mechanism** based on well-known URLs.
1. A **lifecycle model** governing how extensions move from draft to retirement.
1. **Conformance requirements** for registry-aware processors.

This specification does NOT define a centralized registry service, governance
board, or approval process. Any organization MAY publish its own Registry
Document. Interoperability is achieved through the common format, not through
centralized authority.

---

## Quick Reference

This section is a compact checklist of normative requirements across §§2–7.

### Registry document requirements (§2)

- Top-level object MUST include: `$formspecRegistry`, `publisher`, `published`, `entries`.
- `$formspecRegistry` MUST be `"1.0"`.
- `publisher` object MUST include `name` and `url`; `contact` is OPTIONAL.
- `$schema` is RECOMMENDED; `extensions` is OPTIONAL and all keys MUST be `x-` prefixed.

### Registry entry requirements (§3)

- Each entry MUST include: `name`, `category`, `version`, `status`, `description`, `compatibility`.
- `category` MUST be one of: `"dataType"`, `"function"`, `"constraint"`, `"property"`, `"namespace"`.
- `status` MUST be one of: `"draft"`, `"stable"`, `"deprecated"`, `"retired"`.
- `compatibility.formspecVersion` is a REQUIRED semver range.
- Category-specific required fields:
  - `dataType`: `baseType`
  - `function`: `parameters`, `returns`
  - `constraint`: `parameters`
  - `property`: no additional required fields
  - `namespace`: no additional required fields

### Naming and uniqueness requirements (§4)

- All extension identifiers MUST start with `x-`.
- Identifiers MUST match `^x-[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$`.
- `x-formspec-` is reserved; third-party publishers MUST NOT use it.
- Within one registry document, `(name, version)` pairs MUST be unique.

### Discovery and lifecycle essentials (§§5–6)

- Recommended discovery endpoint: `https://{host}/.well-known/formspec-extensions.json`.
- Endpoint response MUST be `application/json` and a valid registry document.
- Lifecycle order is `draft -> stable -> deprecated -> retired`; transitions MUST NOT skip states.

### Registry-aware processor requirements (§7)

- MUST parse and schema-validate registry documents.
- SHOULD resolve extensions by `name` and `category`.
- MUST evaluate `compatibility.formspecVersion`; mismatches are warnings unless `x-formspec-strict: true`.
- MUST warn on `retired` entries and SHOULD emit informational notices for `deprecated`.
- If `schemaUrl` exists, SHOULD validate extension payloads against it.
- If an entry is not found, MUST fall back to Formspec core §8 passthrough rules.

## 2. Registry Document Format

A Registry Document is a JSON object at the top level with the following
properties:

| Property | Type | Req | Description |
|---|---|---|---|
| `$formspecRegistry` | string | REQUIRED | Version of this specification. MUST be `"1.0"`. |
| `$schema` | string (URI) | RECOMMENDED | URI of the Registry Document JSON Schema. |
| `publisher` | object | REQUIRED | Organization publishing this registry. See §2.1. |
| `published` | string (date-time) | REQUIRED | ISO 8601 timestamp of last publication. |
| `entries` | array | REQUIRED | Array of Registry Entry objects. See §3. |
| `extensions` | object | OPTIONAL | Extension properties (all keys `x-`-prefixed). |

### 2.1 Publisher Object

| Property | Type | Req | Description |
|---|---|---|---|
| `name` | string | REQUIRED | Human-readable organization name. |
| `url` | string (URI) | REQUIRED | Organization home page. |
| `contact` | string | OPTIONAL | Contact email or URI. |

---

## 3. Registry Entry Format

Each element of the `entries` array is a JSON object describing one extension.

| Property | Type | Req | Description |
|---|---|---|---|
| `name` | string | REQUIRED | The `x-`-prefixed extension identifier. |
| `category` | enum | REQUIRED | One of: `"dataType"`, `"function"`, `"constraint"`, `"property"`, `"namespace"`. |
| `version` | string | REQUIRED | Semver version of the extension itself. |
| `status` | enum | REQUIRED | One of: `"draft"`, `"stable"`, `"deprecated"`, `"retired"`. See §6. |
| `publisher` | object | OPTIONAL | Entry-level publisher override. Same schema as §2.1. |
| `description` | string | REQUIRED | Human-readable summary of the extension's purpose. |
| `specUrl` | string (URI) | RECOMMENDED | Link to the full extension documentation. |
| `schemaUrl` | string (URI) | RECOMMENDED | Link to a JSON Schema for the extension's data. |
| `compatibility` | object | REQUIRED | Version compatibility bounds. See §3.1. |
| `license` | string | RECOMMENDED | SPDX license identifier (e.g. `"Apache-2.0"`). |
| `examples` | array | OPTIONAL | Array of JSON values demonstrating usage. |
| `extensions` | object | OPTIONAL | Extension properties (all keys `x-`-prefixed). |

### 3.1 Compatibility Object

| Property | Type | Req | Description |
|---|---|---|---|
| `formspecVersion` | string | REQUIRED | Semver range of compatible Formspec versions (e.g. `">=1.0.0 <2.0.0"`). |
| `mappingDslVersion` | string | OPTIONAL | Semver range of compatible Mapping DSL versions, if the extension interacts with mappings. |

### 3.2 Category-Specific Properties

Depending on the value of `category`, additional properties are REQUIRED or
OPTIONAL on the entry object:

**`dataType`** — Custom data type (§8.1 of Formspec v1.0):

| Property | Type | Req | Description |
|---|---|---|---|
| `baseType` | string | REQUIRED | Core type this extends: `string`, `integer`, `decimal`, `boolean`, `date`, `dateTime`, `time`, `uri`. |
| `constraints` | object | OPTIONAL | Default constraint values for this type. |
| `metadata` | object | OPTIONAL | Presentation-layer metadata. |

**`function`** — Custom function (§8.2):

| Property | Type | Req | Description |
|---|---|---|---|
| `parameters` | array | REQUIRED | Array of `{name, type, description?}` objects. |
| `returns` | string | REQUIRED | Core data type name for the return value. |

**`constraint`** — Custom validation constraint (§8.3):

| Property | Type | Req | Description |
|---|---|---|---|
| `parameters` | array | REQUIRED | Array of `{name, type, description?}` objects. |

**`property`** — Extension property (§8.4):

No additional required properties. The `schemaUrl` is RECOMMENDED.

**`namespace`** — Extension namespace (§8.5):

| Property | Type | Req | Description |
|---|---|---|---|
| `members` | array | OPTIONAL | Array of `x-`-prefixed extension names grouped under this namespace. |

---

## 4. Naming Rules

This section codifies and extends the naming conventions of Formspec v1.0 §8.
All rules in this section are **normative**.

1. All extension identifiers — type names, function names, constraint names,
   property keys, and namespace keys — MUST start with `x-`.

1. Extension identifiers MUST match the regular expression:
   ```
   ^x-[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$
   ```
   That is: the `x-` prefix, followed by one or more hyphen-separated segments
   of lowercase ASCII letters and digits, each segment beginning with a letter.

1. The prefix `x-formspec-` is **reserved** for extensions that MAY be
   promoted into future versions of the Formspec core specification.
   Third-party publishers MUST NOT register identifiers beginning with
   `x-formspec-`.

1. Within a single Registry Document, the combination of `name` and `version`
   MUST be unique. A Registry Document MUST NOT contain two entries with the
   same `name` and `version`.

1. Across independently published registries, naming conflicts are resolved by
   publisher authority. Organizations SHOULD use the `x-{org}-{domain}` pattern
   (§8.5) to minimize collision risk.

---

## 5. Discovery

To support automated discovery, organizations publishing Formspec extensions
SHOULD serve their Registry Document at a well-known URL:

```
https://{host}/.well-known/formspec-extensions.json
```

The following requirements apply:

1. The response MUST have Content-Type `application/json`.

1. The response MUST be a valid Registry Document as defined in §2.

1. Servers SHOULD support conditional GET (`If-None-Match` /
   `If-Modified-Since`) to allow efficient polling.

1. Processors MAY also accept Registry Document URIs from configuration,
   command-line arguments, or Definition-level metadata. The well-known URL
   convention is OPTIONAL and does not preclude other distribution mechanisms.

---

## 6. Extension Lifecycle

Every registry entry declares a `status` that indicates its maturity. The
following lifecycle states and transition rules are **normative**.

```
 ┌───────┐    promote    ┌────────┐    sunset     ┌────────────┐    remove    ┌─────────┐
 │ draft │──────────────▶│ stable │──────────────▶│ deprecated │────────────▶│ retired │
 └───────┘               └────────┘               └────────────┘             └─────────┘
```

| Transition | Rule |
|---|---|
| draft → stable | The publisher asserts the extension's interface is frozen for the given major version. |
| stable → deprecated | The publisher MUST publish a `deprecation` notice (human-readable string) in the entry's `extensions` under the key `x-formspec-deprecation`. The publisher SHOULD identify a replacement extension if one exists. |
| deprecated → retired | The publisher asserts the extension SHOULD NOT be used and MAY stop supporting it. Processors encountering a `retired` extension SHOULD emit a warning. |
| (any) → draft | A new `version` (with incremented major version) MAY re-enter `draft`. |

Transitions MUST NOT skip states. An extension MUST NOT move directly from
`draft` to `deprecated` or from `stable` to `retired`.

---

## 7. Conformance

A **registry-aware processor** is a conformant Formspec processor (as defined
in Formspec v1.0 §1) that additionally implements the following behaviors:

1. **Loading.** The processor MUST be able to parse a Registry Document and
   validate it against the schema defined in Appendix A.

1. **Resolution.** When a Definition document references an extension
   (custom data type, function, constraint, or namespace), the processor
   SHOULD attempt to locate a matching entry in one or more configured
   Registry Documents by `name` and `category`.

1. **Compatibility check.** If a matching entry is found, the processor MUST
   verify that the current Formspec version satisfies the entry's
   `compatibility.formspecVersion` range. A mismatch MUST produce a warning;
   it SHOULD NOT produce a hard error unless the entry's `extensions` include
   `"x-formspec-strict": true`.

1. **Status enforcement.** If a matching entry has `status` equal to
   `"retired"`, the processor MUST emit a warning. If the entry has `status`
   equal to `"deprecated"`, the processor SHOULD emit an informational notice.

1. **Schema validation.** If the entry provides a `schemaUrl`, the processor
   SHOULD fetch and validate the extension's data in the Definition against
   that schema.

1. **Passthrough.** A registry-aware processor that cannot locate a registry
   entry for a given extension MUST fall back to the core §8 behavior:
   ignore-and-preserve for properties, error for unknown types/functions/
   constraints.

---
