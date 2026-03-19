/** @filedesc USWDS integration CSS exported as a string for runtime injection. */

/**
 * CSS overrides that resolve conflicts between formspec layout primitives
 * and USWDS component expectations. Injected into the document head when
 * the USWDS adapter is activated.
 *
 * TODO: Replace this string export + CDN stylesheet with a trimmed Sass
 * build using USWDS component-level partials (@use 'uswds-core' + only
 * the components the adapter uses). This would eliminate the 400KB CDN
 * dependency, remove most integration overrides, and let us share
 * design tokens between the adapter and its styles.
 */
export const integrationCSS = `\
/* USWDS integration overrides for formspec layout primitives */

.formspec-grid .usa-form-group,
.formspec-stack .usa-form-group { margin-top: 0; }

.formspec-grid .usa-input,
.formspec-grid .usa-textarea,
.formspec-grid .usa-select { max-width: 100%; }

.formspec-container .usa-fieldset { border: 0; padding: 0; margin: 0; }
.formspec-container .usa-label { margin-top: 0; }
.formspec-container .usa-hint { margin-top: 0; }

.formspec-wizard .usa-step-indicator__heading { font-size: 1rem; }
.formspec-wizard .usa-step-indicator__current-step {
  width: 2rem; height: 2rem; padding: 0;
  font-size: 0.875rem; line-height: 2rem;
}
.formspec-wizard .usa-step-indicator__heading-text { font-weight: 600; }
`;
