import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { convertToModelMessages, generateText, streamText, type ModelMessage } from 'ai';
import type { 
  AnalysisV1, 
  CommandPatchV1, 
  InquestModelInput, 
  InquestProviderAdapter,
  ProposalV1,
  ConnectionResult,
  InquestMessage
} from '../contracts/inquest';

export const getModel = (providerId: string, apiKey: string) => {
  switch (providerId) {
    case 'gemini':
      return createGoogleGenerativeAI({ apiKey })('gemini-2.0-flash');
    case 'openai':
      return createOpenAI({ apiKey })('gpt-4o');
    case 'anthropic':
      return createAnthropic({ apiKey })('claude-sonnet-4-5-20250514');
    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }
};

export async function streamChat(providerId: string, apiKey: string, messages: any[]) {
  return streamText({
    model: getModel(providerId, apiKey),
    messages: await convertToModelMessages(messages),
  });
}

export function createAiSdkAdapter(providerId: string, label: string): InquestProviderAdapter {

  return {
    id: providerId,
    label,
    capabilities: {
      chat: true,
      images: true,
      pdf: true,
      structuredOutput: true,
      streaming: true,
    },
    async testConnection({ apiKey }): Promise<ConnectionResult> {
      if (!apiKey.trim()) {
        return { ok: false, message: 'Enter an API key to continue.' };
      }
      try {
        // Simple test call
        await generateText({
          model: getModel(providerId, apiKey),
          prompt: 'ping',
        });
        return { ok: true, message: `${label} is connected and ready.` };
      } catch (err: any) {
        return { ok: false, message: err.message || 'Failed to connect.' };
      }
    },
    async runAnalysis(input) {
      // For now, still using the deterministic logic, but we could wrap it with an LLM call if needed.
      // The user wants to "move to vercel chat sdk" so I'll focus on the chat part first.
      // I'll keep the deterministic logic for complex tasks until I have good prompts.
      return (await import('./index')).buildAnalysis(input);
    },
    async runProposal(input) {
      return (await import('./index')).buildProposal(input);
    },
    async runEdit(input) {
      return (await import('./index')).buildEditPatch(input);
    },
  };
}
