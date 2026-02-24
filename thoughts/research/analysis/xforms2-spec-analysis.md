# XForms 2.0 Research: Changes from XForms 1.1

Source: <https://www.w3.org/community/xformsusers/wiki/XForms_2.0>
Status: Community Group living document (not a formal W3C Recommendation)
Editors: Erik Bruchez (Orbeon), Alain Couthures (agence XML), Steven Pemberton (CWI)

---

## 1. EXPRESSION LANGUAGE: XPath 2.0+ (Major Change)

XForms 2.0 moves from XPath 1.0 to **XPath 2.0 and higher**. This is the single biggest
technical change. It enables:

- **Typed values and atomic values** — not just node-sets and strings
- **XPath 2.0 `if/then/else`** expressions inline
- **Sequences** — expressions can return ordered sequences of items
- **Quantified expressions** (`some $x in ... satisfies ...`, `every $x in ...`)
- **`for` expressions** for iteration within expressions
- **Rich string functions**: `matches()`, `replace()`, `tokenize()` (regex-based)
- **Date/time arithmetic** built into the language
- **Type constructors**: `xs:date(...)`, `xs:decimal(...)`, etc.

### Attribute Value Templates (AVTs)

A major ergonomic addition. Dynamic values can be injected into **any attribute**
using `{expression}` syntax:

```xml
<output ref="total" class="{if (. ge 0) then 'positive' else 'negative'}" />
<itemset ref="instance('c')/country" label="{.}" value="@code"/>
<submission resource="http://example.org/api?search={search}" .../>
```

AVTs work on all attributes EXCEPT those that are already expressions (like `ref`,
`calculate`, `constraint`) and a small number of structural attributes.

**Formspec relevance**: We use JSONPath expressions already. AVTs are analogous to
our template string support. The typed value system is relevant — we should ensure
our expression language supports typed comparisons.

---

## 2. NEW MODEL ITEM PROPERTIES (MIPs)

### 2a. `initial` MIP (NEW)

Calculates an initial value for a node, evaluated **once during model initialization**
(before any `calculate` runs). Overwrites any existing inline value.

```xml
<bind ref="today" initial="now()"/>
<bind ref="year" initial="substring(local-date(), 1, 4)"/>
<bind ref="balance" initial="0" calculate="sum(../credit) - sum(../debit)"/>
```

**Formspec relevance**: We have `default` on fields. The `initial` MIP is essentially
the same concept but as an expression rather than a static value. We should ensure
our `default` supports expressions/functions (like `$now()`).

### 2b. `whitespace` MIP (NEW)

Controls how whitespace is treated when a node receives a new value:

- `preserve` — all whitespace preserved (default)
- `remove` — all whitespace removed
- `trim` — leading/trailing whitespace removed
- `collapse` — multiple whitespace → single space
- `normalize` — trim + collapse combined

```xml
<bind ref="name" whitespace="normalize"/>
<bind ref="cardnumber" type="card-number" whitespace="remove"/>
```

**Formspec relevance**: This is a useful property we don't have. Adding a `whitespace`
property to field bindings (with values like "trim", "normalize") would be valuable.
Most real-world forms want at least "trim" on text inputs.

### 2c. `sort` / `direction` / `collation` MIPs (NEW)

Declarative sorting of node-sets, kept sorted automatically:

```xml
<bind ref="data" sort="date">
   <bind sort="time"/>
</bind>
<bind ref="person" sort="namn" direction="up"
      collation="https://www.w3.org/2013/collation/UCA/?lang=se"/>
```

Multi-level sort supported. Can also be applied to controls (sort display only).

**Formspec relevance**: Declarative sorting on repeat/array data is interesting.
We could add `sort` to our repeat definitions.

### 2d. `label`, `help`, `hint`, `alert` as MIPs on `bind` (NEW)

These UI texts can now be declared in the model, not just on controls:

```xml
<bind ref="p" label="Percentage"/>
<bind ref="cvv" label="Security Code"
      help="The 3-digit code on the back of your card"/>
<bind ref="creditcard" type="card-number" label="Credit card"
      constraint="is-card-number(.)" alert="Incorrect card number"
      hint="16 digits, spaces allowed" whitespace="remove"/>
```

Precedence: control attribute > control child element > bind property.

**Formspec relevance**: We already put label/description on field definitions.
The XForms approach of allowing them on both bind and control with precedence
rules is more flexible for reuse scenarios.

### 2e. Multiple MIPs of Same Property on One Node

You can now have multiple binds targeting the same node with different constraints,
each with its own alert:

```xml
<bind ref="count">
    <bind type="integer" alert="must be a whole number"/>
    <bind constraint=". > 0" alert="must be greater than zero"/>
</bind>
```

**Formspec relevance**: VERY IMPORTANT. This allows per-constraint error messages.
Our validation system should support multiple constraints per field, each with
its own error message. This is a common real-world need.

---

## 3. NON-XML INSTANCE DATA: JSON AND CSV

### 3a. JSON Instance Data

XForms 2.0 supports loading JSON as instance data. JSON is converted to an XML
representation internally with `type` attributes to preserve round-tripping:

```
JSON: {"given": "Mark", "age": 21}
XML:  <json type="object">
         <given>Mark</given>
         <age type="number">21</age>
      </json>
```

Arrays use `_` elements:

```
JSON: {"cities": ["Amsterdam", "Paris", "London"]}
XML:  <json type="object">
        <cities type="array">
          <_>Amsterdam</_>
          <_>Paris</_>
          <_>London</_>
        </cities>
      </json>
```

Key features:

- Round-trippable (can serialize back to JSON)
- Invalid XML name characters in keys → underscore replacement + `name` attribute
- Null, boolean, number types tracked via `type` attribute
- Can be submitted as `application/json`

**Formspec relevance**: This is XForms' answer to "how do we handle JSON" — and it's
fundamentally a shim. They convert JSON→XML internally and use XPath to query it.
Our JSON-native approach is inherently superior here. We work with JSON directly
and use JSONPath/expressions to query it. No conversion needed.

### 3b. CSV Instance Data

Similar mapping for CSV data:

```
CSV:  Year, Result
      2011, 143
XML:  <csv>
        <r><Year>2011</Year><Result>143</Result></r>
      </csv>
```

### 3c. Instance Fallback

The `src` attribute on `<instance>` now supports fallback to inline content:

```xml
<instance src="saveddata.xml">
  <game xmlns="">
     <score>0</score>
     <attempts>0</attempts>
  </game>
</instance>
```

If `src` fails, inline content is used instead.

---

## 4. CUSTOM FUNCTIONS AND VARIABLES

### 4a. The `var` Element (Variables)

Declares variables usable within expressions:

```xml
<var name="tax-rate" value="0.15"/>
```

Variables have scoping rules and can be used in subsequent expressions.

### 4b. The `function` Element (Custom Functions)

User-defined XPath functions declared in the model:

```xml
<function signature="my:factorial($n as xs:integer) as xs:integer">
  <var name="n" value="$n"/>
  <result value="if ($n le 1) then 1 else $n * my:factorial($n - 1)"/>
</function>
```

**Formspec relevance**: Custom functions are powerful for reuse. We should consider
whether Formspec needs user-defined functions. Our expression language could
support a `functions` section in the form definition.

---

## 5. NEW FUNCTIONS

XForms 2.0 adds many new built-in functions:

**Model functions**: `valid()`, `relevant()`, `readonly()`, `required()` — query MIP state
**Serialization**: `serialize()` — serialize nodes to string
**URI manipulation**: `uri-scheme()`, `uri-host()`, `uri-port()`, `uri-path()`,
  `uri-query()`, `uri-fragment()`, `uri-param-names()`, `uri-param-values()`
**XML construction**: `element()`, `attribute()`, `parse()` — programmatic XML building
**Evaluation**: `eval()`, `eval-in-context()` — dynamic expression evaluation
**Controls**: `case()` — query which case is selected in a switch
**Binding**: `bind()` — reference a bind's selected nodes
**Location**: `location-uri()`, `location-param()` — access page URL/params
**Card number**: `is-card-number()` — Luhn algorithm validation
**Crypto**: cryptographic functions added
**Date/Time**: `seconds-from-epoch()` — epoch timestamp

**Formspec relevance**: Several of these are very useful:

- `valid()`, `relevant()`, `readonly()`, `required()` — querying MIP state from expressions
- `location-uri()`, `location-param()` — accessing page URL parameters
- `serialize()` — useful for debugging/display
- Card number validation as a built-in

---

## 6. UI CONTROLS CHANGES

### 6a. New `control` Element (Embedding/Composition)

A new `<control>` element allows embedding one XForm inside another:

```xml
<control resource="subform.xhtml" ref="shared-data"/>
```

Combined with the `<shared>` element for data sharing between forms, and
`<signal>` action for inter-form event communication.

**Formspec relevance**: Form composition/embedding is important. We should
consider how one Formspec can embed or reference another, sharing data.

### 6b. New `dialog` Element

Modal and modeless dialogs:

```xml
<dialog level="modal" label="Confirm">
  Are you sure?
  <trigger label="Yes"><hide dialog="confirm" ev:event="DOMActivate"/></trigger>
</dialog>
```

With `show` and `hide` actions.

**Formspec relevance**: Dialogs/modals are a common UI pattern in forms.
We might want a dialog/modal container.

### 6c. `group` Element Enhancements

- New `collapse` attribute makes groups collapsible:

  ```xml
  <group collapse="open" ref="address" label="Shipping Address">
  ```

- `appearance="minimal"` for inline layout

**Formspec relevance**: Collapsible sections are very common in forms. We should
support this on our group/section controls.

### 6d. `switch` Element Enhancements

- New `caseref` / binding-based case selection:

  ```xml
  <switch ref="/payment/details/@method">
    <case name="creditCard" label="Credit Card Details">...</case>
    <case name="cashCard" label="Bank Account Card">...</case>
  </switch>
  ```

  The selected case is driven by data binding — when the bound value changes,
  the matching case is automatically selected.

**Formspec relevance**: This is essentially what our `relevant`/conditional visibility
does, but as a dedicated container. Worth considering as a pattern.

### 6e. MIPs on Controls

Most model-item properties can now appear directly on controls:

```xml
<input ref="email" relevant="../method='email'" required="true()"/>
```

This was previously only allowed on `<bind>` elements.

### 6f. `label`, `hint`, `help`, `alert` as Attributes

Previously these had to be child elements. Now they can be attributes:

```xml
<!-- XForms 1.1 -->
<input ref="name"><label>Name</label></input>

<!-- XForms 2.0 -->
<input ref="name" label="Name"/>
```

### 6g. `output` Enhancements

- Can now output more than just simpleContent (e.g., SVG, HTML fragments)
- `mediatype` attribute for rendering images, HTML, MathML, SVG
- `appearance` attribute for controlling date/number formatting

### 6h. `select1` Can Be Deselected

A `select1` item can now be deselected (returning to no selection).

---

## 7. REPEAT IMPROVEMENTS

### 7a. `indexref` Attribute

Synchronizes the repeat index with an instance data node:

```xml
<repeat ref="items" indexref="current-item-index">
```

When the index changes, the bound value updates; when the value changes, the
index follows.

### 7b. `appearance="minimal"` for Inline Repeats

```xml
<repeat appearance="minimal" ref="keyword">
   <output value="concat(., if(last(), '', ', '))"/>
</repeat>
```

Renders repeat items inline rather than as blocks.

### 7c. Repeat Over Non-Node Sequences

The repeat collection can now be any sequence — not just nodes:

```xml
<repeat ref="1 to 10">
  <output ref="."/>
</repeat>
```

This allows iterating over computed sequences, including `1 to count(items)`.

### 7d. CSS Pseudo-Elements for Repeat Styling

```css
::repeat-item { display: inline }
::repeat-index { background-color: yellow }
```

**Formspec relevance**: The `indexref` concept (syncing current index to data) is
interesting for wizard-style forms. Repeat over computed ranges is also useful.

---

## 8. SUBMISSION CHANGES

### 8a. JSON Serialization

Data can be serialized as `application/json` for submission. The XML→JSON
conversion is the reverse of the JSON→XML mapping.

### 8b. CSV Serialization

Similarly, `text/csv` serialization is supported.

### 8c. `get` is Now Default Method

Changed from `post` to `get` as the default submission method.

### 8d. `nonrelevant` Replaces `relevant`

New attribute with three options:

- `keep` — all values serialized
- `remove` — non-relevant values excluded (default)
- `empty` — non-relevant nodes serialized as empty values

The `empty` option is new — useful when the server expects the full data
structure but wants blanked-out irrelevant fields.

### 8e. `value` Attribute for Submission Data

Can provide an expression that calculates the data to submit:

```xml
<submission value="serialize(instance('data'))" .../>
```

### 8f. `response-mediatype` Override

Can override the Content-Type reported by the server for the response.

### 8g. `validate` Attribute Default Changed

Defaults to `false` when `serialization="none"`, `true` otherwise.

**Formspec relevance**: The `nonrelevant` options (keep/remove/empty) are very
relevant. When submitting form data, what happens to conditionally-hidden fields
is a real design question. We should support all three modes.

---

## 9. EVENTS AND ACTIONS CHANGES

### 9a. New Events

- `xforms-action-warning` — non-fatal warning during action processing
- `xforms-submit-ready` — before submission actually sends
- `xforms-refresh-done` — after UI refresh completes

### 9b. Deprecated Events

Several events deprecated in favor of direct actions:

- `xforms-rebuild`, `xforms-recalculate`, `xforms-revalidate`, `xforms-refresh`,
  `xforms-reset` — replaced by calling the actions directly
- `xforms-submit-serialize` — deprecated

### 9c. Event Handlers on Disabled Controls

Event handlers are **no longer disabled** when their associated controls are disabled.
This is a behavioral change — previously disabled controls couldn't process events.

### 9d. Conditionally Cancellable Events

Events can now be conditionally cancelled with the new `<cancel/>` action.

### 9e. New Actions

- `<update/>` — force model update
- `<cancel/>` — cancel an event
- `<signal/>` — send signals between embedded forms
- `@iterate` added to actions for iteration
- Ability to **call script** (JavaScript) from actions with parameter passing
- `<reset instance="id"/>` and `<retain/>` for instance management

### 9f. Custom Event Properties

Can add custom properties when dispatching events.

**Formspec relevance**: The script-calling ability bridges declarative and imperative.
The `@iterate` on actions is useful. The `<cancel>` action for conditional event
cancellation is a nice pattern.

---

## 10. VALIDATION CHANGES

### 10a. Validity Definition Changed

A node is valid if:

- The value is **empty and not required**, OR
- The value satisfies all applicable types AND all constraints evaluate to true

This means **empty non-required fields are always valid** — a practical change from
1.1 where empty values of certain types could be invalid.

### 10b. Multiple Constraints with Individual Alerts

As noted above, multiple bind elements can target the same node:

```xml
<bind ref="count">
    <bind type="integer" alert="must be a whole number"/>
    <bind constraint=". > 0" alert="must be greater than zero"/>
</bind>
```

Each constraint violation produces its own error message.

**Formspec relevance**: CRITICAL. Our validation should support:

- Empty non-required = valid (we likely already do this)
- Per-constraint error messages

---

## 11. NEW DATATYPES

- `xf:absoluteIRI` — absolute IRI type
- `xf:httpIRI` — HTTP-specific IRI type
- `xf:iemail` — internationalized email (better than xs:string for email)
- `xf:telephone` — telephone number type
- `xf:HTMLFragment` — for rich text/HTML content
- `xf:card-number` — credit card number (14-18 digits)

**Formspec relevance**: The HTMLFragment type for rich text, telephone type,
and email types are all useful for our type system.

---

## 12. PROCESSING MODEL CHANGES

### 12a. Dependency Tracking Clarified

The spec clarifies how expression dependencies work — an expression "references"
a node if the node is selected during evaluation, even if subsequently filtered out.
This affects recalculation triggers.

### 12b. Lazy Evaluation Notes

The spec explicitly states: "implementations are of course at liberty to optimize
this, as long as the result is the same" — acknowledging that lazy/incremental
evaluation is expected.

### 12c. Updates Deferred During Action Processing

"Updates are not done while an action handler is being processed, but only after
the termination of the outermost action handler." This is essentially batching —
multiple changes during an action sequence only trigger one update cycle.

**Formspec relevance**: The batching model is important. When multiple values
change in response to an action, we should batch recalculation/revalidation
and only do one UI refresh at the end.

---

## 13. FORM COMPOSITION: `<form>`, `<control>`, `<shared>`

### 13a. Standalone `<form>` Element

XForms 2.0 adds a `<form>` root element so XForms can be used standalone
(not just embedded in XHTML).

### 13b. `<control>` for Embedding

One form can embed another via `<control resource="subform.xhtml"/>`.

### 13c. `<shared>` for Data Sharing

The `<shared>` element in a model specifies which data element is shared
with the embedding form:

```xml
<shared ref="data" initial="external"/>  <!-- use parent's data -->
<shared ref="data"/>                    <!-- use local data, push to parent -->
```

### 13d. `<signal>` for Inter-Form Events

Send events between embedded forms.

**Formspec relevance**: Form composition is a significant feature. Consider:

- A way to embed/reference sub-forms
- Data sharing between parent/child forms
- Event/signal communication between composed forms

---

## 14. ERGONOMIC IMPROVEMENTS SUMMARY

| Feature | XForms 1.1 | XForms 2.0 |
|---------|------------|------------|
| Labels | Child elements only | Attributes OR elements |
| Properties on controls | `bind` only | `bind` or control attributes |
| `ref` vs `nodeset` | Both | `nodeset` deprecated → `ref` |
| AVTs | Not available | `{expr}` in most attributes |
| Variables | Not available | `<var>` element |
| Custom functions | Not available | `<function>` element |
| JSON instances | Not supported | Full support with mapping |
| CSV instances | Not supported | Full support with mapping |
| Collapsible groups | Not available | `collapse` attribute |
| Dialog/modal | Not available | `<dialog>` element |
| Form embedding | Not available | `<control>` + `<shared>` |
| Expression language | XPath 1.0 | XPath 2.0+ |

---

## 15. KEY TAKEAWAYS FOR FORMSPEC

Things XForms 2.0 added that we should ensure Formspec handles:

1. **Per-constraint error messages** — Multiple validation rules per field, each
   with its own message. (HIGH PRIORITY)

2. **Whitespace handling** — `trim`/`normalize`/`remove` on text fields. (MEDIUM)

3. **Initial value expressions** — `default` should support dynamic expressions
   like `$now()`. (ALREADY HAVE via expressions)

4. **Non-relevant field handling on submit** — three modes: keep/remove/empty.
   (HIGH PRIORITY — real design question)

5. **Collapsible groups/sections** — common UI pattern. (MEDIUM)

6. **Dialogs/modals** — as container controls. (LOW — can be done at UI layer)

7. **Form composition** — embedding sub-forms, data sharing. (FUTURE)

8. **Custom functions/variables** — for complex reusable logic. (FUTURE)

9. **Declarative sorting** — on repeat/array data. (LOW)

10. **Batched updates** — defer recalc/refresh during action sequences. (IMPLEMENTATION)

11. **Empty non-required = valid** — validation semantics. (SHOULD ALREADY MATCH)

12. **Event handlers work on disabled controls** — behavioral detail. (CONSIDER)

13. **Model-based switch** — data-driven conditional visibility as a first-class
    container, not just per-field relevance. (WE HAVE via `relevant` but could
    add explicit switch/case pattern)

14. **Repeat index synchronization** — `indexref` for wizard-style navigation. (NICE TO HAVE)

Things XForms 2.0 does awkwardly that we do better natively:

1. **JSON support** — XForms converts JSON to XML internally. We work with JSON natively.
2. **Expression syntax** — XPath is verbose for JSON. JSONPath/JS expressions are natural.
3. **Attribute-heavy syntax** — XForms puts everything in XML attributes. Our JSON
   format is more readable for complex configurations.
