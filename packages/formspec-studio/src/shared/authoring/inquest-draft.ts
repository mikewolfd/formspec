import { createProject, type AnyCommand, type Diagnostics, type LogEntry, type Project, type ProjectBundle, type ProjectStatistics } from 'formspec-studio-core';
import type { ProposalV1 } from '../contracts/inquest';

function normalizeBindExpression(value: unknown): unknown {
  if (value === 'true()') return 'true';
  if (value === 'false()') return 'false';
  return value;
}

function normalizeDefinition(definition: unknown): unknown {
  if (!definition || typeof definition !== 'object') return definition;
  const record = structuredClone(definition as Record<string, unknown>);
  if (record.binds && !Array.isArray(record.binds) && typeof record.binds === 'object') {
    record.binds = Object.entries(record.binds as Record<string, Record<string, unknown>>).map(([path, properties]) => ({
      path,
      ...Object.fromEntries(
        Object.entries(properties ?? {}).map(([key, value]) => [key, normalizeBindExpression(value)]),
      ),
    }));
  } else if (Array.isArray(record.binds)) {
    record.binds = record.binds.map((bind) => {
      if (!bind || typeof bind !== 'object') return bind;
      return Object.fromEntries(
        Object.entries(bind as Record<string, unknown>).map(([key, value]) => [key, key === 'path' ? value : normalizeBindExpression(value)]),
      );
    });
  }
  return record;
}

export class InquestDraft {
  private readonly project: Project;

  constructor(project?: Project) {
    this.project = project ?? createProject();
  }

  getProject(): Project {
    return this.project;
  }

  loadProposal(proposal: ProposalV1): void {
    this.project.dispatch({
      type: 'project.import',
      payload: {
        definition: normalizeDefinition(proposal.definition),
        component: proposal.component,
      },
    });
    this.project.resetHistory();
  }

  applyCommands(commands: AnyCommand[]): void {
    if (commands.length === 0) return;
    if (commands.length === 1) {
      this.project.dispatch(commands[0]);
      return;
    }
    this.project.batch(commands);
  }

  diagnose(): Diagnostics {
    return this.project.diagnose();
  }

  statistics(): ProjectStatistics {
    return this.project.statistics();
  }

  export(): ProjectBundle {
    return this.project.export();
  }

  log(): readonly LogEntry[] {
    return this.project.log;
  }

  cloneForPreflight(): InquestDraft {
    return new InquestDraft(createProject({ seed: this.project.export() }));
  }
}
