#!/usr/bin/env node
/** @filedesc Lints .changeset/*.md — every changeset must declare one tier matching its packages. */
import { basename, join } from 'node:path';
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
const CHANGESET_DIR = join(ROOT, '.changeset');

let errors = 0;
const files = listChangesetFiles(CHANGESET_DIR);

for (const file of files) {
  const name = basename(file);
  const source = readChangeset(file);

  const tier = extractTier(source);
  if (!tier) {
    console.error(
      `[changeset-tier-placement] ${name}: missing tier sentinel. ` +
        `Add '<!-- tier: kernel|foundation|integration|ai -->' to the body.`,
    );
    errors++;
    continue;
  }
  if (!TIERS.includes(tier)) {
    console.error(
      `[changeset-tier-placement] ${name}: unknown tier '${tier}'. ` +
        `Must be one of: ${TIERS.join(', ')}.`,
    );
    errors++;
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
    console.error(
      `[changeset-tier-placement] ${name}: unknown packages in frontmatter: ${orphans.join(', ')}. ` +
        `Only @formspec-org/* workspace packages are allowed.`,
    );
    errors++;
  }
  if (tiersSeen.size > 1) {
    console.error(
      `[changeset-tier-placement] ${name}: packages span multiple tiers (${[...tiersSeen].join(', ')}). ` +
        `Split this changeset into one per tier.`,
    );
    errors++;
  }
  if (tiersSeen.size === 1 && !tiersSeen.has(tier)) {
    const actual = [...tiersSeen][0];
    console.error(
      `[changeset-tier-placement] ${name}: declared tier '${tier}' but packages belong to tier '${actual}'.`,
    );
    errors++;
  }
}

if (errors > 0) {
  console.error(`\n[changeset-tier-placement] ${errors} violation(s) found.`);
  process.exit(1);
}

console.log(`[changeset-tier-placement] OK (${files.length} changeset(s) checked)`);
