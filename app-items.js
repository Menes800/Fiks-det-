function openNewForm() {
  el.itemForm.reset(); el.itemId.value = ''; el.addTitle.textContent = 'Legg til ting'; state.formImage = '';
  renderSelects('cat-other', state.data.rooms[0]?.id || 'room-other', ''); renderPhotoPreview();
}
function openEditForm(id) {
  const item = state.data.items.find((entry) => entry.id === id); if (!item) return;
  state.previousScreen = state.screen; el.itemId.value = item.id; el.itemName.value = item.name; renderSelects(item.categoryId, item.roomId, item.containerId); el.itemDetail.value = item.detail; el.itemTags.value = item.tags.join(', '); el.itemNotes.value = item.notes; el.itemFavorite.checked = item.favorite; el.itemPrivate.checked = item.visibility === 'private'; state.formImage = item.image; el.addTitle.textContent = 'Rediger ting'; renderPhotoPreview(); if (el.detailSheet.open) el.detailSheet.close(); navigate('add', { preserveForm: true, instant: true });
}
function renderPhotoPreview() {
  el.photoPreview.classList.toggle('has-image', Boolean(state.formImage));
  el.photoPreview.innerHTML = state.formImage ? `<img src="${state.formImage}" alt="Valgt bilde" /><span>Bytt bilde</span>` : '<svg><use href="#i-camera" /></svg><span>Legg til bilde</span>';
}
async function resizeImage(file) {
  const bitmap = await createImageBitmap(file); const max = 900; const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale); canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.(); return canvas.toDataURL('image/jpeg', .78);
}
function parseTags(value) { return [...new Set(String(value || '').split(',').map((tag) => tag.trim().replace(/^#/, '').toLocaleLowerCase('nb-NO')).filter(Boolean))].slice(0, 12); }

function saveItem(event) {
  event.preventDefault(); if (!el.itemForm.reportValidity()) return;
  const now = Date.now(); const id = el.itemId.value; const existing = state.data.items.find((entry) => entry.id === id); const beforePath = existing ? getPath(existing) : '';
  const roomId = el.itemRoom.value; const selectedContainer = getContainer(el.itemContainer.value); const containerId = selectedContainer?.roomId === roomId ? selectedContainer.id : '';
  const item = { id: id || makeId('item'), name: el.itemName.value.trim(), categoryId: el.itemCategory.value, roomId, containerId, detail: el.itemDetail.value.trim(), tags: parseTags(el.itemTags.value), notes: el.itemNotes.value.trim(), visibility: el.itemPrivate.checked ? 'private' : 'home', favorite: el.itemFavorite.checked, image: state.formImage, createdAt: existing?.createdAt || now, updatedAt: now, movedAt: existing?.movedAt || now, deletedAt: 0 };
  const afterPath = getPath(item);
  if (existing) {
    if (beforePath !== afterPath) { item.movedAt = now; recordActivity('move', item, `flyttet ${item.name} fra «${beforePath || 'uten plassering'}» til «${afterPath || 'uten plassering'}»`); }
    else recordActivity('edit', item, `oppdaterte ${item.name}`);
    state.data.items = state.data.items.map((entry) => entry.id === id ? item : entry);
  } else {
    state.data.items.unshift(item); recordActivity('add', item, `la til ${item.name}`);
  }
  saveData(); renderAll(); navigate(state.previousScreen === 'add' ? 'home' : (state.previousScreen || 'home'), { instant: true }); showToast(existing ? `${item.name} er oppdatert` : `${item.name} er lagt til`);
}

function openDetail(id) {
  const item = state.data.items.find((entry) => entry.id === id); if (!item) return; state.detailId = id;
  const category = getCategory(item.categoryId); const container = getContainer(item.containerId); const history = state.data.activity.filter((entry) => entry.itemId === item.id).slice(0, 5);
  const path = getPathParts(item);
  el.detailBody.innerHTML = `<div class="detail-image">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" />` : escapeHtml(category?.icon || '📦')}</div><div class="detail-title-row"><div><span class="card-overline">${escapeHtml(category?.name || 'ANNET')}</span><h1>${escapeHtml(item.name)}</h1></div><button class="favorite-button ${item.favorite ? 'is-active' : ''}" type="button" data-detail-action="favorite"><svg><use href="#i-star" /></svg></button></div><div class="path-card">${path.map((part, index) => `${index ? '<svg><use href="#i-chevron" /></svg>' : ''}<span>${escapeHtml(part)}</span>`).join('') || '<span>Ingen nøyaktig plassering</span>'}</div><dl class="detail-fields"><div class="detail-field"><dt>Deling</dt><dd>${item.visibility === 'private' ? 'Bare meg' : state.data.home.name}</dd></div>${container ? `<div class="detail-field"><dt>Kode</dt><dd><button class="link-button" type="button" data-container-id="${escapeHtml(container.id)}">${escapeHtml(container.code)} · Vis QR</button></dd></div>` : ''}${item.notes ? `<div class="detail-field"><dt>Notat</dt><dd>${escapeHtml(item.notes)}</dd></div>` : ''}</dl>${item.tags.length ? `<div class="tag-list">${item.tags.map((tag) => `<span class="tag-chip">#${escapeHtml(tag)}</span>`).join('')}</div>` : ''}<div class="detail-actions"><button class="primary-button" type="button" data-detail-action="edit"><svg><use href="#i-move" /></svg> Flytt eller rediger</button><button class="secondary-button" type="button" data-detail-action="copy"><svg><use href="#i-copy" /></svg> Kopier plassering</button><button class="secondary-button" type="button" data-detail-action="share"><svg><use href="#i-share" /></svg> Del</button><button class="danger-button" type="button" data-detail-action="delete"><svg><use href="#i-trash" /></svg> Slett</button></div><section class="detail-history"><h3>Historikk</h3>${history.length ? history.map(activityRowHtml).join('') : '<p class="activity-empty">Ingen historikk ennå.</p>'}</section>`;
  if (!el.detailSheet.open) el.detailSheet.showModal();
}
function toggleFavorite(id) {
  const item = state.data.items.find((entry) => entry.id === id); if (!item) return; item.favorite = !item.favorite; item.updatedAt = Date.now(); recordActivity('favorite', item, `${item.favorite ? 'la' : 'fjernet'} ${item.name} ${item.favorite ? 'i' : 'fra'} favoritter`); saveData(); renderAll(); openDetail(id);
}
function itemShareText(item) { return `${item.name}\n${getPath(item) || 'Ingen plassering'}${item.notes ? `\n${item.notes}` : ''}`; }
async function copyText(text, success = 'Kopiert') { try { await navigator.clipboard.writeText(text); showToast(success); } catch { showAlert({ title: success, html: `<p>${escapeHtml(text)}</p>` }); } }
async function copyItem(id) { const item = state.data.items.find((entry) => entry.id === id); if (item) copyText(itemShareText(item), 'Plasseringen er kopiert'); }
async function shareItem(id) { const item = state.data.items.find((entry) => entry.id === id); if (!item) return; const text = itemShareText(item); if (navigator.share) { try { await navigator.share({ title: item.name, text }); return; } catch (error) { if (error.name === 'AbortError') return; } } copyText(text, 'Delingsteksten er kopiert'); }
function requestDelete(id) { const item = state.data.items.find((entry) => entry.id === id); if (!item) return; showAlert({ title: `Slette ${item.name}?`, html: '<p>Tingen flyttes til «Nylig slettet» og kan gjenopprettes.</p>', actions: `<button class="secondary-button" type="button" data-close-alert>Avbryt</button><button class="danger-button" type="button" data-confirm-delete="${escapeHtml(id)}">Slett</button>` }); }
function deleteItem(id) { const item = state.data.items.find((entry) => entry.id === id); if (!item) return; state.data.items = state.data.items.filter((entry) => entry.id !== id); item.deletedAt = Date.now(); state.data.deleted.unshift(item); recordActivity('delete', item, `slettet ${item.name}`); saveData(); el.alertDialog.close(); el.detailSheet.close(); renderAll(); showToast(`${item.name} er flyttet til nylig slettet`); }
function restoreItem(id) { const item = state.data.deleted.find((entry) => entry.id === id); if (!item) return; state.data.deleted = state.data.deleted.filter((entry) => entry.id !== id); item.deletedAt = 0; item.updatedAt = Date.now(); state.data.items.unshift(item); recordActivity('restore', item, `gjenopprettet ${item.name}`); saveData(); renderAll(); openListSheet('Nylig slettet', state.data.deleted, 'restore'); showToast(`${item.name} er gjenopprettet`); }

function openListSheet(title, items, action = 'detail') {
  el.listSheetTitle.textContent = title;
  el.listSheetContent.innerHTML = items.length ? `<div class="compact-list">${items.map((item) => itemRowHtml(item, action)).join('')}</div>` : emptyInline('Her er det tomt', 'Ingen ting å vise.');
  if (!el.listSheet.open) el.listSheet.showModal();
}
function openActivitySheet() {
  el.listSheetTitle.textContent = 'Aktivitet';
  el.listSheetContent.innerHTML = state.data.activity.length ? `<div class="activity-list">${state.data.activity.map(activityRowHtml).join('')}</div>` : emptyInline('Ingen aktivitet', 'Endringer i hjemmet vises her.');
  if (!el.listSheet.open) el.listSheet.showModal();
}
function addRecentSearch(term) { const clean = String(term || '').trim(); if (!clean) return; state.data.recentSearches = [clean, ...state.data.recentSearches.filter((entry) => !sameText(entry, clean))].slice(0, 8); saveData(); }
