(() => {
  'use strict';
  const H = window.HED21;
  if (!H) return;
  let handling = false;

  function inviteCode() { return new URLSearchParams(location.search).get('invite') || ''; }
  function clearInvite() {
    const url = new URL(location.href);
    url.searchParams.delete('invite');
    history.replaceState({}, '', url);
  }
  function ensurePrompt() {
    let dialog = document.querySelector('#v21-invite-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'v21-invite-dialog';
    dialog.className = 'v21-dialog v21-invite-dialog';
    dialog.innerHTML = '<div class="v21-dialog__panel"><div class="v21-dialog__body" data-v21-invite-body></div></div>';
    document.body.append(dialog);
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog || event.target.closest('[data-v21-decline-invite]')) {
        clearInvite(); dialog.close();
      }
      if (event.target.closest('[data-v21-accept-invite]')) acceptInvite();
    });
    return dialog;
  }

  async function showInvite() {
    const code = inviteCode();
    if (!code || handling) return;
    handling = true;
    try {
      await H.ready;
      if (!H.client) return;
      const { data: sessionData } = await H.client.auth.getSession();
      const { data, error } = await H.client.rpc('invitation_preview', { p_code: code });
      if (error) throw error;
      const preview = Array.isArray(data) ? data[0] : data;
      if (!preview) throw new Error('Invitasjonen er ugyldig, brukt eller utløpt');
      const dialog = ensurePrompt();
      dialog.querySelector('[data-v21-invite-body]').innerHTML = `
        <div class="v21-invite-hero">🏠</div>
        <span class="v21-overline">INVITASJON</span>
        <h2>${H.html(preview.inviter_name)} har invitert deg</h2>
        <p>Du er invitert til <strong>${H.html(preview.home_name)}</strong> med ${H.roleLabel(preview.role).toLowerCase()}.</p>
        <small>Gyldig til ${new Date(preview.expires_at).toLocaleDateString('nb-NO')}</small>
        ${sessionData.session ? '<button class="v21-primary" type="button" data-v21-accept-invite>Godta invitasjonen</button>' : '<p class="v21-note">Logg inn eller opprett konto først. Invitasjonen blir liggende klar.</p>'}
        <button class="v21-secondary" type="button" data-v21-decline-invite>Ikke nå</button>`;
      if (!dialog.open) dialog.showModal();
    } catch (error) {
      H.alert('Invitasjonen kan ikke brukes', H.errorText(error));
      clearInvite();
    } finally { handling = false; }
  }

  async function acceptInvite() {
    const code = inviteCode();
    if (!code) return;
    const button = document.querySelector('[data-v21-accept-invite]');
    if (button) button.disabled = true;
    try {
      const { data, error } = await H.client.rpc('accept_invitation', { p_code: code });
      if (error) throw error;
      localStorage.setItem(H.activeHomeKey, data);
      clearInvite();
      H.toast('Du er nå med i hjemmet');
      location.reload();
    } catch (error) {
      H.alert('Kunne ikke godta invitasjonen', H.errorText(error));
      if (button) button.disabled = false;
    }
  }

  H.ready.then(showInvite);
  document.addEventListener('hed21:auth', () => setTimeout(showInvite, 150));
})();
