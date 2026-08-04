(() => {
  'use strict';

  const V = window.HED22;
  if (!V || typeof window.navigate !== 'function') return;

  try {
    if (!window.state && typeof state !== 'undefined') window.state = state;
    if (!window.getPath && typeof getPath === 'function') window.getPath = getPath;
  } catch (error) {
    console.warn('Kunne ikke koble 2.2 til hovedappen', error);
  }

  const originalNavigate = window.navigate;

  function showLists(options = {}) {
    if (window.state) {
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
