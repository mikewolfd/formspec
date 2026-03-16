import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, '../../src');

function readFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return readFiles(fullPath);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function fileText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

describe('import boundaries', () => {
  it('feature modules do not import app shells', () => {
    const featureFiles = readFiles(path.join(srcRoot, 'features'));
    for (const filePath of featureFiles) {
      const text = fileText(filePath);
      expect(text, filePath).not.toMatch(/studio-app\//);
    }
  });


});
