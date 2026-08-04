(() => {
  'use strict';
  const H = window.HED21;
  if (!H || typeof H.confirm !== 'function') return;
  const originalConfirm = H.confirm.bind(H);
  let originalOpen = window.openAccountSheet;

  H.confirm = async (title, message, options = {}) => {
    const result = await originalConfirm(title, message, options);
    if (!result || !String(title).toLocaleLowerCase('nb-NO').includes('tilbakekalle')) return result;

    const button = document.activeElement?.closest?.('[data-v21-revoke-invite]');
    const row = button?.closest('.v21-invite-row');
    originalOpen = window.openAccountSheet;
    window.openAccountSheet = async () => {
      if (row) {
        const small = row.querySelector('small');
        if (small) small.textContent = small.textContent.replace('Aktiv', 'Tilbakekalt');
        row.querySelector('.v21-inline-actions')?.replaceChildren();
        row.dataset.v27Revoked = '1';
      }
      return null;
    };
    setTimeout(() => { window.openAccountSheet = originalOpen; document.dispatchEvent(new CustomEvent('hed22:changed')); }, 1800);
    return result;
  };
})();