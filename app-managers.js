function openManager(type) { state.manager = type; renderManager(); if (!el.settingsSheet.open) el.settingsSheet.showModal(); }
function renderManager() {
  if (state.manager === 'categories') renderCategoryManager();
  if (state.manager === 'rooms') renderRoomManager();
  if (state.manager === 'containers') renderContainerManager();
  if (state.manager === 'appearance') renderAppearanceManager();
  if (state.manager === 'home') renderHomeManager();
}
function renderCategoryManager() {
  el.settingsSheetTitle.textContent = 'Kategorier';
  el.settingsSheetContent.innerHTML = `<div class="manager-header-card"><strong>Tilpass kategoriene</strong><p>Velg navn, ikon og farge som passer hjemmet.</p></div><button class="manager-add-button" type="button" data-add-entity="category"><svg><use href="#i-plus" /></svg>Ny kategori</button><div class="manager-list">${state.data.categories.map((entry) => `<button class="manager-row" type="button" data-edit-entity="category" data-entity-id="${escapeHtml(entry.id)}"><span class="manager-row__icon" style="background:${entry.color}22">${escapeHtml(entry.icon)}</span><span><strong>${escapeHtml(entry.name)}</strong><small>${entry.protected ? 'Standardkategori' : 'Trykk for å redigere'}</small></span><span class="manager-row__count">${categoryCount(entry.id)}</span><svg class="chevron"><use href="#i-chevron" /></svg></button>`).join('')}</div>`;
}
function renderRoomManager() {
  el.settingsSheetTitle.textContent = 'Rom og steder';
  el.settingsSheetContent.innerHTML = `<div class="manager-header-card"><strong>Bygg opp hjemmet</strong><p>Rom kan også være garasje, hytte eller et annet sted.</p></div><button class="manager-add-button" type="button" data-add-entity="room"><svg><use href="#i-plus" /></svg>Nytt rom eller sted</button><div class="manager-list">${state.data.rooms.map((entry) => `<button class="manager-row" type="button" data-edit-entity="room" data-entity-id="${escapeHtml(entry.id)}"><span class="manager-row__icon">${escapeHtml(entry.icon)}</span><span><strong>${escapeHtml(entry.name)}</strong><small>${state.data.containers.filter((box) => box.roomId === entry.id).length} plasseringer</small></span><span class="manager-row__count">${roomCount(entry.id)}</span><svg class="chevron"><use href="#i-chevron" /></svg></button>`).join('')}</div>`;
}
function renderContainerManager() {
  el.settingsSheetTitle.textContent = 'Skap, skuffer og kasser';
  const entries = [...state.data.containers].sort((a, b) => getRoom(a.roomId).name.localeCompare(getRoom(b.roomId).name, 'nb-NO') || a.name.localeCompare(b.name, 'nb-NO'));
  el.settingsSheetContent.innerHTML = `<div class="manager-header-card"><strong>Nøyaktige plasseringer</strong><p>Hver plassering får en kode og en QR-etikett.</p></div><button class="manager-add-button" type="button" data-add-entity="container"><svg><use href="#i-plus" /></svg>Ny plassering</button><div class="manager-list">${entries.length ? entries.map((entry) => `<button class="manager-row container-manager-row" type="button" data-edit-entity="container" data-entity-id="${escapeHtml(entry.id)}"><span class="manager-row__icon">${escapeHtml(entry.icon)}</span><span><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(getRoom(entry.roomId)?.name)} · ${escapeHtml(entry.kind)} · ${escapeHtml(entry.code)}</small></span><span class="manager-row__count">${containerCount(entry.id)}</span><svg class="chevron"><use href="#i-chevron" /></svg></button>`).join('') : '<p class="activity-empty">Ingen plasseringer ennå.</p>'}</div>`;
}
function renderAppearanceManager() {
  el.settingsSheetTitle.textContent = 'Utseende'; const options = [{ id: 'light', title: 'Lys', copy: 'Hvit og rolig som standard', icon: '☀️' }, { id: 'dark', title: 'Mørk', copy: 'Mørk bakgrunn og lyse kort', icon: '🌙' }, { id: 'system', title: 'Følg iPhone', copy: 'Bytter automatisk med telefonen', icon: '◐' }];
  el.settingsSheetContent.innerHTML = `<div class="manager-header-card"><strong>Velg tema</strong><p>Valget lagres på denne enheten.</p></div><div class="theme-options">${options.map((option) => `<button class="theme-option ${state.data.settings.theme === option.id ? 'is-active' : ''}" type="button" data-theme-choice="${option.id}"><span class="theme-preview">${option.icon}</span><span><strong>${option.title}</strong><small>${option.copy}</small></span><svg class="theme-check"><use href="#i-check" /></svg></button>`).join('')}</div>`;
}
function renderHomeManager() {
  el.settingsSheetTitle.textContent = 'Hjem og medlemmer'; const members = state.data.home.members;
  el.settingsSheetContent.innerHTML = `<div class="manager-header-card"><strong>Felles hjem</strong><p>Invitasjonene er klargjort i UI-et. Ekte tilgang krever innlogging og backend.</p></div><form class="home-settings-form" id="home-name-form"><label class="field"><span>Navn på hjemmet</span><input id="home-name-input" type="text" maxlength="50" value="${escapeHtml(state.data.home.name)}" required /></label><button class="primary-small-button" type="submit">Lagre navn</button></form><span class="card-overline">MEDLEMMER</span><div class="member-list">${members.map((member) => `<div class="member-row"><span class="member-avatar">${escapeHtml(initials(member.name))}</span><span><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.role)}${member.status === 'invited' ? ' · Invitert lokalt' : ''}</small></span>${member.owner ? '<span class="settings-meta">Eier</span>' : `<button class="member-remove" type="button" data-remove-member="${escapeHtml(member.id)}">Fjern</button>`}</div>`).join('')}</div><span class="card-overline">INVITER</span><form class="invite-form" id="invite-form"><input id="invite-name" type="text" maxlength="60" placeholder="Navn eller e-post" required /><button class="primary-small-button" type="submit">Inviter</button></form><p class="invite-note">Ingen melding sendes i prototypen. Medlemmet vises lokalt frem til backend kobles på.</p>`;
}

function openEntityDialog(type, id = '', parentRoomId = '') {
  const list = type === 'category' ? state.data.categories : type === 'room' ? state.data.rooms : state.data.containers;
  const entity = list.find((entry) => entry.id === id);
  el.entityType.value = type; el.entityId.value = entity?.id || ''; el.entityName.value = entity?.name || ''; el.entityIcon.value = entity?.icon || (type === 'room' ? '📍' : '📦'); el.entityColor.value = entity?.color || '#8b5cf6';
  el.entityColorField.hidden = type !== 'category'; el.entityRoomField.hidden = type !== 'container'; el.entityKindField.hidden = type !== 'container';
  el.entityRoom.innerHTML = state.data.rooms.map((room) => `<option value="${escapeHtml(room.id)}">${escapeHtml(room.icon)} ${escapeHtml(room.name)}</option>`).join('');
  if (type === 'container') { el.entityRoom.value = entity?.roomId || parentRoomId || el.itemRoom.value || state.data.rooms[0]?.id; el.entityKind.value = entity?.kind || 'Kasse'; }
  el.entityOverline.textContent = entity ? 'REDIGER' : 'NY'; el.entityTitle.textContent = entity ? entity.name : type === 'category' ? 'Ny kategori' : type === 'room' ? 'Nytt rom' : 'Ny plassering'; el.entityDelete.hidden = !entity || Boolean(entity.protected);
  if (!el.entityDialog.open) el.entityDialog.showModal(); requestAnimationFrame(() => el.entityName.focus());
}
function saveEntity(event) {
  event.preventDefault(); if (!el.entityForm.reportValidity()) return;
  const type = el.entityType.value; const list = type === 'category' ? state.data.categories : type === 'room' ? state.data.rooms : state.data.containers; const id = el.entityId.value; const name = el.entityName.value.trim();
  if (list.some((entry) => entry.id !== id && sameText(entry.name, name) && (type !== 'container' || entry.roomId === el.entityRoom.value))) return showToast('Navnet finnes allerede');
  let entity = list.find((entry) => entry.id === id);
  if (entity) {
    entity.name = name; entity.icon = el.entityIcon.value.trim().slice(0, 4) || '📦';
    if (type === 'category') entity.color = el.entityColor.value;
    if (type === 'container') { entity.roomId = el.entityRoom.value; entity.kind = el.entityKind.value; }
  } else {
    entity = { id: makeId(type), name, icon: el.entityIcon.value.trim().slice(0, 4) || '📦', protected: false };
    if (type === 'category') entity.color = el.entityColor.value;
    if (type === 'container') Object.assign(entity, { roomId: el.entityRoom.value, kind: el.entityKind.value, code: makeCode(name), createdAt: Date.now() });
    if (type === 'category' || type === 'room') { const protectedIndex = list.findIndex((entry) => entry.protected); list.splice(protectedIndex >= 0 ? protectedIndex : list.length, 0, entity); } else list.push(entity);
  }
  saveData(); renderAll(); renderSelects(el.itemCategory.value, el.itemRoom.value, state.inlineContainerRequest ? entity.id : el.itemContainer.value); if (state.manager) renderManager(); el.entityDialog.close();
  if (state.inlineContainerRequest && type === 'container') { el.itemRoom.value = entity.roomId; renderContainerSelect(entity.id); state.inlineContainerRequest = false; }
  showToast(id ? 'Endringen er lagret' : 'Lagt til');
}
function requestEntityDelete() {
  const type = el.entityType.value; const id = el.entityId.value; const list = type === 'category' ? state.data.categories : type === 'room' ? state.data.rooms : state.data.containers; const entity = list.find((entry) => entry.id === id); if (!entity || entity.protected) return;
  const count = type === 'category' ? categoryCount(id, true) : type === 'room' ? roomCount(id, true) : containerCount(id, true);
  const copy = type === 'category' ? `${count} ting flyttes til «Annet».` : type === 'room' ? `${count} ting og alle plasseringer flyttes til «Annet sted».` : `${count} ting beholder rommet, men mister denne plasseringen.`;
  showAlert({ title: `Slette ${entity.name}?`, html: `<p>${copy} Ingenting blir borte.</p>`, actions: `<button class="secondary-button" type="button" data-close-alert>Avbryt</button><button class="danger-button" type="button" data-confirm-entity-delete="${type}" data-entity-id="${escapeHtml(id)}">Slett</button>` });
}
function deleteEntity(type, id) {
  const list = type === 'category' ? state.data.categories : type === 'room' ? state.data.rooms : state.data.containers; const entity = list.find((entry) => entry.id === id); if (!entity || entity.protected) return;
  [...state.data.items, ...state.data.deleted].forEach((item) => { if (type === 'category' && item.categoryId === id) item.categoryId = 'cat-other'; if (type === 'room' && item.roomId === id) { item.roomId = 'room-other'; item.containerId = ''; } if (type === 'container' && item.containerId === id) item.containerId = ''; });
  if (type === 'room') state.data.containers.forEach((container) => { if (container.roomId === id) container.roomId = 'room-other'; });
  if (type === 'category') state.data.categories = list.filter((entry) => entry.id !== id); if (type === 'room') state.data.rooms = list.filter((entry) => entry.id !== id); if (type === 'container') state.data.containers = list.filter((entry) => entry.id !== id);
  if (state.categoryId === id) state.categoryId = ''; if (state.selectedRoomId === id) state.selectedRoomId = '';
  saveData(); renderSelects(); renderAll(); if (state.manager) renderManager(); el.alertDialog.close(); el.entityDialog.close(); showToast(`${entity.name} er slettet`);
}

function containerUrl(container) {
  const url = new URL(location.href); url.search = ''; url.hash = ''; url.searchParams.set('container', container.code); return url.toString();
}
function openContainerQr(id) {
  const container = getContainer(id); if (!container) return; const room = getRoom(container.roomId); const items = state.data.items.filter((item) => item.containerId === id); const url = containerUrl(container); const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=24&data=${encodeURIComponent(url)}`;
  el.qrBody.innerHTML = `<div class="qr-label"><div class="qr-image"><img src="${qrSrc}" alt="QR-kode for ${escapeHtml(container.name)}" /></div><h3>${escapeHtml(container.icon)} ${escapeHtml(container.name)}</h3><p>${escapeHtml(room?.name)} · ${escapeHtml(container.kind)} · ${items.length} ting</p><div class="qr-code-text">${escapeHtml(container.code)}</div></div><div class="qr-actions"><button class="secondary-button" type="button" data-copy-qr="${escapeHtml(id)}"><svg><use href="#i-copy" /></svg>Kopier lenke</button><button class="primary-button" type="button" data-print-qr><svg><use href="#i-qr" /></svg>Skriv ut</button></div><div class="compact-list" style="margin-top:16px">${items.length ? items.map((item) => itemRowHtml(item)).join('') : emptyInline('Tom plassering', 'Legg til ting direkte i denne plasseringen.')}</div><button class="secondary-button" style="margin-top:12px" type="button" data-add-to-container="${escapeHtml(id)}"><svg><use href="#i-plus" /></svg>Legg til ting her</button><p class="qr-note">QR-generering krever nett i denne prototypen. Selve appdataene lagres fortsatt lokalt.</p>`;
  if (!el.qrDialog.open) el.qrDialog.showModal();
}

function saveHomeName(event) { event.preventDefault(); const input = document.querySelector('#home-name-input'); const name = input?.value.trim(); if (!name) return; state.data.home.name = name; saveData(); renderAll(); showToast('Hjemmet er oppdatert'); }
function addPrototypeMember(event) { event.preventDefault(); const input = document.querySelector('#invite-name'); const name = input?.value.trim(); if (!name) return; if (state.data.home.members.some((entry) => sameText(entry.name, name))) return showToast('Personen finnes allerede'); state.data.home.members.push({ id: makeId('member'), name, role: 'Medlem', status: 'invited', owner: false }); saveData(); renderAll(); renderHomeManager(); showToast('Prototypeinvitasjon opprettet'); }
function removeMember(id) { state.data.home.members = state.data.home.members.filter((entry) => entry.id !== id || entry.owner); saveData(); renderAll(); renderHomeManager(); showToast('Medlemmet er fjernet'); }
function setTheme(theme) { if (!THEME_LABELS[theme]) return; state.data.settings.theme = theme; saveData(); applyTheme(); renderAll(); renderAppearanceManager(); }

function exportData() { const payload = { app: 'Hvor er den?', version: 4, exportedAt: new Date().toISOString(), ...state.data }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `hvor-er-den-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); showToast('Sikkerhetskopien er eksportert'); }
async function importData(file) { if (!file) return; try { state.data = normalizeData(JSON.parse(await file.text())); saveData(); applyTheme(); renderSelects(); renderAll(); showToast(`${state.data.items.length} ting er importert`); } catch (error) { console.error(error); showToast('Kunne ikke lese sikkerhetskopien'); } finally { el.importData.value = ''; } }
function showAlert({ title, html, actions }) { el.alertTitle.textContent = title; el.alertCopy.innerHTML = html; el.alertActions.innerHTML = actions || '<button class="primary-button" type="button" data-close-alert>Skjønner</button>'; if (!el.alertDialog.open) el.alertDialog.showModal(); }
function showInstallHelp() { const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone; if (standalone) return showToast('Appen er allerede installert'); if (state.deferredInstallPrompt) return state.deferredInstallPrompt.prompt(); showAlert({ title: 'Installer på iPhone', html: '<ol><li>Åpne siden i Safari.</li><li>Trykk på Del-knappen.</li><li>Velg «Legg til på Hjem-skjerm».</li><li>Trykk «Legg til».</li></ol>' }); }
let toastTimer; function showToast(message) { clearTimeout(toastTimer); el.toast.textContent = message; el.toast.hidden = false; toastTimer = setTimeout(() => { el.toast.hidden = true; }, 2600); }
function renderAll() { renderHome(); renderSearch(); renderRooms(); renderProfile(); }
