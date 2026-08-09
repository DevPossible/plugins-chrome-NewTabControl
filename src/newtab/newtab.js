import { loadSettings } from '../common/settings.js';

const fallback = document.getElementById('fallback');
const reason = document.getElementById('reason');
const frame = document.getElementById('frame');
const openTarget = document.getElementById('open-target');

document.getElementById('open-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

function showFallback(message, url) {
  reason.textContent = message;
  if (url) {
    openTarget.href = url;
    openTarget.hidden = false;
  }
  fallback.hidden = false;
}

const settings = await loadSettings();

if (settings.mode === 'redirect') {
  // replace() keeps the empty new-tab entry out of session history, so Back
  // goes where the user expects rather than looping onto this page.
  location.replace(settings.targetUrl);
} else {
  // A framed page can be refused by X-Frame-Options / frame-ancestors, and a
  // refusal is not observable cross-origin. Treat "never loaded" as a refusal.
  const settled = new Promise((resolve) => {
    frame.addEventListener('load', () => resolve(true), { once: true });
    setTimeout(() => resolve(false), 4000);
  });

  frame.src = settings.targetUrl;
  frame.hidden = false;

  if (await settled) {
    if (settings.focusPage) frame.contentWindow?.focus();
  } else {
    frame.hidden = true;
    frame.removeAttribute('src');
    showFallback(
      'That page refused to be embedded. Switch to redirect mode in settings, or open it directly.',
      settings.targetUrl
    );
  }
}
