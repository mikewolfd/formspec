/** @filedesc AIAdapter implementation backed by the Anthropic Claude API. */
import Anthropic from '@anthropic-ai/sdk';
import type {
  AIAdapter, ScaffoldRequest, ScaffoldResult, ScaffoldProgressCallback,
  ChatMessage, Attachment, SourceTrace,
  ConversationResponse, ToolContext, RefinementResult, ToolCallRecord,
} from './types.js';
import { TemplateLibrary } from './template-library.js';
import { deriveScaffoldSchema, scaffoldOutputToDefinition } from './scaffold-schema.js';
import definitionSchema from './definition-schema.json' with { type: 'json' };

const library = new TemplateLibrary();
const SCAFFOLD_RESPONSE_SCHEMA = deriveScaffoldSchema(definitionSchema, 'anthropic');

// ── System prompts ──────────────────────────────────────────────────

const SCAFFOLD_SYSTEM_PROMPT = `You are a form design assistant that generates Formspec form definitions.

Formspec is a declarative form specification. Generate a JSON object with a descriptive "title" and an "items" array.

Rules:
- Use descriptive snake_case keys (e.g., "first_name", "date_of_birth")
- Group related fields logically (e.g., address fields in an "address" group)
- For choice/multiChoice fields, always include an "options" array
- Set "options" to null for non-choice fields
- Set "children" to null for fields — only groups have children
- Set "dataType" to null for groups — only fields have dataType

Return ONLY valid JSON matching the required schema.`;

const INTERVIEW_SYSTEM_PROMPT = `You are a form design interviewer. Your job is to have a short, focused conversation to understand what form the user needs before generating it.

Guide the conversation through these sections (you don't need to cover all — stop when you have enough):
1. **Purpose** — What is the form for? Who fills it out? What's the context?
2. **Fields** — What data needs to be collected? What field types (text, dates, choices, etc.)?
3. **Logic** — Any conditional fields, calculated values, or validation rules?
4. **Advanced** — Multi-page layout, repeating sections, file uploads?

Rules:
- Ask 1-2 focused questions at a time, not a wall of questions
- Be conversational and encouraging
- When you have enough information to generate a good form, set readyToScaffold to true and tell the user they can generate the form
- Set readyToScaffold to true only when you have at least a clear purpose and some field ideas
- If the user's very first message is extremely detailed, you can set readyToScaffold to true immediately

You MUST respond with a JSON object with exactly two keys: "message" (string) and "readyToScaffold" (boolean).`;

const REFINEMENT_SYSTEM_PROMPT = `You are a form design assistant. You modify forms using the provided tools.
Use formspec_describe to inspect the current form structure before making changes.
Make surgical edits — add, update, or remove specific fields rather than rebuilding.
When done with all changes, respond with a brief summary of what you did.`;

// ── Helpers ──────────────────────────────────────────────────────────

function flattenItemKeys(items: any[]): string[] {
  const keys: string[] = [];
  for (const item of items) {
    keys.push(item.key);
    if (item.children) keys.push(...flattenItemKeys(item.children));
  }
  return keys;
}

// ── AnthropicAdapter ────────────────────────────────────────────────

export class AnthropicAdapter implements AIAdapter {
  private client: Anthropic;
  private model: string;
  private registryHints: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-20250514', registryHints = '') {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    this.model = model;
    this.registryHints = registryHints;
  }

  private get scaffoldPrompt(): string {
    return this.registryHints
      ? `${SCAFFOLD_SYSTEM_PROMPT}\n\n${this.registryHints}`
      : SCAFFOLD_SYSTEM_PROMPT;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  setModel(model: string): void {
    this.model = model;
  }

  async chat(messages: ChatMessage[]): Promise<ConversationResponse> {
    const anthropicMessages: Anthropic.MessageParam[] = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: [{ type: 'text', text: INTERVIEW_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: anthropicMessages,
      });

      const textBlock = response.content.find(b => b.type === 'text');
      const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';
      if (!text) throw new Error('Anthropic returned empty response');

      const parsed = JSON.parse(text);
      return {
        message: parsed.message,
        readyToScaffold: Boolean(parsed.readyToScaffold),
      };
    } catch (err) {
      const userMessageCount = messages.filter(m => m.role === 'user').length;
      return {
        message: userMessageCount >= 3
          ? `I encountered a temporary issue connecting to the AI provider, but you've provided enough context. Click **Generate Form** when you're ready.`
          : `I'd love to help you build a form! Could you tell me more about what you need? (Note: I encountered a temporary issue, but we can continue.)`,
        readyToScaffold: userMessageCount >= 3,
      };
    }
  }

  async generateScaffold(request: ScaffoldRequest, onProgress?: ScaffoldProgressCallback): Promise<ScaffoldResult> {
    switch (request.type) {
      case 'template':
        return this.scaffoldFromTemplate(request.templateId);
      case 'conversation':
        return this.scaffoldFromConversation(request.messages, onProgress);
      case 'upload':
        return this.scaffoldFromUpload(request.extractedContent);
    }
  }

  async refineForm(
    messages: ChatMessage[],
    instruction: string,
    toolContext: ToolContext,
  ): Promise<RefinementResult> {
    const toolCalls: ToolCallRecord[] = [];

    const tools: Anthropic.Tool[] = toolContext.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
    }));

    const conversationHistory = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const anthropicMessages: Anthropic.MessageParam[] = [
      { role: 'user', content: `Conversation context:\n${conversationHistory}\n\nInstruction: ${instruction}` },
    ];

    const MAX_TURNS = 10;
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: [{ type: 'text', text: REFINEMENT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: anthropicMessages,
        tools,
      });

      // Collect text and tool_use blocks
      const textParts: string[] = [];
      const toolUseParts: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          textParts.push(block.text);
        } else if (block.type === 'tool_use') {
          toolUseParts.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          });
        }
      }

      // If no tool calls, we're done
      if (toolUseParts.length === 0) {
        return { message: textParts.join('') || "I've updated the form.", toolCalls };
      }

      // Add assistant response to conversation
      anthropicMessages.push({ role: 'assistant', content: response.content });

      // Execute tool calls and build tool_result blocks
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUseParts) {
        const result = await toolContext.callTool(tu.name, tu.input);
        toolCalls.push({
          tool: tu.name,
          args: tu.input,
          result: result.content,
          isError: result.isError,
        });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: result.content,
          is_error: result.isError,
        });
      }

      anthropicMessages.push({ role: 'user', content: toolResults });

      // If stop_reason is end_turn, we're done
      if (response.stop_reason === 'end_turn') {
        return {
          message: textParts.join('') || "I've made changes to the form.",
          toolCalls,
        };
      }
    }

    return {
      message: toolCalls.length > 0
        ? "I've made changes to the form."
        : "I wasn't able to determine what changes to make. Try being more specific.",
      toolCalls,
    };
  }

  async extractFromFile(attachment: Attachment): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `Extract all form field names, labels, and structure from this document content. Return a plain text description of the fields found.\n\nDocument name: ${attachment.name}\nContent:\n${attachment.data}`,
        }],
      });

      const textBlock = response.content.find(b => b.type === 'text');
      return (textBlock && textBlock.type === 'text' ? textBlock.text : '') || attachment.data;
    } catch {
      return attachment.data;
    }
  }

  // ── Private ──────────────────────────────────────────────────────

  private scaffoldFromTemplate(templateId: string): ScaffoldResult {
    const template = library.getById(templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);

    const traces: SourceTrace[] = flattenItemKeys(template.definition.items).map(key => ({
      elementPath: key,
      sourceType: 'template' as const,
      sourceId: templateId,
      description: `From ${template.name} template`,
      timestamp: Date.now(),
    }));

    return { definition: template.definition, traces, issues: [] };
  }

  private async scaffoldFromConversation(messages: ChatMessage[], onProgress?: ScaffoldProgressCallback): Promise<ScaffoldResult> {
    const userContent = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n');

    try {
      let text: string;

      if (onProgress) {
        // Stream for UI progress feedback
        const stream = this.client.messages.stream({
          model: this.model,
          max_tokens: 8192,
          system: [{ type: 'text', text: this.scaffoldPrompt, cache_control: { type: 'ephemeral' } }],
          messages: [{
            role: 'user',
            content: `Design a form based on this description. Return ONLY valid JSON.\n\n${userContent}`,
          }],
        });

        let accumulated = '';
        stream.on('text', (delta) => {
          accumulated += delta;
          onProgress(accumulated);
        });

        const finalMessage = await stream.finalMessage();
        const textBlock = finalMessage.content.find(b => b.type === 'text');
        text = (textBlock && textBlock.type === 'text' ? textBlock.text : '') || accumulated;

        if (!text) throw new Error('Anthropic returned empty streamed response');
        if (finalMessage.stop_reason && finalMessage.stop_reason !== 'end_turn') {
          throw new Error(`Anthropic stream ended early (${finalMessage.stop_reason}) — response may be truncated.`);
        }
      } else {
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: 8192,
          system: [{ type: 'text', text: this.scaffoldPrompt, cache_control: { type: 'ephemeral' } }],
          messages: [{
            role: 'user',
            content: `Design a form based on this description. Return ONLY valid JSON.\n\n${userContent}`,
          }],
        });

        const textBlock = response.content.find(b => b.type === 'text');
        text = textBlock && textBlock.type === 'text' ? textBlock.text : '';
        if (!text) {
          throw new Error(
            response.stop_reason && response.stop_reason !== 'end_turn'
              ? `Anthropic returned empty response (stop_reason: ${response.stop_reason})`
              : 'Anthropic returned empty response — check API key, quota, or model availability',
          );
        }
      }

      // Strip markdown code fences if present
      const cleaned = text.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      const definition = scaffoldOutputToDefinition(parsed);

      const msgId = messages.find(m => m.role === 'user')?.id ?? 'unknown';
      const traces: SourceTrace[] = flattenItemKeys(parsed.items).map(key => ({
        elementPath: key,
        sourceType: 'message' as const,
        sourceId: msgId,
        description: 'Generated from your description',
        timestamp: Date.now(),
      }));

      return { definition, traces, issues: [] };
    } catch (err) {
      throw new Error(`Form generation failed: ${(err as Error).message}`);
    }
  }

  private async scaffoldFromUpload(extractedContent: string): Promise<ScaffoldResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: [{ type: 'text', text: this.scaffoldPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Create a form definition from this extracted document content. Identify fields, their types, and group related fields logically. Return ONLY valid JSON.\n\n${extractedContent}`,
      }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    if (!text) throw new Error('Anthropic returned empty response');

    const cleaned = text.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    const definition = scaffoldOutputToDefinition(parsed);

    const traces: SourceTrace[] = flattenItemKeys(parsed.items).map(key => ({
      elementPath: key,
      sourceType: 'upload' as const,
      sourceId: 'upload',
      description: 'Extracted from uploaded document',
      timestamp: Date.now(),
    }));

    return { definition, traces, issues: [] };
  }
}
