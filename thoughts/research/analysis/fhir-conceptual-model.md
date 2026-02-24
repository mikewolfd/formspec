# FHIR R5 Questionnaire & SDC — Research Notes

> Focus: design decisions and conceptual model. What transfers to a JSON-native standard?

---

## 1. FHIR R5 Questionnaire (hl7.org/fhir/questionnaire.html)

### Versioning & Identity Model

- **Three-part identity**: `url` (globally unique canonical URI) + `version` (business version string) + `status`
- **Status lifecycle**: `draft → active → retired` (plus `unknown`). Status is mandatory.
- `versionAlgorithm` — explicit declaration of how to compare versions (semver, date-based, etc.)
- `derivedFrom` — links to parent Questionnaire(s), enabling lineage tracking
- **Canonical references** can be version-pinned: `http://example.org/Q|2.0`
- Design lesson: **separate the identity (url) from the business version from the lifecycle state**. All three are needed.

### Definition / Response Separation

- **Questionnaire** = the definition (questions, rules, constraints, answer options). Subject-independent, time-independent.
- **QuestionnaireResponse** = a specific user's answers at a specific time, for a specific subject.
- Response carries **no** rules or potential answers — only actual answers chosen.
- Linked by `linkId` (globally unique within a Questionnaire; may repeat in Response for repeating items).
- Design lesson: **hard separation between schema/definition and instance/response** is fundamental. The response is a thin data-only document.

### Item Types

- Three fundamental sub-types distinguished by `type`:
  - **display** — text/instructions only, no answer, no children
  - **group** — organizes children, no direct answer
  - **question** — captures an answer; type encodes the answer data type
- Question types: `boolean`, `decimal`, `integer`, `date`, `dateTime`, `time`, `string`, `text`, `url`, `coding`, `quantity`, `reference`, `attachment`
- Items nest arbitrarily: groups contain questions/groups; questions can also contain child questions/groups ("panels")
- `repeats` (boolean) — whether an item can appear multiple times
- `required` (boolean) — whether at least one answer is needed
- `readOnly` (boolean) — no human editing
- `maxLength` — for simple text types
- Design lesson: **a small fixed set of primitive answer types** plus grouping/display is sufficient. The type system is intentionally simple.

### enableWhen / enableBehavior / disabledDisplay

- `enableWhen` — conditional display/enablement of items based on answers to other questions
  - References another item by `linkId` (the `question` field)
  - Operators: `exists | = | != | > | < | >= | <=`
  - Compared against a typed answer value
- `enableBehavior` — `all` (AND) or `any` (OR) when multiple enableWhen conditions exist
  - Required when >1 enableWhen present
- `disabledDisplay` — what happens when an item is disabled:
  - `hidden` — not shown at all
  - `protected` — shown but not editable (greyed out)
- **Group cascading**: if a group is disabled, ALL descendants are disabled regardless of their own enableWhen. Same for readOnly.
- Design lesson: **simple comparison-based visibility rules** cover 80% of cases. The `all/any` combiner is intentionally limited — complex logic is pushed to SDC's `enableWhenExpression`.

### Answer Options & Answer Value Sets

- Two mutually exclusive mechanisms:
  1. **answerOption** — inline list of permitted answers (simple, self-contained)
  2. **answerValueSet** — reference to an external ValueSet (reusable, supports coded terminologies)
- `answerConstraint` controls strictness:
  - `optionsOnly` — must pick from the list
  - `optionsOrType` — can pick from list OR enter a value of the item's type
  - `optionsOrString` — can pick from list OR enter free text
- `answerOption.initialSelected` — pre-select specific options
- Design lesson: **inline options for simple cases, external value sets for complex/shared cases**. The constraint mode elegantly handles open vs. closed choice.

### initial Values

- `initial.value[x]` — one or more fixed initial values (mutually exclusive with `answerOption.initialSelected`)
- Multiple initial values only for repeating items
- Cannot be set on groups or display items

### item.definition

- Links an item to an ElementDefinition in a StructureDefinition (or logical model)
- Allows inheriting: code, text, required, repeats, maxLength, answerValueSet, initial value, min/max constraints
- Inline Questionnaire values **override** definition values
- Enables: extraction from responses into typed resources, pre-population from existing data
- Design lesson: **questions can reference external schemas** for standardization, but must be self-contained enough to render without resolving those references.

### What Transfers to JSON-Native

- The `url + version + status` identity model is universal
- The `definition ↔ response` split is essential for any form system
- `linkId` as the join key between definition and response
- The item type taxonomy (group/display/question) with nested hierarchy
- enableWhen as simple conditional logic referencing other items by ID
- Inline options vs. external option sets with open/closed constraint
- Cascading behavior from groups to descendants

---

## 2. SDC Expressions (build.fhir.org/ig/HL7/sdc/expressions.html)

### Core Concept

- Expressions are the advanced escape hatch beyond the base Questionnaire's simple enableWhen/initial/answerOption
- All introduced via **extensions** (not core fields) — acknowledging that most systems don't need them
- Three expression languages: **FHIRPath**, **CQL**, **x-fhir-query** (FHIR REST queries)

### Expression Data Type (5 elements)

1. `description` — human-readable explanation (strongly encouraged)
2. `name` — makes result available as `%name` variable in descendant expressions
3. `language` — which expression language
4. `expression` — the inline expression text
5. `reference` — pointer to externally maintained expression (rarely used)

### Key Expression Extensions

| Extension | Purpose | Eval Timing |
|---|---|---|
| **variable** | Compute a named value available to descendants | Continuous |
| **initialExpression** | Set initial answer value (once, on creation or enable) | Once |
| **calculatedExpression** | Continuously recomputed answer as dependencies change | Continuous |
| **enableWhenExpression** | Complex conditional logic (replaces enableWhen) | Continuous |
| **answerExpression** | Dynamic allowed answer list | On render/interaction |
| **candidateExpression** | Suggested answers from EHR data (user picks) | On interaction |
| **contextExpression** | Related data shown to help user decide | On interaction |
| **answerOptionToggleExpression** | Show/hide individual answer options dynamically | Continuous |
| **itemPopulationContext** | Establish context resource for a group (drives repeating groups) | Once |
| **targetConstraint** | Custom validation invariants | On validation |

### Variable Scoping Rules

- Variables defined on an item are visible to **that item and all descendants**
- Name collisions on the **same node** = error
- Overriding a name on a **descendant node** = OK (common in modular forms)
- Sibling items can reuse names safely (disjoint scopes)
- Reserved names (e.g., `%questionnaire`, `%resource`, `%context`) cannot be overridden

### calculatedExpression vs initialExpression

- `initialExpression`: runs **once** (on creation or first enable). User can edit afterward. Primarily for pre-population.
- `calculatedExpression`: runs **continuously** as dependencies change. Usually paired with `readOnly`. If user edits a calculated field, it stops auto-updating.
- If calculated value matches stored value on reload → still calculated. If different → treated as user-edited.

### enableWhenExpression

- Replaces base `enableWhen` for complex cases: nested AND/OR/NOT, cross-question comparisons, external data
- Mutually exclusive with base enableWhen
- Must evaluate to boolean

### FHIRPath Context

- `%resource` = root QuestionnaireResponse
- `%context` = the QuestionnaireResponse.item(s) matching the current Questionnaire.item's linkId
- `%questionnaire` = the Questionnaire resource itself
- `%qitem` = the Questionnaire.item corresponding to current context
- Expressions are **defined in the Questionnaire** but **evaluated against the QuestionnaireResponse**

### Dependency Management

- Evaluate in document order (depth-first), but allow iterative re-evaluation until stable
- Must detect circular dependencies and infinite loops gracefully
- Event-based listener approach recommended for efficiency

### Design Lessons for JSON-Native

- **Layered complexity**: base system has simple rules; expression system is an opt-in advanced layer
- **Named variables with lexical scoping** (ancestor → descendant) is a clean model
- The `initialExpression` vs `calculatedExpression` distinction (once vs continuous) is important
- Expression language should be pluggable, but having one default (FHIRPath ≈ JSONPath++) is practical
- **Separation of concerns**: expressions define data flow; the rendering layer just reads computed values

---

## 3. SDC Modular Forms (build.fhir.org/ig/HL7/sdc/modular.html)

### Problem

- Large questionnaires share sections/questions across forms
- Maintaining duplicated content is expensive and error-prone
- Need reuse at both individual-question and section/group granularity

### Three Reuse Mechanisms

1. **subQuestionnaire** (section-level reuse)
   - A `display` item with a `subQuestionnaire` extension pointing to another Questionnaire's canonical URL
   - During assembly, the display item is **replaced** by all root items of the referenced Questionnaire
   - Recursive: sub-questionnaires can reference further sub-questionnaires
   - Canonical reference **SHOULD be version-specific** (author controls what they import)
   - Fallback: the display item's `text` should say something useful if assembly fails

2. **Data Element-based** (question-level reuse via StructureDefinition)
   - `item.definition` points to ElementDefinition in a StructureDefinition
   - Assembly resolves the definition and fills in missing item properties
   - ⚠️ Being deprecated in favor of Questionnaire Library Referencing

3. **Questionnaire Library Referencing** (recommended, question-level reuse)
   - `item.definition` uses format `[Questionnaire URL]#[linkId]`
   - References a specific item (+ its descendants) from another Questionnaire
   - More natural fit since Questionnaire items map 1:1 to Questionnaire items

### Assembly Process ($assemble operation)

- **Two phases**: author in modular form → assemble into self-contained form
- Assembly typically done at **publish time**, not at fill time
- `assemble-expectation` extension flags whether a Questionnaire:
  - Needs assembly before use
  - Can be used as a sub-module
  - Can be used as a root form
  - Codes: `assemble-root`, `assemble-child`, `assemble-root-or-child`, `independent-root-or-child`, `independent-child`

### Assembly Rules

- **linkId uniqueness**: must hold across all assembled content
- **linkIdPrefix**: a special variable prepended to all linkIds from a sub-questionnaire to avoid collisions
  - Also prepended to enableWhen.question references, contained resource IDs, and expression references
- **Extension propagation**: different rules per extension type:
  - `library`, `launchContext` → propagate to root (deduplicated)
  - `variable`, `targetConstraint` → propagate to containing item
  - Most others → ignored or error if at sub-questionnaire root
- **Contained resources** from sub-questionnaires are merged into parent
- **Metadata alignment**: security, language, endpoint must match between parent and child
- Assembled questionnaire keeps same `url` + `version` as the root

### Design Lessons for JSON-Native

- **Modular composition via placeholder items** (display item → replaced by referenced content) is elegant
- **Two-phase workflow** (author modular → publish assembled) keeps fill-time simple
- **linkIdPrefix** for namespace isolation is essential for safe composition
- **Version-pinning** of sub-modules prevents surprise changes
- Assembly expectation metadata helps systems know what they're dealing with
- The three reuse granularities (section, question-from-library, element-definition) map to real needs

---

## 4. SDC Population (build.fhir.org/ig/HL7/sdc/populate.html)

### Core Concept

- Pre-fill form answers from existing data to reduce data entry and increase accuracy
- Two invocation modes:
  1. **Pre-population** (`$populate` operation): server generates a pre-filled QuestionnaireResponse before user sees the form
  2. **Continuous/interactive population**: form filler handles population internally, can use answers to earlier questions to populate later ones

### Three Population Modes (what kind of help)

1. **Automated population** — system identifies exact answer, user just reviews
2. **Choice selection** — system identifies candidates, user picks which apply (e.g., "which of these conditions are relevant?")
3. **Answer context** — system shows related data to help user decide (e.g., showing admission history for a yes/no question)

### Three Population Mechanisms (how it's done)

#### A. Observation-based (simplest)

- Uses `item.code` (usually LOINC) + `observationLinkPeriod` extension
- System queries for most recent Observation matching the code within the time window
- Populates from `Observation.value`
- Hierarchical: period defined on parent applies to all coded descendants (unless overridden)
- Only supports automated population, non-repeating items
- Bidirectional: same metadata supports extraction back to Observations

#### B. Expression-based (most flexible)

- Uses the expression extensions from §2:
  - `launchContext` → what context is available (patient, encounter, user, etc.)
  - `variable` → intermediate queries/calculations
  - `itemPopulationContext` → establish context for a group (creates one repetition per result)
  - `initialExpression` → set initial answer (automated population)
  - `candidateExpression` → suggest answers for user selection (choice selection)
  - `contextExpression` → show related data (answer context)
- Supports all three population modes
- Can chain: query results → variables → expressions → answers
- `candidateExpression` on a repeating group: creates one group instance per user-selected candidate

#### C. StructureMap-based (most powerful, most complex)

- Uses FHIR Mapping Language (StructureMap resource)
- `sourceQueries` → batch of FHIR queries to execute
- `sourceStructureMap` → transforms query results into a QuestionnaireResponse
- Supports iteration, concept translation, complex transformations
- Only supports automated pre-population (not interactive)
- If StructureMap present, it takes precedence over all other mechanisms
- Drawback: all-or-nothing — if map fails, no output at all

### Re-population Rules

- Re-population only at user request
- Never silently revert user-edited answers
- Highlight changes to user
- Changed fields should be flagged for review
- On reload of saved response: if calculated value differs from stored → treat as user-edited, don't auto-update

### Key Considerations

- Population is essentially a **mapping problem** — mapping between question definitions and source data elements
- Mapping errors are dangerous (incorrect data sharing); human review is **essential**
- Access control: population must not expose data the user wouldn't normally see
- `enableWhen` items should still be populated even if currently disabled (data might be needed if enabled later), but disabled answers must not be shown
- External dependencies (launch context, queries) may change between sessions — best to capture needed context into hidden answers for stable validation

### Design Lessons for JSON-Native

- **Three tiers of population complexity** map to real implementation capabilities:
  1. Code-based lookup (trivial to implement)
  2. Expression-based (medium complexity, most flexible)
  3. Transform-based (expert-level, maximum power)
- The **automated / choice / context** trichotomy captures all real population patterns
- `launchContext` as a declared set of runtime inputs is a clean interface contract
- `itemPopulationContext` (one group repetition per query result) is a powerful pattern for dynamic repeating sections
- **Re-population semantics** (don't clobber user edits, highlight changes) are important UX rules that should be specified
- Population metadata should be separable from the form definition (SDC's `derivedFrom` + separate population metadata supports this)

---

## Summary: Key Patterns That Transfer to Any JSON-Native Form Standard

| Pattern | FHIR Mechanism | Transferable Concept |
|---|---|---|
| Identity | url + version + status | Canonical URI + semver + lifecycle state |
| Schema/Instance split | Questionnaire / QuestionnaireResponse | Form definition / Form response (thin, data-only) |
| Item taxonomy | group / display / question(typed) | Three item roles with typed answers |
| Join key | linkId | Stable, unique item identifier bridging definition ↔ response |
| Simple conditionals | enableWhen + enableBehavior | Compare answer to value, combine with AND/OR |
| Advanced conditionals | enableWhenExpression | Expression language for complex logic |
| Once vs continuous | initialExpression vs calculatedExpression | Distinguish init-time vs live-updating computed values |
| Variable scoping | variable extension + name | Named computed values with lexical (ancestor→descendant) scope |
| Answer constraints | answerOption / answerValueSet / answerConstraint | Inline options, external option sets, open/closed choice |
| Modular composition | subQuestionnaire + $assemble | Placeholder items replaced by referenced sub-forms at publish time |
| Namespace isolation | linkIdPrefix | Prefix-based namespacing for composed forms |
| Population tiers | Observation / Expression / StructureMap | Code-based lookup → expression-based → full transform |
| Population modes | initial / candidate / context | Auto-fill / suggest choices / show context |
| Runtime context | launchContext | Declared inputs (patient, user, encounter) as a contract |
| Group-from-query | itemPopulationContext | One group repetition per query result |
| Cascading behavior | Group readOnly/disabled → descendants | Parent state overrides children |
| Disabled display | disabledDisplay: hidden/protected | Hide vs grey-out disabled items |
