/**
 * Upload and optionally publish the packaged extension to the Chrome Web Store.
 *
 * Credentials come from the environment (GitHub Actions secrets):
 *   CWS_CLIENT_ID       OAuth 2.0 client ID     (Google Cloud project)
 *   CWS_CLIENT_SECRET   OAuth 2.0 client secret
 *   CWS_REFRESH_TOKEN   Refresh token for the publishing account
 *   CWS_EXTENSION_ID    The item ID from the developer dashboard
 *
 * Flags:
 *   --publish           Also submit for review. Without it the upload lands as
 *                       a draft and a human presses publish in the dashboard.
 *   --target=trustedTesters  Publish to trusted testers instead of everyone.
 *
 * Deliberately dependency-free: it uses fetch and nothing else, so the release
 * path has no third-party code with access to the publishing credentials.
 */

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

const REQUIRED = ['CWS_CLIENT_ID', 'CWS_CLIENT_SECRET', 'CWS_REFRESH_TOKEN', 'CWS_EXTENSION_ID'];
const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`publish: missing credentials: ${missing.join(', ')}`);
  process.exit(1);
}

const { CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN, CWS_EXTENSION_ID } = process.env;
const shouldPublish = process.argv.includes('--publish');
const targetArg = process.argv.find((arg) => arg.startsWith('--target='));
const publishTarget = targetArg ? targetArg.split('=')[1] : 'default';

async function findPackage() {
  const entries = await readdir(distDir);
  const zips = entries.filter((name) => name.endsWith('.zip'));
  if (zips.length !== 1) {
    throw new Error(`expected exactly one .zip in dist/, found ${zips.length || 'none'}. Run npm run build.`);
  }
  return path.join(distDir, zips[0]);
}

async function getAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CWS_CLIENT_ID,
      client_secret: CWS_CLIENT_SECRET,
      refresh_token: CWS_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });

  const body = await response.json();
  if (!response.ok) {
    // Never echo the body wholesale - it can carry token material.
    throw new Error(`token exchange failed (${response.status}): ${body.error ?? 'unknown error'}`);
  }
  return body.access_token;
}

async function upload(token, zipPath) {
  const contents = await readFile(zipPath);
  const response = await fetch(
    `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${CWS_EXTENSION_ID}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-goog-api-version': '2',
        'Content-Type': 'application/zip'
      },
      body: contents
    }
  );

  const body = await response.json();
  if (!response.ok || body.uploadState === 'FAILURE') {
    const details = (body.itemError ?? []).map((e) => e.error_detail).join('; ');
    throw new Error(`upload failed (${response.status}): ${details || body.uploadState || 'unknown'}`);
  }
  console.log(`publish: uploaded ${path.basename(zipPath)} - state ${body.uploadState}`);
}

async function submit(token) {
  const response = await fetch(
    `https://www.googleapis.com/chromewebstore/v1.1/items/${CWS_EXTENSION_ID}/publish?publishTarget=${publishTarget}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-goog-api-version': '2',
        'Content-Length': '0'
      }
    }
  );

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`publish failed (${response.status}): ${(body.error?.message) ?? 'unknown'}`);
  }

  console.log(`publish: submitted to "${publishTarget}" - status ${(body.status ?? []).join(', ')}`);
  for (const detail of body.statusDetail ?? []) console.log(`  ${detail}`);
}

const zipPath = await findPackage();
const token = await getAccessToken();
await upload(token, zipPath);

if (shouldPublish) {
  await submit(token);
} else {
  console.log('publish: draft uploaded. Re-run with --publish, or submit from the dashboard.');
}
