# Chrome Web Store listing — New Tab Control

Paste-ready copy for the developer dashboard. Kept in the repo so the listing is
reviewable and versioned alongside the code it describes.

Regenerate the promo tiles with `python scripts/make-promo.py`
(output: `.aitemp/store-assets/`, not committed).

---

## Store listing tab

**Name**

```
New Tab Control
```

**Short description** (132 char limit — this is 106)

```
Choose what your new tab page is. One permission, no tracking, no access to the pages you browse. Open source.
```

**Category**: Workflow & Planning
**Language**: English (United States)

**Detailed description**

```
New Tab Control replaces Chrome's new tab page with a page you choose.

Point it at a dashboard, a team wiki, your notes, a local server, or the
DevPossible Start Page it ships with by default. Any http:// or https://
address works.

TWO WAYS TO OPEN IT

• Redirect — navigates the tab straight to your page. Works with every site.
• Embed — keeps the new tab URL and frames your page, so the address bar stays
  empty and ready to type. Some sites refuse to be framed; New Tab Control
  detects that and tells you, instead of leaving you with a blank page.

BUILT TO ASK FOR AS LITTLE AS POSSIBLE

New tab replacements are a category where extensions routinely ask for far more
access than the job needs. This one asks for a single permission, "storage",
used only to remember your setting.

It requests no access to the websites you visit. It registers no content
scripts, so it cannot read or change any page — including the one you set as
your new tab. There is no analytics, no telemetry, and no server. Nothing about
you or your browsing leaves your machine.

It bundles no third-party code and loads nothing from the network at runtime.

OPEN SOURCE

Every line is published, and the build that reaches this listing is produced by
a public, automated pipeline:
https://github.com/DevPossible/plugins-chrome-NewTabControl

Your settings are stored in Chrome's own sync storage, so they follow you
between the devices where you are signed in to Chrome.
```

---

## Privacy practices tab

**Single purpose**

```
The single purpose of this extension is to replace Chrome's new tab page with a
web page chosen by the user.
```

**Justification — "storage" permission**

```
Used solely to save the user's own settings: the address they chose for their
new tab page, whether to open it by redirecting or by embedding it, and the
focus preference. Storing these is what makes the chosen page persist between
sessions and sync across the user's signed-in Chrome profiles. No browsing data,
history, or personal information is stored.
```

**Are you using remote code?**

```
No, I am not using remote code
```

All executable code is contained in the extension package. The extension loads
no scripts from the network.

**Data usage** — certify that this extension does **not** collect or transmit
any of the listed data types. Leave every category unchecked, then accept all
three certifications (no unrelated sale/transfer, no unrelated use, no
creditworthiness/lending use).

**Privacy policy URL**

```
https://github.com/DevPossible/plugins-chrome-NewTabControl/blob/main/PRIVACY.md
```

> Better long-term: host it at `https://devpossible.com/legal/newtabcontrol-privacy`
> and point here. A privacy policy on your own verified domain reads stronger
> than one on a code host, and it survives the repo being renamed.

---

## Assets

| Asset | Size | Where |
|---|---|---|
| Store icon | 128×128 | `.aitemp/store-assets/store-icon-128x128.png` |
| Small promo tile | 440×280 | `.aitemp/store-assets/promo-small-440x280.png` |
| Marquee promo tile | 1400×560 | `.aitemp/store-assets/promo-marquee-1400x560.png` |
| Screenshot | 1280×800 | `.aitemp/store-assets/screenshot-1-settings-1280x800.png` |

Regenerate with `python scripts/make-icons.py`, `scripts/make-promo.py`, and
`scripts/make-screenshot.py <capture.png> <out-name>`.

> **The store icon is not `src/icons/icon128.png`.** The manifest icon fills its
> canvas edge to edge, which is right for the toolbar and wrong for the listing.
> The store spec is 96×96 of artwork inside 16px of transparent padding on every
> side, so it gets its own render. The store icon also carries a faint light
> glow, per Google's guidance for mostly-dark marks, so it stays visible against
> the store's dark theme.

Screenshots have to be real — a mockup that does not match the shipped UI is
grounds for rejection. Load `src/` unpacked via `chrome://extensions` →
Developer mode → Load unpacked, then capture:

1. A new tab showing the DevPossible Start Page (the default experience).
2. The options page, showing the address field and the redirect/embed choice.
3. Optional: the toolbar popup open.

---

## Distribution tab

- **Visibility**: Public
- **Regions**: All — but this requires trader status to be declared, or EU
  regions must be excluded.
- **Pricing**: Free

---

## Item identity

Submitted for review 2026-08-09.

| | |
|---|---|
| Item ID | `khecnhnblkgciddahmejociofniofand` |
| Dashboard | [devconsole](https://chrome.google.com/webstore/devconsole/fb000369-502b-4c28-9bc8-76f76e209ae5/khecnhnblkgciddahmejociofniofand/edit) |
| Public listing (once approved) | `https://chromewebstore.google.com/detail/khecnhnblkgciddahmejociofniofand` |

The item ID is public, not a secret — it appears in every install URL.

## Automating subsequent releases

Done:

- ✅ `CWS_EXTENSION_ID` set as a GitHub Actions secret.
- ✅ GitHub environment `chrome-web-store` created, with `devpossible-richard`
  as a required reviewer and deployments restricted to `v*` tags.

Still needed — three more secrets, from a Google Cloud project owned by
`support@devpossible.com`:

| Secret | Source |
|---|---|
| `CWS_CLIENT_ID` | OAuth 2.0 client, type **Desktop app** |
| `CWS_CLIENT_SECRET` | same client |
| `CWS_REFRESH_TOKEN` | one-time consent as `support@devpossible.com`, scope `https://www.googleapis.com/auth/chromewebstore` |

### Console steps

Signed in as `support@devpossible.com` at
[console.cloud.google.com](https://console.cloud.google.com):

1. Create a project — e.g. `devpossible-publishing`.
2. **APIs & Services → Library** → enable **Chrome Web Store API**.
3. **OAuth consent screen** → User type **External**. (Internal is not offered:
   `devpossible.com` mail is Microsoft 365, so there is no Workspace directory
   behind this account.) Fill in app name, support email, developer email.
4. ⚠️ **Set Publishing status to "In production".** See the warning below.
5. **Credentials → Create credentials → OAuth client ID → Desktop app.**
   Copy the client ID and secret.

Then, with Keeper unlocked:

```bash
cd C:\Dev\ado\devpossible\Plugins\Chrome\newtabcontrol
npm run mint-token
```

That opens the consent page, catches the redirect, and writes all three values
to Keeper and to GitHub Actions secrets without them passing through the
clipboard.

### ⚠️ Leave the consent screen in Testing and CI breaks every 7 days

With User type **External** and publishing status **Testing**, Google revokes
refresh tokens after **7 days**. The pipeline would work, then fail every
following week with `invalid_grant`, on a cadence just slow enough to look like
something else. Setting the status to **In production** is what makes the token
durable.

Verification is not needed for this: the only account that ever authorizes the
app is the publisher account itself. An unverified app in production shows a
warning on the consent screen, which is irrelevant for a one-time internal
consent.

In production the token is effectively indefinite, with two caveats worth
knowing: it dies after **6 months of no use** — plausible here, since releases
are infrequent — and there is a cap of 50 live refresh tokens per client/user,
after which the oldest is silently revoked. If a release ever fails with
`invalid_grant`, re-run `npm run mint-token`; nothing else needs rebuilding.

The `store` job stays skipped until **all four** secrets are present, so a
partial setup cannot burn a reviewer approval and then fail on a missing
credential.

From then on, tagging `vX.Y.Z` on upstream drives the release end to end.
