/**
 * Mint a Chrome Web Store API refresh token.
 *
 * Run once, locally, after creating a Desktop-app OAuth client in the Google
 * Cloud Console. Google only issues a refresh token through an interactive
 * consent round-trip, so this opens a browser, catches the redirect on a
 * loopback listener, and exchanges the code.
 *
 *   node scripts/mint-cws-token.mjs                 # print the token
 *   node scripts/mint-cws-token.mjs --set-github    # push to GitHub secrets
 *   node scripts/mint-cws-token.mjs --set-keeper    # store in the Keeper vault
 *   node scripts/mint-cws-token.mjs --set-github --set-keeper   # both (usual)
 *
 * Credentials are read from CWS_CLIENT_ID / CWS_CLIENT_SECRET if set,
 * otherwise prompted. Nothing is written to disk and nothing is logged beyond
 * what you ask for, so the token does not end up in shell history or a file
 * you forget about.
 *
 * --set-keeper needs an unlocked Keeper Commander session; it will block
 * waiting for an interactive unlock otherwise. Unlock first, then run.
 *
 * Dependency-free by design - see scripts/publish-cws.mjs for why.
 */

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const GH_ORG = 'DevPossible';
// Chrome plugin repos follow plugins-chrome-{Name}; see docs/plugin-publishing.md.
const CHROME_REPO_PREFIX = 'plugins-chrome-';

const setGithub = process.argv.includes('--set-github');
const setKeeper = process.argv.includes('--set-keeper');
// Default is org-wide: one Chrome Web Store credential serves every plugin,
// because the scope authorizes the publisher account, not an individual item.
const repoScope = process.argv.includes('--repo-scope');

const KEEPER = 'C:/Program Files (x86)/Keeper Commander/keeper.bat';
const KEEPER_TITLE = 'Chrome Web Store API - support@devpossible.com';

async function prompt(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

function openBrowser(url) {
  // start needs an empty title arg, and the URL quoted, or & splits the command.
  const child =
    process.platform === 'win32'
      ? spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' })
      : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], {
          detached: true,
          stdio: 'ignore'
        });
  child.on('error', () => {});
  child.unref();
}

/**
 * Serve the loopback redirect. Resolves once listening (so the caller knows
 * which port to put in redirect_uri) and hands back a promise for the code.
 *
 * Port 0 lets the OS pick a free port. Desktop-app OAuth clients may use any
 * loopback port, so nothing needs registering in the Cloud Console.
 */
function startLoopbackServer(expectedState) {
  return new Promise((resolveReady, rejectReady) => {
    let settle;
    const codePromise = new Promise((res, rej) => (settle = { res, rej }));

    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== '/') {
        res.writeHead(404).end();
        return;
      }

      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      const reply = (message) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          `<!doctype html><meta charset="utf-8"><title>New Tab Control</title>` +
            `<body style="font:15px system-ui;background:#0d1117;color:#e6edf3;padding:3rem">` +
            `<h1 style="font-size:1.2rem">${message}</h1>` +
            `<p style="color:#9aa7b4">You can close this tab and return to the terminal.</p>`
        );
        setImmediate(() => server.close());
      };

      if (error) {
        reply('Authorization denied.');
        settle.rej(new Error(`authorization denied: ${error}`));
      } else if (state !== expectedState) {
        reply('State mismatch - request rejected.');
        settle.rej(new Error('state mismatch; aborting'));
      } else if (code) {
        reply('Authorized. Refresh token minted.');
        settle.res(code);
      } else {
        reply('No authorization code received.');
        settle.rej(new Error('no code in redirect'));
      }
    });

    server.on('error', rejectReady);
    server.listen(0, '127.0.0.1', () => {
      resolveReady({ port: server.address().port, codePromise });
    });
  });
}

/**
 * Store the credential set in Keeper as one record.
 *
 * They belong together: the refresh token is meaningless without the client
 * it was minted for, and rotating one means rotating all three. Splitting
 * them across records invites a partial rotation.
 */
async function saveToKeeper({ clientId, clientSecret, refreshToken, repos }) {
  const notes = [
    'Chrome Web Store API credentials for automated publishing.',
    '',
    'SHARED across every DevPossible Chrome extension. The scope authorizes',
    'the publisher account (support@devpossible.com), not one item, so a',
    'per-plugin credential would grant identical access - there is no',
    'per-item scope. Do not mint one per plugin.',
    '',
    'Held as GitHub organization secrets on DevPossible, shared with:',
    ...repos.map((r) => `  ${r}`),
    '',
    'Consumed by .github/workflows/publish.yml as CWS_CLIENT_ID,',
    'CWS_CLIENT_SECRET and CWS_REFRESH_TOKEN. CWS_EXTENSION_ID is per-repo',
    'and is the only value that differs between plugins.',
    '',
    'Minted by scripts/mint-cws-token.mjs, scope',
    'https://www.googleapis.com/auth/chromewebstore',
    '',
    'The refresh token does not expire, but is revoked by a password change,',
    'withdrawing access at myaccount.google.com/permissions, deleting the',
    'OAuth client, 6 months of disuse, or exceeding 50 live tokens. Recovery',
    'is re-running the minter; rotating one value means rotating all three.'
  ].join('\n');

  const args = [
    'record-add',
    '--title', KEEPER_TITLE,
    '--record-type', 'login',
    '--notes', notes,
    `login=${clientId}`,
    `password=${refreshToken}`,
    'url=https://chrome.google.com/webstore/devconsole',
    `client_secret=${clientSecret}`,
    `extension_id=${extensionId}`
  ];

  const child = spawn(KEEPER, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32'
  });

  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));

  const code = await new Promise((resolve) => child.on('close', resolve));
  if (code !== 0) {
    throw new Error(`keeper record-add failed (exit ${code}):\n${out.trim()}`);
  }
  console.log(`  stored in Keeper as "${KEEPER_TITLE}"`);
}

/** Run gh, capture stdout, optionally feed stdin. Throws on non-zero exit. */
function gh(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', args, {
      stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    });

    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve(out.trim())
        : reject(new Error(`gh ${args[0]} ${args[1] ?? ''} failed: ${(err || out).trim()}`))
    );

    if (input !== undefined) child.stdin.end(input);
  });
}

/**
 * Org secrets need admin:org. Without it `gh secret set --org` fails with a
 * bare 403 well after the token has already been minted, so check up front.
 */
async function assertOrgScope() {
  try {
    await gh(['api', `orgs/${GH_ORG}/actions/secrets`, '--jq', '.total_count']);
  } catch (error) {
    if (/admin:org|must be an org admin|403/i.test(error.message)) {
      throw new Error(
        'Writing organization secrets needs the admin:org scope.\n' +
          '  Run:  gh auth refresh -h github.com -s admin:org\n' +
          '  Or:   re-run with --repo-scope to write repo-level secrets instead.'
      );
    }
    throw error;
  }
}

/** Every Chrome plugin repo in the org - these share one publishing credential. */
async function chromePluginRepos() {
  const json = await gh([
    'repo', 'list', GH_ORG, '--limit', '200', '--json', 'name', '--jq', '.[].name'
  ]);
  const repos = json
    .split('\n')
    .map((n) => n.trim())
    .filter((n) => n.startsWith(CHROME_REPO_PREFIX));

  if (!repos.length) {
    throw new Error(`no ${CHROME_REPO_PREFIX}* repos found in ${GH_ORG}`);
  }
  return repos;
}

async function setOrgSecret(name, value, repos) {
  await gh(
    ['secret', 'set', name, '--org', GH_ORG, '--visibility', 'selected', '--repos', repos.join(','), '--body-file', '-'],
    value
  );
  console.log(`  set ${name} (org, ${repos.length} repo${repos.length === 1 ? '' : 's'})`);
}

async function setRepoSecret(name, value, repo) {
  await gh(['secret', 'set', name, '--repo', `${GH_ORG}/${repo}`, '--body-file', '-'], value);
  console.log(`  set ${name} (${repo})`);
}

// --- flow -------------------------------------------------------------------

// Everything that can fail without a browser is checked first. A refresh token
// is expensive to obtain and awkward to discard, so nothing is minted until
// there is somewhere to put it.
let repos = [];
if (setGithub) {
  repos = await chromePluginRepos();
  if (repoScope) {
    console.log(`Target: ${GH_ORG}/${repos[0]} (repo-scoped)`);
  } else {
    await assertOrgScope();
    console.log(`Target: ${GH_ORG} org secrets, shared by ${repos.length} repo(s):`);
    for (const repo of repos) console.log(`  ${repo}`);
  }
}

const clientId = process.env.CWS_CLIENT_ID || (await prompt('OAuth client ID: '));
const clientSecret =
  process.env.CWS_CLIENT_SECRET || (await prompt('OAuth client secret: '));

if (!clientId || !clientSecret) {
  console.error('Both a client ID and client secret are required.');
  process.exit(1);
}

const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
const { port, codePromise } = await startLoopbackServer(state);
const redirectUri = `http://127.0.0.1:${port}`;

const authUrl =
  `${AUTH_ENDPOINT}?` +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    // Force the consent screen: without it a re-auth returns no refresh token.
    prompt: 'consent',
    state
  });

console.log('\nSign in as the Chrome Web Store publishing account');
console.log('(support@devpossible.com), and grant the requested access.\n');
console.log(`If no browser opens, paste this in one:\n\n${authUrl}\n`);
openBrowser(authUrl);

const code = await codePromise;

const response = await fetch(TOKEN_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  })
});

const body = await response.json();
if (!response.ok) {
  throw new Error(`token exchange failed (${response.status}): ${body.error ?? 'unknown'}`);
}
if (!body.refresh_token) {
  throw new Error(
    'no refresh_token returned. Revoke the app at myaccount.google.com/permissions and retry.'
  );
}

if (setKeeper) {
  console.log('\nPersisting to Keeper:');
  await saveToKeeper({ clientId, clientSecret, refreshToken: body.refresh_token, repos });
}

if (setGithub) {
  if (repoScope) {
    console.log(`\nWriting repo secrets to ${GH_ORG}/${repos[0]}:`);
    for (const [name, value] of [
      ['CWS_CLIENT_ID', clientId],
      ['CWS_CLIENT_SECRET', clientSecret],
      ['CWS_REFRESH_TOKEN', body.refresh_token]
    ]) {
      await setRepoSecret(name, value, repos[0]);
    }
  } else {
    console.log(`\nWriting organization secrets to ${GH_ORG}:`);
    for (const [name, value] of [
      ['CWS_CLIENT_ID', clientId],
      ['CWS_CLIENT_SECRET', clientSecret],
      ['CWS_REFRESH_TOKEN', body.refresh_token]
    ]) {
      await setOrgSecret(name, value, repos);
    }
    console.log('\n  CWS_EXTENSION_ID stays per-repo - it is the only value that differs.');
  }
}

if (setKeeper && setGithub) {
  console.log('\nDone. Nothing sensitive was printed - both stores hold the');
  console.log('credentials, and tagging vX.Y.Z now drives a release end to end.');
} else {
  console.log('\n--- record these in Keeper ---\n');
  console.log(`CWS_CLIENT_ID=${clientId}`);
  console.log(`CWS_CLIENT_SECRET=${clientSecret}`);
  console.log(`CWS_REFRESH_TOKEN=${body.refresh_token}`);
  console.log('\nRe-run with --set-keeper --set-github to skip the copy/paste.');
}

console.log('\nRefresh tokens do not expire, but are revoked by a password change,');
console.log('withdrawing access, or deleting the OAuth client.');
