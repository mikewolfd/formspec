import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createProject } from '@formspec-org/studio-core';
import { ProjectProvider } from '../../../src/state/ProjectContext';
import { MappingPreview } from '../../../src/workspaces/mapping/MappingPreview';
import { MappingConfig } from '../../../src/workspaces/mapping/MappingConfig';

function renderPreview() {
  const project = createProject({ seed: {
    definition: { $formspec: '1.0', url: 'urn:test', version: '1.0.0', items: [] } as any,
    mappings: { default: { rules: [] } as any },
  }});
  return render(<ProjectProvider project={project}><MappingPreview /></ProjectProvider>);
}

function renderConfig(direction?: string) {
  const project = createProject({ seed: {
    definition: { $formspec: '1.0', url: 'urn:mapping-config', version: '1.0.0', items: [] } as any,
    mappings: { default: { direction: direction ?? 'unset', rules: [] } as any },
  }});
  return render(<ProjectProvider project={project}><MappingConfig /></ProjectProvider>);
}

describe('MappingPreview', () => {
  it('shows preview mode toggle', () => {
    renderPreview();
    expect(screen.getByRole('button', { name: /forward preview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reverse preview/i })).toBeInTheDocument();
  });

  it('shows input and output panels', () => {
    renderPreview();
    expect(screen.getByTestId('preview-source-header')).toBeInTheDocument();
    expect(screen.getByTestId('preview-output-header')).toBeInTheDocument();
  });
});

// Bug #31: Pressing Escape does not close the direction picker in the mapping config
describe('MappingConfig direction picker', () => {
  it('opens a picker when the direction value is clicked', async () => {
    renderConfig('outbound');

    const picker = screen.getByTestId('direction-picker');
    await act(async () => {
      fireEvent.click(picker);
    });

    // A picker / dropdown with direction options should now be visible
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('closes the direction picker when Escape is pressed', async () => {
    renderConfig('outbound');

    const picker = screen.getByTestId('direction-picker');
    await act(async () => {
      fireEvent.click(picker);
    });

    // Verify picker is open by checking for an option like "forward"
    expect(screen.getByText(/^forward$/i)).toBeInTheDocument();

    // Press Escape — the picker should close
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    // After Escape, the picker options should no longer be visible
    expect(screen.queryByText(/^forward$/i)).not.toBeInTheDocument();
  });
});
