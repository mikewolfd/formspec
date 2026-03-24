import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createProject } from 'formspec-studio-core';
import { ProjectProvider } from '../../../src/state/ProjectContext';
import { ActiveGroupProvider } from '../../../src/state/useActiveGroup';
import { PagesTab } from '../../../src/workspaces/pages/PagesTab';

const BASE_DEF = {
  items: [
    { key: 'name', type: 'field', dataType: 'string', label: 'Name' },
    { key: 'email', type: 'field', dataType: 'string', label: 'Email' },
    { key: 'phone', type: 'field', dataType: 'string', label: 'Phone' },
  ],
};

function renderPagesTab(overrides?: {
  definition?: Record<string, unknown>;
  theme?: Record<string, unknown>;
}) {
  const project = createProject({
    seed: {
      definition: { ...BASE_DEF, ...overrides?.definition } as any,
      theme: overrides?.theme as any,
    },
  });

  const result = render(
    <ProjectProvider project={project}>
      <ActiveGroupProvider>
        <PagesTab />
      </ActiveGroupProvider>
    </ProjectProvider>,
  );

  return { ...result, project };
}

function pageCard(pageId: string) {
  return screen.getByTestId(`page-card-${pageId}`);
}

describe('PagesTab', () => {
  it('shows flow mode controls and layout heading', () => {
    renderPagesTab({
      definition: { formPresentation: { pageMode: 'wizard' } },
      theme: {
        pages: [{ id: 'p1', title: 'Step 1', regions: [] }],
      },
    });

    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Single' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wizard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tabs' })).toBeInTheDocument();
  });

  it('single mode with no pages shows guidance', () => {
    renderPagesTab();
    expect(screen.getByText(/switch to wizard or tabs/i)).toBeInTheDocument();
  });

  it('single mode with existing pages shows dormant guidance and badge', () => {
    renderPagesTab({
      definition: { formPresentation: { pageMode: 'single' } },
      theme: {
        pages: [{ id: 'p1', title: 'Step 1', regions: [] }],
      },
    });

    expect(screen.getByText(/preserved but not active/i)).toBeInTheDocument();
    expect(within(pageCard('p1')).getByTestId('dormant-badge')).toHaveTextContent('Dormant');
  });

  it('dormant pages disable page reorder controls', async () => {
    renderPagesTab({
      definition: { formPresentation: { pageMode: 'single' } },
      theme: {
        pages: [
          { id: 'p1', title: 'Step 1', regions: [{ key: 'name', span: 12 }] },
          { id: 'p2', title: 'Step 2', regions: [] },
        ],
      },
    });

    const card = pageCard('p1');

    expect(within(card).getByRole('button', { name: /move step 1 up/i })).toBeDisabled();
    expect(within(card).getByRole('button', { name: /delete page/i })).toBeDisabled();
  });

  it('mode selector updates project flow mode', async () => {
    const { project } = renderPagesTab();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Wizard' }));
    });

    expect(project.definition.formPresentation?.pageMode).toBe('wizard');
  });

  it('add page creates a new card', async () => {
    const { project } = renderPagesTab({
      definition: { formPresentation: { pageMode: 'wizard' } },
      theme: { pages: [{ id: 'p1', title: 'Existing', regions: [] }] },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /add page/i }));
    });

    expect((project.theme.pages as any[]).length).toBe(2);
  });

  it('inline title editing updates the page title', async () => {
    const { project } = renderPagesTab({
      definition: { formPresentation: { pageMode: 'wizard' } },
      theme: {
        pages: [{ id: 'p1', title: 'Original Title', regions: [] }],
      },
    });

    const card = pageCard('p1');
    await act(async () => {
      fireEvent.click(within(card).getByText('Original Title'));
    });

    const input = within(card).getByDisplayValue('Original Title');
    fireEvent.change(input, { target: { value: 'Updated Title' } });

    await act(async () => {
      fireEvent.blur(input);
    });

    expect((project.theme.pages as any[])[0].title).toBe('Updated Title');
  });

  it('inline description editing updates the page description', async () => {
    const { project } = renderPagesTab({
      definition: { formPresentation: { pageMode: 'wizard' } },
      theme: {
        pages: [{ id: 'p1', title: 'Step 1', regions: [] }],
      },
    });

    const card = pageCard('p1');

    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: /add description/i }));
    });

    const input = within(card).getByPlaceholderText(/description/i);
    fireEvent.change(input, { target: { value: 'Fill this out first' } });

    await act(async () => {
      fireEvent.blur(input);
    });

    expect((project.theme.pages as any[])[0].description).toBe('Fill this out first');
  });

  it('shows unassigned items and quick-adds them to a page', async () => {
    const { project } = renderPagesTab({
      definition: { formPresentation: { pageMode: 'wizard' } },
      theme: {
        pages: [{ id: 'p1', title: 'Step 1', regions: [{ key: 'email', span: 12 }] }],
      },
    });

    const card = pageCard('p1');

    expect(screen.getByRole('region', { name: /unassigned items/i })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: /add name to step 1/i }));
    });

    expect(((project.theme.pages as any[])[0].regions ?? []).some((region: any) => region.key === 'name')).toBe(true);
  });

  it('delete action is blocked for non-empty pages with an explanation', async () => {
    renderPagesTab({
      definition: { formPresentation: { pageMode: 'wizard' } },
      theme: {
        pages: [
          { id: 'p1', title: 'Step 1', regions: [{ key: 'name', span: 12 }] },
          { id: 'p2', title: 'Step 2', regions: [] },
        ],
      },
    });

    const card = pageCard('p1');

    expect(within(card).getByText(/move every assigned item off this page before deleting/i)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /delete page/i })).toBeDisabled();
  });

  it('empty pages can be deleted after confirmation', async () => {
    const { project } = renderPagesTab({
      definition: { formPresentation: { pageMode: 'wizard' } },
      theme: {
        pages: [
          { id: 'p1', title: 'Step 1', regions: [] },
          { id: 'p2', title: 'Step 2', regions: [] },
        ],
      },
    });

    const card = pageCard('p2');

    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: /delete page/i }));
    });

    expect(within(card).getByText(/delete step 2 permanently/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: /^confirm delete$/i }));
    });

    expect((project.theme.pages as any[]).map((page: any) => page.id)).toEqual(['p1']);
  });

  it('delete is blocked when only one page exists', async () => {
    renderPagesTab({
      definition: { formPresentation: { pageMode: 'wizard' } },
      theme: {
        pages: [{ id: 'p1', title: 'Only Page', regions: [] }],
      },
    });

    const card = pageCard('p1');

    expect(within(card).getByText(/keep at least one page/i)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /delete page/i })).toBeDisabled();
  });

  it('renders inline grid canvas for assigned items', () => {
    renderPagesTab({
      definition: { formPresentation: { pageMode: 'wizard' } },
      theme: {
        pages: [{ id: 'p1', title: 'Step 1', regions: [{ key: 'name', span: 12 }] }],
      },
    });

    const card = pageCard('p1');
    // GridCanvas renders item labels inside grid blocks
    expect(within(card).getByText('Name')).toBeInTheDocument();
  });
});

describe('PagesTab — undo toast after deletion', () => {
  it('shows undo toast after page deletion and restores page on undo', async () => {
    const { project } = renderPagesTab({
      definition: { formPresentation: { pageMode: 'wizard' } },
      theme: {
        pages: [
          { id: 'p1', title: 'Step 1', regions: [] },
          { id: 'p2', title: 'Step 2', regions: [] },
        ],
      },
    });

    const card = pageCard('p2');

    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: /delete page/i }));
    });
    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: /^confirm delete$/i }));
    });

    // Page was deleted
    expect((project.theme.pages as any[]).map((p: any) => p.id)).toEqual(['p1']);

    // Undo toast is visible with page title
    expect(screen.getByText(/step 2 deleted/i)).toBeInTheDocument();
    const undoButton = screen.getByRole('button', { name: /^undo$/i });
    expect(undoButton).toBeInTheDocument();

    // Click undo restores the page
    await act(async () => {
      fireEvent.click(undoButton);
    });

    expect((project.theme.pages as any[]).map((p: any) => p.id)).toEqual(['p1', 'p2']);
    // Toast disappears after undo
    expect(screen.queryByText(/step 2 deleted/i)).not.toBeInTheDocument();
  });
});
