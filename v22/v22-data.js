(() => {
  'use strict';

  const H = window.HED21;
  if (!H) return;

  const V = window.HED22 = window.HED22 || {};
  const STORAGE_PREFIX = 'hed-v22-lists-v1:';

  V.version = '2.2.0';
  V.memberLimit = 5;
  V.state = V.state || {
    homeId: '',
    lists: [],
    selectedListId: '',
    loading: false,
    cloud: false,
    error: '',
  };

  V.templates = [
    {
      key: 'weekend', name: 'Helgetur', kind: 'trip', icon: '🧳',
      items: [
        ['Pakkeliste', 'Pass'], ['Pakkeliste', 'Mobil'], ['Pakkeliste', 'Mobillader'],
        ['Pakkeliste', 'Toalettmappe'], ['Pakkeliste', 'Undertøy'], ['Pakkeliste', 'Sokker'],
        ['Pakkeliste', 'Bukse'], ['Pakkeliste', 'Overdel'], ['Pakkeliste', 'Jakke'],
        ['Huskeliste', 'Sjekk inn'], ['Huskeliste', 'Ta ut søppel'], ['Huskeliste', 'Lås vinduer og dører'],
      ],
    },
    {
      key: 'sun', name: 'Sydenferie', kind: 'trip', icon: '☀️',
      items: [
        ['Pakkeliste', 'Pass'], ['Pakkeliste', 'Reisebevis'], ['Pakkeliste', 'Badetøy'],
        ['Pakkeliste', 'Solkrem'], ['Pakkeliste', 'Solbriller'], ['Pakkeliste', 'Sandaler'],
        ['Pakkeliste', 'Mobillader'], ['Pakkeliste', 'Medisiner'], ['Pakkeliste', 'Toalettmappe'],
        ['Huskeliste', 'Sjekk inn på flyet'], ['Huskeliste', 'Last ned billetter'],
        ['Huskeliste', 'Sjekk passets gyldighet'], ['Huskeliste', 'Ordne transport til flyplassen'],
      ],
    },
    {
      key: 'cabin', name: 'Hyttetur', kind: 'trip', icon: '🏔️',
      items: [
        ['Pakkeliste', 'Sengetøy'], ['Pakkeliste', 'Håndkle'], ['Pakkeliste', 'Ullundertøy'],
        ['Pakkeliste', 'Hodelykt'], ['Pakkeliste', 'Mobillader'], ['Pakkeliste', 'Toalettmappe'],
        ['Må kjøpes', 'Mat'], ['Må kjøpes', 'Ved'], ['Huskeliste', 'Sjekk værmeldingen'],
      ],
    },
    {
      key: 'work', name: 'Jobbreise', kind: 'trip', icon: '💼',
      items: [
        ['Pakkeliste', 'PC'], ['Pakkeliste', 'PC-lader'], ['Pakkeliste', 'Mobil'],
        ['Pakkeliste', 'Mobillader'], ['Pakkeliste', 'Arbeidsklær'], ['Pakkeliste', 'Toalettmappe'],
        ['Huskeliste', 'Last ned reisedokumenter'], ['Huskeliste', 'Send reiseplan'],
      ],
    },
    {
      key: 'dog', name: 'Tur med Tica', kind: 'trip', icon: '🐾',
      items: [
        ['Pakkeliste', 'Hundemat'], ['Pakkeliste', 'Vannskål'], ['Pakkeliste', 'Kobbel'],
        ['Pakkeliste', 'Sele'], ['Pakkeliste', 'Hundeposer'], ['Pakkeliste', 'Hundeseng'],
        ['Pakkeliste', 'Medisiner'], ['Huskeliste', 'Sjekk veterinærinformasjon'],
      ],
    },
    {
      key: 'moving', name: 'Flytting', kind: 'moving', icon: '📦',
      items: [
        ['Huskeliste', 'Bestill flyttebil'], ['Huskeliste', 'Meld adresseendring'],
        ['Huskeliste', 'Bestill internett'], ['Huskeliste', 'Ta måleravlesning'],
        ['Åpnes først', 'Toalettpapir'], ['Åpnes først', 'Ladere'], ['Åpnes først', 'Sengetøy'],
        ['Åpnes først', 'Verktøy'], ['Åpnes først', 'Rengjøringsutstyr'],
      ],
    },
  ];

  const KIND_LABELS = {
    trip: 'Tur', packing: 'Pakkeliste', reminder: 'Huskeliste', shopping: 'Handleliste', moving: 'Flytteliste', custom: 'Egen liste',
  };
  const KIND_ICONS = { trip: '🧳', packing: '🎒', reminder: '✅', shopping: '🛒', moving: '📦', custom: '📝' };

  V.kindLabel = (kind) => KIND_LABELS[kind] || KIND_LABELS.custom;
  V.kindIcon = (kind) => KIND_ICONS[kind] || KIND_ICONS.custom;

  function nowIso() { return new Date().toISOString(); }
  function localKey(homeId) { return `${STORAGE_PREFIX}${homeId || 'local'}`; }
  function uuid() { return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function text(value, max = 200) { return String(value ?? '').trim().slice(0, max); }

  function normalizeList(row = {}) {
    return {
      id: row.id || uuid(),
      homeId: row.home_id || row.homeId || V.state.homeId || 'local',
      createdBy: row.created_by || row.createdBy || '',
      name: text(row.name || 'Ny liste', 80) || 'Ny liste',
      kind: KIND_LABELS[row.kind] ? row.kind : 'custom',
      destination: text(row.destination, 120),
      startsOn: row.starts_on || row.startsOn || '',
      endsOn: row.ends_on || row.endsOn || '',
      status: ['active', 'completed', 'archived'].includes(row.status) ? row.status : 'active',
      visibility: row.visibility === 'private' ? 'private' : 'shared',
      templateKey: row.template_key || row.templateKey || '',
      createdAt: row.created_at || row.createdAt || nowIso(),
      updatedAt: row.updated_at || row.updatedAt || nowIso(),
      deletedAt: row.deleted_at || row.deletedAt || null,
      items: [],
    };
  }

  function normalizeItem(row = {}) {
    const statuses = ['needed', 'found', 'packed', 'buy', 'done', 'not_needed', 'returned'];
    return {
      id: row.id || uuid(),
      listId: row.list_id || row.listId || '',
      createdBy: row.created_by || row.createdBy || '',
      linkedItemId: row.linked_item_id || row.linkedItemId || '',
      title: text(row.title || 'Nytt punkt', 120) || 'Nytt punkt',
      section: text(row.section || 'Pakkeliste', 50) || 'Pakkeliste',
      status: statuses.includes(row.status) ? row.status : 'needed',
      quantity: Math.max(1, Math.min(99, Number(row.quantity) || 1)),
      note: text(row.note, 240),
      sortOrder: Number(row.sort_order ?? row.sortOrder) || 0,
      dueAt: row.due_at || row.dueAt || null,
      completedAt: row.completed_at || row.completedAt || null,
      completedBy: row.completed_by || row.completedBy || null,
      createdAt: row.created_at || row.createdAt || nowIso(),
      updatedAt: row.updated_at || row.updatedAt || nowIso(),
      deletedAt: row.deleted_at || row.deletedAt || null,
    };
  }

  function emit() {
    document.dispatchEvent(new CustomEvent('hed22:changed', { detail: { state: V.state } }));
  }

  function readLocal(homeId) {
    try {
      const value = JSON.parse(localStorage.getItem(localKey(homeId)) || '{}');
      const lists = Array.isArray(value.lists) ? value.lists.map(normalizeList) : [];
      const items = Array.isArray(value.items) ? value.items.map(normalizeItem) : [];
      lists.forEach((list) => { list.items = items.filter((item) => item.listId === list.id && !item.deletedAt); });
      return lists.filter((list) => !list.deletedAt);
    } catch (error) {
      console.warn('Kunne ikke lese lokale lister', error);
      return [];
    }
  }

  function writeLocal() {
    const lists = V.state.lists.map(({ items, ...list }) => list);
    const items = V.state.lists.flatMap((list) => list.items || []);
    localStorage.setItem(localKey(V.state.homeId), JSON.stringify({ version: 1, lists, items, savedAt: nowIso() }));
  }

  async function context(force = false) {
    await H.ready;
    const cloudContext = await H.getContext(force).catch(() => null);
    const homeId = cloudContext?.home?.id || globalThis.state?.data?.home?.id || 'local';
    return {
      cloudContext,
      user: cloudContext?.user || null,
      home: cloudContext?.home || null,
      role: cloudContext?.role || 'member',
      homeId,
      canEdit: !cloudContext?.home || ['owner', 'member'].includes(cloudContext?.role),
    };
  }

  async function reload(force = false) {
    if (V.state.loading && !force) return V.state;
    V.state.loading = true;
    emit();
    try {
      const ctx = await context(force);
      V.context = ctx;
      V.state.homeId = ctx.homeId;
      V.state.error = '';
      V.state.cloud = Boolean(ctx.user && ctx.home && H.client);

      if (!V.state.cloud) {
        V.state.lists = readLocal(ctx.homeId);
        return V.state;
      }

      const listsResult = await H.client
        .from('lists')
        .select('id,home_id,created_by,name,kind,destination,starts_on,ends_on,status,visibility,template_key,created_at,updated_at,deleted_at')
        .eq('home_id', ctx.home.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      if (listsResult.error) throw listsResult.error;

      const lists = (listsResult.data || []).map(normalizeList);
      const ids = lists.map((list) => list.id);
      let items = [];
      if (ids.length) {
        const itemsResult = await H.client
          .from('list_items')
          .select('id,list_id,created_by,linked_item_id,title,section,status,quantity,note,sort_order,due_at,completed_at,completed_by,created_at,updated_at,deleted_at')
          .in('list_id', ids)
          .is('deleted_at', null)
          .order('sort_order', { ascending: true });
        if (itemsResult.error) throw itemsResult.error;
        items = (itemsResult.data || []).map(normalizeItem);
      }
      lists.forEach((list) => { list.items = items.filter((item) => item.listId === list.id); });
      V.state.lists = lists;
      writeLocal();
      return V.state;
    } catch (error) {
      console.error('Kunne ikke laste lister', error);
      V.state.error = H.errorText(error, 'Kunne ikke laste listene');
      V.state.cloud = false;
      V.state.lists = readLocal(V.state.homeId);
      return V.state;
    } finally {
      V.state.loading = false;
      emit();
    }
  }

  function localList(id) { return V.state.lists.find((list) => list.id === id); }
  V.getList = localList;

  function listPayload(payload = {}) {
    return {
      name: text(payload.name, 80) || 'Ny liste',
      kind: KIND_LABELS[payload.kind] ? payload.kind : 'custom',
      destination: text(payload.destination, 120) || null,
      starts_on: payload.startsOn || null,
      ends_on: payload.endsOn || null,
      status: payload.status || 'active',
      visibility: payload.visibility === 'private' ? 'private' : 'shared',
      template_key: text(payload.templateKey, 40) || null,
      updated_at: nowIso(),
    };
  }

  async function createList(payload = {}) {
    const ctx = V.context || await context();
    if (!ctx.canEdit) throw new Error('Du har lesetilgang og kan ikke opprette lister');
    let list;
    if (V.state.cloud) {
      const { data, error } = await H.client.from('lists').insert({
        ...listPayload(payload), home_id: ctx.home.id, created_by: ctx.user.id,
      }).select().single();
      if (error) throw error;
      list = normalizeList(data);
    } else {
      list = normalizeList({ ...listPayload(payload), id: uuid(), homeId: ctx.homeId, createdBy: ctx.user?.id || 'local' });
    }
    list.items = [];
    V.state.lists.unshift(list);
    writeLocal(); emit();
    return list;
  }

  async function updateList(id, patch = {}) {
    const list = localList(id);
    if (!list) throw new Error('Fant ikke listen');
    const payload = listPayload({ ...list, ...patch });
    if (V.state.cloud) {
      const { data, error } = await H.client.from('lists').update(payload).eq('id', id).select().single();
      if (error) throw error;
      Object.assign(list, normalizeList(data), { items: list.items });
    } else {
      Object.assign(list, normalizeList({ ...list, ...patch, updatedAt: nowIso() }), { items: list.items });
    }
    writeLocal(); emit();
    return list;
  }

  async function deleteList(id) {
    const list = localList(id);
    if (!list) return;
    if (V.state.cloud) {
      const { error } = await H.client.from('lists').update({ deleted_at: nowIso(), updated_at: nowIso() }).eq('id', id);
      if (error) throw error;
    }
    V.state.lists = V.state.lists.filter((entry) => entry.id !== id);
    if (V.state.selectedListId === id) V.state.selectedListId = '';
    writeLocal(); emit();
  }

  function itemPayload(payload = {}) {
    const status = ['needed', 'found', 'packed', 'buy', 'done', 'not_needed', 'returned'].includes(payload.status) ? payload.status : 'needed';
    return {
      linked_item_id: payload.linkedItemId || null,
      title: text(payload.title, 120) || 'Nytt punkt',
      section: text(payload.section, 50) || 'Pakkeliste',
      status,
      quantity: Math.max(1, Math.min(99, Number(payload.quantity) || 1)),
      note: text(payload.note, 240) || null,
      sort_order: Number(payload.sortOrder) || 0,
      due_at: payload.dueAt || null,
      completed_at: ['done', 'packed', 'returned'].includes(status) ? (payload.completedAt || nowIso()) : null,
      completed_by: ['done', 'packed', 'returned'].includes(status) ? (V.context?.user?.id || null) : null,
      updated_at: nowIso(),
    };
  }

  async function addItem(listId, payload = {}) {
    const list = localList(listId);
    if (!list) throw new Error('Fant ikke listen');
    const sortOrder = list.items.length ? Math.max(...list.items.map((item) => item.sortOrder || 0)) + 10 : 10;
    let item;
    if (V.state.cloud) {
      const { data, error } = await H.client.from('list_items').insert({
        ...itemPayload({ ...payload, sortOrder }), list_id: listId, created_by: V.context.user.id,
      }).select().single();
      if (error) throw error;
      item = normalizeItem(data);
    } else {
      item = normalizeItem({ ...itemPayload({ ...payload, sortOrder }), id: uuid(), listId, createdBy: 'local' });
    }
    list.items.push(item);
    list.updatedAt = nowIso();
    writeLocal(); emit();
    return item;
  }

  async function updateItem(listId, itemId, patch = {}) {
    const list = localList(listId);
    const item = list?.items.find((entry) => entry.id === itemId);
    if (!item) throw new Error('Fant ikke punktet');
    const payload = itemPayload({ ...item, ...patch });
    if (V.state.cloud) {
      const { data, error } = await H.client.from('list_items').update(payload).eq('id', itemId).select().single();
      if (error) throw error;
      Object.assign(item, normalizeItem(data));
    } else {
      Object.assign(item, normalizeItem({ ...item, ...patch, updatedAt: nowIso() }));
    }
    list.updatedAt = nowIso();
    writeLocal(); emit();
    return item;
  }

  async function deleteItem(listId, itemId) {
    const list = localList(listId);
    if (!list) return;
    if (V.state.cloud) {
      const { error } = await H.client.from('list_items').update({ deleted_at: nowIso(), updated_at: nowIso() }).eq('id', itemId);
      if (error) throw error;
    }
    list.items = list.items.filter((entry) => entry.id !== itemId);
    list.updatedAt = nowIso();
    writeLocal(); emit();
  }

  function findLinkedItem(title) {
    const normalized = String(title || '').trim().toLocaleLowerCase('nb-NO');
    const items = globalThis.state?.data?.items || [];
    return items.find((item) => String(item.name).trim().toLocaleLowerCase('nb-NO') === normalized)
      || items.find((item) => {
        const name = String(item.name).trim().toLocaleLowerCase('nb-NO');
        return name.includes(normalized) || normalized.includes(name);
      })
      || null;
  }
  V.findLinkedItem = findLinkedItem;

  async function createFromTemplate(templateKey, payload = {}) {
    const template = V.templates.find((entry) => entry.key === templateKey);
    if (!template) return createList(payload);
    const list = await createList({
      ...payload,
      name: payload.name || template.name,
      kind: payload.kind || template.kind,
      templateKey,
    });
    for (const [section, title] of template.items) {
      const linked = findLinkedItem(title);
      await addItem(list.id, {
        title,
        section,
        linkedItemId: linked?.id || '',
        status: section === 'Må kjøpes' ? 'buy' : 'needed',
      });
    }
    return list;
  }

  async function duplicateList(id) {
    const source = localList(id);
    if (!source) throw new Error('Fant ikke listen');
    const copy = await createList({
      name: `${source.name} – kopi`, kind: source.kind, destination: source.destination,
      startsOn: source.startsOn, endsOn: source.endsOn, visibility: source.visibility,
    });
    for (const item of source.items) {
      await addItem(copy.id, { ...item, status: item.status === 'buy' ? 'buy' : 'needed', completedAt: null });
    }
    return copy;
  }

  async function resetPacking(id) {
    const list = localList(id);
    if (!list) return;
    for (const item of [...list.items]) {
      const next = item.status === 'buy' ? 'buy' : 'needed';
      await updateItem(id, item.id, { status: next, completedAt: null });
    }
  }

  V.reload = reload;
  V.createList = createList;
  V.updateList = updateList;
  V.deleteList = deleteList;
  V.addItem = addItem;
  V.updateItem = updateItem;
  V.deleteItem = deleteItem;
  V.createFromTemplate = createFromTemplate;
  V.duplicateList = duplicateList;
  V.resetPacking = resetPacking;
  V.emit = emit;

  V.ready = (async () => {
    await H.ready;
    await reload();
    return V;
  })();

  document.addEventListener('hed21:auth', () => reload(true));
})();
