/** @filedesc MCPToolBridge — wraps MCP tools + studio-ui-tools as a unified ToolContext for chat adapters. */
import type { ToolDeclaration, ToolCallResult, ToolContext } from './types.js';

/**
 * Studio UI tool handlers — intercepted before MCP dispatch.
 * These operate on the Studio surface directly (no network hop).
 */
export interface StudioUIHandlers {
  revealField?: (path: string) => { ok: boolean; reason?: string };
  setRightPanelOpen?: (open: boolean) => { ok: boolean; reason?: string };
  switchMode?: (mode: string) => { ok: boolean; reason?: string };
  highlightField?: (path: string, durationMs?: number) => { ok: boolean; reason?: string };
  openPreview?: (viewport?: string) => { ok: boolean; reason?: string };
}

/** Studio UI tool names — these are intercepted before MCP dispatch. */
const STUDIO_UI_TOOL_NAMES = new Set([
  'revealField',
  'setRightPanelOpen',
  'switchMode',
  'highlightField',
  'openPreview',
]);

/**
 * MCP tool provider interface — abstracts the in-process MCP server.
 * This avoids importing McpServer directly to keep this module browser-safe.
 */
export interface MCPToolProvider {
  /** Get all tool declarations from the MCP server. */
  getToolDeclarations(): ToolDeclaration[];
  /** Call a tool by name with arguments. */
  callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult>;
}

/**
 * Create a unified ToolContext that dispatches through:
 * 1. Studio UI tools (intercepted locally, no MCP hop)
 * 2. MCP tools (in-process server dispatch)
 */
export function createToolBridge(
  mcpProvider: MCPToolProvider,
  uiHandlers: StudioUIHandlers,
  getProjectSnapshot?: () => Promise<{ definition: Record<string, unknown> } | null>,
  getWorkspaceContext?: () => { selection: { path: string; sourceTab: string } | null; viewport: 'desktop' | 'tablet' | 'mobile' | null },
): ToolContext {
  // Build studio UI tool declarations
  const uiToolDeclarations: ToolDeclaration[] = [
    {
      name: 'revealField',
      description: 'Scroll the structure tree to reveal a field by path.',
      inputSchema: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Field key path to reveal.' } },
        required: ['path'],
      },
    },
    {
      name: 'setRightPanelOpen',
      description: 'Toggle the preview companion panel.',
      inputSchema: {
        type: 'object',
        properties: { open: { type: 'boolean', description: 'True to open, false to close.' } },
        required: ['open'],
      },
    },
    {
      name: 'switchMode',
      description: 'Switch the Studio surface to a different mode.',
      inputSchema: {
        type: 'object',
        properties: { mode: { type: 'string', enum: ['chat', 'edit', 'design', 'preview'], description: 'Target mode.' } },
        required: ['mode'],
      },
    },
    {
      name: 'highlightField',
      description: 'Temporarily highlight a field on the canvas with a pulsing ring.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Field key path to highlight.' },
          durationMs: { type: 'number', description: 'Highlight duration in milliseconds.' },
        },
        required: ['path'],
      },
    },
    {
      name: 'openPreview',
      description: 'Switch to preview mode with an optional viewport.',
      inputSchema: {
        type: 'object',
        properties: { viewport: { type: 'string', enum: ['desktop', 'tablet', 'mobile'], description: 'Viewport to simulate.' } },
        required: [],
      },
    },
  ];

  const mcpDeclarations = mcpProvider.getToolDeclarations();

  // Merge: UI tools first (they intercept), then MCP tools (excluding duplicates)
  const allTools: ToolDeclaration[] = [
    ...uiToolDeclarations,
    ...mcpDeclarations.filter((t) => !STUDIO_UI_TOOL_NAMES.has(t.name)),
  ];

  async function callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    // Studio UI tools intercept first
    if (STUDIO_UI_TOOL_NAMES.has(name)) {
      return dispatchUITool(name, args, uiHandlers);
    }
    // Fall through to MCP
    return mcpProvider.callTool(name, args);
  }

  return {
    tools: allTools,
    callTool,
    getProjectSnapshot: getProjectSnapshot as ToolContext['getProjectSnapshot'],
    getWorkspaceContext,
  };
}

function dispatchUITool(
  name: string,
  args: Record<string, unknown>,
  handlers: StudioUIHandlers,
): ToolCallResult {
  switch (name) {
    case 'revealField': {
      const path = args.path;
      if (typeof path !== 'string') return { content: 'Missing "path" argument.', isError: true };
      if (!handlers.revealField) return { content: 'revealField not available.', isError: true };
      const r = handlers.revealField(path);
      return r.ok
        ? { content: r.reason ?? `Revealed "${path}".`, isError: false }
        : { content: r.reason ?? `Could not reveal "${path}".`, isError: true };
    }
    case 'setRightPanelOpen': {
      const open = args.open;
      if (typeof open !== 'boolean') return { content: 'Missing "open" argument.', isError: true };
      if (!handlers.setRightPanelOpen) return { content: 'setRightPanelOpen not available.', isError: true };
      const r = handlers.setRightPanelOpen(open);
      return r.ok
        ? { content: r.reason ?? `Panel ${open ? 'opened' : 'closed'}.`, isError: false }
        : { content: r.reason ?? 'Failed.', isError: true };
    }
    case 'switchMode': {
      const mode = args.mode;
      if (typeof mode !== 'string') return { content: 'Missing "mode" argument.', isError: true };
      if (!handlers.switchMode) return { content: 'switchMode not available.', isError: true };
      const r = handlers.switchMode(mode);
      return r.ok
        ? { content: r.reason ?? `Switched to ${mode} mode.`, isError: false }
        : { content: r.reason ?? `Could not switch to ${mode}.`, isError: true };
    }
    case 'highlightField': {
      const path = args.path;
      if (typeof path !== 'string') return { content: 'Missing "path" argument.', isError: true };
      if (!handlers.highlightField) return { content: 'highlightField not available.', isError: true };
      const dur = typeof args.durationMs === 'number' ? args.durationMs : undefined;
      const r = handlers.highlightField(path, dur);
      return r.ok
        ? { content: r.reason ?? `Highlighted "${path}".`, isError: false }
        : { content: r.reason ?? `Could not highlight "${path}".`, isError: true };
    }
    case 'openPreview': {
      if (!handlers.openPreview) return { content: 'openPreview not available.', isError: true };
      const vp = typeof args.viewport === 'string' ? args.viewport : undefined;
      const r = handlers.openPreview(vp);
      return r.ok
        ? { content: r.reason ?? `Opened preview${vp ? ` (${vp})` : ''}.`, isError: false }
        : { content: r.reason ?? 'Could not open preview.', isError: true };
    }
    default:
      return { content: `Unknown UI tool: ${name}`, isError: true };
  }
}
