function renderHome() {
  el.homeSwitcherName.textContent = state.data.home.name;
  el.homeItemTotal.textContent = state.data.items.length;
  el.homeContainerTotal.textContent = state.data.containers.length;
  const recent = [...state.data.items].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
  el.recentItems.innerHTML = recent.length ? recent.map((item) => itemRowHtml(item)).join('') : emptyInline('Ingen ting ennå', 'Legg til den første tingen.');
  const activity = state.data.activity.slice(0, 3);
  el.homeActivity.innerHTML = activity.length ? activity.map(activityRowHtml).join('') : '<p class="activity-empty">Aktiviteten i hjemmet vises her.</p>';
  const rooms = getRoomsWithCounts().filter((entry) => entry.itemCount || entry.containerCount).slice(0, 6);
  el.homeRooms.innerHTML = rooms.map(({ room, itemCount, containerCount: boxes }) => `<button class="room-card" type="button" data-room-id="${escapeHtml(room.id)}"><span class="room-card__icon">${escapeHtml(room.icon)}</span><span><strong>${escapeHtml(room.name)}</strong><small>${itemCount} ting · ${boxes} plasseringer</small></span></button>`).join('');
}

function getRoomsWithCounts() {
  return state.data.rooms.map((room) => ({ room, itemCount: roomCount(room.id), containerCount: state.data.containers.filter((entry) => entry.roomId === room.id).length })).sort((a, b) => b.itemCount - a.itemCount || b.containerCount - a.containerCount || a.room.name.localeCompare(b.room.name, 'nb-NO'));
}

function filteredItems() {
  const query = normalizeText(state.query);
  const recentLimit = Date.now() - 86400000 * 7;
  return [...state.data.items].filter((item) => {
    const category = getCategory(item.categoryId); const room = getRoom(item.roomId); const container = getContainer(item.containerId);
    const matchesCategory = !state.categoryId || item.categoryId === state.categoryId;
    const matchesRoom = !state.selectedRoomId || item.roomId === state.selectedRoomId;
    const matchesFilter = state.filter === 'all' || (state.filter === 'favorites' && item.favorite) || (state.filter === 'recent' && item.movedAt >= recentLimit) || (state.filter === 'no-image' && !item.image) || (state.filter === 'private' && item.visibility === 'private');
    const haystack = normalizeText([item.name, category?.name, room?.name, container?.name, container?.kind, container?.code, item.detail, item.notes, item.tags.join(' ')].join(' '));
    return matchesCategory && matchesRoom && matchesFilter && (!query || haystack.includes(query));
  }).sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt);
}

function renderSearch() {
  el.searchInput.value = state.query;
  el.clearSearch.hidden = !state.query;
  el.clearCategory.hidden = !state.categoryId && !state.selectedRoomId;
  el.quickFilterList.querySelectorAll('[data-filter]').forEach((button) => button.classList.toggle('is-active', button.dataset.filter === state.filter));
  el.categoryList.innerHTML = state.data.categories.map((category) => `<button class="category-button ${state.categoryId === category.id ? 'is-active' : ''}" type="button" data-category-id="${escapeHtml(category.id)}" style="--category-color:${category.color}"><span class="category-dot">${escapeHtml(category.icon)}</span><strong>${escapeHtml(category.name)}</strong><small>${categoryCount(category.id)}</small></button>`).join('');
  const items = filteredItems(); const selectedCategory = getCategory(state.categoryId); const selectedRoom = getRoom(state.selectedRoomId);
  const filterNames = { favorites: 'Favoritter', recent: 'Nylig flyttet', 'no-image': 'Uten bilde', private: 'Private ting' };
  el.searchResultsTitle.textContent = selectedRoom?.name || selectedCategory?.name || filterNames[state.filter] || (state.query ? `Treff på «${state.query}»` : 'Alle ting');
  el.searchResultsCount.textContent = String(items.length); el.searchResults.hidden = !items.length; el.searchEmpty.hidden = Boolean(items.length);
  el.searchResults.innerHTML = items.map((item) => itemRowHtml(item)).join('');
  el.recentSearchSection.hidden = Boolean(state.query || state.categoryId || state.selectedRoomId || state.filter !== 'all') || !state.data.recentSearches.length;
  el.recentSearches.innerHTML = state.data.recentSearches.map((term) => `<button class="recent-chip" type="button" data-recent-search="${escapeHtml(term)}">${escapeHtml(term)}</button>`).join('');
}

function renderRooms() {
  const rows = getRoomsWithCounts(); el.roomsEmpty.hidden = Boolean(rows.length); el.roomList.hidden = !rows.length;
  el.roomList.innerHTML = rows.map(({ room, itemCount, containerCount: boxes }) => {
    const containers = state.data.containers.filter((entry) => entry.roomId === room.id).sort((a, b) => a.name.localeCompare(b.name, 'nb-NO'));
    return `<section class="room-section-card"><div class="room-section-head"><span>${escapeHtml(room.icon)}</span><button class="room-row__main" type="button" data-room-id="${escapeHtml(room.id)}"><strong>${escapeHtml(room.name)}</strong><small>${itemCount} ting · ${boxes} plasseringer</small></button><div class="room-tools"><button class="room-tool" type="button" data-add-entity="container" data-parent-room="${escapeHtml(room.id)}" aria-label="Ny plassering"><svg><use href="#i-plus" /></svg></button><button class="room-tool" type="button" data-edit-entity="room" data-entity-id="${escapeHtml(room.id)}" aria-label="Rediger rom"><svg><use href="#i-edit" /></svg></button></div></div><div class="container-stack">${containers.length ? containers.map((container) => `<button class="container-row" type="button" data-container-id="${escapeHtml(container.id)}"><span class="container-row__icon">${escapeHtml(container.icon)}</span><span><strong>${escapeHtml(container.name)}</strong><small>${escapeHtml(container.kind)} · ${containerCount(container.id)} ting</small></span><span class="container-code">${escapeHtml(container.code)}</span><svg class="chevron"><use href="#i-chevron" /></svg></button>`).join('') : '<p class="container-empty">Ingen skap, skuffer eller kasser i dette rommet.</p>'}</div></section>`;
  }).join('');
}

function renderProfile() {
  el.profileHomeName.textContent = state.data.home.name;
  const members = state.data.home.members;
  el.homeMembersPreview.innerHTML = `${members.slice(0, 4).map((member) => `<span class="member-avatar" title="${escapeHtml(member.name)}">${escapeHtml(initials(member.name))}</span>`).join('')}<span class="member-summary">${members.length} ${members.length === 1 ? 'medlem' : 'medlemmer'}</span>`;
  el.categoryCount.textContent = state.data.categories.length; el.roomCount.textContent = state.data.rooms.length; el.containerCount.textContent = state.data.containers.length; el.themeLabel.textContent = THEME_LABELS[state.data.settings.theme]; el.activityCount.textContent = state.data.activity.length; el.favoriteCount.textContent = state.data.items.filter((item) => item.favorite).length; el.trashCount.textContent = state.data.deleted.length;
}
