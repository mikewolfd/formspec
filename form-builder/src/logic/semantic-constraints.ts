import type { FormspecDefinition } from 'formspec-engine';

type BindRecord = Record<string, unknown>;

function getBinds(definition: FormspecDefinition): BindRecord[] {
  const current = (definition as Record<string, unknown>).binds;
  return Array.isArray(current) ? (current as BindRecord[]) : [];
}

function normalize(expr: string): string {
  return expr.trim().replace(/\s+/g, ' ');
}

function upsertBindConstraint(definition: FormspecDefinition, path: string, fragment: string, message?: string) {
  const binds = getBinds(definition);
  const existingIndex = binds.findIndex((entry) => String(entry.path ?? '') === path);
  const nextConstraint = `not present($) or ${fragment}`;

  if (existingIndex >= 0) {
    const existing = { ...binds[existingIndex] };
    const existingConstraint = typeof existing.constraint === 'string' ? normalize(existing.constraint) : '';
    if (!existingConstraint || existingConstraint === nextConstraint) {
      existing.constraint = nextConstraint;
    } else if (!existingConstraint.includes(nextConstraint)) {
      existing.constraint = `(${existingConstraint}) and (${nextConstraint})`;
    }
    if (message) {
      existing.constraintMessage = message;
    }
    binds[existingIndex] = existing;
  } else {
    binds.push({
      path,
      constraint: nextConstraint,
      ...(message ? { constraintMessage: message } : {}),
    });
  }

  (definition as Record<string, unknown>).binds = binds;
}

export function applyNumericConstraint(
  definition: FormspecDefinition,
  path: string,
  kind: 'min' | 'max' | 'step',
  value: number,
) {
  if (Number.isNaN(value)) {
    return;
  }
  if (kind === 'min') {
    upsertBindConstraint(definition, path, `$ >= ${value}`, `Value must be at least ${value}.`);
    return;
  }
  if (kind === 'max') {
    upsertBindConstraint(definition, path, `$ <= ${value}`, `Value must be at most ${value}.`);
    return;
  }
  upsertBindConstraint(
    definition,
    path,
    `abs(($ / ${value}) - round($ / ${value})) < 0.0000001`,
    `Value must use step ${value}.`,
  );
}
