import { z } from 'zod';

// ── Shared enums ────────────────────────────────────────────────────

const confidenceSchema = z.enum(['high', 'medium', 'low']);
const issueSeveritySchema = z.enum(['error', 'warning', 'info']);
const issueSourceSchema = z.enum(['analysis', 'proposal', 'diagnostic', 'handoff', 'provider']);
const issueStateSchema = z.enum(['open', 'resolved', 'deferred']);
const bindKindSchema = z.enum(['required', 'relevant', 'constraint', 'calculate', 'readonly']);

// ── InquestIssue ────────────────────────────────────────────────────

export const issueSchema = z.object({
  id: z.string().describe('Unique issue identifier'),
  title: z.string().describe('Short issue title'),
  message: z.string().describe('Human-readable issue description'),
  severity: issueSeveritySchema,
  source: issueSourceSchema,
  status: issueStateSchema.default('open'),
  blocking: z.boolean().describe('Whether this issue blocks handoff'),
  confidence: confidenceSchema.optional(),
  fieldPath: z.string().optional().describe('Dot-path to the affected field'),
  traceIds: z.array(z.string()).optional(),
});

// ── TraceMap ────────────────────────────────────────────────────────

const traceRefSchema = z.object({
  id: z.string(),
  type: z.enum(['template', 'description', 'upload', 'analysis', 'proposal', 'diagnostic']),
  label: z.string(),
  sourceId: z.string().optional(),
  excerpt: z.string().optional(),
  fieldPath: z.string().optional(),
});

export const traceMapSchema = z.record(z.string(), z.array(traceRefSchema))
  .describe('Maps element IDs to their source references');

// ── Analysis ────────────────────────────────────────────────────────

const analysisFieldSchema = z.object({
  id: z.string().describe('Unique field identifier, e.g. "template:fullName" or "desc:email"'),
  key: z.string().describe('Formspec item key (camelCase, no spaces)'),
  label: z.string().describe('Human-readable field label'),
  dataType: z.string().describe('Formspec data type: string, integer, decimal, boolean, date, dateTime, time, choice, multiChoice, money, text, attachment'),
  sectionId: z.string().optional().describe('ID of the section this field belongs to'),
  required: z.boolean().describe('Whether this field should be required'),
  included: z.boolean().describe('Whether to include this field in the proposal'),
  confidence: confidenceSchema,
  sourceIds: z.array(z.string()).describe('IDs of the inputs that informed this field'),
});

const analysisSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  fieldIds: z.array(z.string()).describe('IDs of fields in this section'),
});

const analysisRuleSchema = z.object({
  id: z.string(),
  label: z.string().describe('Human-readable rule name'),
  kind: bindKindSchema.describe('Which bind property this rule sets'),
  expression: z.string().optional().describe('FEL expression, e.g. "$hasIncome = true" for relevant, or "true" for required'),
  explanation: z.string().describe('Plain-English explanation of what this rule does'),
  fieldPaths: z.array(z.string()).describe('Formspec key paths this rule applies to'),
  confidence: confidenceSchema,
  sourceIds: z.array(z.string()),
});

const analysisRepeatSchema = z.object({
  id: z.string(),
  label: z.string(),
  fieldIds: z.array(z.string()),
  min: z.number().optional(),
  max: z.number().optional(),
  confidence: confidenceSchema,
});

const analysisRouteSchema = z.object({
  id: z.string(),
  label: z.string(),
  condition: z.string().describe('FEL expression for the route condition'),
  target: z.string().describe('Target definition URL or label'),
  confidence: confidenceSchema,
});

export const analysisSchema = z.object({
  summary: z.string().describe('1-2 sentence summary of the analysis results'),
  requirements: z.object({
    fields: z.array(analysisFieldSchema).describe('All detected fields'),
    sections: z.array(analysisSectionSchema).describe('Logical groupings of fields'),
    rules: z.array(analysisRuleSchema).describe('Behavioral rules (required, relevant, constraint, calculate, readonly)'),
    repeats: z.array(analysisRepeatSchema).describe('Detected repeating groups'),
    routes: z.array(analysisRouteSchema).describe('Detected screener routing'),
  }),
  issues: z.array(issueSchema).describe('Issues found during analysis'),
  trace: traceMapSchema,
});

// ── Proposal ────────────────────────────────────────────────────────

const proposalSummarySchema = z.object({
  fieldCount: z.number(),
  sectionCount: z.number(),
  bindCount: z.number(),
  shapeCount: z.number(),
  variableCount: z.number(),
  coverage: z.number().describe('Percentage 0-100 of analysis fields that made it into the definition'),
});

export const proposalSchema = z.object({
  definition: z.record(z.string(), z.unknown()).describe('A complete, valid Formspec Definition JSON object'),
  component: z.record(z.string(), z.unknown()).optional().describe('Optional Formspec Component Document'),
  issues: z.array(issueSchema),
  trace: traceMapSchema,
  summary: proposalSummarySchema,
});

// ── CommandPatch (Edit) ─────────────────────────────────────────────

const commandSchema = z.object({
  type: z.string().describe('Studio command type, e.g. "definition.addItem", "definition.setBind"'),
  payload: z.record(z.string(), z.unknown()).describe('Command-specific payload'),
});

export const commandPatchSchema = z.object({
  commands: z.array(commandSchema).describe('Studio commands to apply'),
  issues: z.array(issueSchema).describe('Issues encountered while translating the edit'),
  explanation: z.string().optional().describe('What the edit does in plain language'),
});
