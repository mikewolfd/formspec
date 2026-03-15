/**
 * @module formspec-core
 *
 * Raw form project state management: command dispatch, handler pipeline,
 * undo/redo, and the IProjectCore abstraction.
 *
 * For the behavior-driven authoring API, use formspec-studio-core.
 */

export type { IProjectCore } from './project-core.js';
export { RawProject, createRawProject } from './raw-project.js';
export { resolveItemLocation } from './handlers/helpers.js';
export { normalizeDefinition } from './normalization.js';
export { resolveThemeCascade } from './theme-cascade.js';
export type { ResolvedProperty } from './theme-cascade.js';
export { resolvePageStructure } from './page-resolution.js';
export type { ResolvedPageStructure, ResolvedPage, ResolvedRegion, PageDiagnostic } from './page-resolution.js';
export type {
  ProjectState,
  ProjectOptions,
  Command,
  AnyCommand,
  CommandResult,
  ChangeListener,
  ChangeEvent,
  LogEntry,
  Middleware,
  ProjectBundle,
  ProjectStatistics,
  FormspecComponentDocument,
  FormspecGeneratedLayoutDocument,
  FormspecThemeDocument,
  FormspecMappingDocument,
  ExtensionsState,
  VersioningState,
  ItemFilter,
  DataTypeInfo,
  RegistrySummary,
  ExtensionFilter,
  Change,
  FormspecChangelog,
  FELParseContext,
  FELMappingContext,
  FELParseResult,
  FELReferenceSet,
  FELFunctionEntry,
  ExpressionLocation,
  DependencyGraph,
  FieldDependents,
  Diagnostic,
  Diagnostics,
  ResponseSchemaRow,
} from './types.js';
