(() => {
  'use strict';

  let scheduled = false;

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      syncDetail();
    });
  }

  function directField(form, selector) {
    return [...form.children].find((child) => child.matches('label') && child.querySelector(selector)) || null;
  }

  function compactAddForm(form) {
    if (!form || form.dataset.v22Compact === '1') return;

    const titleRow = form.querySelector(':scope > .section-title-row');
    const titleLabel = directField(form, 'input[name="title"]');
    const addGrid = form.querySelector(':scope > .v22-add-grid');
    const linkedLabel = directField(form, 'select[name="linkedItemId"]');
    const noteLabel = directField(form, 'input[name="note"]');
    const submit = form.querySelector(':scope > button[type="submit"]');
    if (!titleLabel || !submit) return;

    form.dataset.v22Compact = '1';
    form.classList.add('v22-add-item--compact');

    const heading = titleRow?.querySelector('h3');
    if (heading) heading.textContent = 'Legg til punkt';

    const titleInput = titleLabel.querySelector('input[name="title"]');
    titleInput?.setAttribute('aria-label', 'Hva skal huskes?');

    const quickRow = document.createElement('div');
    quickRow.className = 'v22-quick-add';
    quickRow.append(titleLabel, submit);
    submit.innerHTML = '<svg><use href="#i-plus" /></svg><span>Legg til</span>';

    const more = document.createElement('details');
    more.className = 'v22-more-options';
    const summary = document.createElement('summary');
    summary.innerHTML = '<span>Flere valg</span><small>del, antall, plassering og notat</small>';
    const fields = document.createElement('div');
    fields.className = 'v22-advanced-fields';
    [addGrid, linkedLabel, noteLabel].filter(Boolean).forEach((field) => fields.append(field));
    more.append(summary, fields);

    if (titleRow) titleRow.after(quickRow);
    else form.prepend(quickRow);
    quickRow.after(more);
  }

  function compactListActions(actions) {
    if (!actions || actions.dataset.v22Compact === '1') return;
    actions.dataset.v22Compact = '1';

    const more = document.createElement('details');
    more.className = 'v22-list-more';
    const summary = document.createElement('summary');
    summary.textContent = 'Listevalg';
    const body = document.createElement('div');
    body.className = 'v22-list-more-actions';
    while (actions.firstChild) body.append(actions.firstChild);
    more.append(summary, body);
    actions.replaceWith(more);
  }

  function syncDetail() {
    const panel = document.querySelector('#v22-list-dialog [data-v22-detail-panel]');
    if (!panel) return;

    const unpackActive = Boolean(panel.querySelector('[data-v22-mode="unpack"].is-active'));
    panel.classList.toggle('v22-is-unpack', unpackActive);
    compactAddForm(panel.querySelector('.v22-add-item'));
    compactListActions(panel.querySelector('.v22-list-actions'));
  }

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-v22-mode], [data-v22-open-list]')) scheduleSync();
  }, true);
  document.addEventListener('hed22:changed', scheduleSync);
  scheduleSync();
})();