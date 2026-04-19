#!/usr/bin/env node
/** @filedesc Moves out-of-tier changesets aside so `changeset version` only bumps one tier. */
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TIERS, extractTier, listChangesetFiles, readChangeset } from './changeset-tiers.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DEFAULT_CHANGESET_DIR = join(ROOT, '.changeset');
const DEFAULT_SCRATCH_DIR = join(ROOT, '.changeset-scratch');

/**
 * Errors the filter can raise. Consumers (CLI, tests) discriminate by `.code`.
 */
export class ChangesetTierFilterError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

/**
 * Move every changeset whose tier sentinel is not `targetTier` into
 * `scratchDir`. Returns `{ kept, moved }` — each a list of basenames.
 *
 * Throws `ChangesetTierFilterError` when:
 *   - `targetTier` is not in `TIERS` (code: `unknown-tier`)
 *   - `scratchDir` already exists (code: `scratch-exists`)
 *   - any changeset is missing its tier sentinel (code: `missing-sentinel`)
 */
export function filterForTier({
  targetTier,
  changesetDir = DEFAULT_CHANGESET_DIR,
  scratchDir = DEFAULT_SCRATCH_DIR,
}) {
  if (!TIERS.includes(targetTier)) {
    throw new ChangesetTierFilterError(
      'unknown-tier',
      `unknown tier: ${targetTier}`,
      { targetTier, valid: TIERS },
    );
  }

  if (existsSync(scratchDir)) {
    throw new ChangesetTierFilterError(
      'scratch-exists',
      `scratch dir already exists at ${scratchDir}; run --restore first`,
      { scratchDir },
    );
  }

  const files = listChangesetFiles(changesetDir);
  const missing = [];
  const matches = [];
  const moves = [];

  for (const file of files) {
    const source = readChangeset(file);
    const tier = extractTier(source);
    if (!tier) {
      missing.push(file);
      continue;
    }
    if (tier === targetTier) matches.push(file);
    else moves.push({ file, tier });
  }

  if (missing.length > 0) {
    throw new ChangesetTierFilterError(
      'missing-sentinel',
      `${missing.length} changeset(s) missing tier sentinel`,
      { missing: missing.map((f) => basename(f)) },
    );
  }

  if (moves.length > 0) {
    mkdirSync(scratchDir, { recursive: true });
    for (const { file } of moves) {
      renameSync(file, join(scratchDir, basename(file)));
    }
  }

  return {
    kept: matches.map((f) => basename(f)),
    moved: moves.map(({ file }) => basename(file)),
  };
}

/**
 * Move every `*.md` file in `scratchDir` back into `changesetDir`, then
 * remove `scratchDir`. Silently no-ops when `scratchDir` is absent.
 * Returns `{ restored }` — the count of moved files.
 */
export function restoreFromScratch({
  changesetDir = DEFAULT_CHANGESET_DIR,
  scratchDir = DEFAULT_SCRATCH_DIR,
} = {}) {
  if (!existsSync(scratchDir)) return { restored: 0 };
  const entries = readdirSync(scratchDir, { withFileTypes: true });
  let restored = 0;
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.md')) {
      renameSync(join(scratchDir, e.name), join(changesetDir, e.name));
      restored++;
    }
  }
  rmSync(scratchDir, { recursive: true, force: true });
  return { restored };
}

function usage() {
  console.error(
    `Usage:\n` +
      `  node scripts/changeset-tier-filter.mjs <tier>   # move out-of-tier changesets to .changeset-scratch/\n` +
      `  node scripts/changeset-tier-filter.mjs --restore # move them all back\n` +
      `\nValid tiers: ${TIERS.join(', ')}`,
  );
  process.exit(2);
}

function runCli() {
  const arg = process.argv[2];
  if (!arg) usage();

  if (arg === '--restore') {
    const { restored } = restoreFromScratch();
    console.log(`[changeset-tier-filter] restored ${restored} changeset(s) from scratch`);
    return;
  }

  try {
    const { kept, moved } = filterForTier({ targetTier: arg });
    console.log(
      `[changeset-tier-filter] target=${arg} kept=${kept.length} moved=${moved.length}`,
    );
  } catch (err) {
    if (err instanceof ChangesetTierFilterError) {
      if (err.code === 'unknown-tier') {
        console.error(`[changeset-tier-filter] ${err.message}`);
        usage();
      } else if (err.code === 'missing-sentinel') {
        const list = err.details.missing.map((f) => `  - ${f}`).join('\n');
        console.error(
          `[changeset-tier-filter] ${err.message}:\n${list}\n\n` +
            `Every .changeset/*.md MUST contain <!-- tier: kernel|foundation|integration|ai --> in its body.\n`,
        );
        process.exit(1);
      } else {
        console.error(`[changeset-tier-filter] ${err.message}`);
        process.exit(1);
      }
    } else {
      throw err;
    }
  }
}

// CLI guard: only invoke when executed directly, not when imported by tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
