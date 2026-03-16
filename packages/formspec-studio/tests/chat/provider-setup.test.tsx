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
});
