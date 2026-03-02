import { computed, signal } from '@preact/signals';
import type { FormEngine } from 'formspec-engine';
import type { ArtifactKind, BuilderDiagnostic, BuilderProject, EditorMode } from '../types';

export const project = signal<BuilderProject>({
  definition: null,
  component: null,
  theme: null,
  mapping: null,
  registry: null,
  changelog: null,
});

export const engine = signal<FormEngine | null>(null);
export const diagnostics = signal<BuilderDiagnostic[]>([]);
export const activeArtifact = signal<ArtifactKind>('definition');
export const editorMode = signal<EditorMode>('guided');

export const diagnosticCounts = computed(() => {
  const current = diagnostics.value;
  return {
    error: current.filter((d) => d.severity === 'error').length,
    warning: current.filter((d) => d.severity === 'warning').length,
    info: current.filter((d) => d.severity === 'info').length,
  };
});

export const hasBlockingErrors = computed(() => diagnosticCounts.value.error > 0);

// --- State Actions (No-Code Integration) ---

// Theme Actions
export function updateThemeToken(key: string, value: string) {
  let themeObj = project.value.theme as any;
  if (!themeObj || typeof themeObj !== 'object') {
    themeObj = { $formspecTheme: '1.0', version: '1.0.0', tokens: {}, defaults: {}, selectors: [] };
  }

  if (!themeObj.tokens) themeObj.tokens = {};
  themeObj.tokens[key] = value;

  project.value = { ...project.value, theme: themeObj };
}

export function updateThemeSelector(selectorName: string, cssString: string) {
  let themeObj = project.value.theme as any;
  if (!themeObj || typeof themeObj !== 'object') {
    themeObj = { $formspecTheme: '1.0', version: '1.0.0', tokens: {}, defaults: {}, selectors: [] };
  }

  if (!themeObj.selectors) themeObj.selectors = [];

  const existingIndex = themeObj.selectors.findIndex((s: any) => s.selector === selectorName);
  if (existingIndex >= 0) {
    if (cssString) {
      themeObj.selectors[existingIndex].css = cssString;
    } else {
      themeObj.selectors.splice(existingIndex, 1);
    }
  } else if (cssString) {
    themeObj.selectors.push({ selector: selectorName, css: cssString });
  }

  project.value = { ...project.value, theme: themeObj };
}

// Mapping Actions
export function updateFieldMapping(fieldKey: string, rule: { target: string; adapter?: string }) {
  let mappingObj = project.value.mapping as any;
  if (!mappingObj || typeof mappingObj !== 'object') {
    mappingObj = { $formspecMapping: '1.0', version: '1.0.0', adapter: 'json', rules: [] };
  }

  if (!mappingObj.rules) mappingObj.rules = [];

  const existingIndex = mappingObj.rules.findIndex((r: any) => r.source === fieldKey);
  if (existingIndex >= 0) {
    if (rule.target) {
      mappingObj.rules[existingIndex] = { ...mappingObj.rules[existingIndex], ...rule, source: fieldKey };
    } else {
      mappingObj.rules.splice(existingIndex, 1);
    }
  } else if (rule.target) {
    mappingObj.rules.push({ source: fieldKey, target: rule.target, adapter: rule.adapter });
  }

  project.value = { ...project.value, mapping: mappingObj };
}

// Component Actions
export function extractToComponent(nodeKey: string, componentName: string, subTree: any) {
  let compObj = project.value.component as any;
  if (!compObj || typeof compObj !== 'object') {
    compObj = { $formspecComponent: '1.0', version: '1.0.0', components: [] };
  }

  if (!compObj.components) compObj.components = [];

  const existingIndex = compObj.components.findIndex((c: any) => c.name === componentName);
  const newComp = { name: componentName, item: subTree };

  if (existingIndex >= 0) {
    compObj.components[existingIndex] = newComp;
  } else {
    compObj.components.push(newComp);
  }

  project.value = { ...project.value, component: compObj };
}
