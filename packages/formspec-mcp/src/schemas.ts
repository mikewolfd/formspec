/** @filedesc Loads and caches JSON Schema validators and raw schema text for MCP. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  type DocumentType,
  type SchemaValidationError,
  type SchemaValidationResult,
  type SchemaValidator,
  lintDocument,
} from '@formspec-org/engine';

let validator: SchemaValidator | null = null;
let schemaTexts: Record<string, string> = {};

export function initSchemas(schemasDir: string): SchemaValidator {
  const texts: Record<string, string> = {};
  for (const name of ['definition', 'component', 'theme'] as const) {
    texts[name] = readFileSync(resolve(schemasDir, `${name}.schema.json`), 'utf-8');
  }

  schemaTexts = texts;

  validator = {
    validate(document: unknown, documentType?: DocumentType | null): SchemaValidationResult {
      const result = lintDocument(document);
      const errors: SchemaValidationError[] = (result.diagnostics ?? []).map((diagnostic: {
        path?: string;
        message?: string;
        code?: string;
      }) => ({
        path: diagnostic.path ?? '$',
        message: diagnostic.message ?? diagnostic.code ?? 'Schema validation failed',
      }));
      return {
        documentType: (documentType ?? result.documentType ?? null) as DocumentType | null,
        errors,
      };
    },
  };
  return validator;
}

export function getValidator(): SchemaValidator {
  if (!validator) throw new Error('Schemas not initialized — call initSchemas() at startup');
  return validator;
}

export function getSchemaText(name: 'definition' | 'component' | 'theme'): string {
  return schemaTexts[name] ?? '';
}
