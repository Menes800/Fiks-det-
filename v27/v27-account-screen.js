(() => {
  'use strict';

  const H = window.HED21;
  if (!H) return;

  const esc = (value) => H.html(String(value ?? ''));
  const LOAD_TIMEOUT = 9000;
  let currentContext = null;
  let loadSequence = 0;
  let actionBusy = false;

  function withTimeout(promise, message, ms = LOAD_TIMEOUT) {
    let timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]).finally(() => clearTimeout(timer));
  }

  function memberName(member, userId) {
    return member?.profile?.display_name || (member?.userId === userId ? 'Deg' : 'Medlem');
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
  }

  function inviteStatus(invite) {
    if (invite?.revoked_at) return 'Tilbakekalt';
    if (invite?.accepted_at || Number(invite?.uses || 0) >= Number(invite?.max_uses || 1)) return 'Brukt';
    if (Date.parse(invite?.expires_at || '') <= Date.now()) return 'Utløpt';
    return 'Aktiv';
  }

  function ensureScreen() {
    let screen = document.querySelector('#v27-account-screen');
    if (screen) return screen;

    screen = document.createElement('section');
    screen.id = 'v27-account-screen';
    screen.className = 'v27a-screen';
    screen.hidden = true;
    screen.setAttribute('role', 'dialog');
    screen.setAttribute('aria-modal', 'false');
    screen.setAttribute('aria-labelledby', 'v27a-title');
    screen.innerHTML = `
      <div class="v27a-shell">
        <header class="v27a-header">
          <button type="button" class="v27a-back" data-v27a-close>Tilbake</button>
          <h2 id="v27a-title">Konto og hjem</h2>
          <span class="v27a-spacer"></span>
        </header>
        <div class="v27a-body" data-v27a-body></div>
      </div>`;
    document.body.append(screen);
    screen.addEventListener('click', handleClick);
    screen.addEventListener('submit', handleSubmit);
    screen.addEventListener('change', handleChange);
    return screen;
  }

  function bodyNode() {
    return ensureScreen().querySelector('[data-v27a-body]');
  }

  function setStatus(title, copy = '', error = false) {
    const body = bodyNode();
    let status = body.querySelector('[data-v27a-status]');
    if (!status) {
      status = document.createElement('div');
      status.dataset.v27aStatus = '1';
      body.prepend(status);
    }
    status.className = `v27a-status${error ? ' is-error' : ''}`;
    status.innerHTML = `<strong>${esc(title)}</strong>${copy ? `<span>${esc(copy)}</span>` : ''}`;
  }

  function clearStatus() {
    bodyNode().querySelector('[data-v27a-status]')?.remove();
  }

  function renderLoading() {
    bodyNode().innerHTML = '<div class="v27a-status" data-v27a-status><strong>Henter konto og hjem …</strong><span>Du kan alltid gå tilbake mens opplysningene lastes.</span></div>';
  }

  function renderFallback(error) {
    const user = H.user || H.session?.user || null;
    const homeName = globalThis.state?.data?.home?.name || 'Aktivt hjem';
    bodyNode().innerHTML = `
      <div class="v27a-status is-error" data-v27a-status>
        <strong>Klarte ikke å hente alle opplysningene</strong>
        <span>${esc(H.errorText(error, 'Prøv igjen om litt.'))}</span>
        <button type="button" class="v27a-secondary v27a-retry" data-v27a-retry>Prøv igjen</button>
      </div>
      <section class="v27a-card">
        <span class="v27a-overline">KONTO</span>
        <p class="v27a-muted">${esc(user?.email || 'Innloggingen er ikke tilgjengelig akkurat nå.')}</p>
      </section>
      <section class="v27a-card">
        <span class="v27a-overline">HJEM</span>
        <div class="v27a-row is-active"><span class="v27a-row-copy"><strong>${esc(homeName)}</strong><small>Aktivt hjem i appen</small></span><span>✓</span></div>
      </section>
      <section class="v27a-card"><button type="button" class="v27a-secondary" data-v27a-signout>Logg ut</button></section>`;
  }

  function renderContext(context, refreshing = false) {
    currentContext = context;
    const user = context?.user;
    if (!user) {
      bodyNode().innerHTML = `
        <div class="v27a-status"><strong>Ikke logget inn</strong><span>Logg inn for å administrere konto og hjem.</span></div>`;
      return;
    }

    const home = context.home || null;
    const isOwner = context.role === 'owner';
    const homes = (context.homes || []).map((entry) => `
      <div class="v27a-row ${entry.id === home?.id ? 'is-active' : ''}">
        <span class="v27a-row-copy"><strong>${esc(entry.name)}</strong><small>${esc(H.roleLabel(entry.role))}${entry.id === home?.id ? ' · aktivt' : ''}</small></span>
        ${entry.id === home?.id ? '<span>✓</span>' : `<button type="button" class="v27a-link" data-v27a-select-home="${esc(entry.id)}">Velg</button>`}
      </div>`).join('');

    const members = (context.members || []).map((member) => {
      const name = memberName(member, user.id);
      const self = member.userId === user.id;
      const controls = isOwner && member.role !== 'owner' ? `
        <select data-v27a-member-role="${esc(member.userId)}" aria-label="Rolle for ${esc(name)}">
          <option value="member" ${member.role === 'member' ? 'selected' : ''}>Medlem</option>
          <option value="viewer" ${member.role === 'viewer' ? 'selected' : ''}>Lesetilgang</option>
        </select>
        <button type="button" class="v27a-danger-link" data-v27a-remove-member="${esc(member.userId)}">Fjern</button>
        <button type="button" class="v27a-link" data-v27a-transfer-owner="${esc(member.userId)}">Gjør til eier</button>` : `<small>${esc(H.roleLabel(member.role))}</small>`;
      return `
        <div class="v27a-row">
          <span class="v27a-avatar">${esc(initials(name))}</span>
          <span class="v27a-row-copy"><strong>${esc(name)}${self ? ' · deg' : ''}</strong><small>${esc(H.roleLabel(member.role))}</small></span>
          <span class="v27a-member-actions">${controls}</span>
        </div>`;
    }).join('');

    const activeInvites = [];
    const oldInvites = [];
    (context.invitations || []).forEach((invite) => {
      const status = inviteStatus(invite);
      const row = `
        <div class="v27a-row" data-v27a-invite-row="${esc(invite.id)}">
          <span class="v27a-row-copy"><strong>${esc(invite.email || 'Invitasjonslenke')}</strong><small>${esc(H.roleLabel(invite.role))} · ${esc(status)} · utløper ${esc(new Date(invite.expires_at).toLocaleDateString('nb-NO'))}</small></span>
          ${status === 'Aktiv' ? `<span class="v27a-actions"><button type="button" class="v27a-link" data-v27a-share-invite="${esc(invite.code)}">Del</button><button type="button" class="v27a-danger-link" data-v27a-revoke-invite="${esc(invite.id)}">Tilbakekall</button></span>` : ''}
        </div>`;
      (status === 'Aktiv' ? activeInvites : oldInvites).push(row);
    });

    bodyNode().innerHTML = `
      ${refreshing ? '<div class="v27a-status" data-v27a-status><strong>Oppdaterer …</strong><span>Du kan bruke siden mens den oppdateres.</span></div>' : ''}
      <section class="v27a-card">
        <span class="v27a-overline">KONTO</span>
        <form class="v27a-form" data-v27a-profile-form>
          <label><span>Navn</span><input name="displayName" maxlength="80" value="${esc(context.profile?.display_name || '')}" required></label>
          <label><span>E-post</span><input value="${esc(user.email || '')}" disabled></label>
          <button type="submit" class="v27a-primary">Lagre profil</button>
        </form>
        <div class="v27a-buttons">
          <button type="button" class="v27a-secondary" data-v27a-reset-password>Send lenke for nytt passord</button>
          <button type="button" class="v27a-secondary" data-v27a-signout>Logg ut</button>
        </div>
      </section>

      <section class="v27a-card">
        <span class="v27a-overline">HJEM</span>
        <div class="v27a-list">${homes || '<p class="v27a-muted">Ingen hjem ennå.</p>'}</div>
        <form class="v27a-inline" data-v27a-create-home-form>
          <input name="homeName" maxlength="60" placeholder="Navn på nytt hjem" required>
          <button type="submit" class="v27a-primary">Opprett</button>
        </form>
      </section>

      ${home ? `<section class="v27a-card"><span class="v27a-overline">MEDLEMMER I ${esc(home.name).toUpperCase()}</span><div class="v27a-list">${members || '<p class="v27a-muted">Ingen medlemmer ble lastet.</p>'}</div></section>` : ''}

      ${isOwner ? `<section class="v27a-card">
        <span class="v27a-overline">INVITER</span>
        <form class="v27a-form" data-v27a-invite-form>
          <label><span>E-post <small>valgfritt</small></span><input name="email" type="email" placeholder="navn@eksempel.no"></label>
          <label><span>Tilgang</span><select name="role"><option value="member">Medlem – kan redigere</option><option value="viewer">Lesetilgang</option></select></label>
          <label><span>Gyldig i</span><select name="days"><option value="1">1 dag</option><option value="7" selected>7 dager</option><option value="14">14 dager</option><option value="30">30 dager</option></select></label>
          <button type="submit" class="v27a-primary">Send invitasjon</button>
        </form>
        <div class="v27a-list" style="margin-top:14px">${activeInvites.join('') || '<p class="v27a-muted">Ingen aktive invitasjoner.</p>'}</div>
        ${oldInvites.length ? `<details class="v27a-old"><summary>Tidligere invitasjoner (${oldInvites.length})</summary><div class="v27a-list">${oldInvites.join('')}</div></details>` : ''}
      </section>` : ''}

      <section class="v27a-card"><span class="v27a-overline">SIKKERHET</span><button type="button" class="v27a-danger" data-v27a-delete-account>Slett konto permanent</button></section>`;
  }

  async function loadContext(force = false) {
    const sequence = ++loadSequence;
    try {
      const promise = force ? H.refresh() : H.getContext(false);
      const context = await withTimeout(promise, 'Kontoopplysningene tok for lang tid å laste.');
      if (sequence !== loadSequence || ensureScreen().hidden) return;
      renderContext(context, false);
    } catch (error) {
      if (sequence !== loadSequence || ensureScreen().hidden) return;
      if (currentContext?.user) {
        renderContext(currentContext, false);
        setStatus('Viser sist innlastede opplysninger', H.errorText(error), true);
      } else {
        renderFallback(error);
      }
    }
  }

  function openScreen() {
    const screen = ensureScreen();
    screen.hidden = false;
    document.documentElement.classList.add('v27a-screen-open');
    document.body.classList.add('v27a-screen-open');
    if (H.context?.user) {
      renderContext(H.context, true);
      currentContext = H.context;
    } else {
      renderLoading();
    }
    loadContext(false);
    requestAnimationFrame(() => screen.querySelector('[data-v27a-close]')?.focus({ preventScroll: true }));
  }

  function closeScreen() {
    const screen = ensureScreen();
    screen.hidden = true;
    loadSequence += 1;
    document.documentElement.classList.remove('v27a-screen-open');
    document.body.classList.remove('v27a-screen-open');
  }

  async function runAction(button, action, successMessage, refresh = true) {
    if (actionBusy) return;
    actionBusy = true;
    const oldText = button?.textContent || '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Jobber …';
    }
    try {
      await withTimeout(action(), 'Handlingen tok for lang tid. Prøv igjen.');
      if (successMessage) H.toast?.(successMessage);
      if (refresh) {
        H.context = null;
        await loadContext(true);
      }
    } catch (error) {
      setStatus('Handlingen mislyktes', H.errorText(error), true);
    } finally {
      actionBusy = false;
      if (button?.isConnected) {
        button.disabled = false;
        button.textContent = oldText;
      }
    }
  }

  async function ask(title, message, options = {}) {
    if (typeof H.confirm === 'function') return H.confirm(title, message, options);
    return window.confirm(`${title}\n\n${message}`);
  }

  async function handleSubmit(event) {
    const form = event.target;
    if (!form.matches('[data-v27a-profile-form],[data-v27a-create-home-form],[data-v27a-invite-form]')) return;
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');

    if (form.matches('[data-v27a-profile-form]')) {
      const displayName = form.elements.displayName.value.trim();
      await runAction(button, async () => {
        const { error } = await H.client.from('profiles').upsert({ id: currentContext.user.id, display_name: displayName, updated_at: new Date().toISOString() });
        if (error) throw error;
      }, 'Profilen er oppdatert');
      return;
    }

    if (form.matches('[data-v27a-create-home-form]')) {
      const homeName = form.elements.homeName.value.trim();
      await runAction(button, async () => {
        const { data, error } = await H.client.rpc('create_home', { p_name: homeName });
        if (error) throw error;
        localStorage.setItem(H.activeHomeKey, data);
      }, 'Hjemmet er opprettet');
      return;
    }

    const email = form.elements.email.value.trim();
    await runAction(button, async () => {
      if (!currentContext?.home) throw new Error('Velg et hjem først');
      const { data, error } = await H.client.rpc('create_invitation', {
        p_home_id: currentContext.home.id,
        p_email: email || null,
        p_role: form.elements.role.value,
        p_expires_days: Number(form.elements.days.value),
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
            data: { invitation_code: invite.code, home_name: currentContext.home.name },
          },
        });
        if (mailError) throw mailError;
      } else {
        await H.share({ title: 'Invitasjon til Hvor er den?', text: `Bli med i ${currentContext.home.name} i «Hvor er den?»`, url });
      }
    }, email ? `Invitasjon sendt til ${email}` : 'Invitasjonslenken er klar');
  }

  async function handleChange(event) {
    const select = event.target.closest('[data-v27a-member-role]');
    if (!select || actionBusy) return;
    const previous = select.dataset.previous || (select.value === 'member' ? 'viewer' : 'member');
    select.dataset.previous = select.value;
    await runAction(select, async () => {
      const { error } = await H.client.rpc('update_home_member_role', {
        p_home_id: currentContext.home.id,
        p_user_id: select.dataset.v27aMemberRole,
        p_role: select.value,
      });
      if (error) throw error;
    }, 'Rollen er oppdatert');
    if (!select.isConnected) return;
    select.dataset.previous = previous;
  }

  async function handleClick(event) {
    const target = event.target.closest('button');
    if (!target) return;

    if (target.matches('[data-v27a-close]')) {
      closeScreen();
      return;
    }
    if (target.matches('[data-v27a-retry]')) {
      renderLoading();
      H.context = null;
      loadContext(true);
      return;
    }
    if (target.matches('[data-v27a-select-home]')) {
      localStorage.setItem(H.activeHomeKey, target.dataset.v27aSelectHome);
      const home = currentContext?.homes?.find((entry) => entry.id === target.dataset.v27aSelectHome);
      if (home && globalThis.state?.data?.home) {
        state.data.home.id = home.id;
        state.data.home.name = home.name;
        if (typeof saveData === 'function') saveData();
      }
      location.reload();
      return;
    }
    if (target.matches('[data-v27a-share-invite]')) {
      await runAction(target, () => H.share({
        title: 'Invitasjon til Hvor er den?',
        text: `Bli med i ${currentContext.home.name} i «Hvor er den?»`,
        url: H.inviteUrl(target.dataset.v27aShareInvite),
      }), '', false);
      return;
    }
    if (target.matches('[data-v27a-revoke-invite]')) {
      const ok = await ask('Tilbakekalle invitasjonen?', 'Lenken slutter å virke med en gang.', { danger: true, confirmText: 'Tilbakekall' });
      if (!ok) return;
      await runAction(target, async () => {
        const { error } = await H.client.rpc('revoke_invitation', { p_invitation_id: target.dataset.v27aRevokeInvite });
        if (error) throw error;
      }, 'Invitasjonen er tilbakekalt');
      return;
    }
    if (target.matches('[data-v27a-reset-password]')) {
      await runAction(target, async () => {
        const { error } = await H.client.auth.resetPasswordForEmail(currentContext.user.email, { redirectTo: location.origin + location.pathname });
        if (error) throw error;
      }, 'Lenke for nytt passord er sendt', false);
      return;
    }
    if (target.matches('[data-v27a-signout]')) {
      await runAction(target, async () => {
        await H.client.auth.signOut();
        location.reload();
      }, '', false);
      return;
    }
    if (target.matches('[data-v27a-remove-member]')) {
      const ok = await ask('Fjerne medlemmet?', 'Personen mister tilgangen til hjemmet.', { danger: true, confirmText: 'Fjern' });
      if (!ok) return;
      await runAction(target, async () => {
        const { error } = await H.client.rpc('remove_home_member', { p_home_id: currentContext.home.id, p_user_id: target.dataset.v27aRemoveMember });
        if (error) throw error;
      }, 'Medlemmet er fjernet');
      return;
    }
    if (target.matches('[data-v27a-transfer-owner]')) {
      const ok = await ask('Overføre eierskapet?', 'Du blir vanlig medlem etter overføringen.', { danger: true, confirmText: 'Overfør' });
      if (!ok) return;
      await runAction(target, async () => {
        const { error } = await H.client.rpc('transfer_home_ownership', { p_home_id: currentContext.home.id, p_new_owner_id: target.dataset.v27aTransferOwner });
        if (error) throw error;
      }, 'Eierskapet er overført');
      return;
    }
    if (target.matches('[data-v27a-delete-account]')) {
      const ok = await ask('Slette kontoen permanent?', 'Kontoen og tilgangen din kan ikke gjenopprettes.', { danger: true, confirmText: 'Slett konto' });
      if (!ok) return;
      await runAction(target, async () => {
        const { error } = await H.client.functions.invoke('delete-account', { body: { confirm: true } });
        if (error) throw error;
        localStorage.clear();
        location.reload();
      }, '', false);
    }
  }

  window.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('#account-info,[data-open-manager="home"]');
    if (!trigger || event.target.closest?.('#v27-account-screen')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openScreen();
  }, true);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !ensureScreen().hidden) closeScreen();
  });

  window.openAccountSheet = openScreen;
})();