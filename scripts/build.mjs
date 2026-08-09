/**
 * Package src/ into the ZIP the Chrome Web Store expects.
 * Output: dist/plugins-chrome-newtabcontrol-<version>.zip
 */

import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { createZip } from './zip.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');

async function collect(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(dir, entry.name);
    // ZIP paths are always forward-slashed, regardless of host platform.
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      files.push(...(await collect(absolute, name)));
    } else {
      files.push({ name, contents: await readFile(absolute) });
    }
  }

  return files;
}

const manifest = JSON.parse(await readFile(path.join(srcDir, 'manifest.json'), 'utf8'));
const files = await collect(srcDir);

await mkdir(distDir, { recursive: true });
const outPath = path.join(distDir, `plugins-chrome-newtabcontrol-${manifest.version}.zip`);
const zip = createZip(files);
await writeFile(outPath, zip);

console.log(`build: ${path.relative(root, outPath)} (${files.length} files, ${zip.length} bytes)`);
for (const file of files) console.log(`  ${file.name}`);
