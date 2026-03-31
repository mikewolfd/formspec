/** @filedesc Tests for the ScreenerAuthoring orchestrator and ScreenerToggle components. */
import { render, screen, act, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createProject } from '@formspec-org/studio-core';
import { ProjectProvider } from '../../../src/state/ProjectContext';
import { SelectionProvider } from '../../../src/state/useSelection';
import { ScreenerAuthoring } from '../../../src/workspaces/editor/ScreenerAuthoring';

function renderScreener(def?: any) {
  const base = { $formspec: '1.0', url: 'urn:test', version: '1.0.0', items: [] };
  const project = createProject({ seed: { definition: def || base } });
  return { project, ...render(
    <ProjectProvider project={project}>
      <SelectionProvider>
        <ScreenerAuthoring />
      </SelectionProvider>
    </ProjectProvider>,
  ) };
}

describe('ScreenerAuthoring', () => {
  describe('toggle', () => {
    it('shows empty state when no screener exists', () => {
      renderScreener();
      expect(screen.getByText(/set up screening/i)).toBeInTheDocument();
    });

    it('creates a screener when setup button is clicked', async () => {
      const { project } = renderScreener();
      await act(async () => {
        screen.getByRole('button', { name: /set up screening/i }).click();
      });
      expect(project.definition.screener).toBeDefined();
    });

    it('shows active authoring surface when screener exists', () => {
      renderScreener({
        $formspec: '1.0', url: 'urn:test', version: '1.0.0', items: [],
        screener: { items: [], routes: [{ condition: 'true', target: 'urn:default' }] },
      });
      expect(screen.getByText(/screening questions/i)).toBeInTheDocument();
      expect(screen.getByText(/routing rules/i)).toBeInTheDocument();
    });

    it('shows Active pill when screener is configured', () => {
      renderScreener({
        $formspec: '1.0', url: 'urn:test', version: '1.0.0', items: [],
        screener: { items: [], routes: [{ condition: 'true', target: 'urn:default' }] },
      });
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows question and route counts', () => {
      renderScreener({
        $formspec: '1.0', url: 'urn:test', version: '1.0.0', items: [],
        screener: {
          items: [
            { key: 'q1', type: 'field', dataType: 'boolean', label: 'Q1' },
            { key: 'q2', type: 'field', dataType: 'boolean', label: 'Q2' },
          ],
          routes: [
            { condition: '$q1', target: 'urn:a' },
            { condition: 'true', target: 'urn:b' },
          ],
        },
      });
      expect(screen.getByText(/2 questions/i)).toBeInTheDocument();
      expect(screen.getByText(/2 routes/i)).toBeInTheDocument();
    });

    it('removes screener with confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { project } = renderScreener({
        $formspec: '1.0', url: 'urn:test', version: '1.0.0', items: [],
        screener: { items: [], routes: [{ condition: 'true', target: 'urn:default' }] },
      });

      await act(async () => {
        screen.getByRole('button', { name: /remove screener/i }).click();
      });

      expect(confirmSpy).toHaveBeenCalled();
      expect(project.definition.screener).toBeUndefined();
      confirmSpy.mockRestore();
    });

    it('does not remove screener when confirmation is cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { project } = renderScreener({
        $formspec: '1.0', url: 'urn:test', version: '1.0.0', items: [],
        screener: { items: [], routes: [{ condition: 'true', target: 'urn:default' }] },
      });

      await act(async () => {
        screen.getByRole('button', { name: /remove screener/i }).click();
      });

      expect(project.definition.screener).toBeDefined();
      confirmSpy.mockRestore();
    });
  });

  describe('ephemeral notice', () => {
    it('shows ephemeral data notice when screener is not active', () => {
      renderScreener();
      expect(screen.getByText(/answers are used for routing only/i)).toBeInTheDocument();
    });

    it('shows ephemeral data notice when screener is active', () => {
      renderScreener({
        $formspec: '1.0', url: 'urn:test', version: '1.0.0', items: [],
        screener: { items: [], routes: [{ condition: 'true', target: 'urn:default' }] },
      });
      expect(screen.getByText(/answers are used for routing only/i)).toBeInTheDocument();
    });
  });
});
