import type { InquestProviderAdapter } from 'formspec-shared';
import { createAiSdkAdapter } from './ai-sdk-provider';

export { buildAnalysis, buildProposal, buildEditPatch, createDeterministicAdapter } from './deterministic';
export { createAiSdkAdapter, getModel, streamChat } from './ai-sdk-provider';

export const inquestProviderAdapters: InquestProviderAdapter[] = [
  createAiSdkAdapter('gemini', 'Gemini'),
  createAiSdkAdapter('openai', 'OpenAI'),
  createAiSdkAdapter('anthropic', 'Anthropic'),
];

export function findProviderAdapter(providerId?: string): InquestProviderAdapter | undefined {
  return inquestProviderAdapters.find((adapter) => adapter.id === providerId);
}
