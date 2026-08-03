const STORAGE_KEY = 'hvor-er-den-data-v2';
const OLD_STORAGE_KEY = 'hvor-er-den-items-v1';

const categoryMeta = {
  Dokumenter: { icon: '📄', color: '#5d86e8' },
  Verktøy: { icon: '🛠️', color: '#d9783f' },
  Elektronikk: { icon: '🔌', color: '#75b75a' },
  Klær: { icon: '🧥', color: '#b36ed6' },
  Kjøkken: { icon: '🍴', color: '#76b684' },
  Hund: { icon: '🐾', color: '#d59258' },
  Bil: { icon: '🚗', color: '#6e86b8' },
  Annet: { icon: '📦', color: '#777d89' },
};

const roomIcons = {
  soverom: '🛏️', bod: '📦', kjøkken: '🍴', stue: '🛋️', kontor: '🪑',
  bad: '🛁', entré: '🚪', entre: '🚪', kjellerbod: '🗄️', bil: '🚗',
};

const starterItems = [
  {
    id: makeId(), name: 'Pass', category: 'Dokumenter', room: 'Soverom',
    location: 'Kommode', detail: 'Øverste skuff', notes: 'Bak den svarte mappen.',
    favorite: true, image: '', createdAt: Date.now() - 1000 * 60 * 60 * 30, updatedAt: Date.now() - 1000 * 60 * 60 * 3,
  },
  {
    id: makeId(), name: 'Batteridrill', category: 'Verktøy', room: 'Bod',
    location: 'Verktøykasse', detail: 'Blå kasse', notes: 'Lader og ekstra batteri ligger sammen.',
    favorite: false, image: '', createdAt: Date.now() - 1000 * 60 * 60 * 70, updatedAt: Date.now() - 1000 * 60 * 60 * 20,
  },
  {
    id: makeId(), name: 'Julelys', category: 'Elektronikk', room: 'Kjellerbod',
    location: 'Kasse 4', detail: 'Grå plastkasse', notes: '',
    favorite: false, image: '', createdAt: Date.now() - 1000 * 60 * 60 * 120, updatedAt: Date.now() - 1000 * 60 * 60 * 44,
  },
];

const state = {
  data: loadData(),
  screen: 'home',
  previousScreen: 'home',
  query: '',
  category: '',
  selectedRoom: '',
  detailId: null,
  formImage: '',
  deferredInstallPrompt: null,
};

const el = {
  screens: document.querySelector('#screens'),
  tabBar: document.querySelector('.tab-bar'),
  recentItems: document.querySelector('#recent-items'),
  homeRooms: document.querySelector('#home-rooms'),
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
  favoriteCount: document.querySelector('#favorite-count'),
  trashCount: document.querySelector('#trash-count'),
  detailSheet: document.querySelector('#detail-sheet'),
  detailBody: document.querySelector('#detail-body'),
  detailMore: document.querySelector('#detail-more'),
  listSheet: document.querySelector('#list-sheet'),
  listSheetTitle: document.querySelector('#list-sheet-title'),
  listSheetContent: document.querySelector('#list-sheet-content'),
  alertDialog: document.querySelector('#alert-dialog'),
  alertTitle: document.querySelector('#alert-title'),
  alertCopy: document.querySelector('#alert-copy'),
  alertActions: document.querySelector('#alert-actions'),
  toast: document.querySelector('#toast'),
  importData: document.querySelector('#import-data'),
};

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeData(JSON.parse(raw));

    const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldRaw) {
      const oldItems = JSON.parse(oldRaw);
      if (Array.isArray(oldItems)) {
        return normalizeData({ items: oldItems, deleted: [], recentSearches: [] });
      }
    }
  } catch (error) {
    console.warn('Kunne ikke lese lagrede data', error);
  }
  return { items: starterItems, deleted: [], recentSearches: [] };
}

function normalizeData(value) {
  const items = Array.isArray(value?.items) ? value.items.map(normalizeItem).filter(Boolean) : starterItems;
  const deleted = Array.isArray(value?.deleted) ? value.deleted.map(normalizeItem).filter(Boolean) : [];
  const recentSearches = Array.isArray(value?.recentSearches)
    ? value.recentSearches.map(String).filter(Boolean).slice(0, 8)
    : [];
  return { items, deleted, recentSearches };
}

function normalizeItem(item) {
  if (!item?.name || !item?.room || !item?.location) return null;
  return {
    id: item.id || makeId(),
    name: String(item.name).trim(),
    category: categoryMeta[item.category] ? item.category : 'Annet',
    room: String(item.room).trim(),
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

function getLocationLine(item) {
  return [item.room, item.location].filter(Boolean).join(' · ');
}

function getDetailLine(item) {
  return item.detail || item.notes || item.category;
}

function getRoomIcon(room) {
  return roomIcons[normalizeText(room)] || '📍';
}

function thumbHtml(item) {
  if (item.image) return `<span class="item-thumb"><img src="${item.image}" alt="" /></span>`;
  return `<span class="item-thumb">${categoryMeta[item.category]?.icon ?? '📦'}</span>`;
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

function navigate(screen, options = {}) {
  if (!['home', 'search', 'add', 'rooms', 'profile'].includes(screen)) return;
  if (screen === 'add' && !options.preserveForm) openNewForm();

  state.previousScreen = state.screen === 'add' ? state.previousScreen : state.screen;
  state.screen = screen;
  document.querySelectorAll('.screen').forEach((section) => {
    section.classList.toggle('is-active', section.dataset.screen === screen);
  });
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.nav === screen);
  });
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
  const recent = [...state.data.items].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
  el.recentItems.innerHTML = recent.length
    ? recent.map((item) => itemRowHtml(item)).join('')
    : emptyInline('Ingen ting ennå', 'Legg til den første tingen din.');

  const rooms = getRoomsWithCounts().slice(0, 6);
  el.homeRooms.innerHTML = rooms.length
    ? rooms.map(({ room, count }) => `
        <button class="room-card" type="button" data-room="${escapeHtml(room)}">
          <span class="room-card__icon">${getRoomIcon(room)}</span>
          <span><strong>${escapeHtml(room)}</strong><small>${count} ${count === 1 ? 'ting' : 'ting'}</small></span>
        </button>`).join('')
    : '';
}

function getRoomsWithCounts() {
  const counts = new Map();
  state.data.items.forEach((item) => counts.set(item.room, (counts.get(item.room) || 0) + 1));
  return [...counts.entries()]
    .map(([room, count]) => ({ room, count }))
    .sort((a, b) => b.count - a.count || a.room.localeCompare(b.room, 'nb-NO'));
}

function filteredItems() {
  const query = normalizeText(state.query);
  return [...state.data.items]
    .filter((item) => {
      const matchesCategory = !state.category || item.category === state.category;
      const matchesRoom = !state.selectedRoom || item.room === state.selectedRoom;
      const haystack = normalizeText([item.name, item.category, item.room, item.location, item.detail, item.notes].join(' '));
      return matchesCategory && matchesRoom && (!query || haystack.includes(query));
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function renderSearch() {
  el.searchInput.value = state.query;
  el.clearSearch.hidden = !state.query;
  el.clearCategory.hidden = !state.category && !state.selectedRoom;

  el.categoryList.innerHTML = Object.entries(categoryMeta).map(([name, meta]) => {
    const count = state.data.items.filter((item) => item.category === name).length;
    return `
      <button class="category-row ${state.category === name ? 'is-selected' : ''}" type="button" data-category="${name}">
        <span class="category-icon" style="--icon-bg:${meta.color}33">${meta.icon}</span>
        <strong>${name}</strong>
        <span class="category-count">${count}</span>
      </button>`;
  }).join('');

  const items = filteredItems();
  const label = state.selectedRoom || state.category || (state.query ? `Treff på «${state.query}»` : 'Alle ting');
  el.searchResultsTitle.textContent = label;
  el.searchResultsCount.textContent = `${items.length}`;
  el.searchResults.hidden = items.length === 0;
  el.searchEmpty.hidden = items.length !== 0;
  el.searchResults.innerHTML = items.map((item) => itemRowHtml(item)).join('');

  el.recentSearchSection.hidden = Boolean(state.query || state.category || state.selectedRoom);
  el.recentSearches.innerHTML = state.data.recentSearches.length
    ? state.data.recentSearches.map((term) => `
        <button class="recent-search-button" type="button" data-recent-search="${escapeHtml(term)}">
          <svg><use href="#i-search" /></svg><span>${escapeHtml(term)}</span>
        </button>`).join('')
    : '<p class="muted-empty">Ingen nylige søk.</p>';
}

function renderRooms() {
  const rooms = getRoomsWithCounts();
  el.roomList.hidden = rooms.length === 0;
  el.roomsEmpty.hidden = rooms.length !== 0;
  el.roomList.innerHTML = rooms.map(({ room, count }) => `
    <button class="room-row" type="button" data-room="${escapeHtml(room)}">
      <span class="room-row__icon">${getRoomIcon(room)}</span>
      <span><strong>${escapeHtml(room)}</strong><span>${count} ${count === 1 ? 'ting' : 'ting'}</span></span>
      <svg><use href="#i-chevron" /></svg>
    </button>`).join('');
}

function renderProfile() {
  el.favoriteCount.textContent = state.data.items.filter((item) => item.favorite).length;
  el.trashCount.textContent = state.data.deleted.length;
}

function openNewForm() {
  el.itemForm.reset();
  el.itemId.value = '';
  el.itemCategory.value = 'Annet';
  el.addTitle.textContent = 'Legg til ting';
  state.formImage = '';
  renderPhotoPreview();
}

function openEditForm(id) {
  const item = state.data.items.find((entry) => entry.id === id);
  if (!item) return;
  state.previousScreen = state.screen;
  el.itemId.value = item.id;
  el.itemName.value = item.name;
  el.itemCategory.value = item.category;
  el.itemRoom.value = item.room;
  el.itemLocation.value = item.location;
  el.itemDetail.value = item.detail;
  el.itemNotes.value = item.notes;
  el.itemFavorite.checked = item.favorite;
  state.formImage = item.image || '';
  el.addTitle.textContent = 'Rediger ting';
  renderPhotoPreview();
  navigate('add', { preserveForm: true, instant: true });
  el.detailSheet.close();
}

function renderPhotoPreview() {
  el.photoPreview.classList.toggle('has-image', Boolean(state.formImage));
  el.photoPreview.innerHTML = state.formImage
    ? `<img src="${state.formImage}" alt="Valgt bilde" />`
    : '<svg><use href="#i-camera" /></svg><span>Legg til bilde</span>';
}

async function resizeImage(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Ikke et bilde');
  const bitmap = await createImageBitmap(file);
  const max = 1000;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', .78);
}

function saveItem(event) {
  event.preventDefault();
  if (!el.itemForm.reportValidity()) return;
  const now = Date.now();
  const id = el.itemId.value;
  const existing = state.data.items.find((item) => item.id === id);
  const item = {
    id: id || makeId(),
    name: el.itemName.value.trim(),
    category: el.itemCategory.value,
    room: el.itemRoom.value.trim(),
    location: el.itemLocation.value.trim(),
    detail: el.itemDetail.value.trim(),
    notes: el.itemNotes.value.trim(),
    favorite: el.itemFavorite.checked,
    image: state.formImage,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deletedAt: 0,
  };

  if (existing) {
    state.data.items = state.data.items.map((entry) => entry.id === id ? item : entry);
    showToast(`${item.name} er oppdatert`);
  } else {
    state.data.items.unshift(item);
    showToast(`${item.name} er lagret`);
  }
  saveData();
  navigate('home', { instant: true });
}

function openDetail(id) {
  const item = state.data.items.find((entry) => entry.id === id);
  if (!item) return;
  state.detailId = id;
  const image = item.image
    ? `<div class="detail-image"><img src="${item.image}" alt="${escapeHtml(item.name)}" /></div>`
    : `<div class="detail-image">${categoryMeta[item.category]?.icon ?? '📦'}</div>`;
  el.detailBody.innerHTML = `
    ${image}
    <div class="detail-title-row">
      <h1>${escapeHtml(item.name)}</h1>
      <button class="favorite-button ${item.favorite ? 'is-active' : ''}" type="button" data-detail-action="favorite" aria-label="Favoritt">
        <svg><use href="#i-star" /></svg>
      </button>
    </div>
    <dl class="detail-fields">
      <div class="detail-field"><dt>Rom</dt><dd>${escapeHtml(item.room)}</dd></div>
      <div class="detail-field"><dt>Plassering</dt><dd>${escapeHtml(item.location)}</dd></div>
      ${item.detail ? `<div class="detail-field"><dt>Nivå</dt><dd>${escapeHtml(item.detail)}</dd></div>` : ''}
      ${item.notes ? `<div class="detail-field"><dt>Notat</dt><dd>${escapeHtml(item.notes)}</dd></div>` : ''}
      <div class="detail-field"><dt>Kategori</dt><dd><span class="detail-category">${categoryMeta[item.category]?.icon ?? '📦'} ${escapeHtml(item.category)}</span></dd></div>
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
  state.data.items = state.data.items.map((item) => item.id === id ? { ...item, favorite: !item.favorite, updatedAt: Date.now() } : item);
  saveData();
  openDetail(id);
  renderAll();
}

function itemShareText(item) {
  return `${item.name}: ${[item.room, item.location, item.detail].filter(Boolean).join(' – ')}`;
}

async function copyItem(id) {
  const item = state.data.items.find((entry) => entry.id === id);
  if (!item) return;
  const text = itemShareText(item);
  try {
    await navigator.clipboard.writeText(text);
    showToast('Plasseringen er kopiert');
  } catch {
    showToast(text);
  }
}

async function shareItem(id) {
  const item = state.data.items.find((entry) => entry.id === id);
  if (!item) return;
  const text = itemShareText(item);
  if (navigator.share) {
    try { await navigator.share({ title: item.name, text }); } catch (error) { if (error.name !== 'AbortError') showToast('Kunne ikke dele'); }
  } else {
    await copyItem(id);
  }
}

function requestDelete(id) {
  const item = state.data.items.find((entry) => entry.id === id);
  if (!item) return;
  showAlert({
    title: `Slette ${item.name}?`,
    html: '<p>Tingen flyttes til «Nylig slettet» og kan gjenopprettes senere.</p>',
    actions: `
      <button class="secondary-button" type="button" data-close-alert>Avbryt</button>
      <button class="danger-button" type="button" data-confirm-delete="${escapeHtml(id)}">Slett</button>`,
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
        trailing: action === 'restore'
          ? '<span class="row-chevron"><svg><use href="#i-restore" /></svg></span>'
          : undefined,
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
  state.data.recentSearches = [clean, ...state.data.recentSearches.filter((entry) => normalizeText(entry) !== normalizeText(clean))].slice(0, 8);
  saveData();
}

function exportData() {
  const payload = { app: 'Hvor er den?', version: 2, exportedAt: new Date().toISOString(), ...state.data };
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
    if (!normalized.items.length && !normalized.deleted.length) throw new Error('Tom eller ugyldig fil');
    state.data = normalized;
    saveData();
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
  if (isStandalone) {
    showToast('Appen er allerede installert');
    return;
  }
  if (state.deferredInstallPrompt) {
    state.deferredInstallPrompt.prompt();
    return;
  }
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

  const addButton = event.target.closest('[data-open-add]');
  if (addButton) {
    state.previousScreen = state.screen;
    navigate('add');
    return;
  }

  const roomButton = event.target.closest('[data-room]');
  if (roomButton) {
    state.selectedRoom = roomButton.dataset.room;
    state.category = '';
    state.query = '';
    navigate('search', { instant: true });
    return;
  }

  const categoryButton = event.target.closest('[data-category]');
  if (categoryButton) {
    state.category = state.category === categoryButton.dataset.category ? '' : categoryButton.dataset.category;
    state.selectedRoom = '';
    renderSearch();
    return;
  }

  const recentButton = event.target.closest('[data-recent-search]');
  if (recentButton) {
    state.query = recentButton.dataset.recentSearch;
    state.category = '';
    state.selectedRoom = '';
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

  if (event.target.closest('[data-cancel-form]')) {
    navigate(state.previousScreen || 'home', { instant: true });
    return;
  }

  if (event.target.closest('[data-close-detail]')) el.detailSheet.close();
  if (event.target.closest('[data-close-list]')) el.listSheet.close();
  if (event.target.closest('[data-close-alert]')) el.alertDialog.close();

  const confirmDelete = event.target.closest('[data-confirm-delete]');
  if (confirmDelete) deleteItem(confirmDelete.dataset.confirmDelete);

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

el.searchInput.addEventListener('input', (event) => {
  state.query = event.target.value;
  state.category = '';
  state.selectedRoom = '';
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
el.clearSearch.addEventListener('click', () => {
  state.query = '';
  renderSearch();
  el.searchInput.focus();
});
el.clearCategory.addEventListener('click', () => {
  state.category = '';
  state.selectedRoom = '';
  renderSearch();
});
el.clearRecentSearches.addEventListener('click', () => {
  state.data.recentSearches = [];
  saveData();
  renderSearch();
});

el.itemForm.addEventListener('submit', saveItem);
el.itemImage.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    state.formImage = await resizeImage(file);
    renderPhotoPreview();
  } catch {
    showToast('Kunne ikke lese bildet');
  } finally {
    el.itemImage.value = '';
  }
});

el.detailMore.addEventListener('click', () => {
  if (state.detailId) shareItem(state.detailId);
});
document.querySelector('#show-favorites').addEventListener('click', () => {
  openListSheet('Favoritter', state.data.items.filter((item) => item.favorite));
});
document.querySelector('#show-trash').addEventListener('click', () => {
  openListSheet('Nylig slettet', state.data.deleted, 'restore');
});
document.querySelector('#share-partner').addEventListener('click', () => {
  showAlert({ title: 'Deling kommer senere', html: '<p>For ekte deling mellom to telefoner trenger appen innlogging og skylagring. Det er ikke aktivert ennå.</p>' });
});
document.querySelector('#install-app').addEventListener('click', showInstallHelp);
document.querySelector('#export-data').addEventListener('click', exportData);
el.importData.addEventListener('change', (event) => importData(event.target.files?.[0]));
document.querySelector('#qr-info').addEventListener('click', () => {
  showAlert({ title: 'QR-koder kommer', html: '<p>Neste steg er å lage QR-koder for bokser og skap, slik at du kan skanne og se innholdet direkte.</p>' });
});
document.querySelector('#help-button').addEventListener('click', () => {
  showAlert({ title: 'Slik får du mest nytte', html: '<ol><li>Bruk korte navn du faktisk søker etter.</li><li>Velg rom og en konkret plassering.</li><li>Legg detaljen i eget felt, for eksempel «øverste skuff».</li><li>Eksporter sikkerhetskopi av og til.</li></ol>' });
});
document.querySelector('#about-button').addEventListener('click', () => {
  showAlert({ title: 'Hvor er den?', html: `<p>En enkel privat app for å huske hvor ting ligger.</p><p><strong>${state.data.items.length}</strong> ting er lagret på denne enheten.</p>` });
});

[el.detailSheet, el.listSheet, el.alertDialog].forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.deferredInstallPrompt = event;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
}

saveData();
renderAll();
navigate('home', { instant: true });
