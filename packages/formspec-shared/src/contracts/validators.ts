import type {
  AnalysisV1,
  InquestHandoffPayloadV1,
  InquestIssue,
  InquestSessionV1,
  ProposalV1,
} from './inquest';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isInquestIssue(value: unknown): value is InquestIssue {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.message === 'string'
    && typeof value.severity === 'string'
    && typeof value.source === 'string'
    && typeof value.status === 'string'
    && typeof value.blocking === 'boolean';
}

export function isAnalysisV1(value: unknown): value is AnalysisV1 {
  return isObject(value)
    && typeof value.summary === 'string'
    && isObject(value.requirements)
    && Array.isArray(value.requirements.fields)
    && Array.isArray(value.requirements.sections)
    && Array.isArray(value.requirements.rules)
    && Array.isArray(value.issues)
    && value.issues.every(isInquestIssue)
    && isObject(value.trace);
}

export function isProposalV1(value: unknown): value is ProposalV1 {
  return isObject(value)
    && 'definition' in value
    && Array.isArray(value.issues)
    && value.issues.every(isInquestIssue)
    && isObject(value.trace)
    && isObject(value.summary)
    && typeof value.summary.fieldCount === 'number'
    && typeof value.summary.sectionCount === 'number'
    && typeof value.summary.bindCount === 'number'
    && typeof value.summary.shapeCount === 'number'
    && typeof value.summary.variableCount === 'number'
    && typeof value.summary.coverage === 'number';
}

export function isInquestSessionV1(value: unknown): value is InquestSessionV1 {
  return isObject(value)
    && value.version === 1
    && typeof value.sessionId === 'string'
    && typeof value.title === 'string'
    && typeof value.phase === 'string'
    && typeof value.mode === 'string'
    && typeof value.workflowMode === 'string'
    && isObject(value.input)
    && typeof value.input.description === 'string'
    && Array.isArray(value.input.uploads)
    && Array.isArray(value.input.messages)
    && Array.isArray(value.issues)
    && value.issues.every(isInquestIssue)
    && (value.analysis === undefined || isAnalysisV1(value.analysis))
    && (value.proposal === undefined || isProposalV1(value.proposal));
}

export function isInquestHandoffPayloadV1(value: unknown): value is InquestHandoffPayloadV1 {
  return isObject(value)
    && value.version === 1
    && typeof value.handoffId === 'string'
    && typeof value.mode === 'string'
    && Array.isArray(value.commandBundle)
    && isObject(value.scaffold)
    && 'definition' in value.scaffold
    && isObject(value.inquest)
    && typeof value.inquest.sessionId === 'string'
    && typeof value.inquest.workflowMode === 'string'
    && Array.isArray(value.inquest.inputs)
    && typeof value.inquest.analysisSummary === 'string'
    && isObject(value.inquest.proposalSummary)
    && Array.isArray(value.inquest.issues)
    && typeof value.createdAt === 'string';
}
