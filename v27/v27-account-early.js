(() => {
  'use strict';

  window.addEventListener('click', (event) => {
    const trigger = event.target.closest?.('#account-info,[data-open-manager="home"]');
    if (!trigger || event.target.closest?.('#v27-account-screen')) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const openAccount = window.__openV27Account || window.openAccountSheet;
    if (typeof openAccount === 'function') openAccount();
  }, true);
})();
