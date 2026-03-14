import type { AnyCommand, Project, ProjectBundle } from 'formspec-studio-core';

export type InquestWorkflowMode = 'draft-fast' | 'verify-carefully';
export type InquestSessionPhase = 'inputs' | 'review' | 'refine';
export type InquestHandoffMode = 'new-project' | 'import-subform';
export type InquestConfidence = 'high' | 'medium' | 'low';
export type InquestIssueSeverity = 'error' | 'warning' | 'info';
export type InquestIssueSource = 'analysis' | 'proposal' | 'diagnostic' | 'handoff' | 'provider';
export type InquestIssueState = 'open' | 'resolved' | 'deferred';
export type InquestTraceType = 'template' | 'description' | 'upload' | 'analysis' | 'proposal' | 'diagnostic';

export interface InquestTraceRef {
  id: string;
  type: InquestTraceType;
  label: string;
  sourceId?: string;
  excerpt?: string;
  fieldPath?: string;
}

export type TraceMapV1 = Record<string, InquestTraceRef[]>;

export interface InquestIssue {
  id: string;
  title: string;
  message: string;
  severity: InquestIssueSeverity;
  source: InquestIssueSource;
  status: InquestIssueState;
  blocking: boolean;
  confidence?: InquestConfidence;
  fieldPath?: string;
  traceIds?: string[];
}

export interface AnalysisField {
  id: string;
  key: string;
  label: string;
  dataType: string;
  sectionId?: string;
  required: boolean;
  included: boolean;
  confidence: InquestConfidence;
  sourceIds: string[];
}

export interface AnalysisSection {
  id: string;
  title: string;
  fieldIds: string[];
}

export interface AnalysisRule {
  id: string;
  label: string;
  kind: 'required' | 'relevant' | 'constraint' | 'calculate' | 'readonly';
  expression?: string;
  explanation: string;
  fieldPaths: string[];
  confidence: InquestConfidence;
  sourceIds: string[];
}

export interface AnalysisRepeat {
  id: string;
  label: string;
  fieldIds: string[];
  min?: number;
  max?: number;
  confidence: InquestConfidence;
}

export interface AnalysisRoute {
  id: string;
  label: string;
  condition: string;
  target: string;
  confidence: InquestConfidence;
}

export interface AnalysisV1 {
  summary: string;
  requirements: {
    fields: AnalysisField[];
    sections: AnalysisSection[];
    rules: AnalysisRule[];
    repeats: AnalysisRepeat[];
    routes: AnalysisRoute[];
  };
  issues: InquestIssue[];
  trace: TraceMapV1;
}

export interface ProposalSummary {
  fieldCount: number;
  sectionCount: number;
  bindCount: number;
  shapeCount: number;
  variableCount: number;
  coverage: number;
}

export interface ProposalV1 {
  definition: unknown;
  component?: unknown;
  issues: InquestIssue[];
  trace: TraceMapV1;
  summary: ProposalSummary;
}

export interface CommandPatchV1 {
  commands: AnyCommand[];
  issues: InquestIssue[];
  trace?: TraceMapV1;
  explanation?: string;
}

export interface SeedField {
  key: string;
  label: string;
  dataType: string;
  required?: boolean;
  sectionId?: string;
}

export interface SeedSection {
  id: string;
  title: string;
}

export interface SeedRule {
  id: string;
  label: string;
  kind: AnalysisRule['kind'];
  expression?: string;
  explanation: string;
  fieldPaths: string[];
}

export interface SeedRepeat {
  id: string;
  label: string;
  fieldIds: string[];
  min?: number;
  max?: number;
}

export interface SeedRoute {
  id: string;
  label: string;
  condition: string;
  target: string;
}

export interface InquestTemplate {
  id: string;
  version: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  starterPrompts: string[];
  seedAnalysis: {
    sections: SeedSection[];
    fields: SeedField[];
    rules: SeedRule[];
    repeats?: SeedRepeat[];
    routes?: SeedRoute[];
  };
  seedScaffold?: {
    definition?: unknown;
    component?: unknown;
  };
  sourceNotes?: string[];
}

export interface InquestUploadSummary {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  status: 'pending' | 'processed';
  excerpt?: string;
  createdAt: string;
}

export interface InquestMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  createdAt: string;
}

export interface InquestSessionInput {
  templateId?: string;
  description: string;
  uploads: InquestUploadSummary[];
  messages: InquestMessage[];
}

export interface InquestSessionTarget {
  projectId?: string;
  groupPath?: string;
  keyPrefix?: string;
  availableGroups?: string[];
}

export interface InquestSessionV1 {
  version: 1;
  sessionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  phase: InquestSessionPhase;
  mode: InquestHandoffMode;
  workflowMode: InquestWorkflowMode;
  providerId?: string;
  rememberedCredential?: boolean;
  input: InquestSessionInput;
  analysis?: AnalysisV1;
  proposal?: ProposalV1;
  issues: InquestIssue[];
  handoffId?: string;
  target?: InquestSessionTarget;
  draftBundle?: Partial<ProjectBundle>;
}

export interface InquestInputSummary {
  kind: 'template' | 'description' | 'upload' | 'chat';
  label: string;
  summary: string;
}

export interface InquestIssueSummary {
  id: string;
  title: string;
  severity: InquestIssueSeverity;
  status: InquestIssueState;
  blocking: boolean;
}

export interface InquestHandoffPayloadV1 {
  version: 1;
  mode: InquestHandoffMode;
  handoffId: string;
  target?: InquestSessionTarget;
  commandBundle: AnyCommand[];
  scaffold: {
    definition: unknown;
    component?: unknown;
    theme?: unknown;
    mapping?: unknown;
  };
  inquest: {
    sessionId: string;
    templateId?: string;
    workflowMode: InquestWorkflowMode;
    providerId?: string;
    inputs: InquestInputSummary[];
    analysisSummary: string;
    proposalSummary: ProposalSummary;
    issues: InquestIssueSummary[];
  };
  createdAt: string;
}

export interface RefineSlotProps {
  project: Project;
  issues: InquestIssue[];
  onResolveIssue(issueId: string): void;
  onDeferIssue(issueId: string): void;
  onApplyPrompt(prompt: string): Promise<void> | void;
  onBack(): void;
  onOpenStudio(): void;
}

export interface ProviderConnectionInput {
  apiKey: string;
}

export interface ConnectionResult {
  ok: boolean;
  message: string;
}

export interface InquestModelInput {
  session: InquestSessionV1;
  template?: InquestTemplate;
  analysis?: AnalysisV1;
  proposal?: ProposalV1;
  prompt?: string;
}

export interface InquestProviderAdapter {
  id: string;
  label: string;
  capabilities: {
    chat: boolean;
    images: boolean;
    pdf: boolean;
    structuredOutput: boolean;
    streaming: boolean;
  };
  testConnection(input: ProviderConnectionInput): Promise<ConnectionResult>;
  runAnalysis(input: InquestModelInput): Promise<AnalysisV1>;
  runProposal(input: InquestModelInput): Promise<ProposalV1>;
  runEdit(input: InquestModelInput): Promise<CommandPatchV1>;
}
