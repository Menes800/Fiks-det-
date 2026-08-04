(() => {
  'use strict';

  const H = window.HED21;
  const V = window.HED22;
  const W = window.HED23;
  if (!H || !V || !W) return;

  const state = { step: 'templates', templateKey: '', context: null, plan: null, search: '', busy: false };
  const favoriteKey = 'hed-v24-template-favorites';
  const recentKey = 'hed-v24-template-recent';
  const esc = (value) => H.html(String(value ?? ''));

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch { return fallback; }
  }
  function writeJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function favorites() { return new Set(readJson(favoriteKey, [])); }
  function recents() { return readJson(recentKey, []); }
  function remember(key) { if (key) writeJson(recentKey, [key, ...recents().filter((entry) => entry !== key)].slice(0, 5)); }

  function ensureDialog() {
    let dialog = document.querySelector('#v24-wizard');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'v24-wizard';
    dialog.className = 'v23-dialog v24-dialog';
    dialog.innerHTML = '<div class="v23-panel v24-panel" data-v24-panel></div>';
    document.body.append(dialog);
    dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
    return dialog;
  }

  function header(title, back = false) {
    return `<header class="v23-header"><button type="button" class="v23-back" data-v24-${back ? 'back' : 'close'}>${back ? 'Tilbake' : 'Lukk'}</button><div><small>SMART LISTEBYGGER</small><h2>${esc(title)}</h2></div><span></span></header>`;
  }

  function open() {
    Object.assign(state, { step: 'templates', templateKey: '', context: null, plan: null, search: '', busy: false });
    const dialog = ensureDialog();
    render();
    if (!dialog.open) dialog.showModal();
  }
  function close() { const dialog = document.querySelector('#v24-wizard'); if (dialog?.open) dialog.close(); }

  function templateCard(template, favs) {
    const fav = favs.has(template.key);
    return `<article class="v23-template-card"><button type="button" class="v23-template-main" data-v24-template="${esc(template.key)}"><span class="v23-template-icon">${template.icon}</span><span><strong>${esc(template.name)}</strong><small>${esc(template.description)}</small></span><i>›</i></button><button type="button" class="v23-favorite ${fav ? 'is-active' : ''}" data-v24-favorite="${esc(template.key)}" aria-label="Favoritt">${fav ? '★' : '☆'}</button></article>`;
  }

  function renderTemplates() {
    const favs = favorites();
    const recent = recents();
    const query = state.search.trim().toLocaleLowerCase('nb-NO');
    const list = W.templates.filter((template) => !query || `${template.name} ${template.description}`.toLocaleLowerCase('nb-NO').includes(query));
    list.sort((a, b) => Number(favs.has(b.key)) - Number(favs.has(a.key)) || (recent.indexOf(a.key) < 0 ? 99 : recent.indexOf(a.key)) - (recent.indexOf(b.key) < 0 ? 99 : recent.indexOf(b.key)));
    return `${header('Hva skal du planlegge?')}<div class="v23-scroll v24-template-scroll">
      <section class="v24-rule-intro"><span>✨</span><div><small>SMART UTEN AI</small><h3>Trykk deg frem til riktig liste</h3><p>Valgene dine styrer antall klær, værtilpasning, bagasje og hva som faktisk bør være med.</p></div></section>
      <div class="v23-section-title"><div><small>VELG EN MAL</small><h3>Raske valg</h3></div><input data-v24-search type="search" value="${esc(state.search)}" placeholder="Søk"></div>
      <section class="v23-template-grid">${list.map((template) => templateCard(template, favs)).join('') || '<p class="v23-empty">Ingen maler passer søket.</p>'}</section>
      <button type="button" class="v23-empty-button" data-v24-empty>Start helt tom liste</button></div>`;
  }

  const choices = {
    duration: [['1-2', '1–2 dager'], ['3-5', '3–5 dager'], ['week', '1 uke'], ['longer', '2+ uker']],
    transport: [['fly', '✈️ Fly'], ['car', '🚗 Bil'], ['train', '🚆 Tog'], ['other', 'Annet']],
    baggage: [['carryon', 'Kun håndbagasje'], ['normal', 'Vanlig bag'], ['checked', 'Innsjekket koffert']],
    packingStyle: [['light', 'Pakk lett'], ['normal', 'Vanlig'], ['safe', 'Litt ekstra']],
    laundry: [['yes', 'Ja'], ['no', 'Nei'], ['unknown', 'Vet ikke']],
    climate: [['hot', '☀️ Varmt'], ['mixed', '🌦️ Variert'], ['cold', '❄️ Kaldt']],
    people: [[1, 'Bare meg'], [2, '2 personer'], [3, '3 personer'], [4, '4+ personer']],
    activities: [['swim', '🏖️ Bading'], ['training', '🏋️ Trening'], ['formal', '👔 Penklær'], ['work', '💻 Jobb'], ['cook', '🍳 Lage mat'], ['pet', '🐾 Kjæledyr']],
  };
  const durationDays = { '1-2': 2, '3-5': 4, week: 7, longer: 14 };

  function choiceGroup(key, title, multi = false) {
    const current = state.context?.[key];
    const selected = new Set(Array.isArray(current) ? current : [current]);
    return `<fieldset class="v23-choice-group"><legend>${esc(title)}</legend><div class="v23-chips">${choices[key].map(([value, label]) => `<button type="button" class="v23-chip ${selected.has(value) ? 'is-active' : ''}" data-v24-choice="${key}" data-v24-value="${esc(value)}" data-v24-multi="${multi ? '1' : '0'}">${label}</button>`).join('')}</div></fieldset>`;
  }

  function renderQuestions() {
    const template = W.templates.find((entry) => entry.key === state.templateKey);
    const special = ['moving', 'shopping'].includes(template?.kind);
    return `${header(template?.name || 'Tilpass listen', true)}<div class="v23-scroll v23-questions v24-questions">
      <section class="v23-mini-hero"><span>${template?.icon || '📝'}</span><div><h3>${esc(template?.name || 'Ny liste')}</h3><p>Trykk på det som passer. Alt kan endres før listen opprettes.</p></div></section>
      <div class="v23-name-grid"><label><span>Navn på listen</span><input data-v24-name maxlength="80" value="${esc(state.context?.name || template?.name || '')}"></label><label><span>Sted <small>valgfritt</small></span><input data-v24-destination maxlength="120" value="${esc(state.context?.destination || '')}" placeholder="F.eks. Bergen"></label></div>
      ${special ? '' : choiceGroup('duration', 'Hvor lenge?')}
      ${special ? '' : `<label class="v24-number-field"><span>Nøyaktig antall dager</span><input data-v24-days type="number" min="1" max="60" value="${esc(state.context?.days || durationDays[state.context?.duration] || 4)}"></label>`}
      ${template?.kind === 'shopping' ? '' : choiceGroup('transport', 'Hvordan reiser du?')}
      ${special ? '' : choiceGroup('baggage', 'Bagasje')}
      ${special ? '' : choiceGroup('packingStyle', 'Hvor mye vil du pakke?')}
      ${special ? '' : choiceGroup('laundry', 'Kan klær vaskes underveis?')}
      ${special ? '' : choiceGroup('climate', 'Hvordan blir været?')}
      ${template?.kind === 'shopping' ? '' : choiceGroup('people', 'Hvem gjelder listen for?')}
      ${template?.kind === 'shopping' ? '' : `<label class="v24-number-field"><span>Antall personer</span><input data-v24-people type="number" min="1" max="8" value="${esc(state.context?.people || 1)}"></label>`}
      ${special ? '' : choiceGroup('activities', 'Hva skal med?', true)}
      <button type="button" class="v23-primary v23-sticky-action" data-v24-preview>Se forslag</button></div>`;
  }

  function locationFor(item) {
    const match = V.findLinkedItem?.(item.title);
    if (!match) return '';
    return typeof globalThis.getPath === 'function' ? (globalThis.getPath(match) || 'Finnes blant tingene hjemme') : 'Finnes blant tingene hjemme';
  }

  function previewItem(item) {
    const location = locationFor(item);
    const explanation = item.reason || item.note || (item.essential ? 'Viktig' : 'Forslag');
    return `<article class="v23-preview-item ${item.selected ? '' : 'is-off'}" data-v24-item="${esc(item.id)}"><button type="button" class="v23-item-toggle" data-v24-toggle="${esc(item.id)}">${item.selected ? '✓' : '+'}</button><div class="v23-item-copy"><strong>${esc(item.title)}</strong><small>${esc(explanation)}${location ? ` · ${esc(location)}` : ''}</small></div><div class="v23-qty"><button type="button" data-v24-qty="${esc(item.id)}" data-delta="-1">−</button><span>${item.quantity}</span><button type="button" data-v24-qty="${esc(item.id)}" data-delta="1">+</button></div></article>`;
  }

  function renderPreview() {
    const plan = state.plan;
    const groups = new Map();
    (plan?.items || []).forEach((item) => { const section = item.section || 'Pakkeliste'; if (!groups.has(section)) groups.set(section, []); groups.get(section).push(item); });
    const selected = (plan?.items || []).filter((item) => item.selected).length;
    const linked = (plan?.items || []).filter((item) => item.selected && locationFor(item)).length;
    return `${header(plan?.title || 'Se over forslaget', true)}<div class="v23-scroll v23-preview v24-preview">
      <section class="v23-preview-hero"><div><span>✨</span><div><small>SMART REGELMOTOR</small><h3>${esc(plan?.title || 'Ny liste')}</h3><p>${esc(plan?.summary || '')}</p></div></div><div class="v23-stats"><span><strong>${selected}</strong> valgt</span><span><strong>${linked}</strong> koblet hjemme</span></div>${(plan?.assumptions || []).length ? `<details><summary>Se reglene som er brukt</summary><ul>${plan.assumptions.map((value) => `<li>${esc(value)}</li>`).join('')}</ul></details>` : ''}</section>
      <div class="v23-preview-toolbar"><button type="button" data-v24-select-all>Velg alle</button><button type="button" data-v24-select-essential>Bare viktige</button></div>
      <section class="v23-preview-groups">${[...groups.entries()].map(([section, items]) => `<div class="v23-preview-group"><h4>${esc(section)} <span>${items.filter((item) => item.selected).length}/${items.length}</span></h4>${items.map(previewItem).join('')}</div>`).join('')}</section>
      <form class="v23-custom-add" data-v24-custom-form><input name="title" maxlength="120" placeholder="Legg til noe eget"><button type="submit">Legg til</button></form>
      <button type="button" class="v23-primary v23-create" data-v24-create ${state.busy || !selected ? 'disabled' : ''}>${state.busy ? 'Oppretter…' : `Lag listen med ${selected} punkter`}</button></div>`;
  }

  function render() {
    ensureDialog().querySelector('[data-v24-panel]').innerHTML = state.step === 'questions' ? renderQuestions() : state.step === 'preview' ? renderPreview() : renderTemplates();
  }

  function selectTemplate(key) {
    const template = W.templates.find((entry) => entry.key === key);
    if (!template) return;
    const baggage = template.defaults?.baggage || 'normal';
    state.templateKey = key;
    state.context = {
      ...template.defaults,
      templateKey: key,
      name: template.name,
      destination: '',
      days: durationDays[template.defaults?.duration] || 4,
      people: 1,
      packingStyle: baggage === 'carryon' ? 'light' : 'normal',
      laundry: 'unknown',
      climate: key === 'sun' ? 'hot' : key === 'cabin' ? 'mixed' : 'mixed',
      activities: [...(template.defaults?.activities || [])],
    };
    state.step = 'questions';
    render();
  }

  function syncInputs() {
    const dialog = ensureDialog();
    state.context.name = dialog.querySelector('[data-v24-name]')?.value.trim() || state.context.name;
    state.context.destination = dialog.querySelector('[data-v24-destination]')?.value.trim() || '';
    state.context.days = Math.max(1, Math.min(60, Number(dialog.querySelector('[data-v24-days]')?.value) || state.context.days || 4));
    state.context.people = Math.max(1, Math.min(8, Number(dialog.querySelector('[data-v24-people]')?.value) || state.context.people || 1));
  }

  async function createList() {
    if (state.busy || !state.plan) return;
    const items = state.plan.items.filter((entry) => entry.selected);
    if (!items.length) return;
    state.busy = true; render();
    try {
      const list = await V.createList({ name: state.plan.title, kind: state.plan.kind, destination: state.plan.destination || state.context?.destination || '', templateKey: state.plan.templateKey || state.templateKey || 'custom', visibility: 'shared' });
      for (let index = 0; index < items.length; index += 1) {
        const entry = items[index];
        const linked = V.findLinkedItem?.(entry.title);
        await V.addItem(list.id, { title: entry.title, section: entry.section, quantity: entry.quantity, note: entry.note || entry.reason || '', status: entry.status, linkedItemId: linked?.id || '', sortOrder: index + 1 });
      }
      remember(state.plan.templateKey || state.templateKey);
      close();
      H.toast?.('Listen er klar');
      setTimeout(() => document.querySelector(`[data-v22-open-list="${list.id}"]`)?.click(), 160);
    } catch (error) {
      state.busy = false; render(); H.alert?.('Kunne ikke lage listen', H.errorText(error));
    }
  }

  async function click(event) {
    const opener = event.target.closest('[data-v22-open-templates]');
    if (opener) {
      event.preventDefault(); event.stopImmediatePropagation(); open(); return;
    }
    if (!event.target.closest('#v24-wizard')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.target.closest('[data-v24-close]')) { close(); return; }
    if (event.target.closest('[data-v24-back]')) { state.step = state.step === 'preview' ? (state.templateKey ? 'questions' : 'templates') : 'templates'; render(); return; }
    const fav = event.target.closest('[data-v24-favorite]');
    if (fav) { const set = favorites(); const key = fav.dataset.v24Favorite; set.has(key) ? set.delete(key) : set.add(key); writeJson(favoriteKey, [...set]); render(); return; }
    const template = event.target.closest('[data-v24-template]');
    if (template) { selectTemplate(template.dataset.v24Template); return; }
    if (event.target.closest('[data-v24-empty]')) { state.templateKey = ''; state.context = { templateKey: 'custom', name: 'Ny liste', destination: '', people: 1, activities: [] }; state.plan = { title: 'Ny liste', destination: '', kind: 'custom', templateKey: 'custom', summary: 'Tom liste', assumptions: [], items: [], source: 'rules-v2', context: state.context }; state.step = 'preview'; render(); return; }
    const choice = event.target.closest('[data-v24-choice]');
    if (choice) {
      const key = choice.dataset.v24Choice;
      const raw = choice.dataset.v24Value;
      const value = key === 'people' ? Number(raw) : raw;
      if (choice.dataset.v24Multi === '1') { const values = new Set(state.context[key] || []); values.has(value) ? values.delete(value) : values.add(value); state.context[key] = [...values]; }
      else { state.context[key] = value; if (key === 'duration') state.context.days = durationDays[value] || state.context.days; if (key === 'people') state.context.people = value; }
      render(); return;
    }
    if (event.target.closest('[data-v24-preview]')) { syncInputs(); state.plan = W.buildPlan(state.context); state.step = 'preview'; render(); return; }
    const toggle = event.target.closest('[data-v24-toggle]');
    if (toggle) { const item = state.plan.items.find((entry) => entry.id === toggle.dataset.v24Toggle); if (item) item.selected = !item.selected; render(); return; }
    const qty = event.target.closest('[data-v24-qty]');
    if (qty) { const item = state.plan.items.find((entry) => entry.id === qty.dataset.v24Qty); if (item) item.quantity = Math.max(1, Math.min(99, item.quantity + Number(qty.dataset.delta || 0))); render(); return; }
    if (event.target.closest('[data-v24-select-all]')) { state.plan.items.forEach((entry) => { entry.selected = true; }); render(); return; }
    if (event.target.closest('[data-v24-select-essential]')) { state.plan.items.forEach((entry) => { entry.selected = Boolean(entry.essential); }); render(); return; }
    if (event.target.closest('[data-v24-create]')) await createList();
  }

  function input(event) {
    if (event.target.matches('[data-v24-search]')) { state.search = event.target.value; render(); }
  }

  function submit(event) {
    const form = event.target.closest('[data-v24-custom-form]');
    if (!form) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const title = form.title.value.trim();
    if (!title) return;
    state.plan.items.push({ id: `custom-${Date.now()}`, section: 'Pakkeliste', title, quantity: 1, note: '', reason: 'Lagt til av deg', status: 'needed', essential: false, selected: true, origin: 'user' });
    render();
  }

  window.addEventListener('click', click, true);
  window.addEventListener('input', input, true);
  window.addEventListener('submit', submit, true);

  V.ready.then(() => {
    document.querySelectorAll('[data-v22-open-templates]').forEach((button) => { button.textContent = '✨ Smarte maler'; });
  });
})();