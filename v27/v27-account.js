(() => {
  'use strict';
  const H = window.HED21;
  if (!H) return;

  const HIDDEN_KEY = 'hed-v27-hidden-invitations-v1';
  let scheduled = false;

  function hiddenKeys() {
    try { const value = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]'); return new Set(Array.isArray(value) ? value : []); }
    catch { return new Set(); }
  }
  function saveHidden(value) { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...value].slice(-200))); }
  function keyFor(row) { return row.dataset.v27InviteKey || btoa(unescape(encodeURIComponent(row.textContent.trim()))).slice(0, 100); }

  function openCanonicalAccount() {
    const account = document.querySelector('#account-info');
    if (account) {
      account.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return;
    }
    H.toast?.('Åpne Profil for å administrere hjemmet.');
  }
  function keepCanonicalOpener() {
    if (window.openAccountSheet !== openCanonicalAccount) window.openAccountSheet = openCanonicalAccount;
  }

  function statusOf(row) {
    const text = row.textContent || '';
    if (/·\s*Aktiv\s*·/i.test(text)) return 'active';
    if (/Tilbakekalt/i.test(text)) return 'revoked';
    if (/Utløpt/i.test(text)) return 'expired';
    if (/Brukt/i.test(text)) return 'used';
    return 'history';
  }
  function emailOf(row) { return row.querySelector('strong')?.textContent?.trim() || ''; }
  function addHistoryActions(row) {
    if (row.querySelector('.v27-history-actions')) return;
    const email = emailOf(row);
    const actions = document.createElement('span'); actions.className = 'v27-history-actions';
    actions.innerHTML = `${email && email !== 'Invitasjonslenke' ? `<button type="button" data-v27-resend-invite="${H.html(email)}">Send på nytt</button>` : ''}<button type="button" data-v27-hide-invite>Skjul</button>`;
    row.append(actions);
  }

  function organizeInvites() {
    const list = document.querySelector('.v21-invites');
    if (!list || list.dataset.v27Organized === '1') return;
    const rows = [...list.children].filter((node) => node.classList.contains('v21-invite-row'));
    if (!rows.length) return;
    list.dataset.v27Organized = '1';
    const hidden = hiddenKeys();
    const active = rows.filter((row) => statusOf(row) === 'active');
    const history = rows.filter((row) => statusOf(row) !== 'active');
    const activeWrap = document.createElement('div'); activeWrap.className = 'v27-active-invites';
    active.forEach((row) => activeWrap.append(row));
    list.replaceChildren(activeWrap);

    if (!active.length) activeWrap.innerHTML = '<p class="v21-muted">Ingen aktive invitasjoner.</p>';
    if (!history.length) return;

    const details = document.createElement('details'); details.className = 'v27-invite-history';
    const visible = history.filter((row) => !hidden.has(keyFor(row)));
    details.innerHTML = `<summary><span><strong>Tidligere invitasjoner</strong><small>Tilbakekalte, brukte og utløpte</small></span><b>${visible.length}</b></summary><div class="v27-invite-history-body"></div>`;
    const body = details.querySelector('.v27-invite-history-body');
    visible.forEach((row) => { row.dataset.v27InviteKey = keyFor(row); addHistoryActions(row); body.append(row); });
    if (!visible.length) body.innerHTML = '<p class="v21-muted">Ingen tidligere invitasjoner vises.</p>';
    if (visible.length > 1) {
      const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'v27-hide-all-invites'; clear.dataset.v27HideAllInvites = '1'; clear.textContent = 'Rydd listen'; body.append(clear);
    }
    list.append(details);
  }

  function reopenSameAccount() {
    const dialog = document.querySelector('#v21-account-dialog');
    if (dialog?.open) openCanonicalAccount();
  }

  document.addEventListener('click', (event) => {
    const resend = event.target.closest('[data-v27-resend-invite]');
    if (resend) {
      const form = document.querySelector('[data-v21-invite-form]'); const email = form?.querySelector('input[name="email"]');
      if (email) { email.value = resend.dataset.v27ResendInvite; email.dispatchEvent(new Event('input', { bubbles: true })); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => email.focus(), 250); H.toast?.('E-posten er fylt inn. Trykk «Send invitasjon».'); }
    }
    const hide = event.target.closest('[data-v27-hide-invite]');
    if (hide) {
      const row = hide.closest('.v21-invite-row'); const hidden = hiddenKeys(); hidden.add(keyFor(row)); saveHidden(hidden); row.remove();
      const details = hide.closest('.v27-invite-history'); const count = details?.querySelectorAll('.v21-invite-row').length || 0; if (details) details.querySelector('summary b').textContent = String(count);
      H.toast?.('Invitasjonen er skjult fra listen');
    }
    if (event.target.closest('[data-v27-hide-all-invites]')) {
      const details = event.target.closest('.v27-invite-history'); const hidden = hiddenKeys();
      details?.querySelectorAll('.v21-invite-row').forEach((row) => hidden.add(keyFor(row))); saveHidden(hidden);
      details?.querySelector('.v27-invite-history-body')?.replaceChildren(Object.assign(document.createElement('p'), { className: 'v21-muted', textContent: 'Ingen tidligere invitasjoner vises.' }));
      if (details) details.querySelector('summary b').textContent = '0'; H.toast?.('Tidligere invitasjoner er ryddet bort');
    }
  }, true);

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-v21-revoke-invite]')) return;
    setTimeout(reopenSameAccount, 700);
  }, true);

  function updateVersion() {
    H.version = '2.7.0'; if (window.HED23) window.HED23.version = '2.7.0';
    const meta = document.querySelector('#about-button .settings-meta'); if (meta) meta.textContent = 'v2.7';
  }
  function sync() { keepCanonicalOpener(); organizeInvites(); updateVersion(); }
  function schedule() { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; sync(); }); }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('hed21:auth', schedule); document.addEventListener('hed22:changed', schedule);
  schedule();
  window.HED27Account = { open: openCanonicalAccount, organizeInvites };
})();
