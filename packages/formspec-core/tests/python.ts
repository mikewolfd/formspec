import { execSync } from 'child_process';
import * as path from 'path';

/** Resolve the correct Python binary — prefer pyenv when .python-version exists. */
export function resolvePython(): string {
  try {
    return execSync('pyenv which python3', { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return 'python3';
  }
}

export function pythonTestEnv(rootDir: string): NodeJS.ProcessEnv {
  return { ...process.env, PYTHONPATH: path.join(rootDir, 'src') };
}

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

  return output.includes('registry_documents=None') && output.includes('instances=None');
}

export function ensureCurrentFormspecRust(pythonBin: string, rootDir: string): void {
  if (hasCurrentEvaluateDefSignature(pythonBin, rootDir)) {
    return;
  }

  execSync(`${pythonBin} -m pip install --no-build-isolation ./crates/formspec-py`, {
    cwd: rootDir,
    env: pythonTestEnv(rootDir),
    encoding: 'utf8',
    stdio: 'inherit',
  });
}
