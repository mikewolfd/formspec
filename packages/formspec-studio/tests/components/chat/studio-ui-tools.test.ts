/** @filedesc Verifies studio-ui-tools dispatch contract: closed taxonomy, structured errors, no silent no-ops. */
import { describe, it, expect, vi } from 'vitest';
import { createStudioUITools } from '../../../src/components/chat/studio-ui-tools';

describe('createStudioUITools', () => {
  it('declares the closed taxonomy of two tools', () => {
    const tools = createStudioUITools({});
    const names = tools.declarations.map((d) => d.name).sort();
    expect(names).toEqual(['revealField', 'setRightPanelOpen']);
  });

  it('exposes a handler for each declaration', () => {
    const tools = createStudioUITools({});
    for (const decl of tools.declarations) {
      expect(typeof tools.handlers[decl.name]).toBe('function');
    }
  });

  describe('revealField', () => {
    it('returns a structured error when path is missing', () => {
      const tools = createStudioUITools({ revealField: () => ({ ok: true }) });
      const result = tools.handlers.revealField({});
      expect(result.isError).toBe(true);
      expect(result.content).toMatch(/path/i);
    });

    it('returns a structured error when path is not a string', () => {
      const tools = createStudioUITools({ revealField: () => ({ ok: true }) });
      const result = tools.handlers.revealField({ path: 42 });
      expect(result.isError).toBe(true);
    });

    it('returns a structured error when handler is not wired', () => {
      const tools = createStudioUITools({});
      const result = tools.handlers.revealField({ path: 'items.foo' });
      expect(result.isError).toBe(true);
      expect(result.content).toMatch(/not wired|not available/i);
    });

    it('propagates handler success and invokes it with the path', () => {
      const handler = vi.fn().mockReturnValue({ ok: true });
      const tools = createStudioUITools({ revealField: handler });
      const result = tools.handlers.revealField({ path: 'items.foo' });
      expect(handler).toHaveBeenCalledWith('items.foo');
      expect(result.isError).toBe(false);
      expect(result.content).toContain('items.foo');
    });

    it('propagates handler failure with the supplied reason', () => {
      const tools = createStudioUITools({
        revealField: () => ({ ok: false, reason: 'Path "items.foo" not found in current definition.' }),
      });
      const result = tools.handlers.revealField({ path: 'items.foo' });
      expect(result.isError).toBe(true);
      expect(result.content).toBe('Path "items.foo" not found in current definition.');
    });
  });

  describe('setRightPanelOpen', () => {
    it('returns a structured error when open is missing', () => {
      const tools = createStudioUITools({ setRightPanelOpen: () => ({ ok: true }) });
      const result = tools.handlers.setRightPanelOpen({});
      expect(result.isError).toBe(true);
    });

    it('returns a structured error when open is not a boolean', () => {
      const tools = createStudioUITools({ setRightPanelOpen: () => ({ ok: true }) });
      const result = tools.handlers.setRightPanelOpen({ open: 'true' });
      expect(result.isError).toBe(true);
    });

    it('returns a structured error when handler is not wired', () => {
      const tools = createStudioUITools({});
      const result = tools.handlers.setRightPanelOpen({ open: true });
      expect(result.isError).toBe(true);
      expect(result.content).toMatch(/not wired|not available/i);
    });

    it('propagates handler success', () => {
      const handler = vi.fn().mockReturnValue({ ok: true });
      const tools = createStudioUITools({ setRightPanelOpen: handler });
      const result = tools.handlers.setRightPanelOpen({ open: true });
      expect(handler).toHaveBeenCalledWith(true);
      expect(result.isError).toBe(false);
      expect(result.content).toMatch(/opened/i);
    });

    it('propagates handler failure with the supplied reason', () => {
      const tools = createStudioUITools({
        setRightPanelOpen: () => ({
          ok: false,
          reason: 'Preview companion is only available in workspace view; switch views first.',
        }),
      });
      const result = tools.handlers.setRightPanelOpen({ open: true });
      expect(result.isError).toBe(true);
      expect(result.content).toMatch(/workspace view/);
    });
  });
});
