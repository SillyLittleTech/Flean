// Content script: intercept fandom/wikia wiki pages and redirect to a selected Breezewiki mirror.

(async function () {
    try {
        const url = new URL(window.location.href);
        const host = url.host.toLowerCase();
        const path = url.pathname;

        // Only handle wiki pages: /wiki/...
        if (!path.startsWith('/wiki/')) return;

        // Known source hosts to rewrite from
        const isFandom = host === 'fandom.com' || host.endsWith('.fandom.com') || host.endsWith('.wikia.com');
        if (!isFandom) return;

        // Defaults
        const DEFAULTS = {
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
        };

        // Fast synchronous cache read (localStorage) to avoid blocking the page.
        let allowedSites = DEFAULTS.allowedSites.slice();
        let selectedMirror = DEFAULTS.selectedMirror;
        let askOnVisit = DEFAULTS.askOnVisit;
        let mirrors = DEFAULTS.mirrors.slice();
        try {
            const cache = JSON.parse(window.localStorage.getItem('__flean_cache') || 'null');
            if (cache && cache.ts && (Date.now() - cache.ts) < 30 * 1000) {
                allowedSites = cache.allowedSites || allowedSites;
                selectedMirror = (cache.selectedMirror || selectedMirror).toLowerCase();
                askOnVisit = !!cache.askOnVisit;
                mirrors = cache.mirrors || mirrors;
            }
        } catch (e) { /* ignore cache parse errors */ }

        // Background refresh of storage to keep the cache fresh (non-blocking)
        (async () => {
            try {
                const s = await browser.storage.local.get({ allowedSites: [], selectedMirror: DEFAULTS.selectedMirror, askOnVisit: DEFAULTS.askOnVisit, mirrors: DEFAULTS.mirrors });
                const cache = { allowedSites: s.allowedSites || [], selectedMirror: (s.selectedMirror || DEFAULTS.selectedMirror).toLowerCase(), askOnVisit: !!s.askOnVisit, mirrors: s.mirrors || DEFAULTS.mirrors, ts: Date.now() };
                try { window.localStorage.setItem('__flean_cache', JSON.stringify(cache)); } catch (e) { /* ignore */ }
            } catch (e) { /* ignore background refresh errors */ }
        })();

        // Fast session-scoped allow (for immediate navigation within this tab)
        let isSessionAllowed = false;
        try {
            const sess = window.sessionStorage.getItem('__flean_allow_until');
            if (sess) {
                const until = parseInt(sess, 10) || 0;
                if (Date.now() <= until) isSessionAllowed = true;
                else window.sessionStorage.removeItem('__flean_allow_until');
            }
        } catch (e) { /* ignore */ }

        if ((allowedSites || []).includes(host) || isSessionAllowed) {
            console.log('Flean: host is in ignore list or session-allowed, skipping redirection for', host);
            return;
        }

        // Derive the wiki name
        let wikiName = host;
        if (host.endsWith('.fandom.com') || host.endsWith('.wikia.com')) {
            const parts = host.split('.');
            if (parts.length >= 3) wikiName = parts[parts.length - 3]; else wikiName = parts[0];
        } else {
            wikiName = host.split('.')[0];
        }

        // Extract page title
        let page = path.replace(/^\/wiki\//i, '');
        try { page = decodeURIComponent(page); } catch (e) { /* ignore */ }

        // Compute mirror URL (fallback)
        const pageForMirror = page.replace(/\s+/g, '_').replace(/^\/+|\/+$/g, '');
        const wikiNameCap = wikiName.charAt(0).toUpperCase() + wikiName.slice(1);
        const mirrorUrl = `${url.protocol}//${selectedMirror}/${wikiNameCap}/wiki/${pageForMirror}${url.search}${url.hash}`;

        // If already on a mirror host, do nothing
        if (host === selectedMirror || (mirrors || []).includes(host)) return;

        // Fast-path for askOnVisit=false using sessionStorage-only attempt tracking
        if (!askOnVisit) {
            const ATTEMPT_WINDOW_MS = 10 * 1000; // 10s window
            const refHost = (document.referrer ? (() => { try { return new URL(document.referrer).host.toLowerCase(); } catch (e) { return null; } })() : null);
            const fromMirror = refHost && (mirrors.includes(refHost) || refHost === selectedMirror);
            const ATTEMPT_THRESHOLD = fromMirror ? 2 : 3;
            const SUPPRESS_COOLDOWN_MS = 30 * 1000;

            const now = Date.now();
            const pageKey = url.href;
            const attemptsKey = '__flean_attempts:' + pageKey;
            const suppressKey = '__flean_suppressed:' + pageKey;

            function readSessionArray(k) { try { return JSON.parse(window.sessionStorage.getItem(k) || '[]'); } catch (e) { return []; } }
            function writeSessionArray(k, arr) { try { window.sessionStorage.setItem(k, JSON.stringify(arr)); } catch (e) { /* ignore */ } }

            const recent = readSessionArray(attemptsKey).filter(ts => (now - ts) <= ATTEMPT_WINDOW_MS);
            recent.push(now);
            writeSessionArray(attemptsKey, recent);

            const suppressedUntil = parseInt(window.sessionStorage.getItem(suppressKey) || '0', 10) || 0;
            if (now < suppressedUntil) {
                console.debug('Flean: redirect suppressed until', new Date(suppressedUntil).toISOString());
                showSuppressionBanner();
                return;
            }

            if (recent.length >= ATTEMPT_THRESHOLD) {
                window.sessionStorage.setItem(suppressKey, String(now + SUPPRESS_COOLDOWN_MS));
                console.info('Flean: suppressing redirect for', pageKey, 'for', SUPPRESS_COOLDOWN_MS, 'ms (fromMirror=' + !!fromMirror + ')');
                showSuppressionBanner();
                return;
            }

            // Redirect quickly
            console.log('Flean: askOnVisit=false, redirecting', url.href, '->', mirrorUrl);
            try { window.location.replace(mirrorUrl); } catch (e) { console.warn('Flean: failed to redirect', e); }
            return;
        }

        // Helper: show suppression banner
        function showSuppressionBanner() {
            try {
                if (document.getElementById('flean-suppress-banner')) return;
                const banner = document.createElement('div');
                banner.id = 'flean-suppress-banner';
                banner.style.position = 'fixed';
                banner.style.top = '0';
                banner.style.left = '0';
                banner.style.right = '0';
                banner.style.zIndex = '2147483646';
                banner.style.background = '#fff3bf';
                banner.style.color = '#222';
                banner.style.borderBottom = '1px solid rgba(0,0,0,0.08)';
                banner.style.padding = '10px 12px';
                banner.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial';
                banner.style.display = 'flex';
                banner.style.alignItems = 'center';
                banner.style.justifyContent = 'space-between';

                const left = document.createElement('div');
                left.innerHTML = 'You were not redirected because of multiple quick attempts to open this page. <a id="flean-suppress-config" style="text-decoration:underline; color:#0b6cff; cursor:pointer">Configure settings for Flean</a>';
                banner.appendChild(left);

                const closeBtn = document.createElement('button');
                closeBtn.id = 'flean-suppress-close';
                closeBtn.textContent = 'Dismiss';
                closeBtn.style.background = 'transparent';
                closeBtn.style.border = 'none';
                closeBtn.style.cursor = 'pointer';
                closeBtn.style.color = '#0b6cff';
                banner.appendChild(closeBtn);

                const container = document.body || document.documentElement;
                if (container) container.insertBefore(banner, container.firstChild);

                const cfg = document.getElementById('flean-suppress-config');
                if (cfg) cfg.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    try {
                        if (browser && browser.runtime && typeof browser.runtime.openOptionsPage === 'function') {
                            browser.runtime.openOptionsPage();
                        }
                    } catch (err) { console.warn('Flean: could not open options from banner', err); }
                });
                closeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); banner.remove(); });
                console.debug('Flean: suppression banner shown');
            } catch (e) {
                console.warn('Flean: failed to create suppression banner', e);
            }
        }

        // If askOnVisit is true, show the overlay/interstitial so the user can decide.
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
                    <button class="flean-btn secondary" id="flean-allow-site">Allow on this page</button>
                    <a class="flean-link" id="flean-open-popup">Extension settings</a>
                </div>
            </div>
        `;

        if (document.head) document.head.appendChild(style); else document.documentElement.appendChild(style);
        if (document.body) document.body.appendChild(overlay); else document.documentElement.appendChild(overlay);

        const openBtn = overlay.querySelector('#flean-open-mirror');
        const onceBtn = overlay.querySelector('#flean-visit-once');
        const allowBtn = overlay.querySelector('#flean-allow-site');
        const settingsLink = overlay.querySelector('#flean-open-popup');

        console.debug('Flean: overlay buttons', { openBtn: !!openBtn, onceBtn: !!onceBtn, allowBtn: !!allowBtn, settingsLink: !!settingsLink });

        overlay.addEventListener('click', (ev) => {
            try { console.debug('Flean: overlay click', ev.target && (ev.target.id || ev.target.className || ev.target.tagName)); } catch (e) { /* ignore */ }
        }, { capture: true });

        if (openBtn) openBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            console.debug('Flean: open mirror button clicked');
            try { window.location.replace(mirrorUrl); } catch (err) { console.warn('Flean: failed to open mirror', err); }
        });

        if (onceBtn) onceBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            console.debug('Flean: visit once clicked');
            overlay.remove();
            style.remove();
        });

        if (allowBtn) allowBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            console.debug('Flean: allow site clicked for', host);
            try {
                const SESSION_ALLOW_MS = 5 * 1000; // 5 seconds
                const until = Date.now() + SESSION_ALLOW_MS;
                try { window.sessionStorage.setItem('__flean_allow_until', String(until)); } catch (e) { /* ignore */ }
                console.info('Flean: session-allow for host', host, 'until', new Date(until).toISOString());
            } catch (err) { console.warn('Flean: failed to set session allow', err); }
            overlay.remove();
            style.remove();
        });

        if (settingsLink) {
            const canOpenOptions = !!(browser && browser.runtime && typeof browser.runtime.openOptionsPage === 'function');
            if (!canOpenOptions) settingsLink.remove(); else settingsLink.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                try { browser.runtime.openOptionsPage(); } catch (err) { console.warn('Flean: could not open options page', err); settingsLink.remove(); }
            });
        }

    } catch (err) {
        console.error('Flean content script error:', err);
    }
})();
