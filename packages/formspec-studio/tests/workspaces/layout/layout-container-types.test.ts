/** @filedesc Tests that LAYOUT_CONTAINER_COMPONENTS is the single source of truth for both toolbar presets and container type detection. */
import { describe, it, expect } from 'vitest';
import { LAYOUT_CONTAINER_COMPONENTS } from '@formspec-org/studio-core';

describe('LAYOUT_CONTAINER_COMPONENTS canonical set', () => {
  it('is exported from studio-core', () => {
    expect(LAYOUT_CONTAINER_COMPONENTS).toBeDefined();
    expect(LAYOUT_CONTAINER_COMPONENTS).toBeInstanceOf(Set);
  });

  it('includes all core container types', () => {
    expect(LAYOUT_CONTAINER_COMPONENTS.has('Stack')).toBe(true);
    expect(LAYOUT_CONTAINER_COMPONENTS.has('Card')).toBe(true);
    expect(LAYOUT_CONTAINER_COMPONENTS.has('Grid')).toBe(true);
    expect(LAYOUT_CONTAINER_COMPONENTS.has('Panel')).toBe(true);
  });

  it('includes Accordion and Collapsible', () => {
    expect(LAYOUT_CONTAINER_COMPONENTS.has('Accordion')).toBe(true);
    expect(LAYOUT_CONTAINER_COMPONENTS.has('Collapsible')).toBe(true);
  });

  it('includes ConditionalGroup', () => {
    expect(LAYOUT_CONTAINER_COMPONENTS.has('ConditionalGroup')).toBe(true);
  });
});
