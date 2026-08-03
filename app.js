const STORAGE_KEY = 'hvor-er-den-data-v3';
const LEGACY_KEYS = ['hvor-er-den-data-v2', 'hvor-er-den-items-v1'];

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

const CATEGORY_ALIASES = { Hund: 'Kjæledyr' };
const THEME_LABELS = { light: 'Lys', dark: 'Mørk', system: 'Følg iPhone' };

function makeId(prefix = 'id') {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneDefaults(list) {
  return list.map((entry) => ({ ...entry }));
}

const starterItems = [
  {
    id: makeId('item'), name: 'Pass', categoryId: 'cat-documents', roomId: 'room-bedroom',
    location: 'Kommode', detail: 'Øverste skuff', notes: 'Bak den svarte mappen.',
    favorite: true, image: '', createdAt: Date.now() - 1000 * 60 * 60 * 30, updatedAt: Date.now() - 1000 * 60 * 60 * 3,
  },
  {
    id: makeId('item'), name: 'Batteridrill', categoryId: 'cat-tools', roomId: 'room-storage',
    location: 'Verktøykasse', detail: 'Blå kasse', notes: 'Lader og ekstra batteri ligger sammen.',
    favorite: false, image: '', createdAt: Date.now() - 1000 * 60 * 60 * 70, updatedAt: Date.now() - 1000 * 60 * 60 * 20,
  },
  {
    id: makeId('item'), name: 'Julelys', categoryId: 'cat-electronics', roomId: 'room-cellar',
    location: 'Kasse 4', detail: 'Grå plastkasse', notes: '',
    favorite: false, image: '', createdAt: Date.now() - 1000 * 60 * 60 * 120, updatedAt: Date.now() - 1000 * 60 * 60 * 44,
  },
];

function defaultData() {
  return {
    version: 3,
    items: starterItems,
    deleted: [],
    recentSearches: [],
    categories: cloneDefaults(DEFAULT_CATEGORIES),
    rooms: cloneDefaults(DEFAULT_ROOMS),
    home: {
      id: makeId('home'),
      name: 'Mitt hjem',
      members: [{ id: makeId('member'), name: 'Deg', role: 'Eier', status: 'active', owner: true }],
    },
    settings: { theme: 'light' },
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeData(JSON.parse(raw));

    for (const key of LEGACY_KEYS) {
      const legacyRaw = localStorage.getItem(key);
      if (!legacyRaw) continue;
      const parsed = JSON.parse(legacyRaw);
      return normalizeData(Array.isArray(parsed) ? { items: parsed } : parsed);
    }
  } catch (error) {
    console.warn('Kunne ikke lese lagrede data', error);
  }
  return defaultData();
}

function normalizeData(value) {
  const base = defaultData();
  const rawItems = Array.isArray(value?.items) ? value.items : base.items;
  const rawDeleted = Array.isArray(value?.deleted) ? value.deleted : [];

  const categories = normalizeCategories(value?.categories);
  const rooms = normalizeRooms(value?.rooms);

  [...rawItems, ...rawDeleted].forEach((item) => {
    const legacyCategory = CATEGORY_ALIASES[item?.category] || item?.category;
    if (legacyCategory && !categories.some((category) => sameText(category.name, legacyCategory))) {
      categories.splice(-1, 0, {
        id: makeId('cat'), name: String(legacyCategory).trim(), icon: '📦', color: '#777d89', protected: false,
      });
    }
    if (item?.room && !rooms.some((room) => sameText(room.name, item.room))) {
      rooms.splice(-1, 0, { id: makeId('room'), name: String(item.room).trim(), icon: '📍', protected: false });
    }
  });

  const items = rawItems.map((item) => normalizeItem(item, categories, rooms)).filter(Boolean);
  const deleted = rawDeleted.map((item) => normalizeItem(item, categories, rooms)).filter(Boolean);
  const recentSearches = Array.isArray(value?.recentSearches)
    ? value.recentSearches.map(String).filter(Boolean).slice(0, 8)
    : [];

  return {
    version: 3,
    items,
    deleted,
    recentSearches,
    categories,
    rooms,
    home: normalizeHome(value?.home),
    settings: { theme: ['light', 'dark', 'system'].includes(value?.settings?.theme) ? value.settings.theme : 'light' },
  };
}

function normalizeCategories(value) {
  const categories = Array.isArray(value)
    ? value.map((entry) => ({
        id: entry?.id || makeId('cat'),
        name: String(entry?.name || '').trim(),
        icon: String(entry?.icon || '📦').trim().slice(0, 4) || '📦',
        color: validColor(entry?.color) ? entry.color : '#777d89',
        protected: entry?.id === 'cat-other' || Boolean(entry?.protected),
      })).filter((entry) => entry.name)
    : cloneDefaults(DEFAULT_CATEGORIES);
  if (!categories.some((entry) => entry.id === 'cat-other')) categories.push({ ...DEFAULT_CATEGORIES.at(-1) });
  return uniqueByName(categories);
}

function normalizeRooms(value) {
  const rooms = Array.isArray(value)
    ? value.map((entry) => ({
        id: entry?.id || makeId('room'),
        name: String(entry?.name || '').trim(),
        icon: String(entry?.icon || '📍').trim().slice(0, 4) || '📍',
        protected: entry?.id === 'room-other' || Boolean(entry?.protected),
      })).filter((entry) => entry.name)
    : cloneDefaults(DEFAULT_ROOMS);
  if (!rooms.some((entry) => entry.id === 'room-other')) rooms.push({ ...DEFAULT_ROOMS.at(-1) });
  return uniqueByName(rooms);
}

function normalizeHome(value) {
  const members = Array.isArray(value?.members)
    ? value.members.map((member, index) => ({
        id: member?.id || makeId('member'),
        name: String(member?.name || '').trim() || `Medlem ${index + 1}`,
        role: ['Eier', 'Medlem', 'Lesetilgang'].includes(member?.role) ? member.role : 'Medlem',
        status: member?.status === 'invited' ? 'invited' : 'active',
        owner: Boolean(member?.owner) || index === 0,
      }))
    : [{ id: makeId('member'), name: 'Deg', role: 'Eier', status: 'active', owner: true }];
  if (!members.length) members.push({ id: makeId('member'), name: 'Deg', role: 'Eier', status: 'active', owner: true });
  return { id: value?.id || makeId('home'), name: String(value?.name || 'Mitt hjem').trim() || 'Mitt hjem', members };
}

function normalizeItem(item, categories, rooms) {
  if (!item?.name || !item?.location) return null;
  const legacyCategory = CATEGORY_ALIASES[item.category] || item.category;
  const category = categories.find((entry) => entry.id === item.categoryId)
    || categories.find((entry) => sameText(entry.name, legacyCategory))
    || categories.find((entry) => entry.id === 'cat-other');
  const room = rooms.find((entry) => entry.id === item.roomId)
    || rooms.find((entry) => sameText(entry.name, item.room))
    || rooms.find((entry) => entry.id === 'room-other');

  return {
    id: item.id || makeId('item'),
    name: String(item.name).trim(),
    categoryId: category.id,
    roomId: room.id,
    location: String(item.location).trim(),
    detail: String(item.detail ?? '').trim(),
    notes: String(item.notes ?? '').trim(),
    favorite: Boolean(item.favorite),
    image: typeof item.image === 'string' ? item.image : '',
    createdAt: Number(item.createdAt) || Date.now(),
    updatedAt: Number(item.updatedAt) || Date.now(),
    deletedAt: Number(item.deletedAt) || 0,
  };
}

function uniqueByName(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = normalizeText(entry.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || ''));
}

function sameText(a, b) {
  return normalizeText(a) === normalizeText(b);
}

const state = {
  data: loadData(),
  screen: 'home',
  previousScreen: 'home',
  query: '',
  categoryId: '',
  selectedRoomId: '',
  detailId: null,
  formImage: '',
  deferredInstallPrompt: null,
  manager: '',
};

const el = {
  tabBar: document.querySelector('.tab-bar'),
  recentItems: document.querySelector('#recent-items'),
  homeRooms: document.querySelector('#home-rooms'),
  homeSwitcherName: document.querySelector('#home-switcher-name'),
  searchInput: document.querySelector('#search-input'),
  clearSearch: document.querySelector('#clear-search'),
  categoryList: document.querySelector('#category-list'),
  clearCategory: document.querySelector('#clear-category'),
  searchResults: document.querySelector('#search-results'),
  searchEmpty: document.querySelector('#search-empty'),
  searchResultsTitle: document.querySelector('#search-results-title'),
  searchResultsCount: document.querySelector('#search-results-count'),
  recentSearches: document.querySelector('#recent-searches'),
  recentSearchSection: document.querySelector('#recent-search-section'),
  clearRecentSearches: document.querySelector('#clear-recent-searches'),
  itemForm: document.querySelector('#item-form'),
  itemId: document.querySelector('#item-id'),
  itemName: document.querySelector('#item-name'),
  itemCategory: document.querySelector('#item-category'),
  itemRoom: document.querySelector('#item-room'),
  itemLocation: document.querySelector('#item-location'),
  itemDetail: document.querySelector('#item-detail'),
  itemNotes: document.querySelector('#item-notes'),
  itemFavorite: document.querySelector('#item-favorite'),
  itemImage: document.querySelector('#item-image'),
  photoPreview: document.querySelector('#photo-preview'),
  addTitle: document.querySelector('#add-title'),
  roomList: document.querySelector('#room-list'),
  roomsEmpty: document.querySelector('#rooms-empty'),
  profileHomeName: document.querySelector('#profile-home-name'),
  homeMembersPreview: document.querySelector('#home-members-preview'),
  categoryCount: document.querySelector('#category-count'),
  roomCount: document.querySelector('#room-count'),
  themeLabel: document.querySelector('#theme-label'),
  favoriteCount: document.querySelector('#favorite-count'),
  trashCount: document.querySelector('#trash-count'),
  detailSheet: document.querySelector('#detail-sheet'),
  detailBody: document.querySelector('#detail-body'),
  detailMore: document.querySelector('#detail-more'),
  listSheet: document.querySelector('#list-sheet'),
  listSheetTitle: document.querySelector('#list-sheet-title'),
  listSheetContent: document.querySelector('#list-sheet-content'),
  settingsSheet: document.querySelector('#settings-sheet'),
  settingsSheetTitle: document.querySelector('#settings-sheet-title'),
  settingsSheetContent: document.querySelector('#settings-sheet-content'),
  entityDialog: document.querySelector('#entity-dialog'),
  entityForm: document.querySelector('#entity-form'),
  entityType: document.querySelector('#entity-type'),
  entityId: document.querySelector('#entity-id'),
  entityName: document.querySelector('#entity-name'),
  entityIcon: document.querySelector('#entity-icon'),
  entityColor: document.querySelector('#entity-color'),
  entityColorField: document.querySelector('#entity-color-field'),
  entityOverline: document.querySelector('#entity-overline'),
  entityTitle: document.querySelector('#entity-title'),
  entityDelete: document.querySelector('#entity-delete'),
  alertDialog: document.querySelector('#alert-dialog'),
  alertTitle: document.querySelector('#alert-title'),
  alertCopy: document.querySelector('#alert-copy'),
  alertActions: document.querySelector('#alert-actions'),
  toast: document.querySelector('#toast'),
  importData: document.querySelector('#import-data'),
  themeMeta: document.querySelector('meta[name="theme-color"]'),
};

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  } catch (error) {
    console.error(error);
    showToast('Lagringen er full. Prøv å fjerne noen bilder.');
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeText(value) {
  return String(value ?? '').trim().toLocaleLowerCase('nb-NO');
}

function getCategory(id) {
  if (!id) return null;
  return state.data.categories.find((entry) => entry.id === id) || state.data.categories.find((entry) => entry.id === 'cat-other');
}

function getRoom(id) {
  if (!id) return null;
  return state.data.rooms.find((entry) => entry.id === id) || state.data.rooms.find((entry) => entry.id === 'room-other');
}

function categoryCount(id, includeDeleted = false) {
  const items = includeDeleted ? [...state.data.items, ...state.data.deleted] : state.data.items;
  return items.filter((item) => item.categoryId === id).length;
}

function roomCount(id, includeDeleted = false) {
  const items = includeDeleted ? [...state.data.items, ...state.data.deleted] : state.data.items;
  return items.filter((item) => item.roomId === id).length;
}

function getLocationLine(item) {
  return [getRoom(item.roomId)?.name, item.location].filter(Boolean).join(' · ');
}

function getDetailLine(item) {
  return item.detail || item.notes || getCategory(item.categoryId)?.name || 'Annet';
}

function thumbHtml(item) {
  if (item.image) return `<span class="item-thumb"><img src="${item.image}" alt="" /></span>`;
  return `<span class="item-thumb">${escapeHtml(getCategory(item.categoryId)?.icon || '📦')}</span>`;
}

function itemRowHtml(item, options = {}) {
  const action = options.action || 'detail';
  const trailing = options.trailing || (item.favorite
    ? '<span class="row-favorite"><svg><use href="#i-star" /></svg></span>'
    : '<span class="row-chevron"><svg><use href="#i-chevron" /></svg></span>');
  return `
    <button class="item-row" type="button" data-item-id="${escapeHtml(item.id)}" data-item-action="${action}">
      ${thumbHtml(item)}
      <span class="item-copy">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(getLocationLine(item))}</span>
        <span>${escapeHtml(getDetailLine(item))}</span>
      </span>
      ${trailing}
    </button>`;
}

function applyTheme() {
  const preference = state.data.settings.theme;
  const resolved = preference === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;
  document.documentElement.dataset.theme = resolved;
  el.themeMeta.content = resolved === 'dark' ? '#0b0d12' : '#f6f5fa';
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').content = resolved === 'dark' ? 'black-translucent' : 'default';
}

function renderSelects(selectedCategoryId = el.itemCategory.value, selectedRoomId = el.itemRoom.value) {
  el.itemCategory.innerHTML = state.data.categories
    .map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.icon)} ${escapeHtml(category.name)}</option>`)
    .join('');
  el.itemRoom.innerHTML = state.data.rooms
    .map((room) => `<option value="${escapeHtml(room.id)}">${escapeHtml(room.icon)} ${escapeHtml(room.name)}</option>`)
    .join('');
  if (state.data.categories.some((entry) => entry.id === selectedCategoryId)) el.itemCategory.value = selectedCategoryId;
  if (state.data.rooms.some((entry) => entry.id === selectedRoomId)) el.itemRoom.value = selectedRoomId;
}

function navigate(screen, options = {}) {
  if (!['home', 'search', 'add', 'rooms', 'profile'].includes(screen)) return;
  if (screen === 'add' && !options.preserveForm) openNewForm();

  state.previousScreen = state.screen === 'add' ? state.previousScreen : state.screen;
  state.screen = screen;
  document.querySelectorAll('.screen').forEach((section) => section.classList.toggle('is-active', section.dataset.screen === screen));
  document.querySelectorAll('.tab-button').forEach((button) => button.classList.toggle('is-active', button.dataset.nav === screen));
  el.tabBar.hidden = screen === 'add';
  window.scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' });

  if (screen === 'home') renderHome();
  if (screen === 'search') {
    renderSearch();
    requestAnimationFrame(() => options.focusSearch && el.searchInput.focus());
  }
  if (screen === 'rooms') renderRooms();
  if (screen === 'profile') renderProfile();
}

function renderHome() {
  el.homeSwitcherName.textContent = state.data.home.name;
  const recent = [...state.data.items].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
  el.recentItems.innerHTML = recent.length
    ? recent.map((item) => itemRowHtml(item)).join('')
    : emptyInline('Ingen ting ennå', 'Legg til den første tingen din.');

  const rooms = getRoomsWithCounts().filter(({ count }) => count > 0).slice(0, 6);
  el.homeRooms.innerHTML = rooms.length
    ? rooms.map(({ room, count }) => `
        <button class="room-card" type="button" data-room-id="${escapeHtml(room.id)}">
          <span class="room-card__icon">${escapeHtml(room.icon)}</span>
          <span><strong>${escapeHtml(room.name)}</strong><small>${count} ${count === 1 ? 'ting' : 'ting'}</small></span>
        </button>`).join('')
    : '';
}

function getRoomsWithCounts() {
  return state.data.rooms
    .map((room) => ({ room, count: roomCount(room.id) }))
    .sort((a, b) => b.count - a.count || a.room.name.localeCompare(b.room.name, 'nb-NO'));
}

function filteredItems() {
  const query = normalizeText(state.query);
  return [...state.data.items]
    .filter((item) => {
      const category = getCategory(item.categoryId);
      const room = getRoom(item.roomId);
      const matchesCategory = !state.categoryId || item.categoryId === state.categoryId;
      const matchesRoom = !state.selectedRoomId || item.roomId === state.selectedRoomId;
      const haystack = normalizeText([item.name, category?.name, room?.name, item.location, item.detail, item.notes].join(' '));
      return matchesCategory && matchesRoom && (!query || haystack.includes(query));
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function renderSearch() {
  el.searchInput.value = state.query;
  el.clearSearch.hidden = !state.query;
  el.clearCategory.hidden = !state.categoryId && !state.selectedRoomId;

  el.categoryList.innerHTML = state.data.categories.map((category) => {
    const count = categoryCount(category.id);
    return `
      <button class="category-button ${state.categoryId === category.id ? 'is-active' : ''}" type="button" data-category-id="${escapeHtml(category.id)}" style="--category-color:${category.color}">
        <span class="category-dot">${escapeHtml(category.icon)}</span>
        <strong>${escapeHtml(category.name)}</strong>
        <small>${count}</small>
      </button>`;
  }).join('');

  const items = filteredItems();
  const selectedCategory = getCategory(state.categoryId);
  const selectedRoom = getRoom(state.selectedRoomId);
  el.searchResultsTitle.textContent = selectedRoom?.name || selectedCategory?.name || (state.query ? `Treff på «${state.query}»` : 'Alle ting');
  el.searchResultsCount.textContent = `${items.length}`;
  el.searchResults.hidden = items.length === 0;
  el.searchEmpty.hidden = items.length !== 0;
  el.searchResults.innerHTML = items.map((item) => itemRowHtml(item)).join('');

  el.recentSearchSection.hidden = Boolean(state.query || state.categoryId || state.selectedRoomId) || !state.data.recentSearches.length;
  el.recentSearches.innerHTML = state.data.recentSearches
    .map((term) => `<button class="recent-chip" type="button" data-recent-search="${escapeHtml(term)}">${escapeHtml(term)}</button>`)
    .join('');
}

function renderRooms() {
  const rows = getRoomsWithCounts();
  el.roomsEmpty.hidden = rows.length !== 0;
  el.roomList.hidden = rows.length === 0;
  el.roomList.innerHTML = rows.map(({ room, count }) => `
    <article class="room-row">
      <span class="room-row__icon">${escapeHtml(room.icon)}</span>
      <button class="room-row__main" type="button" data-room-id="${escapeHtml(room.id)}">
        <strong>${escapeHtml(room.name)}</strong><span>${count} ${count === 1 ? 'ting' : 'ting'}</span>
      </button>
      <button class="row-edit-button" type="button" data-edit-entity="room" data-entity-id="${escapeHtml(room.id)}" aria-label="Rediger ${escapeHtml(room.name)}"><svg><use href="#i-edit" /></svg></button>
      <svg class="chevron"><use href="#i-chevron" /></svg>
    </article>`).join('');
}

function renderProfile() {
  el.profileHomeName.textContent = state.data.home.name;
  const members = state.data.home.members;
  el.homeMembersPreview.innerHTML = `${members.slice(0, 4).map((member) => `<span class="member-avatar" title="${escapeHtml(member.name)}">${escapeHtml(initials(member.name))}</span>`).join('')}<span class="member-summary">${members.length} ${members.length === 1 ? 'medlem' : 'medlemmer'}</span>`;
  el.categoryCount.textContent = state.data.categories.length;
  el.roomCount.textContent = state.data.rooms.length;
  el.themeLabel.textContent = THEME_LABELS[state.data.settings.theme];
  el.favoriteCount.textContent = state.data.items.filter((item) => item.favorite).length;
  el.trashCount.textContent = state.data.deleted.length;
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

function openNewForm() {
  el.itemForm.reset();
  el.itemId.value = '';
  el.addTitle.textContent = 'Legg til ting';
  state.formImage = '';
  renderSelects('cat-other', state.data.rooms[0]?.id || 'room-other');
  renderPhotoPreview();
}

function openEditForm(id) {
  const item = state.data.items.find((entry) => entry.id === id);
  if (!item) return;
  state.previousScreen = state.screen;
  el.itemId.value = item.id;
  el.itemName.value = item.name;
  renderSelects(item.categoryId, item.roomId);
  el.itemLocation.value = item.location;
  el.itemDetail.value = item.detail;
  el.itemNotes.value = item.notes;
  el.itemFavorite.checked = item.favorite;
  state.formImage = item.image;
  el.addTitle.textContent = 'Rediger ting';
  renderPhotoPreview();
  if (el.detailSheet.open) el.detailSheet.close();
  navigate('add', { preserveForm: true, instant: true });
}

function renderPhotoPreview() {
  el.photoPreview.classList.toggle('has-image', Boolean(state.formImage));
  el.photoPreview.innerHTML = state.formImage
    ? `<img src="${state.formImage}" alt="Forhåndsvisning" />`
    : '<svg><use href="#i-camera" /></svg><span>Legg til bilde</span>';
}

async function resizeImage(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
  const max = 1000;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', .76);
}

function saveItem(event) {
  event.preventDefault();
  if (!el.itemForm.reportValidity()) return;
  const now = Date.now();
  const id = el.itemId.value;
  const existing = state.data.items.find((item) => item.id === id);
  const item = {
    id: id || makeId('item'),
    name: el.itemName.value.trim(),
    categoryId: el.itemCategory.value,
    roomId: el.itemRoom.value,
    location: el.itemLocation.value.trim(),
    detail: el.itemDetail.value.trim(),
    notes: el.itemNotes.value.trim(),
    favorite: el.itemFavorite.checked,
    image: state.formImage,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deletedAt: 0,
  };
  if (existing) state.data.items = state.data.items.map((entry) => entry.id === id ? item : entry);
  else state.data.items.unshift(item);
  saveData();
  renderAll();
  navigate('home', { instant: true });
  showToast(existing ? `${item.name} er oppdatert` : `${item.name} er lagret`);
}

function openDetail(id) {
  const item = state.data.items.find((entry) => entry.id === id);
  if (!item) return;
  state.detailId = id;
  const category = getCategory(item.categoryId);
  const room = getRoom(item.roomId);
  el.detailBody.innerHTML = `
    <div class="detail-image">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" />` : escapeHtml(category.icon)}</div>
    <div class="detail-title-row"><h1>${escapeHtml(item.name)}</h1><button class="favorite-button ${item.favorite ? 'is-active' : ''}" type="button" data-detail-action="favorite" aria-label="Favoritt"><svg><use href="#i-star" /></svg></button></div>
    <dl class="detail-fields">
      <div class="detail-field"><dt>Kategori</dt><dd><span class="detail-category" style="color:${category.color};background:${category.color}1f">${escapeHtml(category.icon)} ${escapeHtml(category.name)}</span></dd></div>
      <div class="detail-field"><dt>Rom</dt><dd>${escapeHtml(room.icon)} ${escapeHtml(room.name)}</dd></div>
      <div class="detail-field"><dt>Plassering</dt><dd>${escapeHtml(item.location)}</dd></div>
      ${item.detail ? `<div class="detail-field"><dt>Detalj</dt><dd>${escapeHtml(item.detail)}</dd></div>` : ''}
      ${item.notes ? `<div class="detail-field"><dt>Notat</dt><dd>${escapeHtml(item.notes)}</dd></div>` : ''}
    </dl>
    <div class="detail-actions">
      <button class="primary-button" type="button" data-detail-action="copy"><svg><use href="#i-copy" /></svg>Kopier plassering</button>
      <button class="secondary-button" type="button" data-detail-action="share"><svg><use href="#i-share" /></svg>Del</button>
      <button class="secondary-button" type="button" data-detail-action="edit"><svg><use href="#i-edit" /></svg>Rediger</button>
      <button class="danger-button" type="button" data-detail-action="delete"><svg><use href="#i-trash" /></svg>Slett</button>
    </div>`;
  if (!el.detailSheet.open) el.detailSheet.showModal();
}

function toggleFavorite(id) {
  const item = state.data.items.find((entry) => entry.id === id);
  if (!item) return;
  item.favorite = !item.favorite;
  item.updatedAt = Date.now();
  saveData();
  openDetail(id);
  renderAll();
}

function itemShareText(item) {
  return `${item.name}: ${getRoom(item.roomId).name} → ${item.location}${item.detail ? ` → ${item.detail}` : ''}`;
}

async function copyItem(id) {
  const item = state.data.items.find((entry) => entry.id === id);
  if (!item) return;
  try {
    await navigator.clipboard.writeText(itemShareText(item));
    showToast('Plasseringen er kopiert');
  } catch {
    showToast(itemShareText(item));
  }
}

async function shareItem(id) {
  const item = state.data.items.find((entry) => entry.id === id);
  if (!item) return;
  const text = itemShareText(item);
  if (navigator.share) {
    try { await navigator.share({ title: item.name, text }); } catch (error) { if (error.name !== 'AbortError') showToast('Kunne ikke dele'); }
  } else copyItem(id);
}

function requestDelete(id) {
  const item = state.data.items.find((entry) => entry.id === id);
  if (!item) return;
  showAlert({
    title: `Slette ${item.name}?`,
    html: '<p>Tingen flyttes til «Nylig slettet» og kan gjenopprettes.</p>',
    actions: `<button class="secondary-button" type="button" data-close-alert>Avbryt</button><button class="danger-button" type="button" data-confirm-delete="${escapeHtml(id)}">Slett</button>`,
  });
}

function deleteItem(id) {
  const item = state.data.items.find((entry) => entry.id === id);
  if (!item) return;
  state.data.items = state.data.items.filter((entry) => entry.id !== id);
  state.data.deleted.unshift({ ...item, deletedAt: Date.now() });
  saveData();
  el.alertDialog.close();
  el.detailSheet.close();
  renderAll();
  showToast(`${item.name} er flyttet til nylig slettet`);
}

function restoreItem(id) {
  const item = state.data.deleted.find((entry) => entry.id === id);
  if (!item) return;
  state.data.deleted = state.data.deleted.filter((entry) => entry.id !== id);
  state.data.items.unshift({ ...item, deletedAt: 0, updatedAt: Date.now() });
  saveData();
  openListSheet('Nylig slettet', state.data.deleted, 'restore');
  renderAll();
  showToast(`${item.name} er gjenopprettet`);
}

function openListSheet(title, items, action = 'detail') {
  el.listSheetTitle.textContent = title;
  el.listSheetContent.innerHTML = items.length
    ? items.map((item) => itemRowHtml(item, {
        action,
        trailing: action === 'restore' ? '<span class="row-chevron"><svg><use href="#i-restore" /></svg></span>' : undefined,
      })).join('')
    : emptyInline('Ingenting her', action === 'restore' ? 'Slettede ting vises her.' : 'Ingen favoritter ennå.');
  if (!el.listSheet.open) el.listSheet.showModal();
}

function emptyInline(title, copy) {
  return `<div class="empty-state"><div class="empty-state__icon"><svg><use href="#i-box" /></svg></div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></div>`;
}

function addRecentSearch(term) {
  const clean = term.trim();
  if (clean.length < 2) return;
  state.data.recentSearches = [clean, ...state.data.recentSearches.filter((entry) => !sameText(entry, clean))].slice(0, 8);
  saveData();
}

function openManager(type) {
  state.manager = type;
  renderManager();
  if (!el.settingsSheet.open) el.settingsSheet.showModal();
}

function renderManager() {
  if (state.manager === 'categories') renderCategoryManager();
  if (state.manager === 'rooms') renderRoomManager();
  if (state.manager === 'appearance') renderAppearanceManager();
  if (state.manager === 'home') renderHomeManager();
}

function renderCategoryManager() {
  el.settingsSheetTitle.textContent = 'Kategorier';
  el.settingsSheetContent.innerHTML = `
    <div class="manager-header-card"><strong>Tilpass kategoriene</strong><p>Alle i hjemmet skal senere se de samme kategoriene. Sletting flytter ting til «Annet».</p></div>
    <button class="manager-add-button" type="button" data-add-entity="category"><svg><use href="#i-plus" /></svg>Ny kategori</button>
    <div class="manager-list">${state.data.categories.map((category) => `
      <button class="manager-row" type="button" data-edit-entity="category" data-entity-id="${escapeHtml(category.id)}">
        <span class="manager-row__icon" style="background:${category.color}1f">${escapeHtml(category.icon)}</span>
        <span><strong>${escapeHtml(category.name)}</strong><small>${category.protected ? 'Standardkategori' : 'Trykk for å redigere'}</small></span>
        <span class="manager-row__count">${categoryCount(category.id)}</span><svg class="chevron"><use href="#i-chevron" /></svg>
      </button>`).join('')}</div>`;
}

function renderRoomManager() {
  el.settingsSheetTitle.textContent = 'Rom og steder';
  el.settingsSheetContent.innerHTML = `
    <div class="manager-header-card"><strong>Bygg opp hjemmet</strong><p>Rom kan også være «Garasje», «Hytta», «Hos mamma» eller andre steder.</p></div>
    <button class="manager-add-button" type="button" data-add-entity="room"><svg><use href="#i-plus" /></svg>Nytt rom eller sted</button>
    <div class="manager-list">${state.data.rooms.map((room) => `
      <button class="manager-row" type="button" data-edit-entity="room" data-entity-id="${escapeHtml(room.id)}">
        <span class="manager-row__icon">${escapeHtml(room.icon)}</span>
        <span><strong>${escapeHtml(room.name)}</strong><small>${room.protected ? 'Standardplassering' : 'Trykk for å redigere'}</small></span>
        <span class="manager-row__count">${roomCount(room.id)}</span><svg class="chevron"><use href="#i-chevron" /></svg>
      </button>`).join('')}</div>`;
}

function renderAppearanceManager() {
  el.settingsSheetTitle.textContent = 'Utseende';
  const options = [
    { id: 'light', title: 'Lys', copy: 'Hvit og rolig som standard', icon: '☀️' },
    { id: 'dark', title: 'Mørk', copy: 'Mørk bakgrunn og lyse kort', icon: '🌙' },
    { id: 'system', title: 'Følg iPhone', copy: 'Bytter automatisk med telefonen', icon: '◐' },
  ];
  el.settingsSheetContent.innerHTML = `<div class="manager-header-card"><strong>Velg tema</strong><p>Valget lagres på denne enheten.</p></div><div class="theme-options">${options.map((option) => `
    <button class="theme-option ${state.data.settings.theme === option.id ? 'is-active' : ''}" type="button" data-theme-choice="${option.id}">
      <span class="theme-preview">${option.icon}</span><span><strong>${option.title}</strong><small>${option.copy}</small></span><svg class="theme-check"><use href="#i-check" /></svg>
    </button>`).join('')}</div>`;
}

function renderHomeManager() {
  el.settingsSheetTitle.textContent = 'Hjem og medlemmer';
  const members = state.data.home.members;
  el.settingsSheetContent.innerHTML = `
    <div class="manager-header-card"><strong>Felles hjem</strong><p>Dette er lokal produktprototype. Ekte invitasjoner og synkronisering krever konto og skylagring.</p></div>
    <form class="home-settings-form" id="home-name-form">
      <label class="field"><span>Navn på hjemmet</span><input id="home-name-input" type="text" maxlength="50" value="${escapeHtml(state.data.home.name)}" required /></label>
      <button class="primary-small-button" type="submit">Lagre navn</button>
    </form>
    <span class="card-overline">MEDLEMMER</span>
    <div class="member-list">${members.map((member) => `
      <div class="member-row"><span class="member-avatar">${escapeHtml(initials(member.name))}</span><span><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.role)}${member.status === 'invited' ? ' · Invitert i prototypen' : ''}</small></span>${member.owner ? '<span class="settings-meta">Eier</span>' : `<button class="member-remove" type="button" data-remove-member="${escapeHtml(member.id)}">Fjern</button>`}</div>`).join('')}</div>
    <span class="card-overline">INVITER</span>
    <form class="invite-form" id="invite-form"><input id="invite-name" type="text" maxlength="60" placeholder="Navn eller e-post" required /><button class="primary-small-button" type="submit">Legg til</button></form>
    <p class="invite-note">Invitasjonen lagres bare i prototypen nå. Ingen får tilgang før innlogging og backend er koblet på.</p>`;
}

function openEntityDialog(type, id = '') {
  const isCategory = type === 'category';
  const list = isCategory ? state.data.categories : state.data.rooms;
  const entity = list.find((entry) => entry.id === id);
  el.entityType.value = type;
  el.entityId.value = entity?.id || '';
  el.entityName.value = entity?.name || '';
  el.entityIcon.value = entity?.icon || (isCategory ? '📦' : '📍');
  el.entityColor.value = entity?.color || '#8b5cf6';
  el.entityColorField.hidden = !isCategory;
  el.entityOverline.textContent = entity ? 'REDIGER' : 'NY';
  el.entityTitle.textContent = entity ? entity.name : (isCategory ? 'Ny kategori' : 'Nytt rom');
  el.entityDelete.hidden = !entity || entity.protected;
  if (!el.entityDialog.open) el.entityDialog.showModal();
  requestAnimationFrame(() => el.entityName.focus());
}

function saveEntity(event) {
  event.preventDefault();
  if (!el.entityForm.reportValidity()) return;
  const type = el.entityType.value;
  const isCategory = type === 'category';
  const list = isCategory ? state.data.categories : state.data.rooms;
  const id = el.entityId.value;
  const name = el.entityName.value.trim();
  if (list.some((entry) => entry.id !== id && sameText(entry.name, name))) {
    showToast('Navnet finnes allerede');
    return;
  }
  const entity = list.find((entry) => entry.id === id);
  if (entity) {
    entity.name = name;
    entity.icon = el.entityIcon.value.trim().slice(0, 4) || (isCategory ? '📦' : '📍');
    if (isCategory) entity.color = el.entityColor.value;
  } else {
    const newEntity = {
      id: makeId(isCategory ? 'cat' : 'room'),
      name,
      icon: el.entityIcon.value.trim().slice(0, 4) || (isCategory ? '📦' : '📍'),
      protected: false,
      ...(isCategory ? { color: el.entityColor.value } : {}),
    };
    const protectedIndex = list.findIndex((entry) => entry.protected);
    list.splice(protectedIndex >= 0 ? protectedIndex : list.length, 0, newEntity);
  }
  saveData();
  renderSelects();
  renderAll();
  renderManager();
  el.entityDialog.close();
  showToast(entity ? 'Endringen er lagret' : `${isCategory ? 'Kategori' : 'Rom'} er lagt til`);
}

function requestEntityDelete() {
  const type = el.entityType.value;
  const id = el.entityId.value;
  const list = type === 'category' ? state.data.categories : state.data.rooms;
  const entity = list.find((entry) => entry.id === id);
  if (!entity || entity.protected) return;
  const count = type === 'category' ? categoryCount(id, true) : roomCount(id, true);
  const fallback = type === 'category' ? 'Annet' : 'Annet sted';
  showAlert({
    title: `Slette ${entity.name}?`,
    html: `<p>${count ? `${count} ting flyttes til «${fallback}».` : 'Ingen ting er knyttet til denne.'} Ingenting blir slettet.</p>`,
    actions: `<button class="secondary-button" type="button" data-close-alert>Avbryt</button><button class="danger-button" type="button" data-confirm-entity-delete="${type}" data-entity-id="${escapeHtml(id)}">Slett</button>`,
  });
}

function deleteEntity(type, id) {
  const isCategory = type === 'category';
  const list = isCategory ? state.data.categories : state.data.rooms;
  const entity = list.find((entry) => entry.id === id);
  if (!entity || entity.protected) return;
  const fallbackId = isCategory ? 'cat-other' : 'room-other';
  [...state.data.items, ...state.data.deleted].forEach((item) => {
    if (isCategory && item.categoryId === id) item.categoryId = fallbackId;
    if (!isCategory && item.roomId === id) item.roomId = fallbackId;
  });
  if (isCategory) state.data.categories = list.filter((entry) => entry.id !== id);
  else state.data.rooms = list.filter((entry) => entry.id !== id);
  if (state.categoryId === id) state.categoryId = '';
  if (state.selectedRoomId === id) state.selectedRoomId = '';
  saveData();
  renderSelects();
  renderAll();
  renderManager();
  el.alertDialog.close();
  el.entityDialog.close();
  showToast(`${entity.name} er slettet`);
}

function saveHomeName(event) {
  event.preventDefault();
  const input = document.querySelector('#home-name-input');
  const name = input?.value.trim();
  if (!name) return;
  state.data.home.name = name;
  saveData();
  renderAll();
  showToast('Navnet på hjemmet er oppdatert');
}

function addPrototypeMember(event) {
  event.preventDefault();
  const input = document.querySelector('#invite-name');
  const name = input?.value.trim();
  if (!name) return;
  if (state.data.home.members.some((member) => sameText(member.name, name))) {
    showToast('Personen finnes allerede');
    return;
  }
  state.data.home.members.push({ id: makeId('member'), name, role: 'Medlem', status: 'invited', owner: false });
  saveData();
  renderAll();
  renderHomeManager();
  showToast('Lagt til som prototypeinvitasjon');
}

function removeMember(id) {
  state.data.home.members = state.data.home.members.filter((member) => member.id !== id || member.owner);
  saveData();
  renderAll();
  renderHomeManager();
  showToast('Medlemmet er fjernet');
}

function setTheme(theme) {
  if (!THEME_LABELS[theme]) return;
  state.data.settings.theme = theme;
  saveData();
  applyTheme();
  renderProfile();
  renderAppearanceManager();
}

function exportData() {
  const payload = { app: 'Hvor er den?', version: 3, exportedAt: new Date().toISOString(), ...state.data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hvor-er-den-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Sikkerhetskopien er eksportert');
}

async function importData(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    const normalized = normalizeData(Array.isArray(payload) ? { items: payload } : payload);
    state.data = normalized;
    saveData();
    applyTheme();
    renderSelects();
    renderAll();
    showToast(`${normalized.items.length} ting er importert`);
  } catch (error) {
    console.error(error);
    showToast('Kunne ikke lese sikkerhetskopien');
  } finally {
    el.importData.value = '';
  }
}

function showAlert({ title, html, actions }) {
  el.alertTitle.textContent = title;
  el.alertCopy.innerHTML = html;
  el.alertActions.innerHTML = actions || '<button class="primary-button" type="button" data-close-alert>Skjønner</button>';
  if (!el.alertDialog.open) el.alertDialog.showModal();
}

function showInstallHelp() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (isStandalone) return showToast('Appen er allerede installert');
  if (state.deferredInstallPrompt) return state.deferredInstallPrompt.prompt();
  showAlert({
    title: 'Installer på iPhone',
    html: '<ol><li>Åpne siden i Safari.</li><li>Trykk på Del-knappen.</li><li>Velg «Legg til på Hjem-skjerm».</li><li>Trykk «Legg til».</li></ol><p>Da åpnes appen uten vanlig nettleserlinje.</p>',
  });
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  el.toast.textContent = message;
  el.toast.hidden = false;
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2600);
}

function renderAll() {
  renderHome();
  renderSearch();
  renderRooms();
  renderProfile();
}

document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) {
    const target = nav.dataset.nav;
    navigate(target, { focusSearch: target === 'search' && nav.classList.contains('search-launcher') });
    return;
  }

  if (event.target.closest('[data-open-add]')) {
    state.previousScreen = state.screen;
    navigate('add');
    return;
  }

  const manager = event.target.closest('[data-open-manager]');
  if (manager) {
    openManager(manager.dataset.openManager);
    return;
  }

  const addEntity = event.target.closest('[data-add-entity]');
  if (addEntity) {
    openEntityDialog(addEntity.dataset.addEntity);
    return;
  }

  const editEntity = event.target.closest('[data-edit-entity]');
  if (editEntity) {
    openEntityDialog(editEntity.dataset.editEntity, editEntity.dataset.entityId);
    return;
  }

  const roomButton = event.target.closest('[data-room-id]');
  if (roomButton) {
    state.selectedRoomId = roomButton.dataset.roomId;
    state.categoryId = '';
    state.query = '';
    navigate('search', { instant: true });
    return;
  }

  const categoryButton = event.target.closest('[data-category-id]');
  if (categoryButton) {
    state.categoryId = state.categoryId === categoryButton.dataset.categoryId ? '' : categoryButton.dataset.categoryId;
    state.selectedRoomId = '';
    renderSearch();
    return;
  }

  const recentButton = event.target.closest('[data-recent-search]');
  if (recentButton) {
    state.query = recentButton.dataset.recentSearch;
    state.categoryId = '';
    state.selectedRoomId = '';
    renderSearch();
    return;
  }

  const itemButton = event.target.closest('[data-item-id]');
  if (itemButton) {
    const { itemId, itemAction } = itemButton.dataset;
    if (itemAction === 'restore') restoreItem(itemId);
    else openDetail(itemId);
    return;
  }

  const themeButton = event.target.closest('[data-theme-choice]');
  if (themeButton) {
    setTheme(themeButton.dataset.themeChoice);
    return;
  }

  const removeMemberButton = event.target.closest('[data-remove-member]');
  if (removeMemberButton) {
    removeMember(removeMemberButton.dataset.removeMember);
    return;
  }

  if (event.target.closest('[data-cancel-form]')) return navigate(state.previousScreen || 'home', { instant: true });
  if (event.target.closest('[data-close-detail]')) el.detailSheet.close();
  if (event.target.closest('[data-close-list]')) el.listSheet.close();
  if (event.target.closest('[data-close-settings]')) el.settingsSheet.close();
  if (event.target.closest('[data-close-entity]')) el.entityDialog.close();
  if (event.target.closest('[data-close-alert]')) el.alertDialog.close();

  const confirmDelete = event.target.closest('[data-confirm-delete]');
  if (confirmDelete) deleteItem(confirmDelete.dataset.confirmDelete);

  const confirmEntityDelete = event.target.closest('[data-confirm-entity-delete]');
  if (confirmEntityDelete) deleteEntity(confirmEntityDelete.dataset.confirmEntityDelete, confirmEntityDelete.dataset.entityId);

  const detailAction = event.target.closest('[data-detail-action]');
  if (detailAction && state.detailId) {
    const action = detailAction.dataset.detailAction;
    if (action === 'favorite') toggleFavorite(state.detailId);
    if (action === 'copy') copyItem(state.detailId);
    if (action === 'share') shareItem(state.detailId);
    if (action === 'edit') openEditForm(state.detailId);
    if (action === 'delete') requestDelete(state.detailId);
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.id === 'home-name-form') saveHomeName(event);
  if (event.target.id === 'invite-form') addPrototypeMember(event);
});

el.searchInput.addEventListener('input', (event) => {
  state.query = event.target.value;
  state.categoryId = '';
  state.selectedRoomId = '';
  renderSearch();
});
el.searchInput.addEventListener('search', () => addRecentSearch(state.query));
el.searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addRecentSearch(state.query);
    renderSearch();
    el.searchInput.blur();
  }
});
el.clearSearch.addEventListener('click', () => { state.query = ''; renderSearch(); el.searchInput.focus(); });
el.clearCategory.addEventListener('click', () => { state.categoryId = ''; state.selectedRoomId = ''; renderSearch(); });
el.clearRecentSearches.addEventListener('click', () => { state.data.recentSearches = []; saveData(); renderSearch(); });

el.itemForm.addEventListener('submit', saveItem);
el.itemImage.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try { state.formImage = await resizeImage(file); renderPhotoPreview(); }
  catch { showToast('Kunne ikke lese bildet'); }
  finally { el.itemImage.value = ''; }
});
el.entityForm.addEventListener('submit', saveEntity);
el.entityDelete.addEventListener('click', requestEntityDelete);

el.detailMore.addEventListener('click', () => { if (state.detailId) shareItem(state.detailId); });
document.querySelector('#show-favorites').addEventListener('click', () => openListSheet('Favoritter', state.data.items.filter((item) => item.favorite)));
document.querySelector('#show-trash').addEventListener('click', () => openListSheet('Nylig slettet', state.data.deleted, 'restore'));
document.querySelector('#account-info').addEventListener('click', () => showAlert({
  title: 'Neste tekniske fase',
  html: '<p>Produksjonsversjonen skal få «Logg inn med Apple», skylagring, flere hjem og invitasjonslenker. Denne prototypen lagrer fortsatt på én enhet.</p>',
}));
document.querySelector('#install-app').addEventListener('click', showInstallHelp);
document.querySelector('#export-data').addEventListener('click', exportData);
el.importData.addEventListener('change', (event) => importData(event.target.files?.[0]));
document.querySelector('#qr-info').addEventListener('click', () => showAlert({ title: 'QR-koder kommer', html: '<p>QR-koder skal knyttes til kasser, skuffer og skap, slik at hele innholdet kan åpnes med ett skann.</p>' }));
document.querySelector('#help-button').addEventListener('click', () => showAlert({ title: 'Slik får du mest nytte', html: '<ol><li>Bruk korte navn du faktisk søker etter.</li><li>Lag egne rom og kategorier som passer hjemmet.</li><li>Velg en konkret plassering og detalj.</li><li>Eksporter sikkerhetskopi av og til.</li></ol>' }));
document.querySelector('#about-button').addEventListener('click', () => showAlert({ title: 'Hvor er den?', html: `<p>En enkel app for par, familier og kollektiv som vil finne ting uten å lete.</p><p><strong>${state.data.items.length}</strong> ting ligger i ${escapeHtml(state.data.home.name)}.</p>` }));

[el.detailSheet, el.listSheet, el.settingsSheet, el.entityDialog, el.alertDialog].forEach((dialog) => {
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
});

window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); state.deferredInstallPrompt = event; });
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (state.data.settings.theme === 'system') applyTheme(); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));

applyTheme();
renderSelects();
saveData();
renderAll();
navigate('home', { instant: true });
