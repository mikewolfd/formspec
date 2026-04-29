/** @filedesc Closed taxonomy of studio-local UI tools for AI tool composition (ADR 0086). */
import type { ToolDeclaration, ToolCallResult } from '@formspec-org/chat';

/** Synchronous result returned by studio-local UI handlers. */
export interface StudioUIHandlerResult {
  ok: boolean;
  /** Failure reason when ok is false; success summary when ok is true. */
  reason?: string;
}

export type StudioMode = 'chat' | 'edit' | 'design' | 'preview';

export interface StudioUIHandlers {
  revealField?: (path: string) => StudioUIHandlerResult;
  setRightPanelOpen?: (open: boolean) => StudioUIHandlerResult;
  switchMode?: (mode: StudioMode) => StudioUIHandlerResult;
  highlightField?: (path: string, durationMs?: number) => StudioUIHandlerResult;
  openPreview?: (viewport?: 'desktop' | 'tablet' | 'mobile') => StudioUIHandlerResult;
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

const SWITCH_MODE: ToolDeclaration = {
  name: 'switchMode',
  description: 'Switch the Studio surface to a different mode. Use when the user asks to switch to chat, edit, design, or preview.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      mode: {
        type: 'string' as const,
        enum: ['chat', 'edit', 'design', 'preview'],
        description: 'Target mode.',
      },
    },
    required: ['mode'],
  },
};

const HIGHLIGHT_FIELD: ToolDeclaration = {
  name: 'highlightField',
  description: 'Temporarily highlight a field on the canvas with a pulsing ring. Use after making changes to draw the user\'s attention.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string' as const,
        description: 'Field key path to highlight.',
      },
      durationMs: {
        type: 'number' as const,
        description: 'Highlight duration in milliseconds. Default 2000.',
      },
    },
    required: ['path'],
  },
};

const OPEN_PREVIEW: ToolDeclaration = {
  name: 'openPreview',
  description: 'Switch to preview mode with an optional viewport. Use when the user wants to test or see the form as a respondent.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      viewport: {
        type: 'string' as const,
        enum: ['desktop', 'tablet', 'mobile'],
        description: 'Viewport to simulate. Default desktop.',
      },
    },
    required: [],
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

  toolHandlers.switchMode = (args) => {
    const mode = args.mode;
    if (typeof mode !== 'string' || !['chat', 'edit', 'design', 'preview'].includes(mode)) {
      return { content: 'Missing or invalid "mode" argument. Must be one of: chat, edit, design, preview.', isError: true };
    }
    if (!handlers.switchMode) {
      return { content: 'switchMode not available — mode context not wired.', isError: true };
    }
    const result = handlers.switchMode(mode as StudioMode);
    if (!result.ok) {
      return { content: result.reason ?? `Could not switch to ${mode} mode.`, isError: true };
    }
    return { content: result.reason ?? `Switched to ${mode} mode.`, isError: false };
  };

  toolHandlers.highlightField = (args) => {
    const path = args.path;
    if (typeof path !== 'string' || path.length === 0) {
      return { content: 'Missing or invalid "path" argument.', isError: true };
    }
    if (!handlers.highlightField) {
      return { content: 'highlightField not available — canvas overlay not wired.', isError: true };
    }
    const durationMs = typeof args.durationMs === 'number' ? args.durationMs : undefined;
    const result = handlers.highlightField(path, durationMs);
    if (!result.ok) {
      return { content: result.reason ?? `Could not highlight "${path}".`, isError: true };
    }
    return { content: result.reason ?? `Highlighted "${path}" on canvas.`, isError: false };
  };

  toolHandlers.openPreview = (args) => {
    if (!handlers.openPreview) {
      return { content: 'openPreview not available — mode context not wired.', isError: true };
    }
    const viewport = typeof args.viewport === 'string' ? args.viewport as 'desktop' | 'tablet' | 'mobile' : undefined;
    const result = handlers.openPreview(viewport);
    if (!result.ok) {
      return { content: result.reason ?? 'Could not open preview.', isError: true };
    }
    return { content: result.reason ?? `Opened preview${viewport ? ` (${viewport})` : ''}.`, isError: false };
  };

  return {
    declarations: [REVEAL_FIELD, SET_RIGHT_PANEL_OPEN, SWITCH_MODE, HIGHLIGHT_FIELD, OPEN_PREVIEW],
    handlers: toolHandlers,
  };
}
