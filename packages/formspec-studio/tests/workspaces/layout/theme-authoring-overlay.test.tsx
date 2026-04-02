/** @filedesc Tests for ThemeAuthoringOverlay — transparent click-capture overlay for Theme mode field selection. */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeAuthoringOverlay } from '../../../src/workspaces/layout/ThemeAuthoringOverlay';

describe('ThemeAuthoringOverlay', () => {
  it('renders a transparent overlay div above the canvas', () => {
    render(
      <ThemeAuthoringOverlay onFieldSelect={vi.fn()} />,
    );
    const overlay = screen.getByTestId('theme-authoring-overlay');
    expect(overlay).toBeInTheDocument();
  });

  it('covers the parent area with pointer-events all', () => {
    render(
      <ThemeAuthoringOverlay onFieldSelect={vi.fn()} />,
    );
    const overlay = screen.getByTestId('theme-authoring-overlay');
    // Should be positioned absolutely to cover parent
    expect(overlay.className).toMatch(/absolute|inset-0/);
  });

  it('calls onFieldSelect with itemKey when a data-bind element is found at click point', async () => {
    const onFieldSelect = vi.fn();

    // Mock document.elementFromPoint to return an element with data-bind
    const fakeEl = document.createElement('div');
    fakeEl.dataset.bind = 'email';
    const origFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn().mockReturnValue(fakeEl);

    const { container } = render(
      <ThemeAuthoringOverlay onFieldSelect={onFieldSelect} />,
    );

    const overlay = screen.getByTestId('theme-authoring-overlay');
    await act(async () => {
      fireEvent.click(overlay, { clientX: 100, clientY: 200 });
    });

    // Overlay temporarily hides itself to allow elementFromPoint — passes key + position
    expect(onFieldSelect).toHaveBeenCalledWith('email', { x: 100, y: 200 });

    document.elementFromPoint = origFromPoint;
  });

  it('does not call onFieldSelect when click lands on non-field area (no data-bind)', async () => {
    const onFieldSelect = vi.fn();

    // elementFromPoint returns element without data-bind
    const fakeEl = document.createElement('div');
    const origFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn().mockReturnValue(fakeEl);

    render(
      <ThemeAuthoringOverlay onFieldSelect={onFieldSelect} />,
    );

    const overlay = screen.getByTestId('theme-authoring-overlay');
    await act(async () => {
      fireEvent.click(overlay, { clientX: 100, clientY: 200 });
    });

    expect(onFieldSelect).not.toHaveBeenCalled();

    document.elementFromPoint = origFromPoint;
  });

  it('walks up the DOM to find data-bind on an ancestor', async () => {
    const onFieldSelect = vi.fn();

    // elementFromPoint returns a child element; parent has data-bind
    const parent = document.createElement('div');
    parent.dataset.bind = 'name';
    const child = document.createElement('span');
    parent.appendChild(child);

    const origFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn().mockReturnValue(child);

    render(
      <ThemeAuthoringOverlay onFieldSelect={onFieldSelect} />,
    );

    const overlay = screen.getByTestId('theme-authoring-overlay');
    await act(async () => {
      fireEvent.click(overlay, { clientX: 50, clientY: 50 });
    });

    expect(onFieldSelect).toHaveBeenCalledWith('name', { x: 50, y: 50 });

    document.elementFromPoint = origFromPoint;
  });

  it('accepts optional selectedItemKey prop to highlight active field', () => {
    render(
      <ThemeAuthoringOverlay onFieldSelect={vi.fn()} selectedItemKey="email" />,
    );
    const overlay = screen.getByTestId('theme-authoring-overlay');
    expect(overlay).toBeInTheDocument();
    // selectedItemKey is accepted without errors
  });
});
