/**
 * Grant every Chrome plugin repo access to the shared Chrome Web Store
 * organization secrets.
 *
 *   node scripts/sync-cws-access.mjs          # show what would change
 *   node scripts/sync-cws-access.mjs --apply  # apply it
 *
 * Run this after creating a new plugins-chrome-* repo. The credential itself
 * never changes, so this deliberately does not need the secret values and
 * cannot disturb a working token - re-minting to add a repo would be both
 * unnecessary and risky.
 *
 * Needs the admin:org scope: gh auth refresh -h github.com -s admin:org
 */

import { spawn } from 'node:child_process';

const GH_ORG = 'DevPossible';
const CHROME_REPO_PREFIX = 'plugins-chrome-';
const SHARED_SECRETS = ['CWS_CLIENT_ID', 'CWS_CLIENT_SECRET', 'CWS_REFRESH_TOKEN'];

const apply = process.argv.includes('--apply');

function gh(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(out.trim()) : reject(new Error(`gh failed: ${(err || out).trim()}`))
    );
  });
}

/** Fail with an instruction rather than a stack trace when the scope is absent. */
async function assertOrgScope() {
  try {
    await gh(['api', `orgs/${GH_ORG}/actions/secrets`, '--jq', '.total_count']);
  } catch (error) {
    if (/admin:org|must be an org admin|403/i.test(error.message)) {
      console.error(
        'Reading and writing organization secrets needs the admin:org scope.\n' +
          '  Run:  gh auth refresh -h github.com -s admin:org\n'
      );
      process.exit(1);
    }
    throw error;
  }
}

await assertOrgScope();

const repos = JSON.parse(
  await gh(['repo', 'list', GH_ORG, '--limit', '200', '--json', 'name,id'])
).filter((r) => r.name.startsWith(CHROME_REPO_PREFIX));

if (!repos.length) {
  console.error(`No ${CHROME_REPO_PREFIX}* repos in ${GH_ORG}.`);
  process.exit(1);
}

// gh's GraphQL node id is not the numeric id the Actions REST API wants.
const withIds = [];
for (const repo of repos) {
  const id = await gh(['api', `repos/${GH_ORG}/${repo.name}`, '--jq', '.id']);
  withIds.push({ name: repo.name, id: Number(id) });
}

console.log(`Chrome plugin repos in ${GH_ORG}:`);
for (const r of withIds) console.log(`  ${r.name}`);

let changed = 0;

for (const secret of SHARED_SECRETS) {
  let current = [];
  try {
    const json = await gh([
      'api', `orgs/${GH_ORG}/actions/secrets/${secret}/repositories`, '--jq', '[.repositories[].name]'
    ]);
    current = JSON.parse(json);
  } catch (error) {
    if (/404|Not Found/i.test(error.message)) {
      console.log(`\n${secret}: not set yet - run the minter first.`);
      continue;
    }
    throw error;
  }

  const missing = withIds.filter((r) => !current.includes(r.name)).map((r) => r.name);
  const extra = current.filter((name) => !withIds.some((r) => r.name === name));

  if (!missing.length && !extra.length) {
    console.log(`\n${secret}: already correct (${current.length} repo(s))`);
    continue;
  }

  changed++;
  console.log(`\n${secret}:`);
  for (const name of missing) console.log(`  + ${name}`);
  for (const name of extra) console.log(`  - ${name} (no longer a Chrome plugin repo)`);

  if (apply) {
    const args = ['api', '--method', 'PUT', `orgs/${GH_ORG}/actions/secrets/${secret}/repositories`];
    for (const r of withIds) args.push('-F', `selected_repository_ids[]=${r.id}`);
    await gh(args);
    console.log(`  applied`);
  }
}

if (!changed) {
  console.log('\nNothing to do.');
} else if (!apply) {
  console.log('\nDry run. Re-run with --apply to make these changes.');
}
