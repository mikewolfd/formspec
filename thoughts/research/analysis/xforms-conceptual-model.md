# XForms 1.1 — Key Conceptual Model (Synthesis)

## 1. Model Item Properties (MIPs)

MIPs are metadata attached to instance data nodes via `<bind>` elements. Each bind selects a node-set (via `nodeset` XPath), then applies properties to every node in that set.

| MIP | Computed? | Expression Type | Default | Inherits? | Purpose |
|-----|-----------|----------------|---------|-----------|----------|
| **type** | No (literal) | QName (e.g. `xsd:decimal`) | `xsd:string` | No | Associates XML Schema datatype with the node's string-value. Contributes to validity. |
| **readonly** | Yes | XPath → boolean | `false()` (but `true()` if `calculate` is set) | **Yes** — OR up ancestor chain | Prevents direct mutation of node value. UI hint for rendering. Calculated nodes are readonly by default. |
| **required** | Yes | XPath → boolean | `false()` | No | Node must be non-empty (string-length > 0) for submission to succeed. |
| **relevant** | Yes | XPath → boolean | `true()` | **Yes** — AND up ancestor chain | When false: UI controls hidden/disabled, data can be pruned from submission. |
| **calculate** | Yes | Any XPath → string | none | No | Expression evaluated, converted to string, stored as node's value. Creates a derived/computed value. |
| **constraint** | Yes | XPath → boolean | `true()` | No | Additional validity predicate beyond type. Can reference other nodes (e.g. `../endDate > ../startDate`). |
| **p3ptype** | No (literal) | string | none | No | P3P privacy data category. Decorative/policy metadata. |

**Key rules:**

- Assigning the same MIP twice to the same node (from two `<bind>` elements) is a fatal error (`xforms-binding-exception`).
- Binds are processed in document order. Nested `<bind>` elements scope their `nodeset` relative to the parent bind's node-set.
- Computed MIPs (readonly, required, relevant, calculate, constraint) are XPath expressions re-evaluated during recalculate.
- Inheritance means the *effective* value combines local + ancestors: readonly uses OR (any ancestor readonly → node is readonly), relevant uses AND (any ancestor non-relevant → node is non-relevant).

---

## 2. Reactive Dependency Graph & the Rebuild/Recalculate/Revalidate/Refresh Cycle

### The Dependency Graph

- Each computed MIP expression bound to a specific instance node is a **vertex** (a "compute"). Types of vertices: value (from `calculate`), and property vertices (from `readonly`, `required`, `relevant`, `constraint`).
- **Edges** represent data references: if vertex C's expression references node N's value, then N has C in its `depList`.
- Self-references in `calculate` are explicitly excluded from creating edges (prevents trivial cycles; allows "default value" patterns).
- Circular dependencies (A depends on B depends on A) raise `xforms-compute-exception`.

### The Four-Phase Cycle

1. **Rebuild** (`xforms-rebuild`)
   - Re-evaluates all `<bind>` `nodeset` expressions to determine which nodes each bind applies to.
   - Re-applies all MIP declarations.
   - Reconstructs the master dependency directed graph.
   - Marks ALL computed nodes as needing recalculation.
   - Triggered automatically by `insert`/`delete` (they set a rebuild flag).

2. **Recalculate** (`xforms-recalculate`)
   - Takes a change list L (nodes whose values changed since last recalculate).
   - Computes a **pertinent dependency subgraph** — only vertices reachable from L.
   - **Topological sort** of that subgraph → evaluation order where each vertex is computed after its dependencies.
   - Each vertex evaluated exactly once. Calculate results stored; MIP boolean results updated.
   - If a cycle is detected (no zero-in-degree vertex remains), exception thrown.
   - On first run (form load), ALL vertices are in the subgraph.

3. **Revalidate** (`xforms-revalidate`)
   - Checks every instance node for validity: `constraint == true` AND (`required == false` OR value non-empty) AND XML Schema type satisfied.
   - Marks nodes whose validity state changed for notification.

4. **Refresh** (`xforms-refresh`)
   - Re-evaluates all UI binding expressions.
   - Propagates current values, validity, required/readonly/relevant states to form controls.
   - Dispatches notification events (value-changed, valid/invalid, enabled/disabled, required/optional, readonly/readwrite).
   - Updates repeat structures (correct number of repeat objects).

### Deferred Updates

- During action processing, rebuild/recalculate/revalidate/refresh are **deferred** — flags are set but processing happens at end of action block (or at submission time).
- At submission time: pending rebuild + recalculate are flushed before validation/serialization.

---

## 3. Non-Relevant Data

- `relevant` evaluates to `false()` → node (and all descendants, via AND-inheritance) is **non-relevant**.
- **UI effect**: Bound form controls are hidden/unavailable, removed from navigation/tab order, cannot receive focus. Group/switch containers become invisible with all children.
- **Submission effect**: When `submission/@relevant="true"` (default for serialized submissions), non-relevant nodes are **pruned** — deselected from the serialization tree. If pruning removes ALL data, `xforms-submit-error` with `no-data`.
- **Important**: Non-relevance does NOT prevent programmatic access. Actions like `setvalue`, `message`, and submission elements themselves remain operable on non-relevant nodes (only UI bindings are affected). The non-relevance indirectly disables event handlers on non-relevant form controls (since those controls are disabled).
- Relevance is **dynamic** — the expression is recalculated reactively. A node can toggle between relevant and non-relevant as upstream data changes.

---

## 4. Repeat

### Core Mechanism

- `<repeat nodeset="items/item">` binds to a **repeat collection** (a node-set).
- For each node in the collection, a **repeat item** is created containing a **repeat object** (an implicit group with cloned UI template content).
- The template markup inside `<repeat>` is instantiated once per node. Each instance gets its own evaluation context.

### Repeat Index

- Each repeat maintains a 1-based **repeat index** pointing to the "current" item.
- Accessed via `index('repeatId')` function. Manipulated via `setindex` action.
- Default `startindex` is 1.
- Focusing a control inside a repeat automatically updates the index (and recursively updates outer repeat indexes).

### Index Maintenance on Insert/Delete

- **Insert**: Index moves to the last newly inserted item.
- **Delete**: If the indexed item still exists, index adjusts to track it. If deleted and collection non-empty, index = min(oldIndex, newSize). If collection empty, index = 0.

### Expression Context Within Repeats

- Each repeat item's inner elements get an evaluation context where: context node = the collection node for that item, context position = item's position in the collection, context size = collection size.
- Nested repeats: inner repeat's nodeset is evaluated relative to each outer repeat item's context node.
- This is the same "scoped resolution" / "nearest ancestor binding element" rule used everywhere — repeat is just the Node Set Binding case.

### Alternative Syntax

- `repeat-nodeset`, `repeat-bind`, etc. attributes can be placed on host-language elements (e.g. `<tr repeat-nodeset="...">`) for integration where `<xforms:repeat>` isn't allowed in the content model.

---

## 5. Multiple Instances & `instance()` Function

- A single `<model>` can contain multiple `<instance id="...">` elements, each holding a separate XML document.
- The **default instance** is the first `<instance>` child of the model (in document order).
- **`instance('id')`** returns the root element node of the named instance *within the same model* as the current context node. Returns empty node-set if no match or different model.
- If argument omitted/empty: returns root element of the default instance in the context node's model.
- Cross-instance references: `instance('prices')/catalog/item[@id = instance('order')/selectedId]`
- Each instance is an independent XML document with its own tree. MIPs (via `<bind>`) can reference nodes across instances within the same model.
- `instance()` in computed expressions creates **dynamic dependencies** — may require manual `rebuild` if the instance structure changes (since dependency tracking is built at rebuild time).

---

## 6. MVC Separation

### Model

- Lives in `<model>` (typically in document `<head>`).
- Contains: `<instance>` (data), `<bind>` (MIPs/constraints/calculations), `<submission>` (submission config), `<schema>` refs.
- Fully functional without any UI — you can rebuild/recalculate/revalidate/submit purely from the model.
- Multiple models per document allowed; each is independent.

### View (UI)

- Form controls (`input`, `select`, `output`, `trigger`, etc.) live in the document body.
- Controls are **intent-based** ("select one", not "radio button") — rendering is device-dependent.
- Each control binds to a model node via `ref`/`bind`/`model` attributes.
- Controls always carry their own `<label>` — metadata is co-located with the control, not separate.
- UI reflects model state: values, validity, required, readonly, relevant — all driven by the model.

### Controller

- XML Events + XForms Actions (`setvalue`, `insert`, `delete`, `send`, `toggle`, etc.).
- Actions are declarative, event-driven. Attached to UI elements or model elements.
- Orchestrates mutations, submissions, and model↔view interactions.

### Key Consequence

- The same model can be presented by completely different UIs (desktop vs. voice vs. mobile).
- The same UI pattern can bind to different models.
- Data structure, validation logic, and derived computations are NEVER embedded in UI markup.

---

## 7. Expression Context (XPath Evaluation Context)

### Default Context

- If no ancestor binding element: context node = root element of default instance of default model (first model in doc order). Position = 1, size = 1.

### Scoped Resolution ("Nearest Ancestor Binding Element" rule)

- Non-outermost binding elements inherit context from their nearest ancestor binding element:
  - If ancestor has **Single-Node Binding** (`ref`): context node = that single node, position = 1, size = 1.
  - If ancestor has **Node-Set Binding** (`nodeset`, as in `repeat`): for each node in the set, a dynamic context is created: context node = that node, position = node's position, size = set size.
- This is recursive — deeply nested elements progressively narrow context.

### Model Switching

- If an element specifies `model="otherModel"` and the inherited context is from a different model, context resets to root element of the referenced model's default instance. Position = 1, size = 1.

### Bind Element Contexts

- `<bind nodeset="...">` evaluates its nodeset in its in-scope context.
- Computed MIP expressions on a bind are evaluated once per node in the bind's node-set, with context node/position/size set per-node (same as the repeat dynamic context rule).
- Nested `<bind>` elements scope relative to parent bind's node-set.

### Special Attributes

- Some attributes (e.g., `value` on `setvalue`, `at` on `insert`/`delete`) have their own context rules documented per-element — sometimes the in-scope context, sometimes the result of the element's own binding.

---

## 8. Submission Serialization

### Pipeline

1. **Flush deferred updates**: rebuild + recalculate if flags are set.
2. **Select data**: `ref`/`bind` on `<submission>` selects a subtree (default: `/`, the whole instance). The selected node + all descendants form the initial selection.
3. **Relevance pruning**: If `relevant="true"` (default for serialized submissions), non-relevant nodes are removed from selection. If nothing remains → error (`no-data`).
4. **Validation**: If `validate="true"` (default for serialized submissions), all selected nodes checked for validity. Any invalid node → error (`validation-error`).
5. **Serialization**: One of several formats (or `"none"` to skip).
6. **Custom serialization hook**: `xforms-submit-serialize` event fires — handler can replace serialization body with arbitrary string.
7. **Transmission**: HTTP method + URI + headers + serialized body.

### Serialization Formats

| Format | Method Default | Characteristics |
|--------|---------------|------------------|
| `application/xml` | POST, PUT | Full XML subtree. Namespace handling via `includenamespaceprefixes`. XSLT output-method rules. |
| `application/x-www-form-urlencoded` | GET, DELETE | Leaf elements only → `name=value` pairs. No attributes, no hierarchy. Lossy. |
| `multipart/related` | multipart-post | XML instance as root part + binary attachments (from `upload`/`xsd:anyURI`) as separate MIME parts. |
| `multipart/form-data` | form-data-post | Legacy HTML-compatible. Leaf elements as form-data parts. Binary from uploads. No hierarchy preserved. |
| `none` | — | No serialization. Useful for GET-with-no-body or validity-check-only submissions. Disables relevance pruning and validation by default. |

### Response Handling (`replace` attribute)

- `"all"`: Replace entire document with response.
- `"instance"`: Parse response XML, replace target instance (or subtree via `targetref`).
- `"text"`: Replace target node's text content with response text.
- `"none"`: Discard response body.

### Sync/Async

- `mode="synchronous"`: Blocks UI and action processing until response.
- `mode="asynchronous"` (default): Submission completes in background; response processed when received.

---

## Key Transferable Concepts for a JSON-Native Reimagining

1. **Declarative MIPs on data nodes** — type, computed properties (readonly/required/relevant/calculate/constraint) are metadata on the data graph, not embedded in UI code.
2. **Reactive dependency graph with topological sort** — automatic, minimal, ordered recalculation. No manual subscription management.
3. **Relevance as first-class concept** — drives both UI visibility AND data pruning at submission. Inherited down the tree.
4. **Repeat = dynamic array binding** — a template instantiated per item, with automatic context scoping. Index tracking for "current item".
5. **Multiple named data stores** — cross-referenceable within the same model scope.
6. **Expression context scoping** — evaluation context narrows as you nest deeper into the UI/binding tree. No need for explicit index variables.
7. **Four-phase update cycle** — structural rebuild → value recalculation → validation → UI refresh. Each phase has clear responsibilities.
8. **Submission as declarative pipeline** — select subtree → prune → validate → serialize → transmit → handle response. All configurable via attributes.
