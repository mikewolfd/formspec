# Core Specification Reference Map

> specs/core/spec.md -- 4778 lines, ~242K -- Tier 1: Definition, FEL, Validation, Versioning, Intake Handoff

## Overview

The Core Specification defines the JSON-native declarative form model: Definition and Response documents, the Formspec Expression Language (FEL), the four-phase processing model, structured validation and reports, identity and versioning, and the Intake Handoff boundary record that binds a canonical Response to a ValidationReport snapshot and respondent-ledger evidence for workflow acceptance. It is Tier 1 of the architecture; rendering remains advisory hints only (Theme Tier 2, Components Tier 3). **Screener routing** is normative only in the standalone [Screener Specification](../screener/screener-spec.md); the embedded `screener` property on Definitions is deprecated and removed from the Definition schema.

## Section Map

### Front Matter and Introduction (Lines 1-193)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| Abstract | Abstract | Formspec as a format-agnostic, JSON-native standard for declarative form definition and validation, independent of rendering; draws on XForms, SHACL, FHIR R5. | JSON-native, renderer-agnostic, self-contained definition | Understanding what Formspec is and its design heritage |
| Status | Status of This Document | Draft disclaimer; not submitted to a standards body. | draft, unstable | Determining spec maturity |
| Conventions | Conventions and Terminology | RFC 2119 keywords and glossary (conformant processor, definition document, normative, informative). | MUST/SHOULD/MAY, conformant processor, definition document | Interpreting normative language |
| S1 | 1. Introduction | Purpose and positioning of the spec. | -- | Orienting to the spec |
| S1.1 | 1.1 Motivation | Why Formspec exists: gaps in JSON Schema, React form stacks, low-code, FHIR Questionnaire, ODK XForms. | JSON Schema limitations, XForms heritage, fragmentation | Understanding the problem Formspec solves |
| S1.2 | 1.2 Design Principles | Seven principles (AD-01 through AD-07): schema is data, separate structure/behavior/presentation, JSON-native, language-agnostic, layered complexity, extensible without forking, structured validation. | AD-01..AD-07, three-layer separation | Resolving design tradeoffs |
| S1.3 | 1.3 Scope | In-scope: Definition, Response, **Intake Handoff** JSON contracts, FEL, processing model, validation results, extension points. Out-of-scope: rendering, transport, auth, storage, non-JSON serialization (unless companion). | Intake Handoff, in-scope vs out-of-scope | Deciding if behavior belongs in Core |
| S1.4 | 1.4 Conformance | Core vs Extended tiers. | Core conformance, Extended conformance | Minimum processor requirements |
| S1.4.1 | 1.4.1 Formspec Core | Nine Core requirements (parse definitions, data types, bind MIPs, FEL, shapes, processing model, identity/versioning, option sets, cycle detection); optional strict subset of FEL functions with explicit errors. | data types, bind MIPs, FEL, shapes, processing model, cycle detection | Building a Core-conformant processor |
| S1.4.2 | 1.4.2 Formspec Extended | Extended = Core plus extensions, **screener (standalone spec)**, composition, migrations, prePopulate. | Extended processor, screener-spec | Building an Extended-conformant processor |
| S1.4.3 | 1.4.3 Conformance Prohibitions | MUST NOT: silently substitute versions, validate non-relevant fields, block persistence on validation state. | VP-01, non-relevant exemption, VE-05 | Avoiding conformance violations |

### Conceptual Model (Lines 195-1149)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S2 | 2. Conceptual Model | Six core abstractions and relationships. | Definition, Instance, Item, Bind, Shape, Response | Big-picture data model |
| S2.1 | 2.1 Core Abstractions | Foundation of the six abstractions. | six abstractions | Architecture overview |
| S2.1.1 | 2.1.1 Definition | Versioned form spec; identity `(url, version)` globally unique and immutable; `$formspec`. | Definition, url, version, identity tuple | Creating or parsing a Definition |
| S2.1.2 | 2.1.2 Instance | JSON mirror of item tree; `$primary` and named secondaries; mapping rules field→scalar, group→object/repeat array, display→nothing. | primary instance, secondary instance, instance mirroring | How structure maps to JSON data |
| S2.1.3 | 2.1.3 Item | Tree nodes: `field`, `group` (optional repeat), `display`; `dataType` on fields; key pattern; data type catalog including `money`. | field, group, display, dataType, key | Defining items |
| S2.1.4 | 2.1.4 Bind | Behavioral attachment by path: calculate, relevant, required, readonly, constraint, default; reactive evaluation. | calculate, relevant, required, readonly, constraint, default | Reactive form behavior |
| S2.1.5 | 2.1.5 Validation Shape | Named composable rules: id, target, message; constraint and and/or/not/xone; ValidationResult entries. | Shape, id, target, constraint, and/or/not/xone | Cross-field validation |
| S2.1.6 | 2.1.6 Response | Instance pinned to definition version; status lifecycle; `data`; optional `authoredSignatures` (when present, top-level `id` REQUIRED); `validationResults` snapshot; schema from `response.schema.json`. | Response, definitionUrl, definitionVersion, status, authoredSignatures, VE-05 | Response documents and signing envelope |
| S2.1.6.1 | 2.1.6.1 Intake Handoff | Boundary record when intake is ready for workflow: binds Response, ValidationReport ref, ledger head, pinned `definitionRef`; `initiationMode` workflowInitiated vs publicIntake; **normative `caseRef` string** for workflow-initiated acceptance; schema `intake-handoff.schema.json`. | Intake Handoff, handoffId, initiationMode, caseRef, responseHash, ledgerHeadRef, definitionRef | Intake-to-workflow handoff and acceptance |
| S2.1.7 | 2.1.7 Data Source | External/supplemental data for FEL: inline `data`, URL `source`, `formspec-fn:`; secondaries read-only unless `readonly: false` scratchpad. | Data Source, @instance(), formspec-fn:, readonly | Secondary instances |
| S2.2 | 2.2 Relationships | Formal constraints linking Definition, Items, Binds, Shapes, Responses, Instances. | relationship constraints, path resolution | Structural integrity |
| S2.3 | 2.3 The Three Layers | Structure (Items), Behavior (Binds+Shapes), Presentation (advisory only). | three layers, presentation out of scope | Architectural boundaries |
| S2.3 (L1) | Layer 1: Structure Layer (Items) | What data is collected. | item tree, data types | Structure-only authoring |
| S2.3 (L2) | Layer 2: Behavior Layer (Binds + Shapes) | How data behaves; all FEL; no rendering instructions. | reactive behavior, FEL | Logic layer |
| S2.3 (L3) | Layer 3: Presentation Layer | Advisory hints; Theme and Component specs extend. | presentation hints, Theme spec, Component spec | Presentation tier |
| S2.4 | 2.4 Processing Model | Rebuild → Recalculate → Revalidate → Notify; deferred batch processing; presentation excluded from cycle. | Rebuild, Recalculate, Revalidate, Notify, deferred processing | Engine evaluation order |
| S2.4 (Ph1) | Phase 1: Rebuild | Structural changes; dependency DAG; acyclicity. | rebuild, DAG, cycle detection | Repeat add/remove, definition swap |
| S2.4 (Ph2) | Phase 2: Recalculate | Dirty nodes, affected subgraph, topological order, calculate/relevant/required/readonly; stability iteration. | dirty nodes, topological sort, minimal recalculation | Incremental recalculation |
| S2.4 (Ph3) | Phase 3: Revalidate | Constraints, required, shapes; CONSTRAINT_PARSE_ERROR surfaced. | revalidate, CONSTRAINT_PARSE_ERROR | Validation pipeline |
| S2.4 (Ph4) | Phase 4: Notify | State change signals to presentation; implementation-defined. | notify | UI integration |
| S2.4 (Def) | Deferred Processing | Batch: defer all phases until end; final state same as sequential. | batch operations | Bulk load / import |
| S2.4 (Pres) | Presentation Hints and Processing | Presentation does not participate in cycle; FEL must not reference presentation. | presentation isolation | Preventing presentation leakage |
| S2.5 | 2.5 Validation Results | Structured ValidationResult model (overview before §5 detail). | ValidationResult, structured validation | Validation output shape |
| S2.5.1 | 2.5.1 ValidationResult Entry | severity, path, message, constraintKind, code, source, shapeId, constraint; standard codes including CONSTRAINT_PARSE_ERROR. | constraintKind, REQUIRED, TYPE_MISMATCH, SHAPE_FAILED | Producing/consuming results |
| S2.5.2 | 2.5.2 Severity Levels | error, warning, info; strict ordering. | error, warning, info | Severity semantics |
| S2.5.3 | 2.5.3 Aggregated Validation State | invalid / valid-with-warnings / valid. | aggregated state | Summary UX |
| S2.5.4 | 2.5.4 Non-Relevant Fields | No ValidationResults for non-relevant; stale results removed on transition. | non-relevant validation suppression | Relevance and validation |

### Expression Language -- FEL (Lines 1151-2025)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S3 | 3. Expression Language -- Formspec Expression Language (FEL) | Deterministic, side-effect-free expression language scoped to form logic. | FEL, deterministic, side-effect-free | Expression language scope |
| S3.1 | 3.1 Design Goals | Host independence, familiarity, PEG grammar, determinism (except `now()`), no implicit coercion. | PEG, determinism, type safety | FEL philosophy |
| S3.2 | 3.2 Field References | `$` sigil and path forms. | field references, `$` | Reading form data in FEL |
| S3.2.1 | 3.2.1 Simple References | `$fieldKey`, `$parent.child`, `$` self in constraints; lexical scoping in repeats. | `$parent.child`, self-reference | Basic references |
| S3.2.2 | 3.2.2 Repeat References | `$repeat[n]`, `[*]`, `@current`, `@index` (1-based), `@count`; OOB index errors. | `[*]`, @current, @index, @count | Repeat aggregates |
| S3.2.3 | 3.2.3 Cross-Instance References | `@instance('name').path`; literal name; undeclared instance = definition error. | @instance(), secondary instance | Cross-instance data |
| S3.3 | 3.3 Operators | Precedence table and semantics. | operator precedence, associativity | Complex expressions |
| S3.3 (prec) | Precedence Table | Ten levels from ternary through unary. | precedence levels 1-10 | Evaluation order |
| S3.3 (sem) | Operator Semantics | Arithmetic, comparison, logic (strict booleans), `&` concat, `??`, `in`, ternary short-circuit. | `&`, `??`, in, ternary | Type rules per operator |
| S3.4 | 3.4 Type System | Primitives + homogeneous arrays. | FEL types | Type landscape |
| S3.4.1 | 3.4.1 Primitive Types | string, number (decimal), boolean, date, money, null. | money, date literal @YYYY-MM-DD, decimal precision | Literals and JSON shapes |
| S3.4.2 | 3.4.2 Compound Type | Arrays from wildcards and literals; same-type elements. | array, homogeneous | Collections |
| S3.4.3 | 3.4.3 Coercion Rules | No implicit coercion; explicit `number`, `string`, `boolean`, `date`; null vs `''`. | cast functions, null vs empty string | Conversions |
| S3.5 | 3.5 Built-in Functions | Required function library. | built-in functions | Function lookup |
| S3.5.1 | 3.5.1 Aggregate Functions | sum, count, *Where variants, avg, min, max; element-wise pipelines. | sumWhere, countWhere, element-wise | Aggregates over repeats |
| S3.5.2 | 3.5.2 String Functions | length, contains, substring (1-based), matches, format, trim, etc. | matches, format, substring | String ops |
| S3.5.3 | 3.5.3 Numeric Functions | round (banker's), floor, ceil, abs, power. | round, floor, ceil | Numeric ops |
| S3.5.4 | 3.5.4 Date Functions | today, now (non-deterministic), dateDiff, dateAdd, time helpers. | today, now, dateDiff | Date/time |
| S3.5.5 | 3.5.5 Logical Functions | if, coalesce, empty, present, selected. | if, coalesce, empty, present | Conditionals and emptiness |
| S3.5.6 | 3.5.6 Type-Checking Functions | isNumber, isString, isDate, isNull, typeOf. | isNull, typeOf | Runtime type tests |
| S3.5.7 | 3.5.7 Money Functions | money, moneyAmount, moneyCurrency, moneyAdd, moneySum, moneySumWhere. | moneySumWhere, same currency | Money |
| S3.5.8 | 3.5.8 MIP-State Query Functions | valid, relevant, readonly, required for paths (after Recalculate). | valid($path), MIP query | Cross-field MIP queries |
| S3.5.9 | 3.5.9 Repeat Navigation Functions | prev, next, parent within repeat context. | prev, next, parent | Row navigation |
| S3.5.10 | 3.5.10 Locale, Runtime Metadata, and Instance Lookup | instance(name, path?), locale(), runtimeMeta, pluralCategory (CLDR). | locale, pluralCategory, BCP 47 | i18n and metadata |
| S3.6 | 3.6 Dependency Tracking | Graph construction and incremental re-evaluation. | dependency graph, reactivity | Engine implementation |
| S3.6.1 | 3.6.1 Reference Extraction | Parse-time reference extraction; G=(V,E). | reference extraction | Building the graph |
| S3.6.2 | 3.6.2 Topological Ordering | DAG requirement; cycle diagnostics; topo order. | DAG, topological sort, cycle detection | Ordering and errors |
| S3.6.3 | 3.6.3 Incremental Re-evaluation | Dirty closure; minimal recalculation guarantee. | affected set, minimal recalculation | Performance |
| S3.6.4 | 3.6.4 Wildcard Dependencies | `[*]` depends on whole collection; collection-level dirtiness. | wildcard dependencies | Aggregate invalidation |
| S3.7 | 3.7 Grammar (Informative) | PEG sketch; normative grammar is companion; `let...in` disambiguation note. | PEG grammar, let expressions | Parser implementation |
| S3.8 | 3.8 Null Propagation | General propagation vs boolean-context defaults. | null propagation | Null debugging |
| S3.8.1 | 3.8.1 General Rule | Defaults per relevant/required/readonly/constraint/if contexts. | relevant null→true, constraint null→true | Context-specific nulls |
| S3.8.2 | 3.8.2 Functions with Special Null Handling | coalesce, empty, count, sum, casts, etc. | special null handling | Exceptions to propagation |
| S3.8.3 | 3.8.3 Missing Field References | Missing value → null; undefined key → definition error. | undefined reference | Load-time vs runtime |
| S3.9 | 3.9 Element-Wise Array Operations | Same-length element-wise ops; broadcast scalar; length mismatch error. | element-wise, broadcast | Vectorized repeat math |
| S3.10 | 3.10 Error Handling | Definition vs evaluation errors. | definition errors, evaluation errors | Error classes |
| S3.10.1 | 3.10.1 Definition Errors | Syntax, undefined ref/instance/function, cycles, arity, read-only write, etc. | circular dependency, arity mismatch | Load-time validation |
| S3.10.2 | 3.10.2 Evaluation Errors | Type errors, div0, OOB, regex → null + diagnostic; not end-user facing. | diagnostic, graceful degradation | Runtime evaluator |
| S3.11 | 3.11 Reserved Words | and, or, not, in, true, false, null; function namespace reserved. | reserved words | Naming collisions |
| S3.12 | 3.12 Extension Functions | Pure, total, non-colliding extensions; definitions SHOULD declare `extensions`. | extension functions, pure, total | Extending FEL |

### Definition Schema (Lines 2027-2762)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S4 | 4. Definition Schema | JSON shape for Definitions. | Definition schema | Authoring/validating definitions |
| S4.0 | 4.0 Bottom Line Up Front | Minimum required top-level fields; schema is contract. | $formspec, url, version, status, title, items | Quick validity checklist |
| S4.1 | 4.1 Top-Level Structure | Full property table from `definition.schema.json`; optional binds, shapes, instances, variables, optionSets, migrations, formPresentation, extensions, nonRelevantBehavior, etc. | top-level properties, nonRelevantBehavior | Complete definition authoring |
| S4.1.1 | 4.1.1 Form Presentation | pageMode, labelPosition, density, defaultCurrency, direction, wizard/tabs options. | formPresentation, pageMode, wizard, tabs | Form-wide presentation defaults |
| S4.1.2 | 4.1.2 Page Mode Processing | Wizard/tabs behavioral requirements; property applicability. | allowSkip, showProgress, defaultTab | Multi-page behavior |
| S4.2 | 4.2 Item Schema | Items require key and type. | Item schema | Item nodes |
| S4.2.1 | 4.2.1 Common Item Properties | Global key uniqueness; label required; hint, description, labels contexts. | key uniqueness, labels short/pdf/csv | Any item |
| S4.2.2 | 4.2.2 Group Items | children, repeatable, minRepeat, maxRepeat. | minRepeat, maxRepeat | Sections and repeats |
| S4.2.3 | 4.2.3 Field Items | dataType, options, optionSet, initialValue, prePopulate, semanticType, currency, precision, children on fields where allowed. | optionSet, initialValue, prePopulate | Data fields |
| S4.2.4 | 4.2.4 Display Items | No data; only relevant bind meaningful. | display items | Static content |
| S4.2.5 | 4.2.5 Presentation Hints | Advisory `presentation`; unknown top-level keys ignored. | presentation object | Per-item presentation |
| S4.2.5.1 | 4.2.5.1 Widget Hint | widgetHint tables by type/dataType; `x-` custom. | widgetHint | Widget suggestions |
| S4.2.5.2 | 4.2.5.2 Layout | flow, columns, page, colSpan, newRow; no parent→child cascade. | layout, colSpan, page | Layout hints |
| S4.2.5.3 | 4.2.5.3 Style Hints | styleHints emphasis and size. | styleHints | Visual tokens |
| S4.2.5.4 | 4.2.5.4 Accessibility | role, description, liveRegion. | accessibility, liveRegion | A11y hints |
| S4.2.5.5 | 4.2.5.5 Precedence and Interaction | formPresentation defaults; widgetHint vs semanticType; disabledDisplay; no cascade. | presentation precedence | Conflict resolution |
| S4.2.5.6 | 4.2.5.6 Forward Compatibility | presentation additionalProperties true at top; false nested. | forward compatibility | Schema evolution |
| S4.3 | 4.3 Bind Schema | Binds attach behavior by path. | Bind schema | calculate, relevant, validation |
| S4.3.1 | 4.3.1 Bind Properties | path, MIPs, constraintMessage, default, whitespace, excludedValue, nonRelevantBehavior, disabledDisplay. | whitespace, excludedValue, disabledDisplay | Full bind surface |
| S4.3.2 | 4.3.2 Inheritance Rules | relevant AND; readonly OR; required/calculate/constraint not inherited. | relevance inheritance, readonly inheritance | Hierarchical behavior |
| S4.3.3 | 4.3.3 Path Syntax | Dot paths, `[*]`, `[@index=N]`; 1-based FEL vs 0-based resolved paths in results. | FieldRef, resolved path, [@index=N] | Paths and indexing |
| S4.4 | 4.4 Instance Schema | Secondary instances: source, static, data, schema, readonly. | instances, readonly scratchpad | External data |
| S4.4.1 | 4.4.1 Instance Properties | Cardinality and semantics per property. | source, data fallback | Instance configuration |
| S4.4.2 | 4.4.2 Referencing Instances in Expressions | @instance('name')...; unavailable → null. | @instance() | FEL access to instances |
| S4.5 | 4.5 Variables | Top-level variables; @name; scope item or `#`; continuous recalc; no cycles. | variables, @name, scope | Shared subexpressions |
| S4.5.1 | 4.5.1 Variable Properties | name, expression, scope table. | variable properties | Declaring variables |
| S4.5.2 | 4.5.2 Evaluation Semantics | Dependency-ordered continuous evaluation; use initialValue for one-shot. | continuous recalculation | vs calculate/initialValue |
| S4.6 | 4.6 Option Sets | Named reusable options; inline or external source with valueField/labelField. | optionSets | Shared choice lists |
| S4.6.1 | 4.6.1 OptionSet Properties | options vs source shape. | valueField, labelField | Option set authoring |
| S4.7 | 4.7 Screener Routing *(Deprecated)* | Embedded screener removed from Definition schema; use standalone `$formspecScreener` per Screener spec. | deprecated, $formspecScreener | **Use ../screener/screener-spec.md** -- not Definition `screener` |

### Validation (Lines 2764-3081)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S5 | 5. Validation | Severity, shapes, results, report, modes, NRB, external merge. | validation system | Validation pipeline |
| S5.1 | 5.1 Severity Levels | VC-01: valid iff zero errors; differs from SHACL. | VC-01, error/warning/info | Submission vs warnings |
| S5.2 | 5.2 Validation Shape Schema | Named shapes with target, severity, message, activeWhen, timing. | Shape schema | Authoring shapes |
| S5.2.1 | 5.2.1 Shape Properties | id, target, constraint, message interpolation, context, activeWhen, timing. | activeWhen, timing | Shape authoring |
| S5.2.2 | 5.2.2 Composition Operators | and, or, not, xone; shape id or inline FEL; implicit AND with constraint; no cycles. | composition, inline FEL | Composed rules |
| S5.3 | 5.3 Validation Result Schema | Per-failure ValidationResult; required producer cases including bind parse failure. | constraintKind, shapeId | Result entries |
| S5.3.1 | 5.3.1 ValidationResult Properties | path, severity, constraintKind, message, code, shapeId, value, context. | five result sources | Full result shape |
| S5.4 | 5.4 Validation Report Schema | Aggregates results; valid, counts, timestamp; `validation-report.schema.json`. | ValidationReport | Report document |
| S5.4.1 | 5.4.1 ValidationReport Properties | $formspecValidationReport, invariants on counts and valid. | counts invariant, valid | Report generation |
| S5.5 | 5.5 Validation Modes | continuous, deferred, disabled; VE-05; continuous-soft informative; per-shape timing vs global mode. | VE-05, continuous-soft | When validation runs |
| S5.6 | 5.6 Non-Relevant Field Handling | Suppress validation; NRB remove/empty/keep; required off; calculate continues; excludedValue; re-relevance and default. | nonRelevantBehavior, excludedValue | NRB semantics |
| S5.7 | 5.7 External Validation Results | Inject results; source external; merge and validity. | source: external, sourceId | Server-side validation |
| S5.7.1 | 5.7.1 External Result Requirements | Required source field. | external schema | External result shape |
| S5.7.2 | 5.7.2 Merging Rules | Merge, counts, idempotent path+code, clearable. | merging, idempotent injection | Injection semantics |

### Versioning and Evolution (Lines 3083-3366)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S6 | 6. Versioning & Evolution | Identity, algorithms, lifecycle, pinning, derivation, composition, migrations. | versioning, migrations | Version management |
| S6.1 | 6.1 Identity Model | url stable; `url|version`; unversioned resolution rules (Response, derivedFrom, $ref). | pipe syntax, identity | References |
| S6.2 | 6.2 Version Algorithms | semver (default), date, integer, natural; malformed = definition error. | versionAlgorithm | Comparing versions |
| S6.2.1 | 6.2.1 Version Semantics for Form Definitions | RECOMMENDED semver patch/minor/major guidance. | semver guidance | Release policy |
| S6.3 | 6.3 Status Lifecycle | draft → active → retired; no backward transitions; immutability of active content. | draft, active, retired | Lifecycle gates |
| S6.4 | 6.4 Response Pinning | VP-01 pin; VP-02 active immutable. | VP-01, VP-02 | Response–definition binding |
| S6.5 | 6.5 Variant Derivation | derivedFrom informational only; tooling lineage and pre-pop hints. | derivedFrom | Lineage metadata |
| S6.6 | 6.6 Modular Composition | Group `$ref` + keyPrefix; assembly at publish; path rewrite; collisions. | $ref, keyPrefix, assembledFrom | Reuse across definitions |
| S6.6.1 | 6.6.1 Composition Properties | $ref with optional `#itemKey` fragment. | $ref fragment | Composition authoring |
| S6.6.2 | 6.6.2 Assembly | Recursive resolution; circular $ref error; metadata informational. | assembly rules | Assembler implementation |
| S6.7 | 6.7 Version Migrations | migrations.from map; fieldMap transforms; new Response, status reset. | fieldMap, transform | Upgrading responses |
| S6.7.1 | 6.7.1 Migration Map Structure | from, fieldMap, defaults structure. | migration descriptor | Authoring migrations |
| S6.7.2 | 6.7.2 Migration Semantics | Preserve original; path carry-forward rules. | migration semantics | Migration behavior |

### Examples (Lines 3368-4294)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S7 | 7. Concrete Examples | Normative JSON examples processors MUST consume. | normative examples | Conformance fixtures |
| S7.1 | 7.1 Budget Line Items with Calculated Totals | Repeat, sum, secondary instance, cross-field shape. | sum(), shape, instances | Totals and balance checks |
| S7.2 | 7.2 Conditional Section with Dependent Validation | relevant group; non-relevant omitted from data. | relevant, non-relevant remove | Conditional sections |
| S7.3 | 7.3 Repeatable Rows with Per-Row Calculations and Cross-Row Total | Per-instance vs aggregate context; warning shapes. | per-instance bind, sum wildcard | Repeat calculations |
| S7.4 | 7.4 Year-over-Year Comparison Warning | Variables, cross-instance, interpolation; valid false from required not warning. | @prior_total, variables | YoY warnings |
| S7.5 | 7.5 Screener Routing to Form Variants *(Deprecated)* | Pointer to standalone Screener spec for examples and Determination Records. | deprecated, screener-spec | **Screener examples → screener spec** |
| S7.6 | 7.6 External Validation Failure | Local pass + external error; combined report; absence = constraint pass. | source external, combined report | External validation |

### Extension Points (Lines 4296-4473)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S8 | 8. Extension Points | x- prefix mandatory for extensions; unknown non-prefixed = error. | x- prefix, extension points | Safe extension |
| S8.1 | 8.1 Custom Data Types, Functions, and Constraints | Extension Registry; baseType fallback for types; fail on unsupported fn/constraint. | Extension Registry, baseType | Domain extensions |
| S8.1.1 | 8.1.1 Concept and Vocabulary Registry Entries | concept and vocabulary metadata; SKOS; no processing-model effect. | semanticType, vocabulary, SKOS | Ontology/registry metadata |
| S8.4 | 8.4 Extension Properties | extensions object; ignore unknown; preserve round-trip; must not alter core semantics. | extensions, round-trip | Custom metadata |
| S8.5 | 8.5 Extension Namespaces | x-org-domain grouping; version; opaque if unsupported. | extension namespaces | Grouped extensions |

### Lineage (Lines 4475-4700)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S9 | 9. Lineage -- What Was Borrowed and Why | Informative design ancestry and divergences. | lineage, informative | Onboarding and rationale |
| S9.1 | 9.1 From W3C XForms (2003) | MIPs, reactive graph, four phases, repeat, instances; not XML Events/XPath UI. | XForms heritage | XForms comparison |
| S9.2 | 9.2 From W3C SHACL (2017) | Shapes, severities, composition; Formspec valid-only-errors divergence. | SHACL heritage | Validation ancestry |
| S9.3 | 9.3 From HL7 FHIR R5 / SDC (2023) | Identity, pinning, variables, composition, versionAlgorithm; not FHIRPath/resources. | FHIR heritage | Healthcare alignment |
| S9.4 | 9.4 From Secondary Sources | ODK, SurveyJS, JSON Forms, Mapping DSL companion. | ODK, SurveyJS, mapping-spec.md | Miscellaneous influences |
| S9.5 | 9.5 What Is Original to Formspec | FEL, composable shapes + modified SHACL semantics, bind paths, three-layer JSON, cross-instance model, x- extension contract. | original contributions | What is novel |

### Appendix (Lines 4702-4778)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| App A | Appendix A: Requirements Traceability | FT/FL/VR/VS/VE/VX/VC/AD/PR requirements mapped to sections; FL-05 → Screener spec. | requirements traceability | Finding normative home for a requirement |

## Cross-References

| Reference | Target | Context |
|-----------|--------|---------|
| `theme-spec.md` | Theme Specification (Tier 2) | S2.3 Layer 3; S4.2.5.6 informative note -- cascade, tokens, layouts |
| `component-spec.md` | Component Specification (Tier 3) | S4.2.5.6 -- presentation trees, slots |
| `mapping-spec.md` | Mapping DSL Specification | S9.4 -- Response transforms to external formats |
| `../screener/screener-spec.md` | Screener Specification | S1.4.2 Extended; S4.7 deprecated; S7.5 deprecated; Appendix FL-05 -- standalone `$formspecScreener`, Determination Records |
| `schemas/definition.schema.json` | Definition JSON Schema | S4.0, S4.1 -- structural contract |
| `schemas/response.schema.json` | Response JSON Schema | S2.1.6 -- Response envelope |
| `schemas/intake-handoff.schema.json` | Intake Handoff JSON Schema | S2.1.6.1 -- handoff boundary document |
| `schemas/validation-report.schema.json` | ValidationReport JSON Schema | S5.4.1 -- report envelope |
| FEL Normative Grammar v1.0 | FEL Grammar companion | S3.7 -- normative grammar vs informative PEG |
| Extension Registry specification | Extension Registry spec | S8.1 -- publishing custom types/functions/constraints |
| Ontology specification | Ontology spec | S8.1.1 -- vocabulary bindings complement registry |
| RFC 2119, RFC 8174 | IETF | Conventions -- normative keywords |
| RFC 8259 | IETF | Conventions -- JSON |
| RFC 6901 | IETF | Conventions -- JSON Pointer |
| RFC 3986 | IETF | Conventions -- URI |
| Semantic Versioning 2.0.0 | semver.org | S6.2 -- default version algorithm |
| ISO 8601 | External | Dates/times |
| ISO 4217 | External | money currency codes |
| BCP 47 | External | S3.5.10 -- `locale()` |
| Unicode CLDR | External | S3.5.10 -- `pluralCategory()` |
| W3C SKOS | External | S8.1.1 -- concept relationships |

## Key Schemas Defined

| Schema | Location | Purpose |
|--------|----------|---------|
| **FormDefinition** | S4.1, `schemas/definition.schema.json` | Complete form specification |
| **Item** | S4.2 | field / group / display nodes |
| **Bind** | S4.3 | Behavioral MIPs by path |
| **Instance** | S4.4 | Secondary data sources |
| **Variable** | S4.5 | Scoped named expressions |
| **OptionSet** | S4.6 | Reusable choice lists |
| **Validation Shape** | S5.2 | Composable validation rules |
| **ValidationResult** | S5.3 | Single finding |
| **ValidationReport** | S5.4, `schemas/validation-report.schema.json` | Aggregated findings |
| **Response** | S2.1.6, `schemas/response.schema.json` | Pinned in-progress or completed data |
| **Intake Handoff** | S2.1.6.1, `schemas/intake-handoff.schema.json` | Intake-to-workflow boundary with evidence refs |
| **Migration Map** | S6.7 | Response version transforms |
| **Presentation** | S4.2.5 | Advisory per-item hints |
| **FormPresentation** | S4.1.1 | Form-wide presentation defaults |

## Critical Behavioral Rules

1. **Null propagation defaults differ by context (S3.8.1).** In `relevant`, null → true. In `required`, null → false. In `readonly`, null → false. In `constraint`, null → true (passes). In `if()` condition, null → evaluation error.

2. **`relevant` inherits via AND; `readonly` inherits via OR; `required` does not inherit (S4.3.2).**

3. **Non-relevant fields: `calculate` still runs (S5.6 rule 4).** `excludedValue` controls what dependents see; `nonRelevantBehavior` controls serialized submission shape.

4. **Saving MUST NEVER be blocked by validation (VE-05, S5.5).** Only transition to `completed` requires zero error-severity results.

5. **Response pinning is absolute (VP-01, S6.4); active definitions are immutable (VP-02).**

6. **Empty string and null differ (S3.4.3); FEL has no implicit coercion** -- use explicit casts; only boolean `false` is false in logic.

7. **`&` concatenates strings; `+` is numeric only (S3.3).**

8. **Element-wise array ops with scalar broadcast (S3.9);** length mismatch is an error.

9. **Evaluation errors yield null plus diagnostic, not user-visible throw (S3.10.2)** -- including division by zero.

10. **Bind paths use FieldRef `[*]` and 1-based FEL indexes; ValidationResult paths use concrete 0-based array indexes (S4.3.3).**

11. **Item `key` MUST be globally unique in the Definition (S4.2.1).**

12. **Processing phases MUST run in order: Rebuild → Recalculate → Revalidate → Notify (S2.4).**

13. **Shape `and`/`or`/`not`/`xone` may mix shape ids and inline FEL strings; lookup-first then treat as FEL (S5.2.2).**

14. **`initialValue` `=expr` runs once; `calculate` is continuous; `default` applies on non-relevant → relevant (S4.2.3, S4.3.1, S4.5.2).**

15. **Screener routing is defined in the standalone Screener specification (`$formspecScreener`); the Definition `screener` property is deprecated and not in the Definition schema (S4.7, S1.4.2).**
