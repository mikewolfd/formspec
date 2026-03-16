/**
 * Global command handler registry.
 *
 * Uses a simple register/lookup pattern: each handler module calls
 * {@link registerHandler} at import time (self-registration), and the
 * {@link Project} class calls {@link getHandler} at dispatch time to
 * find the handler for a given command type.
 *
 * Handler modules are imported (and thus self-register) via `./handlers.ts`.
 */

import type { CommandHandler } from './types.js';

export type { CommandHandler };

/** Internal map from command type string to its handler function. */
const handlers = new Map<string, CommandHandler>();

/**
 * Register a command handler for a given command type.
 *
 * Called at module load time by each handler module (self-registration pattern).
 * If a handler for the same type is already registered, it is silently replaced.
 *
 * @param type - The command type discriminant (e.g. `'definition.addItem'`).
 * @param handler - The function that processes commands of this type.
 */
export function registerHandler(type: string, handler: CommandHandler): void {
  handlers.set(type, handler);
}

/**
 * Look up the handler for a command type.
 *
 * @param type - The command type discriminant.
 * @returns The registered handler function.
 * @throws {Error} If no handler is registered for the given type.
 */
export function getHandler(type: string): CommandHandler {
  const handler = handlers.get(type);
  if (!handler) {
    throw new Error(`Unknown command type: ${type}`);
  }
  return handler;
}
