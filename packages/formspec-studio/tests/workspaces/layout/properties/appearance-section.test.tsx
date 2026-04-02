/** @filedesc Tests for additional editable controls in AppearanceSection (compact, help text position, error display, input size, floating label). */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createProject } from '@formspec-org/studio-core';
import { ProjectProvider } from '../../../../src/state/ProjectContext';
import { AppearanceSection } from '../../../../src/workspaces/layout/properties/AppearanceSection';

function renderAppearance(itemKey = 'name', overrides?: Record<string, unknown>) {
  const project = createProject({
    seed: {
      definition: {
        $formspec: '1.0', url: 'urn:appearance-test', version: '1.0.0',
        items: [{ key: 'name', type: 'field', dataType: 'string', label: 'Full Name' }],
      } as any,
      theme: overrides ? {
        itemOverrides: { name: overrides },
      } as any : undefined,
    },
  });
  return {
    project,
    ...render(
      <ProjectProvider project={project}>
        <AppearanceSection itemKey={itemKey} itemType="field" />
      </ProjectProvider>,
    ),
  };
}

describe('AppearanceSection — additional controls', () => {
  it('renders a compact mode select', () => {
    renderAppearance();
    expect(screen.getByLabelText('Compact Mode')).toBeInTheDocument();
  });

  it('renders a help text position select', () => {
    renderAppearance();
    expect(screen.getByLabelText('Help Text Position')).toBeInTheDocument();
  });

  it('renders an error display select', () => {
    renderAppearance();
    expect(screen.getByLabelText('Error Display')).toBeInTheDocument();
  });

  it('renders an input size select', () => {
    renderAppearance();
    expect(screen.getByLabelText('Input Size')).toBeInTheDocument();
  });

  it('renders a floating label checkbox', () => {
    renderAppearance();
    expect(screen.getByLabelText('Floating Label')).toBeInTheDocument();
  });

  it('calls setItemOverride when compact mode changes', async () => {
    const { project } = renderAppearance();
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Compact Mode'), { target: { value: 'compact' } });
    });
    // Verify the project received the override (theme cascade reflects it)
    const node = project.componentFor('name');
    // setItemOverride stores on the theme — check via state
    expect((project.state.theme as any)?.items?.name?.compact).toBe('compact');
  });

  it('calls setItemOverride when input size changes', async () => {
    const { project } = renderAppearance();
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Input Size'), { target: { value: 'lg' } });
    });
    expect((project.state.theme as any)?.items?.name?.inputSize).toBe('lg');
  });

  it('calls setItemOverride when floating label is toggled', async () => {
    const { project } = renderAppearance();
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Floating Label'));
    });
    expect((project.state.theme as any)?.items?.name?.floatingLabel).toBe(true);
  });
});
