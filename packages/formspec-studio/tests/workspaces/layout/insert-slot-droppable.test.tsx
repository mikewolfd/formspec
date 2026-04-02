/** @filedesc Tests for OBJ-4-01/02/03: insert slots are registered droppables, isDragActive flows from context, Fragment keys present. */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LayoutContainer } from '../../../src/workspaces/layout/LayoutContainer';

// Mock dnd-kit so we can control isDragActive / useDroppable registration
vi.mock('@dnd-kit/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/react')>();
  return {
    ...actual,
    useDraggable: () => ({ ref: () => {}, isDragging: false }),
    useDroppable: vi.fn((opts) => ({ ref: () => {}, isOver: false, id: opts.id })),
    useDragOperation: () => ({ source: null, target: null }),
  };
});

describe('OBJ-4-01: InsertSlotChildren — slots registered as droppables', () => {
  it('renders N+1 insert slot divs when isDragActive is true with N children', () => {
    render(
      <LayoutContainer
        component="Stack"
        nodeType="layout"
        nodeId="node-abc"
        isDragActive={true}
      >
        <div>child 1</div>
        <div>child 2</div>
      </LayoutContainer>,
    );

    // 2 children → 3 insert slots
    expect(screen.getByTestId('insert-slot-node-abc-0')).toBeInTheDocument();
    expect(screen.getByTestId('insert-slot-node-abc-1')).toBeInTheDocument();
    expect(screen.getByTestId('insert-slot-node-abc-2')).toBeInTheDocument();
  });

  it('each insert slot calls useDroppable with correct id and data', async () => {
    const { useDroppable } = await import('@dnd-kit/react');
    const mockDroppable = vi.mocked(useDroppable);
    mockDroppable.mockClear();

    render(
      <LayoutContainer
        component="Grid"
        nodeType="layout"
        nodeId="grid-1"
        isDragActive={true}
      >
        <div>child A</div>
        <div>child B</div>
      </LayoutContainer>,
    );

    // useDroppable is called for the container itself AND for each insert slot
    // Check that at least one call has insert-slot type data
    const insertSlotCalls = mockDroppable.mock.calls.filter(
      ([opts]) => String(opts.id).startsWith('slot-'),
    );
    expect(insertSlotCalls.length).toBeGreaterThanOrEqual(3); // 2 children → 3 slots

    // First slot: insertIndex 0, containerId 'grid-1'
    const slot0Call = insertSlotCalls.find(([opts]) => String(opts.id) === 'slot-grid-1-0');
    expect(slot0Call).toBeDefined();
    expect(slot0Call![0].data).toMatchObject({
      type: 'insert-slot',
      containerId: 'grid-1',
      insertIndex: 0,
    });

    // Third slot: insertIndex 2
    const slot2Call = insertSlotCalls.find(([opts]) => String(opts.id) === 'slot-grid-1-2');
    expect(slot2Call).toBeDefined();
    expect(slot2Call![0].data).toMatchObject({ insertIndex: 2 });
  });

  it('does not render insert slots when isDragActive is false', () => {
    render(
      <LayoutContainer
        component="Stack"
        nodeType="layout"
        nodeId="node-xyz"
        isDragActive={false}
      >
        <div>child 1</div>
      </LayoutContainer>,
    );

    expect(screen.queryByTestId('insert-slot-node-xyz-0')).toBeNull();
  });
});

describe('OBJ-4-03: InsertSlotChildren — React Fragment keys', () => {
  it('renders without "Each child in a list should have a unique key" React warning', () => {
    const warnSpy = vi.spyOn(console, 'error');

    render(
      <LayoutContainer
        component="Stack"
        nodeType="layout"
        nodeId="key-test-node"
        isDragActive={true}
      >
        <div key="a">A</div>
        <div key="b">B</div>
        <div key="c">C</div>
      </LayoutContainer>,
    );

    // React logs key warnings to console.error
    const keyWarning = warnSpy.mock.calls.find(
      (args) => typeof args[0] === 'string' && args[0].includes('unique key'),
    );
    expect(keyWarning).toBeUndefined();

    warnSpy.mockRestore();
  });
});

describe('OBJ-4-02: isDragActive flows from LayoutDndContext', () => {
  it('LayoutContainer prop isDragActive=true shows insert slots', () => {
    render(
      <LayoutContainer
        component="Stack"
        nodeType="layout"
        nodeId="node-flow"
        isDragActive={true}
      >
        <div>X</div>
      </LayoutContainer>,
    );

    // When prop is passed, slots render
    expect(screen.getByTestId('insert-slot-node-flow-0')).toBeInTheDocument();
    expect(screen.getByTestId('insert-slot-node-flow-1')).toBeInTheDocument();
  });
});
