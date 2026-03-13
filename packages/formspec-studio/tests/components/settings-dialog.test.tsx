import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createProject } from 'formspec-studio-core';
import { ProjectProvider } from '../../src/state/ProjectContext';
import { SelectionProvider } from '../../src/state/useSelection';
import { SettingsDialog } from '../../src/components/SettingsDialog';

const fullDef = {
  $formspec: '1.0',
  url: 'urn:formspec:test',
  version: '1.2.0',
  status: 'draft' as const,
  title: 'My Test Form',
  name: 'test-form',
  description: 'A test form description',
  date: '2026-01-15',
  nonRelevantBehavior: 'remove' as const,
  items: [],
  formPresentation: {
    pageMode: 'single',
    labelPosition: 'top',
    density: 'comfortable',
    defaultCurrency: 'USD',
  },
};

function renderDialog(opts: { def?: any; open?: boolean; onClose?: () => void } = {}) {
  const project = createProject({ seed: { definition: opts.def || fullDef } });
  const onClose = opts.onClose ?? vi.fn();
  const result = render(
    <ProjectProvider project={project}>
      <SelectionProvider>
        <SettingsDialog open={opts.open ?? true} onClose={onClose} />
      </SelectionProvider>
    </ProjectProvider>,
  );
  return { ...result, project, onClose };
}

describe('SettingsDialog', () => {
  describe('open / close', () => {
    it('renders nothing when closed', () => {
      renderDialog({ open: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders a dialog when open', () => {
      renderDialog();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('calls onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      renderDialog({ onClose });
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when clicking the backdrop', () => {
      const onClose = vi.fn();
      renderDialog({ onClose });
      // The backdrop is the outermost fixed overlay
      const backdrop = screen.getByRole('dialog').parentElement!;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('identity fields', () => {
    it('displays the title in an editable input', () => {
      renderDialog();
      expect(screen.getByLabelText('Title')).toHaveValue('My Test Form');
    });

    it('displays the name in an editable input', () => {
      renderDialog();
      expect(screen.getByLabelText('Name')).toHaveValue('test-form');
    });

    it('displays description in an editable textarea', () => {
      renderDialog();
      expect(screen.getByLabelText('Description')).toHaveValue('A test form description');
    });

    it('displays version in an editable input', () => {
      renderDialog();
      expect(screen.getByLabelText('Version')).toHaveValue('1.2.0');
    });

    it('displays status as a select', () => {
      renderDialog();
      expect(screen.getByLabelText('Status')).toHaveValue('draft');
    });

    it('displays date in a date input', () => {
      renderDialog();
      expect(screen.getByLabelText('Date')).toHaveValue('2026-01-15');
    });

    it('shows $formspec version as read-only', () => {
      renderDialog();
      expect(screen.getByText('1.0')).toBeInTheDocument();
    });

    it('shows url as read-only', () => {
      renderDialog();
      expect(screen.getByText('urn:formspec:test')).toBeInTheDocument();
    });
  });

  describe('presentation fields', () => {
    it('displays pageMode as a select', () => {
      renderDialog();
      expect(screen.getByLabelText('Page Mode')).toHaveValue('single');
    });

    it('displays labelPosition as a select', () => {
      renderDialog();
      expect(screen.getByLabelText('Label Position')).toHaveValue('top');
    });

    it('displays density as a select', () => {
      renderDialog();
      expect(screen.getByLabelText('Density')).toHaveValue('comfortable');
    });

    it('displays defaultCurrency as text input', () => {
      renderDialog();
      expect(screen.getByLabelText('Default Currency')).toHaveValue('USD');
    });
  });

  describe('behavior fields', () => {
    it('displays nonRelevantBehavior as a select', () => {
      renderDialog();
      expect(screen.getByLabelText('Non-Relevant Behavior')).toHaveValue('remove');
    });
  });

  describe('mutations', () => {
    it('dispatches setDefinitionProperty when title changes', () => {
      const { project } = renderDialog();
      const spy = vi.spyOn(project, 'dispatch');

      const input = screen.getByLabelText('Title');
      fireEvent.change(input, { target: { value: 'New Title' } });
      fireEvent.blur(input);

      expect(spy).toHaveBeenCalledWith({
        type: 'definition.setDefinitionProperty',
        payload: { property: 'title', value: 'New Title' },
      });
    });

    it('dispatches setDefinitionProperty when status changes', () => {
      const { project } = renderDialog();
      const spy = vi.spyOn(project, 'dispatch');

      fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } });

      expect(spy).toHaveBeenCalledWith({
        type: 'definition.setDefinitionProperty',
        payload: { property: 'status', value: 'active' },
      });
    });

    it('dispatches setFormPresentation when pageMode changes', () => {
      const { project } = renderDialog();
      const spy = vi.spyOn(project, 'dispatch');

      fireEvent.change(screen.getByLabelText('Page Mode'), { target: { value: 'wizard' } });

      expect(spy).toHaveBeenCalledWith({
        type: 'definition.setFormPresentation',
        payload: { property: 'pageMode', value: 'wizard' },
      });
    });

    it('dispatches setDefinitionProperty when nonRelevantBehavior changes', () => {
      const { project } = renderDialog();
      const spy = vi.spyOn(project, 'dispatch');

      fireEvent.change(screen.getByLabelText('Non-Relevant Behavior'), { target: { value: 'keep' } });

      expect(spy).toHaveBeenCalledWith({
        type: 'definition.setDefinitionProperty',
        payload: { property: 'nonRelevantBehavior', value: 'keep' },
      });
    });

    it('dispatches setFormPresentation when density changes', () => {
      const { project } = renderDialog();
      const spy = vi.spyOn(project, 'dispatch');

      fireEvent.change(screen.getByLabelText('Density'), { target: { value: 'compact' } });

      expect(spy).toHaveBeenCalledWith({
        type: 'definition.setFormPresentation',
        payload: { property: 'density', value: 'compact' },
      });
    });
  });

  describe('help tooltips', () => {
    it('shows help icons for fields with help text', () => {
      renderDialog();
      const helpIcons = screen.getAllByLabelText('Help');
      // Every editable field + read-only rows should have a help icon
      expect(helpIcons.length).toBeGreaterThanOrEqual(10);
    });

    it('shows tooltip text on hover', () => {
      renderDialog();
      const helpIcons = screen.getAllByLabelText('Help');
      // Hover over the first help icon
      fireEvent.mouseEnter(helpIcons[0].closest('[class*="cursor-help"]')!);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', () => {
      renderDialog();
      const helpIcons = screen.getAllByLabelText('Help');
      const wrapper = helpIcons[0].closest('[class*="cursor-help"]')!;
      fireEvent.mouseEnter(wrapper);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      fireEvent.mouseLeave(wrapper);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('empty/missing fields', () => {
    it('renders with empty optional fields', () => {
      const minimalDef = {
        $formspec: '1.0',
        url: 'urn:formspec:minimal',
        version: '0.1.0',
        status: 'draft',
        title: 'Minimal',
        items: [],
      };
      renderDialog({ def: minimalDef });

      expect(screen.getByLabelText('Title')).toHaveValue('Minimal');
      expect(screen.getByLabelText('Name')).toHaveValue('');
      expect(screen.getByLabelText('Description')).toHaveValue('');
      expect(screen.getByLabelText('Date')).toHaveValue('');
    });
  });
});
