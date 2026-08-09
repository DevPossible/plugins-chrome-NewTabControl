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
| Store icon | 128×128 | `src/icons/icon128.png` |
| Small promo tile | 440×280 | `.aitemp/store-assets/promo-small-440x280.png` |
| Marquee promo tile | 1400×560 | `.aitemp/store-assets/promo-marquee-1400x560.png` |
| Screenshots | 1280×800 | **Must be captured from the running extension** |

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

## After the first upload

The first upload has to be manual, because the item ID does not exist until
Chrome assigns one. Once it does:

1. Copy the item ID from the dashboard URL.
2. Add it to Keeper, then add these four GitHub Actions secrets to
   `DevPossible/plugins-chrome-NewTabControl`:
   `CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`.
3. Create a GitHub environment named `chrome-web-store` with yourself as a
   required reviewer.

From then on, tagging `vX.Y.Z` on upstream drives the release end to end.
