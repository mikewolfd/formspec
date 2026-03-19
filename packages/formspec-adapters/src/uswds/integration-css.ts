/** @filedesc USWDS integration CSS exported as a string for runtime injection. */

/**
 * CSS overrides that resolve conflicts between formspec layout primitives
 * and USWDS component expectations. Injected into the document head when
 * the USWDS adapter is activated.
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
`;
