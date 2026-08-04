(() => {
  'use strict';

  const H = window.HED21;
  const V = window.HED22;
  if (!H || !V) return;

  H.version = '2.5.0';
  if (window.HED23) window.HED23.version = '2.5.0';

  let actionBusy = false;
  let scheduled = false;

  const esc = (value) => H.html(String(value ?? ''));

  function ensureActionDialog() {
    let dialog = document.querySelector('#v25-action-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'v25-action-dialog';
    dialog.className = 'v25-action-dialog';
    dialog.innerHTML = '<form method="dialog" class="v25-action-card" data-v25-action-form></form>';
    document.body.append(dialog);
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.querySelector('[value="cancel"]')?.click();
    });
    return dialog;
  }

  function actionDialog(options = {}) {
    const dialog = ensureActionDialog();
    const form = dialog.querySelector('[data-v25-action-form]');
    const input = options.input ? `
      <label class="v25-dialog-field">
        <span>${esc(options.inputLabel || 'Tekst')}</span>
        <input name="value" maxlength="${Number(options.maxLength || 120)}" value="${esc(options.inputValue || '')}" autocomplete="off">
      </label>` : '';
    form.innerHTML = `
      <div class="v25-dialog-icon ${options.danger ? 'is-danger' : ''}">${options.icon || (options.danger ? '!' : '✓')}</div>
      <h2>${esc(options.title || 'Bekreft')}</h2>
      ${options.message ? `<p>${esc(options.message)}</p>` : ''}
      ${input}
      <div class="v25-dialog-actions">
        <button type="submit" value="cancel" class="v25-dialog-cancel">${esc(options.cancelText || 'Avbryt')}</button>
        <button type="submit" value="confirm" class="v25-dialog-confirm ${options.danger ? 'is-danger' : ''}">${esc(options.confirmText || 'Bekreft')}</button>
      </div>`;

    return new Promise((resolve) => {
      const finish = () => {
        const result = dialog.returnValue === 'confirm'
          ? (options.input ? form.elements.value.value.trim() : true)
          : (options.input ? null : false);
        dialog.removeEventListener('close', finish);
        resolve(result);
      };
      dialog.addEventListener('close', finish);
      dialog.showModal();
      if (options.input) {
        requestAnimationFrame(() => {
          const field = form.elements.value;
          field.focus();
          field.select();
        });
      }
    });
  }

  H.confirm = (title, message, options = {}) => actionDialog({ title, message, ...options });
  H.prompt = (title, message, value = '', options = {}) => actionDialog({
    title,
    message,
    input: true,
    inputValue: value,
    confirmText: options.confirmText || 'Lagre',
    ...options,
  });

  async function runAction(action, successMessage = '') {
    if (actionBusy) return;
    actionBusy = true;
    document.documentElement.classList.add('v25-busy');
    try {
      await action();
      if (successMessage) H.toast?.(successMessage);
      document.dispatchEvent(new CustomEvent('hed22:changed'));
    } catch (error) {
      H.alert?.('Handlingen mislyktes', H.errorText(error));
    } finally {
      actionBusy = false;
      document.documentElement.classList.remove('v25-busy');
    }
  }

  function selectedList() {
    return V.getList?.(V.state?.selectedListId);
  }

  async function interceptListActions(event) {
    const editItem = event.target.closest('[data-v22-edit-item]');
    if (editItem) {
      event.preventDefault(); event.stopImmediatePropagation();
      const list = selectedList();
      const item = list?.items?.find((entry) => entry.id === editItem.dataset.v22EditItem);
      if (!list || !item) return;
      const next = await H.prompt('Endre punkt', 'Oppdater teksten i listen.', item.title, { inputLabel: 'Punkt' });
      if (next && next !== item.title) await runAction(() => V.updateItem(list.id, item.id, { title: next }), 'Punktet er oppdatert');
      return;
    }

    const deleteItem = event.target.closest('[data-v22-delete-item]');
    if (deleteItem) {
      event.preventDefault(); event.stopImmediatePropagation();
      const list = selectedList();
      const item = list?.items?.find((entry) => entry.id === deleteItem.dataset.v22DeleteItem);
      if (!list || !item) return;
      const ok = await H.confirm('Slette punkt?', `«${item.title}» fjernes fra listen.`, { danger: true, confirmText: 'Slett' });
      if (ok) await runAction(() => V.deleteItem(list.id, item.id), 'Punktet er slettet');
      return;
    }

    const reset = event.target.closest('[data-v22-reset-list]');
    if (reset) {
      event.preventDefault(); event.stopImmediatePropagation();
      const list = V.getList?.(reset.dataset.v22ResetList);
      const ok = await H.confirm('Nullstille avhuking?', `Alle punktene i «${list?.name || 'listen'}» markeres som ikke ferdige.`, { confirmText: 'Nullstill' });
      if (ok) await runAction(() => V.resetPacking(reset.dataset.v22ResetList), 'Listen er nullstilt');
      return;
    }

    const deleteList = event.target.closest('[data-v22-delete-list]');
    if (deleteList) {
      event.preventDefault(); event.stopImmediatePropagation();
      const list = V.getList?.(deleteList.dataset.v22DeleteList);
      if (!list) return;
      const ok = await H.confirm('Slette hele listen?', `«${list.name}» og alle punktene slettes permanent.`, { danger: true, confirmText: 'Slett liste' });
      if (!ok) return;
      await runAction(async () => {
        await V.deleteList(list.id);
        const dialog = document.querySelector('#v22-list-dialog');
        if (dialog?.open) dialog.close();
      }, 'Listen er slettet');
    }
  }

  async function interceptAccountActions(event) {
    const button = event.target.closest('[data-v21-revoke-invite],[data-v21-remove-member],[data-v21-transfer-owner],[data-v21-delete-account]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const context = await H.getContext();

    if (button.matches('[data-v21-revoke-invite]')) {
      const ok = await H.confirm('Tilbakekalle invitasjonen?', 'Lenken slutter å virke med en gang.', { danger: true, confirmText: 'Tilbakekall' });
      if (!ok) return;
      await runAction(async () => {
        const { error } = await H.client.rpc('revoke_invitation', { p_invitation_id: button.dataset.v21RevokeInvite });
        if (error) throw error;
        await window.openAccountSheet?.();
      }, 'Invitasjonen er tilbakekalt');
      return;
    }

    if (button.matches('[data-v21-remove-member]')) {
      const ok = await H.confirm('Fjerne medlemmet?', 'Personen mister tilgangen til hjemmet.', { danger: true, confirmText: 'Fjern' });
      if (!ok) return;
      await runAction(async () => {
        const { error } = await H.client.rpc('remove_home_member', { p_home_id: context.home.id, p_user_id: button.dataset.v21RemoveMember });
        if (error) throw error;
        await window.openAccountSheet?.();
      }, 'Medlemmet er fjernet');
      return;
    }

    if (button.matches('[data-v21-transfer-owner]')) {
      const ok = await H.confirm('Overføre eierskapet?', 'Du blir vanlig medlem etter overføringen.', { danger: true, confirmText: 'Overfør' });
      if (!ok) return;
      await runAction(async () => {
        const { error } = await H.client.rpc('transfer_home_ownership', { p_home_id: context.home.id, p_new_owner_id: button.dataset.v21TransferOwner });
        if (error) throw error;
        await window.openAccountSheet?.();
      }, 'Eierskapet er overført');
      return;
    }

    if (button.matches('[data-v21-delete-account]')) {
      const ok = await H.confirm('Slette kontoen permanent?', 'Kontoen og tilgangen din kan ikke gjenopprettes.', { danger: true, confirmText: 'Slett konto' });
      if (!ok) return;
      await runAction(async () => {
        const { error } = await H.client.functions.invoke('delete-account', { body: { confirm: true } });
        if (error) throw error;
        localStorage.clear();
        location.reload();
      });
    }
  }

  async function submitInvite(event) {
    const form = event.target.closest('[data-v21-invite-form]');
    if (!form) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const button = form.querySelector('button[type="submit"]');
    const email = form.email.value.trim();
    button.disabled = true;
    button.textContent = email ? 'Sender…' : 'Lager lenke…';
    try {
      const context = await H.getContext();
      if (!context.home) throw new Error('Velg et hjem først');
      const { data, error } = await H.client.rpc('create_invitation', {
        p_home_id: context.home.id,
        p_email: email || null,
        p_role: form.role.value,
        p_expires_days: Number(form.days.value),
      });
      if (error) throw error;
      const invite = Array.isArray(data) ? data[0] : data;
      const url = H.inviteUrl(invite.code);

      if (email) {
        const { error: mailError } = await H.client.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: url,
            shouldCreateUser: true,
            data: { invitation_code: invite.code, home_name: context.home.name },
          },
        });
        if (mailError) throw mailError;
        H.toast?.(`Invitasjon sendt til ${email}`);
      } else {
        await H.share({ title: 'Invitasjon til Hvor er den?', text: `Bli med i ${context.home.name} i «Hvor er den?»`, url });
        H.toast?.('Invitasjonslenken er klar');
      }
      await window.openAccountSheet?.();
    } catch (error) {
      H.alert?.('Kunne ikke sende invitasjonen', H.errorText(error));
    } finally {
      button.disabled = false;
      button.textContent = form.email.value.trim() ? 'Send invitasjon' : 'Lag delbar lenke';
    }
  }

  function decorateHome() {
    const home = document.querySelector('[data-screen="home"]');
    if (!home) return;
    home.classList.add('v25-home');

    const searchCopy = home.querySelector('.search-launcher span');
    if (searchCopy && searchCopy.textContent !== 'Søk etter ting eller plassering') searchCopy.textContent = 'Søk etter ting eller plassering';

    home.querySelector('.home-header .round-button[data-open-add]')?.setAttribute('hidden', '');
    home.querySelector('.v24-quick-actions')?.setAttribute('hidden', '');

    const summary = home.querySelector('.hero-summary');
    if (summary && summary.dataset.v25Summary !== '1') {
      const itemValue = summary.querySelector('#home-item-total')?.textContent || '0';
      const locationValue = summary.querySelector('#home-container-total')?.textContent || '0';
      summary.dataset.v25Summary = '1';
      summary.innerHTML = `
        <button type="button" data-nav="search"><strong id="home-item-total">${esc(itemValue)}</strong><span>ting</span></button>
        <i>·</i>
        <button type="button" data-nav="rooms"><strong id="home-container-total">${esc(locationValue)}</strong><span>plasseringer</span></button>`;
    }

    const roomTitle = [...home.querySelectorAll('.section-title-row h2')].find((node) => node.textContent.trim() === 'Rom');
    if (roomTitle) roomTitle.textContent = 'Rom og plasseringer';

    const activity = [...home.querySelectorAll(':scope > .content-block')].find((section) => ['Aktivitet', 'Siste aktivitet'].includes(section.querySelector('h2')?.textContent.trim()));
    if (activity) activity.hidden = true;

    home.querySelectorAll('.section-title-row .link-button').forEach((button) => {
      if (button.textContent.trim() === 'Se alt') button.textContent = 'Se alle';
    });
  }

  function decorateInvite() {
    const form = document.querySelector('[data-v21-invite-form]');
    if (!form) return;
    const email = form.querySelector('input[name="email"]');
    const button = form.querySelector('button[type="submit"]');
    const label = email?.closest('label');
    if (label) {
      let note = label.querySelector('.v24-invite-note, .v25-invite-note');
      if (!note) {
        note = document.createElement('small');
        label.append(note);
      }
      note.className = 'v25-invite-note';
      const inviteCopy = 'Med e-post sender appen en sikker innloggingslenke. Uten e-post får du en delbar lenke.';
      if (note.textContent !== inviteCopy) note.textContent = inviteCopy;
    }
    if (button && !button.disabled) {
      const nextCopy = email?.value.trim() ? 'Send invitasjon' : 'Lag delbar lenke';
      if (button.textContent !== nextCopy) button.textContent = nextCopy;
    }
  }

  function compactWizard() {
    const questions = document.querySelector('#v24-wizard .v24-questions');
    if (!questions || questions.dataset.v25Compact === '1') return;
    questions.dataset.v25Compact = '1';

    const groups = [...questions.querySelectorAll(':scope > .v23-choice-group')];
    const byLegend = (text) => groups.find((group) => group.querySelector('legend')?.textContent.trim() === text);
    const activities = byLegend('Hva skal med?');
    if (activities) activities.querySelector('legend').textContent = 'Aktiviteter';

    const advancedGroups = ['Hvordan reiser du?', 'Bagasje', 'Hvor mye vil du pakke?', 'Kan klær vaskes underveis?']
      .map(byLegend)
      .filter(Boolean);
    const preview = questions.querySelector('[data-v24-preview]');
    if (advancedGroups.length && preview) {
      const details = document.createElement('details');
      details.className = 'v25-wizard-more';
      details.innerHTML = '<summary><span><strong>Tilpass mer</strong><small>Transport, bagasje, pakkemengde og vask</small></span><b>+</b></summary><div class="v25-wizard-more-body"></div>';
      const body = details.querySelector('.v25-wizard-more-body');
      advancedGroups.forEach((group) => body.append(group));
      preview.before(details);
    }

    if (activities && preview) preview.before(activities);
  }

  function updateVersion() {
    const meta = document.querySelector('#about-button .settings-meta');
    if (meta && meta.textContent !== 'v2.5') meta.textContent = 'v2.5';
  }

  function sync() {
    decorateHome();
    decorateInvite();
    compactWizard();
    updateVersion();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      sync();
    });
  }

  window.addEventListener('click', async (event) => {
    await interceptListActions(event);
    if (event.cancelBubble) return;
    await interceptAccountActions(event);
  }, true);
  window.addEventListener('submit', submitInvite, true);
  window.addEventListener('input', (event) => {
    if (event.target.matches('[data-v21-invite-form] input[name="email"]')) decorateInvite();
  }, true);

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('hed22:changed', schedule);
  V.ready.then(schedule).catch(schedule);
  schedule();
})();
