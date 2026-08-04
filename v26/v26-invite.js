(() => {
  'use strict';
  const H = window.HED21; if (!H) return;
  const VERSION = '2.6.0'; const APP = 'https://menes800.github.io/Fiks-det-/'; let recovered = false;
  H.version = VERSION; if (window.HED23) window.HED23.version = VERSION;
  H.inviteUrl = (code) => { const url = new URL(APP); url.searchParams.set('invite', code); return url.toString(); };
  async function recover() {
    if (recovered) return; recovered = true;
    try {
      await H.ready; const { data } = await H.client.auth.getSession(); const session = data.session; const code = session?.user?.user_metadata?.invitation_code;
      if (!code || new URLSearchParams(location.search).has('invite')) return; const target = new URL(H.inviteUrl(code));
      if (location.origin !== target.origin || location.pathname !== target.pathname) { location.replace(target.toString()); return; }
      history.replaceState({}, '', `${target.pathname}${target.search}`); document.dispatchEvent(new CustomEvent('hed21:auth', { detail: { session } }));
    } catch (error) { console.warn('Kunne ikke hente invitasjonen fra innloggingen', error); }
  }
  function version() { const meta = document.querySelector('#about-button .settings-meta'); if (meta && meta.textContent !== 'v2.6') meta.textContent = 'v2.6'; }
  function inviteCopy() {
    const note = document.querySelector('[data-v21-invite-form] .v25-invite-note, [data-v21-invite-form] .v24-invite-note');
    if (note) note.textContent = 'E-post åpner den publiserte appen. Uten e-post får du en delbar lenke.';
  }
  function sync() { version(); inviteCopy(); }
  document.addEventListener('hed21:auth', recover); new MutationObserver(sync).observe(document.body, { childList: true, subtree: true }); H.ready.then(recover).catch(sync); sync();
})();
