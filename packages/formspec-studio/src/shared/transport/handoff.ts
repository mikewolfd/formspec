import type { AnyCommand, ProjectBundle } from 'formspec-studio-core';
import type { InquestHandoffPayloadV1, InquestIssueSummary, InquestSessionV1 } from '../contracts/inquest';

export function summarizeSessionInputs(session: InquestSessionV1): InquestHandoffPayloadV1['inquest']['inputs'] {
  const inputs: InquestHandoffPayloadV1['inquest']['inputs'] = [];
  if (session.input.templateId) {
    inputs.push({
      kind: 'template',
      label: 'Template',
      summary: session.input.templateId,
    });
  }
  if (session.input.description.trim()) {
    inputs.push({
      kind: 'description',
      label: 'Description',
      summary: session.input.description.slice(0, 240),
    });
  }
  session.input.uploads.forEach((upload) => {
    inputs.push({
      kind: 'upload',
      label: upload.name,
      summary: `${upload.mimeType} · ${Math.max(1, Math.round(upload.size / 1024))} KB`,
    });
  });
  if (inputs.length === 0) {
    inputs.push({
      kind: 'chat',
      label: 'Conversation',
      summary: `${session.input.messages.length} messages captured`,
    });
  }
  return inputs;
}

export function summarizeIssues(session: InquestSessionV1): InquestIssueSummary[] {
  return session.issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    severity: issue.severity,
    status: issue.status,
    blocking: issue.blocking,
  }));
}

export function buildHandoffPayload(
  session: InquestSessionV1,
  bundle: ProjectBundle,
  commandBundle: AnyCommand[],
): InquestHandoffPayloadV1 {
  if (!session.proposal) {
    throw new Error('Cannot build a handoff payload without a proposal.');
  }

  return {
    version: 1,
    mode: session.mode,
    handoffId: session.handoffId ?? crypto.randomUUID(),
    target: session.target,
    commandBundle,
    scaffold: bundle,
    inquest: {
      sessionId: session.sessionId,
      templateId: session.input.templateId,
      workflowMode: session.workflowMode,
      providerId: session.providerId,
      inputs: summarizeSessionInputs(session),
      analysisSummary: session.analysis?.summary ?? 'No analysis summary',
      proposalSummary: session.proposal.summary,
      issues: summarizeIssues(session),
    },
    createdAt: new Date().toISOString(),
  };
}
