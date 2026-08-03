const STORAGE_KEY = 'hvor-er-den-data-v4';
const LEGACY_KEYS = ['hvor-er-den-data-v3', 'hvor-er-den-data-v2', 'hvor-er-den-items-v1'];

const DEFAULT_CATEGORIES = [
  { id: 'cat-documents', name: 'Dokumenter', icon: '📄', color: '#5d86e8', protected: false },
  { id: 'cat-tools', name: 'Verktøy', icon: '🛠️', color: '#d9783f', protected: false },
  { id: 'cat-electronics', name: 'Elektronikk', icon: '🔌', color: '#75b75a', protected: false },
  { id: 'cat-clothes', name: 'Klær', icon: '🧥', color: '#b36ed6', protected: false },
  { id: 'cat-kitchen', name: 'Kjøkken', icon: '🍴', color: '#76b684', protected: false },
  { id: 'cat-pet', name: 'Kjæledyr', icon: '🐾', color: '#d59258', protected: false },
  { id: 'cat-car', name: 'Bil', icon: '🚗', color: '#6e86b8', protected: false },
  { id: 'cat-other', name: 'Annet', icon: '📦', color: '#777d89', protected: true },
];

const DEFAULT_ROOMS = [
  { id: 'room-bedroom', name: 'Soverom', icon: '🛏️', protected: false },
  { id: 'room-storage', name: 'Bod', icon: '📦', protected: false },
  { id: 'room-kitchen', name: 'Kjøkken', icon: '🍴', protected: false },
  { id: 'room-living', name: 'Stue', icon: '🛋️', protected: false },
  { id: 'room-office', name: 'Kontor', icon: '🪑', protected: false },
  { id: 'room-bath', name: 'Bad', icon: '🛁', protected: false },
  { id: 'room-entry', name: 'Entré', icon: '🚪', protected: false },
  { id: 'room-cellar', name: 'Kjellerbod', icon: '🗄️', protected: false },
  { id: 'room-car', name: 'Bil', icon: '🚗', protected: false },
  { id: 'room-other', name: 'Annet sted', icon: '📍', protected: true },
];

const DEFAULT_CONTAINERS = [
  { id: 'container-dresser', roomId: 'room-bedroom', name: 'Kommode', icon: '🗄️', kind: 'Skuff', code: 'KOM-001', createdAt: Date.now() - 86400000 * 8 },
  { id: 'container-toolbox', roomId: 'room-storage', name: 'Blå verktøykasse', icon: '🧰', kind: 'Kasse', code: 'VER-002', createdAt: Date.now() - 86400000 * 7 },
  { id: 'container-christmas', roomId: 'room-cellar', name: 'Kasse 4 – jul', icon: '📦', kind: 'Kasse', code: 'JUL-004', createdAt: Date.now() - 86400000 * 6 },
];

const CATEGORY_ALIASES = { Hund: 'Kjæledyr' };
const THEME_LABELS = { light: 'Lys', dark: 'Mørk', system: 'Følg iPhone' };
const ICON_BY_ACTIVITY = { add: 'i-plus', move: 'i-move', edit: 'i-edit', delete: 'i-trash', restore: 'i-restore', favorite: 'i-star' };

function makeId(prefix = 'id') {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeCode(name = 'BOKS') {
  const prefix = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
  return `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
}

function cloneDefaults(list) {
  return list.map((entry) => ({ ...entry }));
}

const starterItems = [
  { id: makeId('item'), name: 'Pass', categoryId: 'cat-documents', roomId: 'room-bedroom', containerId: 'container-dresser', detail: 'Øverste skuff, bak den svarte mappen', notes: 'Begge passene ligger sammen.', tags: ['reise', 'viktig'], visibility: 'home', favorite: true, image: '', createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now() - 3600000 * 3, movedAt: Date.now() - 3600000 * 3 },
  { id: makeId('item'), name: 'Batteridrill', categoryId: 'cat-tools', roomId: 'room-storage', containerId: 'container-toolbox', detail: 'Nederst i kassen', notes: 'Lader og ekstra batteri ligger sammen.', tags: ['verktøy'], visibility: 'home', favorite: false, image: '', createdAt: Date.now() - 86400000 * 7, updatedAt: Date.now() - 3600000 * 20, movedAt: Date.now() - 86400000 * 2 },
  { id: makeId('item'), name: 'Julelys', categoryId: 'cat-electronics', roomId: 'room-cellar', containerId: 'container-christmas', detail: 'Øverst til høyre', notes: '', tags: ['jul', 'vinter'], visibility: 'home', favorite: false, image: '', createdAt: Date.now() - 86400000 * 12, updatedAt: Date.now() - 86400000 * 3, movedAt: Date.now() - 86400000 * 3 },
];

function defaultData() {
  const homeId = makeId('home');
  return {
    version: 4,
    items: starterItems.map((item) => ({ ...item, tags: [...item.tags] })),
    deleted: [],
    recentSearches: [],
    categories: cloneDefaults(DEFAULT_CATEGORIES),
    rooms: cloneDefaults(DEFAULT_ROOMS),
    containers: cloneDefaults(DEFAULT_CONTAINERS),
    activity: starterItems.map((item, index) => ({ id: makeId('activity'), type: 'add', itemId: item.id, itemName: item.name, message: `la til ${item.name}`, actor: 'Deg', at: Date.now() - 3600000 * (index + 2) })),
    home: { id: homeId, name: 'Mitt hjem', members: [{ id: makeId('member'), name: 'Deg', role: 'Eier', status: 'active', owner: true }] },
    settings: { theme: 'light' },
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeData(JSON.parse(raw));
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy) return normalizeData(JSON.parse(legacy));
    }
  } catch (error) {
    console.warn('Kunne ikke lese lagrede data', error);
  }
  return defaultData();
}

function normalizeData(value) {
  const base = defaultData();
  const source = Array.isArray(value) ? { items: value } : (value || {});
  const categories = normalizeCategories(source.categories);
  const rooms = normalizeRooms(source.rooms);
  const rawItems = Array.isArray(source.items) ? source.items : base.items;
  const rawDeleted = Array.isArray(source.deleted) ? source.deleted : [];

  [...rawItems, ...rawDeleted].forEach((item) => {
    const legacyCategory = CATEGORY_ALIASES[item?.category] || item?.category;
    if (legacyCategory && !categories.some((entry) => sameText(entry.name, legacyCategory))) {
      categories.splice(-1, 0, { id: makeId('cat'), name: String(legacyCategory).trim(), icon: '📦', color: '#777d89', protected: false });
    }
    if (item?.room && !rooms.some((entry) => sameText(entry.name, item.room))) {
      rooms.splice(-1, 0, { id: makeId('room'), name: String(item.room).trim(), icon: '📍', protected: false });
    }
  });

  const containers = normalizeContainers(source.containers, rooms);
  [...rawItems, ...rawDeleted].forEach((item) => {
    if (item?.containerId && containers.some((entry) => entry.id === item.containerId)) return;
    const location = String(item?.location || '').trim();
    if (!location) return;
    const room = rooms.find((entry) => entry.id === item.roomId) || rooms.find((entry) => sameText(entry.name, item.room)) || rooms.find((entry) => entry.id === 'room-other');
    let container = containers.find((entry) => entry.roomId === room.id && sameText(entry.name, location));
    if (!container) {
      container = { id: makeId('container'), roomId: room.id, name: location, icon: '📦', kind: 'Annet', code: makeCode(location), createdAt: Number(item.createdAt) || Date.now() };
      containers.push(container);
    }
    item.containerId = container.id;
  });

  const items = rawItems.map((item) => normalizeItem(item, categories, rooms, containers)).filter(Boolean);
  const deleted = rawDeleted.map((item) => normalizeItem(item, categories, rooms, containers)).filter(Boolean);
  const activity = normalizeActivity(source.activity, items);

  return {
    version: 4,
    items,
    deleted,
    recentSearches: Array.isArray(source.recentSearches) ? source.recentSearches.map(String).filter(Boolean).slice(0, 8) : [],
    categories,
    rooms,
    containers,
    activity,
    home: normalizeHome(source.home),
    settings: { theme: ['light', 'dark', 'system'].includes(source?.settings?.theme) ? source.settings.theme : 'light' },
  };
}

function normalizeCategories(value) {
  const entries = Array.isArray(value) ? value : cloneDefaults(DEFAULT_CATEGORIES);
  const result = entries.map((entry) => ({ id: entry?.id || makeId('cat'), name: String(entry?.name || '').trim(), icon: String(entry?.icon || '📦').trim().slice(0, 4) || '📦', color: validColor(entry?.color) ? entry.color : '#777d89', protected: entry?.id === 'cat-other' || Boolean(entry?.protected) })).filter((entry) => entry.name);
  if (!result.some((entry) => entry.id === 'cat-other')) result.push({ ...DEFAULT_CATEGORIES.at(-1) });
  return uniqueByName(result);
}

function normalizeRooms(value) {
  const entries = Array.isArray(value) ? value : cloneDefaults(DEFAULT_ROOMS);
  const result = entries.map((entry) => ({ id: entry?.id || makeId('room'), name: String(entry?.name || '').trim(), icon: String(entry?.icon || '📍').trim().slice(0, 4) || '📍', protected: entry?.id === 'room-other' || Boolean(entry?.protected) })).filter((entry) => entry.name);
  if (!result.some((entry) => entry.id === 'room-other')) result.push({ ...DEFAULT_ROOMS.at(-1) });
  return uniqueByName(result);
}

function normalizeContainers(value, rooms) {
  const entries = Array.isArray(value) ? value : [];
  return entries.map((entry) => ({
    id: entry?.id || makeId('container'),
    roomId: rooms.some((room) => room.id === entry?.roomId) ? entry.roomId : 'room-other',
    name: String(entry?.name || '').trim(),
    icon: String(entry?.icon || '📦').trim().slice(0, 4) || '📦',
    kind: ['Skap', 'Skuff', 'Kasse', 'Hylle', 'Mappe', 'Bag', 'Annet'].includes(entry?.kind) ? entry.kind : 'Annet',
    code: String(entry?.code || makeCode(entry?.name)).trim().toUpperCase(),
    createdAt: Number(entry?.createdAt) || Date.now(),
  })).filter((entry) => entry.name);
}

function normalizeItem(item, categories, rooms, containers) {
  if (!item?.name) return null;
  const legacyCategory = CATEGORY_ALIASES[item.category] || item.category;
  const category = categories.find((entry) => entry.id === item.categoryId) || categories.find((entry) => sameText(entry.name, legacyCategory)) || categories.find((entry) => entry.id === 'cat-other');
  const room = rooms.find((entry) => entry.id === item.roomId) || rooms.find((entry) => sameText(entry.name, item.room)) || rooms.find((entry) => entry.id === 'room-other');
  const container = containers.find((entry) => entry.id === item.containerId && entry.roomId === room.id);
  const tags = Array.isArray(item.tags) ? item.tags : String(item.tags || '').split(',');
  return {
    id: item.id || makeId('item'), name: String(item.name).trim(), categoryId: category.id, roomId: room.id,
    containerId: container?.id || '', detail: String(item.detail ?? '').trim(), notes: String(item.notes ?? '').trim(),
    tags: [...new Set(tags.map((tag) => String(tag).trim().replace(/^#/, '')).filter(Boolean))].slice(0, 12),
    visibility: item.visibility === 'private' || item.private ? 'private' : 'home', favorite: Boolean(item.favorite),
    image: typeof item.image === 'string' ? item.image : '', createdAt: Number(item.createdAt) || Date.now(),
    updatedAt: Number(item.updatedAt) || Date.now(), movedAt: Number(item.movedAt) || Number(item.updatedAt) || Date.now(), deletedAt: Number(item.deletedAt) || 0,
  };
}

function normalizeActivity(value, items) {
  if (Array.isArray(value) && value.length) {
    return value.map((entry) => ({ id: entry?.id || makeId('activity'), type: ICON_BY_ACTIVITY[entry?.type] ? entry.type : 'edit', itemId: String(entry?.itemId || ''), itemName: String(entry?.itemName || ''), message: String(entry?.message || 'oppdaterte en ting'), actor: String(entry?.actor || 'Deg'), at: Number(entry?.at) || Date.now() })).slice(0, 150);
  }
  return items.slice(0, 20).map((item) => ({ id: makeId('activity'), type: 'add', itemId: item.id, itemName: item.name, message: `la til ${item.name}`, actor: 'Deg', at: item.createdAt }));
}

function normalizeHome(value) {
  const members = Array.isArray(value?.members) ? value.members.map((member, index) => ({ id: member?.id || makeId('member'), name: String(member?.name || '').trim() || `Medlem ${index + 1}`, role: ['Eier', 'Medlem', 'Lesetilgang'].includes(member?.role) ? member.role : 'Medlem', status: member?.status === 'invited' ? 'invited' : 'active', owner: Boolean(member?.owner) || index === 0 })) : [{ id: makeId('member'), name: 'Deg', role: 'Eier', status: 'active', owner: true }];
  return { id: value?.id || makeId('home'), name: String(value?.name || 'Mitt hjem').trim() || 'Mitt hjem', members: members.length ? members : [{ id: makeId('member'), name: 'Deg', role: 'Eier', status: 'active', owner: true }] };
}

function uniqueByName(entries) {
  const seen = new Set();
  return entries.filter((entry) => { const key = normalizeText(entry.name); if (seen.has(key)) return false; seen.add(key); return true; });
}
function validColor(value) { return /^#[0-9a-f]{6}$/i.test(String(value || '')); }
function sameText(a, b) { return normalizeText(a) === normalizeText(b); }
function normalizeText(value) { return String(value ?? '').trim().toLocaleLowerCase('nb-NO'); }
function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
