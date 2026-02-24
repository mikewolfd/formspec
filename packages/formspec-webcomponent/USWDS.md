# USWDS Integration Guide

This package already supports most of what you need to integrate USWDS through the Formspec theming model.

## Supported integration hooks

1. `theme.stylesheets`
- The renderer loads external CSS from the theme document.
- Stylesheet usage is reference-counted across multiple `<formspec-render>` instances.

2. `PresentationBlock.cssClass`
- Theme cascade (`defaults -> selectors -> items`) can add classes to rendered item roots.
- Classes are merged (union), not replaced.

3. `PresentationBlock.widgetConfig["x-classes"]` (renderer extension)
- For field rendering, this renderer supports slot classes:
  - `root`
  - `label`
  - `control` (alias: `input`)
  - `hint`
  - `error`
- This is useful for USWDS classes that must be applied to specific elements.

Example:

```json
{
  "defaults": {
    "widgetConfig": {
      "x-classes": {
        "root": "usa-form-group",
        "label": "usa-label",
        "control": "usa-input",
        "hint": "usa-hint",
        "error": "usa-error-message"
      }
    }
  }
}
```

## Quick start

1. Host USWDS CSS and the bridge stylesheet:
- `examples/formspec-uswds-bridge.css`

2. Start from:
- `examples/uswds-theme.json`

3. Apply to the webcomponent:

```ts
import { FormspecRender } from 'formspec-webcomponent';
import theme from './uswds-theme.json';

const el = document.querySelector('formspec-render') as FormspecRender;
el.themeDocument = theme as any;
```

## Notes

- Keep renderer structural classes (`formspec-*`) in place; add USWDS classes through theme cascade.
- Prefer tokenized class names (for example `$token.uswds.input`) if you want easy cross-theme remapping.
- USWDS patterns that require exact markup structure may still need small bridge CSS adjustments.
