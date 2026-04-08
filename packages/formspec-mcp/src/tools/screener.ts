/**
 * Screener tool (standalone Screener Document model):
 *   action: 'create_document' | 'delete_document' | 'add_field' | 'remove_field'
 *         | 'add_phase' | 'remove_phase' | 'set_phase_strategy'
 *         | 'add_route' | 'update_route' | 'reorder_route' | 'remove_route'
 *         | 'set_lifecycle'
 */

import type { ProjectRegistry } from '../registry.js';
import { wrapHelperCall } from '../errors.js';
import { HelperError, type FieldProps } from '@formspec-org/studio-core';

type ScreenerAction =
  | 'create_document' | 'delete_document'
  | 'add_field' | 'remove_field'
  | 'add_phase' | 'remove_phase' | 'set_phase_strategy'
  | 'add_route' | 'update_route' | 'reorder_route' | 'remove_route'
  | 'set_lifecycle';

interface ScreenerParams {
  action: ScreenerAction;
  // Document
  url?: string;
  title?: string;
  // Field
  key?: string;
  label?: string;
  type?: string;
  props?: FieldProps;
  // Phase
  phase_id?: string;
  strategy?: string;
  config?: Record<string, unknown>;
  // Route
  route_index?: number;
  condition?: string;
  target?: string;
  message?: string;
  score?: string;
  threshold?: number;
  override?: boolean;
  terminal?: boolean;
  changes?: Record<string, unknown>;
  direction?: 'up' | 'down';
  insert_index?: number;
  // Lifecycle
  availability_from?: string | null;
  availability_until?: string | null;
  result_validity?: string | null;
}

/** Throws a clear error if any of the named params are missing for the given action. */
function requireParams(
  action: string,
  params: ScreenerParams,
  required: (keyof ScreenerParams)[],
): void {
  const missing = required.filter(k => params[k] == null);
  if (missing.length > 0) {
    throw new HelperError(
      'MISSING_PARAM',
      `${action} requires: ${missing.join(', ')}`,
    );
  }
}

export function handleScreener(
  registry: ProjectRegistry,
  projectId: string,
  params: ScreenerParams,
) {
  return wrapHelperCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'create_document':
        return project.createScreenerDocument({ url: params.url, title: params.title });
      case 'delete_document':
        return project.deleteScreenerDocument();
      case 'add_field':
        requireParams('add_field', params, ['key', 'label', 'type']);
        return project.addScreenField(params.key!, params.label!, params.type!, params.props);
      case 'remove_field':
        requireParams('remove_field', params, ['key']);
        return project.removeScreenField(params.key!);
      case 'add_phase':
        requireParams('add_phase', params, ['phase_id', 'strategy']);
        return project.addEvaluationPhase(params.phase_id!, params.strategy!, params.label);
      case 'remove_phase':
        requireParams('remove_phase', params, ['phase_id']);
        return project.removeEvaluationPhase(params.phase_id!);
      case 'set_phase_strategy':
        requireParams('set_phase_strategy', params, ['phase_id', 'strategy']);
        return project.setPhaseStrategy(params.phase_id!, params.strategy!, params.config);
      case 'add_route':
        requireParams('add_route', params, ['phase_id', 'target']);
        return project.addScreenRoute(params.phase_id!, {
          condition: params.condition,
          target: params.target!,
          label: params.label,
          message: params.message,
          score: params.score,
          threshold: params.threshold,
        }, params.insert_index);
      case 'update_route':
        requireParams('update_route', params, ['phase_id', 'route_index']);
        return project.updateScreenRoute(params.phase_id!, params.route_index!, params.changes as any);
      case 'reorder_route':
        requireParams('reorder_route', params, ['phase_id', 'route_index', 'direction']);
        return project.reorderScreenRoute(params.phase_id!, params.route_index!, params.direction!);
      case 'remove_route':
        requireParams('remove_route', params, ['phase_id', 'route_index']);
        return project.removeScreenRoute(params.phase_id!, params.route_index!);
      case 'set_lifecycle': {
        const result = project.setScreenerAvailability(params.availability_from, params.availability_until);
        if (params.result_validity !== undefined) {
          project.setScreenerResultValidity(params.result_validity);
        }
        return result;
      }
    }
  });
}
