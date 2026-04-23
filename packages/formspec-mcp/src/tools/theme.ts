/** @filedesc MCP tool for theme management: tokens, defaults, and selectors. */
import type { ProjectRegistry } from '../registry.js';
import { wrapCall, successResponse, errorResponse, formatToolError } from '../errors.js';
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
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NON_DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

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
  key?: string;
  value?: unknown;
  property?: string;
  itemKey?: string;
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
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'set_token':
        if (!validateTokenName(String(params.key ?? '').split('.').pop() ?? '')) {
          throw new HelperError('INVALID_PARAM', 'Token name must contain only letters, numbers, hyphens, and underscores');
        }
        return project.setToken(params.key!, params.value as string);

      case 'remove_token':
        return project.setToken(params.key!, null);

      case 'list_tokens':
        return {
          tokens: project.theme.tokens ?? {},
          groups: buildTokenGroups(project),
        };

      case 'set_default':
        return project.setThemeDefault(params.property!, params.value);

      case 'list_defaults':
        return { defaults: project.theme.defaults ?? {} };

      case 'set_item_override':
        if (!params.itemKey || !params.property) {
          throw new HelperError('MISSING_PARAM', 'itemKey and property are required');
        }
        return setThemeOverride(project, params.itemKey!, params.property!, params.value);

      case 'clear_item_override':
        if (!params.itemKey || !params.property) {
          throw new HelperError('MISSING_PARAM', 'itemKey and property are required');
        }
        return clearThemeOverride(project, params.itemKey!, params.property!);

      case 'list_item_overrides':
        if (!params.itemKey) {
          throw new HelperError('MISSING_PARAM', 'itemKey is required');
        }
        return { item_overrides: getItemOverrides(project, params.itemKey!) };

      case 'add_selector':
        return project.addThemeSelector(
          (params.match ?? {}) as Record<string, unknown>,
          (params.apply ?? {}) as Record<string, unknown>,
        );

      case 'list_selectors':
        return {
          selectors: ((project.theme as any).selectors ?? []).map((selector: Record<string, unknown>) => ({
            ...selector,
            summary: summarizeSelectorRule(selector),
          })),
        };

      case 'list_breakpoints':
        return { breakpoints: getSortedBreakpoints(project) };

      case 'apply_breakpoint_presets':
        applyBreakpointPresets(project);
        return { applied: true, breakpoints: getSortedBreakpoints(project) };
    }
  });
}

export function registerTheme(server: McpServer, registry: ProjectRegistry) {
  server.registerTool('formspec_theme', {
    title: 'Theme',
    description: 'Manage theme tokens, defaults, item overrides, selectors, and breakpoints. Actions: set_token, remove_token, list_tokens, set_default, list_defaults, set_item_override, clear_item_override, list_item_overrides, add_selector, list_selectors, list_breakpoints, apply_breakpoint_presets.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['set_token', 'remove_token', 'list_tokens', 'set_default', 'list_defaults', 'set_item_override', 'clear_item_override', 'list_item_overrides', 'add_selector', 'list_selectors', 'list_breakpoints', 'apply_breakpoint_presets']),
      key: z.string().optional().describe('Token key (for set_token, remove_token)'),
      value: z.unknown().optional().describe('Token or default value (for set_token, set_default)'),
      property: z.string().optional().describe('Default property name (for set_default)'),
      itemKey: z.string().optional().describe('Item key (for set_item_override, clear_item_override, list_item_overrides)'),
      match: z.record(z.string(), z.unknown()).optional().describe('Selector match criteria (for add_selector)'),
      apply: z.record(z.string(), z.unknown()).optional().describe('Selector properties to apply (for add_selector)'),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, key, value, property, itemKey, match, apply }) => {
    const readOnlyActions = ['list_tokens', 'list_defaults', 'list_item_overrides', 'list_selectors', 'list_breakpoints'];
    if (readOnlyActions.includes(action)) {
      return handleTheme(registry, project_id, { action, key, value, property, itemKey, match, apply });
    }
    return bracketMutation(registry, project_id, 'formspec_theme', () =>
      handleTheme(registry, project_id, { action, key, value, property, itemKey, match, apply }),
    );
  });
}
