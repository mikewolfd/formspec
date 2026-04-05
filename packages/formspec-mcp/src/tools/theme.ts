/** @filedesc MCP tool for theme management: tokens, defaults, and selectors. */
import type { ProjectRegistry } from '../registry.js';
import { wrapHelperCall, successResponse, errorResponse, formatToolError } from '../errors.js';
import { HelperError } from '@formspec-org/studio-core';
import {
  applyBreakpointPresets,
  clearThemeOverride,
  getGroupedTokens,
  getItemOverrides,
  getTokensByGroup,
  getSortedBreakpoints,
  setThemeOverride,
  summarizeSelectorRule,
  validateTokenName,
} from '@formspec-org/studio-core';
import type { Project } from '@formspec-org/studio-core';

type ThemeAction =
  | 'set_token'
  | 'remove_token'
  | 'list_tokens'
  | 'set_default'
  | 'list_defaults'
  | 'set_item_override'
  | 'clear_item_override'
  | 'list_item_overrides'
  | 'add_selector'
  | 'list_selectors'
  | 'list_breakpoints'
  | 'apply_breakpoint_presets';

interface ThemeParams {
  action: ThemeAction;
  // For tokens
  key?: string;
  value?: unknown;
  // For defaults
  property?: string;
  // For item overrides
  itemKey?: string;
  // For selectors
  match?: unknown;
  apply?: unknown;
}

function buildTokenGroups(project: Project) {
  const grouped = getGroupedTokens(project);
  return Array.from(grouped.entries()).map(([prefix, items]) => ({
    prefix,
    items: prefix === 'other' ? items : getTokensByGroup(project, prefix),
  }));
}

export function handleTheme(
  registry: ProjectRegistry,
  projectId: string,
  params: ThemeParams,
) {
  try {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'set_token':
        if (!validateTokenName(String(params.key ?? '').split('.').pop() ?? '')) {
          throw new HelperError('INVALID_PARAM', 'Token name must contain only letters, numbers, hyphens, and underscores');
        }
        return successResponse(project.setToken(params.key!, params.value as string));

      case 'remove_token':
        // setToken with null removes the key
        return successResponse(project.setToken(params.key!, null));

      case 'list_tokens':
        return successResponse({
          tokens: project.theme.tokens ?? {},
          groups: buildTokenGroups(project),
        });

      case 'set_default':
        return successResponse(project.setThemeDefault(params.property!, params.value));

      case 'list_defaults':
        return successResponse({ defaults: project.theme.defaults ?? {} });

      case 'set_item_override':
        if (!params.itemKey || !params.property) {
          throw new HelperError('MISSING_PARAM', 'itemKey and property are required');
        }
        return successResponse(setThemeOverride(project, params.itemKey!, params.property!, params.value));

      case 'clear_item_override':
        if (!params.itemKey || !params.property) {
          throw new HelperError('MISSING_PARAM', 'itemKey and property are required');
        }
        return successResponse(clearThemeOverride(project, params.itemKey!, params.property!));

      case 'list_item_overrides':
        if (!params.itemKey) {
          throw new HelperError('MISSING_PARAM', 'itemKey is required');
        }
        return successResponse({ item_overrides: getItemOverrides(project, params.itemKey!) });

      case 'add_selector':
        return wrapHelperCall(() =>
          project.addThemeSelector(
            (params.match ?? {}) as Record<string, unknown>,
            (params.apply ?? {}) as Record<string, unknown>,
          ),
        );

      case 'list_selectors':
        return successResponse({
          selectors: ((project.theme as any).selectors ?? []).map((selector: Record<string, unknown>) => ({
            ...selector,
            summary: summarizeSelectorRule(selector),
          })),
        });

      case 'list_breakpoints':
        return successResponse({ breakpoints: getSortedBreakpoints(project) });

      case 'apply_breakpoint_presets':
        applyBreakpointPresets(project);
        return successResponse({ applied: true, breakpoints: getSortedBreakpoints(project) });
    }
  } catch (err) {
    if (err instanceof HelperError) {
      return errorResponse(formatToolError(err.code, err.message, err.detail as Record<string, unknown>));
    }
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(formatToolError('COMMAND_FAILED', message));
  }
}
