(() => {
  'use strict';

  const V = window.HED22;
  if (!V || typeof window.navigate !== 'function') return;

  const originalNavigate = window.navigate;

  function showLists(options = {}) {
    if (globalThis.state) {
      state.screen = 'lists';
      state.previousScreen = 'lists';
    }

    document.querySelectorAll('.screen').forEach((section) => {
      section.classList.toggle('is-active', section.dataset.screen === 'lists');
    });
    document.querySelectorAll('.tab-button').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.nav === 'lists');
    });

    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) tabBar.hidden = false;
    V.emit?.();
    scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' });
  }

  window.navigate = function navigateWithLists(screen, options = {}) {
    if (screen === 'lists') {
      showLists(options);
      return;
    }
    return originalNavigate(screen, options);
  };

  V.navigateToLists = showLists;
})();
