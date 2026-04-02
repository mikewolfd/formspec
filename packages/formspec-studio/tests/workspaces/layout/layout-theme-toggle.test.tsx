/** @filedesc Tests for LayoutThemeToggle — Layout/Theme mode segmented control for the Layout workspace. */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LayoutThemeToggle, type LayoutMode } from '../../../src/workspaces/layout/LayoutThemeToggle';

describe('LayoutThemeToggle', () => {
  it('renders a radiogroup with Layout and Theme options', () => {
    render(
      <LayoutThemeToggle activeMode="layout" onModeChange={vi.fn()} />,
    );
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Layout' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Theme' })).toBeInTheDocument();
  });

  it('marks Layout as checked when activeMode is layout', () => {
    render(
      <LayoutThemeToggle activeMode="layout" onModeChange={vi.fn()} />,
    );
    expect(screen.getByRole('radio', { name: 'Layout' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Theme' })).toHaveAttribute('aria-checked', 'false');
  });

  it('marks Theme as checked when activeMode is theme', () => {
    render(
      <LayoutThemeToggle activeMode="theme" onModeChange={vi.fn()} />,
    );
    expect(screen.getByRole('radio', { name: 'Theme' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Layout' })).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onModeChange with "theme" when Theme is clicked', () => {
    const onModeChange = vi.fn();
    render(
      <LayoutThemeToggle activeMode="layout" onModeChange={onModeChange} />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Theme' }));
    expect(onModeChange).toHaveBeenCalledWith('theme');
  });

  it('calls onModeChange with "layout" when Layout is clicked', () => {
    const onModeChange = vi.fn();
    render(
      <LayoutThemeToggle activeMode="theme" onModeChange={onModeChange} />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Layout' }));
    expect(onModeChange).toHaveBeenCalledWith('layout');
  });

  it('does not call onModeChange when active option is clicked again', () => {
    const onModeChange = vi.fn();
    render(
      <LayoutThemeToggle activeMode="layout" onModeChange={onModeChange} />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Layout' }));
    expect(onModeChange).not.toHaveBeenCalled();
  });

  it('supports arrow key navigation from Layout to Theme', () => {
    const onModeChange = vi.fn();
    render(
      <LayoutThemeToggle activeMode="layout" onModeChange={onModeChange} />,
    );
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Layout' }), { key: 'ArrowRight' });
    expect(onModeChange).toHaveBeenCalledWith('theme');
  });

  it('supports arrow key navigation from Theme to Layout', () => {
    const onModeChange = vi.fn();
    render(
      <LayoutThemeToggle activeMode="theme" onModeChange={onModeChange} />,
    );
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Theme' }), { key: 'ArrowLeft' });
    expect(onModeChange).toHaveBeenCalledWith('layout');
  });

  it('wraps arrow key navigation from Theme back to Layout (ArrowRight)', () => {
    const onModeChange = vi.fn();
    render(
      <LayoutThemeToggle activeMode="theme" onModeChange={onModeChange} />,
    );
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Theme' }), { key: 'ArrowRight' });
    expect(onModeChange).toHaveBeenCalledWith('layout');
  });

  it('exports LayoutMode type correctly', () => {
    // Type assertion - if it compiles this test passes
    const mode: LayoutMode = 'layout';
    expect(['layout', 'theme']).toContain(mode);
  });
});
