# Privacy Policy — New Tab Control

_Last updated: 2026-08-09_

## What is collected

Nothing.

New Tab Control has no analytics, no telemetry, no crash reporting, no network
calls of its own, and no server component. Nothing about you or your browsing
leaves your machine because of this extension.

## What is stored

One thing: your settings — the address you chose for your new tab page, whether
to redirect or embed, and the focus preference.

These are kept in `chrome.storage.sync`, which is Chrome's own settings storage.
If you have Chrome sync switched on, Chrome replicates them between your signed-in
devices under Google's privacy policy. The extension author has no access to
that data.

Uninstalling the extension removes the settings.

## What is accessed

The extension requests a single permission, `storage`.

It requests **no host permissions** and registers **no content scripts**, so it
cannot read, modify, or observe the pages you visit — including the page you
configure as your new tab. In redirect mode it hands the tab to that address and
stops being involved. In embed mode it places the address in a frame; the framed
page is subject to the same isolation as any other cross-origin frame.

## Third parties

None. The extension bundles no third-party code and loads no remote resources.

The page you choose as your new tab is an ordinary web page and is governed by
its own operator's privacy policy — including the default,
[https://devpossible.com/start/](https://devpossible.com/start/).

## Contact

support@devpossible.com
