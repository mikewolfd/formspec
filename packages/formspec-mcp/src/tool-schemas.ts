/** @filedesc Shared Zod schemas used by multiple tool registrations. */
import { z } from 'zod';

export const fieldPropsSchema = z.object({
  placeholder: z.string(),
  hint: z.string(),
  description: z.string(),
  ariaLabel: z.string(),
  choices: z.array(z.object({ value: z.string(), label: z.string() })).describe('Inline choice options. Use "choices" (NOT "options") — "options" is the schema-level name but will be rejected here.'),
  choicesFrom: z.string(),
  widget: z.string(),
  page: z.string(),
  required: z.boolean().describe('Shorthand for formspec_behavior(require). Sets unconditionally required. For conditional required, use formspec_behavior instead. Do NOT use both.'),
  readonly: z.boolean().describe('Shorthand for formspec_behavior(readonly_when, condition="true"). For conditional readonly, use formspec_behavior instead. Do NOT use both.'),
  initialValue: z.unknown(),
  insertIndex: z.number(),
  parentPath: z.string(),
}).partial().strict();
