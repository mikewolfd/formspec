/** @filedesc Thin Studio wrapper around core-owned FEL editor helpers. */

export {
  buildFELHighlightTokens,
  filterFELFieldOptions,
  filterFELFunctionOptions,
  getFELAutocompleteTrigger,
  getFELFunctionAutocompleteTrigger,
  getFELInstanceNameAutocompleteTrigger,
  getInstanceFieldOptions,
  getInstanceNameOptions,
  validateFEL,
} from '../../../formspec-studio-core/src/fel-editor-utils';

export type {
  FELAutocompleteTrigger,
  FELEditorFieldOption,
  FELEditorFunctionOption,
  FELHighlightToken,
} from '../../../formspec-studio-core/src/fel-editor-utils';
