import type { Diagnostic, Diagnostics } from 'formspec-studio-core';
import type { InquestIssue } from 'formspec-shared';

function diagnosticToIssue(diagnostic: Diagnostic, index: number): InquestIssue {
  return {
    id: `diagnostic:${diagnostic.artifact}:${diagnostic.code}:${diagnostic.path}:${index}`,
    title: diagnostic.code.replace(/_/g, ' '),
    message: diagnostic.message,
    severity: diagnostic.severity,
    source: 'diagnostic',
    status: 'open',
    blocking: diagnostic.severity === 'error',
    fieldPath: diagnostic.path,
  };
}

export function diagnosticsToInquestIssues(diagnostics: Diagnostics): InquestIssue[] {
  return [
    ...diagnostics.structural,
    ...diagnostics.expressions,
    ...diagnostics.extensions,
    ...diagnostics.consistency,
  ].map(diagnosticToIssue);
}

export function mergeIssueSets(...issueSets: InquestIssue[][]): InquestIssue[] {
  const seen = new Map<string, InquestIssue>();
  issueSets.flat().forEach((issue) => {
    seen.set(issue.id, issue);
  });
  return Array.from(seen.values());
}
