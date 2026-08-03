const state = {
  data: loadData(), screen: 'home', previousScreen: 'home', query: '', categoryId: '', selectedRoomId: '', filter: 'all',
  detailId: null, formImage: '', manager: '', deferredInstallPrompt: null, inlineContainerRequest: false, entityDeleteId: '', entityDeleteType: '',
};

const el = {
  tabBar: document.querySelector('.tab-bar'), homeSwitcherName: document.querySelector('#home-switcher-name'), homeItemTotal: document.querySelector('#home-item-total'), homeContainerTotal: document.querySelector('#home-container-total'), recentItems: document.querySelector('#recent-items'), homeActivity: document.querySelector('#home-activity'), homeRooms: document.querySelector('#home-rooms'),
  searchInput: document.querySelector('#search-input'), clearSearch: document.querySelector('#clear-search'), quickFilterList: document.querySelector('#quick-filter-list'), categoryList: document.querySelector('#category-list'), clearCategory: document.querySelector('#clear-category'), searchResults: document.querySelector('#search-results'), searchEmpty: document.querySelector('#search-empty'), searchResultsTitle: document.querySelector('#search-results-title'), searchResultsCount: document.querySelector('#search-results-count'), recentSearchSection: document.querySelector('#recent-search-section'), recentSearches: document.querySelector('#recent-searches'), clearRecentSearches: document.querySelector('#clear-recent-searches'),
  itemForm: document.querySelector('#item-form'), itemId: document.querySelector('#item-id'), itemName: document.querySelector('#item-name'), itemCategory: document.querySelector('#item-category'), itemRoom: document.querySelector('#item-room'), itemContainer: document.querySelector('#item-container'), itemDetail: document.querySelector('#item-detail'), itemTags: document.querySelector('#item-tags'), itemNotes: document.querySelector('#item-notes'), itemFavorite: document.querySelector('#item-favorite'), itemPrivate: document.querySelector('#item-private'), itemImage: document.querySelector('#item-image'), photoPreview: document.querySelector('#photo-preview'), addTitle: document.querySelector('#add-title'), addContainerInline: document.querySelector('#add-container-inline'),
  roomList: document.querySelector('#room-list'), roomsEmpty: document.querySelector('#rooms-empty'), profileHomeName: document.querySelector('#profile-home-name'), homeMembersPreview: document.querySelector('#home-members-preview'), categoryCount: document.querySelector('#category-count'), roomCount: document.querySelector('#room-count'), containerCount: document.querySelector('#container-count'), themeLabel: document.querySelector('#theme-label'), activityCount: document.querySelector('#activity-count'), favoriteCount: document.querySelector('#favorite-count'), trashCount: document.querySelector('#trash-count'),
  detailSheet: document.querySelector('#detail-sheet'), detailBody: document.querySelector('#detail-body'), detailMore: document.querySelector('#detail-more'), listSheet: document.querySelector('#list-sheet'), listSheetTitle: document.querySelector('#list-sheet-title'), listSheetContent: document.querySelector('#list-sheet-content'), settingsSheet: document.querySelector('#settings-sheet'), settingsSheetTitle: document.querySelector('#settings-sheet-title'), settingsSheetContent: document.querySelector('#settings-sheet-content'),
  entityDialog: document.querySelector('#entity-dialog'), entityForm: document.querySelector('#entity-form'), entityType: document.querySelector('#entity-type'), entityId: document.querySelector('#entity-id'), entityName: document.querySelector('#entity-name'), entityIcon: document.querySelector('#entity-icon'), entityColor: document.querySelector('#entity-color'), entityColorField: document.querySelector('#entity-color-field'), entityRoomField: document.querySelector('#entity-room-field'), entityRoom: document.querySelector('#entity-room'), entityKindField: document.querySelector('#entity-kind-field'), entityKind: document.querySelector('#entity-kind'), entityOverline: document.querySelector('#entity-overline'), entityTitle: document.querySelector('#entity-title'), entityDelete: document.querySelector('#entity-delete'),
  qrDialog: document.querySelector('#qr-dialog'), qrBody: document.querySelector('#qr-body'), alertDialog: document.querySelector('#alert-dialog'), alertTitle: document.querySelector('#alert-title'), alertCopy: document.querySelector('#alert-copy'), alertActions: document.querySelector('#alert-actions'), toast: document.querySelector('#toast'), importData: document.querySelector('#import-data'), themeMeta: document.querySelector('meta[name="theme-color"]'),
};

function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data)); }
  catch (error) { console.error(error); showToast('Lagringen er full. Prøv å fjerne noen bilder.'); }
}
function getCategory(id) { return state.data.categories.find((entry) => entry.id === id) || state.data.categories.find((entry) => entry.id === 'cat-other'); }
function getRoom(id) { return state.data.rooms.find((entry) => entry.id === id) || state.data.rooms.find((entry) => entry.id === 'room-other'); }
function getContainer(id) { return state.data.containers.find((entry) => entry.id === id) || null; }
function categoryCount(id, all = false) { return (all ? [...state.data.items, ...state.data.deleted] : state.data.items).filter((item) => item.categoryId === id).length; }
function roomCount(id, all = false) { return (all ? [...state.data.items, ...state.data.deleted] : state.data.items).filter((item) => item.roomId === id).length; }
function containerCount(id, all = false) { return (all ? [...state.data.items, ...state.data.deleted] : state.data.items).filter((item) => item.containerId === id).length; }
function getPathParts(item) { return [getRoom(item.roomId)?.name, getContainer(item.containerId)?.name, item.detail].filter(Boolean); }
function getPath(item) { return getPathParts(item).join(' → '); }
function formatRelative(timestamp) {
  const diff = Math.max(0, Date.now() - Number(timestamp || Date.now())); const min = Math.floor(diff / 60000);
  if (min < 1) return 'nå'; if (min < 60) return `${min} min`; const h = Math.floor(min / 60); if (h < 24) return `${h} t`; const d = Math.floor(h / 24); if (d === 1) return 'i går'; if (d < 14) return `${d} dager`; return new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short' }).format(timestamp);
}
function initials(name) { return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'; }

function thumbHtml(item) {
  if (item.image) return `<span class="item-thumb"><img src="${item.image}" alt="" /></span>`;
  return `<span class="item-thumb">${escapeHtml(getCategory(item.categoryId)?.icon || '📦')}</span>`;
}
function itemRowHtml(item, action = 'detail') {
  const badges = `${item.visibility === 'private' ? '<span class="mini-badge mini-badge--private">Privat</span>' : ''}${item.tags.slice(0, 2).map((tag) => `<span class="mini-badge">#${escapeHtml(tag)}</span>`).join('')}`;
  return `<button class="item-row" type="button" data-item-id="${escapeHtml(item.id)}" data-item-action="${action}">${thumbHtml(item)}<span class="item-copy"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(getPath(item) || getRoom(item.roomId)?.name || 'Ingen plassering')}</span>${badges ? `<span class="item-badges">${badges}</span>` : ''}</span>${item.favorite ? '<span class="row-favorite"><svg><use href="#i-star" /></svg></span>' : '<span class="row-chevron"><svg><use href="#i-chevron" /></svg></span>'}</button>`;
}
function activityRowHtml(entry) {
  const icon = ICON_BY_ACTIVITY[entry.type] || 'i-edit';
  return `<div class="activity-row"><span class="activity-icon"><svg><use href="#${icon}" /></svg></span><span><strong>${escapeHtml(entry.actor)} ${escapeHtml(entry.message)}</strong><small>${escapeHtml(entry.itemName || state.data.home.name)}</small></span><span class="activity-time">${escapeHtml(formatRelative(entry.at))}</span></div>`;
}
function emptyInline(title, copy) { return `<div class="empty-state empty-state--inline"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></div>`; }

function recordActivity(type, item, message) {
  state.data.activity.unshift({ id: makeId('activity'), type, itemId: item?.id || '', itemName: item?.name || '', message, actor: 'Deg', at: Date.now() });
  state.data.activity = state.data.activity.slice(0, 150);
}

function applyTheme() {
  const preference = state.data.settings.theme;
  const resolved = preference === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = resolved;
  el.themeMeta.content = resolved === 'dark' ? '#0b0d12' : '#f6f5fa';
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').content = resolved === 'dark' ? 'black-translucent' : 'default';
}

function renderSelects(categoryId = el.itemCategory.value, roomId = el.itemRoom.value, containerId = el.itemContainer.value) {
  el.itemCategory.innerHTML = state.data.categories.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.icon)} ${escapeHtml(entry.name)}</option>`).join('');
  el.itemRoom.innerHTML = state.data.rooms.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.icon)} ${escapeHtml(entry.name)}</option>`).join('');
  if (state.data.categories.some((entry) => entry.id === categoryId)) el.itemCategory.value = categoryId;
  if (state.data.rooms.some((entry) => entry.id === roomId)) el.itemRoom.value = roomId;
  renderContainerSelect(containerId);
}
function renderContainerSelect(selectedId = '') {
  const roomId = el.itemRoom.value;
  const options = state.data.containers.filter((entry) => entry.roomId === roomId).sort((a, b) => a.name.localeCompare(b.name, 'nb-NO'));
  el.itemContainer.innerHTML = `<option value="">Ingen beholder</option>${options.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.icon)} ${escapeHtml(entry.name)} · ${escapeHtml(entry.kind)}</option>`).join('')}`;
  if (options.some((entry) => entry.id === selectedId)) el.itemContainer.value = selectedId;
}

function navigate(screen, options = {}) {
  if (!['home', 'search', 'add', 'rooms', 'profile'].includes(screen)) return;
  if (screen === 'add' && !options.preserveForm) openNewForm();
  if (state.screen !== 'add') state.previousScreen = state.screen;
  state.screen = screen;
  document.querySelectorAll('.screen').forEach((section) => section.classList.toggle('is-active', section.dataset.screen === screen));
  document.querySelectorAll('.tab-button').forEach((button) => button.classList.toggle('is-active', button.dataset.nav === screen));
  el.tabBar.hidden = screen === 'add';
  scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' });
  renderAll();
  if (screen === 'search' && options.focusSearch) requestAnimationFrame(() => el.searchInput.focus());
}
