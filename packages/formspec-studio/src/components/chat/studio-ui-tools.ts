/** @filedesc Closed taxonomy of studio-local UI tools for AI tool composition (ADR 0086). */
import type { ToolDeclaration, ToolCallResult } from '@formspec-org/chat';

/** Synchronous result returned by studio-local UI handlers. */
export interface StudioUIHandlerResult {
  ok: boolean;
  /** Failure reason when ok is false; success summary when ok is true. */
  reason?: string;
}

export interface StudioUIHandlers {
  revealField?: (path: string) => StudioUIHandlerResult;
  setRightPanelOpen?: (open: boolean) => StudioUIHandlerResult;
}

export interface StudioUITools {
  declarations: ToolDeclaration[];
  handlers: Record<string, (args: Record<string, unknown>) => ToolCallResult>;
}

const REVEAL_FIELD: ToolDeclaration = {
  name: 'revealField',
  description: 'Scroll the structure tree to reveal a field by path. Expands collapsed parents. Does NOT change selection. Use when the user asks to see or locate a field.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string' as const,
        description: 'Field key path to reveal (e.g. "patient.name", "items[0].field").',
      },
    },
    required: ['path'],
  },
};

const SET_RIGHT_PANEL_OPEN: ToolDeclaration = {
  name: 'setRightPanelOpen',
  description: 'Toggle the preview companion panel in the right rail. Use when the user asks to see or hide a live form preview.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      open: {
        type: 'boolean' as const,
        description: 'True to open the preview panel, false to close it.',
      },
    },
    required: ['open'],
  },
};

export function createStudioUITools(handlers: StudioUIHandlers): StudioUITools {
  const toolHandlers: Record<string, (args: Record<string, unknown>) => ToolCallResult> = {};

  toolHandlers.revealField = (args) => {
    const path = args.path;
    if (typeof path !== 'string' || path.length === 0) {
      return { content: 'Missing or invalid "path" argument.', isError: true };
    }
    if (!handlers.revealField) {
      return { content: 'revealField not available — selection context not wired.', isError: true };
    }
    const result = handlers.revealField(path);
    if (!result.ok) {
      return { content: result.reason ?? `Could not reveal "${path}".`, isError: true };
    }
    return { content: result.reason ?? `Revealed "${path}" in structure tree.`, isError: false };
  };

  toolHandlers.setRightPanelOpen = (args) => {
    const open = args.open;
    if (typeof open !== 'boolean') {
      return { content: 'Missing or invalid "open" argument (expected boolean).', isError: true };
    }
    if (!handlers.setRightPanelOpen) {
      return { content: 'setRightPanelOpen not available — panel context not wired.', isError: true };
    }
    const result = handlers.setRightPanelOpen(open);
    if (!result.ok) {
      return { content: result.reason ?? `Could not ${open ? 'open' : 'close'} preview companion.`, isError: true };
    }
    return { content: result.reason ?? `Preview companion ${open ? 'opened' : 'closed'}.`, isError: false };
  };

  return {
    declarations: [REVEAL_FIELD, SET_RIGHT_PANEL_OPEN],
    handlers: toolHandlers,
  };
}
