// Content script: intercept fandom/wikia wiki pages at document_start and offer
    // to redirect to a selected Breezewiki mirror (default: antifandom.com).

    (async function() {
        try {
            const url = new URL(window.location.href);
            const host = url.host.toLowerCase();
            const path = url.pathname;

            // Only handle wiki pages: /wiki/...
            if (!path.startsWith('/wiki/')) return;

            // Known source hosts to rewrite from
            const isFandom = host === 'fandom.com' || host.endsWith('.fandom.com') || host.endsWith('.wikia.com');
            if (!isFandom) return;

            // Load settings (defaults)
            const store = await browser.storage.local.get({
                allowedSites: [],
                selectedMirror: 'antifandom.com',
                askOnVisit: false,
                mirrors: [
                    'breezewiki.com',
                    'antifandom.com',
                    'breezewiki.pussthecat.org',
                    'bw.hamstro.dev',
                    'bw.projectsegfau.lt',
                    'breeze.hostux.net',
                    'bw.artemislena.eu',
                    'nerd.whatever.social',
                    'breezewiki.frontendfriendly.xyz',
                    'breeze.nohost.network',
                    'breeze.whateveritworks.org',
                    'z.opnxng.com',
                    'breezewiki.hyperreal.coffee',
                    'breezewiki.catsarch.com',
                    'breeze.mint.lgbt',
                    'breezewiki.woodland.cafe',
                    'breezewiki.nadeko.net',
                    'fandom.reallyaweso.me',
                    'breezewiki.4o1x5.dev',
                    'breezewiki.r4fo.com',
                    'breezewiki.private.coffee',
                    'fan.blitzw.in'
                ]
            });

            const allowedSites = store.allowedSites || [];
            const selectedMirror = (store.selectedMirror || 'antifandom.com').toLowerCase();
            const askOnVisit = !!store.askOnVisit;

            // If this host is in the user's ignore list (allowedSites), do not redirect.
            if ((allowedSites || []).includes(host)) {
                console.log('Flean: host is in ignore list, skipping redirection for', host);
                return;
            }

            // Datapack integration removed for now. We fallback to configured mirrors only.

            // Datapack disabled: no datapack match will be used; rely on mirror fallback.
            const datapackIndex = null;
            const datapackMatch = null;

            // Derive a wiki name from the fandom host (e.g. 'deltarune' from 'deltarune.fandom.com').
            let wikiName = host;
            if (host.endsWith('.fandom.com') || host.endsWith('.wikia.com')) {
                const parts = host.split('.');
                if (parts.length >= 3) {
                    wikiName = parts[parts.length - 3];
                } else {
                    wikiName = parts[0];
                }
            } else {
                wikiName = host.split('.')[0];
            }

            // Extract the wiki page title from the /wiki/<Title> fragment.
            let page = path.replace(/^\/wiki\//i, '');
            try { page = decodeURIComponent(page); } catch (e) { /* ignore */ }

            // If we found a datapack match prefer the destination_base_url and
            // destination_content_path defined in the datapack entry.
            let mirrorUrl = null;
            // No datapack match available; use mirror fallback below.
            {
                // Fallback behavior for generic mirrors: preserve the page title
                // capitalization/underscores where possible. Many mirrors accept
                // <Mirror>/<WikiName>/wiki/<Title> with Title preserving case.
                const pageForMirror = page.replace(/\s+/g, '_').replace(/^\/+|\/+$/g, '');
                // Capitalize wikiName for niceness (e.g. 'deltarune' -> 'Deltarune')
                const wikiNameCap = wikiName.charAt(0).toUpperCase() + wikiName.slice(1);
                mirrorUrl = `${url.protocol}//${selectedMirror}/${wikiNameCap}/wiki/${pageForMirror}${url.search}${url.hash}`;
            }

            // If we're already on a mirror host, do nothing.
            if (host === selectedMirror || (store.mirrors || []).includes(host)) return;

            // If askOnVisit is disabled, auto-redirect all fandom wiki pages to
            // the computed mirrorUrl (preferring datapack mappings when present).
            if (!askOnVisit) {
                console.log('Flean: askOnVisit=false, redirecting', url.href, '->', mirrorUrl);
                window.location.replace(mirrorUrl);
                return;
            }
            // If we reach here, askOnVisit is true — fall through to show overlay
            // so the user can choose whether to redirect or visit once.

            // If the user has disabled asking on visit, do not inject the overlay.
            // Previously we always showed the interstitial for unknown hosts which
            // made "Ask every time" behave counter-intuitively. If we reach here
            // and askOnVisit is false, just allow the page to load.
            if (!askOnVisit) {
                console.log('Flean: askOnVisit is false — skipping interstitial for', host);
                return;
            }

            // Inject a minimal overlay UI so the user can choose what to do.
            const style = document.createElement('style');
            style.textContent = `
                #flean-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); color:#fff; display:flex; align-items:center; justify-content:center; z-index:2147483647; }
                #flean-card { background:#0b1220; color:#fff; padding:18px; border-radius:10px; max-width:520px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; box-shadow:0 8px 30px rgba(0,0,0,0.6); }
                #flean-card h1 { font-size:18px; margin:0 0 8px; }
                #flean-card p { margin:0 0 12px; font-size:13px; color:#d1d9e6 }
                #flean-actions { display:flex; gap:8px; flex-wrap:wrap }
                .flean-btn { background:#1f6feb; color:#fff; border:none; padding:8px 10px; border-radius:6px; cursor:pointer }
                .flean-btn.secondary { background:#2d3748 }
                .flean-link { color:#9bd1ff; text-decoration:underline; cursor:pointer }
            `;

            const overlay = document.createElement('div');
            overlay.id = 'flean-overlay';
            overlay.innerHTML = `
                <div id="flean-card">
                    <h1>Open this Fandom wiki on a Breezewiki mirror?</h1>
                    <p>This page appears to be a Fandom wiki article. You can open the same article on <strong>${selectedMirror}</strong> (recommended), or continue to visit the Fandom page.</p>
                    <div id="flean-actions">
                        <button class="flean-btn" id="flean-open-mirror">Open on ${selectedMirror}</button>
                        <button class="flean-btn secondary" id="flean-visit-once">Visit Fandom (once)</button>
                        <button class="flean-btn secondary" id="flean-allow-site">Always allow this host</button>
                        <a class="flean-link" id="flean-open-popup">Extension settings</a>
                    </div>
                </div>
            `;

            // Append elements to the document as early as possible.
            document.documentElement.appendChild(style);
            document.documentElement.appendChild(overlay);

            // Handlers
            document.getElementById('flean-open-mirror').addEventListener('click', () => {
                // Navigate to mirror (replace so back doesn't go here)
                window.location.replace(mirrorUrl);
            });

            document.getElementById('flean-visit-once').addEventListener('click', () => {
                // Remove overlay and let page load normally for this visit.
                overlay.remove();
                style.remove();
            });

            document.getElementById('flean-allow-site').addEventListener('click', async () => {
                // Add host to allowedSites and continue to fandom page.
                const updated = Array.from(new Set([...(allowedSites || []), host]));
                await browser.storage.local.set({ allowedSites: updated });
                overlay.remove();
                style.remove();
            });

            document.getElementById('flean-open-popup').addEventListener('click', () => {
                // Open extension popup (action) programmatically when possible.
                // Some browsers ignore this; fallback: instruct user to click toolbar icon.
                try { browser.runtime.openOptionsPage(); } catch (e) { /* ignore */ }
            });

        } catch (err) {
            // If anything fails, don't block the page.
            console.error('Flean content script error:', err);
        }
    })();
