/** @filedesc MCP tool for locale management: strings, form-level strings, listing. */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ProjectRegistry } from '../registry.js';
import { wrapCall, errorResponse, formatToolError } from '../errors.js';
import { NON_DESTRUCTIVE, READ_ONLY } from '../annotations.js';
import { bracketMutation } from './changeset.js';

type LocaleAction =
  | 'set_string'
  | 'remove_string'
  | 'list_strings'
  | 'set_form_string'
  | 'list_form_strings';

interface LocaleParams {
  action: LocaleAction;
  locale_id?: string;
  key?: string;
  value?: string;
  property?: string;
}

export function handleLocale(
  registry: ProjectRegistry,
  projectId: string,
  params: LocaleParams,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'set_string':
        return project.setLocaleString(params.key!, params.value!, params.locale_id);

      case 'remove_string':
        return project.removeLocaleString(params.key!, params.locale_id);

      case 'list_strings': {
        if (params.locale_id) {
          const locale = project.localeAt(params.locale_id);
          if (!locale) {
            return errorResponse(formatToolError(
              'COMMAND_FAILED',
              `Locale not found: ${params.locale_id}`,
            ));
          }
          return { strings: locale.strings };
        }
        const locales: Record<string, Record<string, string>> = {};
        for (const [code, loc] of Object.entries(project.locales)) {
          locales[code] = loc.strings;
        }
        return { locales };
      }

      case 'set_form_string':
        return project.setLocaleMetadata(params.property!, params.value!, params.locale_id);

      case 'list_form_strings': {
        const locale = project.localeAt(params.locale_id!);
        if (!locale) {
          return errorResponse(formatToolError(
            'COMMAND_FAILED',
            `Locale not found: ${params.locale_id}`,
          ));
        }
        return {
          form_strings: {
            name: locale.name,
            title: locale.title,
            description: locale.description,
            version: locale.version,
            url: locale.url,
          },
        };
      }

      default:
        return errorResponse(formatToolError(
          'COMMAND_FAILED',
          `Unknown locale action: ${params.action}`,
        ));
    }
  });
}

export function registerLocale(server: McpServer, registry: ProjectRegistry): void {
  server.registerTool('formspec_locale', {
    title: 'Locale',
    description: 'Manage locale strings and form-level translations. Actions: set_string, remove_string, list_strings, set_form_string, list_form_strings. Requires a locale document to be loaded first.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['set_string', 'remove_string', 'list_strings', 'set_form_string', 'list_form_strings']),
      locale_id: z.string().optional().describe('BCP 47 locale code (e.g. "fr", "de"). Required for mutations. For list_strings, omit to list all locales.'),
      key: z.string().optional().describe('String key (for set_string, remove_string)'),
      value: z.string().optional().describe('String value (for set_string, set_form_string)'),
      property: z.string().optional().describe('Form-level property: name, title, description, version, url (for set_form_string)'),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, locale_id, key, value, property }) => {
    const readOnlyActions = ['list_strings', 'list_form_strings'];
    if (readOnlyActions.includes(action)) {
      return handleLocale(registry, project_id, { action, locale_id, key, value, property });
    }
    return bracketMutation(registry, project_id, 'formspec_locale', () =>
      handleLocale(registry, project_id, { action, locale_id, key, value, property }),
    );
  });
}
