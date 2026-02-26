# Formspec — LLM Implementation Map

> **Purpose**: Orientation document for an LLM working in this repo. Read this before reading anything else.
> **Rule**: When spec files conflict with implementation files, the spec is authoritative.
> **Rule**: `*.llm.md` files are generated summaries of the canonical `*.md` specs — prefer them for quick lookups. Do not edit them.

---

## What Is Formspec

A JSON-native declarative form specification with dual reference implementations (TypeScript client-side, Python server-side/tooling). A "formspec" is a JSON document that describes a form's structure, logic, and constraints, independent of any rendering technology. One definition can drive web, mobile, PDF, voice, and API endpoints.

**Three-layer architecture:**
| Layer | Controlled By | Purpose |
|---|---|---|
| Structure (Items) | `definition.items` | What data is collected; field tree, data types, repeat groups |
| Behavior (Binds + Shapes) | `definition.binds` / `definition.shapes` | FEL expressions for calculate/relevant/required/readonly/constraint/validation |
| Presentation | Theme doc + Component doc | How things look; advisory, never affects data or validation semantics |

---

## Document Types

Formspec consists of multiple JSON document types, each with its own schema and spec:

| Document | Schema file | Spec file | Discriminator property |
|---|---|---|---|
| **Definition** | `schemas/definition.schema.json` | `specs/core/spec.llm.md` | `"formspec": "1.0"` |
| **Response** | `schemas/response.schema.json` | `specs/core/spec.llm.md` §6 | `"definitionUrl"` + `"definitionVersion"` + `"status"` |
| **Theme** | `schemas/theme.schema.json` | `specs/theme/theme-spec.llm.md` | `"$formspecTheme": "1.0"` |
| **Component** | `schemas/component.schema.json` | `specs/component/component-spec.llm.md` | `"$formspecComponent": "1.0"` |
| **Mapping** | `schemas/mapping.schema.json` | `specs/mapping/mapping-spec.llm.md` | `"definitionRef"` + `"rules"` |
| **Registry** | `schemas/registry.schema.json` | `specs/registry/extension-registry.llm.md` | `"$formspecRegistry": "1.0"` |
| **Changelog** | `schemas/changelog.schema.json` | `specs/registry/changelog-spec.llm.md` | `"definitionUrl"` + `"changes"` |
| **ValidationReport** | `schemas/validationReport.schema.json` | `specs/core/spec.llm.md` §Validation Results | `"valid"` + `"results"` + `"counts"` |

---

## Spec Files (authoritative behavior)

All under `specs/`. Prefer `*.llm.md` (compact, generated). The `*.md` are canonical but long.

### `specs/core/spec.llm.md` — 415 lines, READ THIS FIRST
Covers everything about Definitions and the processing model. Sections:
- Design principles + conformance levels (Core vs Extended)
- The 6 core abstractions: Definition, Instance, Item, Bind, Validation Shape, Response
- Three-layer architecture
- **4-phase processing model**: Rebuild → Recalculate → Relevant/Required/Readonly → Revalidate → Notify
- FEL reference: field references, operators, type system, ~40 built-in functions, null propagation, error handling
- Definition schema: top-level properties, items, binds, variables, optionSets, screener, instances
- Validation: shapes, composition (and/or/not/xone), ValidationReport structure, modes, external results
- Versioning: url+version identity, status lifecycle, response pinning, modular composition ($ref), migrations

Canonical source: `specs/core/spec.md` (4610 lines, organized as §1 Intro → §2 Conceptual Model → §3 FEL → §4 Definition Schema → §5 Validation → §6 Versioning → §7 Examples → §8 Extension Points)

### `specs/fel/fel-grammar.llm.md` — 85 lines
Normative PEG grammar for FEL (supersedes informative §3.7 in core spec). Key details:
- Lexical rules: identifiers, strings, numbers, date literals (`@YYYY-MM-DD`), reserved words
- Full expression grammar showing operator precedence structurally (LetExpr → IfExpr → Ternary → … → Unary → Postfix → Atom)
- Path reference syntax table: `$field`, `$a.b.c`, `$a[n]`, `$a[*]`, `@current`, `@index`, `@count`, `@instance('name')`
- Conformance points: `if(...)` is special production, `|>` reserved/rejected in v1.0

### `specs/theme/theme-spec.llm.md` — 49 lines
Tier 2 sidecar theme model. Required fields: `$formspecTheme`, `version`, `targetDefinition`. Cascade: `defaults` → `selectors` → `items`. Theme cannot override Definition behavioral logic.

Full spec: `specs/theme/theme-spec.md` (1161 lines)

### `specs/component/component-spec.llm.md` — 55 lines
Tier 3 component document. Required fields: `$formspecComponent`, `version`, `targetDefinition`, `tree`.
- **Core conformance (18 components)**: Page, Stack, Grid, Wizard, Spacer, TextInput, NumberInput, DatePicker, Select, CheckboxGroup, Toggle, FileUpload, Heading, Text, Divider, Card, Collapsible, ConditionalGroup
- **Complete conformance (33 components)**: adds Columns, Tabs, Accordion, RadioGroup, MoneyInput, Slider, Rating, Signature, Alert, Badge, ProgressBar, Summary, DataTable, Panel, Modal
- `bind` resolves by item `key` only (not FEL paths); `when` is visual-only; `relevant=false` always wins over `when`
- Editable components: at most one per key. Display components: multiple mirrors allowed.

Full spec: `specs/component/component-spec.md` (3323 lines): §3 Component Model → §4 Slot Binding → §5 Core Components → §6 Progressive Components → §7 Custom Components → §8 Conditional Rendering → §9 Responsive Design → §10 Theming → §12 Validation

### `specs/mapping/mapping-spec.llm.md` — 54 lines
Bidirectional Mapping DSL. Required: `version`, `definitionRef`, `definitionVersion`, `targetSchema`, `rules[]`.
- Rules are declarative (preserve/drop/expression/coerce/value map/array reshape)
- `condition` guard evaluated before transform; false → skip, no write
- `reverse` field on rules overrides reverse behavior; non-reversible transforms must be blocked
- Adapters (JSON/XML/CSV) are serialization boundaries applied after core mapping

Full spec: `specs/mapping/mapping-spec.md` (2014 lines)

### `specs/registry/extension-registry.llm.md` — 46 lines
Registry format for publishing extension metadata. Required: `$formspecRegistry`, `publisher`, `published`, `entries[]`. Entry identity = `(name, version)`. All extension names must be `x-` prefixed.

### `specs/registry/changelog-spec.llm.md` — 45 lines
Structural diffs between form definition versions. Required: `definitionUrl`, `fromVersion`, `toVersion`, `semverImpact`, `changes[]`. `semverImpact` = max impact across all changes (breaking→major, compatible→minor, cosmetic→patch).

---

## Schemas

Under `schemas/`. Structural truth — use these for JSON Schema validation.

```
schemas/
  definition.schema.json      # FormspecDefinition document
  response.schema.json        # FormspecResponse (filled-out instance)
  validationReport.schema.json# ValidationReport output
  theme.schema.json           # Theme sidecar document
  component.schema.json       # Component/layout tree document
  mapping.schema.json         # Bidirectional mapping rules document
  registry.schema.json        # Extension registry document
  changelog.schema.json       # Version diff changelog document
```

---

## TypeScript Packages

### `packages/formspec-engine/` — Core engine

**Entry point**: `packages/formspec-engine/src/index.ts` (1729 lines)
**Built output**: `packages/formspec-engine/dist/index.js` + `.d.ts`
**Dependencies**: `@preact/signals-core` (reactivity), `chevrotain` (FEL lexer/parser)

#### `FormEngine` class — public API

```typescript
// Construction
new FormEngine(definition: FormspecDefinition, runtimeContext?: FormEngineRuntimeContext)

// Configuration
engine.setRuntimeContext(context)          // set now/locale/timeZone/seed

// Values
engine.setValue(name: string, value: any)  // set field value, triggers processing cycle
engine.signals                             // Record<path, Signal<any>> — reactive field values
engine.getInstanceData(name, path?)        // read secondary instance data

// Repeats
engine.repeats                             // Record<groupName, Signal<number>>
engine.addRepeatInstance(itemName)
engine.removeRepeatInstance(itemName, index)

// Options (for choice/multiChoice fields)
engine.getOptions(path)                    // FormspecOption[]
engine.getOptionsSignal(path)              // Signal<FormspecOption[]>
engine.getOptionsState(path)               // RemoteOptionsState
engine.waitForRemoteOptions()              // Promise — await remote option loading

// State signals (reactive computed, read-only)
engine.relevantSignals                     // Record<path, Signal<boolean>>
engine.requiredSignals                     // Record<path, Signal<boolean>>
engine.readonlySignals                     // Record<path, Signal<boolean>>
engine.errorSignals                        // Record<path, Signal<string|null>>
engine.validationResults                   // Record<path, Signal<ValidationResult[]>>
engine.shapeResults                        // Record<path, Signal<ValidationResult[]>>
engine.variableSignals                     // Record<"scope:name", Signal<any>>

// Validation
engine.getValidationReport(options?)       // ValidationReport
engine.evaluateShape(shapeId)             // ValidationResult[]
engine.getDisabledDisplay(path)           // 'hidden' | 'protected'

// Output
engine.getResponse(meta?)                 // FormspecResponse JSON
engine.getDiagnosticsSnapshot(options?)   // FormEngineDiagnosticsSnapshot

// Advanced
engine.compileExpression(expr, currentItemName?)  // compile + run FEL expression
engine.getVariableValue(name, scopePath)
engine.getDefinition()
engine.getLabel(item)
engine.setLabelContext(context)           // 'short'|'pdf'|'csv'|'accessibility'|null
engine.evaluateScreener()                 // { target: string, label? } | null
engine.migrateResponse(responseData, fromVersion)

// Replay / testing
engine.applyReplayEvent(event: EngineReplayEvent)
engine.replay(events, options?)
```

#### Exported interfaces (from `index.ts`)

```typescript
FormspecDefinition    // top-level definition object
FormspecItem          // item node (field/group/display)
FormspecBind          // bind object (path + MIP expressions)
FormspecShape         // validation shape
FormspecOption        // { value, label }
FormspecVariable      // named computed value
FormspecInstance      // secondary data source declaration
ValidationResult      // single validation entry
ValidationReport      // { valid, results[], counts, timestamp }
FormEngineRuntimeContext  // { now?, locale?, timeZone?, seed? }
EngineReplayEvent     // union of setValue/addRepeat/removeRepeat events
RemoteOptionsState    // 'idle'|'loading'|'loaded'|'error'
```

#### Assembler (`assembler.ts` — 423 lines)

```typescript
// Resolve $ref group inclusions into a flat definition (async or sync)
assembleDefinition(partial: FormspecDefinition, resolver: DefinitionResolver): Promise<AssemblyResult>
assembleDefinitionSync(partial: FormspecDefinition, resolver: DefinitionResolver): AssemblyResult

// DefinitionResolver = (url, version?) => FormspecDefinition | Promise<FormspecDefinition>
// $ref URI format: "url|version#fragment"
```

#### Runtime Mapping Engine (`runtime-mapping.ts` — 190 lines)

```typescript
class RuntimeMappingEngine {
    constructor(mappingDoc: object)           // parse mapping document
    transform(data, direction: MappingDirection): RuntimeMappingResult
}
// MappingDirection = 'forward' | 'reverse'
// RuntimeMappingResult = { direction, output, appliedRules, diagnostics[] }
```

#### FEL Pipeline (`packages/formspec-engine/src/fel/`)

| File | Role |
|---|---|
| `lexer.ts` (137 lines) | Chevrotain-based tokenizer |
| `parser.ts` (299 lines) | Chevrotain CstParser → CST |
| `interpreter.ts` (581 lines) | CstVisitor: evaluates CST to values; implements all ~40 stdlib functions |
| `dependency-visitor.ts` (52 lines) | Extracts field references from CST for reactive wiring |

---

### `packages/formspec-webcomponent/` — Browser custom element

**Entry point**: `packages/formspec-webcomponent/src/index.ts` (1150 lines)
**Custom element**: `<formspec-render>`
**Depends on**: `formspec-engine`

#### `FormspecRender` element — properties and methods

```typescript
// Properties (settable)
element.definition = definitionJson        // triggers engine init + re-render
element.componentDocument = componentJson  // triggers re-render
element.themeDocument = themeJson | null   // triggers re-render; null → default theme

// Methods
element.getEngine()                        // FormEngine | null
element.getDiagnosticsSnapshot(options?)
element.applyReplayEvent(event)
element.replay(events, options?)
element.setRuntimeContext(context)
```

#### Component plugin system

```typescript
// types.ts
interface RenderContext {
    engine: FormEngine;
    componentDocument: any;
    themeDocument: ThemeDocument | null;
    prefix: string;
    renderComponent(comp, parent, prefix?): void;
    resolveToken(val): any;
    applyStyle(el, style): void;
    applyCssClass(el, comp): void;
    applyAccessibility(el, comp): void;
    resolveItemPresentation(item): PresentationBlock;
    cleanupFns: Array<() => void>;
    findItemByKey(key, items?): any | null;
    renderInputComponent(comp, item, fullName): HTMLElement;
    activeBreakpoint: string | null;
}

interface ComponentPlugin {
    type: string;
    render(comp: any, parent: HTMLElement, ctx: RenderContext): void;
}

// registry.ts
globalRegistry.register(plugin: ComponentPlugin)
globalRegistry.get(type: string): ComponentPlugin | undefined
```

#### Registered default components (`components/index.ts`)

Layout: `Page`, `Stack`, `Grid`, `Columns`, `Panel`, `Accordion`, `Modal`, `Popover`, `Divider`, `Collapsible`
Input: `TextInput`, `NumberInput`, `Select`, `Toggle`, `Checkbox`, `DatePicker`, `RadioGroup`, `CheckboxGroup`, `Slider`, `Rating`, `FileUpload`, `Signature`, `MoneyInput`
Display: `Heading`, `Text`, `Card`, `Spacer`, `Alert`, `Badge`, `ProgressBar`, `Summary`
Interactive: `Wizard`, `Tabs`
Special: `ConditionalGroup`, `DataTable`

#### Theme resolver (`theme-resolver.ts` — 277 lines)

```typescript
resolvePresentation(item: ItemDescriptor, theme: ThemeDocument): PresentationBlock
resolveWidget(item: ItemDescriptor, comp: any, theme: ThemeDocument): string
resolveResponsiveProps(comp: any, activeBreakpoint: string | null): any
resolveToken(val: any, themeDoc: ThemeDocument, componentDoc: any): any
```

---

## Python Package

**Location**: `src/formspec/`
**Purpose**: Server-side FEL evaluation, static linting, mapping, and conformance testing.

### `src/formspec/fel/` — Python FEL implementation

| File | Purpose |
|---|---|
| `parser.py` (857 lines) | Full PEG-style parser → AST |
| `evaluator.py` (487 lines) | AST evaluator; `Evaluator(env, functions).evaluate(node)` |
| `functions.py` (747 lines) | All ~40 stdlib function implementations |
| `ast_nodes.py` (161 lines) | AST node dataclasses |
| `types.py` (195 lines) | `FelValue` type + coercion helpers |
| `environment.py` (132 lines) | Evaluation context/scope |
| `dependencies.py` (114 lines) | Dependency graph extraction from compiled expressions |
| `errors.py` | `FelParseError`, `FelEvalError` |
| `extensions.py` | Custom function registration |

```python
from formspec.fel.parser import Parser
from formspec.fel.evaluator import Evaluator
from formspec.fel.environment import Environment

ast = Parser().parse(expression_string)
result = Evaluator(env=Environment(fields={"myField": 42})).evaluate(ast)
```

### `src/formspec/validator/` — Static linter

Entry point: `linter.py`

```python
from formspec.validator.linter import lint, FormspecLinter

# One-shot convenience
diagnostics = lint(document_dict, mode="authoring")  # or "strict"

# Configurable
linter = FormspecLinter(schema_validator=..., policy=LintPolicy(mode="authoring"))
diagnostics = linter.lint(
    document,
    schema_only=False,   # skip semantic passes if True
    no_fel=False,        # skip FEL compilation if True
    component_definition=definition_dict,  # for component doc linting
)
```

Linter passes (for definition documents):
1. `schema.py` — JSON Schema validation, identifies document type
2. `tree.py` — builds item index, checks key uniqueness
3. `references.py` — cross-reference integrity (bind targets, shape IDs, option sets)
4. `expressions.py` — FEL compilation (syntax errors, arity checks)
5. `dependencies.py` — circular dependency detection
6. `component.py` — component document semantic checks
7. `theme.py` — theme document semantic checks

CLI: `python -m formspec.validator <file.json>`

### `src/formspec/mapping/` — Python mapping engine

```python
from formspec.mapping.engine import MappingEngine

engine = MappingEngine(mapping_doc=dict)
result = engine.forward(source_data=dict)   # Formspec response → external schema
result = engine.reverse(target_data=dict)   # external schema → Formspec response
```

### `src/formspec/adapters/` — Format serialization

```python
from formspec.adapters.json_adapter import JsonAdapter
from formspec.adapters.xml_adapter import XmlAdapter
from formspec.adapters.csv_adapter import CsvAdapter
```

Adapters convert between structured `dict` (what the mapping engine produces) and format-specific bytes/strings. Applied after core mapping.

### Other Python modules

| File | Purpose |
|---|---|
| `src/formspec/registry.py` | Extension registry loading/querying |
| `src/formspec/changelog.py` | Changelog generation between definition versions |

---

## Key Concepts for Implementation

### Item key paths
- Definition-time: `group[*].field` (wildcard for repeat groups)
- Runtime (instance): `group[0].field` (0-based in engine signals, 1-based in ValidationReport paths)
- Engine signal keys: plain dot-notation, e.g. `engine.signals["group.field"]`

### Bind MIPs and null semantics in bind context
| MIP | Null evaluates as |
|---|---|
| `relevant` | `true` (show) |
| `required` | `false` (not required) |
| `readonly` | `false` (editable) |
| `constraint` | `true` (passes) |

### FEL string concatenation
Use `&` not `+`. `+` is numeric addition only. Example: `$firstName & " " & $lastName`

### Non-relevant fields
- Validation suppressed entirely
- `nonRelevantBehavior` controls response output: `"remove"` (default) / `"empty"` / `"keep"`
- `calculate` continues to run; `excludedValue` controls what downstream FEL sees

### Processing cycle is reactive
`FormEngine` uses `@preact/signals-core`. Changes propagate automatically. Subscribe to signals with `effect(() => { ... })` from `@preact/signals-core`. Do not poll.

### Response format
```json
{
  "definitionUrl": "https://...",
  "definitionVersion": "1.0.0",
  "status": "in-progress",
  "authored": "2026-02-25T00:00:00.000Z",
  "data": { /* instance object mirroring item tree */ },
  "validationResults": [ /* optional, embedded results */ ]
}
```

### ValidationReport format
```json
{
  "valid": true,
  "results": [
    {
      "severity": "error",
      "path": "lineItems[3].amount",
      "message": "Amount is required",
      "constraintKind": "required",
      "code": "REQUIRED",
      "source": "bind"
    }
  ],
  "counts": { "error": 0, "warning": 1, "info": 0 },
  "timestamp": "2026-02-25T00:00:00.000Z"
}
```

`valid = true` iff zero `error`-severity results (warnings/info do not block).

---

## Spec Authoring Workflow

When changing schemas or spec prose, this sequence is mandatory:
1. Edit `schemas/*.json` and/or `specs/**/*.md` (canonical files only — never `*.llm.md`)
2. Run `npm run docs:generate` — regenerates `*.llm.md` and injects BLUF blocks
3. Run `npm run docs:check` — enforces staleness + critical annotation + cross-spec contract gates
