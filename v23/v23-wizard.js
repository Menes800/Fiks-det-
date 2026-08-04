(() => {
  'use strict';

  const H = window.HED21;
  const V = window.HED22;
  const W = window.HED23;
  if (!H || !V || !W) return;

  const state = {
    step: 'templates', templateKey: '', context: null, plan: null,
    prompt: '', busy: false, aiMessage: '', search: '',
  };
  const favoriteKey = 'hed-v23-template-favorites';
  const recentKey = 'hed-v23-template-recent';
  const esc = (value) => H.html(String(value ?? ''));

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch { return fallback; }
  }
  function writeJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function favorites() { return new Set(readJson(favoriteKey, [])); }
  function recents() { return readJson(recentKey, []); }
  function rememberTemplate(key) {
    if (!key) return;
    writeJson(recentKey, [key, ...recents().filter((entry) => entry !== key)].slice(0, 4));
  }

  function inferContext(prompt) {
    const text = String(prompt || '').toLocaleLowerCase('nb-NO');
    let templateKey = 'weekend';
    if (/syden|spania|hellas|solferie|strand|bade/.test(text)) templateKey = 'sun';
    else if (/hytte|fjell|skog/.test(text)) templateKey = 'cabin';
    else if (/jobb|møte|konferanse/.test(text)) templateKey = 'work';
    else if (/konkurranse|kamp|trening|turnering/.test(text)) templateKey = 'sport';
    else if (/hund|katt|kjæledyr|dyr/.test(text)) templateKey = 'pet';
    else if (/flytt|ny bolig|flytte/.test(text)) templateKey = 'moving';
    else if (/dagstur/.test(text)) templateKey = 'day';
    const numberMatch = text.match(/(\d{1,2})\s*(?:dag|dager|døgn)/);
    const days = numberMatch ? Math.max(1, Math.min(60, Number(numberMatch[1]))) : undefined;
    const activities = [];
    if (/bade|strand|svømme/.test(text)) activities.push('swim');
    if (/trene|trening|gym|konkurranse|kamp/.test(text)) activities.push('training');
    if (/jobb|arbeid|møte|konferanse/.test(text)) activities.push('work');
    if (/pent|middag|bryllup|fest/.test(text)) activities.push('formal');
    if (/lage mat|kjøkken|selvhushold/.test(text)) activities.push('cook');
    if (/hund|katt|kjæledyr|dyr/.test(text)) activities.push('pet');
    return {
      templateKey,
      duration: days && days <= 2 ? '1-2' : days && days <= 5 ? '3-5' : days && days <= 8 ? 'week' : days ? 'longer' : undefined,
      days,
      people: /vi|oss|sammen|familie/.test(text) ? 2 : 1,
      transport: /fly/.test(text) ? 'fly' : /tog/.test(text) ? 'train' : /bil/.test(text) ? 'car' : undefined,
      baggage: /håndbagasje/.test(text) ? 'carryon' : /innsjekket|koffert/.test(text) ? 'checked' : undefined,
      activities,
    };
  }

  function ensureDialog() {
    let dialog = document.querySelector('#v23-wizard');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'v23-wizard';
    dialog.className = 'v23-dialog';
    dialog.innerHTML = '<div class="v23-panel" data-v23-panel></div>';
    document.body.append(dialog);
    dialog.addEventListener('click', (event) => { if (event.target === dialog) closeWizard(); });
    return dialog;
  }

  function openWizard() {
    Object.assign(state, { step: 'templates', templateKey: '', context: null, plan: null, prompt: '', aiMessage: '' });
    const dialog = ensureDialog();
    render();
    if (!dialog.open) dialog.showModal();
  }
  function closeWizard() { const dialog = document.querySelector('#v23-wizard'); if (dialog?.open) dialog.close(); }

  function header(title, back = false) {
    return `<header class="v23-header"><button type="button" class="v23-back" data-v23-${back ? 'back' : 'close'}>${back ? 'Tilbake' : 'Lukk'}</button><div><small>SMART LISTEBYGGER</small><h2>${esc(title)}</h2></div><span></span></header>`;
  }
  function templateCard(template, favs) {
    const isFavorite = favs.has(template.key);
    return `<article class="v23-template-card"><button type="button" class="v23-template-main" data-v23-template="${esc(template.key)}"><span class="v23-template-icon">${template.icon}</span><span><strong>${esc(template.name)}</strong><small>${esc(template.description)}</small></span><i>›</i></button><button type="button" class="v23-favorite ${isFavorite ? 'is-active' : ''}" data-v23-favorite="${esc(template.key)}" aria-label="Favoritt">${isFavorite ? '★' : '☆'}</button></article>`;
  }

  function renderTemplates() {
    const favs = favorites();
    const recent = recents();
    const query = state.search.trim().toLocaleLowerCase('nb-NO');
    const list = W.templates.filter((template) => !query || `${template.name} ${template.description}`.toLocaleLowerCase('nb-NO').includes(query));
    list.sort((a, b) => Number(favs.has(b.key)) - Number(favs.has(a.key)) || (recent.indexOf(a.key) < 0 ? 99 : recent.indexOf(a.key)) - (recent.indexOf(b.key) < 0 ? 99 : recent.indexOf(b.key)));
    return `${header('Hva skal du planlegge?')}<div class="v23-scroll">
      <section class="v23-ai-hero"><span class="v23-ai-icon">✨</span><div><small>AI-ASSISTENT</small><h3>Beskriv det med én setning</h3><p>Appen lager et forslag som du kan godkjenne og endre.</p></div><textarea data-v23-ai-prompt maxlength="800" placeholder="F.eks. fem dager i Spania med håndbagasje, bading og trening">${esc(state.prompt)}</textarea><button type="button" class="v23-primary" data-v23-ai-direct>Lag smart liste</button><small class="v23-privacy">Bare navn på registrerte ting brukes til å finne treff. Plasseringene dine sendes ikke til AI.</small></section>
      <div class="v23-section-title"><div><small>ELLER VELG EN MAL</small><h3>Raske valg</h3></div><input data-v23-search type="search" value="${esc(state.search)}" placeholder="Søk"></div>
      <section class="v23-template-grid">${list.map((template) => templateCard(template, favs)).join('') || '<p class="v23-empty">Ingen maler passer søket.</p>'}</section><button type="button" class="v23-empty-button" data-v23-empty-list>Start helt tom liste</button></div>`;
  }

  const choices = {
    duration: [['1-2', '1–2 dager'], ['3-5', '3–5 dager'], ['week', '1 uke'], ['longer', 'Lengre']],
    transport: [['fly', '✈️ Fly'], ['car', '🚗 Bil'], ['train', '🚆 Tog'], ['other', 'Annet']],
    baggage: [['carryon', 'Håndbagasje'], ['normal', 'Vanlig bag'], ['checked', 'Innsjekket koffert']],
    people: [[1, 'Bare meg'], [2, '2 personer'], [3, '3+ personer']],
    activities: [['swim', '🏖️ Bading'], ['training', '🏋️ Trening'], ['formal', '👔 Pent antrekk'], ['work', '💻 Jobb'], ['cook', '🍳 Lage mat'], ['pet', '🐾 Kjæledyr']],
  };
  function choiceGroup(key, title, multi = false) {
    const current = state.context?.[key];
    const selected = new Set(Array.isArray(current) ? current : [current]);
    return `<fieldset class="v23-choice-group"><legend>${esc(title)}</legend><div class="v23-chips">${choices[key].map(([value, label]) => `<button type="button" class="v23-chip ${selected.has(value) ? 'is-active' : ''}" data-v23-choice="${key}" data-v23-value="${esc(value)}" data-v23-multi="${multi ? '1' : '0'}">${label}</button>`).join('')}</div></fieldset>`;
  }

  function renderQuestions() {
    const template = W.templates.find((entry) => entry.key === state.templateKey);
    return `${header(template?.name || 'Tilpass listen', true)}<div class="v23-scroll v23-questions">
      <section class="v23-mini-hero"><span>${template?.icon || '📝'}</span><div><h3>${esc(template?.name || 'Ny liste')}</h3><p>Trykk på det som passer. Du kan endre alt før listen opprettes.</p></div></section>
      <div class="v23-name-grid"><label><span>Navn på listen</span><input data-v23-name maxlength="80" value="${esc(state.context?.name || template?.name || '')}"></label><label><span>Sted <small>valgfritt</small></span><input data-v23-destination maxlength="120" value="${esc(state.context?.destination || '')}" placeholder="F.eks. Bergen"></label></div>
      ${template?.kind === 'moving' || template?.kind === 'shopping' ? '' : choiceGroup('duration', 'Hvor lenge?')}
      ${template?.kind === 'shopping' ? '' : choiceGroup('transport', 'Hvordan reiser du?')}
      ${template?.kind === 'moving' || template?.kind === 'shopping' ? '' : choiceGroup('baggage', 'Bagasje')}
      ${template?.kind === 'shopping' ? '' : choiceGroup('people', 'Hvem gjelder listen for?')}
      ${template?.kind === 'moving' || template?.kind === 'shopping' ? '' : choiceGroup('activities', 'Hva skal med?', true)}
      <button type="button" class="v23-primary v23-sticky-action" data-v23-preview>Se forslag</button></div>`;
  }

  function locationFor(item) {
    const match = V.findLinkedItem?.(item.title);
    if (!match) return '';
    return typeof globalThis.getPath === 'function' ? (globalThis.getPath(match) || 'Finnes blant tingene hjemme') : 'Finnes blant tingene hjemme';
  }
  function renderPreviewItem(item) {
    const location = locationFor(item);
    return `<article class="v23-preview-item ${item.selected ? '' : 'is-off'}" data-v23-item="${esc(item.id)}"><button type="button" class="v23-item-toggle" data-v23-toggle="${esc(item.id)}">${item.selected ? '✓' : '+'}</button><div class="v23-item-copy"><strong>${esc(item.title)}</strong><small>${item.essential ? 'Viktig' : item.origin === 'ai' ? 'AI-forslag' : 'Forslag'}${location ? ` · ${esc(location)}` : ''}</small>${item.note ? `<em>${esc(item.note)}</em>` : ''}</div><div class="v23-qty"><button type="button" data-v23-qty="${esc(item.id)}" data-delta="-1">−</button><span>${item.quantity}</span><button type="button" data-v23-qty="${esc(item.id)}" data-delta="1">+</button></div></article>`;
  }

  function renderPreview() {
    const plan = state.plan;
    const groups = new Map();
    (plan?.items || []).forEach((item) => { const section = item.section || 'Pakkeliste'; if (!groups.has(section)) groups.set(section, []); groups.get(section).push(item); });
    const selected = (plan?.items || []).filter((item) => item.selected).length;
    const linked = (plan?.items || []).filter((item) => item.selected && locationFor(item)).length;
    return `${header(plan?.title || 'Se over forslaget', true)}<div class="v23-scroll v23-preview">
      <section class="v23-preview-hero"><div><span>✨</span><div><small>${plan?.source === 'ai' ? 'AI-TILPASSET' : 'SMART MAL'}</small><h3>${esc(plan?.title || 'Ny liste')}</h3><p>${esc(plan?.summary || '')}</p></div></div><div class="v23-stats"><span><strong>${selected}</strong> valgt</span><span><strong>${linked}</strong> koblet hjemme</span></div>${state.aiMessage ? `<p class="v23-ai-message">${esc(state.aiMessage)}</p>` : ''}${(plan?.assumptions || []).length ? `<details><summary>Antakelser AI-en gjorde</summary><ul>${plan.assumptions.map((value) => `<li>${esc(value)}</li>`).join('')}</ul></details>` : ''}</section>
      <div class="v23-preview-toolbar"><button type="button" data-v23-select-all>Velg alle</button><button type="button" data-v23-select-essential>Bare viktige</button><button type="button" class="v23-ai-button" data-v23-ai-improve ${state.busy ? 'disabled' : ''}>✨ ${state.busy ? 'Tenker…' : 'Forbedre med AI'}</button></div>
      <section class="v23-preview-groups">${[...groups.entries()].map(([section, items]) => `<div class="v23-preview-group"><h4>${esc(section)} <span>${items.filter((item) => item.selected).length}/${items.length}</span></h4>${items.map(renderPreviewItem).join('')}</div>`).join('')}</section>
      <form class="v23-custom-add" data-v23-custom-form><input name="title" maxlength="120" placeholder="Legg til noe eget"><button type="submit">Legg til</button></form><button type="button" class="v23-primary v23-create" data-v23-create-list ${state.busy || !selected ? 'disabled' : ''}>${state.busy ? 'Oppretter…' : `Lag listen med ${selected} punkter`}</button></div>`;
  }

  function render() { ensureDialog().querySelector('[data-v23-panel]').innerHTML = state.step === 'questions' ? renderQuestions() : state.step === 'preview' ? renderPreview() : renderTemplates(); }
  function selectTemplate(key) {
    const template = W.templates.find((entry) => entry.key === key);
    if (!template) return;
    state.templateKey = key;
    state.context = { ...template.defaults, templateKey: key, name: template.name, destination: '', people: 1, activities: [...(template.defaults.activities || [])] };
    state.step = 'questions'; render();
  }
  function syncQuestionInputs() {
    const dialog = ensureDialog();
    state.context.name = dialog.querySelector('[data-v23-name]')?.value.trim() || state.context.name;
    state.context.destination = dialog.querySelector('[data-v23-destination]')?.value.trim() || '';
  }

  async function useAI(prompt, basePlan) {
    state.busy = true; state.aiMessage = ''; render();
    try {
      const result = await W.generateAI({ prompt, context: basePlan.context || state.context || {}, basePlan });
      state.plan = W.mergePlans(basePlan, result.plan);
      state.plan.context = basePlan.context || state.context || {};
      state.aiMessage = result.remaining === null ? 'Forslaget er forbedret med AI.' : `AI-forslaget er klart · ${result.remaining} igjen i dag`;
    } catch (error) {
      state.plan = basePlan;
      state.aiMessage = ['AI_NOT_CONFIGURED', 'AI_REQUEST_FAILED'].includes(error.code) ? 'AI-tjenesten er ikke tilgjengelig akkurat nå. Du fikk et smart forslag fra regelmotoren i stedet.' : (error.message || 'AI svarte ikke. Smartmalen er fortsatt klar.');
    } finally { state.busy = false; state.step = 'preview'; render(); }
  }
  async function directAI() {
    const input = ensureDialog().querySelector('[data-v23-ai-prompt]');
    const prompt = input?.value.trim() || '';
    if (!prompt) { input?.focus(); return; }
    state.prompt = prompt;
    const inferred = inferContext(prompt);
    const template = W.templates.find((entry) => entry.key === inferred.templateKey) || W.templates[0];
    const context = { ...template.defaults, ...inferred, templateKey: template.key, name: template.name, destination: '' };
    const base = W.buildPlan(context); base.context = context;
    await useAI(prompt, base);
  }

  async function createList() {
    if (state.busy || !state.plan) return;
    const items = state.plan.items.filter((entry) => entry.selected);
    if (!items.length) return;
    state.busy = true; render();
    try {
      const list = await V.createList({ name: state.plan.title, kind: state.plan.kind, destination: state.plan.destination || state.context?.destination || '', templateKey: state.plan.templateKey || state.templateKey || 'ai', visibility: 'shared' });
      for (let index = 0; index < items.length; index += 1) {
        const entry = items[index];
        const linked = V.findLinkedItem?.(entry.title);
        await V.addItem(list.id, { title: entry.title, section: entry.section, quantity: entry.quantity, note: entry.note, status: entry.status, linkedItemId: linked?.id || '', sortOrder: index + 1 });
      }
      rememberTemplate(state.plan.templateKey || state.templateKey);
      closeWizard(); H.toast?.('Listen er klar');
      setTimeout(() => document.querySelector(`[data-v22-open-list="${list.id}"]`)?.click(), 150);
    } catch (error) { state.busy = false; render(); H.alert?.('Kunne ikke lage listen', H.errorText(error)); }
  }

  async function onClick(event) {
    const open = event.target.closest('[data-v22-open-templates]');
    if (open) { event.preventDefault(); event.stopImmediatePropagation(); openWizard(); return; }
    if (!event.target.closest('#v23-wizard')) return;
    if (event.target.closest('[data-v23-close]')) { closeWizard(); return; }
    if (event.target.closest('[data-v23-back]')) { state.step = state.step === 'preview' ? (state.templateKey ? 'questions' : 'templates') : 'templates'; render(); return; }
    const favorite = event.target.closest('[data-v23-favorite]');
    if (favorite) { const set = favorites(); const key = favorite.dataset.v23Favorite; set.has(key) ? set.delete(key) : set.add(key); writeJson(favoriteKey, [...set]); render(); return; }
    const template = event.target.closest('[data-v23-template]');
    if (template) { selectTemplate(template.dataset.v23Template); return; }
    if (event.target.closest('[data-v23-empty-list]')) { state.templateKey = ''; state.context = { templateKey: 'custom', name: 'Ny liste', destination: '', people: 1, activities: [] }; state.plan = { title: 'Ny liste', destination: '', kind: 'custom', templateKey: 'custom', summary: 'Tom liste', assumptions: [], items: [], source: 'rules', context: state.context }; state.step = 'preview'; render(); return; }
    const choice = event.target.closest('[data-v23-choice]');
    if (choice) { const key = choice.dataset.v23Choice; const raw = choice.dataset.v23Value; const value = key === 'people' ? Number(raw) : raw; if (choice.dataset.v23Multi === '1') { const values = new Set(state.context[key] || []); values.has(value) ? values.delete(value) : values.add(value); state.context[key] = [...values]; } else state.context[key] = value; render(); return; }
    if (event.target.closest('[data-v23-preview]')) { syncQuestionInputs(); state.plan = W.buildPlan(state.context); state.plan.context = state.context; state.step = 'preview'; render(); return; }
    if (event.target.closest('[data-v23-ai-direct]')) { await directAI(); return; }
    if (event.target.closest('[data-v23-ai-improve]')) { await useAI(state.prompt || `Forbedre denne ${state.plan?.title || 'listen'} ut fra valgene og fjern unødvendige ting.`, state.plan); return; }
    const toggle = event.target.closest('[data-v23-toggle]');
    if (toggle) { const item = state.plan.items.find((entry) => entry.id === toggle.dataset.v23Toggle); if (item) item.selected = !item.selected; render(); return; }
    const qty = event.target.closest('[data-v23-qty]');
    if (qty) { const item = state.plan.items.find((entry) => entry.id === qty.dataset.v23Qty); if (item) item.quantity = Math.max(1, Math.min(99, item.quantity + Number(qty.dataset.delta || 0))); render(); return; }
    if (event.target.closest('[data-v23-select-all]')) { state.plan.items.forEach((entry) => { entry.selected = true; }); render(); return; }
    if (event.target.closest('[data-v23-select-essential]')) { state.plan.items.forEach((entry) => { entry.selected = Boolean(entry.essential); }); render(); return; }
    if (event.target.closest('[data-v23-create-list]')) await createList();
  }

  function onInput(event) {
    if (event.target.matches('[data-v23-search]')) { state.search = event.target.value; }
    if (event.target.matches('[data-v23-ai-prompt]')) state.prompt = event.target.value;
  }
  function onSubmit(event) {
    const form = event.target.closest('[data-v23-custom-form]');
    if (!form) return;
    event.preventDefault();
    const title = form.title.value.trim();
    if (!title) return;
    state.plan.items.push({ id: `custom-${Date.now()}`, section: 'Pakkeliste', title, quantity: 1, note: '', status: 'needed', essential: false, selected: true, origin: 'user' });
    render();
  }

  document.addEventListener('click', onClick, true);
  document.addEventListener('input', onInput, true);
  document.addEventListener('submit', onSubmit, true);

  V.ready.then(() => {
    document.querySelectorAll('[data-v22-open-templates]').forEach((button) => { button.textContent = '✨ Smarte maler'; });
    document.querySelector('#about-button .settings-meta')?.replaceChildren('v2.3');
  });
})();