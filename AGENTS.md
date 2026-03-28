# Flean — Agent Guide

## What this app is

Flean is a Safari Web Extension (with native host helpers) that redirects Fandom wiki URLs to independent community-hosted mirrors (e.g. Breezewiki). It ships as **two separate Xcode projects** — one for iOS and one for macOS — that share the same extension JavaScript resources.

---

## Repository layout

```
/
├── ios/                          # iOS Xcode project
│   ├── Flean.xcodeproj/          # iOS app project file
│   ├── Flean/                    # iOS native app source (SwiftUI/WKWebView host)
│   │   ├── Assets.xcassets/      # App icons and image assets
│   │   ├── Resources/            # Shared web UI (Main.html, Script.js)
│   │   └── iOS/                  # SwiftUI entry point + SettingsStore
│   ├── extention/                # Safari Web Extension target (note: folder is misspelled)
│   │   └── Resources/            # Extension JS, HTML, CSS, manifest.json, images/
│   ├── FleanTests/
│   └── FleanUITests/
│
├── mos/                          # macOS Xcode project
│   ├── Flean.xcodeproj/          # macOS app project file
│   ├── Flean/                    # macOS native app source (AppKit/WKWebView host)
│   │   ├── Assets.xcassets/
│   │   ├── Resources/            # Shared web UI (Main.html, Script.js)
│   │   └── iOS/                  # iOS SwiftUI host (reused here)
│   ├── Flean Extension/          # Safari Web Extension target
│   │   └── Resources/            # Extension JS, HTML, CSS, manifest.json, images/
│   ├── FleanTests/
│   └── FleanUITests/
│
├── docs/                         # Additional documentation
├── index.php                     # Local test harness (loads popup in iframe)
├── redirect.php                  # Local test redirect endpoint
├── README.md
└── AGENTS.md                     # This file
```

> **Important:** iOS lives in `/ios/` and macOS lives in `/mos/`. These are **completely separate Xcode projects** (`ios/Flean.xcodeproj` and `mos/Flean.xcodeproj`). Changes that need to apply to both platforms must be made in **both** directories.

---

## Key files — where things actually are

| What | iOS path | macOS path |
|---|---|---|
| Xcode project | `ios/Flean.xcodeproj/project.pbxproj` | `mos/Flean.xcodeproj/project.pbxproj` |
| Extension manifest | `ios/extention/Resources/manifest.json` | `mos/Flean Extension/Resources/manifest.json` |
| Extension images | `ios/extention/Resources/images/` | `mos/Flean Extension/Resources/images/` |
| Extension JS | `ios/extention/Resources/{background,content,popup}.js` | `mos/Flean Extension/Resources/{background,content,popup}.js` |
| App icon assets | `ios/Flean/Assets.xcassets/AppIcon.appiconset/` | `mos/Flean/Assets.xcassets/AppIcon.appiconset/` |
| Native app Swift | `ios/Flean/iOS/` | `mos/Flean/AppDelegate.swift`, `mos/Flean/ViewController.swift` |

---

## Version numbers

Version numbers live in **two places** and must be kept in sync manually. Current values (as of release 2.1.6 / build 3) are shown below — replace them with your next release numbers in **both** projects:

### 1. Extension manifest (`manifest.json`) — `version` field
Both `ios/extention/Resources/manifest.json` and `mos/Flean Extension/Resources/manifest.json` contain the extension version, for example:
```json
"version": "2.1.6"
```
Update this value in **both** files for every release.

### 2. Xcode project files (`project.pbxproj`) — `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`
Both `ios/Flean.xcodeproj/project.pbxproj` and `mos/Flean.xcodeproj/project.pbxproj` contain multiple occurrences like:
```
MARKETING_VERSION = 2.1.6;
CURRENT_PROJECT_VERSION = 3;
```
`MARKETING_VERSION` is the user-visible version string; `CURRENT_PROJECT_VERSION` is the build number. Update all occurrences in **both** files (use a global find-and-replace — there are ~8 occurrences of each per file).

---

## Extension toolbar icon

The icon displayed in the Safari toolbar comes from the `action.default_icon` field in **each extension's `manifest.json`**, not from the app's Asset Catalog. To change it, update:

```json
"action": {
    "default_popup": "popup.html",
    "default_icon": {
        "48": "images/icon-48.png",
        "96": "images/icon-96.png",
        "128": "images/icon-128.png",
        "256": "images/icon-256.png",
        "512": "images/icon-512.png"
    }
}
```

in both `ios/extention/Resources/manifest.json` and `mos/Flean Extension/Resources/manifest.json`. The `images/` directory inside each extension Resources folder contains the icon files (`icon-48.png`, `icon-96.png`, `icon-128.png`, `icon-256.png`, `icon-512.png`, etc.).

---

## Building without Xcode (manual edits)

Because no `.xcscheme` files are committed to the repository, builds must be driven via `-project` / `-target` flags:

```bash
# iOS
cd ios
xcodebuild build -project Flean.xcodeproj -target Flean \
    -sdk iphonesimulator SYMROOT=build

# macOS
cd mos
xcodebuild build -project Flean.xcodeproj -target Flean \
    -sdk macosx SYMROOT=build
```

When editing project files manually (without Xcode open), use a plain text editor or `sed` to update `project.pbxproj`. The file is plain text despite the `.pbxproj` extension.

---

## Common gotchas

- **Two separate projects, not one workspace.** Don't assume a change in `ios/` applies to `mos/` — you must update both explicitly.
- **The iOS extension folder is misspelled** as `extention` (missing an 's'). This is intentional/historical; do not rename it without updating all Xcode project references.
- **No `.xcscheme` files are committed.** `xcodebuild -scheme` will fail; use `-target` instead.
- **Toolbar icon ≠ app icon.** The app icon (in `Assets.xcassets/AppIcon.appiconset/`) controls what appears on the home screen / Launchpad. The toolbar icon in Safari is controlled by `action.default_icon` in `manifest.json`.
- **Shared web resources** (`Main.html`, `Script.js`) are referenced by both the iOS and macOS native app targets, but they live inside each project's own `Resources/` folder — they are not a single shared source file.
