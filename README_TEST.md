Flean — local test harness

This small helper serves a local PHP UI to test the extension popup and the redirect URL generator.

Run it:

```bash
# from the repo root
php -S localhost:8000

# then open http://localhost:8000/ in your browser
```

What it provides
- `index.php` — a small UI that embeds the extension `popup.html` and provides a form to test redirect URL generation.
- `redirect.php` — server-side endpoint that reads `ios/extention/Resources/indies/datapack-compiled.json` and returns a candidate redirect URL for a given `url` query parameter.

Notes
- The datapack in the repo is large; the test generator tries to be tolerant if the file is missing an outer object. If you see `datapack unreadable or invalid JSON`, check the datapack file or regenerate the compiled datapack.
- The popup UI in the iframe is loaded from `ios/extention/Resources/popup.html` and expects its sibling files (`popup.js`, `popup.css`) to be available via the same path — the built-in server serves those files as static assets.
