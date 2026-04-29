import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { createProject } from '@formspec-org/studio-core';
import { ChangesetReviewSection } from '../../../src/components/chat/ChangesetReviewSection';
import { recordAiPatchLifecycle } from '../../../src/workspaces/shared/studio-intelligence-writer';
import type { ChangesetReviewData } from '../../../src/components/ChangesetReview';

/**
 * Controllable ResizeObserver mock.
 * Default container width is wide (>420px → full review). Call `setMockContainerWidth(360)`
 * inside a test to flip into compact mode before rendering.
 */
let mockContainerWidth = 1000;
function setMockContainerWidth(width: number) {
  mockContainerWidth = width;
}
const observers = new Set<{ cb: ResizeObserverCallback; node: Element }>();
class MockResizeObserver implements ResizeObserver {
  constructor(private cb: ResizeObserverCallback) {}
  observe(target: Element): void {
    observers.add({ cb: this.cb, node: target });
    // Fire synchronously on observe with the current mock width so initial render reflects it.
    this.cb(
      [{
        target,
        contentRect: { width: mockContainerWidth, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRectReadOnly,
        borderBoxSize: [{ inlineSize: mockContainerWidth, blockSize: 0 }],
        contentBoxSize: [{ inlineSize: mockContainerWidth, blockSize: 0 }],
        devicePixelContentBoxSize: [{ inlineSize: mockContainerWidth, blockSize: 0 }],
      } as ResizeObserverEntry],
      this,
    );
  }
  unobserve(): void {}
  disconnect(): void {
    for (const o of [...observers]) if (o.cb === this.cb) observers.delete(o);
  }
}

beforeEach(() => {
  mockContainerWidth = 1000;
  observers.clear();
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
});
afterEach(() => {
  observers.clear();
});

function makeChangeset(overrides?: Partial<ChangesetReviewData>): ChangesetReviewData {
  return {
    id: 'cs-1',
    status: 'pending',
    label: 'AI update',
    aiEntries: [
      {
        toolName: 'set_bind',
        summary: 'Add required bind',
        affectedPaths: ['items.name'],
        warnings: [],
      },
    ],
    userOverlay: [],
    dependencyGroups: [],
    ...overrides,
  };
}

const noop = {
  onAcceptGroup: vi.fn(),
  onRejectGroup: vi.fn(),
  onAcceptAll: vi.fn(),
  onRejectAll: vi.fn(),
};

describe('ChangesetReviewSection', () => {
  it('renders full review by default', () => {
    render(<ChangesetReviewSection changeset={makeChangeset()} diagnostics={[]} mergeMessage={null} {...noop} />);
    expect(screen.getByTestId('changeset-review')).toBeInTheDocument();
  });

  it('renders diagnostics when provided', () => {
    render(
      <ChangesetReviewSection
        changeset={makeChangeset()}
        diagnostics={[
          { severity: 'error', message: 'Missing field X', path: 'items.x' },
          { severity: 'warning', message: 'Deprecated feature' },
        ]}
        mergeMessage={null}
        {...noop}
      />,
    );
    expect(screen.getByTestId('merge-diagnostics')).toBeInTheDocument();
    expect(screen.getByTestId('diagnostic-0')).toHaveTextContent('Missing field X');
    expect(screen.getByTestId('diagnostic-1')).toHaveTextContent('Deprecated feature');
  });

  it('renders merge message when provided', () => {
    render(
      <ChangesetReviewSection
        changeset={makeChangeset()}
        diagnostics={[]}
        mergeMessage="All changes merged successfully"
        {...noop}
      />,
    );
    expect(screen.getByTestId('merge-message')).toHaveTextContent('All changes merged successfully');
  });

  it('renders provenance panel when project is provided with matching intelligence', () => {
    const project = createProject();
    recordAiPatchLifecycle(project, {
      changesetId: 'cs-1',
      summary: 'Bind update',
      affectedRefs: ['items.name'],
      status: 'accepted',
      capability: 'bind_rules',
    });

    render(
      <ChangesetReviewSection
        changeset={makeChangeset()}
        diagnostics={[]}
        mergeMessage={null}
        project={project}
        {...noop}
      />,
    );

    expect(screen.getByTestId('mutation-provenance-panel')).toBeInTheDocument();
  });

  describe('compact bar', () => {
    beforeEach(() => {
      setMockContainerWidth(360);
    });

    it('renders accept/reject/view buttons when status is non-terminal', () => {
      render(
        <ChangesetReviewSection
          changeset={makeChangeset({ status: 'pending' })}
          diagnostics={[]}
          mergeMessage={null}
          {...noop}
        />,
      );

      expect(screen.getByTestId('compact-accept-all')).toBeInTheDocument();
      expect(screen.getByTestId('compact-reject-all')).toBeInTheDocument();
      expect(screen.getByTestId('compact-view-details')).toBeInTheDocument();
    });

    it('hides action buttons when status is terminal (merged)', () => {
      render(
        <ChangesetReviewSection
          changeset={makeChangeset({ status: 'merged' })}
          diagnostics={[]}
          mergeMessage="Done"
          {...noop}
        />,
      );

      expect(screen.queryByTestId('compact-accept-all')).not.toBeInTheDocument();
      expect(screen.queryByTestId('compact-reject-all')).not.toBeInTheDocument();
      expect(screen.queryByTestId('compact-view-details')).not.toBeInTheDocument();
    });

    it('hides action buttons when status is terminal (rejected)', () => {
      render(
        <ChangesetReviewSection
          changeset={makeChangeset({ status: 'rejected' })}
          diagnostics={[]}
          mergeMessage={null}
          {...noop}
        />,
      );

      expect(screen.queryByTestId('compact-accept-all')).not.toBeInTheDocument();
    });

    it('fires onAcceptAll when compact Accept clicked', () => {
      const onAcceptAll = vi.fn();
      render(
        <ChangesetReviewSection
          changeset={makeChangeset()}
          diagnostics={[]}
          mergeMessage={null}
          {...noop}
          onAcceptAll={onAcceptAll}
        />,
      );

      fireEvent.click(screen.getByTestId('compact-accept-all'));
      expect(onAcceptAll).toHaveBeenCalledOnce();
    });

    it('fires onRejectAll when compact Reject clicked', () => {
      const onRejectAll = vi.fn();
      render(
        <ChangesetReviewSection
          changeset={makeChangeset()}
          diagnostics={[]}
          mergeMessage={null}
          {...noop}
          onRejectAll={onRejectAll}
        />,
      );

      fireEvent.click(screen.getByTestId('compact-reject-all'));
      expect(onRejectAll).toHaveBeenCalledOnce();
    });
  });

  describe('drawer', () => {
    beforeEach(() => {
      setMockContainerWidth(360);
    });

    it('opens drawer when View button clicked', () => {
      render(
        <ChangesetReviewSection
          changeset={makeChangeset()}
          diagnostics={[]}
          mergeMessage={null}
          {...noop}
        />,
      );

      expect(screen.queryByLabelText('Close details')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('compact-view-details'));

      expect(screen.getByLabelText('Close details')).toBeInTheDocument();
    });

    it('closes drawer when close button clicked', () => {
      render(
        <ChangesetReviewSection
          changeset={makeChangeset()}
          diagnostics={[]}
          mergeMessage={null}
          {...noop}
        />,
      );

      fireEvent.click(screen.getByTestId('compact-view-details'));
      expect(screen.getByLabelText('Close details')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Close details'));
      expect(screen.queryByLabelText('Close details')).not.toBeInTheDocument();
    });

    it('closes drawer when backdrop clicked', () => {
      render(
        <ChangesetReviewSection
          changeset={makeChangeset()}
          diagnostics={[]}
          mergeMessage={null}
          {...noop}
        />,
      );

      fireEvent.click(screen.getByTestId('compact-view-details'));

      const overlay = document.querySelector('.changeset-drawer-overlay');
      expect(overlay).toBeInTheDocument();

      fireEvent.click(overlay!);
      expect(screen.queryByLabelText('Close details')).not.toBeInTheDocument();
    });

    it('renders provenance panel inside drawer', () => {
      const project = createProject();
      recordAiPatchLifecycle(project, {
        changesetId: 'cs-1',
        summary: 'Bind update',
        affectedRefs: ['items.name'],
        status: 'accepted',
        capability: 'bind_rules',
      });

      render(
        <ChangesetReviewSection
          changeset={makeChangeset()}
          diagnostics={[]}
          mergeMessage={null}
          project={project}
          {...noop}
        />,
      );

      fireEvent.click(screen.getByTestId('compact-view-details'));

      const drawer = document.querySelector('.changeset-drawer');
      const provenance = drawer!.querySelector('[data-testid="mutation-provenance-panel"]');
      expect(provenance).toBeInTheDocument();
    });

    it('renders diagnostics inside drawer', () => {
      render(
        <ChangesetReviewSection
          changeset={makeChangeset()}
          diagnostics={[{ severity: 'error', message: 'Broken ref', path: 'items.x' }]}
          mergeMessage={null}
          {...noop}
        />,
      );

      fireEvent.click(screen.getByTestId('compact-view-details'));

      const drawer = document.querySelector('.changeset-drawer');
      expect(drawer!.textContent).toContain('Diagnostics');
      expect(drawer!.textContent).toContain('Broken ref');
    });

    it('renders merge message inside drawer', () => {
      render(
        <ChangesetReviewSection
          changeset={makeChangeset()}
          diagnostics={[]}
          mergeMessage="Auto-merged by AI"
          {...noop}
        />,
      );

      fireEvent.click(screen.getByTestId('compact-view-details'));

      const drawer = document.querySelector('.changeset-drawer');
      expect(drawer!.textContent).toContain('Auto-merged by AI');
    });
  });
});
