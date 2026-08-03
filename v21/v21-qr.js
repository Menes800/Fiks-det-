(() => {
  'use strict';
  const H = window.HED21;
  if (!H) return;
  let stream = null;
  let scanning = false;

  function ensureDialog() {
    let dialog = document.querySelector('#v21-qr-scanner');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'v21-qr-scanner';
    dialog.className = 'v21-dialog';
    dialog.innerHTML = `
      <div class="v21-dialog__panel">
        <header class="v21-dialog__header"><button type="button" class="v21-back" data-v21-qr-close>Tilbake</button><h2>Skann QR</h2><span></span></header>
        <div class="v21-dialog__body">
          <div class="v21-camera"><video playsinline muted data-v21-video></video><div class="v21-camera-frame"></div></div>
          <p class="v21-muted" data-v21-scan-status>Start kameraet og pek på en QR-etikett.</p>
          <button type="button" class="v21-primary" data-v21-start-camera>Start kamera</button>
          <label class="v21-secondary v21-file-button">Les QR fra bilde<input type="file" accept="image/*" data-v21-qr-file hidden></label>
          <form class="v21-inline-form" data-v21-code-form><input name="code" placeholder="Skriv kode, f.eks. JUL-004" required><button class="v21-secondary" type="submit">Åpne</button></form>
        </div>
      </div>`;
    document.body.append(dialog);
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog || event.target.closest('[data-v21-qr-close]')) closeScanner();
      if (event.target.closest('[data-v21-start-camera]')) startCamera();
    });
    dialog.addEventListener('change', async (event) => {
      const input = event.target.closest('[data-v21-qr-file]');
      if (!input?.files?.[0]) return;
      try {
        const bitmap = await createImageBitmap(input.files[0]);
        await detectBitmap(bitmap);
        bitmap.close?.();
      } catch (error) { setStatus(H.errorText(error, 'Fant ingen QR-kode i bildet'), true); }
      input.value = '';
    });
    dialog.addEventListener('submit', (event) => {
      if (!event.target.matches('[data-v21-code-form]')) return;
      event.preventDefault(); openCode(event.target.code.value);
    });
    return dialog;
  }

  function injectButton() {
    if (document.querySelector('[data-v21-open-scanner]')) return;
    const header = document.querySelector('[data-screen="home"] .home-header, [data-screen="home"] .screen-header');
    if (!header) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'round-button v21-scan-button';
    button.dataset.v21OpenScanner = '';
    button.setAttribute('aria-label', 'Skann QR-kode');
    button.innerHTML = '<svg><use href="#i-qr" /></svg>';
    header.append(button);
  }

  function setStatus(text, error = false) {
    const node = document.querySelector('[data-v21-scan-status]');
    if (!node) return;
    node.textContent = text;
    node.classList.toggle('is-error', error);
  }

  function parseCode(value) {
    const clean = String(value || '').trim();
    if (!clean) return '';
    try {
      const url = new URL(clean, location.href);
      return url.searchParams.get('container') || url.searchParams.get('code') || clean;
    } catch { return clean; }
  }

  function openCode(value) {
    const code = parseCode(value);
    const container = globalThis.state?.data?.containers?.find((entry) => String(entry.code || '').toLocaleLowerCase('nb-NO') === code.toLocaleLowerCase('nb-NO'));
    if (!container) { setStatus(`Fant ingen plassering med koden «${code}».`, true); return false; }
    closeScanner();
    setTimeout(() => openContainerQr(container.id), 100);
    return true;
  }

  async function detector() {
    if (!('BarcodeDetector' in window)) throw new Error('QR-skanning støttes ikke av denne nettleseren. Bruk bilde eller skriv koden.');
    const formats = await BarcodeDetector.getSupportedFormats?.() || [];
    if (formats.length && !formats.includes('qr_code')) throw new Error('QR-skanning støttes ikke.');
    return new BarcodeDetector({ formats: ['qr_code'] });
  }

  async function detectBitmap(bitmap) {
    const reader = await detector();
    const codes = await reader.detect(bitmap);
    if (!codes.length) throw new Error('Fant ingen QR-kode');
    if (!openCode(codes[0].rawValue)) throw new Error('QR-koden tilhører ikke en kjent plassering');
  }

  async function startCamera() {
    const dialog = ensureDialog();
    const video = dialog.querySelector('[data-v21-video]');
    const button = dialog.querySelector('[data-v21-start-camera]');
    button.disabled = true;
    try {
      const reader = await detector();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      video.srcObject = stream;
      await video.play();
      scanning = true;
      setStatus('Pek kameraet mot QR-koden.');
      const scan = async () => {
        if (!scanning || !video.videoWidth) return;
        try {
          const codes = await reader.detect(video);
          if (codes[0]?.rawValue && openCode(codes[0].rawValue)) return;
        } catch (error) { console.debug(error); }
        requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    } catch (error) {
      setStatus(H.errorText(error, 'Kunne ikke starte kameraet'), true);
      button.disabled = false;
    }
  }

  function closeScanner() {
    scanning = false;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    const dialog = document.querySelector('#v21-qr-scanner');
    const video = dialog?.querySelector('[data-v21-video]');
    if (video) video.srcObject = null;
    if (dialog?.open) dialog.close();
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-v21-open-scanner]')) return;
    event.preventDefault();
    const dialog = ensureDialog();
    setStatus('Start kameraet og pek på en QR-etikett.');
    if (!dialog.open) dialog.showModal();
  });
  addEventListener('pagehide', closeScanner);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectButton, { once: true });
  else injectButton();
  new MutationObserver(injectButton).observe(document.body, { childList: true, subtree: true });
})();
