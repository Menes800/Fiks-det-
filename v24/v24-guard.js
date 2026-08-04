(() => {
  'use strict';

  const draft = { days: '', people: '', search: '' };
  let scheduled = false;

  function filterTemplates() {
    const dialog = document.querySelector('#v24-wizard');
    const input = dialog?.querySelector('[data-v24-search]');
    if (!input) return;
    if (input.value !== draft.search) input.value = draft.search;
    const query = draft.search.trim().toLocaleLowerCase('nb-NO');
    dialog.querySelectorAll('[data-v24-template]').forEach((button) => {
      const card = button.closest('.v23-template-card');
      const text = button.textContent.toLocaleLowerCase('nb-NO');
      if (card) card.hidden = Boolean(query && !text.includes(query));
    });
  }

  function restoreDraft() {
    const days = document.querySelector('#v24-wizard [data-v24-days]');
    const people = document.querySelector('#v24-wizard [data-v24-people]');
    if (days && draft.days) days.value = draft.days;
    if (people && draft.people) people.value = draft.people;
    filterTemplates();
    document.querySelectorAll('[data-v22-open-templates]').forEach((button) => {
      button.textContent = '✨ Smarte maler';
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; restoreDraft(); });
  }

  window.addEventListener('input', (event) => {
    if (event.target.matches('[data-v24-search]')) {
      event.stopImmediatePropagation();
      draft.search = event.target.value;
      filterTemplates();
      return;
    }
    if (event.target.matches('[data-v24-days]')) draft.days = event.target.value;
    if (event.target.matches('[data-v24-people]')) draft.people = event.target.value;
  }, true);

  window.addEventListener('click', (event) => {
    if (event.target.closest('[data-v22-open-templates]')) {
      draft.days = ''; draft.people = ''; draft.search = '';
      schedule();
      return;
    }
    const template = event.target.closest('[data-v24-template]');
    if (template) { draft.days = ''; draft.people = ''; schedule(); return; }
    const choice = event.target.closest('[data-v24-choice]');
    if (choice?.dataset.v24Choice === 'duration') draft.days = '';
    if (choice?.dataset.v24Choice === 'people') draft.people = '';
    if (event.target.closest('#v24-wizard')) schedule();
  }, true);

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
})();