/** @filedesc Tests for ThemeOverridePopover — cascade provenance display, override controls, dirty guard. */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeOverridePopover, type ThemeOverridePopoverProps } from '../../../src/workspaces/layout/ThemeOverridePopover';
import type { Project } from '@formspec-org/studio-core';

// ── Mock studio-core helpers ─────────────────────────────────────────────────

vi.mock('@formspec-org/studio-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@formspec-org/studio-core')>();
  return {
    ...actual,
    getPropertySources: vi.fn().mockReturnValue([]),
    getEditableThemeProperties: vi.fn().mockReturnValue([
      'labelPosition', 'widget', 'widgetConfig', 'style', 'cssClass', 'accessibility', 'fallback',
    ]),
    setThemeOverride: vi.fn().mockReturnValue({ summary: 'ok', action: {}, affectedPaths: [] }),
    clearThemeOverride: vi.fn().mockReturnValue({ summary: 'ok', action: {}, affectedPaths: [] }),
  };
});

import {
  getPropertySources,
  getEditableThemeProperties,
} from '@formspec-org/studio-core';

function makeProject(): Project {
  return {} as unknown as Project;
}

function makeProps(overrides: Partial<ThemeOverridePopoverProps> = {}): ThemeOverridePopoverProps {
  return {
    open: true,
    itemKey: 'email',
    position: { x: 100, y: 200 },
    project: makeProject(),
    onClose: vi.fn(),
    onSetOverride: vi.fn(),
    onClearOverride: vi.fn(),
    ...overrides,
  };
}

// ── Visibility ────────────────────────────────────────────────────────────────

describe('ThemeOverridePopover — visibility', () => {
  it('renders when open=true', () => {
    render(<ThemeOverridePopover {...makeProps()} />);
    expect(screen.getByTestId('theme-override-popover')).toBeInTheDocument();
  });

  it('does not render when open=false', () => {
    render(<ThemeOverridePopover {...makeProps({ open: false })} />);
    expect(screen.queryByTestId('theme-override-popover')).toBeNull();
  });

  it('shows the item key in the header', () => {
    render(<ThemeOverridePopover {...makeProps({ itemKey: 'emailAddress' })} />);
    expect(screen.getByText(/emailAddress/i)).toBeInTheDocument();
  });
});

// ── Cascade provenance ────────────────────────────────────────────────────────

describe('ThemeOverridePopover — cascade provenance', () => {
  beforeEach(() => {
    vi.mocked(getPropertySources).mockReturnValue([]);
  });

  it('shows property row even when getPropertySources returns empty', () => {
    vi.mocked(getEditableThemeProperties).mockReturnValue(['labelPosition']);
    vi.mocked(getPropertySources).mockReturnValue([]);
    render(<ThemeOverridePopover {...makeProps()} />);
    expect(screen.getByTestId('theme-prop-labelPosition')).toBeInTheDocument();
  });

  it('shows default source badge when cascade has a default level', () => {
    vi.mocked(getEditableThemeProperties).mockReturnValue(['labelPosition']);
    vi.mocked(getPropertySources).mockReturnValue([
      { source: 'default', value: 'top' },
    ]);
    render(<ThemeOverridePopover {...makeProps()} />);
    expect(screen.getByTestId('cascade-source-default-labelPosition')).toBeInTheDocument();
  });

  it('shows selector source badge with detail', () => {
    vi.mocked(getEditableThemeProperties).mockReturnValue(['labelPosition']);
    vi.mocked(getPropertySources).mockReturnValue([
      { source: 'selector', sourceDetail: 'selector #1: field + string', value: 'start' },
    ]);
    render(<ThemeOverridePopover {...makeProps()} />);
    const badge = screen.getByTestId('cascade-source-selector-labelPosition');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toMatch(/selector #1/i);
  });

  it('shows item-override source badge when an override exists', () => {
    vi.mocked(getEditableThemeProperties).mockReturnValue(['cssClass']);
    vi.mocked(getPropertySources).mockReturnValue([
      { source: 'item-override', value: 'my-class' },
    ]);
    render(<ThemeOverridePopover {...makeProps()} />);
    expect(screen.getByTestId('cascade-source-item-override-cssClass')).toBeInTheDocument();
  });

  it('renders all editable properties as rows', () => {
    vi.mocked(getEditableThemeProperties).mockReturnValue(['labelPosition', 'widget', 'cssClass']);
    render(<ThemeOverridePopover {...makeProps()} />);
    expect(screen.getByTestId('theme-prop-labelPosition')).toBeInTheDocument();
    expect(screen.getByTestId('theme-prop-widget')).toBeInTheDocument();
    expect(screen.getByTestId('theme-prop-cssClass')).toBeInTheDocument();
  });
});

// ── Override controls ─────────────────────────────────────────────────────────

describe('ThemeOverridePopover — override controls', () => {
  it('calls onSetOverride when cssClass input is committed (blur)', () => {
    vi.mocked(getEditableThemeProperties).mockReturnValue(['cssClass']);
    vi.mocked(getPropertySources).mockReturnValue([]);
    const onSetOverride = vi.fn();
    render(<ThemeOverridePopover {...makeProps({ onSetOverride })} />);
    const input = screen.getByTestId('override-input-cssClass');
    fireEvent.change(input, { target: { value: 'my-class' } });
    fireEvent.blur(input);
    expect(onSetOverride).toHaveBeenCalledWith('email', 'cssClass', 'my-class');
  });

  it('calls onClearOverride when Clear Override button clicked for a property with item-override', () => {
    vi.mocked(getEditableThemeProperties).mockReturnValue(['cssClass']);
    vi.mocked(getPropertySources).mockReturnValue([
      { source: 'item-override', value: 'my-cls' },
    ]);
    const onClearOverride = vi.fn();
    render(<ThemeOverridePopover {...makeProps({ onClearOverride })} />);
    fireEvent.click(screen.getByTestId('clear-override-cssClass'));
    expect(onClearOverride).toHaveBeenCalledWith('email', 'cssClass');
  });

  it('clear button only visible when item-override source exists', () => {
    vi.mocked(getEditableThemeProperties).mockReturnValue(['cssClass']);
    vi.mocked(getPropertySources).mockReturnValue([
      { source: 'default', value: '' },
    ]);
    render(<ThemeOverridePopover {...makeProps()} />);
    expect(screen.queryByTestId('clear-override-cssClass')).toBeNull();
  });
});

// ── Close and dirty guard ─────────────────────────────────────────────────────

describe('ThemeOverridePopover — close and dirty guard', () => {
  it('calls onClose when close button clicked and no dirty inputs', () => {
    vi.mocked(getEditableThemeProperties).mockReturnValue(['cssClass']);
    vi.mocked(getPropertySources).mockReturnValue([]);
    const onClose = vi.fn();
    render(<ThemeOverridePopover {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows dirty guard when trying to close with uncommitted changes', () => {
    vi.mocked(getEditableThemeProperties).mockReturnValue(['cssClass']);
    vi.mocked(getPropertySources).mockReturnValue([]);
    const onClose = vi.fn();
    render(<ThemeOverridePopover {...makeProps({ onClose })} />);
    fireEvent.change(screen.getByTestId('override-input-cssClass'), { target: { value: 'dirty' } });
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.getByTestId('dirty-guard-confirm')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose after confirming discard in dirty guard', () => {
    vi.mocked(getEditableThemeProperties).mockReturnValue(['cssClass']);
    vi.mocked(getPropertySources).mockReturnValue([]);
    const onClose = vi.fn();
    render(<ThemeOverridePopover {...makeProps({ onClose })} />);
    fireEvent.change(screen.getByTestId('override-input-cssClass'), { target: { value: 'dirty' } });
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    fireEvent.click(screen.getByTestId('dirty-guard-discard'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
