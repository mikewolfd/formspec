/**
 * Bootstrap-phase tools: draft submission, validation, and load.
 *
 * During bootstrap the LLM generates raw JSON artifacts, validates them
 * against schemas, and iterates until clean. Once satisfied it calls
 * load_draft to transition the project into the authoring phase.
 */

import { HelperError, createProject } from 'formspec-studio-core';
import type { DocumentType } from 'formspec-engine';
import { ProjectRegistry } from '../registry.js';
import { getValidator } from '../schemas.js';
import { errorResponse, successResponse, formatToolError } from '../errors.js';

// ── Helpers ──────────────────────────────────────────────────────────

type ArtifactType = 'definition' | 'component' | 'theme';

function getDraftSafe(registry: ProjectRegistry, projectId: string) {
  try {
    return { draft: registry.getDraft(projectId), error: null };
  } catch (err) {
    if (err instanceof HelperError) {
      return {
        draft: null,
        error: errorResponse(formatToolError(err.code, err.message, err.detail as Record<string, unknown>)),
      };
    }
    throw err;
  }
}

function submitDraft(
  registry: ProjectRegistry,
  projectId: string,
  artifactType: ArtifactType,
  json: unknown,
) {
  const { draft, error } = getDraftSafe(registry, projectId);
  if (error) return error;

  // Store the JSON on the draft regardless of validation result
  draft![artifactType] = json;

  // Validate against schema
  const validator = getValidator();
  const result = validator.validate(json, artifactType as DocumentType);

  if (result.errors.length > 0) {
    // Store errors on draft for this artifact type
    draft!.errors.set(artifactType, result.errors);
    return errorResponse(
      formatToolError('DRAFT_SCHEMA_ERROR', `${artifactType} has ${result.errors.length} schema error(s)`, {
        artifactType,
        errors: result.errors.map((e) => ({ path: e.path, message: e.message })),
      }),
    );
  }

  // Valid — clear any previous errors for this artifact type
  draft!.errors.delete(artifactType);
  return successResponse({
    stored: artifactType,
    valid: true,
  });
}

// ── Public handlers ──────────────────────────────────────────────────

export function handleDraftDefinition(
  registry: ProjectRegistry,
  projectId: string,
  json: unknown,
) {
  return submitDraft(registry, projectId, 'definition', json);
}

export function handleDraftComponent(
  registry: ProjectRegistry,
  projectId: string,
  json: unknown,
) {
  return submitDraft(registry, projectId, 'component', json);
}

export function handleDraftTheme(
  registry: ProjectRegistry,
  projectId: string,
  json: unknown,
) {
  return submitDraft(registry, projectId, 'theme', json);
}

export function handleValidateDraft(
  registry: ProjectRegistry,
  projectId: string,
) {
  const { draft, error } = getDraftSafe(registry, projectId);
  if (error) return error;

  // Check for unresolved schema errors
  if (draft!.errors.size > 0) {
    const allErrors: Array<{ artifactType: string; path: string; message: string }> = [];
    for (const [artifactType, errors] of draft!.errors) {
      for (const e of errors) {
        allErrors.push({ artifactType, path: e.path, message: e.message });
      }
    }
    return errorResponse(
      formatToolError('DRAFT_INVALID', `Draft has ${allErrors.length} unresolved schema error(s)`, {
        errors: allErrors,
      }),
    );
  }

  // Must have at least a definition
  if (!draft!.definition) {
    return errorResponse(
      formatToolError('DRAFT_INCOMPLETE', 'No definition has been submitted'),
    );
  }

  return successResponse({ valid: true });
}

export function handleLoadDraft(
  registry: ProjectRegistry,
  projectId: string,
) {
  const { draft, error } = getDraftSafe(registry, projectId);
  if (error) return error;

  // Must have at least a definition
  if (!draft!.definition) {
    return errorResponse(
      formatToolError('DRAFT_INCOMPLETE', 'No definition has been submitted'),
    );
  }

  // Check for unresolved schema errors
  if (draft!.errors.size > 0) {
    const allErrors: Array<{ artifactType: string; path: string; message: string }> = [];
    for (const [artifactType, errors] of draft!.errors) {
      for (const e of errors) {
        allErrors.push({ artifactType, path: e.path, message: e.message });
      }
    }
    return errorResponse(
      formatToolError('DRAFT_INVALID', `Cannot load draft: ${allErrors.length} unresolved schema error(s)`, {
        errors: allErrors,
      }),
    );
  }

  // Build the seed bundle from submitted drafts
  const seed: Record<string, unknown> = {
    definition: draft!.definition,
  };
  if (draft!.component) seed.component = draft!.component;
  if (draft!.theme) seed.theme = draft!.theme;

  // Create project and load the bundle
  const project = createProject();
  project.loadBundle(seed);

  // Transition to authoring phase
  registry.transitionToAuthoring(projectId, project);

  const statistics = project.statistics();
  const diagnostics = project.diagnose();

  return successResponse({
    phase: 'authoring',
    statistics,
    diagnostics: diagnostics.counts,
  });
}
