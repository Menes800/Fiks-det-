(() => {
  'use strict';

  const H = window.HED21;
  if (!H) return;

  const TIMEOUT_MS = 10000;
  let contextRequest = null;

  function withTimeout(promise, message, ms = TIMEOUT_MS) {
    let timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]).finally(() => clearTimeout(timer));
  }

  function emptyContext() {
    return { user: null, profile: null, homes: [], home: null, role: null, members: [], invitations: [] };
  }

  function profileFallback(user) {
    return {
      id: user.id,
      display_name: user.user_metadata?.display_name || user.user_metadata?.full_name || '',
      avatar_url: user.user_metadata?.avatar_url || null,
      updated_at: null,
    };
  }

  async function loadContext(force = false) {
    if (H.context && !force) return H.context;
    if (contextRequest) return contextRequest;

    contextRequest = (async () => {
      await withTimeout(H.ready, 'Skytjenesten svarte ikke. Lukk vinduet og prøv igjen.');
      if (!H.client) throw new Error('Skytjenesten er ikke tilgjengelig');

      if (!H.user) {
        const { data: sessionData, error: sessionError } = await withTimeout(
          H.client.auth.getSession(),
          'Innloggingen svarte ikke. Lukk vinduet og prøv igjen.'
        );
        if (sessionError) throw sessionError;
        H.session = sessionData?.session || null;
        H.user = H.session?.user || null;
      }

      if (!H.user) {
        H.context = emptyContext();
        return H.context;
      }

      const [profileResult, homesResult] = await withTimeout(
        Promise.all([
          H.client.from('profiles').select('id,display_name,avatar_url,updated_at').eq('id', H.user.id).maybeSingle(),
          H.client.from('home_members').select('home_id,role,joined_at,homes(id,name,owner_id,updated_at)').eq('user_id', H.user.id),
        ]),
        'Kontoopplysningene tok for lang tid å laste. Prøv igjen.'
      );

      if (homesResult.error) throw homesResult.error;
      if (profileResult.error) console.warn('Kunne ikke laste profilen', profileResult.error);

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
        try {
          const membersResult = await withTimeout(
            H.client
              .from('home_members')
              .select('home_id,user_id,role,joined_at,profiles(id,display_name,avatar_url)')
              .eq('home_id', home.id)
              .order('joined_at'),
            'Medlemslisten tok for lang tid å laste.'
          );
          if (membersResult.error) throw membersResult.error;
          members = (membersResult.data || []).map((row) => ({
            userId: row.user_id,
            role: row.role,
            joinedAt: row.joined_at,
            profile: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
          }));
        } catch (error) {
          console.warn('Kunne ikke laste medlemmer', error);
          members = H.context?.home?.id === home.id ? (H.context.members || []) : [];
        }

        if (role === 'owner') {
          try {
            const inviteResult = await withTimeout(
              H.client
                .from('invitations')
                .select('id,home_id,code,email,role,expires_at,max_uses,uses,revoked_at,accepted_at,accepted_by,created_at')
                .eq('home_id', home.id)
                .order('created_at', { ascending: false }),
              'Invitasjonene tok for lang tid å laste.'
            );
            if (inviteResult.error) throw inviteResult.error;
            invitations = inviteResult.data || [];
          } catch (error) {
            console.warn('Kunne ikke laste invitasjoner', error);
            invitations = H.context?.home?.id === home.id ? (H.context.invitations || []) : [];
          }
        }
      }

      H.context = {
        user: H.user,
        profile: profileResult.data || profileFallback(H.user),
        homes,
        home,
        role,
        members,
        invitations,
      };
      return H.context;
    })().finally(() => {
      contextRequest = null;
    });

    return contextRequest;
  }

  H.getContext = loadContext;
  H.refresh = () => loadContext(true);

  H.ready
    .then(() => loadContext(false))
    .catch((error) => console.warn('Kunne ikke klargjøre konto og hjem', error));
})();
