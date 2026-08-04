(() => {
  'use strict';

  const H = window.HED21;
  const V = window.HED22;
  if (!H || !V) return;

  const ui = {
    filter: 'active',
    mode: 'pack',
    busy: false,
  };

  function esc(value) { return H.html(value); }
  function icon(kind) { return V.kindIcon(kind); }
  function label(kind) { return V.kindLabel(kind); }
  function selectedList() { return V.getList(V.state.selectedListId); }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
  }

  function itemLocation(linkedItemId) {
    const appItem = (globalThis.state?.data?.items || []).find((entry) => entry.id === linkedItemId);
    if (!appItem) return '';
    if (typeof globalThis.getPath === 'function') return globalThis.getPath(appItem);
    const room = globalThis.state?.data?.rooms?.find((entry) => entry.id === appItem.roomId)?.name;
    const container = globalThis.state?.data?.containers?.find((entry) => entry.id === appItem.containerId)?.name;
    return [room, container, appItem.detail].filter(Boolean).join(' → ');
  }

  function listProgress(list) {
    const relevant = (list.items || []).filter((item) => item.status !== 'not_needed');
    const done = relevant.filter((item) => ['packed', 'done', 'returned'].includes(item.status)).length;
    return { done, total: relevant.length, percent: relevant.length ? Math.round((done / relevant.length) * 100) : 0 };
  }

  function listMeta(list) {
    const parts = [label(list.kind)];
    if (list.destination) parts.push(list.destination);
    const dates = [formatDate(list.startsOn), formatDate(list.endsOn)].filter(Boolean).join('–');
    if (dates) parts.push(dates);
    if (list.visibility === 'private') parts.push('Bare meg');
    return parts.join(' · ');
  }

  function ensureShell() {
    if (document.querySelector('[data-screen="lists"]')) return;

    const screens = document.querySelector('.screens');
    const profile = document.querySelector('[data-screen="profile"]');
    const section = document.createElement('section');
    section.className = 'screen v22-screen';
    section.dataset.screen = 'lists';
    section.innerHTML = `
      <header class="screen-header v22-header">
        <div><span class="card-overline">PLANLEGG OG HUSK</span><h1>Lister</h1></div>
        <button class="round-button" type="button" data-v22-new-list aria-label="Ny liste"><svg><use href="#i-plus" /></svg></button>
      </header>
      <section class="v22-overview" data-v22-overview></section>
      <div class="filter-strip v22-filter-strip">
        <button class="filter-pill is-active" type="button" data-v22-filter="active">Aktive</button>
        <button class="filter-pill" type="button" data-v22-filter="trip">Turer</button>
        <button class="filter-pill" type="button" data-v22-filter="all">Alle</button>
        <button class="filter-pill" type="button" data-v22-open-templates>Maler</button>
      </div>
      <section class="content-block v22-list-block">
        <div class="section-title-row"><h2>Mine lister</h2><span class="muted-count" data-v22-count></span></div>
        <div class="v22-list-grid" data-v22-list-grid></div>
        <div class="empty-state" data-v22-empty hidden>
          <div class="empty-state__icon">🧳</div>
          <h3>Ingen lister ennå</h3>
          <p>Lag en tur, pakkeliste eller huskeliste. Ting du allerede har registrert viser automatisk hvor de ligger.</p>
          <button class="primary-button" type="button" data-v22-new-list>Lag første liste</button>
        </div>
      </section>`;
    screens.insertBefore(section, profile || null);

    const roomsTab = document.querySelector('.tab-button[data-nav="rooms"]');
    if (roomsTab) {
      roomsTab.dataset.nav = 'lists';
      roomsTab.innerHTML = '<svg><use href="#i-check" /></svg><span>Lister</span>';
      roomsTab.setAttribute('aria-label', 'Lister');
    }

    const detail = document.createElement('dialog');
    detail.id = 'v22-list-dialog';
    detail.className = 'v22-dialog';
    detail.innerHTML = '<div class="v22-dialog-panel" data-v22-detail-panel></div>';
    document.body.append(detail);

    const editor = document.createElement('dialog');
    editor.id = 'v22-editor-dialog';
    editor.className = 'v22-dialog v22-dialog--compact';
    editor.innerHTML = '<div class="v22-dialog-panel" data-v22-editor-panel></div>';
    document.body.append(editor);

    const templates = document.createElement('dialog');
    templates.id = 'v22-template-dialog';
    templates.className = 'v22-dialog v22-dialog--compact';
    templates.innerHTML = `
      <div class="v22-dialog-panel">
        <header class="v22-dialog-header"><button type="button" class="v21-back" data-v22-close>Tilbake</button><h2>Velg mal</h2><span></span></header>
        <div class="v22-template-grid">${V.templates.map((template) => `
          <button type="button" class="v22-template-card" data-v22-template="${esc(template.key)}">
            <span>${template.icon}</span><strong>${esc(template.name)}</strong><small>${template.items.length} punkter</small>
          </button>`).join('')}</div>
      </div>`;
    document.body.append(templates);

    [detail, editor, templates].forEach((dialog) => dialog.addEventListener('click', (event) => {
      if (event.target === dialog || event.target.closest('[data-v22-close]')) dialog.close();
    }));
  }

  function showLists() {
    if (globalThis.state) {
      if (state.screen !== 'lists') state.previousScreen = state.screen;
      state.screen = 'lists';
    }
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('is-active', screen.dataset.screen === 'lists'));
    document.querySelectorAll('.tab-button').forEach((button) => button.classList.toggle('is-active', button.dataset.nav === 'lists'));
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) tabBar.hidden = false;
    scrollTo({ top: 0, behavior: 'smooth' });
    renderScreen();
  }

  function filteredLists() {
    const lists = [...V.state.lists].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    if (ui.filter === 'trip') return lists.filter((list) => list.kind === 'trip');
    if (ui.filter === 'active') return lists.filter((list) => list.status === 'active');
    return lists;
  }

  function listCard(list) {
    const progress = listProgress(list);
    const missing = Math.max(0, progress.total - progress.done);
    return `<button class="v22-list-card" type="button" data-v22-open-list="${esc(list.id)}">
      <span class="v22-list-icon">${icon(list.kind)}</span>
      <span class="v22-list-copy">
        <span class="v22-list-title"><strong>${esc(list.name)}</strong>${list.visibility === 'private' ? '<span class="mini-badge mini-badge--private">Privat</span>' : ''}</span>
        <small>${esc(listMeta(list))}</small>
        <span class="v22-progress"><span><i style="width:${progress.percent}%"></i></span><em>${progress.done}/${progress.total}</em></span>
        <span class="v22-list-footer">${missing ? `${missing} gjenstår` : progress.total ? 'Alt er klart' : 'Ingen punkter ennå'}<svg><use href="#i-chevron" /></svg></span>
      </span>
    </button>`;
  }

  function renderScreen() {
    const section = document.querySelector('[data-screen="lists"]');
    if (!section) return;
    const lists = filteredLists();
    const all = V.state.lists;
    const trips = all.filter((list) => list.kind === 'trip' && list.status === 'active').length;
    const missing = all.reduce((sum, list) => {
      const p = listProgress(list);
      return sum + Math.max(0, p.total - p.done);
    }, 0);

    section.querySelector('[data-v22-overview]').innerHTML = `
      <article><span>AKTIVE LISTER</span><strong>${all.filter((list) => list.status === 'active').length}</strong><small>${trips} tur${trips === 1 ? '' : 'er'}</small></article>
      <article><span>GJENSTÅR</span><strong>${missing}</strong><small>punkter å huske</small></article>`;
    section.querySelector('[data-v22-count]').textContent = `${lists.length}`;
    section.querySelector('[data-v22-list-grid]').innerHTML = lists.map(listCard).join('');
    section.querySelector('[data-v22-empty]').hidden = lists.length > 0 || V.state.loading;
    section.querySelectorAll('[data-v22-filter]').forEach((button) => button.classList.toggle('is-active', button.dataset.v22Filter === ui.filter));
  }

  function editorHtml(options = {}) {
    const list = options.list || null;
    const template = V.templates.find((entry) => entry.key === options.templateKey) || null;
    const selectedKind = list?.kind || template?.kind || 'trip';
    const title = list ? 'Rediger liste' : template ? `Ny ${template.name}` : 'Ny liste';
    const name = list?.name || template?.name || '';
    return `
      <header class="v22-dialog-header"><button type="button" class="v21-back" data-v22-close>Avbryt</button><h2>${esc(title)}</h2><span></span></header>
      <form class="v22-form" data-v22-list-form data-v22-list-id="${esc(list?.id || '')}" data-v22-template-key="${esc(template?.key || '')}">
        <label><span>Navn</span><input name="name" maxlength="80" value="${esc(name)}" placeholder="F.eks. Kos 2026" required></label>
        <label><span>Type</span><select name="kind">
          ${Object.entries({ trip: 'Tur', packing: 'Pakkeliste', reminder: 'Huskeliste', shopping: 'Handleliste', moving: 'Flytteliste', custom: 'Egen liste' }).map(([value, copy]) => `<option value="${value}" ${selectedKind === value ? 'selected' : ''}>${copy}</option>`).join('')}
        </select></label>
        <label><span>Sted <small>valgfritt</small></span><input name="destination" maxlength="120" value="${esc(list?.destination || '')}" placeholder="F.eks. Kos, Hellas"></label>
        <div class="v22-date-grid">
          <label><span>Fra</span><input name="startsOn" type="date" value="${esc(list?.startsOn || '')}"></label>
          <label><span>Til</span><input name="endsOn" type="date" value="${esc(list?.endsOn || '')}"></label>
        </div>
        <label class="v22-toggle"><span><strong>Bare meg</strong><small>Skjul listen for resten av hjemmet</small></span><input name="private" type="checkbox" ${list?.visibility === 'private' ? 'checked' : ''}></label>
        <button class="primary-button" type="submit">${list ? 'Lagre endringer' : template ? 'Lag liste fra malen' : 'Opprett liste'}</button>
      </form>`;
  }

  function openEditor(options = {}) {
    const dialog = document.querySelector('#v22-editor-dialog');
    dialog.querySelector('[data-v22-editor-panel]').innerHTML = editorHtml(options);
    if (!dialog.open) dialog.showModal();
  }

  function statusCopy(item, mode) {
    if (mode === 'unpack') return item.status === 'returned' ? 'Lagt tilbake' : 'Skal tilbake';
    if (item.status === 'buy') return 'Må kjøpes';
    if (item.status === 'found') return 'Funnet';
    if (item.status === 'packed') return 'Pakket';
    if (item.status === 'done') return 'Ferdig';
    if (item.status === 'returned') return 'Lagt tilbake';
    if (item.status === 'not_needed') return 'Ikke nødvendig';
    return 'Mangler';
  }

  function itemChecked(item, mode) {
    return mode === 'unpack' ? item.status === 'returned' : ['packed', 'done', 'returned'].includes(item.status);
  }

  function itemRow(item, list) {
    const location = itemLocation(item.linkedItemId);
    const checked = itemChecked(item, ui.mode);
    const canEdit = V.context?.canEdit !== false;
    return `<div class="v22-item-row ${checked ? 'is-done' : ''}" data-v22-item-row="${esc(item.id)}">
      <button class="v22-check" type="button" data-v22-toggle-item="${esc(item.id)}" ${canEdit ? '' : 'disabled'} aria-label="${checked ? 'Marker som ikke ferdig' : 'Marker som ferdig'}">${checked ? '<svg><use href="#i-check" /></svg>' : ''}</button>
      <button class="v22-item-main" type="button" data-v22-edit-item="${esc(item.id)}" ${canEdit ? '' : 'disabled'}>
        <span><strong>${item.quantity > 1 ? `${item.quantity} × ` : ''}${esc(item.title)}</strong><small>${esc(statusCopy(item, ui.mode))}${item.note ? ` · ${esc(item.note)}` : ''}</small></span>
        ${location ? `<span class="v22-location"><svg><use href="#i-home" /></svg>${esc(location)}</span>` : item.linkedItemId ? '<span class="v22-location is-missing">Tingen er ikke tilgjengelig</span>' : '<span class="v22-location is-muted">Ikke koblet til en registrert ting</span>'}
      </button>
      ${canEdit ? `<button class="v22-row-delete" type="button" data-v22-delete-item="${esc(item.id)}" aria-label="Slett punkt"><svg><use href="#i-trash" /></svg></button>` : ''}
    </div>`;
  }

  function itemGroups(list) {
    const groups = new Map();
    (list.items || []).forEach((item) => {
      const key = item.section || 'Pakkeliste';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return [...groups.entries()];
  }

  function detailHtml(list) {
    const progress = listProgress(list);
    const groups = itemGroups(list);
    const canEdit = V.context?.canEdit !== false;
    const unpackDisabled = !list.items.some((item) => ['packed', 'returned'].includes(item.status));
    return `
      <header class="v22-dialog-header v22-detail-header">
        <button type="button" class="v21-back" data-v22-close>Tilbake</button>
        <h2>${esc(list.name)}</h2>
        ${canEdit ? `<button type="button" class="v22-icon-button" data-v22-edit-list="${esc(list.id)}" aria-label="Rediger liste"><svg><use href="#i-edit" /></svg></button>` : '<span></span>'}
      </header>
      <div class="v22-detail-scroll">
        <section class="v22-trip-hero">
          <div><span class="v22-hero-icon">${icon(list.kind)}</span><span><small>${esc(listMeta(list))}</small><strong>${progress.done} av ${progress.total} ferdig</strong></span></div>
          <span class="v22-big-progress"><i style="width:${progress.percent}%"></i></span>
        </section>
        <div class="v22-mode-switch">
          <button type="button" class="${ui.mode === 'pack' ? 'is-active' : ''}" data-v22-mode="pack">Finn og pakk</button>
          <button type="button" class="${ui.mode === 'unpack' ? 'is-active' : ''}" data-v22-mode="unpack" ${unpackDisabled ? 'disabled' : ''}>Pakk ut</button>
        </div>
        ${ui.mode === 'unpack' ? '<div class="v22-info-banner">Trykk på hvert punkt når tingen er lagt tilbake. Appen viser hvor den hører hjemme.</div>' : ''}
        <section class="v22-items">
          ${groups.length ? groups.map(([section, items]) => `<div class="v22-section"><div class="section-title-row"><h3>${esc(section)}</h3><span class="muted-count">${items.filter((item) => itemChecked(item, ui.mode)).length}/${items.length}</span></div>${items.map((item) => itemRow(item, list)).join('')}</div>`).join('') : '<div class="empty-state empty-state--inline"><h3>Listen er tom</h3><p>Legg til det dere skal pakke eller huske.</p></div>'}
        </section>
        ${canEdit ? `<form class="v22-add-item" data-v22-item-form data-v22-list-id="${esc(list.id)}">
          <div class="section-title-row"><h3>Nytt punkt</h3></div>
          <label><span>Hva skal huskes?</span><input name="title" maxlength="120" placeholder="F.eks. Pass" required></label>
          <div class="v22-add-grid">
            <label><span>Del av listen</span><select name="section"><option>Pakkeliste</option><option>Huskeliste</option><option>Må kjøpes</option><option>Åpnes først</option></select></label>
            <label><span>Antall</span><input name="quantity" type="number" min="1" max="99" value="1"></label>
          </div>
          <label><span>Koble til en ting hjemme <small>valgfritt</small></span><select name="linkedItemId"><option value="">Ikke koblet</option>${knownItemOptions()}</select></label>
          <label><span>Notat <small>valgfritt</small></span><input name="note" maxlength="240" placeholder="F.eks. i håndbagasjen"></label>
          <button class="small-primary-button" type="submit"><svg><use href="#i-plus" /></svg> Legg til punkt</button>
        </form>
        <div class="v22-list-actions">
          <button type="button" class="v21-secondary" data-v22-duplicate-list="${esc(list.id)}">Kopier listen</button>
          <button type="button" class="v21-secondary" data-v22-reset-list="${esc(list.id)}">Nullstill avhuking</button>
          <button type="button" class="v22-danger" data-v22-delete-list="${esc(list.id)}">Slett listen</button>
        </div>` : ''}
      </div>`;
  }

  function knownItemOptions(selected = '') {
    return (globalThis.state?.data?.items || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'nb-NO'))
      .map((item) => `<option value="${esc(item.id)}" ${item.id === selected ? 'selected' : ''}>${esc(item.name)}${itemLocation(item.id) ? ` · ${esc(itemLocation(item.id))}` : ''}</option>`)
      .join('');
  }

  function renderDetail() {
    const dialog = document.querySelector('#v22-list-dialog');
    const list = selectedList();
    if (!dialog || !dialog.open || !list) return;
    dialog.querySelector('[data-v22-detail-panel]').innerHTML = detailHtml(list);
  }

  function openList(id) {
    V.state.selectedListId = id;
    ui.mode = 'pack';
    const dialog = document.querySelector('#v22-list-dialog');
    dialog.querySelector('[data-v22-detail-panel]').innerHTML = detailHtml(V.getList(id));
    if (!dialog.open) dialog.showModal();
  }

  function nextStatus(item, list) {
    if (ui.mode === 'unpack') return item.status === 'returned' ? 'packed' : 'returned';
    if (['reminder', 'shopping'].includes(list.kind) || item.section === 'Huskeliste') return item.status === 'done' ? 'needed' : 'done';
    return ['packed', 'done', 'returned'].includes(item.status) ? (item.section === 'Må kjøpes' ? 'buy' : 'needed') : 'packed';
  }

  async function run(action, successMessage = '') {
    if (ui.busy) return;
    ui.busy = true;
    document.documentElement.classList.add('v22-busy');
    try {
      await action();
      if (successMessage) H.toast(successMessage);
    } catch (error) {
      H.alert('Noe gikk galt', H.errorText(error));
    } finally {
      ui.busy = false;
      document.documentElement.classList.remove('v22-busy');
      renderScreen(); renderDetail();
    }
  }

  async function handleSubmit(event) {
    const form = event.target;
    if (form.matches('[data-v22-list-form]')) {
      event.preventDefault();
      const listId = form.dataset.v22ListId;
      const payload = {
        name: form.name.value.trim(), kind: form.kind.value, destination: form.destination.value.trim(),
        startsOn: form.startsOn.value, endsOn: form.endsOn.value,
        visibility: form.private.checked ? 'private' : 'shared',
      };
      await run(async () => {
        let list;
        if (listId) list = await V.updateList(listId, payload);
        else if (form.dataset.v22TemplateKey) list = await V.createFromTemplate(form.dataset.v22TemplateKey, payload);
        else list = await V.createList(payload);
        document.querySelector('#v22-editor-dialog').close();
        showLists(); openList(list.id);
      }, listId ? 'Listen er oppdatert' : 'Listen er opprettet');
      return;
    }

    if (form.matches('[data-v22-item-form]')) {
      event.preventDefault();
      const section = form.section.value;
      const title = form.title.value.trim();
      let linkedItemId = form.linkedItemId.value;
      if (!linkedItemId) linkedItemId = V.findLinkedItem(title)?.id || '';
      await run(async () => {
        await V.addItem(form.dataset.v22ListId, {
          title, section, linkedItemId, quantity: form.quantity.value, note: form.note.value.trim(),
          status: section === 'Må kjøpes' ? 'buy' : 'needed',
        });
        form.reset();
        form.quantity.value = 1;
      }, 'Punktet er lagt til');
    }
  }

  async function handleClick(event) {
    const nav = event.target.closest('[data-nav="lists"]');
    if (nav) {
      event.preventDefault(); event.stopImmediatePropagation();
      showLists(); return;
    }

    if (event.target.closest('[data-v22-new-list]')) { openEditor(); return; }
    if (event.target.closest('[data-v22-open-templates]')) { document.querySelector('#v22-template-dialog').showModal(); return; }

    const filter = event.target.closest('[data-v22-filter]');
    if (filter) { ui.filter = filter.dataset.v22Filter; renderScreen(); return; }

    const template = event.target.closest('[data-v22-template]');
    if (template) {
      document.querySelector('#v22-template-dialog').close();
      openEditor({ templateKey: template.dataset.v22Template });
      return;
    }

    const open = event.target.closest('[data-v22-open-list]');
    if (open) { openList(open.dataset.v22OpenList); return; }

    const mode = event.target.closest('[data-v22-mode]');
    if (mode) { ui.mode = mode.dataset.v22Mode; renderDetail(); return; }

    const editList = event.target.closest('[data-v22-edit-list]');
    if (editList) { openEditor({ list: V.getList(editList.dataset.v22EditList) }); return; }

    const toggle = event.target.closest('[data-v22-toggle-item]');
    if (toggle) {
      const list = selectedList();
      const item = list?.items.find((entry) => entry.id === toggle.dataset.v22ToggleItem);
      if (!item) return;
      await run(() => V.updateItem(list.id, item.id, { status: nextStatus(item, list) }));
      return;
    }

    const editItem = event.target.closest('[data-v22-edit-item]');
    if (editItem) {
      const list = selectedList();
      const item = list?.items.find((entry) => entry.id === editItem.dataset.v22EditItem);
      if (!item) return;
      const next = prompt('Endre teksten', item.title);
      if (next?.trim() && next.trim() !== item.title) await run(() => V.updateItem(list.id, item.id, { title: next.trim() }), 'Punktet er oppdatert');
      return;
    }

    const deleteItem = event.target.closest('[data-v22-delete-item]');
    if (deleteItem) {
      const list = selectedList();
      if (list && confirm('Slette punktet fra listen?')) await run(() => V.deleteItem(list.id, deleteItem.dataset.v22DeleteItem), 'Punktet er slettet');
      return;
    }

    const duplicate = event.target.closest('[data-v22-duplicate-list]');
    if (duplicate) {
      await run(async () => {
        const copy = await V.duplicateList(duplicate.dataset.v22DuplicateList);
        document.querySelector('#v22-list-dialog').close();
        openList(copy.id);
      }, 'Listen er kopiert');
      return;
    }

    const reset = event.target.closest('[data-v22-reset-list]');
    if (reset && confirm('Nullstille alle avhukinger i listen?')) {
      await run(() => V.resetPacking(reset.dataset.v22ResetList), 'Listen er nullstilt');
      return;
    }

    const deleteList = event.target.closest('[data-v22-delete-list]');
    if (deleteList && confirm('Slette hele listen?')) {
      await run(async () => {
        await V.deleteList(deleteList.dataset.v22DeleteList);
        document.querySelector('#v22-list-dialog').close();
      }, 'Listen er slettet');
    }
  }

  function boot() {
    ensureShell();
    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);
    document.addEventListener('hed22:changed', () => { renderScreen(); renderDetail(); });
    renderScreen();
  }

  V.ready.then(boot).catch((error) => console.error('2.2-listene kunne ikke startes', error));
})();
