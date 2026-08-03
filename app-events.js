// Global click routing
document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-nav]'); if (nav) { const target = nav.dataset.nav; navigate(target, { focusSearch: target === 'search' && nav.classList.contains('search-launcher') }); return; }
  if (event.target.closest('[data-open-add]')) { state.previousScreen = state.screen; navigate('add'); return; }
  const manager = event.target.closest('[data-open-manager]'); if (manager) { openManager(manager.dataset.openManager); return; }
  if (event.target.closest('[data-open-activity]')) { openActivitySheet(); return; }
  const addEntity = event.target.closest('[data-add-entity]'); if (addEntity) { openEntityDialog(addEntity.dataset.addEntity, '', addEntity.dataset.parentRoom || ''); return; }
  const editEntity = event.target.closest('[data-edit-entity]'); if (editEntity) { openEntityDialog(editEntity.dataset.editEntity, editEntity.dataset.entityId); return; }
  const containerButton = event.target.closest('[data-container-id]'); if (containerButton) { openContainerQr(containerButton.dataset.containerId); return; }
  const roomButton = event.target.closest('[data-room-id]'); if (roomButton) { state.selectedRoomId = roomButton.dataset.roomId; state.categoryId = ''; state.query = ''; state.filter = 'all'; navigate('search', { instant: true }); return; }
  const categoryButton = event.target.closest('[data-category-id]'); if (categoryButton) { state.categoryId = state.categoryId === categoryButton.dataset.categoryId ? '' : categoryButton.dataset.categoryId; state.selectedRoomId = ''; renderSearch(); return; }
  const filterButton = event.target.closest('[data-filter]'); if (filterButton) { state.filter = filterButton.dataset.filter; renderSearch(); return; }
  const recentButton = event.target.closest('[data-recent-search]'); if (recentButton) { state.query = recentButton.dataset.recentSearch; state.categoryId = ''; state.selectedRoomId = ''; state.filter = 'all'; renderSearch(); return; }
  const itemButton = event.target.closest('[data-item-id]'); if (itemButton) { itemButton.dataset.itemAction === 'restore' ? restoreItem(itemButton.dataset.itemId) : openDetail(itemButton.dataset.itemId); return; }
  const themeButton = event.target.closest('[data-theme-choice]'); if (themeButton) { setTheme(themeButton.dataset.themeChoice); return; }
  const memberButton = event.target.closest('[data-remove-member]'); if (memberButton) { removeMember(memberButton.dataset.removeMember); return; }
  if (event.target.closest('[data-cancel-form]')) { navigate(state.previousScreen || 'home', { instant: true }); return; }
  if (event.target.closest('[data-close-detail]')) el.detailSheet.close();
  if (event.target.closest('[data-close-list]')) el.listSheet.close();
  if (event.target.closest('[data-close-settings]')) el.settingsSheet.close();
  if (event.target.closest('[data-close-entity]')) { state.inlineContainerRequest = false; el.entityDialog.close(); }
  if (event.target.closest('[data-close-qr]')) el.qrDialog.close();
  if (event.target.closest('[data-close-alert]')) el.alertDialog.close();
  const confirmDelete = event.target.closest('[data-confirm-delete]'); if (confirmDelete) deleteItem(confirmDelete.dataset.confirmDelete);
  const confirmEntityDelete = event.target.closest('[data-confirm-entity-delete]'); if (confirmEntityDelete) deleteEntity(confirmEntityDelete.dataset.confirmEntityDelete, confirmEntityDelete.dataset.entityId);
  const detailAction = event.target.closest('[data-detail-action]'); if (detailAction && state.detailId) { const action = detailAction.dataset.detailAction; if (action === 'favorite') toggleFavorite(state.detailId); if (action === 'copy') copyItem(state.detailId); if (action === 'share') shareItem(state.detailId); if (action === 'edit') openEditForm(state.detailId); if (action === 'delete') requestDelete(state.detailId); }
  const copyQr = event.target.closest('[data-copy-qr]'); if (copyQr) { const container = getContainer(copyQr.dataset.copyQr); if (container) copyText(containerUrl(container), 'QR-lenken er kopiert'); }
  if (event.target.closest('[data-print-qr]')) window.print();
  const addToContainer = event.target.closest('[data-add-to-container]'); if (addToContainer) { const container = getContainer(addToContainer.dataset.addToContainer); if (!container) return; el.qrDialog.close(); state.previousScreen = state.screen; navigate('add'); el.itemRoom.value = container.roomId; renderContainerSelect(container.id); }
});

document.addEventListener('submit', (event) => { if (event.target.id === 'home-name-form') saveHomeName(event); if (event.target.id === 'invite-form') addPrototypeMember(event); });
el.searchInput.addEventListener('input', (event) => { state.query = event.target.value; state.categoryId = ''; state.selectedRoomId = ''; renderSearch(); });
el.searchInput.addEventListener('search', () => addRecentSearch(state.query));
el.searchInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); addRecentSearch(state.query); renderSearch(); el.searchInput.blur(); } });
el.clearSearch.addEventListener('click', () => { state.query = ''; renderSearch(); el.searchInput.focus(); });
el.clearCategory.addEventListener('click', () => { state.categoryId = ''; state.selectedRoomId = ''; renderSearch(); });
el.clearRecentSearches.addEventListener('click', () => { state.data.recentSearches = []; saveData(); renderSearch(); });
el.itemForm.addEventListener('submit', saveItem);
el.itemRoom.addEventListener('change', () => renderContainerSelect(''));
el.addContainerInline.addEventListener('click', () => { state.inlineContainerRequest = true; openEntityDialog('container', '', el.itemRoom.value); });
el.itemImage.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; try { state.formImage = await resizeImage(file); renderPhotoPreview(); } catch { showToast('Kunne ikke lese bildet'); } finally { el.itemImage.value = ''; } });
el.entityForm.addEventListener('submit', saveEntity); el.entityDelete.addEventListener('click', requestEntityDelete); el.detailMore.addEventListener('click', () => { if (state.detailId) shareItem(state.detailId); });
document.querySelector('#show-favorites').addEventListener('click', () => openListSheet('Favoritter', state.data.items.filter((item) => item.favorite)));
document.querySelector('#show-trash').addEventListener('click', () => openListSheet('Nylig slettet', state.data.deleted, 'restore'));
document.querySelector('#account-info').addEventListener('click', () => window.openAccountSheet?.());
document.querySelector('#install-app').addEventListener('click', showInstallHelp); document.querySelector('#export-data').addEventListener('click', exportData); el.importData.addEventListener('change', (event) => importData(event.target.files?.[0]));
document.querySelector('#help-button').addEventListener('click', () => showAlert({ title: 'Slik bruker du 2.0', html: '<ol><li>Opprett rom og plasseringer som skap, skuffer og kasser.</li><li>Legg ting i riktig plassering og bruk korte tagger.</li><li>Åpne en plassering for å vise eller skrive ut QR-etiketten.</li><li>Flytt en ting ved å åpne den og velge «Flytt eller rediger».</li></ol>' }));
document.querySelector('#about-button').addEventListener('click', () => showAlert({ title: 'Hvor er den? 2.0', html: `<p>En felles hjemmeapp for ting, rom, kasser og skap.</p><p><strong>${state.data.items.length}</strong> ting og <strong>${state.data.containers.length}</strong> plasseringer ligger i ${escapeHtml(state.data.home.name)}.</p>` }));
[el.detailSheet, el.listSheet, el.settingsSheet, el.entityDialog, el.qrDialog, el.alertDialog].forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }));
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); state.deferredInstallPrompt = event; });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (state.data.settings.theme === 'system') applyTheme(); });
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));

applyTheme(); renderSelects(); saveData(); renderAll(); navigate('home', { instant: true });
const requestedContainer = new URLSearchParams(location.search).get('container');
if (requestedContainer) { const container = state.data.containers.find((entry) => sameText(entry.code, requestedContainer)); if (container) setTimeout(() => openContainerQr(container.id), 150); }
