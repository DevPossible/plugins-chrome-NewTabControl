# New Tab Control

A Chrome extension that lets you decide what your new tab page is.

Point it at the [DevPossible Start Page](https://devpossible.com/start/) — the
default — or at any page you like: a dashboard, a wiki, a local server, your own
HTML file served over http.

New-tab replacement is a category full of extensions that ask for far more access
than the job needs. This one is the boring version: **one permission (`storage`),
no host permissions, no content scripts, no analytics, no remote code, no
dependencies.** The whole thing is under 300 lines and the source you are reading
is the source that ships.

## Install

Submitted to the Chrome Web Store and awaiting review (item
`khecnhnblkgciddahmejociofniofand`). The listing link goes here once it is
approved.

Meanwhile, download the [latest release](https://github.com/DevPossible/plugins-chrome-NewTabControl/releases/latest)
or run it from source:

1. Clone the repo.
2. Open `chrome://extensions`, turn on **Developer mode**.
3. **Load unpacked** → select the `src/` folder.

## Settings

Click the toolbar icon, or open the extension's Options page.

| Setting | What it does |
|---|---|
| **New tab page** | Any `http://` or `https://` address. Anything else is rejected. |
| **Redirect** mode | Navigates the tab straight to your page. Works with every site. |
| **Embed** mode | Keeps the `chrome://newtab` URL and frames your page. Sites that send `X-Frame-Options` or a restrictive `frame-ancestors` will refuse; the extension detects this and tells you rather than showing a blank page. |
| **Focus the page** | Embed mode only. Moves the caret out of the address bar and into the page. |

Settings live in `chrome.storage.sync`, so they follow your signed-in Chrome
profile.

## Why redirect is the default

Embed mode looks nicer — the address bar stays empty and ready to type — but it
only works for pages that permit framing. Redirect works everywhere, so it is
what a fresh install gets.

## Development

No build step for development; `src/` is the extension. Node 20+ is only needed
for the packaging scripts.

```bash
node scripts/validate.mjs   # manifest, permissions allowlist, store-listing limits
node scripts/build.mjs      # -> dist/plugins-chrome-newtabcontrol-<version>.zip
python scripts/make-icons.py  # regenerate icons (only when the mark changes)
```

`validate.mjs` is the guard rail that matters: it fails the build if a
permission appears outside the allowlist, if `host_permissions` or
`content_scripts` become non-empty, if any HTML page starts loading remote code,
or if `manifest.json` and `package.json` versions drift apart.

### Releasing

1. Bump the version in **both** `src/manifest.json` and `package.json`.
2. Update `CHANGELOG.md`.
3. Push a `vX.Y.Z` tag.

The `Publish` workflow then validates, packages, creates a GitHub release, and
— after a reviewer approves the `chrome-web-store` environment — uploads and
submits to the store.

## Contributing

Development happens on a private upstream and is published here, so this
repository is a downstream copy rather than the branch you commit to. Pull
requests and issues are welcome regardless: changes are applied upstream and
flow back out here, with authorship preserved.

Because of that, please expect `main` to move in batches rather than
commit-by-commit, and avoid basing long-lived branches on it.

## Privacy

The extension collects nothing. See [PRIVACY.md](PRIVACY.md).

## License

MIT — see [LICENSE](LICENSE).
