(() => {
  'use strict';

  const H = window.HED21;
  const V = window.HED22;
  if (!H || !V) return;

  H.version = V.version;
  const originalErrorText = H.errorText;
  H.errorText = (error, fallback) => {
    const message = String(error?.message || error?.error_description || '');
    if (message.includes('Gratisplanen støtter opptil 5 medlemmer')) return 'Gratisplanen støtter opptil 5 medlemmer per hjem';
    return originalErrorText(error, fallback);
  };

  function ensurePlanRow() {
    if (document.querySelector('#v22-plan-info')) return;
    const account = document.querySelector('#account-info');
    const group = account?.closest('.settings-group');
    if (!account || !group) return;
    const button = document.createElement('button');
    button.id = 'v22-plan-info';
    button.className = 'settings-row';
    button.type = 'button';
    button.innerHTML = '<span class="settings-icon settings-icon--purple">✨</span><span>Abonnement</span><span class="settings-meta">Gratis · 5 medlemmer</span><svg class="chevron"><use href="#i-chevron" /></svg>';
    group.insertBefore(button, account);
  }

  async function decorateAccount() {
    const body = document.querySelector('[data-v21-account-body]');
    if (!body || body.querySelector('[data-v22-plan-card]') || !body.querySelector('.v21-card')) return;
    const context = await H.getContext().catch(() => null);
    if (!context?.user || !context.home) return;
    const activeInvites = (context.invitations || []).filter((invite) => !invite.revoked_at && !invite.accepted_at && Date.parse(invite.expires_at) > Date.now()).length;
    const used = context.members.length;
    const reserved = Math.min(V.memberLimit, used + activeInvites);
    const card = document.createElement('section');
    card.className = 'v21-card';
    card.dataset.v22PlanCard = '';
    card.innerHTML = `<span class="v21-overline">GRATISPLAN</span><div class="v22-plan-row"><span><strong>${used} av ${V.memberLimit} medlemmer</strong><small>${activeInvites ? `${activeInvites} aktiv${activeInvites === 1 ? '' : 'e'} invitasjon${activeInvites === 1 ? '' : 'er'}` : 'Ingen aktive invitasjoner'}</small></span><span>${reserved}/${V.memberLimit}</span></div>`;
    const firstCard = body.querySelector('.v21-card');
    firstCard.insertAdjacentElement('afterend', card);

    const inviteForm = body.querySelector('[data-v21-invite-form]');
    if (inviteForm && reserved >= V.memberLimit) {
      const submit = inviteForm.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Medlemsgrensen er nådd';
      inviteForm.insertAdjacentHTML('afterbegin', '<p class="v21-error">Gratisplanen har plass til opptil 5 medlemmer, inkludert eieren.</p>');
    }
  }

  function updateVersion() {
    const meta = document.querySelector('#about-button .settings-meta');
    if (meta && meta.textContent !== 'v2.2') meta.textContent = 'v2.2';
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('#v22-plan-info')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (typeof showAlert === 'function') showAlert({
        title: 'Gratisplan',
        html: '<p>Dere kan bruke alle grunnfunksjonene og være opptil <strong>5 medlemmer</strong> i samme hjem.</p><p>Premium er bare forberedt for senere. Ingen betaling er aktivert.</p>',
      });
    }
  }, true);

  const observer = new MutationObserver(() => {
    ensurePlanRow();
    updateVersion();
    decorateAccount();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  ensurePlanRow();
  updateVersion();
  decorateAccount();
})();
