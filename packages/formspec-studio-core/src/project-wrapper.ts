import { RawProject, createRawProject } from './raw-project.js';
import type {
  ProjectOptions,
  ProjectState,
  ChangeListener,
  ProjectBundle,
  Diagnostics,
  ProjectStatistics,
  FieldDependents,
  ExpressionLocation,
  FELParseContext,
  FELParseResult,
} from './types.js';
import type { FormspecItem } from 'formspec-engine';

/**
 * Behavior-driven interface for form authoring.
 * Wraps RawProject via composition, adding form-author-friendly methods.
 * All authoring methods return HelperResult.
 */
export class Project {
  readonly raw: RawProject;

  constructor(options?: ProjectOptions) {
    this.raw = createRawProject(options);
  }

  // ── Proxied from raw (read / subscribe / export) ──

  get state(): Readonly<ProjectState> { return this.raw.state; }
  get definition() { return this.raw.definition; }
  get component() { return this.raw.component; }
  get theme() { return this.raw.theme; }
  get mapping() { return this.raw.mapping; }

  fieldPaths(): string[] { return this.raw.fieldPaths(); }
  itemAt(path: string): FormspecItem | undefined { return this.raw.itemAt(path); }
  diagnose(): Diagnostics { return this.raw.diagnose(); }
  statistics(): ProjectStatistics { return this.raw.statistics(); }
  bindFor(path: string) { return this.raw.bindFor(path); }
  componentFor(fieldKey: string) { return this.raw.componentFor(fieldKey); }
  parseFEL(expression: string, context?: FELParseContext): FELParseResult {
    return this.raw.parseFEL(expression, context);
  }
  fieldDependents(path: string): FieldDependents { return this.raw.fieldDependents(path); }
  allExpressions(): ExpressionLocation[] { return this.raw.allExpressions(); }
  variableNames(): string[] { return this.raw.variableNames(); }
  instanceNames(): string[] { return this.raw.instanceNames(); }

  undo(): boolean { return this.raw.undo(); }
  redo(): boolean { return this.raw.redo(); }
  get canUndo(): boolean { return this.raw.canUndo; }
  get canRedo(): boolean { return this.raw.canRedo; }

  onChange(listener: ChangeListener): () => void { return this.raw.onChange(listener); }
  export(): ProjectBundle { return this.raw.export(); }

  // ── Authoring methods ──
  // Added incrementally in subsequent tasks.
}

export function createProject(options?: ProjectOptions): Project {
  return new Project(options);
}
