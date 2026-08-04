(() => {
  'use strict';

  const V = window.HED22;
  if (!V) return;

  const W = window.HED23 = window.HED23 || {};
  W.version = '2.3.0';

  const item = (section, title, options = {}) => ({ section, title, ...options });

  const commonTrip = [
    item('Viktig', 'Legitimasjon eller pass', { essential: true, tags: ['always'] }),
    item('Viktig', 'Bankkort', { essential: true, tags: ['always'] }),
    item('Viktig', 'Mobil', { essential: true, tags: ['always'] }),
    item('Viktig', 'Medisiner', { essential: true, tags: ['always'] }),
    item('Elektronikk', 'Mobillader', { essential: true, tags: ['always'] }),
    item('Elektronikk', 'Hodetelefoner', { tags: ['always'] }),
    item('Klær', 'Undertøy', { essential: true, quantity: 'underwear', tags: ['always'] }),
    item('Klær', 'Sokker', { essential: true, quantity: 'socks', tags: ['always'] }),
    item('Klær', 'Overdeler', { quantity: 'tops', tags: ['always'] }),
    item('Klær', 'Bukser eller underdeler', { quantity: 'bottoms', tags: ['always'] }),
    item('Klær', 'Jakke eller ytterlag', { tags: ['always'] }),
    item('Hygiene', 'Tannbørste', { essential: true, tags: ['always'] }),
    item('Hygiene', 'Tannkrem', { tags: ['always'] }),
    item('Hygiene', 'Deodorant', { tags: ['always'] }),
    item('Huskeliste', 'Ta ut søppel før avreise', { status: 'needed', tags: ['always'] }),
    item('Huskeliste', 'Lukk vinduer og lås dører', { essential: true, tags: ['always'] }),
    item('Huskeliste', 'Sjekk værmeldingen', { tags: ['always'] }),
    item('Viktig', 'Billetter eller reisebevis', { essential: true, tags: ['fly', 'train'] }),
    item('Huskeliste', 'Sjekk inn på reisen', { essential: true, tags: ['fly'] }),
    item('Huskeliste', 'Last ned billetter og boardingkort', { tags: ['fly', 'train'] }),
    item('Viktig', 'Førerkort', { essential: true, tags: ['car'] }),
    item('Bil', 'Billader til mobil', { tags: ['car'] }),
    item('Bil', 'Vann og litt mat til reisen', { tags: ['car'] }),
    item('Elektronikk', 'Powerbank', { tags: ['carryon', 'day'] }),
    item('Klær', 'Pent antrekk', { tags: ['formal'] }),
    item('Trening', 'Treningstøy', { quantity: 'trainingSets', tags: ['training'] }),
    item('Trening', 'Treningssko', { tags: ['training'] }),
    item('Jobb', 'PC eller nettbrett', { essential: true, tags: ['work'] }),
    item('Jobb', 'PC-lader', { essential: true, tags: ['work'] }),
    item('Jobb', 'Arbeidsdokumenter', { tags: ['work'] }),
    item('Mat', 'Matplan og handleliste', { tags: ['cook'] }),
  ];

  const templates = [
    {
      key: 'weekend', name: 'Helgetur', kind: 'trip', icon: '🧳', description: 'En enkel tur på noen få dager',
      defaults: { duration: '3-5', transport: 'car', baggage: 'normal', activities: [] },
      items: [
        item('Hygiene', 'Toalettmappe', { essential: true }),
        item('Klær', 'Ekstra genser'),
        item('Annet', 'Drikkeflaske'),
      ],
    },
    {
      key: 'sun', name: 'Sydenferie', kind: 'trip', icon: '☀️', description: 'Sol, bad og varmere vær',
      defaults: { duration: 'week', transport: 'fly', baggage: 'checked', activities: ['swim'] },
      items: [
        item('Sol og bad', 'Badetøy', { essential: true, quantity: 2 }),
        item('Sol og bad', 'Solkrem', { essential: true }),
        item('Sol og bad', 'Solbriller', { essential: true }),
        item('Sol og bad', 'Caps eller solhatt'),
        item('Sol og bad', 'Sandaler'),
        item('Sol og bad', 'Strandhåndkle'),
        item('Hygiene', 'Toalettmappe', { essential: true }),
        item('Huskeliste', 'Sjekk passets gyldighet', { essential: true, tags: ['fly'] }),
        item('Huskeliste', 'Ordne transport til flyplassen', { tags: ['fly'] }),
      ],
    },
    {
      key: 'cabin', name: 'Hyttetur', kind: 'trip', icon: '🏔️', description: 'Hytte, natur og avslapping',
      defaults: { duration: '3-5', transport: 'car', baggage: 'normal', activities: ['cook'] },
      items: [
        item('Hytte', 'Sengetøy', { essential: true }),
        item('Hytte', 'Håndkle', { essential: true }),
        item('Klær', 'Ullundertøy'),
        item('Klær', 'Varme sokker'),
        item('Hytte', 'Hodelykt'),
        item('Må kjøpes', 'Mat', { status: 'buy', essential: true }),
        item('Må kjøpes', 'Ved', { status: 'buy' }),
      ],
    },
    {
      key: 'work', name: 'Jobbreise', kind: 'trip', icon: '💼', description: 'Arbeid, møter og nødvendig utstyr',
      defaults: { duration: '3-5', transport: 'fly', baggage: 'carryon', activities: ['work', 'formal'] },
      items: [
        item('Jobb', 'PC', { essential: true }),
        item('Jobb', 'PC-lader', { essential: true }),
        item('Jobb', 'Arbeidsklær', { quantity: 'tops' }),
        item('Jobb', 'Notatbok og penn'),
        item('Huskeliste', 'Send eller lagre reiseplanen'),
      ],
    },
    {
      key: 'day', name: 'Dagstur', kind: 'trip', icon: '🎒', description: 'Ut og hjem samme dag',
      defaults: { duration: '1-2', transport: 'car', baggage: 'carryon', activities: [] },
      items: [
        item('Dagstur', 'Drikkeflaske', { essential: true }),
        item('Dagstur', 'Mat eller snacks'),
        item('Dagstur', 'Regnjakke eller ekstra lag'),
        item('Dagstur', 'Lite førstehjelpsutstyr'),
      ],
    },
    {
      key: 'sport', name: 'Trenings- eller konkurransetur', kind: 'trip', icon: '🏅', description: 'Trening, kamp eller konkurranse',
      defaults: { duration: '1-2', transport: 'car', baggage: 'normal', activities: ['training'] },
      items: [
        item('Konkurranse', 'Drakt eller konkurransetøy', { essential: true }),
        item('Konkurranse', 'Treningssko', { essential: true }),
        item('Konkurranse', 'Vannflaske', { essential: true }),
        item('Konkurranse', 'Teip eller støtteutstyr'),
        item('Konkurranse', 'Restitusjonsmat'),
        item('Huskeliste', 'Kontroller oppmøtetid og adresse', { essential: true }),
      ],
    },
    {
      key: 'pet', name: 'Reise med kjæledyr', kind: 'trip', icon: '🐾', description: 'Generell liste for dyr på tur',
      defaults: { duration: '3-5', transport: 'car', baggage: 'normal', activities: ['pet'] },
      items: [
        item('Kjæledyr', 'Mat til kjæledyret', { essential: true, quantity: 'petMeals' }),
        item('Kjæledyr', 'Vannskål', { essential: true }),
        item('Kjæledyr', 'Bånd eller transportbur', { essential: true }),
        item('Kjæledyr', 'Sele eller halsbånd'),
        item('Kjæledyr', 'Poser eller rengjøringsutstyr'),
        item('Kjæledyr', 'Seng eller teppe'),
        item('Kjæledyr', 'Eventuelle medisiner'),
        item('Huskeliste', 'Lagre veterinær- og kontaktinformasjon'),
      ],
    },
    {
      key: 'moving', name: 'Flytting', kind: 'moving', icon: '📦', description: 'Fra pakking til første natt',
      defaults: { duration: '3-5', transport: 'car', baggage: 'normal', activities: [] },
      items: [
        item('Før flytting', 'Bestill flyttebil', { essential: true }),
        item('Før flytting', 'Meld adresseendring', { essential: true }),
        item('Før flytting', 'Bestill eller flytt internett'),
        item('Før flytting', 'Avtal overtakelse og nøkler', { essential: true }),
        item('På flyttedagen', 'Ta måleravlesning og bilder'),
        item('Åpnes først', 'Toalettpapir', { essential: true }),
        item('Åpnes først', 'Ladere', { essential: true }),
        item('Åpnes først', 'Sengetøy', { essential: true }),
        item('Åpnes først', 'Verktøy'),
        item('Åpnes først', 'Rengjøringsutstyr'),
      ],
    },
    {
      key: 'shopping', name: 'Handleliste', kind: 'shopping', icon: '🛒', description: 'Start en ryddig handleliste',
      defaults: { duration: '1-2', transport: 'car', baggage: 'normal', activities: [] },
      items: [
        item('Dagligvarer', 'Middag'),
        item('Dagligvarer', 'Frokost'),
        item('Husholdning', 'Husholdningsvarer'),
      ],
    },
  ];

  const durationDays = { '1-2': 2, '3-5': 4, week: 7, longer: 10 };

  function contextTags(context) {
    const tags = new Set(['always', context.transport, context.baggage]);
    (context.activities || []).forEach((tag) => tags.add(tag));
    if (context.templateKey === 'day') tags.add('day');
    return tags;
  }

  function quantityFor(rule, context) {
    if (typeof rule === 'number') return rule;
    const days = Math.max(1, Number(context.days) || durationDays[context.duration] || 4);
    const people = Math.max(1, Number(context.people) || 1);
    const values = {
      underwear: Math.min(99, (days + 1) * people),
      socks: Math.min(99, days * people),
      tops: Math.min(99, Math.max(2, Math.ceil(days / 2)) * people),
      bottoms: Math.min(99, Math.max(1, Math.ceil(days / 3)) * people),
      trainingSets: Math.min(99, Math.max(1, Math.ceil(days / 2)) * people),
      petMeals: Math.min(99, Math.max(2, days * 2)),
    };
    return values[rule] || 1;
  }

  function shouldInclude(entry, tags) {
    if (!entry.tags?.length) return true;
    return entry.tags.some((tag) => tags.has(tag));
  }

  function normalizeTitle(value) {
    return String(value || '').trim().toLocaleLowerCase('nb-NO').replace(/\s+/g, ' ');
  }

  function buildPlan(context = {}) {
    const template = templates.find((entry) => entry.key === context.templateKey) || templates[0];
    const resolved = {
      ...template.defaults,
      ...context,
      activities: Array.isArray(context.activities) ? context.activities : template.defaults.activities,
    };
    resolved.days = Math.max(1, Number(resolved.days) || durationDays[resolved.duration] || 4);
    resolved.people = Math.max(1, Number(resolved.people) || 1);

    const tags = contextTags(resolved);
    const sourceItems = ['moving', 'shopping'].includes(template.kind)
      ? template.items
      : [...commonTrip, ...template.items];
    const seen = new Set();
    const planItems = [];

    sourceItems.forEach((entry, index) => {
      if (!shouldInclude(entry, tags)) return;
      const key = normalizeTitle(entry.title);
      if (!key || seen.has(key)) return;
      seen.add(key);
      planItems.push({
        id: `rule-${index}-${key.replace(/[^a-z0-9æøå]+/gi, '-').slice(0, 30)}`,
        section: entry.section || 'Pakkeliste',
        title: entry.title,
        quantity: quantityFor(entry.quantity, resolved),
        note: entry.note || '',
        status: entry.status === 'buy' || entry.section === 'Må kjøpes' ? 'buy' : 'needed',
        essential: Boolean(entry.essential),
        selected: entry.selected !== false,
        origin: 'template',
      });
    });

    return {
      title: resolved.name?.trim() || template.name,
      destination: resolved.destination?.trim() || '',
      kind: template.kind,
      templateKey: template.key,
      summary: `${resolved.days} dag${resolved.days === 1 ? '' : 'er'} · ${resolved.people} person${resolved.people === 1 ? '' : 'er'}`,
      context: resolved,
      assumptions: [],
      items: planItems,
      source: 'rules',
    };
  }

  function normalizeAIPlan(raw = {}, fallback = {}) {
    const allowedStatuses = new Set(['needed', 'buy']);
    const items = Array.isArray(raw.items) ? raw.items : [];
    return {
      title: String(raw.title || fallback.title || 'Ny smart liste').trim().slice(0, 80),
      destination: String(raw.destination || fallback.destination || '').trim().slice(0, 120),
      kind: ['trip', 'packing', 'reminder', 'shopping', 'moving', 'custom'].includes(raw.kind) ? raw.kind : (fallback.kind || 'trip'),
      templateKey: fallback.templateKey || 'ai',
      summary: String(raw.summary || 'AI-tilpasset forslag').trim().slice(0, 180),
      assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.map((value) => String(value).slice(0, 160)).slice(0, 6) : [],
      items: items.slice(0, 80).map((entry, index) => ({
        id: `ai-${index}-${Math.random().toString(16).slice(2)}`,
        section: String(entry.section || 'Pakkeliste').trim().slice(0, 50),
        title: String(entry.title || '').trim().slice(0, 120),
        quantity: Math.max(1, Math.min(99, Number(entry.quantity) || 1)),
        note: String(entry.note || '').trim().slice(0, 240),
        status: allowedStatuses.has(entry.status) ? entry.status : 'needed',
        essential: Boolean(entry.essential),
        selected: entry.selected !== false,
        origin: 'ai',
      })).filter((entry) => entry.title),
      source: 'ai',
    };
  }

  function mergePlans(base, ai) {
    const result = normalizeAIPlan(ai, base);
    const seen = new Set(result.items.map((entry) => normalizeTitle(entry.title)));
    (base?.items || []).forEach((entry) => {
      const key = normalizeTitle(entry.title);
      if (!seen.has(key) && entry.essential) {
        seen.add(key);
        result.items.unshift({ ...entry, id: `kept-${entry.id}`, origin: 'template' });
      }
    });
    return result;
  }

  W.templates = templates;
  W.durationDays = durationDays;
  W.buildPlan = buildPlan;
  W.normalizeAIPlan = normalizeAIPlan;
  W.mergePlans = mergePlans;
  W.normalizeTitle = normalizeTitle;

  V.templates = templates.map((template) => ({
    key: template.key,
    name: template.name,
    kind: template.kind,
    icon: template.icon,
    items: buildPlan({ templateKey: template.key }).items.map((entry) => [entry.section, entry.title]),
  }));
})();