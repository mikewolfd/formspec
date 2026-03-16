import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initSchemas } from '../src/schemas.js';
import { registryInBootstrap } from './helpers.js';
import {
  handleDraftDefinition,
  handleDraftComponent,
  handleDraftTheme,
  handleValidateDraft,
  handleLoadDraft,
} from '../src/tools/bootstrap.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SCHEMAS_DIR = resolve(__dirname, '../../../schemas');

// ── Minimal valid test documents ─────────────────────────────────────

const MINIMAL_DEFINITION = {
  $formspec: '1.0',
  url: 'urn:test:form',
  version: '1.0.0',
  status: 'draft',
  title: 'Test Form',
  items: [],
};

const MINIMAL_COMPONENT = {
  $formspecComponent: '1.0',
  version: '1.0.0',
  targetDefinition: { url: 'urn:test:form' },
  tree: { component: 'Stack', children: [] },
};

const MINIMAL_THEME = {
  $formspecTheme: '1.0',
  version: '1.0.0',
  targetDefinition: { url: 'urn:test:form' },
};

// ── Invalid documents ────────────────────────────────────────────────

const INVALID_DEFINITION = { bad: true };
const INVALID_COMPONENT = { bad: true };
const INVALID_THEME = { nonsense: 42 };

// ── Setup ────────────────────────────────────────────────────────────

beforeAll(() => {
  initSchemas(SCHEMAS_DIR);
});

// ── handleDraftDefinition ────────────────────────────────────────────

describe('handleDraftDefinition', () => {
  it('accepts valid definition JSON and stores it on the draft', () => {
    const { registry, projectId } = registryInBootstrap();
    const result = handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);

    expect(result.isError).toBeUndefined();
    const draft = registry.getDraft(projectId);
    expect(draft.definition).toEqual(MINIMAL_DEFINITION);
    expect(draft.errors.has('definition')).toBe(false);
  });

  it('returns DRAFT_SCHEMA_ERROR for invalid definition JSON', () => {
    const { registry, projectId } = registryInBootstrap();
    const result = handleDraftDefinition(registry, projectId, INVALID_DEFINITION);

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('DRAFT_SCHEMA_ERROR');
  });

  it('stores invalid JSON on draft even when schema errors exist', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, INVALID_DEFINITION);

    const draft = registry.getDraft(projectId);
    expect(draft.definition).toEqual(INVALID_DEFINITION);
    expect(draft.errors.has('definition')).toBe(true);
    expect(draft.errors.get('definition')!.length).toBeGreaterThan(0);
  });

  it('includes error details with paths and messages', () => {
    const { registry, projectId } = registryInBootstrap();
    const result = handleDraftDefinition(registry, projectId, INVALID_DEFINITION);

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.detail.artifactType).toBe('definition');
    expect(Array.isArray(parsed.detail.errors)).toBe(true);
    for (const err of parsed.detail.errors) {
      expect(typeof err.path).toBe('string');
      expect(typeof err.message).toBe('string');
    }
  });

  it('overwrites previous draft on resubmission', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, INVALID_DEFINITION);
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);

    const draft = registry.getDraft(projectId);
    expect(draft.definition).toEqual(MINIMAL_DEFINITION);
    expect(draft.errors.has('definition')).toBe(false);
  });

  it('returns WRONG_PHASE after load_draft', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);
    handleDraftComponent(registry, projectId, MINIMAL_COMPONENT);
    handleLoadDraft(registry, projectId);

    const result = handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('WRONG_PHASE');
  });
});

// ── handleDraftComponent ─────────────────────────────────────────────

describe('handleDraftComponent', () => {
  it('accepts valid component JSON and stores it on the draft', () => {
    const { registry, projectId } = registryInBootstrap();
    const result = handleDraftComponent(registry, projectId, MINIMAL_COMPONENT);

    expect(result.isError).toBeUndefined();
    const draft = registry.getDraft(projectId);
    expect(draft.component).toEqual(MINIMAL_COMPONENT);
    expect(draft.errors.has('component')).toBe(false);
  });

  it('returns DRAFT_SCHEMA_ERROR for invalid component JSON', () => {
    const { registry, projectId } = registryInBootstrap();
    const result = handleDraftComponent(registry, projectId, INVALID_COMPONENT);

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('DRAFT_SCHEMA_ERROR');
  });

  it('returns WRONG_PHASE after load_draft', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);
    handleLoadDraft(registry, projectId);

    const result = handleDraftComponent(registry, projectId, MINIMAL_COMPONENT);
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('WRONG_PHASE');
  });
});

// ── handleDraftTheme ─────────────────────────────────────────────────

describe('handleDraftTheme', () => {
  it('accepts valid theme JSON and stores it on the draft', () => {
    const { registry, projectId } = registryInBootstrap();
    const result = handleDraftTheme(registry, projectId, MINIMAL_THEME);

    expect(result.isError).toBeUndefined();
    const draft = registry.getDraft(projectId);
    expect(draft.theme).toEqual(MINIMAL_THEME);
    expect(draft.errors.has('theme')).toBe(false);
  });

  it('returns DRAFT_SCHEMA_ERROR for invalid theme JSON', () => {
    const { registry, projectId } = registryInBootstrap();
    const result = handleDraftTheme(registry, projectId, INVALID_THEME);

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('DRAFT_SCHEMA_ERROR');
  });

  it('returns WRONG_PHASE after load_draft', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);
    handleLoadDraft(registry, projectId);

    const result = handleDraftTheme(registry, projectId, MINIMAL_THEME);
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('WRONG_PHASE');
  });
});

// ── handleValidateDraft ──────────────────────────────────────────────

describe('handleValidateDraft', () => {
  it('returns valid: true for clean drafts', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);
    handleDraftComponent(registry, projectId, MINIMAL_COMPONENT);

    const result = handleValidateDraft(registry, projectId);
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(true);
  });

  it('returns errors when drafts have schema errors', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, INVALID_DEFINITION);

    const result = handleValidateDraft(registry, projectId);
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('DRAFT_INVALID');
  });

  it('returns error when no definition is present', () => {
    const { registry, projectId } = registryInBootstrap();

    const result = handleValidateDraft(registry, projectId);
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('DRAFT_INCOMPLETE');
  });

  it('reports errors from component draft', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);
    handleDraftComponent(registry, projectId, INVALID_COMPONENT);

    const result = handleValidateDraft(registry, projectId);
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('DRAFT_INVALID');
    expect(parsed.detail.errors.length).toBeGreaterThan(0);
    expect(parsed.detail.errors[0].artifactType).toBe('component');
  });

  it('valid: true with definition-only (no component or theme)', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);

    const result = handleValidateDraft(registry, projectId);
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(true);
  });

  it('returns WRONG_PHASE after load_draft', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);
    handleLoadDraft(registry, projectId);

    const result = handleValidateDraft(registry, projectId);
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('WRONG_PHASE');
  });
});

// ── handleLoadDraft ──────────────────────────────────────────────────

describe('handleLoadDraft', () => {
  it('transitions to authoring phase with valid definition + component', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);
    handleDraftComponent(registry, projectId, MINIMAL_COMPONENT);

    const result = handleLoadDraft(registry, projectId);
    expect(result.isError).toBeUndefined();

    // Should now be in authoring phase
    const project = registry.getProject(projectId);
    expect(project).toBeTruthy();
  });

  it('transitions with definition only (component and theme are optional)', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);

    const result = handleLoadDraft(registry, projectId);
    expect(result.isError).toBeUndefined();

    const project = registry.getProject(projectId);
    expect(project).toBeTruthy();
  });

  it('fails with DRAFT_INVALID when definition has schema errors', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, INVALID_DEFINITION);

    const result = handleLoadDraft(registry, projectId);
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('DRAFT_INVALID');
  });

  it('fails with DRAFT_INCOMPLETE when no definition is present', () => {
    const { registry, projectId } = registryInBootstrap();

    const result = handleLoadDraft(registry, projectId);
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('DRAFT_INCOMPLETE');
  });

  it('returns WRONG_PHASE when called after already loaded', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);
    handleDraftComponent(registry, projectId, MINIMAL_COMPONENT);
    handleLoadDraft(registry, projectId);

    const result = handleLoadDraft(registry, projectId);
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('WRONG_PHASE');
  });

  it('returns project statistics on success', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);
    handleDraftComponent(registry, projectId, MINIMAL_COMPONENT);

    const result = handleLoadDraft(registry, projectId);
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.statistics).toBeDefined();
    expect(typeof parsed.statistics.fieldCount).toBe('number');
  });

  it('loads all three artifacts (definition + component + theme)', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);
    handleDraftComponent(registry, projectId, MINIMAL_COMPONENT);
    handleDraftTheme(registry, projectId, MINIMAL_THEME);

    const result = handleLoadDraft(registry, projectId);
    expect(result.isError).toBeUndefined();

    const project = registry.getProject(projectId);
    expect(project).toBeTruthy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.phase).toBe('authoring');
  });

  it('returns diagnostics counts on success', () => {
    const { registry, projectId } = registryInBootstrap();
    handleDraftDefinition(registry, projectId, MINIMAL_DEFINITION);
    handleDraftComponent(registry, projectId, MINIMAL_COMPONENT);

    const result = handleLoadDraft(registry, projectId);
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.diagnostics).toBeDefined();
    expect(typeof parsed.diagnostics.error).toBe('number');
    expect(typeof parsed.diagnostics.warning).toBe('number');
    expect(typeof parsed.diagnostics.info).toBe('number');
  });

  it('returns PROJECT_NOT_FOUND for unknown projectId', () => {
    const { registry } = registryInBootstrap();
    const result = handleLoadDraft(registry, 'nonexistent-id');
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('PROJECT_NOT_FOUND');
  });
});
