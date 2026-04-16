/** @filedesc Integration tests for LayoutContainer — collapsible shell keeps content mounted; accordion toggle. */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LayoutContainer } from '../../../src/workspaces/layout/LayoutContainer';

vi.mock('../../../src/workspaces/layout/LayoutResizeContext', () => ({
  LayoutResizeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLayoutResizeReporter: () => () => {},
}));

describe('LayoutContainer — Collapsible/Accordion shell', () => {
  it('marks content collapsed when closed (stays mounted)', () => {
    const { container } = render(
      <LayoutContainer
        component="Accordion"
        nodeType="layout"
        sortableGroup="root"
        sortableIndex={0}
        nodeId="acc1"
        layoutProps={{ title: 'Test Accordion', defaultOpen: false }}
      >
        <div data-testid="child">child content</div>
      </LayoutContainer>,
    );
    const content = container.querySelector('[data-layout-content]');
    expect(content).not.toBeNull();
    expect(content).toHaveAttribute('data-layout-collapsed', 'true');
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull();
  });

  it('mounts content when open', () => {
    const { container } = render(
      <LayoutContainer
        component="Accordion"
        nodeType="layout"
        sortableGroup="root"
        sortableIndex={0}
        nodeId="acc1"
        layoutProps={{ title: 'Test Accordion', defaultOpen: true }}
      >
        <div data-testid="child">child content</div>
      </LayoutContainer>,
    );
    expect(container.querySelector('[data-layout-content]')).not.toBeNull();
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull();
  });

  it('toggles accordion open from header without unmounting child content', () => {
    const { container } = render(
      <LayoutContainer
        component="Accordion"
        nodeType="layout"
        sortableGroup="root"
        sortableIndex={0}
        nodeId="acc1"
        layoutProps={{ title: 'Test Accordion', defaultOpen: false }}
      >
        <div data-testid="child">child content</div>
      </LayoutContainer>,
    );
    expect(container.querySelector('[data-layout-content]')).toHaveAttribute('data-layout-collapsed', 'true');

    fireEvent.click(screen.getByTestId('layout-select-row'));

    expect(container.querySelector('[data-layout-content]')).not.toHaveAttribute('data-layout-collapsed');
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull();
  });

  it('renders EmptyContainerPlaceholder inside a closed Accordion', () => {
    render(
      <LayoutContainer
        component="Accordion"
        nodeType="layout"
        sortableGroup="root"
        sortableIndex={0}
        nodeId="acc-empty"
        layoutProps={{ title: 'Empty Accordion', defaultOpen: false }}
      />,
    );
    expect(screen.getByTestId('empty-container-placeholder')).toBeInTheDocument();
  });
});
