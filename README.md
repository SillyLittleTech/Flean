# Flean
Convert Yucky Fandom URLs to Breezewiki URLs

> **Info:** Use Chrome or Firefox, use https://getindie.wiki instead :)

## How it works

Flean is a small Safari Web Extension (with native host helpers) that redirects visits to Fandom wiki pages to independent mirrors. The goal is to provide fast, privacy-friendly redirects to community-hosted wiki mirrors.

- Extension core files
	- `ios/extention/Resources/manifest.json` — extension metadata and entry points.
	- `ios/extention/Resources/popup.html`, `popup.js`, `popup.css` — popup UI where the user picks a mirror, toggles "ask on visit", and manages an ignore list.
	- `ios/extention/Resources/content.js` / `background.js` — runtime logic that runs on visited pages and computes redirects.
	- Optional mapping files (not required) — the extension can use an internal mapping or external mapping files to associate Fandom hosts with mirror destinations (destBase + destPath). If no mapping is present the extension falls back to simple heuristics to build candidate mirror URLs.

- Runtime flow
	1. The content script detects the current host (for example `deltarune.fandom.com`) and either looks it up in an internal mapping (if provided) or computes candidate mirror hosts using simple heuristics.
	2. If a candidate destination is determined it constructs the destination URL (base domain + path) plus the article/title from the original path.
	3. Depending on settings (`askOnVisit`, ignore/allow lists), the extension either redirects immediately or prompts the user via the popup to confirm.

- Native host (macOS / iOS)
	- The repository includes a tiny macOS app and an iOS WebView host that can load the same `Main.html` UI. The native host exposes a `controller` script message handler so the web UI can get/set settings and persist them to Application Support.
	- On iOS the app stores settings in `Application Support/Flean/settings.json` (see `ios/Flean/iOS/SettingsStore.swift`) and pushes updates into the web UI via `CustomEvent('flean:message')`.

- Test harness
	- For quick local testing I added a small PHP-based test harness at the repo root:
		- `index.php` — loads the popup UI in an iframe and provides a form to test redirect generation.
		- `redirect.php` — server-side endpoint that uses a small built-in mapping or simple heuristics to return a candidate redirect URL for a provided `?url=` parameter. It does not require a compiled datapack to be present.
	- To run the test harness locally (PHP required):
		```bash
		# from the repo root
		php -S localhost:8000 -t /Users/kiyarose/Documents/GitStuff/Flean
		# then open http://localhost:8000/ in your browser
		```

If you want I can further:
- Make the popup UI gracefully fall back to the test harness API when running in a regular browser (so the iframe is fully interactive).
- Improve the redirect generator to preserve queries/fragments and do safer percent-encoding when composing mirror URLs.
- Add App Group entitlements if you want the extension and native host to share settings directly (this requires provisioning updates).

