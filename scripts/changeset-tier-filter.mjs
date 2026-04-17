#!/usr/bin/env node
/** @filedesc Moves out-of-tier changesets aside so `changeset version` only bumps one tier. */
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { TIERS, extractTier, listChangesetFiles, readChangeset } from './changeset-tiers.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const CHANGESET_DIR = join(ROOT, '.changeset');
const SCRATCH_DIR = join(ROOT, '.changeset-scratch');

function usage() {
  console.error(
    `Usage:\n` +
      `  node scripts/changeset-tier-filter.mjs <tier>   # move out-of-tier changesets to .changeset-scratch/\n` +
      `  node scripts/changeset-tier-filter.mjs --restore # move them all back\n` +
      `\nValid tiers: ${TIERS.join(', ')}`,
  );
  process.exit(2);
}

function restore() {
  if (!existsSync(SCRATCH_DIR)) return;
  const entries = readdirSync(SCRATCH_DIR, { withFileTypes: true });
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.md')) {
      renameSync(join(SCRATCH_DIR, e.name), join(CHANGESET_DIR, e.name));
    }
  }
  rmSync(SCRATCH_DIR, { recursive: true, force: true });
  console.log(`[changeset-tier-filter] restored ${entries.length} changeset(s) from scratch`);
}

function filterForTier(targetTier) {
  if (!TIERS.includes(targetTier)) {
    console.error(`[changeset-tier-filter] unknown tier: ${targetTier}`);
    usage();
  }

  // If a scratch dir is already present something is wrong; restore before filtering.
  if (existsSync(SCRATCH_DIR)) {
    console.error(
      `[changeset-tier-filter] scratch dir already exists at ${SCRATCH_DIR}; run --restore first`,
    );
    process.exit(1);
  }

  const files = listChangesetFiles(CHANGESET_DIR);
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
    console.error(
      `[changeset-tier-filter] ${missing.length} changeset(s) missing tier sentinel:\n` +
        missing.map((f) => `  - ${basename(f)}`).join('\n') +
        `\n\nEvery .changeset/*.md MUST contain <!-- tier: kernel|foundation|integration|ai --> in its body.\n`,
    );
    process.exit(1);
  }

  if (moves.length > 0) {
    mkdirSync(SCRATCH_DIR, { recursive: true });
    for (const { file } of moves) {
      renameSync(file, join(SCRATCH_DIR, basename(file)));
    }
  }

  console.log(
    `[changeset-tier-filter] target=${targetTier} kept=${matches.length} moved=${moves.length}`,
  );
}

const arg = process.argv[2];
if (!arg) usage();
if (arg === '--restore') restore();
else filterForTier(arg);
