/** @filedesc node:test coverage for scripts/changeset-tier-filter.mjs */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  ChangesetTierFilterError,
  filterForTier,
  restoreFromScratch,
} from '../changeset-tier-filter.mjs';

let workDir;
let changesetDir;
let scratchDir;

function writeChangeset(name, body) {
  writeFileSync(join(changesetDir, name), body, 'utf8');
}

function changeset(tier, pkg = '@formspec-org/types', bump = 'patch') {
  const frontmatter = `---\n'${pkg}': ${bump}\n---\n`;
  const sentinel = tier ? `<!-- tier: ${tier} -->\n` : '';
  return `${frontmatter}\n${sentinel}Some change description.\n`;
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'changeset-filter-test-'));
  changesetDir = join(workDir, '.changeset');
  scratchDir = join(workDir, '.changeset-scratch');
  mkdirSync(changesetDir, { recursive: true });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('filterForTier', () => {
  it('rejects unknown tier with code=unknown-tier', () => {
    writeChangeset('a.md', changeset('kernel'));
    assert.throws(
      () => filterForTier({ targetTier: 'nonsense', changesetDir, scratchDir }),
      (err) => err instanceof ChangesetTierFilterError && err.code === 'unknown-tier',
    );
    // No scratch dir created on rejection.
    assert.equal(existsSync(scratchDir), false);
  });

  it('rejects pre-existing scratch dir with code=scratch-exists', () => {
    mkdirSync(scratchDir, { recursive: true });
    writeChangeset('a.md', changeset('kernel'));
    assert.throws(
      () => filterForTier({ targetTier: 'kernel', changesetDir, scratchDir }),
      (err) => err instanceof ChangesetTierFilterError && err.code === 'scratch-exists',
    );
    // Original changeset untouched.
    assert.ok(existsSync(join(changesetDir, 'a.md')));
  });

  it('rejects changesets missing the tier sentinel with code=missing-sentinel', () => {
    writeChangeset('missing.md', changeset(null)); // no sentinel
    writeChangeset('ok.md', changeset('kernel'));
    try {
      filterForTier({ targetTier: 'kernel', changesetDir, scratchDir });
      assert.fail('expected throw');
    } catch (err) {
      assert.ok(err instanceof ChangesetTierFilterError);
      assert.equal(err.code, 'missing-sentinel');
      assert.deepEqual(err.details.missing, ['missing.md']);
    }
    // No files moved when any sentinel is missing.
    assert.equal(existsSync(scratchDir), false);
    assert.ok(existsSync(join(changesetDir, 'missing.md')));
    assert.ok(existsSync(join(changesetDir, 'ok.md')));
  });

  it('moves only out-of-tier changesets into scratch for kernel target', () => {
    writeChangeset('k1.md', changeset('kernel'));
    writeChangeset('k2.md', changeset('kernel'));
    writeChangeset('f1.md', changeset('foundation'));
    writeChangeset('i1.md', changeset('integration'));
    writeChangeset('a1.md', changeset('ai'));

    const result = filterForTier({ targetTier: 'kernel', changesetDir, scratchDir });

    assert.deepEqual(result.kept.sort(), ['k1.md', 'k2.md']);
    assert.deepEqual(result.moved.sort(), ['a1.md', 'f1.md', 'i1.md']);
    assert.ok(existsSync(join(changesetDir, 'k1.md')));
    assert.ok(existsSync(join(changesetDir, 'k2.md')));
    assert.ok(existsSync(join(scratchDir, 'f1.md')));
    assert.ok(existsSync(join(scratchDir, 'i1.md')));
    assert.ok(existsSync(join(scratchDir, 'a1.md')));
    assert.equal(existsSync(join(changesetDir, 'f1.md')), false);
  });

  it('does not create scratch dir when everything matches the target tier', () => {
    writeChangeset('k1.md', changeset('kernel'));
    const result = filterForTier({ targetTier: 'kernel', changesetDir, scratchDir });
    assert.deepEqual(result.moved, []);
    assert.equal(existsSync(scratchDir), false);
  });
});

describe('restoreFromScratch', () => {
  it('is a no-op when scratch dir is absent', () => {
    const result = restoreFromScratch({ changesetDir, scratchDir });
    assert.deepEqual(result, { restored: 0 });
  });

  it('round-trips: filter then restore yields byte-identical changesets', () => {
    // Capture the original tree.
    const originals = {
      'k1.md': changeset('kernel'),
      'f1.md': changeset('foundation', '@formspec-org/engine'),
      'a1.md': changeset('ai', '@formspec-org/mcp'),
    };
    for (const [name, body] of Object.entries(originals)) {
      writeChangeset(name, body);
    }

    filterForTier({ targetTier: 'kernel', changesetDir, scratchDir });
    const afterFilter = readdirSync(changesetDir).sort();
    assert.deepEqual(afterFilter, ['k1.md']);

    const { restored } = restoreFromScratch({ changesetDir, scratchDir });
    assert.equal(restored, 2);

    // Every original file is back with identical content; scratch dir is gone.
    const afterRestore = readdirSync(changesetDir).sort();
    assert.deepEqual(afterRestore, ['a1.md', 'f1.md', 'k1.md']);
    assert.equal(existsSync(scratchDir), false);
    for (const [name, body] of Object.entries(originals)) {
      assert.equal(readFileSync(join(changesetDir, name), 'utf8'), body);
    }
  });

  it('tolerates non-.md files in scratch (leaves them alone)', () => {
    // Create scratch with a stray non-md entry — restore only moves `*.md`.
    mkdirSync(scratchDir, { recursive: true });
    writeFileSync(join(scratchDir, 'README.md'), '# keep me?');
    writeFileSync(join(scratchDir, 'extra.txt'), 'stray');

    const { restored } = restoreFromScratch({ changesetDir, scratchDir });
    // README.md does get moved (no special-casing), but extra.txt does not.
    // The scratch dir is then removed, taking extra.txt with it — this is the
    // documented behavior: scratch is ephemeral, only .md files are promoted
    // back into the changeset tree.
    assert.equal(restored, 1);
    assert.ok(existsSync(join(changesetDir, 'README.md')));
    assert.equal(existsSync(scratchDir), false);
  });
});
