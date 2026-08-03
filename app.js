const STORAGE_KEY = 'hvor-er-den-items-v1';

const categoryIcons = {
  Dokumenter: '📄',
  Verktøy: '🛠️',
  Elektronikk: '🔌',
  Klær: '🧥',
  Kjøkken: '🍴',
  Hund: '🐾',
  Bil: '🚗',
  Annet: '📦',
};

const starterItems = [
  {
    id: crypto.randomUUID(),
    name: 'Pass',
    category: 'Dokumenter',
    room: 'Soverom',
    location: 'Kommoden, øverste skuff i blå dokumentmappe',
    notes: 'Begge passene ligger sammen.',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 60 * 8,
  },
  {
    id: crypto.randomUUID(),
    name: 'Batteridrill',
    category: 'Verktøy',
    room: 'Bod',
    location: 'Nederste hylle i den blå verktøykassen',
    notes: 'Lader og ekstra batteri ligger i samme kasse.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: crypto.randomUUID(),
    name: 'Julelys',
    category: 'Elektronikk',
    room: 'Kjellerbod',
    location: 'Gjennomsiktig kasse merket JUL, øverst til høyre',
    notes: '',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
];

const state = {
  items: loadItems(),
  query: '',
  room: 'Alle',
  sort: 'updated',
  deleteId: null,
};

const elements = {
  itemGrid: document.querySelector('#item-grid'),
  emptyState: document.querySelector('#empty-state'),
  emptyTitle: document.querySelector('#empty-title'),
  emptyCopy: document.querySelector('#empty-copy'),
  searchInput: document.querySelector('#search-input'),
  quickFilters: document.querySelector('#quick-filters'),
  sortSelect: document.querySelector('#sort-select'),
  itemCount: document.querySelector('#item-count'),
  roomCount: document.querySelector('#room-count'),
  resultLabel: document.querySelector('#result-label'),
  listTitle: document.querySelector('#list-title'),
  itemDialog: document.querySelector('#item-dialog'),
  itemForm: document.querySelector('#item-form'),
  itemId: document.querySelector('#item-id'),
  itemName: document.querySelector('#item-name'),
  itemCategory: document.querySelector('#item-category'),
  itemRoom: document.querySelector('#item-room'),
  itemLocation: document.querySelector('#item-location'),
  itemNotes: document.querySelector('#item-notes'),
  dialogEyebrow: document.querySelector('#dialog-eyebrow'),
  dialogTitle: document.querySelector('#dialog-title'),
  confirmDialog: document.querySelector('#confirm-dialog'),
  confirmCopy: document.querySelector('#confirm-copy'),
  toast: document.querySelector('#toast'),
  importData: document.querySelector('#import-data'),
};

function loadItems() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return starterItems;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : starterItems;
  } catch {
    return starterItems;
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function normalize(value) {
  return String(value ?? '').trim().toLocaleLowerCase('nb-NO');
}

function getRooms() {
  return [...new Set(state.items.map((item) => item.room.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'nb-NO'),
  );
}

function getVisibleItems() {
  const query = normalize(state.query);
  const filtered = state.items.filter((item) => {
    const matchesRoom = state.room === 'Alle' || item.room === state.room;
    const haystack = normalize(
      [item.name, item.category, item.room, item.location, item.notes].join(' '),
    );
    return matchesRoom && (!query || haystack.includes(query));
  });

  return filtered.sort((a, b) => {
    if (state.sort === 'name') return a.name.localeCompare(b.name, 'nb-NO');
    if (state.sort === 'room') return a.room.localeCompare(b.room, 'nb-NO');
    return b.updatedAt - a.updatedAt;
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatRelativeTime(timestamp) {
  const diff = Date.now() - Number(timestamp || Date.now());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Nå';
  if (minutes < 60) return `${minutes} min siden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} t siden`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'I går';
  if (days < 14) return `${days} dager siden`;
  return new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short' }).format(timestamp);
}

function renderFilters() {
  const rooms = ['Alle', ...getRooms()];
  if (!rooms.includes(state.room)) state.room = 'Alle';

  elements.quickFilters.innerHTML = rooms
    .map(
      (room) => `
        <button
          class="filter-chip ${state.room === room ? 'filter-chip--active' : ''}"
          type="button"
          data-room="${escapeHtml(room)}"
        >${escapeHtml(room)}</button>
      `,
    )
    .join('');
}

function renderStats() {
  elements.itemCount.textContent = state.items.length;
  elements.roomCount.textContent = getRooms().length;
}

function renderItems() {
  const visibleItems = getVisibleItems();
  const hasFilter = Boolean(state.query.trim()) || state.room !== 'Alle';

  elements.resultLabel.textContent = hasFilter ? `${visibleItems.length} TREFF` : 'ALLE TING';
  elements.listTitle.textContent = state.room === 'Alle' ? 'Dette har du lagret' : state.room;
  elements.itemGrid.hidden = visibleItems.length === 0;
  elements.emptyState.hidden = visibleItems.length !== 0;

  if (visibleItems.length === 0) {
    elements.emptyTitle.textContent = state.items.length === 0 ? 'Her er det tomt' : 'Ingen treff';
    elements.emptyCopy.textContent =
      state.items.length === 0
        ? 'Legg til den første tingen, så slipper du å lure på hvor den ligger senere.'
        : 'Prøv et annet søk eller velg et annet rom.';
    elements.itemGrid.innerHTML = '';
    return;
  }

  elements.itemGrid.innerHTML = visibleItems
    .map((item) => {
      const icon = categoryIcons[item.category] ?? categoryIcons.Annet;
      return `
        <article class="item-card" data-id="${item.id}">
          <div class="item-card__top">
            <span class="category-icon" title="${escapeHtml(item.category)}" aria-label="${escapeHtml(item.category)}">${icon}</span>
            <div class="card-menu">
              <button class="icon-button" type="button" data-action="edit" aria-label="Rediger ${escapeHtml(item.name)}">✎</button>
              <button class="icon-button" type="button" data-action="delete" aria-label="Slett ${escapeHtml(item.name)}">×</button>
            </div>
          </div>
          <h3>${escapeHtml(item.name)}</h3>
          <span class="item-room">⌂ ${escapeHtml(item.room)}</span>
          <p class="item-location">${escapeHtml(item.location)}</p>
          ${item.notes ? `<p class="item-notes">${escapeHtml(item.notes)}</p>` : ''}
          <div class="item-card__bottom">
            <span>Endret ${formatRelativeTime(item.updatedAt)}</span>
            <button class="copy-button" type="button" data-action="copy">Kopier plassering</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function render() {
  renderStats();
  renderFilters();
  renderItems();
}

function openCreateDialog() {
  elements.itemForm.reset();
  elements.itemId.value = '';
  elements.dialogEyebrow.textContent = 'NY TING';
  elements.dialogTitle.textContent = 'Hvor ligger den?';
  elements.itemCategory.value = 'Annet';
  elements.itemDialog.showModal();
  requestAnimationFrame(() => elements.itemName.focus());
}

function openEditDialog(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;

  elements.itemId.value = item.id;
  elements.itemName.value = item.name;
  elements.itemCategory.value = item.category;
  elements.itemRoom.value = item.room;
  elements.itemLocation.value = item.location;
  elements.itemNotes.value = item.notes ?? '';
  elements.dialogEyebrow.textContent = 'REDIGER';
  elements.dialogTitle.textContent = item.name;
  elements.itemDialog.showModal();
  requestAnimationFrame(() => elements.itemName.focus());
}

function closeItemDialog() {
  elements.itemDialog.close();
}

function handleSubmit(event) {
  event.preventDefault();
  const now = Date.now();
  const id = elements.itemId.value;
  const existing = state.items.find((item) => item.id === id);

  const item = {
    id: id || crypto.randomUUID(),
    name: elements.itemName.value.trim(),
    category: elements.itemCategory.value,
    room: elements.itemRoom.value.trim(),
    location: elements.itemLocation.value.trim(),
    notes: elements.itemNotes.value.trim(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    state.items = state.items.map((entry) => (entry.id === id ? item : entry));
    showToast(`${item.name} er oppdatert`);
  } else {
    state.items.unshift(item);
    showToast(`${item.name} er lagret`);
  }

  saveItems();
  closeItemDialog();
  render();
}

function requestDelete(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;
  state.deleteId = id;
  elements.confirmCopy.textContent = `${item.name} fjernes permanent fra denne nettleseren.`;
  elements.confirmDialog.showModal();
}

function deleteItem() {
  const item = state.items.find((entry) => entry.id === state.deleteId);
  if (!item) return;
  state.items = state.items.filter((entry) => entry.id !== state.deleteId);
  state.deleteId = null;
  saveItems();
  elements.confirmDialog.close();
  render();
  showToast(`${item.name} er slettet`);
}

async function copyLocation(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;
  const text = `${item.name}: ${item.room} – ${item.location}`;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Plasseringen er kopiert');
  } catch {
    showToast(text);
  }
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2600);
}

function exportItems() {
  const payload = {
    app: 'Hvor er den?',
    version: 1,
    exportedAt: new Date().toISOString(),
    items: state.items,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hvor-er-den-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Sikkerhetskopi lastet ned');
}

async function importItems(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    const items = Array.isArray(payload) ? payload : payload.items;
    if (!Array.isArray(items)) throw new Error('Ugyldig fil');

    const validItems = items.filter(
      (item) => item && item.name && item.room && item.location,
    );
    state.items = validItems.map((item) => ({
      id: item.id || crypto.randomUUID(),
      name: String(item.name),
      category: categoryIcons[item.category] ? item.category : 'Annet',
      room: String(item.room),
      location: String(item.location),
      notes: String(item.notes ?? ''),
      createdAt: Number(item.createdAt) || Date.now(),
      updatedAt: Number(item.updatedAt) || Date.now(),
    }));
    saveItems();
    render();
    showToast(`${state.items.length} ting importert`);
  } catch {
    showToast('Kunne ikke lese sikkerhetskopien');
  } finally {
    elements.importData.value = '';
  }
}

function handleCardAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const card = button.closest('.item-card');
  const id = card?.dataset.id;
  if (!id) return;

  if (button.dataset.action === 'edit') openEditDialog(id);
  if (button.dataset.action === 'delete') requestDelete(id);
  if (button.dataset.action === 'copy') copyLocation(id);
}

document.querySelector('#open-create').addEventListener('click', openCreateDialog);
document.querySelector('#empty-create').addEventListener('click', openCreateDialog);
document.querySelector('#close-dialog').addEventListener('click', closeItemDialog);
document.querySelector('#cancel-dialog').addEventListener('click', closeItemDialog);
document.querySelector('#cancel-delete').addEventListener('click', () => elements.confirmDialog.close());
document.querySelector('#confirm-delete').addEventListener('click', deleteItem);
document.querySelector('#export-data').addEventListener('click', exportItems);
elements.importData.addEventListener('change', (event) => importItems(event.target.files?.[0]));
elements.itemForm.addEventListener('submit', handleSubmit);
elements.itemGrid.addEventListener('click', handleCardAction);
elements.quickFilters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-room]');
  if (!button) return;
  state.room = button.dataset.room;
  render();
});
elements.searchInput.addEventListener('input', (event) => {
  state.query = event.target.value;
  renderItems();
});
elements.sortSelect.addEventListener('change', (event) => {
  state.sort = event.target.value;
  renderItems();
});
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    elements.searchInput.focus();
  }
});
elements.itemDialog.addEventListener('click', (event) => {
  if (event.target === elements.itemDialog) closeItemDialog();
});
elements.confirmDialog.addEventListener('click', (event) => {
  if (event.target === elements.confirmDialog) elements.confirmDialog.close();
});

saveItems();
render();
