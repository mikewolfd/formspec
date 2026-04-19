#!/usr/bin/env node
/** @filedesc Lints .changeset/*.md — every changeset must declare one tier matching its packages. */
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IGNORED_PACKAGES,
  PACKAGE_TO_TIER,
  TIERS,
  extractPackages,
  extractTier,
  listChangesetFiles,
  readChangeset,
} from './changeset-tiers.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DEFAULT_CHANGESET_DIR = join(ROOT, '.changeset');

/**
 * Check every changeset under `changesetDir` for correct tier placement.
 * Returns `{ violations, filesChecked }`. `violations` is a list of human-
 * readable strings; the CLI prints them to stderr and exits non-zero.
 * Each violation covers one of:
 *   - missing tier sentinel
 *   - unknown tier value
 *   - package not recognized (orphan)
 *   - packages spanning multiple tiers
 *   - declared tier does not match package tier
 */
export function checkPlacement({ changesetDir = DEFAULT_CHANGESET_DIR } = {}) {
  const violations = [];
  const files = listChangesetFiles(changesetDir);

  for (const file of files) {
    const name = basename(file);
    const source = readChangeset(file);

    const tier = extractTier(source);
    if (!tier) {
      violations.push(
        `${name}: missing tier sentinel. ` +
          `Add '<!-- tier: kernel|foundation|integration|ai -->' to the body.`,
      );
      continue;
    }
    if (!TIERS.includes(tier)) {
      violations.push(
        `${name}: unknown tier '${tier}'. Must be one of: ${TIERS.join(', ')}.`,
      );
      continue;
    }

    const pkgs = extractPackages(source).filter((p) => !IGNORED_PACKAGES.has(p));
    const tiersSeen = new Set();
    const orphans = [];
    for (const p of pkgs) {
      const t = PACKAGE_TO_TIER.get(p);
      if (!t) orphans.push(p);
      else tiersSeen.add(t);
    }

    if (orphans.length > 0) {
      violations.push(
        `${name}: unknown packages in frontmatter: ${orphans.join(', ')}. ` +
          `Only @formspec-org/* workspace packages are allowed.`,
      );
    }
    if (tiersSeen.size > 1) {
      violations.push(
        `${name}: packages span multiple tiers (${[...tiersSeen].join(', ')}). ` +
          `Split this changeset into one per tier.`,
      );
    }
    if (tiersSeen.size === 1 && !tiersSeen.has(tier)) {
      const actual = [...tiersSeen][0];
      violations.push(
        `${name}: declared tier '${tier}' but packages belong to tier '${actual}'.`,
      );
    }
  }

  return { violations, filesChecked: files.length };
}

function runCli() {
  const { violations, filesChecked } = checkPlacement();
  for (const v of violations) {
    console.error(`[changeset-tier-placement] ${v}`);
  }
  if (violations.length > 0) {
    console.error(`\n[changeset-tier-placement] ${violations.length} violation(s) found.`);
    process.exit(1);
  }
  console.log(`[changeset-tier-placement] OK (${filesChecked} changeset(s) checked)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
