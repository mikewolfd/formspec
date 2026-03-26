import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve the correct Python binary.
 *
 * Prefers `.venv/bin/python3` (matching where `make build-python` installs)
 * so the test always uses the same environment that `make build` targets.
 * Falls back to pyenv, then bare `python3`.
 */
export function resolvePython(): string {
  const rootDir = path.resolve(__dirname, '../../..');
  const venvPython = path.join(rootDir, '.venv', 'bin', 'python3');
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  try {
    return execSync('pyenv which python3', { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return 'python3';
  }
}

export function pythonTestEnv(rootDir: string): NodeJS.ProcessEnv {
  return { ...process.env, PYTHONPATH: path.join(rootDir, 'src') };
}

/** Check that the installed formspec_rust has the expected function signatures. */
function hasCurrentEvaluateDefSignature(pythonBin: string, rootDir: string): boolean {
  const output = execSync(
    `${pythonBin} - <<'PY'
import inspect
import formspec._rust as rust
print(inspect.signature(rust.formspec_rust.evaluate_def))
PY`,
    {
      cwd: rootDir,
      env: pythonTestEnv(rootDir),
      encoding: 'utf8',
      stdio: 'pipe',
    },
  ).trim();

  return output.includes('registry_documents=None') && output.includes('instances=None') && output.includes('context=None');
}

/**
 * Check that the installed formspec_rust CRATE_VERSION matches the version
 * in the workspace Cargo.toml. When the Rust crate is rebuilt (e.g. after a
 * schema change), the version stamp changes, catching stale binaries that
 * would otherwise pass the signature check.
 */
function hasCrateVersionMatch(pythonBin: string, rootDir: string): boolean {
  try {
    const installed = execSync(
      `${pythonBin} -c "import formspec_rust; print(formspec_rust.CRATE_VERSION)"`,
      { cwd: rootDir, env: pythonTestEnv(rootDir), encoding: 'utf8', stdio: 'pipe' },
    ).trim();
    const cargoToml = fs.readFileSync(path.join(rootDir, 'Cargo.toml'), 'utf8');
    const match = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);
    if (!match) return true; // can't parse — skip check
    return installed === match[1];
  } catch {
    return false;
  }
}

export function ensureCurrentFormspecRust(pythonBin: string, rootDir: string): void {
  if (hasCurrentEvaluateDefSignature(pythonBin, rootDir) && hasCrateVersionMatch(pythonBin, rootDir)) {
    return;
  }

  execSync(`${pythonBin} -m pip install --no-build-isolation ./crates/formspec-py`, {
    cwd: rootDir,
    env: pythonTestEnv(rootDir),
    encoding: 'utf8',
    stdio: 'inherit',
  });
}
