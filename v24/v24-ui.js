(() => {
  'use strict';

  const H = window.HED21;
  const V = window.HED22;
  const W = window.HED23;
  if (!H || !V) return;

  if (W) W.version = '2.5.0';
  H.version = '2.5.0';
  let scheduled = false;

  function sectionByTitle(screen, title) {
    return [...(screen?.querySelectorAll(':scope > .content-block') || [])].find((section) => section.querySelector('h2')?.textContent.trim() === title) || null;
  }

  function transformHome() {
    const home = document.querySelector('[data-screen="home"]');
    if (!home || home.dataset.v24Home === '1') return;
    home.dataset.v24Home = '1';
    home.classList.add('v24-home');

    const header = home.querySelector('.home-header');
    const search = home.querySelector('.search-launcher');
    const summary = home.querySelector('.hero-summary');
    const recent = sectionByTitle(home, 'Nylig brukt');
    const activity = sectionByTitle(home, 'Siste aktivitet');
    const rooms = sectionByTitle(home, 'Rom');

    summary?.classList.add('v24-home-summary');
    recent?.classList.add('v24-recent');
    rooms?.classList.add('v24-rooms');
    activity?.classList.add('v24-activity');

    if (header && summary) header.after(summary);
    if (summary && search) summary.after(search);

    if (!home.querySelector('.v24-quick-actions') && search) {
      const quick = document.createElement('nav');
      quick.className = 'v24-quick-actions';
      quick.setAttribute('aria-label', 'Hurtigvalg');
      quick.innerHTML = `
        <button type="button" data-open-add><svg><use href="#i-plus" /></svg><span>Ny ting</span></button>
        <button type="button" data-nav="rooms"><svg><use href="#i-rooms" /></svg><span>Plasseringer</span></button>
        <button type="button" data-nav="lists"><svg><use href="#i-check" /></svg><span>Lister</span></button>`;
      search.after(quick);
    }

    if (recent) home.append(recent);
    if (rooms) home.append(rooms);
    if (activity) home.append(activity);
    if (activity?.querySelector('h2')) activity.querySelector('h2').textContent = 'Aktivitet';
  }

  function directChildContaining(parent, selector) {
    return [...(parent?.children || [])].find((child) => child.querySelector?.(selector)) || null;
  }

  function transformAddForm() {
    const screen = document.querySelector('[data-screen="add"]');
    const form = document.querySelector('#item-form');
    if (!screen || !form || form.dataset.v24Form === '1') return;

    const formSection = form.querySelector(':scope > .form-section');
    const photo = form.querySelector(':scope > .photo-picker');
    const save = form.querySelector(':scope > .form-save-button');
    if (!formSection || !save) return;

    const name = directChildContaining(formSection, '#item-name');
    const category = directChildContaining(formSection, '#item-category');
    const room = directChildContaining(formSection, '#item-room');
    const container = directChildContaining(formSection, '#item-container');
    const detail = directChildContaining(formSection, '#item-detail');
    const tags = directChildContaining(formSection, '#item-tags');
    const notes = directChildContaining(formSection, '#item-notes');
    const favorite = form.querySelector(':scope > .toggle-row #item-favorite')?.closest('.toggle-row');
    const privateToggle = form.querySelector(':scope > .toggle-row #item-private')?.closest('.toggle-row');
    if (!name || !category || !room || !container || !detail) return;

    form.dataset.v24Form = '1';
    screen.classList.add('v24-add-screen');

    const core = document.createElement('div');
    core.className = 'v24-add-core';

    const location = document.createElement('section');
    location.className = 'v24-location-card';
    location.innerHTML = '<div class="v24-location-title"><span>📍</span><div><strong>Hvor ligger den?</strong><small>Velg rom og eventuelt skap, skuff eller kasse</small></div></div>';
    const locationFields = document.createElement('div');
    locationFields.className = 'v24-location-fields';
    locationFields.append(room, container, detail);
    location.append(locationFields);

    const more = document.createElement('details');
    more.className = 'v24-more-details';
    const moreSummary = document.createElement('summary');
    moreSummary.innerHTML = '<span><strong>Flere detaljer</strong><small>Bilde, tagger, notat og synlighet</small></span><b>+</b>';
    const moreBody = document.createElement('div');
    moreBody.className = 'v24-more-body';
    [photo, tags, notes, favorite, privateToggle].filter(Boolean).forEach((node) => moreBody.append(node));
    more.append(moreSummary, moreBody);

    const categoryHeading = document.createElement('div');
    categoryHeading.className = 'v24-field-heading';
    categoryHeading.textContent = 'Kategori';
    category.prepend(categoryHeading);

    core.append(name, location, category);
    formSection.replaceWith(core);
    form.insertBefore(more, save);

    const topSave = screen.querySelector('.form-header [form="item-form"]');
    if (topSave) topSave.hidden = true;
  }

  function decorateInvites() {
    const form = document.querySelector('[data-v21-invite-form]');
    if (!form || form.dataset.v24Invite === '1') return;
    form.dataset.v24Invite = '1';
    form.closest('.v21-card')?.classList.add('v24-invite-card');
    const emailLabel = form.querySelector('input[name="email"]')?.closest('label');
    if (emailLabel && !emailLabel.querySelector('.v24-invite-note')) {
      emailLabel.insertAdjacentHTML('beforeend', '<small class="v24-invite-note">Skriv inn e-post for å sende invitasjonen direkte, eller la feltet stå tomt for å lage en delbar lenke.</small>');
    }
    const submit = form.querySelector('button[type="submit"]');
    if (submit && !submit.disabled) submit.textContent = 'Send invitasjon';
  }

  function updateVersion() {
    const meta = document.querySelector('#about-button .settings-meta');
    if (meta && meta.textContent !== 'v2.5') meta.textContent = 'v2.5';
  }

  function sync() {
    transformHome();
    transformAddForm();
    decorateInvites();
    updateVersion();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; sync(); });
  }

  if (!H.__v24ShareWrapped && typeof H.share === 'function') {
    H.__v24ShareWrapped = true;
    const originalShare = H.share.bind(H);
    H.share = async (payload) => {
      const result = await originalShare(payload);
      if (String(payload?.title || '').includes('Invitasjon')) {
        setTimeout(() => H.toast?.('Invitasjonslenken er klar.'), 150);
      }
      return result;
    };
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('hed22:changed', schedule);
  V.ready.then(schedule).catch(schedule);
  schedule();
})();
