(() => {
  'use strict';
  const H = window.HED21;
  if (!H) return;

  let overlayDialog = null;
  let scheduled = false;

  function ensureNetworkBanner() {
    let banner = document.querySelector('#v27-network-banner');
    if (!banner) {
      banner = document.createElement('div'); banner.id = 'v27-network-banner'; banner.className = 'v27-network-banner'; banner.setAttribute('role', 'status'); banner.hidden = true; document.body.append(banner);
    }
    return banner;
  }
  function updateNetwork() {
    const banner = ensureNetworkBanner();
    banner.hidden = navigator.onLine;
    banner.textContent = navigator.onLine ? '' : 'Uten nett – endringene lagres på telefonen og synkroniseres senere.';
    document.documentElement.classList.toggle('v27-offline', !navigator.onLine);
  }
  function updateViewport() {
    const viewport = window.visualViewport;
    const keyboard = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
    document.documentElement.style.setProperty('--v27-keyboard-offset', `${Math.round(keyboard)}px`);
    document.documentElement.classList.toggle('v27-keyboard-open', keyboard > 120);
  }

  function topDialog() {
    const dialogs = [...document.querySelectorAll('dialog[open]')]; return dialogs.at(-1) || null;
  }
  function syncDialogHistory() {
    const dialog = topDialog();
    if (dialog && !overlayDialog) {
      overlayDialog = dialog;
      if (!history.state?.hed27Overlay) history.pushState({ ...(history.state || {}), hed27Overlay: true }, '', location.href);
    }
    if (!dialog) overlayDialog = null;
  }
  addEventListener('popstate', () => {
    const dialog = topDialog();
    if (dialog) { dialog.close(); overlayDialog = null; }
  });
  document.addEventListener('close', (event) => {
    if (!event.target.matches?.('dialog')) return;
    if (history.state?.hed27Overlay) history.back();
  }, true);

  document.addEventListener('focusin', (event) => {
    const field = event.target.closest('input,textarea,select');
    if (!field) return;
    setTimeout(() => field.scrollIntoView({ behavior: 'smooth', block: 'center' }), 220);
  });

  function sync() { updateNetwork(); updateViewport(); syncDialogHistory(); }
  function schedule() { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; sync(); }); }
  addEventListener('online', schedule); addEventListener('offline', schedule); addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule); window.visualViewport?.addEventListener('scroll', schedule);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'class'] });
  schedule();
})();
