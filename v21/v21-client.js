(() => {
  'use strict';

  const config = window.HED_SUPABASE;
  const H = window.HED21 = window.HED21 || {};
  H.version = '2.1.0';
  H.activeHomeKey = 'hed-v21-active-home';
  H.html = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  H.roleLabel = (role) => role === 'owner' ? 'Eier' : role === 'viewer' ? 'Lesetilgang' : 'Medlem';
  H.uuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  H.errorText = (error, fallback = 'Noe gikk galt') => {
    const message = String(error?.message || error?.error_description || fallback);
    const translations = [
      ['Invalid login credentials', 'Feil e-post eller passord'],
      ['Email not confirmed', 'E-postadressen må bekreftes først'],
      ['User already registered', 'Det finnes allerede en konto med denne e-posten'],
      ['JWT expired', 'Økten er utløpt. Logg inn på nytt.'],
      ['row-level security', 'Du har ikke tilgang til å gjøre dette'],
      ['Bare eieren kan invitere', 'Bare eieren kan invitere medlemmer'],
      ['Invitasjonen er ugyldig eller utløpt', 'Invitasjonen er ugyldig, brukt eller utløpt'],
    ];
    return translations.find(([needle]) => message.includes(needle))?.[1] || message;
  };
  H.toast = (message) => typeof window.showToast === 'function' ? window.showToast(message) : console.info(message);
  H.alert = (title, copy) => {
    if (typeof window.showAlert === 'function') {
      window.showAlert({ title, html: `<p>${H.html(copy)}</p>` });
    } else window.alert(`${title}\n\n${copy}`);
  };

  H.ready = (async () => {
    if (!config?.url || !config?.publishableKey) throw new Error('Supabase-oppsettet mangler');
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.8/+esm');
    H.client = createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    const { data } = await H.client.auth.getSession();
    H.session = data.session || null;
    H.user = H.session?.user || null;
    H.client.auth.onAuthStateChange((_event, session) => {
      H.session = session || null;
      H.user = session?.user || null;
      document.dispatchEvent(new CustomEvent('hed21:auth', { detail: { session } }));
    });
    document.dispatchEvent(new CustomEvent('hed21:ready'));
    return H;
  })().catch((error) => {
    console.error('2.1-klienten kunne ikke startes', error);
    return H;
  });

  H.getContext = async (force = false) => {
    await H.ready;
    if (!H.client) throw new Error('Skytjenesten er ikke tilgjengelig');
    const { data: sessionData } = await H.client.auth.getSession();
    H.session = sessionData.session || null;
    H.user = H.session?.user || null;
    if (!H.user) return { user: null, profile: null, homes: [], home: null, role: null, members: [], invitations: [] };
    if (H.context && !force) return H.context;

    const [profileResult, homesResult] = await Promise.all([
      H.client.from('profiles').select('id,display_name,avatar_url,updated_at').eq('id', H.user.id).maybeSingle(),
      H.client.from('home_members').select('home_id,role,joined_at,homes(id,name,owner_id,updated_at)').eq('user_id', H.user.id),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (homesResult.error) throw homesResult.error;

    const homes = (homesResult.data || []).map((row) => ({
      ...(Array.isArray(row.homes) ? row.homes[0] : row.homes),
      role: row.role,
      joinedAt: row.joined_at,
    })).filter((home) => home?.id);
    const stateHomeId = H.uuid(globalThis.state?.data?.home?.id) ? state.data.home.id : '';
    const savedHomeId = localStorage.getItem(H.activeHomeKey) || '';
    const home = homes.find((entry) => entry.id === stateHomeId)
      || homes.find((entry) => entry.id === savedHomeId)
      || homes[0]
      || null;
    const role = home?.role || null;
    let members = [];
    let invitations = [];
    if (home) {
      const membersResult = await H.client
        .from('home_members')
        .select('home_id,user_id,role,joined_at,profiles(id,display_name,avatar_url)')
        .eq('home_id', home.id)
        .order('joined_at');
      if (membersResult.error) throw membersResult.error;
      members = (membersResult.data || []).map((row) => ({
        userId: row.user_id,
        role: row.role,
        joinedAt: row.joined_at,
        profile: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
      }));
      if (role === 'owner') {
        const inviteResult = await H.client
          .from('invitations')
          .select('id,home_id,code,email,role,expires_at,max_uses,uses,revoked_at,accepted_at,accepted_by,created_at')
          .eq('home_id', home.id)
          .order('created_at', { ascending: false });
        if (inviteResult.error) throw inviteResult.error;
        invitations = inviteResult.data || [];
      }
    }
    H.context = { user: H.user, profile: profileResult.data, homes, home, role, members, invitations };
    return H.context;
  };

  H.refresh = async () => H.getContext(true);
  H.inviteUrl = (code) => {
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set('invite', code);
    return url.toString();
  };
  H.share = async ({ title, text, url }) => {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return true; }
      catch (error) { if (error?.name === 'AbortError') return false; }
    }
    await navigator.clipboard.writeText([text, url].filter(Boolean).join('\n'));
    H.toast('Lenken er kopiert');
    return true;
  };
})();
