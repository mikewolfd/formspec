/** @filedesc Subprocess coverage for the CLI surfaces of both release scripts.
 *
 * The pure exports are covered by the sibling *.test.mjs files; this file pins
 * the exit codes and stderr/stdout format that the CI release pipeline (and
 * `npm run check:changesets`) actually consume. If this test fails, the CLI
 * contract drifted — expect CI to break even when the pure functions are fine.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeEach, afterEach } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILTER_SCRIPT = resolve(HERE, '..', 'changeset-tier-filter.mjs');
const PLACEMENT_SCRIPT = resolve(HERE, '..', 'check-changeset-tier-placement.mjs');

let workDir;
let changesetDir;
let scratchDir;

function writeChangeset(name, body) {
  writeFileSync(join(changesetDir, name), body, 'utf8');
}

function changeset({ tier, packages = [['@formspec-org/types', 'patch']] }) {
  const lines = packages.map(([p, b]) => `'${p}': ${b}`);
  const frontmatter = `---\n${lines.join('\n')}\n---\n`;
  const sentinel = tier ? `<!-- tier: ${tier} -->\n` : '';
  return `${frontmatter}\n${sentinel}Description.\n`;
}

/** Run a CLI from inside `workDir` so relative `.changeset/` paths point at the
 * temp fixture tree rather than the repo. We invoke with `cwd: workDir` and
 * an absolute script path — the scripts resolve their default dirs relative
 * to their own location, so we instead invoke a thin wrapper that imports the
 * exports against `workDir` paths. For the CLI shape assertions here, we can
 * drive the real script against the repo's `.changeset/` (which is empty) for
 * the happy path, and against stubs via a seeded scratch dir for failure
 * modes that do not require `.changeset/` to contain fixtures.
 */
function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: workDir,
    encoding: 'utf8',
  });
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'cli-test-'));
  changesetDir = join(workDir, '.changeset');
  scratchDir = join(workDir, '.changeset-scratch');
  mkdirSync(changesetDir, { recursive: true });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('changeset-tier-filter.mjs CLI', () => {
  it('prints usage and exits 2 when given no args', () => {
    const r = run(FILTER_SCRIPT, []);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Usage:/);
    assert.match(r.stderr, /Valid tiers: kernel, foundation, integration, ai/);
  });

  it('prints usage and exits 2 on unknown tier', () => {
    const r = run(FILTER_SCRIPT, ['nonsense']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /unknown tier: nonsense/);
    assert.match(r.stderr, /Usage:/);
  });

  it('always logs "restored N" on --restore, even when N=0', () => {
    // Pre-refactor behavior the CI log contract depends on: the message
    // is emitted on every --restore invocation, not just when work happened.
    const r = run(FILTER_SCRIPT, ['--restore']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /\[changeset-tier-filter\] restored \d+ changeset\(s\) from scratch/);
  });
});

describe('check-changeset-tier-placement.mjs CLI', () => {
  // The placement CLI always walks `<repo-root>/.changeset/` (not cwd-based),
  // so these tests assert the shape of the happy-path output against the real
  // repo state — which is empty today but could have legitimate changesets.
  // We only assert the prefix and exit code, not the specific count.
  it('exits 0 with OK message when the real .changeset/ has no violations', () => {
    const r = spawnSync(process.execPath, [PLACEMENT_SCRIPT], { encoding: 'utf8' });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /\[changeset-tier-placement\] OK \(\d+ changeset\(s\) checked\)/);
  });
});
