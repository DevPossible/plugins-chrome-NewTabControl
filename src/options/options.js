import { DEFAULTS, loadSettings, saveSettings } from '../common/settings.js';

const form = document.getElementById('settings');
const urlInput = document.getElementById('target-url');
const focusRow = document.getElementById('focus-row');
const status = document.getElementById('status');

function syncFocusRowVisibility() {
  focusRow.hidden = form.elements.mode.value !== 'embed';
}

function apply({ targetUrl, mode, focusPage }) {
  urlInput.value = targetUrl;
  form.elements.mode.value = mode;
  form.elements.focusPage.checked = focusPage;
  syncFocusRowVisibility();
}

function report(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
  if (!isError) setTimeout(() => (status.textContent = ''), 2500);
}

form.addEventListener('change', syncFocusRowVisibility);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const saved = await saveSettings({
      targetUrl: urlInput.value,
      mode: form.elements.mode.value,
      focusPage: form.elements.focusPage.checked
    });
    urlInput.value = saved;
    report('Saved.');
  } catch (error) {
    report(error.message, true);
  }
});

document.getElementById('reset').addEventListener('click', async () => {
  await saveSettings(DEFAULTS);
  apply(DEFAULTS);
  report('Reset to default.');
});

apply(await loadSettings());
