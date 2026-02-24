# W3C SHACL Specification — Deep Analysis

## Shapes Constraint Language (W3C Recommendation)

Source: <https://www.w3.org/TR/shacl/>

---

## 1. Core Validation Model

### What is a Shape?

A **shape** is an identifiable entity (IRI or blank node) that declares a set of **conditions** (constraints) that data nodes must satisfy. Shapes exist in a **shapes graph** (an RDF graph containing shape declarations) and are validated against a **data graph** (any RDF graph containing the actual data).

A node qualifies as a shape if ANY of these conditions hold:

- It is declared as an instance of `sh:NodeShape` or `sh:PropertyShape`
- It is the subject of a target declaration (`sh:targetClass`, `sh:targetNode`, etc.)
- It is the subject of a triple whose predicate is a constraint parameter
- It appears as the value of a shape-expecting parameter (like `sh:node`, or as a member of an `sh:or` list)

### NodeShape vs PropertyShape

**NodeShape**: Validates the focus node itself. It does NOT have an `sh:path` property. Constraints apply directly to the focus node as a whole.

**PropertyShape**: Validates the **value nodes** reachable from the focus node via a property path. It MUST have exactly one `sh:path` property. The path determines which nodes in the data graph are the "value nodes" that get tested.

These two types are **disjoint** — a shape cannot be both. The distinguishing feature is the presence/absence of `sh:path`.

**Critical conceptual point**: `sh:Shape` is the superclass of both. Both can carry targets, severity, messages, and deactivation flags.

### How Shapes Attach to Data

Shapes are **completely separate** from data. They connect via:

1. **Target declarations** on the shape (specifying which data nodes to validate)
2. **Explicit invocation** (a processor is told to validate node X against shape Y)
3. **Nested references** (a constraint like `sh:node` causes a value node to be validated against another shape)

### Relationship: Shapes → Constraints

Shapes **declare** constraints by having values for the **parameters** of **constraint components**. A constraint component (e.g., `sh:MinCountConstraintComponent`) defines:

- One or more **mandatory parameters** (e.g., `sh:minCount`)
- Zero or more **optional parameters** (e.g., `sh:flags` for pattern matching)
- **Validators** that define how to check the constraint

When a shape has values for ALL mandatory parameters of a component, it implicitly declares a constraint of that kind. Multiple parameters of single-parameter components on the same shape are conjunctive (all must be satisfied).

---

## 2. Three Severity Levels

### The Levels

| Severity | IRI | Meaning |
|---|---|---|
| **Violation** | `sh:Violation` | A constraint violation (the default) |
| **Warning** | `sh:Warning` | A non-critical constraint violation indicating a warning |
| **Info** | `sh:Info` | A non-critical constraint violation indicating an informative message |

### How They Are Declared

Severity is declared on the **shape** (not on individual constraints):

```
ex:MyPropertyShape
    sh:path ex:name ;
    sh:minCount 1 ;
    sh:severity sh:Warning .
```

If `sh:severity` is not specified, **`sh:Violation` is the default**.

All validation results produced by a given shape inherit that shape's severity level.

### Impact on Conformance

**Critical design decision**: Severity has **NO impact on validation logic**. It does NOT determine whether data "conforms." The `sh:conforms` boolean is `true` if and only if **zero validation results are produced** — regardless of their severity.

This means: A shape with `sh:severity sh:Info` that produces results will cause `sh:conforms` to be `false`, just like a Violation would.

Severity is purely a **categorization mechanism** for UI/reporting tools. Any IRI can be used as a custom severity (not limited to the three built-ins).

---

## 3. Structured ValidationResult

### The `sh:ValidationResult` Structure

Each validation result is a node (IRI or blank node) of type `sh:ValidationResult` (subclass of `sh:AbstractResult`). It contains:

| Property | Required? | Description |
|---|---|---|
| `sh:focusNode` | **MANDATORY** | The data node being validated. Exactly one value. |
| `sh:resultSeverity` | **MANDATORY** | The severity IRI (inherited from the shape, defaults to `sh:Violation`). Exactly one value. |
| `sh:sourceConstraintComponent` | **MANDATORY** | The IRI of the constraint component that produced this result (e.g., `sh:MinCountConstraintComponent`). Exactly one value. |
| `sh:resultPath` | Optional | The property path that was being validated (for property shapes, equivalent to the shape's `sh:path`). |
| `sh:value` | Optional | The specific RDF term (value node) that caused the violation. At most one. |
| `sh:sourceShape` | Optional | The shape that the focus node was validated against. |
| `sh:resultMessage` | Optional | Human-readable message(s). Can have multiple values (different language tags). Inherited from `sh:message` on the shape, or auto-generated by the processor. |
| `sh:detail` | Optional | Links to child `sh:AbstractResult` nodes providing deeper causal detail (e.g., why an `sh:node` check failed). |
| `sh:sourceConstraint` | Optional | For SPARQL-based constraints, the specific `sh:sparql` value that produced the result. |

### Key Design Properties

- Results are **always fresh nodes** — even if the same focus node is validated against the same shape via different paths in the shapes graph, distinct result nodes are created.
- The `sh:value` field pinpoints the **specific offending value** (not just "this property is wrong").
- The `sh:sourceConstraintComponent` identifies the **type of check** that failed (datatype? cardinality? pattern?), enabling programmatic handling.
- The `sh:resultPath` enables tools to navigate directly to the problematic property in the data.

---

## 4. ValidationReport

### Structure

A validation report is an RDF graph containing exactly one instance of `sh:ValidationReport`:

| Property | Description |
|---|---|
| `sh:conforms` | **Exactly one** `xsd:boolean`. `true` iff the validation produced **zero** validation results. |
| `sh:result` | Zero or more `sh:ValidationResult` nodes — one for each constraint violation found. |
| `sh:shapesGraphWellFormed` | Optional boolean indicating whether syntax checking of the shapes graph passed. |

### Aggregation Model

The results are the **union** of ALL results from:

1. Every shape in the shapes graph
2. For each shape, every focus node in its target
3. For each focus node, every constraint declared by that shape

This is a flat collection — results are not hierarchically grouped by shape or by focus node (though `sh:detail` provides optional nesting for sub-validations).

### What `sh:conforms` Means Exactly

`sh:conforms` is `true` **if and only if** the validation produced **no validation results at all**. This includes results of ANY severity (Violation, Warning, or Info). It is a strict binary: either everything passes, or something was flagged.

**Important nuance**: Conformance checking for nested shapes (via `sh:not`, `sh:or`, `sh:node`) is **separated** from the main validation. The sub-results used to determine whether a node conforms to a nested shape do NOT automatically appear in the top-level report (though they may be linked via `sh:detail`).

---

## 5. Constraint Composition — Logical Operators

SHACL provides four logical operators that compose shapes:

### sh:and (Conjunction)

- Value: a SHACL list of shapes
- Semantics: Each value node must conform to **ALL** shapes in the list
- Validation result produced if a value node fails to conform to any member
- Enables **shape specialization/inheritance**: an `sh:and` can reference a base shape plus additional constraints

### sh:or (Disjunction)

- Value: a SHACL list of shapes
- Semantics: Each value node must conform to **at least one** shape in the list
- Validation result produced if a value node conforms to **none** of the members
- Enables **union types**: e.g., a value can be either a string literal OR an instance of a class

### sh:not (Negation)

- Value: a single shape
- Semantics: Each value node must **NOT** conform to the specified shape
- Validation result produced if a value node DOES conform
- Enables **exclusion constraints**: e.g., "must not have any value for property X"

### sh:xone (Exclusive Or)

- Value: a SHACL list of shapes
- Semantics: Each value node must conform to **exactly one** shape in the list
- Validation result if N ≠ 1 (zero matches or multiple matches)
- Enables **mutually exclusive alternatives**: e.g., "provide fullName XOR (firstName AND lastName)"

### How Nested Shapes Work

Logical operators reference other shapes. These referenced shapes are validated via **conformance checking** — a simplified process that produces a boolean (conforms/doesn't conform). The sub-validation results are **separated** from the parent validation:

- `sh:or([ShapeA, ShapeB])`: The processor checks conformance of value node against ShapeA, then ShapeB. The internal results of those checks don't bubble up to the main report.
- Only the outer-level result ("value node didn't match any of the sh:or alternatives") appears in the report.
- `sh:detail` MAY be used to link the outer result to the inner sub-results.

Order of shapes in lists does NOT impact validation results.

---

## 6. Constraint Components — Complete Inventory

### Built-in Core Constraint Components

#### 6.1 Value Type Constraints

| Component | Parameter | Semantics |
|---|---|---|
| `sh:ClassConstraintComponent` | `sh:class` | Each value node must be an instance of the specified class (via `rdf:type/rdfs:subClassOf*`). Multiple values = conjunction. |
| `sh:DatatypeConstraintComponent` | `sh:datatype` | Each value node must be a literal with the specified datatype. At most one value. |
| `sh:NodeKindConstraintComponent` | `sh:nodeKind` | Each value node must be of the specified RDF node kind: `sh:IRI`, `sh:Literal`, `sh:BlankNode`, `sh:BlankNodeOrIRI`, `sh:BlankNodeOrLiteral`, `sh:IRIOrLiteral`. |

#### 6.2 Cardinality Constraints (Property shapes only)

| Component | Parameter | Semantics |
|---|---|---|
| `sh:MinCountConstraintComponent` | `sh:minCount` | The number of value nodes must be ≥ the specified integer. |
| `sh:MaxCountConstraintComponent` | `sh:maxCount` | The number of value nodes must be ≤ the specified integer. |

#### 6.3 Value Range Constraints

| Component | Parameter | Semantics |
|---|---|---|
| `sh:MinExclusiveConstraintComponent` | `sh:minExclusive` | Each value node must be > the specified literal. |
| `sh:MinInclusiveConstraintComponent` | `sh:minInclusive` | Each value node must be ≥ the specified literal. |
| `sh:MaxExclusiveConstraintComponent` | `sh:maxExclusive` | Each value node must be < the specified literal. |
| `sh:MaxInclusiveConstraintComponent` | `sh:maxInclusive` | Each value node must be ≤ the specified literal. |

#### 6.4 String-based Constraints

| Component | Parameter(s) | Semantics |
|---|---|---|
| `sh:MinLengthConstraintComponent` | `sh:minLength` | String length of each value node (via SPARQL `str()`) must be ≥ the integer. Blank nodes always fail. |
| `sh:MaxLengthConstraintComponent` | `sh:maxLength` | String length must be ≤ the integer. Blank nodes always fail. |
| `sh:PatternConstraintComponent` | `sh:pattern`, `sh:flags` (optional) | String representation must match the regex. Blank nodes always fail. |
| `sh:LanguageInConstraintComponent` | `sh:languageIn` | Language tag of each value must match one of the specified BCP47 language ranges. |
| `sh:UniqueLangConstraintComponent` | `sh:uniqueLang` | No two value nodes may share the same non-empty language tag. Property shapes only. |

#### 6.5 Property Pair Constraints (Property shapes only)

| Component | Parameter | Semantics |
|---|---|---|
| `sh:EqualsConstraintComponent` | `sh:equals` | Value set of this path must equal value set of the specified other property. |
| `sh:DisjointConstraintComponent` | `sh:disjoint` | Value set of this path must be disjoint from value set of the specified property. |
| `sh:LessThanConstraintComponent` | `sh:lessThan` | Each value must be < all values of the specified other property. |
| `sh:LessThanOrEqualsConstraintComponent` | `sh:lessThanOrEquals` | Each value must be ≤ all values of the specified other property. |

#### 6.6 Logical Constraints (covered in section 5 above)

| Component | Parameter |
|---|---|
| `sh:NotConstraintComponent` | `sh:not` |
| `sh:AndConstraintComponent` | `sh:and` |
| `sh:OrConstraintComponent` | `sh:or` |
| `sh:XoneConstraintComponent` | `sh:xone` |

#### 6.7 Shape-based Constraints

| Component | Parameter | Semantics |
|---|---|---|
| `sh:NodeConstraintComponent` | `sh:node` | Each value node must conform to the specified node shape. Produces ONE result per non-conforming node. |
| `sh:PropertyShapeComponent` | `sh:property` | Each value node is validated as a focus node against the specified property shape. Produces results directly from the sub-shape's constraints (not wrapped). |
| `sh:QualifiedMinCountConstraintComponent` | `sh:qualifiedValueShape`, `sh:qualifiedMinCount` | At least N value nodes must conform to the specified shape. |
| `sh:QualifiedMaxCountConstraintComponent` | `sh:qualifiedValueShape`, `sh:qualifiedMaxCount` | At most N value nodes may conform to the specified shape. |

Qualified cardinality also supports `sh:qualifiedValueShapesDisjoint` to ensure counted values don't overlap with sibling shapes.

#### 6.8 Other Constraints

| Component | Parameter(s) | Semantics |
|---|---|---|
| `sh:ClosedConstraintComponent` | `sh:closed`, `sh:ignoredProperties` (optional) | If `sh:closed` is true, value nodes may only have properties explicitly listed via `sh:property` paths (plus `sh:ignoredProperties`). |
| `sh:HasValueConstraintComponent` | `sh:hasValue` | The specified RDF term must be among the value nodes. |
| `sh:InConstraintComponent` | `sh:in` | Each value node must be a member of the specified SHACL list (enumeration). |

### Custom Constraint Components (SHACL-SPARQL)

New constraint components are declared as instances of `sh:ConstraintComponent` with:

1. **Parameter declarations** via `sh:parameter` — each specifying `sh:path` (the parameter property IRI), optionality, and optional constraints on parameter values
2. **Validators** — SPARQL queries that implement the validation logic:
   - `sh:validator` — an ASK-based validator (works for both node and property shapes)
   - `sh:nodeValidator` — a SELECT-based validator for node shapes
   - `sh:propertyValidator` — a SELECT-based validator for property shapes
3. **Label templates** via `sh:labelTemplate` for human-readable descriptions

Once declared, the component's parameters can be used on any shape just like built-in parameters.

---

## 7. Targets — How Shapes Find Their Data

### Core Target Types

| Target Type | Property | Semantics |
|---|---|---|
| **Node Target** | `sh:targetNode` | Directly specifies individual nodes (IRIs or literals) as focus nodes. The node doesn't even need to exist in the data graph. |
| **Class-based Target** | `sh:targetClass` | All instances of the specified class (following `rdf:type/rdfs:subClassOf*` in the data graph). |
| **Implicit Class Target** | *(automatic)* | If a shape is ALSO declared as an `rdfs:Class`, all its instances become targets. Enables "a class IS its own shape." |
| **Subjects-of Target** | `sh:targetSubjectsOf` | All nodes that appear as **subjects** of triples with the specified predicate. |
| **Objects-of Target** | `sh:targetObjectsOf` | All nodes that appear as **objects** of triples with the specified predicate. |

### Target Composition

The **target of a shape** is the **union** of all targets declared by that shape. A shape can have multiple target declarations of different types.

### SPARQL-based Targets (SHACL-SPARQL Advanced Feature)

SHACL-SPARQL allows defining custom target types via SPARQL queries, enabling arbitrary selection logic.

### Key Design Points

- Targets are **ignored** when a focus node is provided directly (e.g., via `sh:node` reference or explicit processor invocation)
- Target nodes **need not exist** in the data graph (e.g., `sh:targetNode ex:NonExistent` is valid)
- Targets are a **discovery mechanism**, not a constraint — they say "validate THESE nodes," not "these nodes must exist"

---

## 8. Separation of Shapes from Data

### Complete Decoupling

SHACL achieves **total separation** between validation rules and data:

**Shapes graph** — Contains shape declarations, constraints, targets. This is the "schema" or "contract."

**Data graph** — Contains the actual data to be validated. Any RDF graph. No awareness of SHACL needed.

These are two **independent** inputs to the validation process.

### Reusability

**Same shapes, different data**: Absolutely. A shapes graph is a reusable validation module. It can be applied to any data graph. Shapes graphs can be shared, published, imported (via `owl:imports`), and composed.

**Same data, different shapes**: Absolutely. The same data graph can be validated against different shapes graphs for different purposes. For example:

- A "strict" shapes graph for production
- A "lenient" shapes graph for draft data
- A domain-specific shapes graph for a particular application

### Immutability During Validation

Both the shapes graph and data graph MUST remain **immutable** during validation. SHACL processing is **idempotent** — running it twice produces the same results, and neither input is modified.

### Linking Mechanisms

- Data graphs can SUGGEST shapes graphs via `sh:shapesGraph` (a hint, not a requirement)
- Shapes graphs can import other shapes graphs via `owl:imports`
- A shape can be deactivated (`sh:deactivated true`) in a local shapes graph that imports shapes from elsewhere — enabling selective override

---

## 9. Property Paths

SHACL supports a subset of SPARQL 1.1 property paths, enabling constraints to reach beyond direct properties:

| Path Type | SHACL Representation | SPARQL Equivalent | Description |
|---|---|---|---|
| **Predicate Path** | `ex:name` | `ex:name` | Direct property traversal |
| **Sequence Path** | `( ex:parent ex:name )` | `ex:parent/ex:name` | Follow one property, then another |
| **Alternative Path** | `[ sh:alternativePath ( ex:father ex:mother ) ]` | `ex:father\|ex:mother` | Either of two properties |
| **Inverse Path** | `[ sh:inversePath ex:parent ]` | `^ex:parent` | Follow a property backwards |
| **Zero-or-More Path** | `[ sh:zeroOrMorePath rdfs:subClassOf ]` | `rdfs:subClassOf*` | Transitive closure (including self) |
| **One-or-More Path** | `[ sh:oneOrMorePath rdfs:subClassOf ]` | `rdfs:subClassOf+` | Transitive closure (excluding self) |
| **Zero-or-One Path** | `[ sh:zeroOrOnePath ex:knows ]` | `ex:knows?` | Optional single step |

### Composability

Paths can be **nested and composed**:

- `( rdf:type [ sh:zeroOrMorePath rdfs:subClassOf ] )` = `rdf:type/rdfs:subClassOf*` (all types including supertypes)

The **value nodes** for a property shape are all nodes reachable from the focus node via the path. All constraints on the property shape then apply to these value nodes.

---

## 10. SHACL-SPARQL — Custom Validation via SPARQL

### Two Extension Mechanisms

#### 1. SPARQL-based Constraints (Inline)

A shape can include a `sh:sparql` value containing a SPARQL SELECT query. The query returns rows representing violations:

- Variable `$this` is pre-bound to the focus node
- For property shapes, `$PATH` is substituted with the property path
- Each solution row = one validation result
- Result properties are mapped from query variables: `?value` → `sh:value`, `?path` → `sh:resultPath`, `?message` → `sh:resultMessage`

#### 2. SPARQL-based Constraint Components (Reusable)

Declare a new `sh:ConstraintComponent` with:

- Named parameters (IRIs that become properties you can use on any shape)
- Validators (SPARQL ASK or SELECT queries with parameter variables pre-bound)

This enables creating **high-level, reusable constraint types** indistinguishable from built-in ones.

**ASK-based validators**: Return `true` if a value node conforms. One result per `false`. Used for per-value-node checks. Work for both node and property shapes.

**SELECT-based validators**: Return rows of violations. More flexible but more verbose. Can be specialized for node shapes (`sh:nodeValidator`) or property shapes (`sh:propertyValidator`).

### Prefix Handling

SHACL provides a prefix declaration mechanism (`sh:declare` with `sh:prefix`/`sh:namespace`) so SPARQL queries can use short prefixed names. Processors prepend `PREFIX` declarations before executing queries.

### Pre-bound Variables

| Variable | Meaning |
|---|---|
| `$this` | The current focus node |
| `$shapesGraph` | (Optional) IRI of the shapes graph for `GRAPH` queries |
| `$currentShape` | (Optional) The current shape being validated |
| `$value` | (ASK validators only) The current value node |
| `$paramName` | The value of each parameter of the constraint component |

---

## Key Architectural Insights — What Makes SHACL Powerful

### 1. The Shape as a Composable Validation Unit

A shape is not just a list of constraints — it's a **referenceable, composable unit**. Shapes can reference other shapes via `sh:node`, `sh:property`, `sh:and`, `sh:or`, `sh:not`, `sh:xone`, and `sh:qualifiedValueShape`. This creates a **graph of validation logic** that mirrors the graph structure of the data.

### 2. The Constraint Component Abstraction

Every constraint (built-in or custom) follows the same pattern: a **constraint component** declares **parameters** and **validators**. This means:

- Custom constraints are first-class citizens
- The validation model is uniform and extensible
- Tools can discover and reason about constraints generically

### 3. Structured, Machine-Readable Results

Validation results aren't just pass/fail or error messages. Each result is a structured record with:

- WHAT failed (`sh:sourceConstraintComponent`)
- WHERE it failed (`sh:focusNode`, `sh:resultPath`)
- The specific bad value (`sh:value`)
- The rule that was violated (`sh:sourceShape`)
- How bad it is (`sh:resultSeverity`)
- Human explanation (`sh:resultMessage`)

This enables **automated remediation**, **UI-driven correction**, and **programmatic triage**.

### 4. Complete Decoupling Enables Reuse

Shapes graphs are portable validation modules. They can be:

- Published and shared independently
- Composed via `owl:imports`
- Overridden via `sh:deactivated`
- Applied to any data graph

### 5. Property Paths Enable Deep Validation

Constraints aren't limited to direct properties. Sequence paths, inverse paths, and transitive paths allow constraints to reach deeply into graph structures, validating complex relationships.

### 6. Severity Is Metadata, Not Logic

Severity doesn't affect validation behavior — it's purely for result categorization. This is a deliberate design choice that keeps the validation model simple while enabling rich UI/reporting.

### 7. Value Nodes: The Bridge Between Shapes and Data

The concept of "value nodes" is central:

- For **node shapes**: the value node IS the focus node (set of one)
- For **property shapes**: value nodes are all nodes reachable via the path from the focus node

This abstraction allows the same constraint logic to work uniformly across both shape types.

### 8. Conformance Checking as a Building Block

Conformance checking (does a node conform to a shape? → boolean) is used internally by logical operators (`sh:not`, `sh:or`, `sh:node`). The sub-validation results are **separated** from the main report, preventing result explosion in deeply nested validations.

### 9. Recursion Is Explicitly Undefined

SHACL deliberately leaves recursive shape validation undefined. This allows implementations to choose their strategy (support it, reject it, etc.) without the spec constraining implementation approaches.

### 10. Dual-Use: Validation AND Description

Shapes serve double duty:

- **Validation**: Checking data conformance
- **Description**: Documenting expected data structure (with `sh:name`, `sh:description`, `sh:order`, `sh:group`, `sh:defaultValue`)

This makes shapes useful for UI generation, code generation, and data integration — not just validation.
