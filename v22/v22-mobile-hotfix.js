(() => {
  'use strict';

  // On mobile, opening a native prompt from inside a <dialog> can dismiss or
  // visually reset the list view. Treat a tap on the item row as packing it;
  // the separate delete control remains untouched.
  document.addEventListener('click', (event) => {
    const itemMain = event.target.closest('[data-v22-edit-item]');
    if (!itemMain) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const row = itemMain.closest('[data-v22-item-row]');
    const toggle = row?.querySelector('[data-v22-toggle-item]');
    if (toggle && !toggle.disabled) toggle.click();
  }, true);
})();
