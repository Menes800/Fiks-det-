(() => {
  'use strict';
  const H = window.HED21;
  if (!H) return;

  const KEY = 'hed-v26-reminders-v1';
  const QUEUE_KEY = 'hed-v26-reminder-queue-v1';
  const DAY = 86400000;
  const appState = () => (typeof state !== 'undefined' ? state : null);
  const items = () => appState()?.data?.items || [];
  const esc = (value) => H.html(String(value ?? ''));
  let reminders = read(KEY);
  let queue = read(QUEUE_KEY);
  let scheduled = false;
  let syncing = false;

  function read(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(reminders));
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) { console.warn('Kunne ikke lagre påminnelser lokalt', error); }
  }
  function uuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '')); }
  function homeId() { return H.context?.home?.id || appState()?.data?.home?.id || ''; }
  function current(itemId) { const home = homeId(); return reminders.find((entry) => entry.itemId === itemId && (!home || entry.homeId === home)) || null; }
  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function parseDate(value) { const [y, m, d] = String(value || '').split('-').map(Number); return y && m && d ? new Date(y, m - 1, d, 12) : null; }
  function iso(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  function addDays(value, days) { const d = parseDate(value) || new Date(); d.setDate(d.getDate() + days); return iso(d); }
  function addMonths(value, months) {
    const d = parseDate(value) || new Date(); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + months);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return iso(d);
  }
  function repeatLabel(value) { return ({ 0: 'Én gang', 1: 'Hver måned', 3: 'Hver 3. måned', 6: 'Hver 6. måned', 12: 'Hvert år' })[Number(value) || 0]; }
  function dueLabel(reminder) {
    if (reminder.completedAt) return 'Fullført';
    const due = parseDate(reminder.dueOn); const now = parseDate(today()); if (!due || !now) return reminder.dueOn || '';
    const diff = Math.round((due - now) / DAY);
    if (diff < 0) return `${Math.abs(diff)} dag${Math.abs(diff) === 1 ? '' : 'er'} på overtid`;
    if (diff === 0) return 'I dag'; if (diff === 1) return 'I morgen'; if (diff <= 7) return `Om ${diff} dager`;
    return new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: due.getFullYear() !== now.getFullYear() ? 'numeric' : undefined }).format(due);
  }
  function row(data) {
    return { id: data.id, homeId: data.home_id, itemId: data.item_id, title: data.title, dueOn: data.due_on,
      repeatMonths: Number(data.repeat_months || 0), completedAt: data.completed_at || '', lastCompletedAt: data.last_completed_at || '',
      createdBy: data.created_by || '', createdAt: data.created_at || '', updatedAt: data.updated_at || '' };
  }
  function replace(next) { reminders = [next, ...reminders.filter((entry) => !(entry.itemId === next.itemId && entry.homeId === next.homeId))]; persist(); schedule(); }
  function removeLocal(itemId, home = homeId()) { reminders = reminders.filter((entry) => !(entry.itemId === itemId && (!home || entry.homeId === home))); persist(); schedule(); }
  function enqueue(operation) { queue = [operation, ...queue.filter((entry) => entry.itemId !== operation.itemId)].slice(0, 100); persist(); }
  async function context() { await H.ready; return H.getContext ? H.getContext() : H.context; }
  async function upsertCloud(reminder) {
    const ctx = await context(); if (!ctx?.user || !ctx?.home || !uuid(reminder.itemId)) throw new Error('Venter på skysynk');
    const payload = { id: reminder.id, home_id: ctx.home.id, item_id: reminder.itemId, created_by: reminder.createdBy || ctx.user.id,
      title: reminder.title, due_on: reminder.dueOn, repeat_months: Number(reminder.repeatMonths || 0),
      completed_at: reminder.completedAt || null, last_completed_at: reminder.lastCompletedAt || null, updated_at: new Date().toISOString() };
    const { data, error } = await H.client.from('item_reminders').upsert(payload, { onConflict: 'item_id' }).select('*').single();
    if (error) throw error; replace(row(data));
  }
  async function deleteCloud(itemId) {
    const ctx = await context(); if (!ctx?.user || !ctx?.home || !uuid(itemId)) throw new Error('Venter på skysynk');
    const { error } = await H.client.from('item_reminders').delete().eq('home_id', ctx.home.id).eq('item_id', itemId); if (error) throw error;
  }
  async function flush() {
    if (syncing || !navigator.onLine || !queue.length) return; syncing = true; const remaining = [];
    for (const operation of [...queue].reverse()) {
      try { operation.type === 'delete' ? await deleteCloud(operation.itemId) : await upsertCloud(operation.reminder); }
      catch (error) { remaining.push(operation); console.warn('Påminnelsen venter på skysynk', error); }
    }
    queue = remaining.reverse(); syncing = false; persist();
  }
  async function syncCloud() {
    if (syncing || !navigator.onLine) return;
    try {
      await flush(); const ctx = await context(); if (!ctx?.user || !ctx?.home) return;
      const { data, error } = await H.client.from('item_reminders').select('*').eq('home_id', ctx.home.id).order('due_on'); if (error) throw error;
      const pending = new Set(queue.map((entry) => entry.itemId)); const cloud = (data || []).map(row).filter((entry) => !pending.has(entry.itemId));
      reminders = [...reminders.filter((entry) => entry.homeId !== ctx.home.id || pending.has(entry.itemId)), ...cloud]; persist(); schedule();
    } catch (error) { console.warn('Bruker lokale påminnelser', error); }
  }
  async function save(item, values) {
    const existing = current(item.id); const home = H.context?.home?.id || homeId(); const title = String(values.title || '').trim(); const dueOn = String(values.dueOn || '').trim();
    if (!title || !dueOn) {
      if (!existing) return; removeLocal(item.id, home);
      try { await deleteCloud(item.id); } catch { enqueue({ type: 'delete', itemId: item.id, homeId: home, at: Date.now() }); H.toast?.('Påminnelsen fjernes fra skyen når nettet er klart.'); }
      return;
    }
    const next = { id: existing?.id || crypto.randomUUID(), homeId: home, itemId: item.id, title, dueOn, repeatMonths: Number(values.repeatMonths || 0),
      completedAt: existing?.completedAt || '', lastCompletedAt: existing?.lastCompletedAt || '', createdBy: existing?.createdBy || H.user?.id || '',
      createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    replace(next);
    try { await upsertCloud(next); } catch { enqueue({ type: 'upsert', itemId: item.id, reminder: next, at: Date.now() }); H.toast?.('Påminnelsen er lagret og synkroniseres senere.'); }
  }
  async function update(reminder, patch, message) {
    const next = { ...reminder, ...patch, updatedAt: new Date().toISOString() }; replace(next);
    try { await upsertCloud(next); } catch { enqueue({ type: 'upsert', itemId: next.itemId, reminder: next, at: Date.now() }); }
    if (message) H.toast?.(message);
  }
  async function complete(itemId) {
    const reminder = current(itemId); if (!reminder) return; const now = new Date().toISOString();
    if (reminder.repeatMonths > 0) {
      let next = reminder.dueOn; do { next = addMonths(next, reminder.repeatMonths); } while (next <= today());
      await update(reminder, { dueOn: next, completedAt: '', lastCompletedAt: now }, `Ferdig. Neste gang ${dueLabel({ ...reminder, dueOn: next, completedAt: '' }).toLowerCase()}.`);
    } else await update(reminder, { completedAt: now, lastCompletedAt: now }, 'Påminnelsen er fullført');
  }
  async function snooze(itemId) { const reminder = current(itemId); if (reminder) await update(reminder, { dueOn: addDays(reminder.dueOn, 7), completedAt: '' }, 'Påminnelsen er utsatt én uke'); }

  function ensureFields() {
    const body = document.querySelector('#item-form .v24-more-body'); if (!body || body.querySelector('.v26-reminder-fields')) return;
    body.insertAdjacentHTML('beforeend', `<section class="v26-reminder-fields"><div class="v26-field-head"><span>🔔</span><div><strong>Påminnelse og vedlikehold</strong><small>Valgfritt. Vises i appen når datoen nærmer seg.</small></div></div><label><span>Hva skal gjøres?</span><input id="item-reminder-title" maxlength="120" placeholder="F.eks. bytt filter"></label><div class="v26-reminder-grid"><label><span>Dato</span><input id="item-reminder-date" type="date"></label><label><span>Gjenta</span><select id="item-reminder-repeat"><option value="0">Aldri</option><option value="1">Hver måned</option><option value="3">Hver 3. måned</option><option value="6">Hver 6. måned</option><option value="12">Hvert år</option></select></label></div><p class="v26-reminder-hint">Tøm oppgaven eller datoen for å fjerne en eksisterende påminnelse.</p></section>`);
    populate(true);
  }
  function populate(force = false) {
    const form = document.querySelector('#item-form'); const title = document.querySelector('#item-reminder-title'); const date = document.querySelector('#item-reminder-date'); const repeat = document.querySelector('#item-reminder-repeat');
    if (!form || !title || !date || !repeat) return; const itemId = document.querySelector('#item-id')?.value || ''; const marker = itemId || '__new__';
    if (!force && form.dataset.v26ReminderFor === marker) return; form.dataset.v26ReminderFor = marker; const reminder = itemId ? current(itemId) : null;
    title.value = reminder?.title || ''; date.value = reminder?.dueOn || ''; repeat.value = String(reminder?.repeatMonths || 0);
  }
  function captureSubmit(event) {
    const form = event.target.closest('#item-form'); if (!form || !form.checkValidity()) return;
    const values = { title: form.querySelector('#item-reminder-title')?.value || '', dueOn: form.querySelector('#item-reminder-date')?.value || '', repeatMonths: form.querySelector('#item-reminder-repeat')?.value || 0 };
    const existingId = form.querySelector('#item-id')?.value || ''; const name = form.querySelector('#item-name')?.value.trim() || '';
    setTimeout(async () => {
      const item = items().find((entry) => entry.id === existingId) || [...items()].sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt)).find((entry) => entry.name === name);
      if (item) { await save(item, values); setTimeout(flush, 2500); }
    }, 0);
  }
  function card(itemId) {
    const reminder = current(itemId);
    if (!reminder) return `<section class="v26-detail-reminder is-empty"><span>🔔</span><div><strong>Ingen påminnelse</strong><small>Legg til dato under «Flere detaljer».</small></div><button type="button" data-v26-edit-reminder="${esc(itemId)}">Legg til</button></section>`;
    return `<section class="v26-detail-reminder ${reminder.completedAt ? 'is-complete' : ''}"><span>🔔</span><div><strong>${esc(reminder.title)}</strong><small>${esc(dueLabel(reminder))} · ${esc(repeatLabel(reminder.repeatMonths))}</small></div><div class="v26-reminder-actions">${reminder.completedAt ? '' : `<button type="button" data-v26-complete="${esc(itemId)}">Ferdig</button><button type="button" data-v26-snooze="${esc(itemId)}">+ 1 uke</button>`}<button type="button" data-v26-edit-reminder="${esc(itemId)}">Rediger</button></div></section>`;
  }
  function detail() {
    const sheet = document.querySelector('#detail-sheet'); const itemId = appState()?.detailId; const body = sheet?.querySelector('#detail-body'); if (!sheet?.open || !body || !itemId) return;
    const signature = JSON.stringify(current(itemId)); const old = body.querySelector('.v26-detail-reminder'); if (old?.dataset.itemId === itemId && old.dataset.signature === signature) return; old?.remove();
    const wrap = document.createElement('div'); wrap.innerHTML = card(itemId); const next = wrap.firstElementChild; next.dataset.itemId = itemId; next.dataset.signature = signature;
    const actions = body.querySelector('.detail-actions'); actions ? actions.before(next) : body.append(next);
  }
  function upcoming() {
    const home = homeId(); const limit = addDays(today(), 30);
    return reminders.filter((entry) => (!home || entry.homeId === home) && !entry.completedAt && entry.dueOn <= limit && items().some((item) => item.id === entry.itemId)).sort((a, b) => a.dueOn.localeCompare(b.dueOn)).slice(0, 5);
  }
  function home() {
    const screen = document.querySelector('[data-screen="home"]'); if (!screen) return; let section = screen.querySelector('.v26-upcoming');
    if (!section) { section = document.createElement('section'); section.className = 'content-block v26-upcoming'; const recent = [...screen.querySelectorAll(':scope > .content-block')].find((entry) => entry.querySelector('h2')?.textContent.trim() === 'Nylig brukt'); recent ? recent.after(section) : screen.append(section); }
    const entries = upcoming(); section.hidden = !entries.length; if (!entries.length) return;
    section.innerHTML = `<div class="section-title-row"><h2>Kommer snart</h2><span class="muted-count">${entries.length}</span></div><div class="v26-upcoming-list">${entries.map((entry) => { const item = items().find((candidate) => candidate.id === entry.itemId); return `<article class="v26-upcoming-row"><button type="button" class="v26-upcoming-main" data-item-id="${esc(entry.itemId)}"><span>🔔</span><span><strong>${esc(entry.title)}</strong><small>${esc(item?.name || 'Ting')} · ${esc(dueLabel(entry))}</small></span></button><button type="button" class="v26-upcoming-done" data-v26-complete="${esc(entry.itemId)}" aria-label="Marker ferdig">✓</button></article>`; }).join('')}</div>`;
  }
  function syncUi() { ensureFields(); populate(); detail(); home(); }
  function schedule() { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; syncUi(); }); }

  window.HED26 = Object.assign(window.HED26 || {}, { reminders: () => [...reminders], syncReminders: syncCloud, completeReminder: complete, snoozeReminder: snooze });
  window.addEventListener('submit', captureSubmit, true);
  window.addEventListener('click', async (event) => {
    const done = event.target.closest('[data-v26-complete]'); if (done) { event.preventDefault(); event.stopImmediatePropagation(); await complete(done.dataset.v26Complete); return; }
    const later = event.target.closest('[data-v26-snooze]'); if (later) { event.preventDefault(); event.stopImmediatePropagation(); await snooze(later.dataset.v26Snooze); return; }
    const edit = event.target.closest('[data-v26-edit-reminder]'); if (edit) { event.preventDefault(); event.stopImmediatePropagation(); if (typeof openEditForm === 'function') openEditForm(edit.dataset.v26EditReminder); setTimeout(() => populate(true), 0); return; }
    if (event.target.closest('[data-open-add],[data-detail-action="edit"]')) setTimeout(() => populate(true), 0);
  }, true);
  window.addEventListener('online', () => { flush().then(syncCloud); });
  document.addEventListener('hed21:auth', syncCloud); document.addEventListener('hed22:changed', schedule);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  H.ready.then(syncCloud).catch(schedule); setInterval(flush, 30000); schedule();
})();
