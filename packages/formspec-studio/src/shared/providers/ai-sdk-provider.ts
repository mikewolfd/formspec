import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { convertToModelMessages, generateText, Output, streamText } from 'ai';
import type {
  AnalysisV1,
  CommandPatchV1,
  InquestModelInput,
  InquestProviderAdapter,
  ProposalV1,
  ConnectionResult,
} from '../contracts/inquest';
import { analysisSchema, commandPatchSchema, proposalSchema } from './schemas';
import {
  ANALYSIS_SYSTEM,
  CHAT_SYSTEM,
  EDIT_SYSTEM,
  PROPOSAL_SYSTEM,
  buildAnalysisUserPrompt,
  buildEditUserPrompt,
  buildProposalUserPrompt,
} from './prompts';
import { buildAnalysis, buildEditPatch, buildProposal } from './deterministic';

export function getModel(providerId: string, apiKey: string) {
  switch (providerId) {
    case 'gemini':
      return createGoogleGenerativeAI({ apiKey })('gemini-3-flash-preview');
    case 'openai':
      return createOpenAI({ apiKey })('gpt-4o');
    case 'anthropic':
      return createAnthropic({ apiKey })('claude-sonnet-4-5-20250514');
    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }
}

export async function streamChat(providerId: string, apiKey: string, messages: any[]) {
  return streamText({
    model: getModel(providerId, apiKey),
    system: CHAT_SYSTEM,
    messages: await convertToModelMessages(messages),
  });
}

export function createAiSdkAdapter(providerId: string, label: string): InquestProviderAdapter {
  let apiKey = '';

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

    async testConnection(input): Promise<ConnectionResult> {
      if (!input.apiKey.trim()) {
        return { ok: false, message: 'Enter an API key to continue.' };
      }
      try {
        await generateText({
          model: getModel(providerId, input.apiKey),
          prompt: 'Respond with "ok".',
          maxOutputTokens: 8,
        });
        apiKey = input.apiKey;
        return { ok: true, message: `${label} is connected and ready.` };
      } catch (err: any) {
        return { ok: false, message: err.message || 'Failed to connect.' };
      }
    },

    async runAnalysis(input): Promise<AnalysisV1> {
      if (!apiKey) return buildAnalysis(input);

      try {
        const { output } = await generateText({
          model: getModel(providerId, apiKey),
          system: ANALYSIS_SYSTEM,
          prompt: buildAnalysisUserPrompt(input),
          output: Output.object({ schema: analysisSchema }),
        });

        if (!output) {
          console.warn('LLM returned no structured output for analysis, falling back to deterministic');
          return buildAnalysis(input);
        }

        return output as AnalysisV1;
      } catch (err) {
        console.warn('LLM analysis failed, falling back to deterministic:', err);
        return buildAnalysis(input);
      }
    },

    async runProposal(input): Promise<ProposalV1> {
      if (!apiKey) return buildProposal(input);

      const analysis = input.analysis ?? await this.runAnalysis(input);

      try {
        const { output } = await generateText({
          model: getModel(providerId, apiKey),
          system: PROPOSAL_SYSTEM,
          prompt: buildProposalUserPrompt(input, analysis),
          output: Output.object({ schema: proposalSchema }),
        });

        if (!output) {
          console.warn('LLM returned no structured output for proposal, falling back to deterministic');
          return buildProposal({ ...input, analysis });
        }

        return output as ProposalV1;
      } catch (err) {
        console.warn('LLM proposal failed, falling back to deterministic:', err);
        return buildProposal({ ...input, analysis });
      }
    },

    async runEdit(input): Promise<CommandPatchV1> {
      if (!apiKey) return buildEditPatch(input);

      try {
        const { output } = await generateText({
          model: getModel(providerId, apiKey),
          system: EDIT_SYSTEM,
          prompt: buildEditUserPrompt(input),
          output: Output.object({ schema: commandPatchSchema }),
        });

        if (!output) {
          console.warn('LLM returned no structured output for edit, falling back to deterministic');
          return buildEditPatch(input);
        }

        return output as CommandPatchV1;
      } catch (err) {
        console.warn('LLM edit failed, falling back to deterministic:', err);
        return buildEditPatch(input);
      }
    },
  };
}
