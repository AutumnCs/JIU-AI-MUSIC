import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const appRoot = path.resolve(import.meta.dirname, '../..');

test('runtime configuration contains no PostgreSQL or Hyperdrive residue', async () => {
  const [runtimeSources, wranglerConfig, packageJson] = await Promise.all([
    readRuntimeTypeScript(['app', 'lib', 'next.config.ts', 'open-next.config.ts', 'vitest.config.ts']),
    readFile(path.join(appRoot, 'wrangler.jsonc'), 'utf8'),
    readFile(path.join(appRoot, 'package.json'), 'utf8'),
  ]);

  assert.deepEqual(findResidue(runtimeSources, /from ['"]postgres['"]/), []);
  assert.deepEqual(findResidue(runtimeSources, /DATABASE_URL/), []);
  assert.deepEqual(findResidue(runtimeSources, /HYPERDRIVE|hyperdrive/), []);
  assert.doesNotMatch(wranglerConfig, /"hyperdrive"|"HYPERDRIVE"/i);
  assert.equal(JSON.parse(packageJson).dependencies?.postgres, undefined);
});

async function readRuntimeTypeScript(entries: string[]): Promise<Map<string, string>> {
  const sourceFiles: Array<Array<[string, string]>> = await Promise.all(entries.map((entry) => {
    const entryPath = path.join(appRoot, entry);
    return entry.endsWith('.ts')
      ? readFile(entryPath, 'utf8').then((contents): Array<[string, string]> => [[entry, contents]])
      : readTypeScriptDirectory(entryPath);
  }));

  return new Map(sourceFiles.flat());
}

async function readTypeScriptDirectory(directory: string): Promise<Array<[string, string]>> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readTypeScriptDirectory(entryPath);
    if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      return [[path.relative(appRoot, entryPath), await readFile(entryPath, 'utf8')] as [string, string]];
    }
    return [];
  }));

  return files.flat();
}

function findResidue(sources: Map<string, string>, pattern: RegExp): string[] {
  return [...sources].flatMap(([file, contents]) => pattern.test(contents) ? [file] : []);
}
