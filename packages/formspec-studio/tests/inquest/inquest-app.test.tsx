import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InquestApp } from '../../src/inquest-app/InquestApp';

describe('InquestApp', () => {
  it('runs the template -> analysis -> proposal -> refine flow', async () => {
    window.history.replaceState({}, '', '/inquest/');

    render(<InquestApp />);

    expect(await screen.findByText('Bring your own key')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Paste your provider key'), { target: { value: 'demo-key-12345' } });
    fireEvent.click(screen.getAllByRole('button', { name: /use template/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }));

    expect(await screen.findByText('Analysis and proposal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /generate proposal/i }));
    fireEvent.click(await screen.findByRole('button', { name: /open refine workspace/i }));

    expect(await screen.findByText('Adjust the scaffold before handoff')).toBeInTheDocument();
  });

  it('stores a handoff payload and navigates to Studio', async () => {
    const assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    window.history.replaceState({}, '', '/inquest/');

    render(<InquestApp />);

    fireEvent.change(await screen.findByPlaceholderText('Paste your provider key'), { target: { value: 'demo-key-12345' } });
    fireEvent.click(screen.getAllByRole('button', { name: /use template/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }));
    fireEvent.click(await screen.findByRole('button', { name: /generate proposal/i }));
    fireEvent.click(await screen.findByRole('button', { name: /open refine workspace/i }));
    fireEvent.click(await screen.findByRole('button', { name: /open in studio/i }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith(expect.stringMatching(/^\/studio\/?\?h=/));
    });
    assignSpy.mockRestore();
  });
});
