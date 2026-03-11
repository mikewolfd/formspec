import { describe, it, expect } from 'vitest';
import { createProject } from '../src/index.js';

describe('breakpoint normalization', () => {
  it('sorts theme breakpoints by minWidth ascending', () => {
    const project = createProject();
    project.batch([
      { type: 'theme.setBreakpoint', payload: { name: 'desktop', minWidth: 1024 } },
      { type: 'theme.setBreakpoint', payload: { name: 'tablet', minWidth: 768 } },
      { type: 'theme.setBreakpoint', payload: { name: 'mobile', minWidth: 320 } },
    ]);

    const keys = Object.keys(project.theme.breakpoints!);
    const values = Object.values(project.theme.breakpoints!);
    expect(keys).toEqual(['mobile', 'tablet', 'desktop']);
    expect(values).toEqual([320, 768, 1024]);
  });

  it('syncs component breakpoints from theme when not independently set', () => {
    const project = createProject();
    project.dispatch({
      type: 'theme.setBreakpoint',
      payload: { name: 'tablet', minWidth: 768 },
    });

    expect(project.component.breakpoints).toBeDefined();
    expect(project.component.breakpoints!.tablet).toBe(768);
  });

  it('preserves independently set component breakpoints', () => {
    const project = createProject();
    project.dispatch({
      type: 'component.setBreakpoint',
      payload: { name: 'custom', minWidth: 500 },
    });
    project.dispatch({
      type: 'theme.setBreakpoint',
      payload: { name: 'tablet', minWidth: 768 },
    });

    // Component keeps its own breakpoint
    expect(project.component.breakpoints!.custom).toBe(500);
  });
});
