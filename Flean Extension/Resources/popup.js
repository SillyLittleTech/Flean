
function normalizeHost(str){
	if (!str) return str;
	try { return new URL(str).host.toLowerCase(); } catch (e) { try { return new URL('https://' + str).host.toLowerCase(); } catch (e2) { return str.toLowerCase().replace(/^https?:\/\//,'').replace(/\/$/,''); } }
}

const DEFAULTS = {
	selectedMirror: 'breezewiki.com',
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
	],
	allowedSites: [],
	askOnVisit: false
};

function el(id){ return document.getElementById(id); }

async function loadState(){
	const store = await browser.storage.local.get(DEFAULTS);
	return store;
}

function renderMirrors(mirrors, selected){
	const sel = el('mirror');
	sel.innerHTML = '';
	mirrors.forEach(m => {
		const opt = document.createElement('option'); opt.value = m; opt.textContent = m; if (m === selected) opt.selected = true; sel.appendChild(opt);
	});
}

function renderAllowedList(list){
	const ul = el('allowedList');
	ul.innerHTML = '';
	if (!list || list.length === 0){
		const li = document.createElement('li'); li.textContent = 'No ignored sites'; li.className = 'empty'; ul.appendChild(li); return;
	}
	list.forEach(item => {
		const li = document.createElement('li');
		li.textContent = item;
		const btn = document.createElement('button'); btn.textContent = 'Remove'; btn.className = 'small';
		btn.addEventListener('click', async () => {
			const store = await browser.storage.local.get(DEFAULTS);
			const updated = (store.allowedSites || []).filter(x => x !== item);
			await browser.storage.local.set({ allowedSites: updated });
			renderAllowedList(updated);
		});
		li.appendChild(btn);
		ul.appendChild(li);
	});
}

document.addEventListener('DOMContentLoaded', async () => {
	const store = await loadState();
	renderMirrors(store.mirrors, store.selectedMirror);
	// initialize the Ask toggle
	const ask = el('askOnVisit');
	ask.checked = !!store.askOnVisit;
	renderAllowedList(store.allowedSites || []);

	// Persist selected mirror as soon as user changes it so the popup can close
	// without losing the selection. Normalize the value to a host so content
	// scripts see a consistent value.
	el('mirror').addEventListener('change', async (e) => {
		let selected = e.target.value || '';
		selected = normalizeHost(selected);
		await browser.storage.local.set({ selectedMirror: selected });
		console.log('Flean: saved selectedMirror', selected);
	});

	// Persist askOnVisit immediately when toggled
	el('askOnVisit').addEventListener('change', async (e) => {
		await browser.storage.local.set({ askOnVisit: !!e.target.checked });
		console.log('Flean: askOnVisit changed', !!e.target.checked);
	});

	// Add host to ignore list
	el('addHostBtn').addEventListener('click', async () => {
		const input = el('addHostInput');
		let host = (input.value || '').trim();
		if (!host) return;
		// normalize
		host = host.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
		const store = await browser.storage.local.get(DEFAULTS);
		const updated = Array.from(new Set([...(store.allowedSites || []), host]));
		await browser.storage.local.set({ allowedSites: updated });
		renderAllowedList(updated);
		input.value = '';
	});

	// Reset removed: settings persist immediately. If you need to reset, clear storage manually or reinstall extension.
});
