(() => {
  const INVITE_TEXT = /invitasjon|inviter|invite/i;
  const INVITE_URL = /invite|invitasjon|invitation|join|token|bli-med/i;
  const SHARE_CLASS = 'hed-share-invite';
  let scanQueued = false;
  let inviteActionUntil = 0;
  let lastInviteHost = null;

  function cleanCandidate(value) {
    return String(value || '')
      .trim()
      .replace(/^['"(<\[]+/, '')
      .replace(/['")>\],.;:!?]+$/, '');
  }

  function normalizeInviteUrl(value, contextText = '') {
    const candidate = cleanCandidate(value);
    if (!candidate) return '';

    try {
      const url = new URL(candidate, location.href);
      const searchable = `${url.pathname} ${url.search} ${url.hash}`;
      const hasInviteMarker = INVITE_URL.test(searchable);
      const hasTokenLikeQuery = [...url.searchParams.keys()].some((key) =>
        /invite|invitasjon|invitation|join|token|code|kode/i.test(key),
      );

      if (!hasInviteMarker && !hasTokenLikeQuery) return '';
      if (!INVITE_TEXT.test(contextText) && !hasInviteMarker) return '';
      return url.toString();
    } catch {
      return '';
    }
  }

  function extractInviteUrl(root) {
    if (!root) return '';
    const contextText = root.textContent || '';
    const nodes = [root, ...root.querySelectorAll('a, input, textarea, code, pre, [data-invite-url], [data-invite-link], [data-url], [data-link]')];

    for (const node of nodes) {
      const values = [];
      if (node instanceof HTMLAnchorElement) values.push(node.href, node.getAttribute('href'));
      if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) values.push(node.value);
      if (node.dataset) values.push(...Object.values(node.dataset));
      for (const attr of node.attributes || []) {
        if (/invite|invitasjon|url|link|href|token/i.test(attr.name)) values.push(attr.value);
      }
      values.push(node.textContent);

      for (const value of values) {
        const direct = normalizeInviteUrl(value, contextText);
        if (direct) return direct;

        const matches = String(value || '').match(/https?:\/\/[^\s<>"']+|(?:\?|#)[^\s<>"']+/g) || [];
        for (const match of matches) {
          const parsed = normalizeInviteUrl(match, contextText);
          if (parsed) return parsed;
        }
      }
    }

    return '';
  }

  function inviteContext(start) {
    let node = start;
    while (node && node !== document.body) {
      if (INVITE_TEXT.test(node.textContent || '')) {
        const url = extractInviteUrl(node);
        if (url) return { node, url };
      }
      node = node.parentElement;
    }
    return null;
  }

  function homeName() {
    return (
      document.querySelector('#profile-home-name')?.textContent?.trim() ||
      document.querySelector('#home-switcher-name')?.textContent?.trim() ||
      'hjemmet vårt'
    );
  }

  function toast(message) {
    if (typeof window.showToast === 'function') {
      window.showToast(message);
      return;
    }

    const element = document.querySelector('#toast');
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
    clearTimeout(element.__hedInviteTimer);
    element.__hedInviteTimer = setTimeout(() => {
      element.hidden = true;
    }, 2400);
  }

  async function copyInvite(url) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('textarea');
      input.value = url;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.append(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    toast('Invitasjonslenken er kopiert');
  }

  async function shareInvite(url) {
    const payload = {
      title: 'Invitasjon til Hvor er den?',
      text: `Bli med i ${homeName()} i «Hvor er den?»`,
      url,
    };

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    await copyInvite(url);
  }

  function styleShareButton(button, context) {
    const cloud = context.closest('.cloud-panel, .cloud-gate');
    button.className = `${cloud ? 'cloud-primary' : 'primary-button'} ${SHARE_CLASS}`;
    button.type = 'button';
    button.style.width = '100%';
    button.style.marginTop = '12px';
    button.textContent = typeof navigator.share === 'function' ? 'Del invitasjon' : 'Kopier invitasjonslenke';
  }

  function enhanceContext(context, url) {
    if (!context || !url) return;
    const duplicate = [...document.querySelectorAll(`.${SHARE_CLASS}`)].some(
      (button) => button.isConnected && button.dataset.inviteUrl === url,
    );
    if (duplicate) return;

    const button = document.createElement('button');
    styleShareButton(button, context);
    button.dataset.inviteUrl = url;

    const existingCopy = [...context.querySelectorAll('button, a')].find((element) =>
      /kopier.*(?:invitasjon|lenke)|del invitasjon/i.test(element.textContent || ''),
    );

    if (existingCopy) existingCopy.insertAdjacentElement('afterend', button);
    else context.append(button);
  }

  function clarifyInviteForms() {
    for (const form of document.querySelectorAll('form')) {
      if (!INVITE_TEXT.test(`${form.textContent} ${[...form.querySelectorAll('input')].map((input) => input.placeholder).join(' ')}`)) continue;
      const submit = form.querySelector('button[type="submit"], input[type="submit"]');
      if (!submit) continue;
      const current = submit.textContent || submit.value || '';
      if (/^inviter$/i.test(current.trim())) {
        if (submit instanceof HTMLInputElement) submit.value = 'Opprett invitasjonslenke';
        else submit.textContent = 'Opprett invitasjonslenke';
      }
    }
  }

  function scan() {
    scanQueued = false;
    clarifyInviteForms();

    const roots = [...document.querySelectorAll(
      '.cloud-invite-card, .cloud-panel, .sheet-content, dialog, form, section, [class*="invite"], [id*="invite"]',
    )].sort((a, b) => {
      const depth = (node) => { let count = 0; while (node?.parentElement) { count += 1; node = node.parentElement; } return count; };
      return depth(b) - depth(a);
    });

    for (const root of roots) {
      if (!INVITE_TEXT.test(root.textContent || '')) continue;
      const url = extractInviteUrl(root);
      if (url) enhanceContext(root, url);
    }
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(scan);
  }

  function rememberInviteAction(element) {
    const host = element?.closest?.('.cloud-invite-card, form, .cloud-panel, .sheet-content, dialog, section, [class*="invite"], [id*="invite"]');
    if (!host || !INVITE_TEXT.test(host.textContent || '')) return;
    inviteActionUntil = Date.now() + 15000;
    lastInviteHost = host;
  }

  function installClipboardBridge() {
    const clipboard = navigator.clipboard;
    if (!clipboard || typeof clipboard.writeText !== 'function') return;
    const originalWriteText = clipboard.writeText.bind(clipboard);

    try {
      clipboard.writeText = async (text) => {
        const url = normalizeInviteUrl(text, 'invitasjon');
        if (!url || Date.now() > inviteActionUntil) return originalWriteText(text);

        if (lastInviteHost?.isConnected) enhanceContext(lastInviteHost, url);

        if (typeof navigator.share === 'function') {
          try {
            await navigator.share({
              title: 'Invitasjon til Hvor er den?',
              text: `Bli med i ${homeName()} i «Hvor er den?»`,
              url,
            });
            return;
          } catch (error) {
            if (error?.name === 'AbortError') return;
          }
        }

        return originalWriteText(text);
      };
    } catch {
      // Enkelte nettlesere gjør Clipboard-metoden skrivebeskyttet.
    }
  }

  installClipboardBridge();

  document.addEventListener(
    'click',
    (event) => {
      rememberInviteAction(event.target);
      const ownButton = event.target.closest(`.${SHARE_CLASS}`);
      if (ownButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        shareInvite(ownButton.dataset.inviteUrl);
        return;
      }

      const clicked = event.target.closest('button, a');
      if (!clicked || !/kopier.*(?:invitasjon|lenke)|del invitasjon/i.test(clicked.textContent || '')) return;
      const context = inviteContext(clicked);
      if (!context) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      shareInvite(context.url);
    },
    true,
  );

  document.addEventListener('submit', (event) => {
    rememberInviteAction(event.target);
    setTimeout(queueScan, 0);
    setTimeout(queueScan, 400);
    setTimeout(queueScan, 1200);
  }, true);

  new MutationObserver(queueScan).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['href', 'value', 'data-invite-url', 'data-invite-link', 'data-url', 'data-link'],
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', queueScan, { once: true });
  else queueScan();
})();
