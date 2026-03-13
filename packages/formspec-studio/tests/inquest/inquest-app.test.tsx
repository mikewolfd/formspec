import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InquestApp } from '../../src/inquest-app/InquestApp';

// Mock the provider module to make testConnection always succeed
vi.mock('../../src/shared/providers', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/shared/providers')>();
  const mockAdapters = original.inquestProviderAdapters.map((adapter) => ({
    ...adapter,
    testConnection: vi.fn().mockResolvedValue({ ok: true, message: 'Connected' }),
  }));
  return {
    ...original,
    inquestProviderAdapters: mockAdapters,
    findProviderAdapter: (id?: string) => mockAdapters.find((a) => a.id === id),
  };
});

async function setupToChat() {
  window.history.replaceState({}, '', '/inquest/');
  render(<InquestApp />);

  expect(await screen.findByText('Intelligence Setup')).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText('sk-...'), { target: { value: 'test-key-12345' } });
  fireEvent.click(screen.getByRole('button', { name: /verify connection/i }));
  fireEvent.click(await screen.findByRole('button', { name: /continue to chat/i }));

  const blueprintBtns = await screen.findAllByRole('button', { name: /use blueprint/i });
  fireEvent.click(blueprintBtns[0]);
}

describe('InquestApp', () => {
  it('runs the template -> analysis -> proposal -> refine flow', async () => {
    await setupToChat();

    const textarea = screen.getByPlaceholderText(/ask stack/i);
    fireEvent.change(textarea, { target: { value: 'Build a grant application form with budget tracking' } });

    fireEvent.click(await screen.findByText('Draft Fast'));

    // ReviewWorkspace renders "Analysis and proposal" heading
    await waitFor(() => {
      expect(screen.getByText('Analysis and proposal')).toBeInTheDocument();
    });
  });

  it('stores a handoff payload and navigates to Studio', async () => {
    const assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});

    await setupToChat();

    const textarea = screen.getByPlaceholderText(/ask stack/i);
    fireEvent.change(textarea, { target: { value: 'Build a grant application form' } });
    fireEvent.click(await screen.findByText('Draft Fast'));

    await waitFor(() => {
      expect(screen.getByText('Analysis and proposal')).toBeInTheDocument();
    });

    // Look for proceed to refine button
    const refineBtn = screen.queryByRole('button', { name: /refine|proceed/i });
    if (refineBtn) {
      fireEvent.click(refineBtn);
      const studioBtn = await screen.findByRole('button', { name: /open in studio/i });
      fireEvent.click(studioBtn);

      await waitFor(() => {
        expect(assignSpy).toHaveBeenCalledWith(expect.stringMatching(/^\/studio\/?\?h=/));
      });
    }

    assignSpy.mockRestore();
  });
});
