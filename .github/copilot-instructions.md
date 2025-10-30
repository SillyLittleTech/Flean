## Quick orientation — what this repo is

This repository contains a small macOS app that bundles a Safari Web Extension. The native macOS app provides a tiny UI (a WKWebView) and a bridge to open Safari extension preferences; the extension contains background, content and popup scripts that use the WebExtension (browser.*) APIs.

Key locations
- macOS app: `Flean/` — UI + app targets. See `Flean/ViewController.swift` and `Flean/AppDelegate.swift`.
- App resources (UI shown inside the mac app): `Flean/Resources/Base.lproj/Main.html` and `Flean/Resources/Script.js`.
- Safari Web Extension: `Flean Extension/Resources/` (manifest.json, `background.js`, `content.js`, `popup.*`).
- Native message handler (from extension -> app): `Flean Extension/SafariWebExtensionHandler.swift`.

High-level flow & patterns
- The mac app loads `Main.html` into a `WKWebView` and exposes a script message handler named `controller` (see `ViewController.swift`). `Script.js` posts messages with `webkit.messageHandlers.controller.postMessage(...)` — currently used to open extension preferences.
- The extension uses standard WebExtension APIs: `browser.runtime.sendMessage(...)` from `content.js`, and `browser.runtime.onMessage` in `background.js`. These are small examples you can extend.
- Native messaging from the extension is handled in `SafariWebExtensionHandler.swift`: it logs incoming messages and echoes them back in the response. This is the integration point between the browser extension and the host app.

Build & debug notes (project-specific)
- Open the Xcode project/workspace in Xcode from the repo root: either `Flean.xcodeproj` or the workspace in `Flean.xcodeproj/project.xcworkspace`.
- Run the mac app (`Flean` scheme) to see the small settings UI. That UI queries `SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier:)` to determine whether the extension is enabled (see `ViewController.swift`).
- To test extension scripts, use the extension target (install/run from Xcode) and open Safari's Web Inspector / extension debugging tools to view console.log output from `background.js`, `content.js`, and `popup.js`.
- Note: `manifest.json` in `Flean Extension/Resources/` uses `manifest_version: 3`. Content script `matches` currently targets `*://example.com/*` — update that to the domains you need to test.

Project-specific conventions & gotchas
- Web resources for the app UI are under `Flean/Resources/` and referenced with `Bundle.main.url(forResource: "Main", withExtension: "html")` in `ViewController.swift` — relative paths in `Main.html` (e.g., `../Script.js`) are intentional.
- The extension's files live inside the Xcode extension target resources (see `Flean Extension/Resources/`). When changing JS files, rebuild the extension target in Xcode to ensure updated assets are packaged.
- Native messages: `SafariWebExtensionHandler.swift` checks availability of platform APIs (different keys for older macOS versions) — preserve these conditionals if you modify the message payload handling.

Concrete examples to reference
- Open extension preferences from the app UI: `webkit.messageHandlers.controller.postMessage("open-preferences")` (see `Flean/Resources/Script.js` and `ViewController.swift`).
- Simple runtime message from content -> background -> response:
  - `content.js`: `browser.runtime.sendMessage({ greeting: "hello" }).then(...)`
  - `background.js`: `browser.runtime.onMessage.addListener((request, sender) => { if (request.greeting === "hello") return Promise.resolve({ farewell: "goodbye" }); })`
- Native message echo: `SafariWebExtensionHandler.beginRequest(with:)` logs `message` and returns an item with `SFExtensionMessageKey: [ "echo": message ]`.

How AI agents should edit this repo
- Prefer minimal, targeted edits. If changing extension JS, update the files under `Flean Extension/Resources/` and rebuild the extension target in Xcode.
- Mention and preserve platform availability checks in `SafariWebExtensionHandler.swift` when modifying native-message handling.
- When adding domains to `manifest.json` `content_scripts.matches`, ensure tests or examples are updated; currently `example.com` is a placeholder.

If anything is unclear or you'd like more detail (build steps, Xcode schemes, or sample automated tests), tell me which area and I'll expand this file with exact commands and examples.
