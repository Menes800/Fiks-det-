(() => {
  'use strict';

  const H = window.HED21;
  const R = window.HED27Rules;
  if (!H || !R) return;

  const ICON_KEY = 'hed-v27-item-icons-v1';
  const DEFAULT_KEY = 'hed-v27-entry-defaults-v1';
  const DRAFT_KEY = 'hed-v27-item-draft-v1';
  const DRAFT_MAX_AGE = 7 * 86400000;
  const appState = () => (typeof state !== 'undefined' ? state : null);
  const allItems = () => appState()?.data?.items || [];
  const esc = (value) => H.html(String(value ?? ''));
  let iconMap = readObject(ICON_KEY);
  let draftTimer = 0;
  let actionTimer = 0;
  let pendingDelete = null;
  let cloudSyncing = false;

  function readObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }
  function writeObject(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { console.warn('Kunne ikke lagre lokalt', error); }
  }
  function homeId() { return H.context?.home?.id || appState()?.data?.home?.id || ''; }
  function uuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '')); }
  function itemById(id) { return allItems().find((entry) => entry.id === id) || null; }
  function categoryIcon(item) {
    return appState()?.data?.categories?.find((entry) => entry.id === item?.categoryId)?.icon || '📦';
  }
  function suggested(itemOrName) {
    const name = typeof itemOrName === 'string' ? itemOrName : itemOrName?.name;
    return R.suggest(name, appState()?.data?.categories || [], 'item');
  }
  function itemIcon(item) {
    if (!item) return '📦';
    return iconMap[item.id]?.icon || suggested(item)?.icon || categoryIcon(item);
  }
  function cleanIcon(value) {
    return Array.from(String(value || '').trim()).slice(0, 4).join('') || '📦';
  }

  async function context() { await H.ready; return H.getContext ? H.getContext() : H.context; }
  async function syncIcons() {
    if (cloudSyncing || !navigator.onLine) return;
    cloudSyncing = true;
    try {
      const ctx = await context();
      if (!ctx?.user || !ctx?.home) return;
      const { data, error } = await H.client.from('item_icons').select('item_id,icon,updated_at').eq('home_id', ctx.home.id);
      if (error) throw error;
      for (const row of data || []) {
        const local = iconMap[row.item_id];
        if (!local || String(row.updated_at || '') >= String(local.updatedAt || '')) {
          iconMap[row.item_id] = { icon: cleanIcon(row.icon), homeId: ctx.home.id, updatedAt: row.updated_at || '' };
        }
      }
      writeObject(ICON_KEY, iconMap);
      renderAll?.();
      decorateDetail();
    } catch (error) { console.warn('Kunne ikke synkronisere emojier', error); }
    finally { cloudSyncing = false; }
  }
  async function saveIcon(itemId, icon) {
    const value = cleanIcon(icon);
    iconMap[itemId] = { icon: value, homeId: homeId(), updatedAt: new Date().toISOString() };
    writeObject(ICON_KEY, iconMap);
    renderAll?.();
    if (!navigator.onLine || !uuid(itemId)) return;
    try {
      const ctx = await context();
      if (!ctx?.user || !ctx?.home) return;
      const { error } = await H.client.from('item_icons').upsert({
        item_id: itemId, home_id: ctx.home.id, created_by: ctx.user.id, icon: value, updated_at: new Date().toISOString(),
      }, { onConflict: 'item_id' });
      if (error) throw error;
    } catch (error) { console.warn('Emojien synkroniseres senere', error); }
  }

  try {
    thumbHtml = function v27ThumbHtml(item) {
      if (item.image) return `<span class="item-thumb"><img src="${item.image}" alt="" /></span>`;
      return `<span class="item-thumb">${esc(itemIcon(item))}</span>`;
    };
  } catch (error) { console.warn('Kunne ikke aktivere emojier i tinglisten', error); }

  function ensureEntryUi() {
    const form = document.querySelector('#item-form');
    const core = form?.querySelector('.v24-add-core');
    const nameLabel = document.querySelector('#item-name')?.closest('label');
    if (!form || !core || !nameLabel) return;
    if (!form.querySelector('.v27-smart-entry')) {
      const panel = document.createElement('section');
      panel.className = 'v27-smart-entry';
      panel.innerHTML = `
        <label class="v27-icon-field"><span>Emoji</span><input id="item-icon" name="itemIcon" maxlength="8" inputmode="text" autocomplete="off" aria-label="Emoji for tingen"></label>
        <div class="v27-smart-copy"><strong data-v27-suggestion-title>Automatisk forslag</strong><small data-v27-suggestion-copy>Skriv navnet, så foreslår appen emoji og kategori.</small></div>
        <button type="button" class="v27-use-suggestion" data-v27-use-suggestion hidden>Bruk forslag</button>`;
      nameLabel.after(panel);
      const duplicate = document.createElement('aside');
      duplicate.className = 'v27-duplicate-inline';
      duplicate.hidden = true;
      panel.after(duplicate);
    }
    updateFormState();
  }

  function duplicateFor(name, excludeId = '') {
    const needle = R.normalize(name);
    if (!needle) return null;
    return allItems().find((item) => item.id !== excludeId && R.normalize(item.name) === needle) || null;
  }
  function itemPath(item) {
    if (typeof getPath === 'function') return getPath(item) || 'uten plassering';
    return 'uten plassering';
  }
  function updateDuplicate(form) {
    const duplicateBox = form.querySelector('.v27-duplicate-inline');
    const itemId = form.querySelector('#item-id')?.value || '';
    const duplicate = duplicateFor(form.querySelector('#item-name')?.value, itemId);
    form.dataset.v27DuplicateId = duplicate?.id || '';
    form.dataset.v27DuplicateBlocked = duplicate ? '1' : '0';
    if (!duplicateBox) return;
    duplicateBox.hidden = !duplicate;
    duplicateBox.innerHTML = duplicate ? `<span>⚠️</span><span><strong>«${esc(duplicate.name)}» finnes allerede</strong><small>${esc(itemPath(duplicate))}</small></span><button type="button" data-v27-open-duplicate="${esc(duplicate.id)}">Åpne</button>` : '';
  }
  function categoryName(id) {
    return appState()?.data?.categories?.find((entry) => entry.id === id)?.name || 'Annet';
  }
  function updateSuggestion(form = document.querySelector('#item-form'), force = false) {
    if (!form) return;
    const name = form.querySelector('#item-name')?.value || '';
    const icon = form.querySelector('#item-icon');
    const category = form.querySelector('#item-category');
    const suggestion = suggested(name);
    form._v27Suggestion = suggestion;
    if (suggestion) {
      if (force || form.dataset.v27IconManual !== '1') icon.value = suggestion.icon;
      if (suggestion.categoryId && (force || form.dataset.v27CategoryManual !== '1')) category.value = suggestion.categoryId;
    } else if (!icon.value && form.dataset.v27IconManual !== '1') icon.value = '📦';
    const copy = form.querySelector('[data-v27-suggestion-copy]');
    const use = form.querySelector('[data-v27-use-suggestion]');
    if (copy) copy.textContent = suggestion ? `${suggestion.icon} ${categoryName(suggestion.categoryId)} · fungerer uten AI og nett` : 'Ingen sikkert treff – du kan velge selv.';
    if (use) use.hidden = !suggestion || (icon.value === suggestion.icon && category.value === suggestion.categoryId);
    updateDuplicate(form);
  }
  function updateFormState(force = false) {
    const form = document.querySelector('#item-form');
    if (!form || !form.querySelector('#item-icon')) return;
    const itemId = form.querySelector('#item-id')?.value || '';
    const marker = itemId || '__new__';
    if (!force && form.dataset.v27For === marker) return;
    form.dataset.v27For = marker;
    const item = itemById(itemId);
    form.dataset.v27IconManual = iconMap[itemId] ? '1' : '0';
    form.dataset.v27CategoryManual = itemId ? '1' : '0';
    form.querySelector('#item-icon').value = item ? itemIcon(item) : '';
    updateSuggestion(form, !itemId);
  }

  function readDefaults() { return readObject(DEFAULT_KEY); }
  function storeDefaults(meta) {
    writeObject(DEFAULT_KEY, { homeId: homeId(), categoryId: meta.categoryId, roomId: meta.roomId, containerId: meta.containerId, savedAt: Date.now() });
  }
  function applyDefaults() {
    const form = document.querySelector('#item-form');
    if (!form || form.querySelector('#item-id')?.value) return;
    const value = readDefaults();
    if (!value || (value.homeId && homeId() && value.homeId !== homeId())) return;
    if (value.roomId && [...form.querySelector('#item-room')?.options || []].some((option) => option.value === value.roomId)) {
      form.querySelector('#item-room').value = value.roomId;
      renderContainerSelect?.(value.containerId || '');
    }
    if (value.categoryId && [...form.querySelector('#item-category')?.options || []].some((option) => option.value === value.categoryId)) {
      form.querySelector('#item-category').value = value.categoryId;
    }
  }

  function collectDraft(form) {
    return {
      homeId: homeId(), savedAt: Date.now(), name: form.querySelector('#item-name')?.value || '', icon: form.querySelector('#item-icon')?.value || '',
      categoryId: form.querySelector('#item-category')?.value || '', roomId: form.querySelector('#item-room')?.value || '', containerId: form.querySelector('#item-container')?.value || '',
      detail: form.querySelector('#item-detail')?.value || '', tags: form.querySelector('#item-tags')?.value || '', notes: form.querySelector('#item-notes')?.value || '',
      favorite: Boolean(form.querySelector('#item-favorite')?.checked), private: Boolean(form.querySelector('#item-private')?.checked),
      reminderTitle: form.querySelector('#item-reminder-title')?.value || '', reminderDate: form.querySelector('#item-reminder-date')?.value || '', reminderRepeat: form.querySelector('#item-reminder-repeat')?.value || '0',
    };
  }
  function saveDraft() {
    const form = document.querySelector('#item-form');
    if (!form || form.querySelector('#item-id')?.value || appState()?.screen !== 'add') return;
    const draft = collectDraft(form);
    const meaningful = [draft.name, draft.detail, draft.tags, draft.notes, draft.reminderTitle].some((value) => String(value).trim());
    meaningful ? writeObject(DRAFT_KEY, draft) : localStorage.removeItem(DRAFT_KEY);
  }
  function queueDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 250); }
  function clearDraft() { clearTimeout(draftTimer); localStorage.removeItem(DRAFT_KEY); }
  function restoreDraft() {
    const form = document.querySelector('#item-form');
    if (!form || form.querySelector('#item-id')?.value) return false;
    const draft = readObject(DRAFT_KEY);
    if (!draft.savedAt || Date.now() - draft.savedAt > DRAFT_MAX_AGE || (draft.homeId && homeId() && draft.homeId !== homeId())) return false;
    const set = (selector, value) => { const field = form.querySelector(selector); if (field && value !== undefined) field.value = value; };
    set('#item-name', draft.name); set('#item-category', draft.categoryId); set('#item-room', draft.roomId);
    renderContainerSelect?.(draft.containerId || '');
    set('#item-detail', draft.detail); set('#item-tags', draft.tags); set('#item-notes', draft.notes); set('#item-icon', draft.icon);
    set('#item-reminder-title', draft.reminderTitle); set('#item-reminder-date', draft.reminderDate); set('#item-reminder-repeat', draft.reminderRepeat || '0');
    const favorite = form.querySelector('#item-favorite'); const privacy = form.querySelector('#item-private');
    if (favorite) favorite.checked = Boolean(draft.favorite); if (privacy) privacy.checked = Boolean(draft.private);
    form.dataset.v27IconManual = draft.icon ? '1' : '0'; form.dataset.v27CategoryManual = draft.categoryId ? '1' : '0';
    updateSuggestion(form); H.toast?.('Utkastet ditt er gjenopprettet'); return true;
  }

  function ensureDuplicateDialog() {
    let dialog = document.querySelector('#v27-duplicate-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog'); dialog.id = 'v27-duplicate-dialog'; dialog.className = 'v27-dialog';
    dialog.innerHTML = `<div class="v27-dialog-card"><div class="v27-dialog-icon">⚠️</div><h2>Finnes allerede</h2><p data-v27-duplicate-copy></p><div class="v27-dialog-actions"><button type="button" data-v27-duplicate-cancel>Avbryt</button><button type="button" data-v27-duplicate-open>Åpne eksisterende</button><button type="button" class="is-primary" data-v27-duplicate-add>Legg til likevel</button></div></div>`;
    document.body.append(dialog); return dialog;
  }
  function duplicateChoice(duplicate) {
    const dialog = ensureDuplicateDialog(); dialog.querySelector('[data-v27-duplicate-copy]').textContent = `«${duplicate.name}» ligger allerede ${itemPath(duplicate)}.`;
    return new Promise((resolve) => {
      const done = (value) => { dialog.close(); dialog.removeEventListener('click', click); resolve(value); };
      const click = (event) => {
        if (event.target === dialog || event.target.closest('[data-v27-duplicate-cancel]')) done('cancel');
        if (event.target.closest('[data-v27-duplicate-open]')) done('open');
        if (event.target.closest('[data-v27-duplicate-add]')) done('add');
      };
      dialog.addEventListener('click', click); dialog.showModal();
    });
  }

  function ensureActionBar() {
    let bar = document.querySelector('#v27-action-bar');
    if (bar) return bar;
    bar = document.createElement('aside'); bar.id = 'v27-action-bar'; bar.className = 'v27-action-bar'; bar.hidden = true; document.body.append(bar); return bar;
  }
  function actionBar(message, actions = [], timeout = 9000) {
    const bar = ensureActionBar(); clearTimeout(actionTimer);
    bar.innerHTML = `<strong>${esc(message)}</strong><span>${actions.map((action, index) => `<button type="button" data-v27-action="${index}" class="${action.primary ? 'is-primary' : ''}">${esc(action.label)}</button>`).join('')}</span>`;
    bar.hidden = false;
    bar.onclick = (event) => {
      const button = event.target.closest('[data-v27-action]'); if (!button) return;
      const action = actions[Number(button.dataset.v27Action)]; bar.hidden = true; action?.run?.();
    };
    actionTimer = setTimeout(() => { bar.hidden = true; }, timeout);
  }

  async function syncMove(snapshot) {
    if (!navigator.onLine || !uuid(snapshot.id)) return;
    try {
      const { error } = await H.client.from('items').update({ category_id: snapshot.categoryId || null, room_id: snapshot.roomId || null, container_id: snapshot.containerId || null, detail: snapshot.detail || null, updated_at: new Date().toISOString() }).eq('id', snapshot.id);
      if (error) throw error;
    } catch (error) { console.warn('Angringen synkroniseres senere', error); }
  }
  function undoMove(snapshot) {
    const index = allItems().findIndex((entry) => entry.id === snapshot.id); if (index < 0) return;
    state.data.items[index] = { ...state.data.items[index], ...snapshot, updatedAt: Date.now() };
    saveData?.(); renderAll?.(); document.dispatchEvent(new CustomEvent('hed22:changed')); syncMove(snapshot); H.toast?.('Flyttingen er angret');
  }
  function showQuickAdd(item, meta) {
    actionBar(`${item.name} er lagt til`, [
      { label: 'Ferdig', run: () => {} },
      { label: 'Legg til en ting til her', primary: true, run: () => {
        clearDraft(); state.previousScreen = 'home'; navigate?.('add', { instant: true });
        setTimeout(() => {
          const form = document.querySelector('#item-form'); if (!form) return;
          form.querySelector('#item-room').value = meta.roomId; renderContainerSelect?.(meta.containerId || '');
          form.querySelector('#item-category').value = meta.categoryId; form.dataset.v27CategoryManual = '0'; form.dataset.v27IconManual = '0';
          form.querySelector('#item-name').value = ''; form.querySelector('#item-icon').value = ''; updateSuggestion(form, true); form.querySelector('#item-name').focus();
        }, 40);
      } },
    ], 12000);
  }

  function formMeta(form) {
    const id = form.querySelector('#item-id')?.value || '';
    return { id, name: form.querySelector('#item-name')?.value.trim() || '', icon: cleanIcon(form.querySelector('#item-icon')?.value || form._v27Suggestion?.icon),
      categoryId: form.querySelector('#item-category')?.value || '', roomId: form.querySelector('#item-room')?.value || '', containerId: form.querySelector('#item-container')?.value || '', detail: form.querySelector('#item-detail')?.value || '',
      previous: id ? structuredClone(itemById(id)) : null };
  }
  async function afterSave(meta) {
    const item = meta.id ? itemById(meta.id) : [...allItems()].sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt)).find((entry) => R.normalize(entry.name) === R.normalize(meta.name));
    if (!item) return;
    clearDraft(); storeDefaults(meta); await saveIcon(item.id, meta.icon);
    if (!meta.previous) showQuickAdd(item, meta);
    else if ([meta.previous.roomId, meta.previous.containerId, meta.previous.detail].join('|') !== [item.roomId, item.containerId, item.detail].join('|')) {
      actionBar(`${item.name} er flyttet`, [{ label: 'Angre', primary: true, run: () => undoMove(meta.previous) }]);
    }
  }

  async function captureSubmit(event) {
    const form = event.target.closest('#item-form'); if (!form || !form.checkValidity()) return;
    const duplicate = itemById(form.dataset.v27DuplicateId);
    if (duplicate && form.dataset.v27DuplicateBypass !== '1') {
      event.preventDefault(); event.stopImmediatePropagation();
      const choice = await duplicateChoice(duplicate);
      if (choice === 'open') { navigate?.('home', { instant: true }); setTimeout(() => openDetail?.(duplicate.id), 30); }
      if (choice === 'add') { form.dataset.v27DuplicateBypass = '1'; form.dataset.v27DuplicateBlocked = '0'; form.requestSubmit(); }
      return;
    }
    form.dataset.v27DuplicateBypass = '0';
    const meta = formMeta(form); setTimeout(() => afterSave(meta), 80);
  }

  function decorateDetail() {
    const itemId = appState()?.detailId; const item = itemById(itemId); const image = document.querySelector('#detail-sheet[open] .detail-image');
    if (!item || !image || image.querySelector('img')) return;
    const icon = itemIcon(item); if (image.textContent.trim() !== icon) image.textContent = icon;
  }

  function wrapOpenForms() {
    if (!window.__hed27OpenNewWrapped && typeof openNewForm === 'function') {
      window.__hed27OpenNewWrapped = true; const original = openNewForm;
      openNewForm = function v27OpenNewForm() {
        original(); setTimeout(() => { ensureEntryUi(); applyDefaults(); restoreDraft(); updateFormState(true); }, 0);
      };
    }
    if (!window.__hed27OpenEditWrapped && typeof openEditForm === 'function') {
      window.__hed27OpenEditWrapped = true; const original = openEditForm;
      openEditForm = function v27OpenEditForm(id) { original(id); setTimeout(() => { ensureEntryUi(); updateFormState(true); }, 0); };
    }
  }

  function entitySuggestion(event) {
    const name = event.target.closest('#entity-name'); if (!name) return;
    const icon = document.querySelector('#entity-icon'); const form = document.querySelector('#entity-form'); if (!icon || !form || form.dataset.v27EntityIconManual === '1') return;
    const suggestion = R.suggest(name.value, [], 'place'); if (suggestion) icon.value = suggestion.icon;
  }

  document.addEventListener('input', (event) => {
    const form = event.target.closest('#item-form');
    if (event.target.matches('#item-name') && form) updateSuggestion(form);
    if (event.target.matches('#item-icon') && form) { form.dataset.v27IconManual = '1'; updateSuggestion(form); }
    if (form) queueDraft(); entitySuggestion(event);
  }, true);
  document.addEventListener('change', (event) => {
    const form = event.target.closest('#item-form');
    if (event.target.matches('#item-category') && form) form.dataset.v27CategoryManual = '1';
    if (event.target.matches('#entity-icon')) document.querySelector('#entity-form').dataset.v27EntityIconManual = '1';
    if (form) { updateSuggestion(form); queueDraft(); }
  }, true);
  window.addEventListener('submit', captureSubmit, true);
  document.addEventListener('click', (event) => {
    const use = event.target.closest('[data-v27-use-suggestion]'); if (use) { const form = use.closest('#item-form'); form.dataset.v27IconManual = '0'; form.dataset.v27CategoryManual = '0'; updateSuggestion(form, true); }
    const duplicate = event.target.closest('[data-v27-open-duplicate]'); if (duplicate) { navigate?.('home', { instant: true }); setTimeout(() => openDetail?.(duplicate.dataset.v27OpenDuplicate), 30); }
    const confirmDelete = event.target.closest('[data-confirm-delete]'); if (confirmDelete) pendingDelete = structuredClone(itemById(confirmDelete.dataset.confirmDelete));
    if (event.target.closest('[data-add-entity]')) setTimeout(() => { const form = document.querySelector('#entity-form'); if (form) form.dataset.v27EntityIconManual = '0'; }, 0);
  }, true);
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-confirm-delete]') || !pendingDelete) return;
    const snapshot = pendingDelete; pendingDelete = null;
    setTimeout(() => actionBar(`${snapshot.name} er slettet`, [{ label: 'Angre', primary: true, run: () => restoreItem?.(snapshot.id) }]), 40);
  });

  let scheduled = false;
  function schedule() {
    if (scheduled) return; scheduled = true;
    requestAnimationFrame(() => { scheduled = false; wrapOpenForms(); ensureEntryUi(); updateFormState(); decorateDetail(); });
  }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'class'] });
  addEventListener('online', () => { syncIcons(); });
  document.addEventListener('hed21:auth', syncIcons);
  H.ready.then(syncIcons).catch(() => {});
  schedule();
  window.HED27Entry = { itemIcon, saveIcon, syncIcons, restoreDraft, clearDraft };
})();
