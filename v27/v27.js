(() => {
  'use strict';
  const H = window.HED21;
  if (!H) return;
  H.version = '2.7.0';
  if (window.HED23) window.HED23.version = '2.7.0';

  const DRAFT_KEY = 'hed-v27-item-draft';
  const LAST_KEY = 'hed-v27-last-location';
  const esc = (value) => H.html(String(value ?? ''));
  const appState = () => (typeof state !== 'undefined' ? state : null);
  const items = () => appState()?.data?.items || [];
  let userChangedCategory = false;
  let keepLocationAfterSave = false;
  let duplicateId = '';
  let scheduled = false;

  const RULES = [
    { words: ['nøkkel','nøkler','bilnøkkel','husnøkkel','reservenøkkel','nøkkelknippe'], emoji: '🔑', category: ['Viktig','Annet'] },
    { words: ['pass','førerkort','legitimasjon','bankkort','reiseforsikring','kontrakt','vitnemål','attest','dokument'], emoji: '📄', category: ['Dokumenter','Viktig'] },
    { words: ['drill','batteridrill','slagdrill','slagtrekker','skrutrekker','hammer','sag','tang','pipesett','skrallesett','momentnøkkel','verktøy'], emoji: '🛠️', category: ['Verktøy'] },
    { words: ['lader','ladekabel','usb','kabel','adapter','powerbank','telefon','mobil','nettbrett','ipad','pc','laptop','skjerm','hodetelefon','ørepropper','kamera'], emoji: '🔌', category: ['Elektronikk'] },
    { words: ['lommelykt','hodelykt','lykt'], emoji: '🔦', category: ['Elektronikk','Fritid'] },
    { words: ['brannslukker','brannteppe','røykvarsler'], emoji: '🧯', category: ['Viktig','Annet'] },
    { words: ['medisin','medisiner','tablett','smertestillende','førstehjelp','plaster','bandasje'], emoji: '💊', category: ['Helse','Viktig'] },
    { words: ['jakke','bukse','genser','skjorte','kjole','shorts','sokker','undertøy','klær'], emoji: '👕', category: ['Klær'] },
    { words: ['sko','støvler','joggesko','sandaler'], emoji: '👟', category: ['Klær'] },
    { words: ['håndkle','sengetøy','dyne','pute','pledd'], emoji: '🛏️', category: ['Hjem','Klær'] },
    { words: ['støvsuger','kost','mopp','vaskemiddel','rengjøring','bøtte'], emoji: '🧹', category: ['Hjem'] },
    { words: ['stekepanne','gryte','kniv','bestikk','tallerken','glass','kopp','kjøkkenmaskin','kaffetrakter'], emoji: '🍳', category: ['Kjøkken','Hjem'] },
    { words: ['matboks','termos','drikkeflaske','flaske'], emoji: '🥤', category: ['Kjøkken','Fritid'] },
    { words: ['sykkel','sykkelhjelm','pumpe','sykkellås'], emoji: '🚲', category: ['Sport','Fritid'] },
    { words: ['ski','skisko','staver','snowboard','skøyter','fotball','treningsmatte','manual','strikk','trening'], emoji: '🏋️', category: ['Sport','Fritid'] },
    { words: ['koffert','bag','sekk','ryggsekk','toalettmappe','reise'], emoji: '🧳', category: ['Reise','Fritid'] },
    { words: ['hundebånd','hundesele','hundemat','hundeleke','hund','katt','kattemat','dyr'], emoji: '🐕', category: ['Kjæledyr','Annet'] },
    { words: ['bil','bilpleie','startkabler','varseltrekant','jekk','dekk'], emoji: '🚗', category: ['Bil','Annet'] },
    { words: ['hage','gressklipper','spade','rive','hageslange'], emoji: '🌿', category: ['Hage','Verktøy'] },
    { words: ['pære','lyspære','lampe'], emoji: '💡', category: ['Hjem','Elektronikk'] },
    { words: ['batteri','batterier'], emoji: '🔋', category: ['Elektronikk'] },
    { words: ['paraply','regntøy'], emoji: '☔', category: ['Klær','Fritid'] },
    { words: ['bok','bøker','manual','bruksanvisning'], emoji: '📚', category: ['Dokumenter','Annet'] },
    { words: ['gave','julepynt','pynt'], emoji: '🎁', category: ['Hjem','Annet'] }
  ];

  function normalize(value) { return String(value || '').toLocaleLowerCase('nb-NO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9æøå]+/g, ' ').trim(); }
  function matchRule(name) {
    const text = normalize(name).replaceAll(' ', '');
    if (!text) return null;
    return RULES.find((rule) => rule.words.some((word) => text.includes(normalize(word).replaceAll(' ', '')))) || null;
  }
  function categoryOption(names = []) {
    const select = document.querySelector('#item-category');
    return [...(select?.options || [])].find((option) => names.some((name) => normalize(option.textContent).includes(normalize(name)))) || null;
  }
  function ensureSuggestion() {
    const name = document.querySelector('#item-name');
    if (!name || document.querySelector('.v27-smart-suggestion')) return;
    const box = document.createElement('div');
    box.className = 'v27-smart-suggestion';
    box.hidden = true;
    name.closest('label, .form-field, div')?.append(box);
  }
  function updateSuggestion() {
    ensureSuggestion();
    const input = document.querySelector('#item-name');
    const box = document.querySelector('.v27-smart-suggestion');
    if (!input || !box) return;
    const rule = matchRule(input.value);
    const existing = items().find((item) => normalize(item.name) === normalize(input.value) && item.id !== document.querySelector('#item-id')?.value);
    duplicateId = existing?.id || '';
    if (!rule && !existing) { box.hidden = true; box.innerHTML = ''; return; }
    const option = rule ? categoryOption(rule.category) : null;
    if (rule && option && !userChangedCategory && !document.querySelector('#item-id')?.value) document.querySelector('#item-category').value = option.value;
    box.hidden = false;
    box.innerHTML = `${rule ? `<span class="v27-emoji">${rule.emoji}</span><span><strong>Forslag: ${esc(option?.textContent?.replace(/^\S+\s*/, '') || rule.category[0])}</strong><small>Basert på navnet. Du kan endre det.</small></span>` : ''}${existing ? `<button type="button" data-v27-open-duplicate="${esc(existing.id)}"><strong>Finnes allerede</strong><small>${esc(existing.name)} · ${esc(typeof getPath === 'function' ? getPath(existing) : '')}</small></button>` : ''}`;
  }

  function draftData() {
    const form = document.querySelector('#item-form');
    if (!form || document.querySelector('#item-id')?.value) return null;
    return { name: form.querySelector('#item-name')?.value || '', category: form.querySelector('#item-category')?.value || '', room: form.querySelector('#item-room')?.value || '', container: form.querySelector('#item-container')?.value || '', detail: form.querySelector('#item-detail')?.value || '', tags: form.querySelector('#item-tags')?.value || '', notes: form.querySelector('#item-notes')?.value || '', at: Date.now() };
  }
  function saveDraft() { const draft = draftData(); if (draft?.name || draft?.detail || draft?.notes) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }
  function clearDraft() { localStorage.removeItem(DRAFT_KEY); }
  function restoreDraft() {
    const form = document.querySelector('#item-form');
    if (!form || document.querySelector('#item-id')?.value || form.dataset.v27DraftRestored === '1') return;
    form.dataset.v27DraftRestored = '1';
    let draft; try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { draft = null; }
    if (!draft || Date.now() - Number(draft.at || 0) > 7 * 86400000) return;
    const set = (selector, value) => { const field = form.querySelector(selector); if (field && value) field.value = value; };
    set('#item-name', draft.name); set('#item-category', draft.category); set('#item-room', draft.room);
    if (typeof renderContainerSelect === 'function') renderContainerSelect(draft.container || '');
    set('#item-detail', draft.detail); set('#item-tags', draft.tags); set('#item-notes', draft.notes);
    updateSuggestion();
  }

  function ensureAddAnother() {
    const form = document.querySelector('#item-form'); const save = form?.querySelector('.form-save-button');
    if (!form || !save || form.querySelector('[data-v27-add-another]')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'v27-add-another'; button.dataset.v27AddAnother = '1';
    button.textContent = 'Lagre og legg til en ting til her'; save.before(button);
  }
  function continueAtSameLocation() {
    let last; try { last = JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); } catch { last = null; }
    if (!last) return;
    setTimeout(() => {
      if (typeof navigate === 'function') navigate('add', { instant: true });
      const room = document.querySelector('#item-room'); if (room) room.value = last.room;
      if (typeof renderContainerSelect === 'function') renderContainerSelect(last.container || '');
      const detail = document.querySelector('#item-detail'); if (detail) detail.value = last.detail || '';
      document.querySelector('#item-name')?.focus();
    }, 80);
  }

  function ensureOfflineBadge() {
    if (document.querySelector('.v27-network')) return;
    const badge = document.createElement('div'); badge.className = 'v27-network'; document.body.append(badge); updateNetwork();
  }
  function updateNetwork() { const badge = document.querySelector('.v27-network'); if (!badge) return; badge.textContent = navigator.onLine ? '' : 'Frakoblet – lagrer lokalt'; badge.hidden = navigator.onLine; }

  function groupInvites() {
    const list = document.querySelector('.v21-invites');
    if (!list || list.dataset.v27Grouped === '1') return;
    const rows = [...list.querySelectorAll('.v21-invite-row')]; if (!rows.length) return;
    const old = rows.filter((row) => /Tilbakekalt|Utløpt|Brukt/.test(row.textContent));
    if (!old.length) return;
    list.dataset.v27Grouped = '1';
    const details = document.createElement('details'); details.className = 'v27-old-invites'; details.innerHTML = `<summary>Tidligere invitasjoner <span>${old.length}</span></summary><div></div>`;
    old.forEach((row) => details.lastElementChild.append(row)); list.append(details);
  }

  function sync() {
    ensureSuggestion(); ensureAddAnother(); restoreDraft(); groupInvites(); ensureOfflineBadge();
    const meta = document.querySelector('#about-button .settings-meta');
    if (meta && meta.textContent !== 'v2.7') meta.textContent = 'v2.7';
    document.documentElement.classList.add('v27');
  }
  function schedule() { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; sync(); }); }

  document.addEventListener('input', (event) => {
    if (event.target.matches('#item-name')) updateSuggestion();
    if (event.target.closest('#item-form')) saveDraft();
  });
  document.addEventListener('change', (event) => {
    if (event.target.matches('#item-category')) userChangedCategory = true;
    if (event.target.closest('#item-form')) saveDraft();
  });
  document.addEventListener('click', (event) => {
    const duplicate = event.target.closest('[data-v27-open-duplicate]');
    if (duplicate) { event.preventDefault(); if (typeof openDetail === 'function') openDetail(duplicate.dataset.v27OpenDuplicate); }
    if (event.target.closest('[data-v27-add-another]')) {
      const form = document.querySelector('#item-form'); if (!form?.reportValidity()) return;
      keepLocationAfterSave = true;
      localStorage.setItem(LAST_KEY, JSON.stringify({ room: form.querySelector('#item-room')?.value || '', container: form.querySelector('#item-container')?.value || '', detail: form.querySelector('#item-detail')?.value || '' }));
      form.requestSubmit();
    }
    if (event.target.closest('[data-open-add]')) userChangedCategory = false;
  }, true);
  document.addEventListener('submit', (event) => {
    if (!event.target.matches('#item-form')) return;
    if (duplicateId && !document.querySelector('#item-id')?.value && !event.submitter?.dataset?.v27ForceDuplicate) {
      const existing = items().find((item) => item.id === duplicateId);
      const proceed = window.confirm(`Det finnes allerede en ting som heter «${existing?.name || 'det samme'}». Legge til likevel?`);
      if (!proceed) { event.preventDefault(); event.stopImmediatePropagation(); if (existing && typeof openDetail === 'function') openDetail(existing.id); return; }
    }
    clearDraft();
    if (keepLocationAfterSave) { keepLocationAfterSave = false; continueAtSameLocation(); }
  }, true);

  window.addEventListener('online', updateNetwork); window.addEventListener('offline', updateNetwork);
  window.addEventListener('pagehide', saveDraft);
  window.addEventListener('popstate', () => {
    const open = [...document.querySelectorAll('dialog[open]')].at(-1); if (open) { open.close(); history.pushState(null, '', location.href); }
  });
  const observer = new MutationObserver(schedule); observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('hed22:changed', schedule);
  schedule();
})();