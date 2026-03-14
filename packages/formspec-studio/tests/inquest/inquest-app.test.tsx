import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InquestApp } from '../../src/inquest-app/InquestApp';

// Clear localStorage before each test to prevent recent-sessions sidebar from
// showing entries from previous tests (they match button selectors and cause
// "Found multiple elements" errors).
beforeEach(() => {
  localStorage.clear();
});

// Delay runAnalysis by 80ms so React can render the GenerateCTA state before review transition
const ANALYSIS_DELAY_MS = 80;

vi.mock('../../src/shared/providers', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/shared/providers')>();
  const mockAdapters = original.inquestProviderAdapters.map((adapter) => ({
    ...adapter,
    testConnection: vi.fn().mockResolvedValue({ ok: true, message: 'Connected' }),
    runAnalysis: vi.fn().mockImplementation(async (input) => {
      await new Promise((resolve) => setTimeout(resolve, ANALYSIS_DELAY_MS));
      return original.buildAnalysis(input);
    }),
    runProposal: vi.fn().mockImplementation(async (input) => {
      await new Promise((resolve) => setTimeout(resolve, ANALYSIS_DELAY_MS));
      return original.buildProposal(input);
    }),
  }));
  return {
    ...original,
    inquestProviderAdapters: mockAdapters,
    findProviderAdapter: (id?: string) => mockAdapters.find((a) => a.id === id),
  };
});

/** Complete the provider setup flow: select Gemini, enter key, verify, continue. */
async function completeProviderSetup() {
  // Provider setup appears on fresh load (session has no providerId)
  expect(await screen.findByText('Intelligence Setup')).toBeInTheDocument();

  // Must select a provider FIRST — session.providerId is undefined by default,
  // so handleTestConnection would return early without this step.
  fireEvent.click(screen.getByRole('button', { name: 'Gemini' }));

  fireEvent.change(screen.getByPlaceholderText('sk-...'), { target: { value: 'test-key-12345' } });
  fireEvent.click(screen.getByRole('button', { name: /verify connection/i }));
  fireEvent.click(await screen.findByRole('button', { name: /continue to chat/i }));
}

/** Click a quick start button to send a prompt directly (bypasses the @assistant-ui composer). */
function clickQuickStart(name: RegExp) {
  const btn = screen.getByRole('button', { name });
  fireEvent.click(btn);
}

describe('InquestApp — Provider Setup', () => {
  it('shows provider setup panel on fresh load before any credentials are stored', async () => {
    window.history.replaceState({}, '', '/inquest/');
    render(<InquestApp />);

    expect(await screen.findByText('Intelligence Setup')).toBeInTheDocument();
    // Provider buttons are present
    expect(screen.getByRole('button', { name: 'Gemini' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OpenAI' })).toBeInTheDocument();
  });

  it('disables Verify Connection button when API key is empty', async () => {
    window.history.replaceState({}, '', '/inquest/');
    render(<InquestApp />);

    await screen.findByText('Intelligence Setup');
    fireEvent.click(screen.getByRole('button', { name: 'Gemini' }));

    // Verify button is disabled until key is entered
    expect(screen.getByRole('button', { name: /verify connection/i })).toBeDisabled();
  });

  it('transitions to chat interface after completing provider setup', async () => {
    window.history.replaceState({}, '', '/inquest/');
    render(<InquestApp />);

    await completeProviderSetup();

    expect(await screen.findByPlaceholderText(/describe the form you need/i)).toBeInTheDocument();
    // Provider setup panel is gone
    expect(screen.queryByText('Intelligence Setup')).not.toBeInTheDocument();
  });
});

describe('InquestApp — Chat / Input Phase', () => {
  it('shows the Stack greeting in the thread on fresh session', async () => {
    window.history.replaceState({}, '', '/inquest/');
    render(<InquestApp />);
    await completeProviderSetup();

    expect(await screen.findByText(/I'm Stack/i)).toBeInTheDocument();
  });

  it('shows quick start buttons when no meaningful input has been provided', async () => {
    window.history.replaceState({}, '', '/inquest/');
    render(<InquestApp />);
    await completeProviderSetup();

    // All four quick starts are visible in the welcome state
    expect(await screen.findByRole('button', { name: /patient intake/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grant application/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /customer survey/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /event registration/i })).toBeInTheDocument();
  });

  it('shows Generate CTA (Draft Fast / Verify Carefully) after meaningful input', async () => {
    window.history.replaceState({}, '', '/inquest/');
    render(<InquestApp />);
    await completeProviderSetup();

    // Quick start sends a prompt and triggers analysis.
    // The CTA appears while analysis is running (isAnalyzing=true, buttons disabled).
    await screen.findByRole('button', { name: /patient intake/i });
    clickQuickStart(/patient intake/i);

    // While the delayed analysis is running, both CTA buttons should be visible
    await waitFor(() => {
      expect(screen.getByText('Draft Fast')).toBeInTheDocument();
      expect(screen.getByText('Verify Carefully')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('hides quick starts and shows the user message after a quick start is clicked', async () => {
    window.history.replaceState({}, '', '/inquest/');
    render(<InquestApp />);
    await completeProviderSetup();

    await screen.findByRole('button', { name: /patient intake/i });
    clickQuickStart(/patient intake/i);

    // Wait for the message to appear in the thread (analysis may still be running)
    await waitFor(() => {
      // User message text appears in the thread
      expect(screen.getByText(/patient intake/i)).toBeInTheDocument();
    });

    // Quick starts are gone (no longer in welcome state)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /event registration/i })).not.toBeInTheDocument();
    });
  });

  it('transitions to review phase when Draft Fast is clicked', async () => {
    window.history.replaceState({}, '', '/inquest/');
    render(<InquestApp />);
    await completeProviderSetup();

    await screen.findByRole('button', { name: /grant application/i });
    clickQuickStart(/grant application/i);

    // Wait for Draft Fast to appear (analysis running, CTA visible)
    const draftFastBtn = await screen.findByText('Draft Fast', {}, { timeout: 3000 });
    fireEvent.click(draftFastBtn);

    // Review workspace renders "Requirements review"
    await waitFor(() => {
      expect(screen.getByText('Requirements review')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('transitions to review phase when Verify Carefully is clicked', async () => {
    window.history.replaceState({}, '', '/inquest/');
    render(<InquestApp />);
    await completeProviderSetup();

    await screen.findByRole('button', { name: /customer survey/i });
    clickQuickStart(/customer survey/i);

    const verifyBtn = await screen.findByText('Verify Carefully', {}, { timeout: 3000 });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText('Requirements review')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});

describe('InquestApp — Review Phase', () => {
  /**
   * Navigate to review via template selection → Draft Fast.
   *
   * Why template gallery instead of quick starts?
   * Quick starts call handleChatNew() which immediately runs handleAnalyze(),
   * disabling the Draft Fast button before it can be clicked. Selecting a template
   * sets session.input.templateId (making meaningfulInput=true) WITHOUT starting
   * analysis, so Draft Fast is enabled and handleGenerateProposal() runs both
   * analysis AND proposal together — resulting in session.proposal being set.
   */
  async function reachReviewViaDraftFast() {
    window.history.replaceState({}, '', '/inquest/');
    render(<InquestApp />);
    await completeProviderSetup();

    // Open blueprint gallery (does NOT trigger analysis)
    fireEvent.click(await screen.findByRole('button', { name: /browse all blueprints/i }));

    // Select first available blueprint — sets templateId, CTA becomes enabled
    const useBlueprintBtns = await screen.findAllByRole('button', { name: /use blueprint/i });
    fireEvent.click(useBlueprintBtns[0]);

    // Draft Fast button is enabled (no analysis in progress)
    const draftFastBtn = await screen.findByText('Draft Fast', {}, { timeout: 3000 });
    fireEvent.click(draftFastBtn);

    // handleGenerateProposal → analysis + proposal → phase = review
    await waitFor(() => {
      expect(screen.getByText('Requirements review')).toBeInTheDocument();
    }, { timeout: 5000 });
  }

  it('shows the field inventory section in review', async () => {
    await reachReviewViaDraftFast();

    expect(screen.getByText(/field inventory/i)).toBeInTheDocument();
  });

  it('shows logic rules section in review', async () => {
    await reachReviewViaDraftFast();

    expect(screen.getByText(/logic rules/i)).toBeInTheDocument();
  });

  it('shows Generate scaffold button when analysis runs without generating proposal (Verify Carefully)', async () => {
    window.history.replaceState({}, '', '/inquest/');
    render(<InquestApp />);
    await completeProviderSetup();

    await screen.findByRole('button', { name: /event registration/i });
    clickQuickStart(/event registration/i);

    const verifyBtn = await screen.findByText('Verify Carefully', {}, { timeout: 3000 });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText('Requirements review')).toBeInTheDocument();
    }, { timeout: 5000 });

    // "Verify Carefully" runs analysis only → no proposal yet → "Generate scaffold" button visible
    expect(screen.getByRole('button', { name: /generate scaffold/i })).toBeInTheDocument();
  });

  it('shows Open Refine button after Draft Fast generates proposal', async () => {
    await reachReviewViaDraftFast();

    // Draft Fast generates both analysis + proposal → "Open Refine →" appears
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open refine/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('transitions to refine phase and navigates to Studio from refine workspace', async () => {
    const assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});

    await reachReviewViaDraftFast();

    const refineBtn = await screen.findByRole('button', { name: /open refine/i });
    fireEvent.click(refineBtn);

    const studioBtn = await screen.findByRole('button', { name: /open in studio/i });
    fireEvent.click(studioBtn);

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith(expect.stringMatching(/^\/studio\/?\?h=/));
    });

    assignSpy.mockRestore();
  });
});

describe('InquestApp — Phase Stepper Navigation', () => {
  it('renders the phase stepper with all three phases visible', async () => {
    window.history.replaceState({}, '', '/inquest/');
    render(<InquestApp />);

    const nav = await screen.findByRole('navigation', { name: /workflow phases/i });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveTextContent('Describe');
    expect(nav).toHaveTextContent('Review');
    expect(nav).toHaveTextContent('Refine');
  });

  it('marks Describe as current and Review/Refine as disabled on initial load', async () => {
    window.history.replaceState({}, '', '/inquest/');
    render(<InquestApp />);

    await screen.findByRole('navigation', { name: /workflow phases/i });

    // Review and Refine buttons are disabled (not yet navigable)
    const reviewBtn = screen.getByRole('button', { name: /review/i });
    const refineBtn = screen.getByRole('button', { name: /refine/i });
    expect(reviewBtn).toBeDisabled();
    expect(refineBtn).toBeDisabled();
  });
});
