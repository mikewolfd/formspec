# XForms 1.1 Specification — Deep Technical Analysis

> Source: W3C Recommendation, 20 October 2009
> <https://www.w3.org/TR/xforms11/>

---

## 1. Model Item Properties (MIPs)

### What Are MIPs?

A **Model Item Property** is a metadata annotation attached to an instance data node
(element or attribute) via a `bind` element. The collection of all MIPs on a single
instance node is called a **model item**. MIPs are the mechanism through which XForms
attaches behavioral semantics (computation rules, validation constraints, visibility
rules) to raw data nodes — without touching the data's XML structure.

### The Six MIPs

| MIP | Computed? | Default | Inherits? | Purpose |
|-----|-----------|---------|-----------|----------|
| **type** | No (fixed) | `xsd:string` | No | Datatype constraint (XML Schema type) |
| **readonly** | Yes (XPath→boolean) | `false()` (but `true()` if `calculate` present) | Yes (OR) | Prevents direct mutation of node value |
| **required** | Yes (XPath→boolean) | `false()` | No | Node must be non-empty for validity |
| **relevant** | Yes (XPath→boolean) | `true()` | Yes (AND) | Controls visibility and submission inclusion |
| **calculate** | Yes (XPath→string) | none | No | Computes the node's string value |
| **constraint** | Yes (XPath→boolean) | `true()` | No | Arbitrary validation predicate |

(There is also **p3ptype** for privacy annotations, rarely used.)

### How MIPs Attach to Data Nodes

MIPs are declared on `bind` elements inside a `model`. A `bind` has a `nodeset`
attribute (an XPath expression) that selects which instance nodes the MIP applies to.
The remaining attributes on the `bind` are the MIP values:

```
<bind nodeset="/order/total"
      calculate="sum(/order/item/price * /order/item/qty)"
      readonly="true()"/>

<bind nodeset="/order/discount"
      relevant="/order/total > 1000"
      calculate="/order/total * 0.1"/>

<bind nodeset="/order/shipDate"
      type="xsd:date"
      constraint=". > /order/orderDate"
      required="true()"/>
```

### Key Design Principles

**Fixed vs. Computed**: `type` is evaluated once (a literal QName). All others are
live XPath expressions re-evaluated on every recalculate cycle.

**Inheritance**: Two MIPs propagate through the instance tree:

- `readonly`: if ANY ancestor is `readonly=true`, the node is readonly (logical OR up the tree)
- `relevant`: if ANY ancestor is `relevant=false`, the node is non-relevant (logical AND up the tree)

The processor tracks two values per inherited MIP: the **local value** (from the bind)
and the **inherited value** (combining local + ancestors).

**No double-binding**: It is an error to set the same MIP on the same node from two
different `bind` elements. This is checked at rebuild time and raises
`xforms-binding-exception`.

**Expressions are context-aware**: Computed expressions are NOT restricted to examining
only the node they're attached to. They can traverse the entire instance tree via XPath.
A `constraint` on node X can reference sibling, parent, or completely unrelated nodes.

**Calculate implies readonly**: If a node has a `calculate`, its `readonly` defaults to
`true()` — computed values shouldn't be hand-edited. But this CAN be overridden:
setting `readonly="false()"` on a calculated node allows user edits AND calculation.
(The calculate re-fires on every recalc; if the user clears the field, the calculate
restores the default. This is a documented pattern for "default values.")

---

## 2. The Reactive Dependency Graph

### The Core Cycle: Rebuild → Recalculate → Revalidate → Refresh

XForms processing follows a strict four-phase pipeline, each triggered by a named event:

1. **`xforms-rebuild`** — Parses all `bind` elements, attaches MIPs to instance nodes,
   and constructs the **dependency directed graph** from XPath expression references.
   Sets the change list to ALL computed nodes (full recalc on next step).

2. **`xforms-recalculate`** — Evaluates computed MIP expressions in dependency order.
   Updates node values (from `calculate`) and MIP states (readonly, required, relevant,
   constraint). Marks which MIPs changed for the refresh phase.

3. **`xforms-revalidate`** — Checks every node against: constraint MIP, required MIP
   (non-empty check), and XML Schema type. Marks validity changes.

4. **`xforms-refresh`** — Updates the UI. Re-evaluates UI binding expressions.
   Dispatches notification events (xforms-value-changed, xforms-valid/invalid,
   xforms-enabled/disabled, xforms-required/optional, xforms-readonly/readwrite)
   to affected form controls.

### The Dependency Graph Algorithm (Appendix C)

The algorithm uses a **directed acyclic graph** where:

- **Vertices** represent individual *computes*: a (node, MIP-aspect) pair. For a node
  with `calculate` and `required`, there are separate vertices for the calculated value
  and the required property.
- **Edges** represent data dependencies: if vertex V's expression references instance
  node N, and vertex W represents N's value, then there's an edge from W to V
  (W must be computed before V).

**Building the graph (xforms-rebuild)**:

- Each computed expression is parsed to determine which instance nodes it **references**
  (any node matched by a NodeTest during evaluation, even if subsequently filtered out
  by a predicate).
- For each vertex V, its `depList` contains all vertices whose expressions reference V.
- Self-references are explicitly allowed and excluded from the dependency tracking
  (a `calculate` that refers to its own node does NOT create a circular dependency).

**Incremental recalculation (xforms-recalculate)**:

- Starts with a **change list L** of nodes whose values changed since last recalculation
  (e.g., from user input or `setvalue` actions).
- A **pertinent dependency subgraph** is extracted: only vertices reachable from L via
  dependency edges. (On form load, this equals the full graph.)
- **Topological sort** on this subgraph determines evaluation order.
- Vertices are processed in order: in-degree-0 first, then propagate.

**Circular dependency handling**: If after extracting the pertinent subgraph, no vertex
has in-degree 0 but vertices remain, there is a **cycle** → `xforms-compute-exception`
is thrown and processing halts. Circular dependencies are a fatal error.

**What counts as a reference**: Any node matched by a NameTest during XPath evaluation
counts, even if a predicate later excludes it. This is intentionally over-inclusive to
make the system more responsive — if a predicate condition changes, the expression gets
recalculated without needing a full rebuild. A node that fails a NameTest is NOT
referenced. A node beyond a rejected filter step is NOT referenced.

**Dynamic dependencies**: Insert/delete of nodes can alter reference lists. When this
happens, the dependency structures need rebuilding. For model binding expressions, this
requires a manual `rebuild`. For UI expressions, the processor handles it automatically
at refresh time.

### Deferred Updates (The Batching Mechanism)

XForms does NOT run rebuild/recalculate/revalidate/refresh after every single mutation.
Instead, it uses **deferred updates**:

- Each model has four boolean flags: `rebuild`, `recalculate`, `revalidate`, `refresh`.
- During an **outermost action handler** (the top-level event handler invoked by user
  interaction), mutations set these flags but don't trigger processing.
- When the outermost action handler completes, the flags are checked in order:
  rebuild → recalculate → revalidate → refresh. Each true flag dispatches the
  corresponding event, then clears.

This means a sequence of `setvalue` actions inside one handler causes only ONE
recalculation cycle at the end — not N cycles.

---

## 3. Non-Relevant Data Exclusion

### What Happens When `relevant` Becomes False

**UI effects**:

- The form control (and all descendants) is made **unavailable** — not rendered, or
  rendered as disabled.
- Removed from **navigation order** (tab stops).
- Cannot receive **focus**.
- **Event handlers** on the non-relevant control are **disabled** (they don't fire).
- The control receives `xforms-disabled` event.

**Data effects**:

- The node's VALUE IS PRESERVED in the instance data. Non-relevance does NOT clear or
  remove the data. It's still there in the data model.
- However, non-relevant data is **excluded from submission** by default.

### Relevance Inheritance

`relevant` inherits via logical AND: if a parent node has `relevant="false()"`, ALL
descendant nodes are also non-relevant, regardless of their own local `relevant` MIP.

UI containers (groups, switches, repeats) also propagate non-relevance. A non-relevant
group makes ALL its content form controls non-relevant.

### Submission Pruning

During submission (step 3 of xforms-submit processing):

> "The indicated node and all nodes for which it is an ancestor are selected. If the
> attribute `relevant` is true, whether by default or declaration, then any selected
> node which is not relevant as defined in 6.1.4 is deselected (pruned)."

So non-relevant nodes are **removed from the serialized data** before it's sent. This
is "relevance pruning." The pruning operates on a copy — the actual instance data is
unchanged.

**Opt-out**: The `submission` element has a `relevant` attribute (boolean, default true).
Setting `relevant="false"` disables pruning — all data is submitted regardless of
relevance. This is useful for save/restore of incomplete forms.

### Non-Relevance Determination for UI Elements

A form control is non-relevant if ANY of:

1. Its Single Node Binding resolves to an empty nodeset
2. Its bound instance node has `relevant` evaluating to false
3. It's contained by a non-relevant group, switch, or repeat item
4. It's contained by a non-selected `case` of a `switch`

---

## 4. `xforms:repeat`

### Concept

`repeat` binds to a **node-set** (not a single node) and generates a set of UI
"repeat items" — one per node in the collection. The markup inside `repeat` is a
**template** that gets instantiated for each node.

### Data Model

The nodeset attribute selects a **repeat collection**: a set of instance nodes
(typically sibling elements of the same type, but can be any nodeset including
heterogeneous collections in XForms 1.1).

For each node in the repeat collection, a **repeat item** consists of:

- The instance node
- Its position in the collection
- The collection size
- A **repeat object** (implicit group element containing the generated UI)

### The Repeat Index

Each repeat maintains a **repeat index**: a 1-based integer pointing to the
"current" item. Accessed via `index('repeatId')` function, manipulated via
`setindex` action.

- Initialized to `startindex` attribute (default 1)
- Updated automatically on insert (moves to last inserted item)
- Updated on delete according to specific rules (stays on same item if possible;
  clamps to new size if needed; goes to 0 if all items deleted)
- Changing the repeat index does NOT re-initialize indexes of nested repeats

### Expression Context Inside Repeat

When a non-outermost binding element is inside a repeat (or any Node Set Binding),
the processor generates an occurrence for each node. Each occurrence gets its own
evaluation context:

- **context node** = the specific node from the repeat collection
- **context position** = position of that node in the nodeset
- **context size** = size of the nodeset

So `ref="price"` inside a repeat over `/order/item` means each repeat item's input
binds to the `price` child of ITS specific `item` element.

### Repeat Item Lifecycle

Repeat items are created/destroyed dynamically:

- **Created** when nodes are added to the repeat collection (insert action,
  submission instance replacement, calculate/setvalue changing values to match)
- **Destroyed** when nodes are removed
- On creation: event handlers initialized, UI controls initialized as during
  xforms-model-construct-done
- On destruction: repeat object and all inner controls/handlers eliminated

### Nested Repeats

Repeats can nest. An inner repeat operates on a subcollection within each item
of the outer repeat. The `index()` function with nested repeats uses the IDREF
resolution mechanism to find the right repeat instance.

Event flow: events dispatched to objects inside a repeat object bubble through
the repeat object as if it were a child of the `repeat` element.

### Repeat via Attributes

XForms also supports "attribute-based" repeat for host language integration:
`repeat-nodeset`, `repeat-bind`, `repeat-model`, `repeat-startindex`,
`repeat-number` can be placed on host language elements (like `<tr>`) to create
repeating structures without the `<repeat>` wrapper element.

---

## 5. Multiple Instances

### How They Work

A single `model` can contain **multiple `instance` elements**, each identified by an
`id` attribute:

```
<model>
  <instance id="main">
    <data><name/><country/></data>
  </instance>
  <instance id="countries" src="countries.xml"/>
  <instance id="config">
    <settings><theme>light</theme></settings>
  </instance>
</model>
```

### The `instance()` Function

Expressions reference data across instances using the `instance()` function:

```
instance('countries')/country[@code='US']/name
```

`instance(id)` returns the **root element node** (document element) of the named
instance. It effectively replaces the leftmost location step. Without arguments,
`instance()` returns the document element of the default instance in the current
model.

**Constraint**: `instance()` can only access instances within the **same model** as
the context node. Cross-model instance access is not supported via this function.

### The Default Instance

The first `instance` element (in document order) within a model is the **default
instance**. When a binding expression on a form control doesn't specify a model
or instance, it operates on the default instance of the default model (first model
in document order).

### Instance Sources

Instances can get their data from:

- **Inline XML content** (literal child elements of `<instance>`)
- **`src` attribute** — URI to fetch; overrides inline content
- **`resource` attribute** — URI to fetch; inline content takes precedence
  (useful for save/reload: use inline from saved document, fall back to URI)

### Common Patterns

Secondary instances are used for:

- **Lookup data** (countries, states, categories) — loaded from external XML
- **UI state** (which tab is active, filter criteria) — inline
- **Temporary computation** — intermediate values
- **Submission targets** — receive response data

---

## 6. The MVC Separation

### The Three Layers

**Model (data + behavior)**:

- `<instance>` elements: raw XML data trees
- `<bind>` elements: MIP declarations (calculate, constraint, relevant, etc.)
- `<submission>` elements: data submission configuration
- All inside `<model>`, typically in the document head

**View (presentation)**:

- Form controls (`input`, `select`, `output`, `trigger`, etc.)
- Container controls (`group`, `switch`, `repeat`)
- Labels, hints, help text, alerts
- Bound to the model via `ref`/`bind` attributes
- Typically in the document body

**Controller (orchestration)**:

- XForms Actions (`setvalue`, `insert`, `delete`, `send`, `toggle`, etc.)
- Event handlers connecting events to actions
- The processing model itself (rebuild/recalculate/revalidate/refresh cycle)

### Key Separation Properties

**Model without UI**: Absolutely yes. The model is self-contained. It can:

- Define data structures
- Declare all calculations and constraints
- Perform submission
- Be fully functional without any form controls

A model is initialized (construct → rebuild → recalculate → revalidate) before any
UI exists. The UI initialization happens in `xforms-model-construct-done`, after all
models are set up.

**Multiple UIs for one model**: Yes. Form controls bind to model data via `ref`
and `model` attributes. Multiple controls can bind to the same node. Different
controls can present the same data differently. The spec explicitly allows this —
there's no 1:1 restriction between controls and data nodes.

**Multiple models per document**: Yes. Each model is independent with its own
instances, binds, and submissions. Form controls specify which model they bind to
via the `model` attribute. The default model is the first one in document order.

**UI reflects model, not vice versa**: The direction is:

1. User interacts with control → value propagated to instance data
2. Instance change triggers recalculate → revalidate → refresh
3. Refresh pushes computed state back to ALL bound controls

Controls are stateless projections of model state. They never hold authoritative data.

---

## 7. Expression Language

### Base: XPath 1.0

XForms uses XPath 1.0 as its expression language. Four types: boolean, string,
number, node-set. All XPath 1.0 core functions are available.

### XForms Extension Functions

**Boolean functions:**

- `boolean-from-string(string)` — "true"/"1" → true; "false"/"0" → false
- `is-card-number(string?)` — Luhn algorithm validation

**Number functions:**

- `avg(node-set)`, `min(node-set)`, `max(node-set)` — aggregate operations
- `count-non-empty(node-set)` — count nodes with non-empty string values
- `index(repeatId)` — returns current 1-based repeat index
- `power(base, exp)` — exponentiation
- `random(seed?)` — uniform random in [0, 1)
- `compare(string, string)` — lexicographic comparison (-1, 0, 1)

**String functions:**

- `if(boolean, string, string)` — ternary (deprecated in favor of `choose()`)
- `choose(boolean, object, object)` — ternary that preserves type
- `property(string)` — access XForms processor properties (version, conformance-level)
- `digest(string, algorithm)`, `hmac(string, key, algorithm)` — cryptographic hashing

**Date/time functions:**

- `now()` — current dateTime
- `local-date()`, `local-dateTime()` — local timezone versions
- `days-from-date(string)` — date → days since epoch
- `days-to-date(number)` — days since epoch → date string
- `seconds-from-dateTime(string)`, `seconds-to-dateTime(number)` — analogous for time
- `adjust-dateTime-to-timezone(string)` — timezone conversion
- `seconds(duration)`, `months(duration)` — duration component extraction

**Node-set functions:**

- `instance(id?)` — access named instance's root element
- `current()` — returns the context node used to initialize the containing expression
  (critical for cross-referencing in `itemset`/`repeat` contexts)
- `id(object, node-set?)` — two-parameter form searches across instances
- `context()` — returns the in-scope evaluation context node

**Event function:**

- `event(name)` — access event context properties (used in event handlers)

### Evaluation Context Rules

**Outermost binding elements** (no ancestor binding element):

- If inside a `model`: context node = document element of default instance of that model
- Otherwise: context node = document element of default instance of default model
- Context position = 1, context size = 1

**Non-outermost binding elements** (nested inside another binding element):

- Context is determined by **scoped resolution** from nearest ancestor binding element
- If ancestor has Single-Node binding: context = that single node
- If ancestor has Node-Set binding (repeat): context = each node in turn, with
  appropriate position/size

**Model binding expressions** (in `bind` elements):

- `nodeset` attribute uses the in-scope evaluation context
- MIP expression attributes (calculate, relevant, etc.) use each node in the
  bound nodeset as context node, with context position/size from the nodeset

**Cross-model references**: A binding element can specify `model="otherId"` to
switch to a different model's default instance as context. Within `bind`, all
expressions are scoped to the containing model's instances.

### Expression Categories

The spec classifies expressions by when they're evaluated:

1. **Model binding expressions** (in `bind/@nodeset`) — evaluated at rebuild time.
   Dynamic dependencies require manual rebuild.

2. **Computed expressions** (in `bind/@calculate`, `@relevant`, etc.) — evaluated
   at recalculate time, in dependency order.

3. **UI expressions** (in form control `@ref`, `@nodeset`, and descendants) —
   re-evaluated at refresh time. Dynamic dependencies handled automatically.

4. **Action/submission expressions** — evaluated at the moment the action executes
   or the submission processes. Dynamic dependencies handled automatically.

---

## 8. Submission

### The Submission Pipeline

When `xforms-submit` fires on a `submission` element:

1. **Deferred updates flush** — rebuild + recalculate if flags are set (ensuring
   data is current)
2. **Node selection** — binding attributes identify the root node for submission.
   All descendants are selected.
3. **Relevance pruning** — non-relevant nodes are removed from the selected set
   (unless `relevant="false"` on the submission)
4. **Validation** — all selected nodes checked for validity (unless `validate="false"`)
   → if any invalid, `xforms-submit-error` with `validation-error`
5. **Method determination** — from `method` attribute/element
6. **Resource determination** — from `resource` attribute/element (or deprecated `action`)
7. **Serialization** — `xforms-submit-serialize` event dispatched first (allows
   custom serialization). If not overridden, default serialization based on format.
8. **Headers** — from `header` child elements (can be dynamic, based on instance data)
9. **Transmission** — protocol operation based on URI scheme + method
10. **Response handling** — based on `replace` attribute:
    - `replace="all"` — entire document replaced with response
    - `replace="instance"` — response XML replaces an instance
    - `replace="text"` — response text replaces a node's content
    - `replace="none"` — response discarded

### Serialization Formats

| Format | Content Type | Used By |
|--------|-------------|--------|
| XML | `application/xml` | post, put, delete (default for post/put) |
| URL-encoded | `application/x-www-form-urlencoded` | get (default), urlencoded-post |
| Multipart | `multipart/related` | multipart-post |
| Form-data | `multipart/form-data` | form-data-post |
| None | (no body) | `serialization="none"` |

The `serialization` attribute can override the default. Setting `serialization="none"`
skips serialization entirely (useful for GET requests, simple URI activation).

### Partial Data Submission

The `ref`/`bind` on `submission` selects a **subtree** for submission (default: "/",
the entire instance). Combined with relevance pruning, this gives fine-grained control
over what data is sent.

Submission can also target a specific instance for response replacement via the
`instance` attribute and `targetref` for partial instance replacement.

### Sync vs Async

The `mode` attribute controls whether submission is synchronous (blocks user interaction
and action processing until response) or asynchronous (default — processing continues,
response handled when received).

---

## 9. Events

### Event Model

XForms uses **DOM2 Events** + **XML Events** for event handling. Events follow the
standard capture → target → bubble flow.

### Event Categories

**Initialization** (non-cancelable, target: model):

- `xforms-model-construct` — build instances, run initial rebuild/recalculate/revalidate
- `xforms-model-construct-done` — initialize UI, create default instances from bindings
- `xforms-ready` — everything initialized
- `xforms-model-destruct` — shutdown notification

**Interaction** (cancelable, target: model or controls):

- `xforms-rebuild`, `xforms-recalculate`, `xforms-revalidate`, `xforms-refresh` —
  the core processing cycle events
- `xforms-submit` — triggers submission pipeline
- `xforms-reset` — restore instance to post-ready state
- `xforms-focus`, `xforms-next`, `xforms-previous` — navigation

**Notification** (non-cancelable, target: controls or instances):

- `xforms-value-changed` — node value changed
- `xforms-valid` / `xforms-invalid` — validity state change
- `xforms-readonly` / `xforms-readwrite` — readonly state change
- `xforms-required` / `xforms-optional` — required state change
- `xforms-enabled` / `xforms-disabled` — relevance state change
- `xforms-insert` / `xforms-delete` — instance data structure change
- `xforms-select` / `xforms-deselect` — selection changes
- `xforms-submit-done` / `xforms-submit-error` — submission result

### Events and MIP Recomputation

The connection between events and MIP recomputation:

1. **User input** → value propagated to instance → node added to **change list L**
2. At end of outermost action handler, **deferred update** fires:
   - If structural change: `xforms-rebuild` (rebuilds dependency graph, marks all for recalc)
   - `xforms-recalculate` processes change list L through dependency graph
   - `xforms-revalidate` checks all nodes against constraints
   - `xforms-refresh` pushes state to UI, dispatches notification events

Notification events are **marked during recalculate/revalidate** but only **dispatched
during refresh**. This avoids cascading event handler execution during the middle of
computation.

The event sequence for a value change in an input control:

1. DOMFocusIn (on focus)
2. User types
3. DOMFocusOut (on blur) — triggers value propagation
4. `xforms-recalculate` → `xforms-revalidate` → `xforms-refresh`
5. During refresh: `xforms-value-changed`, plus any MIP state change events

### Event Context Information

Many events carry context information accessible via `event('property-name')`:

- `xforms-submit-done`: `resource-uri`, `response-status-code`, `response-headers`
- `xforms-submit-error`: `error-type`, `resource-uri`, `response-body`
- `xforms-insert`: inserted nodes, origin, position

---

## Key Conceptual Insights

### XForms as a Reactive Spreadsheet

The MIP + dependency graph system is essentially a **reactive spreadsheet** overlaid on
an XML tree. `calculate` expressions are formulas. The dependency graph is the formula
reference graph. Recalculation is incremental cell recomputation. The "change list"
is the set of dirty cells.

### Declarative Over Imperative

XForms strongly prefers declarative specification:

- Constraints are declared, not checked procedurally
- Calculations are declared, not assigned in event handlers
- Visibility is declared via `relevant`, not toggled by script
- Validation is declared via `type` + `constraint`, not validated on submit

The imperative layer (actions) exists for mutations that can't be expressed
declaratively: insert/delete nodes, dispatch events, toggle UI states.

### The Bind as Universal Behavior Attachment

The `bind` element is the single point where ALL behavioral semantics attach to data.
This means:

- Changing a constraint is one attribute change on one `bind`
- The UI automatically reflects it (via the reactive cycle)
- Submission automatically respects it
- No code in event handlers needs updating

This is fundamentally different from HTML forms where validation logic is scattered
across onsubmit handlers, inline JavaScript, and server-side code.

### Instance Data is the Single Source of Truth

All UI state is a projection of instance data. There is no "form state" separate
from instance data. Even things like "which repeat item is selected" are tracked as
repeat indexes (which the spec describes as behaving like implicit instance data
nodes for dependency tracking purposes).
