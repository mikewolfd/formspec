import type { CommandHandler, ProjectState, AnyCommand, CommandResult } from './types.js';

/**
 * Middleware that wraps the entire phase-aware execution plan.
 *
 * Receives a read-only snapshot of the pre-mutation state and the full
 * command plan (phases of commands). Must call `next` to continue
 * execution, or return early to reject/short-circuit.
 */
export type PipelineMiddleware = (
  state: Readonly<ProjectState>,
  commands: Readonly<AnyCommand[][]>,
  next: (commands: AnyCommand[][]) => { newState: ProjectState; results: CommandResult[] },
) => { newState: ProjectState; results: CommandResult[] };

/**
 * Phase-aware command execution pipeline.
 *
 * Clones state once, runs commands across phases with inter-phase
 * reconciliation (when any command in a phase signals rebuild), and
 * returns the new state plus all results. Middleware wraps the full plan.
 */
export class CommandPipeline {
  constructor(
    private handlers: Readonly<Record<string, CommandHandler>>,
    private middleware: PipelineMiddleware[],
  ) {}

  execute(
    state: ProjectState,
    phases: AnyCommand[][],
    reconcile: (clone: ProjectState) => void,
  ): { newState: ProjectState; results: CommandResult[] } {
    const core = (cmds: AnyCommand[][]): { newState: ProjectState; results: CommandResult[] } => {
      const clone = structuredClone(state);
      const allResults: CommandResult[] = [];

      for (const phase of cmds) {
        const phaseResults: CommandResult[] = [];
        for (const cmd of phase) {
          const handler = this.handlers[cmd.type];
          if (!handler) throw new Error(`Unknown command type: ${cmd.type}`);
          phaseResults.push(handler(clone, cmd.payload));
        }
        allResults.push(...phaseResults);
        if (phaseResults.some(r => r.rebuildComponentTree)) {
          reconcile(clone);
        }
      }

      return { newState: clone, results: allResults };
    };

    if (this.middleware.length === 0) {
      return core(phases);
    }

    let chain = core;
    for (let i = this.middleware.length - 1; i >= 0; i--) {
      const mw = this.middleware[i];
      const next = chain;
      chain = (cmds) => mw(state, cmds, next);
    }
    return chain(phases);
  }
}
