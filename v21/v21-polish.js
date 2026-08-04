(() => {
  'use strict';
  const H = window.HED21;
  if (!H) return;

  function removeLegacyButtons(root = document) {
    root.querySelectorAll?.('.hed-share-invite').forEach((node) => node.remove());
  }

  function ensureStatus() {
    let pill = document.querySelector('#v21-sync-status');
    if (pill) return pill;

    const header = document.querySelector('[data-screen="profile"] .screen-header');
    if (!header) return null;

    pill = document.createElement('button');
    pill.id = 'v21-sync-status';
    pill.type = 'button';
    pill.className = 'v21-sync-pill';
    pill.innerHTML = '<span></span><strong>Starter</strong>';
    pill.addEventListener('click', () => window.openAccountSheet?.());
    header.append(pill);
    return pill;
  }

  function updateStatus() {
    const pill = ensureStatus();
    if (!pill) return;

    const online = navigator.onLine;
    const accountMeta = document.querySelector('#account-info .settings-meta')?.textContent?.trim();
    const synced = online && /synkronisert/i.test(accountMeta || '');
    const nextState = online ? (synced ? 'synced' : 'syncing') : 'offline';
    const nextText = online ? (synced ? 'Synkronisert' : 'Synkroniserer') : 'Uten nett';
    const strong = pill.querySelector('strong');

    if (pill.dataset.state !== nextState) pill.dataset.state = nextState;
    if (strong && strong.textContent !== nextText) strong.textContent = nextText;
  }

  function updateVersionText() {
    const meta = document.querySelector('#about-button .settings-meta');
    if (meta && meta.textContent !== 'v2.1') meta.textContent = 'v2.1';
  }

  let refreshQueued = false;
  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      updateVersionText();
      updateStatus();
    });
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('#about-button')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const itemCount = globalThis.state?.data?.items?.length || 0;
      const containerCount = globalThis.state?.data?.containers?.length || 0;
      const homeName = globalThis.state?.data?.home?.name || 'hjemmet';
      if (typeof showAlert === 'function') showAlert({
        title: 'Hvor er den? 2.1',
        html: `<p>Felles oversikt over ting, rom, skap og kasser.</p><p><strong>${itemCount}</strong> ting og <strong>${containerCount}</strong> plasseringer ligger i ${H.html(homeName)}.</p><p>Versjon 2.1 gir bedre konto, medlemmer, invitasjoner, QR-skanning og stabilitet.</p>`,
      });
    }

    if (event.target.closest('#help-button')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (typeof showAlert === 'function') showAlert({
        title: 'Slik bruker du 2.1',
        html: '<ol><li>Lag rom og plasseringer.</li><li>Legg til ting med kort, nøyaktig plassering.</li><li>Bruk QR-knappen på hjem-siden for å åpne en merket kasse.</li><li>Administrer medlemmer og invitasjoner fra Profil.</li><li>Private ting vises bare for deg.</li></ol>',
      });
    }
  }, true);

  addEventListener('online', queueRefresh);
  addEventListener('offline', queueRefresh);
  document.addEventListener('hed21:auth', queueRefresh);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) removeLegacyButtons(node);
      });
    }
    queueRefresh();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  removeLegacyButtons();
  updateVersionText();
  updateStatus();
})();