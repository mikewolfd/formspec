import type { FormspecDefinition } from 'formspec-engine';
import type { LibraryEntry } from './logic/definition-library';

export type ArtifactKind = 'definition' | 'component' | 'theme' | 'mapping' | 'registry' | 'changelog';

export interface ArtifactState {
  kind: ArtifactKind;
  data: unknown | null;
  dirty: boolean;
}

export interface BuilderProject {
  definition: FormspecDefinition | null;
  previousDefinitions: FormspecDefinition[];
  component: unknown | null;
  theme: unknown | null;
  mappings: unknown[];
  registries: unknown[];
  changelogs: unknown[];
  library: LibraryEntry[];
}

export interface BuilderDiagnostic {
  severity: 'error' | 'warning' | 'info';
  artifact: ArtifactKind;
  path: string;
  message: string;
  source: string;
}

export type ExportProfile = 'definition-only' | 'full-bundle';

export type EditorMode = 'guided' | 'json';

export type DrawerKind = 'project' | 'extensions' | 'mappings' | 'history';

export type NewItemType = 'field' | 'group' | 'display';

// --- Unified Component Tree Types ---

/** A node in the component tree. Mirrors the component.schema.json AnyComponent shape. */
export interface ComponentNode {
  component: string;
  bind?: string;
  when?: string;
  style?: Record<string, unknown>;
  cssClass?: string;
  accessibility?: { role?: string; description?: string; liveRegion?: string };
  responsive?: Record<string, Record<string, unknown>>;
  children?: ComponentNode[];
  [key: string]: unknown; // component-specific props (placeholder, columns, gap, etc.)
}

/** The full component document. */
export interface ComponentDocument {
  $formspecComponent: '1.0';
  version: string;
  url?: string;
  name?: string;
  title?: string;
  description?: string;
  targetDefinition: { url: string; compatibleVersions?: string };
  breakpoints?: Record<string, number>;
  tokens?: Record<string, string | number>;
  components?: Record<string, { params?: string[]; tree: ComponentNode }>;
  tree: ComponentNode;
}

/** Determines how a node behaves in the unified tree. */
export type NodeKind = 'layout' | 'bound-input' | 'bound-display' | 'group' | 'structure-only';

/** Path into the component tree. '' = root node, '0' = first child, '0.2' = first child's third child. */
export type ComponentTreePath = string;

/** Categories for the add-item picker. */
export type AddCategory = 'layout' | 'input' | 'display' | 'structure';

/** An entry in the categorized add picker. */
export interface AddPickerEntry {
  component: string;
  label: string;
  category: AddCategory;
  defaultDataType?: string;
  createsDefinitionItem?: boolean;
  definitionType?: 'field' | 'group' | 'display';
  promptForLabel?: boolean;
}
