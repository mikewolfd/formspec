import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { EntryScreen } from '../../src/chat/components/EntryScreen.js';

describe('EntryScreen', () => {
  const defaultProps = {
    onStartBlank: vi.fn(),
    onSelectTemplate: vi.fn(),
    onUpload: vi.fn(),
    onResumeSession: vi.fn(),
    recentSessions: [] as any[],
  };

  it('renders 4 entry options', () => {
    render(<EntryScreen {...defaultProps} />);

    expect(screen.getByRole('button', { name: /start blank/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /template/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    // Resume only shows when there are recent sessions
  });

  it('calls onStartBlank when blank button clicked', () => {
    render(<EntryScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /start blank/i }));
    expect(defaultProps.onStartBlank).toHaveBeenCalledOnce();
  });

  it('renders template grid with 5 archetypes', () => {
    render(<EntryScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /template/i }));

    // After clicking template, should show template grid
    expect(screen.getByText('Housing Intake Form')).toBeInTheDocument();
    expect(screen.getByText('Grant Application')).toBeInTheDocument();
    expect(screen.getByText('Patient Intake Form')).toBeInTheDocument();
    expect(screen.getByText('Compliance Checklist')).toBeInTheDocument();
    expect(screen.getByText('Employee Onboarding')).toBeInTheDocument();
  });

  it('calls onSelectTemplate with template ID when a template is selected', () => {
    render(<EntryScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /template/i }));
    fireEvent.click(screen.getByText('Grant Application'));
    expect(defaultProps.onSelectTemplate).toHaveBeenCalledWith('grant-application');
  });

  it('calls onUpload when upload button clicked', () => {
    render(<EntryScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(defaultProps.onUpload).toHaveBeenCalledOnce();
  });

  it('shows recent sessions when they exist', () => {
    const sessions = [
      { id: 'sess-1', preview: 'Housing intake form', updatedAt: Date.now(), createdAt: Date.now(), messageCount: 5 },
      { id: 'sess-2', preview: 'Grant application', updatedAt: Date.now() - 1000, createdAt: Date.now() - 2000, messageCount: 3 },
    ];
    render(<EntryScreen {...defaultProps} recentSessions={sessions} />);

    expect(screen.getByText(/housing intake form/i)).toBeInTheDocument();
    expect(screen.getByText(/grant application/i)).toBeInTheDocument();
  });

  it('calls onResumeSession with session ID when a recent session is clicked', () => {
    const sessions = [
      { id: 'sess-1', preview: 'Housing intake', updatedAt: Date.now(), createdAt: Date.now(), messageCount: 5 },
    ];
    render(<EntryScreen {...defaultProps} recentSessions={sessions} />);

    fireEvent.click(screen.getByText(/housing intake/i));
    expect(defaultProps.onResumeSession).toHaveBeenCalledWith('sess-1');
  });

  it('hides resume section when no recent sessions', () => {
    render(<EntryScreen {...defaultProps} recentSessions={[]} />);
    expect(screen.queryByText(/resume/i)).not.toBeInTheDocument();
  });
});
