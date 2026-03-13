import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createProject } from 'formspec-studio-core';
import { ProjectProvider } from '../../../../src/state/ProjectContext';
import { AppearanceSection } from '../../../../src/workspaces/editor/properties/AppearanceSection';

function renderAppearance(theme?: Record<string, unknown>, itemKey = 'name', itemType = 'field', itemDataType?: string) {
  const project = createProject({
    seed: {
      definition: { $formspec: '1.0', url: 'urn:test', version: '1.0.0', items: [] } as any,
      theme: theme as any,
    },
  });
  return {
    ...render(
      <ProjectProvider project={project}>
        <AppearanceSection itemKey={itemKey} itemType={itemType} itemDataType={itemDataType} />
      </ProjectProvider>
    ),
    project,
  };
}

describe('AppearanceSection', () => {
  it('renders resolved label position from theme defaults', () => {
    renderAppearance({ defaults: { labelPosition: 'top' } });
    expect(screen.getByText(/top/i)).toBeInTheDocument();
  });

  it('shows provenance for inherited values', () => {
    renderAppearance({ defaults: { labelPosition: 'top' } });
    expect(screen.getByText(/from: default/i)).toBeInTheDocument();
  });

  it('editing dispatches theme.setItemOverride', async () => {
    const { project } = renderAppearance({ defaults: { labelPosition: 'top' } });
    const select = screen.getByLabelText(/label position/i);
    await act(async () => {
      fireEvent.change(select, { target: { value: 'start' } });
    });
    const items = (project.export().theme as any).items;
    expect(items?.name?.labelPosition).toBe('start');
  });

  it('after edit, provenance shows "from: This Field"', async () => {
    renderAppearance({
      defaults: { labelPosition: 'top' },
      items: { name: { labelPosition: 'start' } },
    });
    expect(screen.getByText(/from: this field/i)).toBeInTheDocument();
  });

  it('clear override dispatches theme.deleteItemOverride', async () => {
    const { project } = renderAppearance({
      defaults: { labelPosition: 'top' },
      items: { name: { labelPosition: 'start' } },
    });
    const clearBtn = screen.getByRole('button', { name: /clear override/i });
    await act(async () => { clearBtn.click(); });
    const items = (project.export().theme as any).items;
    expect(items?.name).toBeUndefined();
  });

  it('style sub-section dispatches theme.setItemStyle', async () => {
    const { project } = renderAppearance({});
    // Click "Add style override"
    const addBtn = screen.getByRole('button', { name: /add style/i });
    await act(async () => { addBtn.click(); });
    const keyInput = screen.getByPlaceholderText(/property/i);
    const valInput = screen.getByPlaceholderText(/value/i);
    await act(async () => {
      fireEvent.change(keyInput, { target: { value: 'fontWeight' } });
      fireEvent.change(valInput, { target: { value: 'bold' } });
      fireEvent.keyDown(keyInput, { key: 'Enter' });
    });
    const items = (project.export().theme as any).items;
    expect(items?.name?.style?.fontWeight).toBe('bold');
  });

  it('renders with empty theme defaults showing the section with no provenance', () => {
    renderAppearance({});
    // Should still show the section with position selector but no provenance label
    expect(screen.getByLabelText(/label position/i)).toBeInTheDocument();
    expect(screen.queryByText(/from:/i)).not.toBeInTheDocument();
  });
});
