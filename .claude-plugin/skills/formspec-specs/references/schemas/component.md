# Component Schema Reference Map

> schemas/component.schema.json -- 1511 lines -- Tier 3 component tree document

## Overview

The Component Schema defines the structure of a Formspec Component Document -- a Tier 3 parallel presentation tree of UI components that are bound to a Formspec Definition's items via slot binding. The component tree controls layout and widget selection but cannot override core behavioral semantics (required, relevant, readonly, calculate, constraint) from the Definition. Multiple Component Documents MAY target the same Definition for platform-specific presentations.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecComponent` | `string` (const `"1.0"`) | Yes | Component specification version. MUST be `"1.0"`. |
| `url` | `string` (format: uri) | No | Canonical URI identifier for this Component Document. |
| `name` | `string` | No | Machine-friendly short identifier. |
| `title` | `string` | No | Human-readable name. |
| `description` | `string` | No | Human-readable description. |
| `version` | `string` (minLength: 1) | Yes | Version of this Component Document. |
| `targetDefinition` | `$ref: TargetDefinition` | Yes | Binding to the target Formspec Definition and optional compatibility range. |
| `breakpoints` | `$ref: Breakpoints` | No | Named viewport breakpoints for responsive prop overrides (mobile-first cascade). |
| `tokens` | `$ref: Tokens` | No | Flat key-value map of design tokens, referenced via `$token.key` syntax; Tier 3 tokens override Tier 2 theme tokens. |
| `components` | `object` (patternProperties: `^[A-Z][a-zA-Z0-9]*$`) | No | Registry of custom component templates; keys are PascalCase names that MUST NOT collide with built-in names. |
| `tree` | `$ref: AnyComponent` | Yes | Root component node of the presentation tree; MUST be a single component object. |

**`additionalProperties`: false** -- only the listed properties and `^x-` extensions are allowed at the top level.

**`patternProperties`**: `"^x-": {}` -- allows arbitrary extension properties prefixed with `x-`.

## Key Type Definitions ($defs)

| Definition | Description | Key Properties | Used By |
|---|---|---|---|
| `TargetDefinition` | Binding to a target Formspec Definition with optional semver compatibility range. | `url` (string, uri, required), `compatibleVersions` (string) | Top-level `targetDefinition` |
| `Tokens` | Flat design token map; keys are dot-delimited names, values are strings or numbers. | `additionalProperties`: string or number | Top-level `tokens` |
| `Breakpoints` | Named viewport breakpoints; keys are names, values are non-negative integer pixel widths. | `additionalProperties`: integer (minimum: 0) | Top-level `breakpoints` |
| `StyleMap` | Flat style map; values MAY contain `$token.path` references. Not CSS -- renderers map to platform equivalents. | `additionalProperties`: string or number | `ComponentBase.style` |
| `AccessibilityBlock` | Accessibility overrides for a component's root element (role, description, liveRegion). | `role` (string), `description` (string), `liveRegion` (enum) | `ComponentBase.accessibility` |
| `ResponsiveOverrides` | Breakpoint-keyed prop overrides; values are objects of props to shallow-merge at that breakpoint. | `additionalProperties`: object | `ComponentBase.responsive` |
| `ChildrenArray` | Ordered array of child `AnyComponent` nodes; renderers MUST preserve array order. | `items`: `$ref AnyComponent` | All container/layout components' `children` prop |
| `CustomComponentDef` | Reusable component template with parameters and a subtree. Templates MUST NOT self-reference. | `params` (string[]), `tree` (`$ref AnyComponent`, required) | Top-level `components` registry entries |
| `ComponentBase` | Base properties shared by all component objects via `$ref` inheritance. | `component` (string, required), `when`, `responsive`, `style`, `accessibility`, `cssClass` | Every concrete component definition |
| `AnyComponent` | Discriminated union of all 36 component types via `oneOf`. | `component` (string, required) | `tree`, `ChildrenArray.items`, `CustomComponentDef.tree` |

## Component Types

### Layout Components

| Component | Type String | Category | Level | Key Properties | Required Props | Has Children | Bind |
|---|---|---|---|---|---|---|---|
| Page | `"Page"` | layout | core | `title`, `description`, `children` | `component` | Yes | forbidden |
| Stack | `"Stack"` | layout | core | `direction`, `gap`, `align`, `wrap`, `children` | `component` | Yes | forbidden |
| Grid | `"Grid"` | layout | core | `columns`, `gap`, `rowGap`, `children` | `component` | Yes | forbidden |
| Wizard | `"Wizard"` | layout | core | `showProgress`, `allowSkip`, `children` | `component` | Yes | forbidden |
| Spacer | `"Spacer"` | layout | core | `size` | `component` | No | forbidden |
| Columns | `"Columns"` | layout | progressive | `widths`, `gap`, `children` | `component` | Yes | forbidden |
| Tabs | `"Tabs"` | layout | progressive | `position`, `tabLabels`, `defaultTab`, `children` | `component` | Yes | forbidden |
| Accordion | `"Accordion"` | layout | progressive | `bind`, `allowMultiple`, `defaultOpen`, `labels`, `children` | `component` | Yes | forbidden* |

*Accordion has an optional `bind` for repeating groups but is categorized with bind "forbidden" in x-lm.

### Input Components

| Component | Type String | Category | Level | Key Properties | Required Props | Compatible Data Types | Fallback |
|---|---|---|---|---|---|---|---|
| TextInput | `"TextInput"` | input | core | `bind`, `placeholder`, `maxLines`, `inputMode`, `prefix`, `suffix` | `component`, `bind` | string | -- |
| NumberInput | `"NumberInput"` | input | core | `bind`, `step`, `min`, `max`, `showStepper`, `locale` | `component`, `bind` | integer, number | -- |
| DatePicker | `"DatePicker"` | input | core | `bind`, `format`, `minDate`, `maxDate`, `showTime` | `component`, `bind` | date, dateTime, time | -- |
| Select | `"Select"` | input | core | `bind`, `searchable`, `placeholder`, `clearable` | `component`, `bind` | choice | -- |
| CheckboxGroup | `"CheckboxGroup"` | input | core | `bind`, `columns`, `selectAll` | `component`, `bind` | multiChoice | -- |
| Toggle | `"Toggle"` | input | core | `bind`, `onLabel`, `offLabel` | `component`, `bind` | boolean | -- |
| FileUpload | `"FileUpload"` | input | core | `bind`, `accept`, `maxSize`, `multiple`, `dragDrop` | `component`, `bind` | attachment | -- |
| RadioGroup | `"RadioGroup"` | input | progressive | `bind`, `columns`, `orientation` | `component`, `bind` | choice | Select |
| MoneyInput | `"MoneyInput"` | input | progressive | `bind`, `step`, `min`, `max`, `showStepper`, `currency`, `showCurrency`, `locale` | `component`, `bind` | money | NumberInput |
| Slider | `"Slider"` | input | progressive | `bind`, `min`, `max`, `step`, `showValue`, `showTicks` | `component`, `bind` | integer, number | NumberInput |
| Rating | `"Rating"` | input | progressive | `bind`, `max`, `icon`, `allowHalf` | `component`, `bind` | integer | NumberInput |
| Signature | `"Signature"` | input | progressive | `bind`, `strokeColor`, `height`, `penWidth`, `clearable` | `component`, `bind` | attachment | FileUpload |

### Display Components

| Component | Type String | Category | Level | Key Properties | Required Props | Bind | Fallback |
|---|---|---|---|---|---|---|---|
| Heading | `"Heading"` | display | core | `level`, `text` | `component`, `level`, `text` | forbidden | -- |
| Text | `"Text"` | display | core | `bind`, `text`, `format` | `component` | optional | -- |
| Divider | `"Divider"` | display | core | `label` | `component` | forbidden | -- |
| SubmitButton | `"SubmitButton"` | display | core | `label`, `mode`, `emitEvent`, `pendingLabel`, `disableWhenPending` | `component` | forbidden | -- |
| Alert | `"Alert"` | display | progressive | `severity`, `text`, `dismissible` | `component`, `severity`, `text` | forbidden | Text |
| Badge | `"Badge"` | display | progressive | `text`, `variant` | `component`, `text` | forbidden | Text |
| ProgressBar | `"ProgressBar"` | display | progressive | `bind`, `value`, `max`, `label`, `showPercent` | `component` | optional | Text |
| Summary | `"Summary"` | display | progressive | `items` (array of {label, bind, optionSet}) | `component` | forbidden | Stack |
| ValidationSummary | `"ValidationSummary"` | display | progressive | `source`, `mode`, `showFieldErrors`, `jumpLinks`, `dedupe` | `component` | forbidden | Alert |
| DataTable | `"DataTable"` | display | progressive | `bind`, `columns` (array), `showRowNumbers`, `allowAdd`, `allowRemove` | `component` | optional (repeatable group) | Stack |

### Container Components

| Component | Type String | Category | Level | Key Properties | Required Props | Has Children | Fallback |
|---|---|---|---|---|---|---|---|
| Card | `"Card"` | container | core | `title`, `subtitle`, `elevation`, `children` | `component` | Yes | -- |
| Collapsible | `"Collapsible"` | container | core | `title`, `defaultOpen`, `children` | `component`, `title` | Yes | -- |
| ConditionalGroup | `"ConditionalGroup"` | container | core | `fallback`, `children` | `component`, `when` | Yes | -- |
| Panel | `"Panel"` | container | progressive | `position`, `title`, `width`, `children` | `component` | Yes | Card |
| Modal | `"Modal"` | container | progressive | `title`, `size`, `trigger`, `triggerLabel`, `closable`, `children` | `component`, `title` | Yes | Collapsible |
| Popover | `"Popover"` | container | progressive | `triggerBind`, `triggerLabel`, `placement`, `children` | `component` | Yes | Collapsible |

### Custom Components

| Component | Type String | Category | Level | Key Properties | Required Props |
|---|---|---|---|---|---|
| CustomComponentRef | (any non-built-in string) | custom | core | `component`, `params` | `component` |

**Total: 36 component types** (35 built-in + CustomComponentRef)

## Required Fields

### Top-Level Document
- `$formspecComponent`
- `version`
- `targetDefinition`
- `tree`

### TargetDefinition
- `url`

### CustomComponentDef
- `tree`

### ComponentBase (inherited by all components)
- `component`

### Components with additional required fields beyond `component`
| Component | Additional Required Fields |
|---|---|
| TextInput | `bind` |
| NumberInput | `bind` |
| DatePicker | `bind` |
| Select | `bind` |
| CheckboxGroup | `bind` |
| Toggle | `bind` |
| FileUpload | `bind` |
| RadioGroup | `bind` |
| MoneyInput | `bind` |
| Slider | `bind` |
| Rating | `bind` |
| Signature | `bind` |
| Heading | `level`, `text` |
| Alert | `severity`, `text` |
| Badge | `text` |
| Collapsible | `title` |
| ConditionalGroup | `when` (inherited from ComponentBase but REQUIRED here) |
| Modal | `title` |

### Summary.items entries
- `label`
- `bind`

### DataTable.columns entries
- `header`
- `bind`

## Enumerations

| Enum | Allowed Values | Used By |
|---|---|---|
| Stack direction | `"vertical"`, `"horizontal"` | `Stack.direction` |
| Stack align | `"start"`, `"center"`, `"end"`, `"stretch"` | `Stack.align` |
| TextInput inputMode | `"text"`, `"email"`, `"tel"`, `"url"`, `"search"` | `TextInput.inputMode` |
| Text format | `"plain"`, `"markdown"` | `Text.format` |
| Tabs position | `"top"`, `"bottom"`, `"left"`, `"right"` | `Tabs.position` |
| RadioGroup orientation | `"horizontal"`, `"vertical"` | `RadioGroup.orientation` |
| Rating icon | `"star"`, `"heart"`, `"circle"` | `Rating.icon` |
| Alert severity | `"info"`, `"success"`, `"warning"`, `"error"` | `Alert.severity` |
| Badge variant | `"default"`, `"primary"`, `"success"`, `"warning"`, `"error"` | `Badge.variant` |
| AccessibilityBlock liveRegion | `"off"`, `"polite"`, `"assertive"` | `AccessibilityBlock.liveRegion` |
| SubmitButton mode | `"continuous"`, `"submit"` | `SubmitButton.mode` |
| ValidationSummary source | `"live"`, `"submit"` | `ValidationSummary.source` |
| ValidationSummary mode | `"continuous"`, `"submit"` | `ValidationSummary.mode` |
| Panel position | `"left"`, `"right"` | `Panel.position` |
| Modal size | `"sm"`, `"md"`, `"lg"`, `"xl"`, `"full"` | `Modal.size` |
| Modal trigger | `"button"`, `"auto"` | `Modal.trigger` |
| Popover placement | `"top"`, `"right"`, `"bottom"`, `"left"` | `Popover.placement` |

### Const Values (component type discriminators)

Every built-in component definition constrains its `component` property to a `const` string:

`"Page"`, `"Stack"`, `"Grid"`, `"Wizard"`, `"Spacer"`, `"TextInput"`, `"NumberInput"`, `"DatePicker"`, `"Select"`, `"CheckboxGroup"`, `"Toggle"`, `"FileUpload"`, `"Heading"`, `"Text"`, `"Divider"`, `"Card"`, `"Collapsible"`, `"ConditionalGroup"`, `"Columns"`, `"Tabs"`, `"SubmitButton"`, `"Accordion"`, `"RadioGroup"`, `"MoneyInput"`, `"Slider"`, `"Rating"`, `"Signature"`, `"Alert"`, `"Badge"`, `"ProgressBar"`, `"Summary"`, `"ValidationSummary"`, `"DataTable"`, `"Panel"`, `"Modal"`, `"Popover"`

`CustomComponentRef` uses `"not": { "enum": [...] }` to match any string that is NOT one of the 35 built-in names.

## Cross-References

### Internal `$ref` References (within this schema)

| Source Property | Target `$ref` |
|---|---|
| `targetDefinition` | `#/$defs/TargetDefinition` |
| `breakpoints` | `#/$defs/Breakpoints` |
| `tokens` | `#/$defs/Tokens` |
| `components.*` | `#/$defs/CustomComponentDef` |
| `tree` | `#/$defs/AnyComponent` |
| `ComponentBase.responsive` | `#/$defs/ResponsiveOverrides` |
| `ComponentBase.style` | `#/$defs/StyleMap` |
| `ComponentBase.accessibility` | `#/$defs/AccessibilityBlock` |
| `CustomComponentDef.tree` | `#/$defs/AnyComponent` |
| `ChildrenArray.items` | `#/$defs/AnyComponent` |
| All 36 component defs | `#/$defs/ComponentBase` (via top-level `$ref`) |
| All container `children` props | `#/$defs/ChildrenArray` |
| `AnyComponent.oneOf[0..35]` | `#/$defs/Page`, `#/$defs/Stack`, ..., `#/$defs/CustomComponentRef` |

### External `$ref` References

None. The component schema is self-contained and does not reference other schema files.

### `x-lm` Cross-References

The `x-lm` annotations reference concepts from Tier 1 (Definition) and Tier 2 (Theme) but do not use `$ref` for those links. Semantic links include:
- `compatibleDataTypes` references Definition data types: `string`, `integer`, `number`, `date`, `dateTime`, `time`, `choice`, `multiChoice`, `boolean`, `attachment`, `money`
- `bind` values (`required`, `optional`, `forbidden`) reference Definition item key binding
- `fallback` and `fallbackNotes` reference graceful degradation to other components

## Extension Points

### Top-Level Extensions
- **`patternProperties: "^x-": {}`** -- The top-level document accepts any property prefixed with `x-` with no schema constraints. This is the primary extension point for vendor-specific metadata.

### Custom Component Registry
- **`components`** -- Object keyed by PascalCase names (`^[A-Z][a-zA-Z0-9]*$`) where each value is a `CustomComponentDef`. Custom component names MUST NOT collide with built-in component names.
- **`CustomComponentRef`** -- Enables referencing custom components in the tree with a `params` object for template interpolation. The `component` property uses `"not": { "enum": [...all built-in names...] }` to discriminate custom from built-in.
- **`CustomComponentDef.params`** -- Array of parameter names; referenced in string props via `{paramName}` interpolation syntax.

### Responsive Overrides
- **`ResponsiveOverrides`** -- `additionalProperties: { "type": "object" }` allows arbitrary breakpoint names with arbitrary prop overrides.

### Style System
- **`StyleMap`** -- `additionalProperties` accepts any string or number value, allowing arbitrary style properties. Values MAY contain `$token.path` references.
- **`Tokens`** -- Open-ended key-value map for design tokens with string or number values.

### CSS Classes
- **`ComponentBase.cssClass`** -- Accepts string or string array for arbitrary CSS class injection.

### Accessibility
- **`AccessibilityBlock.role`** -- Accepts any string, allowing arbitrary ARIA role overrides.

## x-lm Annotations

### Top-Level Properties

| Property | x-lm.critical | x-lm.intent |
|---|---|---|
| `$formspecComponent` | `true` | "Version pin for component document compatibility." |
| `version` | `true` | "Revision identifier for the component tree document." |
| `targetDefinition` | `true` | "Declares which definition this component tree is designed to render." |
| `tree` | `true` | "Entry point for all component layout and binding declarations." |

### Component-Level x-lm Annotations

Every component definition carries an `x-lm` block with the following fields:

| Field | Type | Description |
|---|---|---|
| `category` | string | Component category: `"layout"`, `"input"`, `"display"`, `"container"`, `"custom"` |
| `level` | string | Component level: `"core"` (all renderers MUST support) or `"progressive"` (MAY be degraded) |
| `children` | boolean | Whether the component accepts child components |
| `bind` | string | Binding requirement: `"required"`, `"optional"`, `"forbidden"` |
| `compatibleDataTypes` | string[] | (inputs only) Which Definition data types the component can render |
| `fallback` | string | (progressive only) Core component name to degrade to when unsupported |
| `fallbackNotes` | string | (progressive only) Notes on how to map props during degradation |
| `childConstraint` | string | (Wizard only) Constraint on children: `"Page only"` |
| `bindNote` | string | (DataTable only) Clarification: "Binds to a repeatable group key, not a field key." |

#### Full x-lm by Component

| Component | category | level | children | bind | compatibleDataTypes | fallback | fallbackNotes |
|---|---|---|---|---|---|---|---|
| Page | layout | core | true | forbidden | -- | -- | -- |
| Stack | layout | core | true | forbidden | -- | -- | -- |
| Grid | layout | core | true | forbidden | -- | -- | -- |
| Wizard | layout | core | true | forbidden | -- | -- | -- |
| Spacer | layout | core | false | forbidden | -- | -- | -- |
| TextInput | input | core | false | required | string | -- | -- |
| NumberInput | input | core | false | required | integer, number | -- | -- |
| DatePicker | input | core | false | required | date, dateTime, time | -- | -- |
| Select | input | core | false | required | choice | -- | -- |
| CheckboxGroup | input | core | false | required | multiChoice | -- | -- |
| Toggle | input | core | false | required | boolean | -- | -- |
| FileUpload | input | core | false | required | attachment | -- | -- |
| Heading | display | core | false | forbidden | -- | -- | -- |
| Text | display | core | false | optional | -- | -- | -- |
| Divider | display | core | false | forbidden | -- | -- | -- |
| Card | container | core | true | forbidden | -- | -- | -- |
| Collapsible | container | core | true | forbidden | -- | -- | -- |
| ConditionalGroup | container | core | true | forbidden | -- | -- | -- |
| SubmitButton | display | core | false | forbidden | -- | -- | -- |
| Columns | layout | progressive | true | forbidden | -- | Grid | "columns set to child count; gap preserved." |
| Tabs | layout | progressive | true | forbidden | -- | Stack | "Each child preceded by a Heading (level 3) with tab label. All children rendered visibly." |
| Accordion | layout | progressive | true | forbidden | -- | Stack | "Each child wrapped in Collapsible. First defaults open; rest closed." |
| RadioGroup | input | progressive | false | required | choice | Select | "columns discarded." |
| MoneyInput | input | progressive | false | required | money | NumberInput | "Currency symbol rendered as prefix if bound item has prefix hint." |
| Slider | input | progressive | false | required | integer, number | NumberInput | "min, max, step preserved." |
| Rating | input | progressive | false | required | integer | NumberInput | "min: 1, max preserved, step: 1." |
| Signature | input | progressive | false | required | attachment | FileUpload | "accept set to 'image/*'." |
| Alert | display | progressive | false | forbidden | -- | Text | "Text prefixed with severity in brackets (e.g. '[Warning] ...')." |
| Badge | display | progressive | false | forbidden | -- | Text | "Same text prop." |
| ProgressBar | display | progressive | false | optional | -- | Text | "Shows '<value> / <max> (<percent>%)'." |
| Summary | display | progressive | false | forbidden | -- | Stack | "One Text per item showing '<label>: <value>'." |
| ValidationSummary | display | progressive | false | forbidden | -- | Alert | "severity + message rows shown as warning/error alerts." |
| DataTable | display | progressive | false | optional | -- | Stack | "One Card per repeat instance with child inputs." |
| Panel | container | progressive | true | forbidden | -- | Card | "title preserved; position and width discarded." |
| Modal | container | progressive | true | forbidden | -- | Collapsible | "title preserved; defaultOpen: false." |
| Popover | container | progressive | true | forbidden | -- | Collapsible | "triggerLabel mapped to title; placement discarded." |
| CustomComponentRef | custom | core | -- | -- | -- | -- | -- |

## Validation Constraints

### Component Type Discriminator

`AnyComponent` uses `oneOf` with 36 entries. Each built-in component constrains `component` to a `const` string, so the discriminator is the `component` property value. `CustomComponentRef` uses `"not": { "enum": [...all 35 built-in names...] }` to match anything not built-in.

### Inheritance via `$ref` + `unevaluatedProperties`

Each concrete component definition uses the pattern:
```json
{
  "$ref": "#/$defs/ComponentBase",
  "properties": { "component": { "const": "TypeName" }, ... },
  "unevaluatedProperties": false
}
```

The `$ref` to `ComponentBase` brings in the shared properties (`component`, `when`, `responsive`, `style`, `accessibility`, `cssClass`). `unevaluatedProperties: false` then seals each component -- only properties declared in either `ComponentBase` or the specific component definition are allowed. This prevents typos and unknown properties from silently passing validation.

### `additionalProperties: false` Locations

| Location | Effect |
|---|---|
| Top-level document | Only declared properties + `^x-` extensions allowed |
| `TargetDefinition` | Only `url` and `compatibleVersions` |
| `AccessibilityBlock` | Only `role`, `description`, `liveRegion` |
| `CustomComponentDef` | Only `params` and `tree` |
| `components` object | Only PascalCase keys (`^[A-Z][a-zA-Z0-9]*$`) |
| `CustomComponentRef.params` | Values must be strings |
| `Summary.items[*]` | Only `label`, `bind`, `optionSet` |
| `DataTable.columns[*]` | Only `header`, `bind`, `min`, `max`, `step` |

### `unevaluatedProperties: false` Locations

All 36 concrete component definitions use this to seal allowed properties after `$ref` inheritance from `ComponentBase`.

### Notable Type Constraints

| Constraint | Location | Details |
|---|---|---|
| `const: "1.0"` | `$formspecComponent` | Pins schema version |
| `minLength: 1` | `version`, `ComponentBase.component` | Non-empty strings required |
| `minimum: 0` | Breakpoints values, Heading.level, Tabs.defaultTab, Accordion.defaultOpen | Non-negative integers |
| `minimum: 1` | Grid.columns (integer), Heading.level, CheckboxGroup.columns, RadioGroup.columns, Rating.max | Positive integers |
| `maximum: 6` | Heading.level | HTML heading range |
| `format: "uri"` | `url`, `TargetDefinition.url` | URI validation |
| `oneOf: [string, number]` | Stack.gap, Grid.gap, Grid.rowGap, Columns.gap, Spacer.size, Signature.height, Panel.width | Flexible sizing (CSS string or pixel number) |
| `oneOf: [string, integer]` | Grid.columns | Column count or CSS grid-template-columns |
| `oneOf: [string, array]` | ComponentBase.cssClass | Single class or class array |
| Pattern: `^[A-Z][a-zA-Z0-9]*$` | `components` keys | PascalCase enforcement for custom component names |
| Pattern: `^x-` | Top-level `patternProperties` | Extension namespace |
| `not: { enum: [...] }` | CustomComponentRef.component | Excludes all 35 built-in names |

### Wizard Child Constraint

The Wizard component annotates via `x-lm.childConstraint: "Page only"` that each child MUST be a Page component, but this is a semantic constraint -- it is not enforced structurally in the schema (children use the generic `ChildrenArray` type).

### Default Values

| Property | Default |
|---|---|
| `Stack.direction` | `"vertical"` |
| `TextInput.maxLines` | `1` |
| `Tabs.position` | `"top"` |
| `Panel.position` | `"left"` |
| `Popover.placement` | `"bottom"` |
| `SubmitButton.disableWhenPending` | `true` |
| `ValidationSummary.source` | `"live"` |
| `ValidationSummary.mode` | `"continuous"` |
| `ValidationSummary.showFieldErrors` | `false` |
| `ValidationSummary.jumpLinks` | `false` |
| `ValidationSummary.dedupe` | `true` |
