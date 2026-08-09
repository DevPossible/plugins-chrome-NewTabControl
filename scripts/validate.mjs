/**
 * Pre-flight checks that catch the mistakes the Chrome Web Store review would
 * catch days later, plus the ones that quietly widen the extension's blast
 * radius. Runs in CI on every push.
 */

import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');

// Anything beyond this needs a deliberate decision and a privacy-policy update.
const ALLOWED_PERMISSIONS = new Set(['storage']);

// Chrome Web Store store-listing limits.
const MAX_NAME = 75;
const MAX_DESCRIPTION = 132;

const failures = [];
const fail = (message) => failures.push(message);

async function exists(relativePath) {
  try {
    await access(path.join(srcDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

const manifest = JSON.parse(await readFile(path.join(srcDir, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

if (manifest.manifest_version !== 3) {
  fail(`manifest_version must be 3, found ${manifest.manifest_version}`);
}

if (manifest.version !== pkg.version) {
  fail(`version mismatch: manifest.json ${manifest.version} vs package.json ${pkg.version}`);
}

if (!/^\d+(\.\d+){0,3}$/.test(manifest.version)) {
  fail(`version "${manifest.version}" is not 1-4 dot-separated integers`);
}

if ((manifest.name ?? '').length > MAX_NAME) {
  fail(`name is ${manifest.name.length} chars, limit is ${MAX_NAME}`);
}

if (!manifest.description) {
  fail('description is required for a public store listing');
} else if (manifest.description.length > MAX_DESCRIPTION) {
  fail(`description is ${manifest.description.length} chars, limit is ${MAX_DESCRIPTION}`);
}

for (const permission of manifest.permissions ?? []) {
  if (!ALLOWED_PERMISSIONS.has(permission)) {
    fail(`permission "${permission}" is not in the allowlist (${[...ALLOWED_PERMISSIONS].join(', ')})`);
  }
}

if (manifest.host_permissions?.length) {
  fail(`host_permissions must stay empty, found ${manifest.host_permissions.join(', ')}`);
}

if (manifest.content_scripts?.length) {
  fail('content_scripts must stay empty; this extension does not touch page content');
}

const referenced = [
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
  manifest.action?.default_popup,
  manifest.options_ui?.page,
  ...Object.values(manifest.chrome_url_overrides ?? {})
].filter(Boolean);

for (const relativePath of referenced) {
  if (!(await exists(relativePath))) {
    fail(`manifest references missing file: ${relativePath}`);
  }
}

// Remotely hosted code is a hard rejection under the Chrome Web Store policy.
for (const page of referenced.filter((p) => p.endsWith('.html'))) {
  const html = await readFile(path.join(srcDir, page), 'utf8');
  const remote = html.match(/<(?:script|link)[^>]+(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi);
  if (remote) {
    fail(`${page} loads remote code or styles: ${remote.join(', ')}`);
  }
}

if (failures.length) {
  console.error('validate: FAILED');
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(`validate: OK (${manifest.name} ${manifest.version})`);
