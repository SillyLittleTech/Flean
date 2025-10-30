const DEFAULTS = {
	selectedMirror: 'antifandom.com',
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
		const li = document.createElement('li'); li.textContent = 'No allowed sites'; li.className = 'empty'; ul.appendChild(li); return;
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

	// Save selected mirror and the askOnVisit flag
	el('save').addEventListener('click', async () => {
		const selected = el('mirror').value;
		const askVal = !!el('askOnVisit').checked;
		await browser.storage.local.set({ selectedMirror: selected, askOnVisit: askVal });
		// update UI copy
		alert('Saved settings');
	});

	// Persist askOnVisit immediately when toggled
	el('askOnVisit').addEventListener('change', async (e) => {
		await browser.storage.local.set({ askOnVisit: !!e.target.checked });
	});

	el('reset').addEventListener('click', async () => {
		await browser.storage.local.set(DEFAULTS);
		renderMirrors(DEFAULTS.mirrors, DEFAULTS.selectedMirror);
		renderAllowedList(DEFAULTS.allowedSites);
		alert('Reset to defaults');
	});
});
