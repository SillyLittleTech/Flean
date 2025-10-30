const DEFAULTS = {
	selectedMirror: 'antifandom.com',
	mirrors: ['antifandom.com', 'breezewiki.com', 'breezewiki.org'],
	allowedSites: []
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
	renderAllowedList(store.allowedSites || []);

	el('save').addEventListener('click', async () => {
		const selected = el('mirror').value;
		await browser.storage.local.set({ selectedMirror: selected });
		// update UI copy
		alert('Saved selected mirror: ' + selected);
	});

	el('reset').addEventListener('click', async () => {
		await browser.storage.local.set(DEFAULTS);
		renderMirrors(DEFAULTS.mirrors, DEFAULTS.selectedMirror);
		renderAllowedList(DEFAULTS.allowedSites);
		alert('Reset to defaults');
	});
});
