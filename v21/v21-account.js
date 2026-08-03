(() => {
  'use strict';
  const H = window.HED21;
  if (!H) return;

  function ensureDialog() {
    let dialog = document.querySelector('#v21-account-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'v21-account-dialog';
    dialog.className = 'v21-dialog';
    dialog.innerHTML = `
      <div class="v21-dialog__panel">
        <header class="v21-dialog__header">
          <button type="button" class="v21-back" data-v21-close>Tilbake</button>
          <h2>Konto og hjem</h2>
          <span></span>
        </header>
        <div class="v21-dialog__body" data-v21-account-body></div>
      </div>`;
    document.body.append(dialog);
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog || event.target.closest('[data-v21-close]')) dialog.close();
    });
    dialog.addEventListener('submit', handleSubmit);
    dialog.addEventListener('click', handleClick);
    dialog.addEventListener('change', handleChange);
    return dialog;
  }

  function memberName(member) {
    return member.profile?.display_name || (member.userId === H.user?.id ? 'Deg' : 'Medlem');
  }
  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
  }
  function inviteStatus(invite) {
    if (invite.revoked_at) return 'Tilbakekalt';
    if (invite.accepted_at || invite.uses >= invite.max_uses) return 'Brukt';
    if (Date.parse(invite.expires_at) <= Date.now()) return 'Utløpt';
    return 'Aktiv';
  }
  function activeInvite(invite) { return inviteStatus(invite) === 'Aktiv'; }

  async function openAccount() {
    const dialog = ensureDialog();
    const body = dialog.querySelector('[data-v21-account-body]');
    body.innerHTML = '<div class="v21-loading">Laster konto og hjem …</div>';
    if (!dialog.open) dialog.showModal();
    try {
      const context = await H.refresh();
      if (!context.user) {
        body.innerHTML = '<div class="v21-empty"><strong>Ikke logget inn</strong><p>Logg inn for å administrere konto og hjem.</p></div>';
        return;
      }
      body.innerHTML = render(context);
    } catch (error) {
      body.innerHTML = `<div class="v21-error">${H.html(H.errorText(error))}</div>`;
    }
  }

  function render(context) {
    const isOwner = context.role === 'owner';
    const members = context.members.map((member) => {
      const name = memberName(member);
      const self = member.userId === context.user.id;
      const controls = isOwner && member.role !== 'owner' ? `
        <select data-v21-member-role="${H.html(member.userId)}" aria-label="Rolle for ${H.html(name)}">
          <option value="member" ${member.role === 'member' ? 'selected' : ''}>Medlem</option>
          <option value="viewer" ${member.role === 'viewer' ? 'selected' : ''}>Lesetilgang</option>
        </select>
        <button type="button" class="v21-text-danger" data-v21-remove-member="${H.html(member.userId)}">Fjern</button>
        <button type="button" class="v21-text" data-v21-transfer-owner="${H.html(member.userId)}">Gjør til eier</button>` : `<span class="v21-role">${H.roleLabel(member.role)}</span>`;
      return `<div class="v21-member-row">
        <span class="v21-avatar">${H.html(initials(name))}</span>
        <span class="v21-member-copy"><strong>${H.html(name)}${self ? ' · deg' : ''}</strong><small>${H.roleLabel(member.role)}</small></span>
        <span class="v21-member-actions">${controls}</span>
      </div>`;
    }).join('');

    const homes = context.homes.map((home) => `<div class="v21-home-row ${home.id === context.home?.id ? 'is-active' : ''}">
      <span><strong>${H.html(home.name)}</strong><small>${H.roleLabel(home.role)}${home.id === context.home?.id ? ' · aktivt' : ''}</small></span>
      ${home.id !== context.home?.id ? `<button type="button" class="v21-text" data-v21-select-home="${home.id}">Velg</button>` : '<span>✓</span>'}
    </div>`).join('');

    const invitations = isOwner ? context.invitations.map((invite) => {
      const status = inviteStatus(invite);
      return `<div class="v21-invite-row">
        <span><strong>${H.html(invite.email || 'Invitasjonslenke')}</strong><small>${H.roleLabel(invite.role)} · ${status} · utløper ${new Date(invite.expires_at).toLocaleDateString('nb-NO')}</small></span>
        <span class="v21-inline-actions">
          ${activeInvite(invite) ? `<button type="button" class="v21-text" data-v21-share-invite="${invite.code}">Del</button><button type="button" class="v21-text-danger" data-v21-revoke-invite="${invite.id}">Tilbakekall</button>` : ''}
        </span>
      </div>`;
    }).join('') : '';

    return `
      <section class="v21-card">
        <span class="v21-overline">KONTO</span>
        <form data-v21-profile-form class="v21-form">
          <label><span>Navn</span><input name="displayName" maxlength="80" value="${H.html(context.profile?.display_name || '')}" required></label>
          <label><span>E-post</span><input value="${H.html(context.user.email || '')}" disabled></label>
          <button class="v21-primary" type="submit">Lagre profil</button>
        </form>
        <div class="v21-button-grid">
          <button type="button" class="v21-secondary" data-v21-reset-password>Send lenke for nytt passord</button>
          <button type="button" class="v21-secondary" data-v21-signout>Logg ut</button>
        </div>
      </section>

      <section class="v21-card">
        <span class="v21-overline">HJEM</span>
        <div class="v21-list">${homes || '<p>Ingen hjem.</p>'}</div>
        <form data-v21-create-home-form class="v21-inline-form">
          <input name="homeName" maxlength="60" placeholder="Navn på nytt hjem" required>
          <button class="v21-primary" type="submit">Opprett</button>
        </form>
      </section>

      ${context.home ? `<section class="v21-card">
        <span class="v21-overline">MEDLEMMER I ${H.html(context.home.name).toUpperCase()}</span>
        <div class="v21-list">${members}</div>
      </section>` : ''}

      ${isOwner ? `<section class="v21-card">
        <span class="v21-overline">INVITER</span>
        <form data-v21-invite-form class="v21-form">
          <label><span>E-post <small>valgfritt</small></span><input name="email" type="email" placeholder="navn@eksempel.no"></label>
          <label><span>Tilgang</span><select name="role"><option value="member">Medlem – kan redigere</option><option value="viewer">Lesetilgang</option></select></label>
          <label><span>Gyldig i</span><select name="days"><option value="1">1 dag</option><option value="7" selected>7 dager</option><option value="14">14 dager</option><option value="30">30 dager</option></select></label>
          <button class="v21-primary" type="submit">Opprett og del invitasjon</button>
        </form>
        <div class="v21-list v21-invites">${invitations || '<p class="v21-muted">Ingen invitasjoner ennå.</p>'}</div>
      </section>` : ''}

      <section class="v21-card v21-danger-zone">
        <span class="v21-overline">SIKKERHET</span>
        <button type="button" class="v21-danger" data-v21-delete-account>Slett konto permanent</button>
      </section>`;
  }

  async function handleSubmit(event) {
    const form = event.target;
    if (!form.matches('[data-v21-profile-form],[data-v21-create-home-form],[data-v21-invite-form]')) return;
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const context = await H.getContext();
      if (form.matches('[data-v21-profile-form]')) {
        const displayName = form.displayName.value.trim();
        const { error } = await H.client.from('profiles').update({ display_name: displayName }).eq('id', H.user.id);
        if (error) throw error;
        H.toast('Profilen er oppdatert');
      } else if (form.matches('[data-v21-create-home-form]')) {
        const { data, error } = await H.client.rpc('create_home', { p_name: form.homeName.value.trim() });
        if (error) throw error;
        localStorage.setItem(H.activeHomeKey, data);
        H.toast('Hjemmet er opprettet');
      } else {
        if (!context.home) throw new Error('Velg et hjem først');
        const { data, error } = await H.client.rpc('create_invitation', {
          p_home_id: context.home.id,
          p_email: form.email.value.trim() || null,
          p_role: form.role.value,
          p_expires_days: Number(form.days.value),
        });
        if (error) throw error;
        const invite = Array.isArray(data) ? data[0] : data;
        const url = H.inviteUrl(invite.code);
        await H.share({ title: 'Invitasjon til Hvor er den?', text: `Bli med i ${context.home.name} i «Hvor er den?»`, url });
      }
      await openAccount();
    } catch (error) {
      H.alert('Kunne ikke lagre', H.errorText(error));
    } finally { button.disabled = false; }
  }

  async function handleChange(event) {
    const select = event.target.closest('[data-v21-member-role]');
    if (!select) return;
    try {
      const context = await H.getContext();
      const { error } = await H.client.rpc('update_home_member_role', {
        p_home_id: context.home.id,
        p_user_id: select.dataset.v21MemberRole,
        p_role: select.value,
      });
      if (error) throw error;
      H.toast('Rollen er oppdatert');
      await openAccount();
    } catch (error) { H.alert('Kunne ikke endre rolle', H.errorText(error)); }
  }

  async function handleClick(event) {
    const target = event.target.closest('button');
    if (!target) return;
    try {
      const context = await H.getContext();
      if (target.matches('[data-v21-reset-password]')) {
        const { error } = await H.client.auth.resetPasswordForEmail(context.user.email, { redirectTo: location.origin + location.pathname });
        if (error) throw error;
        H.toast('Lenke for nytt passord er sendt');
      }
      if (target.matches('[data-v21-signout]')) {
        await H.client.auth.signOut(); location.reload();
      }
      if (target.matches('[data-v21-select-home]')) {
        localStorage.setItem(H.activeHomeKey, target.dataset.v21SelectHome);
        const home = context.homes.find((entry) => entry.id === target.dataset.v21SelectHome);
        if (home && globalThis.state?.data?.home) { state.data.home.id = home.id; state.data.home.name = home.name; saveData?.(); }
        location.reload();
      }
      if (target.matches('[data-v21-share-invite]')) {
        await H.share({ title: 'Invitasjon til Hvor er den?', text: `Bli med i ${context.home.name} i «Hvor er den?»`, url: H.inviteUrl(target.dataset.v21ShareInvite) });
      }
      if (target.matches('[data-v21-revoke-invite]')) {
        if (!confirm('Tilbakekalle invitasjonen?')) return;
        const { error } = await H.client.rpc('revoke_invitation', { p_invitation_id: target.dataset.v21RevokeInvite });
        if (error) throw error;
        H.toast('Invitasjonen er tilbakekalt'); await openAccount();
      }
      if (target.matches('[data-v21-remove-member]')) {
        if (!confirm('Fjerne medlemmet fra hjemmet?')) return;
        const { error } = await H.client.rpc('remove_home_member', { p_home_id: context.home.id, p_user_id: target.dataset.v21RemoveMember });
        if (error) throw error;
        H.toast('Medlemmet er fjernet'); await openAccount();
      }
      if (target.matches('[data-v21-transfer-owner]')) {
        if (!confirm('Overføre eierskapet? Du blir vanlig medlem etterpå.')) return;
        const { error } = await H.client.rpc('transfer_home_ownership', { p_home_id: context.home.id, p_new_owner_id: target.dataset.v21TransferOwner });
        if (error) throw error;
        H.toast('Eierskapet er overført'); await openAccount();
      }
      if (target.matches('[data-v21-delete-account]')) {
        if (!confirm('Slette kontoen permanent? Dette kan ikke angres.')) return;
        const { error } = await H.client.functions.invoke('delete-account', { body: { confirm: true } });
        if (error) throw error;
        localStorage.clear(); location.reload();
      }
    } catch (error) { H.alert('Handlingen mislyktes', H.errorText(error)); }
  }

  document.addEventListener('click', (event) => {
    const account = event.target.closest('#account-info');
    const homeManager = event.target.closest('[data-open-manager="home"]');
    if (!account && !homeManager) return;
    event.preventDefault(); event.stopImmediatePropagation();
    openAccount();
  }, true);
  window.openAccountSheet = openAccount;
})();
