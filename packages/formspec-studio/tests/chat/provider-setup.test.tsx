import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ProviderSetup } from '../../src/chat/components/ProviderSetup.js';

describe('ProviderSetup', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
  };

  it('renders when open', () => {
    render(<ProviderSetup {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ProviderSetup {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows provider selection', () => {
    render(<ProviderSetup {...defaultProps} />);
    expect(screen.getByLabelText('Provider')).toBeInTheDocument();
  });

  it('shows API key input', () => {
    render(<ProviderSetup {...defaultProps} />);
    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
  });

  it('validates empty API key on save', () => {
    render(<ProviderSetup {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByText(/required/i)).toBeInTheDocument();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with valid config', () => {
    render(<ProviderSetup {...defaultProps} />);

    // Select provider
    fireEvent.change(screen.getByLabelText('Provider'), {
      target: { value: 'anthropic' },
    });

    // Enter API key
    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: 'sk-ant-test-key' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(defaultProps.onSave).toHaveBeenCalledWith({
      provider: 'anthropic',
      apiKey: 'sk-ant-test-key',
    });
  });

  it('closes on cancel', () => {
    render(<ProviderSetup {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<ProviderSetup open={true} onClose={onClose} onSave={vi.fn()} />);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  describe('initialConfig', () => {
    it('pre-populates provider and API key from initialConfig', () => {
      render(
        <ProviderSetup
          {...defaultProps}
          initialConfig={{ provider: 'google', apiKey: 'goog-key-123' }}
        />,
      );
      expect((screen.getByLabelText('Provider') as HTMLSelectElement).value).toBe('google');
      expect((screen.getByLabelText('API Key') as HTMLInputElement).value).toBe('goog-key-123');
    });

    it('shows Disconnect button when initialConfig is provided', () => {
      const onClear = vi.fn();
      render(
        <ProviderSetup
          {...defaultProps}
          initialConfig={{ provider: 'anthropic', apiKey: 'sk-test' }}
          onClear={onClear}
        />,
      );
      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    });

    it('calls onClear when Disconnect is clicked', () => {
      const onClear = vi.fn();
      render(
        <ProviderSetup
          {...defaultProps}
          initialConfig={{ provider: 'anthropic', apiKey: 'sk-test' }}
          onClear={onClear}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /disconnect/i }));
      expect(onClear).toHaveBeenCalledOnce();
    });

    it('does not show Disconnect button when no initialConfig', () => {
      render(<ProviderSetup {...defaultProps} />);
      expect(screen.queryByRole('button', { name: /disconnect/i })).not.toBeInTheDocument();
    });
  });
});
