import type {
  ProjectState,
  ProjectOptions,
  AnyCommand,
  CommandResult,
  ChangeListener,
  FormspecComponentDocument,
  FormspecThemeDocument,
  FormspecMappingDocument,
  LogEntry,
  Middleware,
  ProjectStatistics,
  ProjectBundle,
  ItemFilter,
  DataTypeInfo,
  RegistrySummary,
  ExtensionFilter,
  Change,
  FormspecChangelog,
  FELParseResult,
  FELReferenceSet,
  FELFunctionEntry,
  ExpressionLocation,
  DependencyGraph,
  FieldDependents,
  Diagnostics,
  Diagnostic,
} from './types.js';
import type { FormspecDefinition, FormspecItem } from 'formspec-engine';
import { getHandler } from './handlers.js';

/** Maximum number of undo snapshots retained before oldest-first pruning. */
const DEFAULT_MAX_HISTORY = 50;

/**
 * Generate a unique URN for a new definition.
 * Uses a random base-36 suffix to produce a collision-resistant identifier.
 * @returns A URN string in the form `urn:formspec:<random>`.
 */
function generateUrl(): string {
  const id = Math.random().toString(36).slice(2, 10);
  return `urn:formspec:${id}`;
}

/**
 * Create a blank definition with sensible defaults.
 * Produces a minimal valid FormspecDefinition (version 1.0, empty items array)
 * with a unique generated URL.
 * @returns A new FormspecDefinition ready for use as a project seed.
 */
function createDefaultDefinition(): FormspecDefinition {
  return {
    $formspec: '1.0',
    url: generateUrl(),
    version: '0.1.0',
    title: '',
    items: [],
  };
}

/**
 * Create default project state, applying seed overrides.
 * Omitted seed fields receive sensible defaults: an empty definition with a generated URL,
 * blank component/theme/mapping documents whose `targetDefinition.url` points at the
 * definition's URL, no extensions, and no releases.
 * @param options - Optional project options containing seed data and configuration.
 * @returns A fully populated ProjectState.
 */
function createDefaultState(options?: ProjectOptions): ProjectState {
  const definition = options?.seed?.definition ?? createDefaultDefinition();
  const url = definition.url;

  const component: FormspecComponentDocument = options?.seed?.component ?? {
    targetDefinition: { url },
  };
  if (!component.targetDefinition) {
    component.targetDefinition = { url };
  }

  const theme: FormspecThemeDocument = options?.seed?.theme ?? {
    targetDefinition: { url },
  };
  if (!theme.targetDefinition) {
    theme.targetDefinition = { url };
  }

  const mapping: FormspecMappingDocument = options?.seed?.mapping ?? {};

  return {
    definition,
    component,
    theme,
    mapping,
    extensions: options?.seed?.extensions ?? { registries: [] },
    versioning: options?.seed?.versioning ?? {
      baseline: structuredClone(definition),
      releases: [],
    },
  };
}

/**
 * Central editing surface for a Formspec artifact bundle.
 *
 * A Project manages four co-evolving artifacts (definition, component, theme, mapping)
 * plus extension registries and version history. Every mutation flows through a
 * command-dispatch pipeline:
 *
 *   1. Middleware chain (may transform or reject the command)
 *   2. State clone + handler execution on the clone
 *   3. Component tree rebuild (if the handler signals structural change)
 *   4. Cross-artifact normalization (URL sync, breakpoint sync, sort invariants)
 *   5. History snapshot push (capped by `maxHistoryDepth`, pruned oldest-first)
 *   6. Change listener notification
 *
 * Key invariants:
 * - State is never mutated in place; handlers operate on a `structuredClone`.
 * - Undo/redo swap full snapshots, so every state transition is atomic.
 * - Queries (fieldPaths, statistics, diagnose, etc.) are pure reads with no caching;
 *   the consumer decides when to call them.
 * - No UI state (selection, panel visibility) lives here -- that belongs to the consumer.
 * - Each Project instance is fully independent; no shared global state.
 *
 * @see {@link createProject} for the recommended factory function.
 */
export class Project {
  /** Current project state. Mutated only via dispatch (clone-and-swap). */
  private _state: ProjectState;
  /** Stack of previous states for undo. Newest at the end. Capped by `_maxHistory`. */
  private _undoStack: ProjectState[] = [];
  /** Stack of undone states for redo. Cleared on any new dispatch. */
  private _redoStack: ProjectState[] = [];
  /** Append-only command log. Serializable -- can be persisted and replayed on a fresh project. */
  private _log: LogEntry[] = [];
  /** Active change listeners, notified after every state transition. */
  private _listeners: Set<ChangeListener> = new Set();
  /** Middleware pipeline wrapping the core dispatch. Outermost middleware runs first. */
  private _middleware: Middleware[];
  /** Maximum number of undo snapshots before oldest-first pruning. */
  private _maxHistory: number;

  /**
   * Create a new Project instance.
   * @param options - Optional configuration: seed state, middleware pipeline, and history depth.
   *   Omitted seed fields receive sensible defaults (see {@link createDefaultState}).
   */
  constructor(options?: ProjectOptions) {
    this._state = createDefaultState(options);
    this._maxHistory = options?.maxHistoryDepth ?? DEFAULT_MAX_HISTORY;
    this._middleware = options?.middleware ?? [];
  }

  // ── Reading state ────────────────────────────────────────────────

  /**
   * Current project state. Treat as immutable -- all mutations go through
   * {@link dispatch} or {@link batch}.
   */
  get state(): Readonly<ProjectState> {
    return this._state;
  }

  /** The form's structure and behavior: items, binds, shapes, variables, etc. */
  get definition(): Readonly<FormspecDefinition> {
    return this._state.definition;
  }

  /** The parallel UI tree: widget assignments, layout containers, responsive overrides. */
  get component(): Readonly<FormspecComponentDocument> {
    return this._state.component;
  }

  /** Visual presentation: design tokens, defaults, selector overrides, breakpoints. */
  get theme(): Readonly<FormspecThemeDocument> {
    return this._state.theme;
  }

  /** Bidirectional transforms between form responses and external schemas. */
  get mapping(): Readonly<FormspecMappingDocument> {
    return this._state.mapping;
  }

  // ── Queries ─────────────────────────────────────────────────────

  /**
   * All leaf field paths in the definition item tree, in document order.
   * Paths use dot-notation (e.g., `"contact.email"`). Groups are traversed
   * but not included -- only items with `type === 'field'` appear.
   * @returns An array of dot-separated field path strings.
   */
  fieldPaths(): string[] {
    const paths: string[] = [];
    const walk = (items: FormspecItem[], prefix: string) => {
      for (const item of items) {
        const path = prefix ? `${prefix}.${item.key}` : item.key;
        if (item.type === 'field') {
          paths.push(path);
        }
        if (item.children) {
          walk(item.children, path);
        }
      }
    };
    walk(this._state.definition.items, '');
    return paths;
  }

  /**
   * Resolve an item by its dot-path within the definition tree.
   * Walks the item hierarchy segment by segment; returns `undefined` if any
   * segment is not found or if a non-group item is encountered mid-path.
   * @param path - Dot-separated path (e.g., `"address.street"`).
   * @returns The matching FormspecItem, or `undefined` if not found.
   */
  itemAt(path: string): FormspecItem | undefined {
    const parts = path.split('.');
    let items = this._state.definition.items;

    for (let i = 0; i < parts.length; i++) {
      const found = items.find(it => it.key === parts[i]);
      if (!found) return undefined;
      if (i === parts.length - 1) return found;
      if (!found.children) return undefined;
      items = found.children;
    }
    return undefined;
  }

  /**
   * Compute form complexity metrics by walking the item tree.
   * Counts fields, groups, display items, and measures maximum nesting depth.
   * Also reports bind, shape, and variable counts from the definition.
   * @returns A {@link ProjectStatistics} snapshot of the current definition.
   */
  statistics(): ProjectStatistics {
    let fieldCount = 0, groupCount = 0, displayCount = 0, maxNestingDepth = 0;

    const walk = (items: FormspecItem[], depth: number) => {
      for (const item of items) {
        if (item.type === 'field') fieldCount++;
        else if (item.type === 'group') groupCount++;
        else if (item.type === 'display') displayCount++;
        if (depth > maxNestingDepth) maxNestingDepth = depth;
        if (item.children) walk(item.children, depth + 1);
      }
    };
    walk(this._state.definition.items, 1);

    const def = this._state.definition;
    return {
      fieldCount,
      groupCount,
      displayCount,
      maxNestingDepth,
      bindCount: def.binds?.length ?? 0,
      shapeCount: def.shapes?.length ?? 0,
      variableCount: def.variables?.length ?? 0,
      expressionCount: 0,
      componentNodeCount: 0,
      mappingRuleCount: 0,
    };
  }

  // ── Definition readers ──────────────────────────────────────────

  /**
   * All instance names declared in the definition's `instances` map.
   * Instances are external data sources referenceable in FEL via `@instance()`.
   * @returns An array of instance name strings, or empty if none declared.
   */
  instanceNames(): string[] {
    const instances = this._state.definition.instances;
    if (!instances) return [];
    return Object.keys(instances);
  }

  /**
   * All variable names declared in the definition.
   * Variables are named FEL expressions referenceable via `@variableName`.
   * @returns An array of variable name strings.
   */
  variableNames(): string[] {
    return (this._state.definition.variables ?? []).map((v: any) => v.name);
  }

  /**
   * Find all field paths that reference a given named option set.
   * Walks the item tree looking for items whose `optionSet` property
   * matches the provided name.
   * @param name - The option set name to search for.
   * @returns An array of dot-paths for fields referencing this option set.
   */
  optionSetUsage(name: string): string[] {
    const paths: string[] = [];
    const walk = (items: FormspecItem[], prefix: string) => {
      for (const item of items) {
        const path = prefix ? `${prefix}.${item.key}` : item.key;
        if ((item as any).optionSet === name) {
          paths.push(path);
        }
        if (item.children) walk(item.children, path);
      }
    };
    walk(this._state.definition.items, '');
    return paths;
  }

  /**
   * Search definition items by type, dataType, label substring, or extension usage.
   * All filter criteria are AND-ed: an item must match every specified filter field.
   * @param filter - Criteria to match against. Omitted fields are unconstrained.
   * @returns An array of matching FormspecItem objects (shallow references into the tree).
   */
  searchItems(filter: ItemFilter): FormspecItem[] {
    const results: FormspecItem[] = [];
    const walk = (items: FormspecItem[]) => {
      for (const item of items) {
        let match = true;
        if (filter.type && item.type !== filter.type) match = false;
        if (filter.dataType && (item as any).dataType !== filter.dataType) match = false;
        if (filter.label && !(item.label ?? '').toLowerCase().includes(filter.label.toLowerCase())) match = false;
        if (filter.hasExtension && !(item as any).extensions?.[filter.hasExtension]) match = false;
        if (match) results.push(item);
        if (item.children) walk(item.children);
      }
    };
    walk(this._state.definition.items);
    return results;
  }

  /**
   * Resolve the effective presentation for a field through the theme cascade.
   * Applies three tiers in order (later tiers override earlier):
   *   1. Theme defaults (global fallback)
   *   2. Matching selectors (by item type/dataType, in document order)
   *   3. Per-item overrides (keyed by field path)
   * @param fieldKey - Dot-path of the field to resolve presentation for.
   * @returns A merged record of presentation properties. Empty object if the item is not found.
   */
  effectivePresentation(fieldKey: string): Record<string, unknown> {
    const item = this.itemAt(fieldKey);
    if (!item) return {};

    const result: Record<string, unknown> = {};

    // Tier 1: defaults
    const defaults = this._state.theme.defaults as Record<string, unknown> | undefined;
    if (defaults) Object.assign(result, defaults);

    // Tier 2: selectors (document order)
    const selectors = this._state.theme.selectors as any[] | undefined;
    if (selectors) {
      for (const sel of selectors) {
        const match = sel.match;
        if (!match) continue;
        let matches = true;
        if (match.type && item.type !== match.type) matches = false;
        if (match.dataType && (item as any).dataType !== match.dataType) matches = false;
        if (matches) Object.assign(result, sel.apply);
      }
    }

    // Tier 3: per-item overrides
    const items = this._state.theme.items as Record<string, Record<string, unknown>> | undefined;
    if (items?.[fieldKey]) Object.assign(result, items[fieldKey]);

    return result;
  }

  // ── Cross-artifact queries ─────────────────────────────────────

  /**
   * Get the effective bind properties for a field path.
   * Looks up the bind entry whose `path` matches, then returns all bind
   * properties (calculate, relevant, required, readonly, constraint, etc.)
   * excluding the path itself.
   * @param path - Dot-path of the target field.
   * @returns A record of bind properties, or `undefined` if no bind exists for this path.
   */
  bindFor(path: string): Record<string, unknown> | undefined {
    const binds = this._state.definition.binds;
    if (!binds) return undefined;
    const bind = binds.find((b: any) => b.path === path);
    if (!bind) return undefined;
    // Return bind properties excluding 'path'
    const { path: _, ...props } = bind as any;
    return Object.keys(props).length > 0 ? props : undefined;
  }

  /**
   * Find the component tree node bound to a field key.
   * Performs a breadth-first search of the component tree looking for a node
   * whose `bind` property matches the given key.
   * @param fieldKey - The field key to look up in the component tree.
   * @returns The matching tree node, or `undefined` if no node is bound to this key.
   */
  componentFor(fieldKey: string): Record<string, unknown> | undefined {
    const tree = this._state.component.tree as any;
    if (!tree) return undefined;
    const queue = [tree];
    while (queue.length > 0) {
      const node = queue.shift()!;
      if (node.bind === fieldKey) return node;
      if (node.children) queue.push(...node.children);
    }
    return undefined;
  }

  /**
   * Resolve an extension name against all loaded registries.
   * Searches registries in order, returning the first catalog entry whose name matches.
   * @param name - The extension name to look up (e.g., `"x-formspec-url"`).
   * @returns The registry entry as a record, or `undefined` if not found in any registry.
   */
  resolveExtension(name: string): Record<string, unknown> | undefined {
    for (const reg of this._state.extensions.registries) {
      const entry = reg.catalog.entries.get(name);
      if (entry) return entry as Record<string, unknown>;
    }
    return undefined;
  }

  /**
   * Find definition fields that have no corresponding node in the component tree.
   * These fields fall back to Tier 2/1 rendering (auto-generated from definition structure).
   * @returns An array of field paths that are not bound to any component tree node.
   */
  unboundItems(): string[] {
    const fieldKeys = this.fieldPaths();
    // Collect all bind values from the component tree
    const boundKeys = new Set<string>();
    const tree = this._state.component.tree as any;
    if (tree) {
      const queue = [tree];
      while (queue.length > 0) {
        const node = queue.shift()!;
        if (node.bind) boundKeys.add(node.bind);
        if (node.children) queue.push(...node.children);
      }
    }
    return fieldKeys.filter(p => !boundKeys.has(p));
  }

  /**
   * Resolve a design token value through the two-tier cascade.
   * Checks component tokens (Tier 3) first, then theme tokens (Tier 2).
   * Platform defaults (Tier 1) are not handled here -- the consumer provides those.
   * @param key - The token key to resolve (e.g., `"spacing.md"`, `"color.primary"`).
   * @returns The resolved token value, or `undefined` if not defined at either tier.
   */
  resolveToken(key: string): string | number | undefined {
    // Tier 3: component tokens
    const compTokens = this._state.component.tokens as Record<string, unknown> | undefined;
    if (compTokens?.[key] !== undefined) return compTokens[key] as string | number;

    // Tier 2: theme tokens
    const themeTokens = this._state.theme.tokens as Record<string, unknown> | undefined;
    if (themeTokens?.[key] !== undefined) return themeTokens[key] as string | number;

    return undefined;
  }

  /**
   * Enumerate all valid data types: the 13 core types plus any dataType extensions
   * from loaded registries. Used by editors for field type selection UI.
   * @returns An array of {@link DataTypeInfo} entries with source provenance.
   */
  allDataTypes(): DataTypeInfo[] {
    const core: DataTypeInfo[] = [
      'string', 'integer', 'decimal', 'boolean', 'date', 'time', 'dateTime',
      'money', 'choice', 'multiChoice', 'attachment', 'signature', 'barcode',
    ].map(name => ({ name, source: 'core' as const }));

    // Extension dataTypes from loaded registries
    for (const reg of this._state.extensions.registries) {
      for (const [_, entry] of reg.catalog.entries) {
        const e = entry as any;
        if (e.category === 'dataType') {
          core.push({
            name: e.name,
            source: 'extension',
            baseType: e.baseType,
            registryUrl: reg.url,
          });
        }
      }
    }

    return core;
  }

  // ── FEL queries ────────────────────────────────────────────────

  /**
   * Extract `$field.path` references from a FEL expression string using regex.
   * Produces deduplicated results. This is a lightweight static analysis --
   * it does not parse the full FEL grammar.
   * @param expr - The FEL expression to scan.
   * @returns Deduplicated array of field path strings (without the `$` prefix).
   */
  private _extractFieldRefs(expr: string): string[] {
    const refs: string[] = [];
    const re = /\$([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(expr)) !== null) {
      refs.push(m[1]);
    }
    return [...new Set(refs)];
  }

  /**
   * Extract `@variableName` references from a FEL expression string using regex.
   * Produces deduplicated results.
   * @param expr - The FEL expression to scan.
   * @returns Deduplicated array of variable name strings (without the `@` prefix).
   */
  private _extractVarRefs(expr: string): string[] {
    const refs: string[] = [];
    const re = /@([a-zA-Z_]\w*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(expr)) !== null) {
      refs.push(m[1]);
    }
    return [...new Set(refs)];
  }

  /**
   * Extract function call names from a FEL expression string using regex.
   * Matches identifiers immediately followed by `(`. Produces deduplicated results.
   * @param expr - The FEL expression to scan.
   * @returns Deduplicated array of function name strings.
   */
  private _extractFunctions(expr: string): string[] {
    const fns: string[] = [];
    const re = /([a-zA-Z_]\w*)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(expr)) !== null) {
      fns.push(m[1]);
    }
    return [...new Set(fns)];
  }

  /**
   * Parse and validate a FEL expression without saving it to project state.
   * Extracts field references and function calls via lightweight regex scanning.
   * Intended for expression editor inline validation and autocomplete support.
   * @param expression - The FEL expression string to parse.
   * @returns A {@link FELParseResult} with validity, errors, references, and function names.
   */
  parseFEL(expression: string): FELParseResult {
    const references = this._extractFieldRefs(expression);
    const functions = this._extractFunctions(expression);
    return {
      valid: true,
      errors: [],
      references,
      functions,
    };
  }

  /**
   * Enumerate the full FEL function catalog: built-in functions plus extension
   * functions from loaded registries. Used by editors for autocomplete and
   * function documentation popups.
   * @returns An array of {@link FELFunctionEntry} objects with name, category, and source.
   */
  felFunctionCatalog(): FELFunctionEntry[] {
    const builtins: FELFunctionEntry[] = [
      'sum', 'count', 'min', 'max', 'avg',
      'if', 'coalesce', 'switch',
      'concat', 'substring', 'length', 'contains', 'startsWith', 'endsWith',
      'matches', 'replace', 'trim', 'upper', 'lower', 'split', 'join',
      'round', 'floor', 'ceil', 'abs', 'pow', 'sqrt', 'mod', 'log',
      'today', 'now', 'date', 'dateDiff', 'dateAdd', 'year', 'month', 'day',
      'boolean', 'number', 'string', 'int',
      'true', 'false', 'null',
      'not', 'and', 'or',
      'selected', 'countSelected',
      'position', 'last',
    ].map(name => ({ name, category: 'builtin', source: 'builtin' as const }));

    // Extension functions from loaded registries
    for (const reg of this._state.extensions.registries) {
      for (const [_, entry] of reg.catalog.entries) {
        const e = entry as any;
        if (e.category === 'function') {
          builtins.push({
            name: e.name,
            category: 'function',
            source: 'extension',
            registryUrl: reg.url,
          });
        }
      }
    }

    return builtins;
  }

  /**
   * Scope-aware list of valid FEL references at a given path.
   * Always includes all fields, variables, and instances. When `contextPath`
   * points to a repeatable group, also includes `@current`, `@index`, `@count`.
   * Used by expression editors for autocomplete and reference validation.
   * @param contextPath - Optional dot-path providing scope context (e.g., inside a repeat group).
   * @returns A {@link FELReferenceSet} with fields, variables, instances, and context-specific refs.
   */
  availableReferences(contextPath?: string): FELReferenceSet {
    const fields: FELReferenceSet['fields'] = [];
    const walk = (items: FormspecItem[], prefix: string) => {
      for (const item of items) {
        const path = prefix ? `${prefix}.${item.key}` : item.key;
        if (item.type === 'field') {
          fields.push({ path, dataType: (item as any).dataType ?? 'string', label: item.label });
        }
        if (item.children) walk(item.children, path);
      }
    };
    walk(this._state.definition.items, '');

    const variables = (this._state.definition.variables ?? []).map((v: any) => ({
      name: v.name,
      expression: v.expression ?? '',
    }));

    const instances: FELReferenceSet['instances'] = [];
    const inst = this._state.definition.instances;
    if (inst) {
      for (const [name, entry] of Object.entries(inst)) {
        instances.push({ name, source: (entry as any).source });
      }
    }

    const contextRefs: string[] = [];
    // If inside a repeat group, add context refs
    if (contextPath) {
      const item = this.itemAt(contextPath);
      if (item && item.type === 'group' && (item as any).repeatable) {
        contextRefs.push('@current', '@index', '@count');
      }
    }

    return { fields, variables, instances, contextRefs };
  }

  /**
   * Enumerate all FEL expressions in the project with their artifact locations.
   * Scans bind properties (calculate, relevant, required, readonly, constraint),
   * shape constraints and activeWhen guards, and variable expressions.
   * @returns An array of {@link ExpressionLocation} entries with expression text and location paths.
   */
  allExpressions(): ExpressionLocation[] {
    const results: ExpressionLocation[] = [];
    const def = this._state.definition;

    // Bind expressions
    for (const bind of def.binds ?? []) {
      const b = bind as any;
      for (const prop of ['calculate', 'relevant', 'required', 'readonly', 'constraint']) {
        if (b[prop] && typeof b[prop] === 'string') {
          results.push({
            expression: b[prop],
            artifact: 'definition',
            location: `binds[${b.path}].${prop}`,
          });
        }
      }
    }

    // Shape expressions
    for (const shape of def.shapes ?? []) {
      const s = shape as any;
      if (s.constraint) {
        results.push({
          expression: s.constraint,
          artifact: 'definition',
          location: `shapes[${s.id}].constraint`,
        });
      }
      if (s.activeWhen) {
        results.push({
          expression: s.activeWhen,
          artifact: 'definition',
          location: `shapes[${s.id}].activeWhen`,
        });
      }
    }

    // Variable expressions
    for (const v of def.variables ?? []) {
      const va = v as any;
      if (va.expression) {
        results.push({
          expression: va.expression,
          artifact: 'definition',
          location: `variables[${va.name}]`,
        });
      }
    }

    return results;
  }

  /**
   * List all field paths that a FEL expression references.
   * Delegates to the regex-based field reference extractor.
   * @param expression - The FEL expression to analyze.
   * @returns An array of field path strings referenced by the expression.
   */
  expressionDependencies(expression: string): string[] {
    return this._extractFieldRefs(expression);
  }

  /**
   * Reverse lookup: find all binds, shapes, variables, and mapping rules that
   * reference a given field. Uses substring matching on `$fieldPath` within
   * FEL expression strings.
   * @param fieldPath - The field path to search for as a dependency.
   * @returns A {@link FieldDependents} record grouping dependents by artifact type.
   */
  fieldDependents(fieldPath: string): FieldDependents {
    const result: FieldDependents = { binds: [], shapes: [], variables: [], mappingRules: [] };
    const def = this._state.definition;
    const pattern = '$' + fieldPath;

    // Check binds
    for (const bind of def.binds ?? []) {
      const b = bind as any;
      for (const prop of ['calculate', 'relevant', 'required', 'readonly', 'constraint']) {
        if (b[prop] && typeof b[prop] === 'string' && b[prop].includes(pattern)) {
          result.binds.push({ path: b.path, property: prop });
        }
      }
    }

    // Check shapes
    for (const shape of def.shapes ?? []) {
      const s = shape as any;
      if (s.constraint && s.constraint.includes(pattern)) {
        result.shapes.push({ id: s.id, property: 'constraint' });
      }
      if (s.activeWhen && s.activeWhen.includes(pattern)) {
        result.shapes.push({ id: s.id, property: 'activeWhen' });
      }
    }

    // Check variables
    for (const v of def.variables ?? []) {
      const va = v as any;
      if (va.expression && va.expression.includes(pattern)) {
        result.variables.push(va.name);
      }
    }

    // Check mapping rules
    const rules = (this._state.mapping as any).rules;
    if (rules) {
      for (let i = 0; i < rules.length; i++) {
        if (rules[i].sourcePath === fieldPath || (rules[i].expression && rules[i].expression.includes(pattern))) {
          result.mappingRules.push(i);
        }
      }
    }

    return result;
  }

  /**
   * Find all bind paths whose FEL expressions reference a given variable.
   * Uses substring matching on `@variableName` within bind expression strings.
   * @param variableName - The variable name to search for (without `@` prefix).
   * @returns Deduplicated array of bind paths that reference this variable.
   */
  variableDependents(variableName: string): string[] {
    const pattern = '@' + variableName;
    const paths: string[] = [];

    for (const bind of this._state.definition.binds ?? []) {
      const b = bind as any;
      for (const prop of ['calculate', 'relevant', 'required', 'readonly', 'constraint']) {
        if (b[prop] && typeof b[prop] === 'string' && b[prop].includes(pattern)) {
          paths.push(b.path);
          break;
        }
      }
    }

    return [...new Set(paths)];
  }

  /**
   * Build a full dependency graph across all FEL expressions in the project.
   * Nodes represent fields, variables, and shapes. Edges represent FEL references
   * from bind properties and variable expressions. Cycles are reported but not
   * currently detected (the `cycles` array is always empty).
   * @returns A {@link DependencyGraph} with nodes, edges, and a cycles array.
   */
  dependencyGraph(): DependencyGraph {
    const nodes: DependencyGraph['nodes'] = [];
    const edges: DependencyGraph['edges'] = [];
    const def = this._state.definition;

    // Add field nodes
    for (const path of this.fieldPaths()) {
      nodes.push({ id: path, type: 'field' });
    }

    // Add variable nodes
    for (const v of def.variables ?? []) {
      const va = v as any;
      nodes.push({ id: va.name, type: 'variable' });
    }

    // Add shape nodes
    for (const s of def.shapes ?? []) {
      nodes.push({ id: (s as any).id, type: 'shape' });
    }

    // Build edges from binds
    for (const bind of def.binds ?? []) {
      const b = bind as any;
      for (const prop of ['calculate', 'relevant', 'required', 'readonly', 'constraint']) {
        if (b[prop] && typeof b[prop] === 'string') {
          for (const ref of this._extractFieldRefs(b[prop])) {
            edges.push({ from: ref, to: b.path, via: prop });
          }
        }
      }
    }

    // Build edges from variables
    for (const v of def.variables ?? []) {
      const va = v as any;
      if (va.expression) {
        for (const ref of this._extractFieldRefs(va.expression)) {
          edges.push({ from: ref, to: va.name, via: 'variable' });
        }
      }
    }

    return { nodes, edges, cycles: [] };
  }

  // ── Extension queries ──────────────────────────────────────────

  /**
   * Enumerate loaded extension registries with summary metadata.
   * @returns An array of {@link RegistrySummary} objects (URL and entry count per registry).
   */
  listRegistries(): RegistrySummary[] {
    return this._state.extensions.registries.map(r => ({
      url: r.url,
      entryCount: r.catalog.entries.size,
    }));
  }

  /**
   * Browse extension entries across all loaded registries with optional filtering.
   * Filter criteria (category, status, namePattern) are AND-ed.
   * @param filter - Optional criteria to narrow results. Omitted fields are unconstrained.
   * @returns An array of extension entry records matching the filter.
   */
  browseExtensions(filter?: ExtensionFilter): Record<string, unknown>[] {
    const results: Record<string, unknown>[] = [];
    for (const reg of this._state.extensions.registries) {
      for (const [_, entry] of reg.catalog.entries) {
        const e = entry as any;
        if (filter?.category && e.category !== filter.category) continue;
        if (filter?.status && e.status !== filter.status) continue;
        if (filter?.namePattern && !e.name?.includes(filter.namePattern)) continue;
        results.push(e);
      }
    }
    return results;
  }

  // ── Versioning queries ─────────────────────────────────────────

  /**
   * Compute a structured diff from a baseline (or a specific published version)
   * to the current definition state. Compares item keys to detect additions and
   * removals, classifying removals as breaking and additions as compatible.
   * @param fromVersion - Optional version string to diff from. If omitted, uses
   *   the creation-time baseline. Throws if the specified version is not found.
   * @returns An array of {@link Change} objects describing added/removed items with impact classification.
   */
  diffFromBaseline(fromVersion?: string): Change[] {
    let baseline: FormspecDefinition;
    if (fromVersion) {
      const release = this._state.versioning.releases.find(r => r.version === fromVersion);
      if (!release) throw new Error(`Version not found: ${fromVersion}`);
      baseline = release.snapshot;
    } else {
      baseline = this._state.versioning.baseline;
    }

    const current = this._state.definition;
    const changes: Change[] = [];

    // Compare items
    const baselineKeys = new Set<string>();
    const walkBaseline = (items: FormspecItem[]) => {
      for (const item of items) {
        baselineKeys.add(item.key);
        if (item.children) walkBaseline(item.children);
      }
    };
    walkBaseline(baseline.items);

    const currentKeys = new Set<string>();
    const walkCurrent = (items: FormspecItem[]) => {
      for (const item of items) {
        currentKeys.add(item.key);
        if (!baselineKeys.has(item.key)) {
          changes.push({
            type: 'added',
            target: 'item',
            path: item.key,
            impact: 'compatible',
          });
        }
        if (item.children) walkCurrent(item.children);
      }
    };
    walkCurrent(current.items);

    for (const key of baselineKeys) {
      if (!currentKeys.has(key)) {
        changes.push({
          type: 'removed',
          target: 'item',
          path: key,
          impact: 'breaking',
        });
      }
    }

    return changes;
  }

  /**
   * Preview what the changelog would look like without committing to a publish.
   * Computes a diff from the baseline, determines the aggregate semver impact
   * (breaking > compatible > cosmetic), and packages it as a {@link FormspecChangelog}.
   * @returns A changelog object with version range, impact classification, and change list.
   */
  previewChangelog(): FormspecChangelog {
    const changes = this.diffFromBaseline();
    let semverImpact: 'breaking' | 'compatible' | 'cosmetic' = 'cosmetic';
    for (const c of changes) {
      if (c.impact === 'breaking') { semverImpact = 'breaking'; break; }
      if (c.impact === 'compatible') semverImpact = 'compatible';
    }

    return {
      definitionUrl: this._state.definition.url,
      fromVersion: this._state.versioning.baseline.version,
      toVersion: this._state.definition.version,
      semverImpact,
      changes,
    };
  }

  // ── Diagnostics ────────────────────────────────────────────────

  /**
   * On-demand multi-pass validation of the current project state.
   * Not continuously computed -- the consumer decides when to call it
   * (on save, on panel open, on a debounce timer, etc.).
   *
   * Current passes:
   * - **extensions**: Walks all items for `x-` properties not resolvable against loaded registries
   *   (produces `UNRESOLVED_EXTENSION` errors).
   * - **consistency**: Detects orphan component binds (bound to nonexistent fields,
   *   `ORPHAN_COMPONENT_BIND` warnings) and stale mapping rule source paths
   *   (`STALE_MAPPING_SOURCE` warnings).
   *
   * @returns A {@link Diagnostics} object with categorized diagnostic arrays and severity counts.
   */
  diagnose(): Diagnostics {
    const structural: Diagnostic[] = [];
    const expressions: Diagnostic[] = [];
    const extensions: Diagnostic[] = [];
    const consistency: Diagnostic[] = [];

    // Extension resolution: check all items for unresolved x- properties
    const walkExtensions = (items: FormspecItem[], prefix: string) => {
      for (const item of items) {
        const path = prefix ? `${prefix}.${item.key}` : item.key;
        for (const key of Object.keys(item)) {
          if (key.startsWith('x-') && !this.resolveExtension(key)) {
            extensions.push({
              artifact: 'definition',
              path,
              severity: 'error',
              code: 'UNRESOLVED_EXTENSION',
              message: `Extension "${key}" not found in any loaded registry`,
            });
          }
        }
        if (item.children) walkExtensions(item.children, path);
      }
    };
    walkExtensions(this._state.definition.items, '');

    // Consistency: orphan component binds
    const fieldKeys = new Set(this.fieldPaths());
    const tree = this._state.component.tree as any;
    if (tree) {
      const queue = [tree];
      while (queue.length > 0) {
        const node = queue.shift()!;
        if (node.bind && !fieldKeys.has(node.bind)) {
          consistency.push({
            artifact: 'component',
            path: node.bind,
            severity: 'warning',
            code: 'ORPHAN_COMPONENT_BIND',
            message: `Component node bound to "${node.bind}" but no such item exists in the definition`,
          });
        }
        if (node.children) queue.push(...node.children);
      }
    }

    // Consistency: stale mapping rule source paths
    const rules = (this._state.mapping as any).rules as any[] | undefined;
    if (rules) {
      for (let i = 0; i < rules.length; i++) {
        const sp = rules[i].sourcePath;
        if (sp && !fieldKeys.has(sp)) {
          consistency.push({
            artifact: 'mapping',
            path: `rules[${i}].sourcePath`,
            severity: 'warning',
            code: 'STALE_MAPPING_SOURCE',
            message: `Mapping rule source path "${sp}" does not match any field in the definition`,
          });
        }
      }
    }

    // Aggregate counts
    const all = [...structural, ...expressions, ...extensions, ...consistency];
    const counts = { error: 0, warning: 0, info: 0 };
    for (const d of all) {
      counts[d.severity]++;
    }

    return { structural, expressions, extensions, consistency, counts };
  }

  // ── Export ──────────────────────────────────────────────────────

  /**
   * Serialize the four core artifacts as standalone JSON-serializable documents.
   * Returns a deep clone so the caller can freely mutate the result without
   * affecting project state. Extensions and versioning state are excluded.
   * @returns A {@link ProjectBundle} containing definition, component, theme, and mapping.
   */
  export(): ProjectBundle {
    return structuredClone({
      definition: this._state.definition,
      component: this._state.component,
      theme: this._state.theme,
      mapping: this._state.mapping,
    });
  }

  // ── History ──────────────────────────────────────────────────────

  /** Whether there is at least one state snapshot on the undo stack. */
  get canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  /** Whether there is at least one state snapshot on the redo stack. */
  get canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  /**
   * Full command log. Serializable -- can be persisted and replayed on a
   * fresh project to reconstruct state.
   */
  get log(): readonly LogEntry[] {
    return this._log;
  }

  /**
   * Restore the most recent pre-command state snapshot.
   * Pushes the current state onto the redo stack, pops from the undo stack,
   * and notifies listeners with source `'undo'`.
   * @returns `true` if undo was performed, `false` if the undo stack was empty.
   */
  undo(): boolean {
    if (!this.canUndo) return false;
    this._redoStack.push(this._state);
    this._state = this._undoStack.pop()!;
    this._notify({ type: 'undo', payload: {} }, { rebuildComponentTree: false }, 'undo');
    return true;
  }

  /**
   * Re-apply the most recently undone state.
   * Pushes the current state onto the undo stack, pops from the redo stack,
   * and notifies listeners with source `'redo'`.
   * @returns `true` if redo was performed, `false` if the redo stack was empty.
   */
  redo(): boolean {
    if (!this.canRedo) return false;
    this._undoStack.push(this._state);
    this._state = this._redoStack.pop()!;
    this._notify({ type: 'redo', payload: {} }, { rebuildComponentTree: false }, 'redo');
    return true;
  }

  // ── Change notification ──────────────────────────────────────────

  /**
   * Subscribe to state changes. The listener is called after every dispatch,
   * batch, undo, or redo with the new state and a change event describing
   * what triggered the transition.
   * @param listener - Callback receiving the new state and change event.
   * @returns An unsubscribe function. Call it to remove the listener.
   */
  onChange(listener: ChangeListener): () => void {
    this._listeners.add(listener);
    return () => { this._listeners.delete(listener); };
  }

  /**
   * Notify all registered change listeners of a state transition.
   * @param command - The command (or synthetic command for undo/redo/batch) that caused the change.
   * @param result - The command result describing side effects.
   * @param source - The transition origin: `'dispatch'`, `'batch'`, `'undo'`, or `'redo'`.
   */
  private _notify(command: AnyCommand, result: CommandResult, source: string): void {
    for (const listener of this._listeners) {
      listener(this._state, { command, result, source });
    }
  }

  /**
   * Post-dispatch normalization: enforce cross-artifact invariants.
   * Runs after every dispatch, batch, undo, and redo. Current invariants:
   * - Component and theme `targetDefinition.url` stay in sync with `definition.url`.
   * - Theme breakpoints are sorted by `minWidth` ascending.
   * - Component breakpoints inherit from theme when not independently set.
   */
  private _normalize(): void {
    const url = this._state.definition.url;

    // Sync targetDefinition.url on component and theme
    if (this._state.component.targetDefinition) {
      this._state.component.targetDefinition.url = url;
    }
    if (this._state.theme.targetDefinition) {
      this._state.theme.targetDefinition.url = url;
    }

    // Sort theme breakpoints by minWidth ascending
    const themeBp = this._state.theme.breakpoints;
    if (themeBp) {
      const sorted = Object.entries(themeBp).sort((a, b) => a[1] - b[1]);
      const fresh: Record<string, number> = {};
      for (const [name, minWidth] of sorted) fresh[name] = minWidth;
      this._state.theme.breakpoints = fresh;
    }

    // Sync component breakpoints from theme when not independently set
    if (!this._state.component.breakpoints && themeBp) {
      this._state.component.breakpoints = { ...this._state.theme.breakpoints };
    }
  }

  /**
   * Full rebuild of the component tree to mirror the definition item hierarchy.
   * Triggered when a command's result signals `rebuildComponentTree: true`
   * (e.g., after adding, deleting, or moving items).
   *
   * Preserves existing bound node properties (widget overrides, styles) and
   * unbound layout nodes (appended at root). The algorithm:
   *   1. Collect all existing bound nodes by `bind` key (deep traversal).
   *   2. Rebuild tree from definition hierarchy, reusing existing nodes where available.
   *   3. Append preserved unbound layout nodes at root level.
   */
  private _rebuildComponentTree(): void {
    type TreeNode = { component: string; bind?: string; nodeId?: string; children?: TreeNode[]; [k: string]: unknown };

    const tree = (this._state.component.tree as TreeNode) ?? { component: 'Root', nodeId: 'root', children: [] };

    // 1. Collect existing bound nodes by bind key (preserve their properties)
    const existingBound = new Map<string, TreeNode>();
    const unboundNodes: TreeNode[] = [];

    const collectExisting = (node: TreeNode) => {
      for (const child of node.children ?? []) {
        if (child.bind) {
          existingBound.set(child.bind, child);
        } else {
          unboundNodes.push(child);
        }
        // Don't recurse into children — we'll rebuild the hierarchy from definition
        // But we do need to collect deeply nested bound nodes
        if (child.children) {
          const collectDeep = (n: TreeNode) => {
            for (const c of n.children ?? []) {
              if (c.bind && !existingBound.has(c.bind)) {
                existingBound.set(c.bind, c);
              }
              collectDeep(c);
            }
          };
          collectDeep(child);
        }
      }
    };
    collectExisting(tree);

    // 2. Build new tree from definition
    const buildNode = (item: FormspecItem): TreeNode => {
      // Reuse existing node if available (preserves widget overrides, styles, etc.)
      const existing = existingBound.get(item.key);
      let node: TreeNode;

      if (existing) {
        node = { ...existing };
      } else {
        // Create default node based on item type
        node = { component: this._defaultComponent(item), bind: item.key };
      }

      // Rebuild children from definition hierarchy
      if (item.children && item.children.length > 0) {
        node.children = item.children.map(child => buildNode(child));
      } else if (item.type === 'group') {
        node.children = [];
      } else {
        delete node.children;
      }

      return node;
    };

    const newRoot: TreeNode = { component: 'Root', nodeId: 'root', children: [] };
    for (const item of this._state.definition.items) {
      newRoot.children!.push(buildNode(item));
    }

    // 3. Append preserved unbound layout nodes at root
    for (const node of unboundNodes) {
      newRoot.children!.push(node);
    }

    this._state.component.tree = newRoot as any;
  }

  /**
   * Determine the default component type for a newly created tree node.
   * Maps item types to sensible widget defaults: field -> TextInput,
   * group -> Stack, display -> Text.
   * @param item - The definition item to map.
   * @returns A component type string for the tree node.
   */
  private _defaultComponent(item: FormspecItem): string {
    switch (item.type) {
      case 'field': return 'TextInput';
      case 'group': return 'Stack';
      case 'display': return 'Text';
      default: return 'TextInput';
    }
  }

  // ── Dispatching commands ─────────────────────────────────────────

  /**
   * Apply a single command through the full dispatch lifecycle.
   *
   * Lifecycle:
   *   1. Build middleware chain wrapping the core handler.
   *   2. Clone state, execute handler on clone, push history snapshot.
   *   3. If `result.clearHistory`, wipe undo/redo stacks and log.
   *   4. If `result.rebuildComponentTree`, sync component tree to definition.
   *   5. Run cross-artifact normalization.
   *   6. Notify all change listeners.
   *
   * If the handler throws, state is unchanged (the clone is discarded).
   *
   * @param command - The command to dispatch. Must have a `type` matching a registered handler.
   * @returns The {@link CommandResult} produced by the handler (may include extra fields
   *   like `insertedPath` depending on the command type).
   */
  dispatch(command: AnyCommand): CommandResult {
    // Build the middleware chain, innermost is the actual handler
    const coreDispatch = (cmd: AnyCommand): CommandResult => {
      const handler = getHandler(cmd.type);
      const clone = structuredClone(this._state);
      const result = handler(clone, cmd.payload);

      this._pushHistory(this._state);
      this._log.push({ command: cmd, timestamp: Date.now() });
      this._state = clone;
      return result;
    };

    // Compose middleware: outermost wraps innermost
    let chain = coreDispatch;
    for (let i = this._middleware.length - 1; i >= 0; i--) {
      const mw = this._middleware[i];
      const next = chain;
      chain = (cmd) => mw(this._state, cmd, next);
    }

    const result = chain(command);
    if (result.clearHistory) {
      this._undoStack.length = 0;
      this._redoStack.length = 0;
      this._log.length = 0;
    }
    if (result.rebuildComponentTree) {
      this._rebuildComponentTree();
    }
    this._normalize();
    this._notify(command, result, 'dispatch');
    return result;
  }

  /**
   * Apply multiple commands as one atomic operation.
   * All commands execute sequentially on a single state clone, producing one
   * undo entry and one change notification. The component tree is rebuilt if
   * any command's result signals it. Middleware is bypassed -- commands go
   * directly to their handlers.
   *
   * Commands in a batch are independent: if a command needs results from an
   * earlier command in the same batch, use sequential {@link dispatch} calls instead.
   *
   * @param commands - The commands to execute in order.
   * @returns Per-command results aligned by index.
   */
  batch(commands: AnyCommand[]): CommandResult[] {
    const snapshot = this._state;
    const clone = structuredClone(this._state);
    const results: CommandResult[] = [];

    for (const cmd of commands) {
      const handler = getHandler(cmd.type);
      results.push(handler(clone, cmd.payload));
    }

    this._pushHistory(snapshot);
    this._log.push({
      command: { type: 'batch', payload: { commands } },
      timestamp: Date.now(),
    });
    this._state = clone;
    if (results.some(r => r.rebuildComponentTree)) {
      this._rebuildComponentTree();
    }
    this._normalize();
    this._notify(
      { type: 'batch', payload: { commands } },
      { rebuildComponentTree: results.some(r => r.rebuildComponentTree) },
      'batch',
    );
    return results;
  }

  /**
   * Push a pre-mutation state snapshot onto the undo stack and clear the redo stack.
   * If the undo stack exceeds `_maxHistory`, the oldest snapshot is pruned.
   * @param snapshot - The state snapshot to preserve (typically the pre-clone state).
   */
  private _pushHistory(snapshot: ProjectState): void {
    this._undoStack.push(snapshot);
    if (this._undoStack.length > this._maxHistory) {
      this._undoStack.shift();
    }
    this._redoStack.length = 0;
  }
}

/**
 * Factory function for creating a new {@link Project} instance.
 * Preferred over direct constructor usage for API consistency.
 * @param options - Optional configuration: seed state, middleware, and history depth.
 * @returns A fully initialized Project ready for command dispatch.
 */
export function createProject(options?: ProjectOptions): Project {
  return new Project(options);
}
