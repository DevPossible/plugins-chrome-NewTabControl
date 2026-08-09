/**
 * Single source of truth for New Tab Control settings.
 *
 * Settings live in chrome.storage.sync so they follow the signed-in profile.
 * The extension asks for no host permissions: "redirect" mode navigates the
 * tab, and "embed" mode frames the page. Neither needs to read page content.
 */

export const DEFAULTS = Object.freeze({
  targetUrl: 'https://devpossible.com/start/',
  mode: 'redirect',
  // Embed mode only: Chrome parks the caret in the address bar on a new tab.
  // Set this to move focus into the framed page instead.
  focusPage: false
});

export const MODES = Object.freeze(['redirect', 'embed']);

/**
 * Accept only what the new tab page is willing to navigate to.
 * http/https only - this rejects javascript:, data:, file: and chrome: URLs.
 */
export function normalizeUrl(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  return parsed.href;
}

export async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  return {
    targetUrl: normalizeUrl(stored.targetUrl) ?? DEFAULTS.targetUrl,
    mode: MODES.includes(stored.mode) ? stored.mode : DEFAULTS.mode,
    focusPage: Boolean(stored.focusPage)
  };
}

export async function saveSettings({ targetUrl, mode, focusPage }) {
  const url = normalizeUrl(targetUrl);
  if (!url) throw new Error('Enter a valid http:// or https:// address.');
  if (!MODES.includes(mode)) throw new Error(`Unknown mode: ${mode}`);

  await chrome.storage.sync.set({ targetUrl: url, mode, focusPage: Boolean(focusPage) });
  return url;
}
