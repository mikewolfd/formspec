/** @filedesc MCP tool for locale management: strings, form-level strings, listing. */
import type { ProjectRegistry } from '../registry.js';
import { successResponse, errorResponse, formatToolError } from '../errors.js';
import { HelperError } from '@formspec-org/studio-core';

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
  try {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'set_string':
        return successResponse(project.setLocaleString(params.key!, params.value!, params.locale_id));

      case 'remove_string':
        return successResponse(project.removeLocaleString(params.key!, params.locale_id));

      case 'list_strings': {
        if (params.locale_id) {
          const locale = project.localeAt(params.locale_id);
          if (!locale) {
            return errorResponse(formatToolError(
              'COMMAND_FAILED',
              `Locale not found: ${params.locale_id}`,
            ));
          }
          return successResponse({ strings: locale.strings });
        }
        // No locale_id: list all locales with their strings
        const locales: Record<string, Record<string, string>> = {};
        for (const [code, loc] of Object.entries(project.locales)) {
          locales[code] = loc.strings;
        }
        return successResponse({ locales });
      }

      case 'set_form_string':
        return successResponse(project.setLocaleMetadata(params.property!, params.value!, params.locale_id));

      case 'list_form_strings': {
        const locale = project.localeAt(params.locale_id!);
        if (!locale) {
          return errorResponse(formatToolError(
            'COMMAND_FAILED',
            `Locale not found: ${params.locale_id}`,
          ));
        }
        return successResponse({
          form_strings: {
            name: locale.name,
            title: locale.title,
            description: locale.description,
            version: locale.version,
            url: locale.url,
          },
        });
      }

      default:
        return errorResponse(formatToolError(
          'COMMAND_FAILED',
          `Unknown locale action: ${params.action}`,
        ));
    }
  } catch (err) {
    if (err instanceof HelperError) {
      return errorResponse(formatToolError(err.code, err.message, err.detail as Record<string, unknown>));
    }
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(formatToolError('COMMAND_FAILED', message));
  }
}
