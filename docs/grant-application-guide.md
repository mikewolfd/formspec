# Grant Application — Formspec Walkthrough

This guide walks through `examples/grant-application/` as a first-principles introduction to
Formspec. It is aimed at developers who want to understand the *why* behind the design, not just
follow a tutorial. Each section pairs explanation with concrete snippets drawn from the actual
files in that directory.

## 1. What This Example Builds

The grant application example constructs a four-page federal grant form and runs it through
the full Formspec lifecycle: a `definition.json` specifies the form structure, a `component.json`
controls wizard layout and data-table presentation, a `theme.json` supplies a USWDS-flavored
token set, `mapping.json` transforms a validated submission into a downstream grants-management
payload, and `server/main.py` implements a FastAPI endpoint that re-validates and maps on the
server side.

The domain — a federal grant application — is deliberately bureaucratic. It gives us a natural
excuse to exercise money arithmetic, conditional field visibility, cross-field validation rules,
repeatable groups, and server-side constraint re-evaluation all in a single coherent example.
The result is not a toy: the same patterns scale to real government forms.

The four wizard pages are: *Applicant Info*, *Project Narrative*, *Budget*, and *Subcontractors*.
The Subcontractors page renders conditionally — only when the applicant has declared they will
use subcontractors. That conditional rendering is not a UI trick; it is driven by a bind in
`definition.json` and backed by `nonRelevantBehavior: "remove"`, which strips the data on
submission.


## 2. Form Definition Structure

The definition lives at `examples/grant-application/definition.json`. Every Formspec definition
starts with a small header block:

```json
{
  "$formspec": "1.0",
  "url": "https://example.gov/forms/grant-application",
  "version": "1.0.0",
  "status": "active",
  "nonRelevantBehavior": "remove",
  "formPresentation": {
    "pageMode": "wizard",
    "labelPosition": "top",
    "density": "comfortable"
  }
}
```

`$formspec` pins the spec version. `url` is the stable canonical identifier — the server uses it
to reject submissions for unknown forms. `nonRelevantBehavior: "remove"` is a form-wide policy:
any field that is not relevant (hidden by a bind condition) is omitted from the response entirely,
preventing the client from smuggling hidden-field data through.

`optionSets` are named palettes of `{value, label}` pairs. Declaring them once at the top and
referencing them by name from fields (`"optionSet": "orgTypes"`) prevents value/label drift
across multiple choice fields. The `orgTypes` palette, for example, is consumed by
`applicantInfo.orgType` and also referenced in several FEL expressions.

The `items` array encodes the field hierarchy. Top-level groups carry a `"presentation": { "page":
"..." }` annotation that tells the wizard renderer where each page boundary falls. A field's path
is the dot-joined sequence of its ancestor group keys plus its own key — so `applicantInfo.ein`
lives inside the `applicantInfo` group. Nested groups (like `lineItems` inside `budget`) simply
extend the path further.


## 3. FEL in Practice

FEL (Formspec Expression Language) is a typed expression language embedded in `variables`,
`binds`, `shapes`, and `mapping` rules. Two sigils distinguish reference types: `$path`
references a field value by its dot-path, while `@name` references a definition-scoped variable.

The three `variables` in this form illustrate the language's range.

**Wildcard aggregation.** `$lineItems[*].subtotal` fans out across every instance of the
repeatable `lineItems` group and collects the `subtotal` field from each. `moneySum` then folds
the resulting list into a single money value:

```json
{
  "name": "totalDirect",
  "expression": "moneySum($lineItems[*].subtotal)"
}
```

**Conditional logic, null-coalescing, and money construction.** Government entities are not
eligible for indirect costs, so `@indirectCosts` must return zero for them. The `??` operator
coalesces a null `indirectRate` to zero, preventing a multiply-by-null error:

```json
{
  "name": "indirectCosts",
  "expression": "if($applicantInfo.orgType = 'government') then money(0, 'USD') else money(moneyAmount(@totalDirect) * ($projectNarrative.indirectRate ?? 0) / 100, moneyCurrency(@totalDirect))"
}
```

**Per-row calculated subtotals.** Inside a `calculate` bind on `lineItems[*].subtotal`, the
path references (`$unitCost`, `$quantity`) resolve relative to each repeat instance:

```
money(moneyAmount($unitCost) * $quantity, moneyCurrency($unitCost))
```

**Date arithmetic.** The `duration` field is auto-calculated and read-only in practice:

```
dateDiff($projectNarrative.endDate, $projectNarrative.startDate, 'months')
```

Variables are evaluated lazily and cached reactively. `@grandTotal` depends on `@indirectCosts`
which depends on `@totalDirect` — the engine wires these dependencies automatically via Preact
Signals, so any line-item edit propagates through the whole chain.


## 4. Binds and Conditional Logic

Binds are the per-field policy layer. Each bind targets a path (or a wildcard path like
`lineItems[*].subtotal`) and can attach any combination of `relevant`, `required`, `readonly`,
`calculate`, `constraint`, and `constraintMessage`.

The EIN field enforces a format rule:

```json
{
  "path": "applicantInfo.ein",
  "constraint": "matches($applicantInfo.ein, '^[0-9]{2}-[0-9]{7}$')",
  "constraintMessage": "EIN must be in the format XX-XXXXXXX (e.g. 12-3456789)."
}
```

`constraint` expressions must evaluate to a boolean. When they return `false`, the engine adds an
error-severity `ValidationResult` to the report.

The entire Subcontractors page is hidden via a `relevant` bind on its group key:

```json
{
  "path": "subcontractors",
  "relevant": "$budget.usesSubcontractors"
}
```

When `usesSubcontractors` is false, the group is non-relevant. Because the form sets
`nonRelevantBehavior: "remove"`, the subcontractor data is stripped from `getResponse()` output.
The page never appears in the wizard navigation and its data is never submitted — both the UI
and the data contract enforce the same invariant.


## 5. Validation Shapes

Bind constraints enforce field-level rules. Shapes enforce rules that span multiple fields or
the entire form. The three shapes in this example cover the main budget integrity requirements.

**`budgetMatch`** targets `budget.requestedAmount` directly and checks that the value the
applicant manually entered matches the engine-computed grand total within a $1 tolerance:

```json
{
  "id": "budgetMatch",
  "target": "budget.requestedAmount",
  "severity": "error",
  "constraint": "abs(moneyAmount($budget.requestedAmount) - moneyAmount(@grandTotal)) < 1",
  "message": "Requested amount must match the calculated grand total (within $1)."
}
```

**`budgetReasonable`** uses `target: "#"` to attach the result to the form root rather than any
specific field. Its `severity` is `"warning"`, so it appears in the validation report but does not
block submission if the consuming application chooses to allow it:

```json
{
  "id": "budgetReasonable",
  "target": "#",
  "severity": "warning",
  "constraint": "moneyAmount(@grandTotal) < 500000"
}
```

**`subcontractorCap`** uses `activeWhen` to gate the entire shape. The 49% cap is a federal
requirement, but it is meaningless unless subcontractors are declared. `activeWhen` prevents
false positives when the condition is irrelevant:

```json
{
  "id": "subcontractorCap",
  "activeWhen": "$budget.usesSubcontractors",
  "constraint": "moneyAmount(moneySum($subcontractors[*].subAmount)) <= moneyAmount(@grandTotal) * 0.49"
}
```

Each shape that fires produces a `ValidationResult` object in the report. The report is what the
server receives and re-evaluates independently.


## 6. Server-Side Re-Validation

Client-side FEL evaluation is a user-experience feature, not a security boundary. A determined
client can POST arbitrary JSON directly to the server. `server/main.py` closes that gap by
re-running the same constraint logic on the server using the Python FEL evaluator:

```python
@app.post("/submit", response_model=SubmitResponse)
def submit(request: SubmitRequest):
    if request.definitionUrl != _definition["url"]:
        raise HTTPException(status_code=400, detail=...)

    # Re-validate EIN format, date ordering, budget match, and subcontractor cap
    result = evaluate(expression, field_data)
    value = to_python(result.value)
    if value is False:
        validation_results.append({ "severity": "error", ... })
```

`formspec.fel.evaluate` in `src/formspec/fel/evaluator.py` is a complete Python FEL
implementation that shares no runtime code with the TypeScript engine. The two implementations
must agree: the conformance test suite (`tests/`) enforces that they produce identical results
on the same inputs.

The server builds its own evaluation context from `request.data` rather than trusting any
client-computed values. Budget totals are recomputed from raw line-item figures; the grand total
is derived from scratch. A client that submits a manipulated `requestedAmount` with a plausible
looking total will be caught by the `budgetMatch` re-check. After validation, the server calls
`MappingEngine.forward(data)` to produce the grants-management output, and returns both the
validation report and the mapped payload.


## 7. The Mapping Document

`examples/grant-application/mapping.json` describes how a validated Formspec response is
transformed into a different JSON shape expected by a hypothetical grants-management system. The
mapping document is separate from the definition — mapping is a deployment concern, not a form
authoring concern.

Three transform types appear in this example:

**`preserve`** copies a value unchanged from source path to target path:

```json
{ "sourcePath": "applicantInfo.orgName", "targetPath": "organization.name",
  "transform": "preserve", "priority": 100 }
```

**`valueMap`** translates coded values into the target system's vocabulary:

```json
{ "sourcePath": "applicantInfo.orgType", "targetPath": "organization.type_code",
  "transform": "valueMap",
  "valueMap": { "nonprofit": "NPO", "university": "EDU", "government": "GOV" } }
```

**`expression`** applies a FEL snippet to extract or derive a value. Money fields in Formspec
are structured objects `{amount, currency}`. The grants-management API expects them split across
two fields:

```json
{ "sourcePath": "budget.requestedAmount", "targetPath": "budget.requested_amount",
  "transform": "expression", "expression": "@source.amount" }
```

The subcontractor array rule carries a `condition` that mirrors the relevance bind:

```json
{ "sourcePath": "subcontractors", "targetPath": "subcontractors",
  "condition": "$budget.usesSubcontractors = true" }
```

`priority` controls rule ordering when multiple rules write to overlapping paths. Higher numbers
run first.


## 8. What This Example Does Not Cover

This walkthrough focuses on the core mechanics. Several Formspec features are not exercised here:

- **Screener routing** — branching logic that routes applicants to different form paths based on
  early answers. See `specs/core/spec.llm.md` § Routing.
- **Modular composition (`$ref`)** — embedding reusable sub-form fragments by reference rather
  than inline. See `specs/core/spec.llm.md` § References.
- **Version migrations** — how definitions evolve over time and how stored responses are migrated.
  See `specs/registry/changelog-spec.llm.md`.
- **Extension registry** — publishing and discovering custom components and theme tokens.
  See `specs/registry/extension-registry.llm.md`.
- **Remote data sources (`@instance()`)** — binding choice fields to server-fetched option lists.
  See `specs/core/spec.llm.md` § Remote Options.
- **CSV/XML adapter output** — producing non-JSON output from a mapping document using the
  built-in adapters. See `specs/mapping/mapping-spec.llm.md` § Adapters.
