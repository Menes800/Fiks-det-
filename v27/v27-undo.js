(() => {
  'use strict';
  const appState = () => (typeof state !== 'undefined' ? state : null);
  let pending = null;
  let timer = 0;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function ensureBar() {
    let bar = document.querySelector('.v27-undo-bar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'v27-undo-bar';
    bar.hidden = true;
    bar.innerHTML = '<span></span><button type="button" data-v27-undo>Angre</button>';
    document.body.append(bar);
    return bar;
  }
  function show(message, action) {
    pending = action;
    const bar = ensureBar();
    bar.querySelector('span').textContent = message;
    bar.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => { bar.hidden = true; pending = null; }, 6000);
  }
  function persist() {
    if (typeof saveData === 'function') saveData();
    if (typeof renderAll === 'function') renderAll();
    document.dispatchEvent(new CustomEvent('hed22:changed'));
  }
  function restoreSnapshot(snapshot) {
    const data = appState()?.data; if (!data || !snapshot) return;
    data.deleted = data.deleted.filter((item) => item.id !== snapshot.id);
    const index = data.items.findIndex((item) => item.id === snapshot.id);
    if (index >= 0) data.items[index] = clone(snapshot);
    else data.items.unshift(clone(snapshot));
    persist();
  }

  document.addEventListener('submit', (event) => {
    if (!event.target.matches('#item-form')) return;
    const id = event.target.querySelector('#item-id')?.value;
    if (!id) return;
    const before = appState()?.data?.items?.find((item) => item.id === id);
    if (!before) return;
    const snapshot = clone(before);
    setTimeout(() => {
      const after = appState()?.data?.items?.find((item) => item.id === id);
      if (!after) return;
      const moved = before.roomId !== after.roomId || before.containerId !== after.containerId || before.detail !== after.detail;
      show(moved ? `${after.name} er flyttet` : `${after.name} er oppdatert`, () => restoreSnapshot(snapshot));
    }, 100);
  }, true);

  document.addEventListener('click', (event) => {
    const confirmDelete = event.target.closest('[data-confirm-delete]');
    if (confirmDelete) {
      const id = confirmDelete.dataset.confirmDelete;
      const before = appState()?.data?.items?.find((item) => item.id === id);
      if (before) {
        const snapshot = clone(before);
        setTimeout(() => show(`${snapshot.name} er slettet`, () => restoreSnapshot(snapshot)), 100);
      }
    }
    if (event.target.closest('[data-v27-undo]') && pending) {
      event.preventDefault();
      const action = pending; pending = null;
      clearTimeout(timer);
      ensureBar().hidden = true;
      action();
      window.HED21?.toast?.('Handlingen er angret');
    }
  }, true);

  ensureBar();
})();