<?php
// Simple test UI for the Flean extension popup and redirect generator.
// Usage: php -S localhost:8000
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Flean — Test UI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; margin: 20px; }
    .col { display: flex; gap: 20px; }
    .panel { flex: 1; min-width: 320px; }
    iframe { width: 360px; height: 480px; border: 1px solid #ddd; }
    input[type="text"] { width: 100%; padding: 8px; }
    button { padding: 8px 12px; }
    pre { background:#f6f6f6; padding:10px; overflow:auto }
  </style>
</head>
<body>
  <h1>Flean — Local test harness</h1>
  <p>This page helps test the extension popup UI (left) and the redirect URL generator (right).</p>

  <div class="col">
    <div class="panel">
      <h2>Extension popup (iframe)</h2>
      <p>The iframe loads the popup HTML bundled in the repo. It expects supporting files to be served from the same path.</p>
      <iframe src="/ios/extention/Resources/popup.html" title="Flean popup"></iframe>
    </div>

    <div class="panel">
      <h2>Redirect generator</h2>
      <form id="genForm">
        <label for="url">Fandom URL to redirect</label>
        <input id="url" name="url" type="text" placeholder="https://deltarune.fandom.com/wiki/Chapter_1" />
        <div style="margin-top:8px">
          <button type="submit">Generate redirect URL</button>
        </div>
      </form>

      <h3>Result</h3>
      <div id="result">
        <p>No result yet.</p>
      </div>

      <h3>Raw datapack preview (first 400 bytes)</h3>
      <pre id="datapackPreview">loading…</pre>
    </div>
  </div>

  <script>
    async function fetchPreview() {
      try {
        const r = await fetch('/redirect.php?preview=1');
        const txt = await r.text();
        document.getElementById('datapackPreview').textContent = txt;
      } catch (e) {
        document.getElementById('datapackPreview').textContent = 'failed to load datapack preview: '+e;
      }
    }
    fetchPreview();

    document.getElementById('genForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const url = document.getElementById('url').value.trim();
      if (!url) return alert('Enter a URL');
      document.getElementById('result').textContent = 'Working…';
      try {
        const res = await fetch('/redirect.php?url=' + encodeURIComponent(url));
        const json = await res.json();
        let html = '';
        if (json.matched) {
          html += `<p><strong>Redirect URL:</strong> <a href="${json.redirect}">${json.redirect}</a></p>`;
        } else {
          html += `<p><strong>No datapack match for host:</strong> ${json.host}</p>`;
        }
        html += '<pre>' + JSON.stringify(json, null, 2) + '</pre>';
        document.getElementById('result').innerHTML = html;
      } catch (e) {
        document.getElementById('result').textContent = 'Error: '+e;
      }
    });
  </script>
</body>
</html>
