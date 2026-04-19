/** @filedesc node:test coverage for scripts/check-changeset-tier-placement.mjs */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { checkPlacement } from '../check-changeset-tier-placement.mjs';

let workDir;
let changesetDir;

function writeChangeset(name, body) {
  writeFileSync(join(changesetDir, name), body, 'utf8');
}

function changeset({ tier, packages = [['@formspec-org/types', 'patch']] }) {
  const lines = packages.map(([pkg, bump]) => `'${pkg}': ${bump}`);
  const frontmatter = `---\n${lines.join('\n')}\n---\n`;
  const sentinel = tier ? `<!-- tier: ${tier} -->\n` : '';
  return `${frontmatter}\n${sentinel}Description.\n`;
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'changeset-placement-test-'));
  changesetDir = join(workDir, '.changeset');
  mkdirSync(changesetDir, { recursive: true });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('checkPlacement', () => {
  it('returns no violations for a valid single-tier changeset', () => {
    writeChangeset('k1.md', changeset({ tier: 'kernel', packages: [['@formspec-org/types', 'patch']] }));
    const { violations, filesChecked } = checkPlacement({ changesetDir });
    assert.deepEqual(violations, []);
    assert.equal(filesChecked, 1);
  });

  it('reports missing tier sentinel', () => {
    writeChangeset('bad.md', changeset({ tier: null }));
    const { violations } = checkPlacement({ changesetDir });
    assert.equal(violations.length, 1);
    assert.match(violations[0], /bad\.md: missing tier sentinel/);
  });

  it('reports unknown tier value', () => {
    writeChangeset('wat.md', changeset({ tier: 'nonsense' }));
    const { violations } = checkPlacement({ changesetDir });
    assert.equal(violations.length, 1);
    assert.match(violations[0], /wat\.md: unknown tier 'nonsense'/);
  });

  it('rejects changesets whose packages span multiple tiers', () => {
    writeChangeset(
      'cross.md',
      changeset({
        tier: 'kernel',
        packages: [
          ['@formspec-org/types', 'patch'],
          ['@formspec-org/engine', 'patch'],
        ],
      }),
    );
    const { violations } = checkPlacement({ changesetDir });
    // "packages-span-multiple-tiers" and "declared-tier-mismatch" are mutually
    // exclusive by the size guards in the source (tiersSeen.size > 1 vs
    // === 1) — not a suppression, just disjoint branches. Pin the single-
    // violation outcome here.
    assert.equal(violations.length, 1);
    assert.match(violations[0], /cross\.md: packages span multiple tiers/);
    assert.match(violations[0], /kernel/);
    assert.match(violations[0], /foundation/);
  });

  it('reports declared tier mismatch when a single-tier changeset is misfiled', () => {
    writeChangeset(
      'misfiled.md',
      changeset({
        tier: 'kernel',
        packages: [['@formspec-org/engine', 'patch']],
      }),
    );
    const { violations } = checkPlacement({ changesetDir });
    assert.equal(violations.length, 1);
    assert.match(
      violations[0],
      /misfiled\.md: declared tier 'kernel' but packages belong to tier 'foundation'/,
    );
  });

  it('reports a changeset whose every package is an orphan (tiersSeen stays empty)', () => {
    writeChangeset(
      'all-orphans.md',
      changeset({
        tier: 'kernel',
        packages: [['@formspec-org/not-real-1', 'patch'], ['@formspec-org/not-real-2', 'patch']],
      }),
    );
    const { violations } = checkPlacement({ changesetDir });
    // Only the orphan violation fires — the tier-mismatch branch is guarded
    // on `tiersSeen.size === 1`, which is false here. Pins the empty-tier-set
    // path through the if-chain.
    assert.equal(violations.length, 1);
    assert.match(violations[0], /unknown packages/);
    assert.match(violations[0], /@formspec-org\/not-real-1/);
    assert.match(violations[0], /@formspec-org\/not-real-2/);
  });

  it('reports orphan packages not registered in any tier', () => {
    writeChangeset(
      'orphan.md',
      changeset({
        tier: 'kernel',
        packages: [
          ['@formspec-org/types', 'patch'],
          ['@formspec-org/not-a-real-package', 'patch'],
        ],
      }),
    );
    const { violations } = checkPlacement({ changesetDir });
    assert.equal(violations.length, 1);
    assert.match(violations[0], /unknown packages in frontmatter/);
    assert.match(violations[0], /@formspec-org\/not-a-real-package/);
  });

  it('accumulates multiple violations across files', () => {
    writeChangeset('ok.md', changeset({ tier: 'kernel' }));
    writeChangeset('missing.md', changeset({ tier: null }));
    writeChangeset('unknown.md', changeset({ tier: 'nonsense' }));
    const { violations, filesChecked } = checkPlacement({ changesetDir });
    assert.equal(filesChecked, 3);
    assert.equal(violations.length, 2);
    assert.ok(violations.some((v) => /missing\.md/.test(v)));
    assert.ok(violations.some((v) => /unknown\.md/.test(v)));
  });

  it('ignores the README.md convention file', () => {
    writeFileSync(join(changesetDir, 'README.md'), '# Changesets');
    writeChangeset('real.md', changeset({ tier: 'kernel' }));
    const { violations, filesChecked } = checkPlacement({ changesetDir });
    assert.deepEqual(violations, []);
    assert.equal(filesChecked, 1);
  });

  it('treats IGNORED_PACKAGES (e.g., private studio) as invisible to tier logic', () => {
    writeChangeset(
      'private.md',
      changeset({
        tier: 'kernel',
        packages: [
          ['@formspec-org/types', 'patch'],
          ['@formspec-org/studio', 'patch'],
        ],
      }),
    );
    const { violations } = checkPlacement({ changesetDir });
    assert.deepEqual(violations, []);
  });
});
