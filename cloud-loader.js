(() => {
  const parts = Array.from(
    { length: 10 },
    (_, index) => `./cloud-v21/part-${String(index + 1).padStart(2, '0')}.b64?v=1`,
  );
  const brokenSource = 'email: cleanEmail(form.email.value)),';
  const fixedSource = 'email: cleanEmail(form.email.value),';

  async function bootCloud() {
    try {
      const responses = await Promise.all(
        parts.map((url) => fetch(url, { cache: 'no-cache' })),
      );
      const failed = responses.find((response) => !response.ok);
      if (failed) throw new Error(`Kunne ikke laste appkjernen (${failed.status})`);

      const chunks = await Promise.all(responses.map((response) => response.text()));
      const binary = atob(chunks.join('').replace(/\s+/g, ''));
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      let source = new TextDecoder().decode(bytes);

      const occurrences = source.split(brokenSource).length - 1;
      if (occurrences !== 1) {
        throw new Error(`Uventet antall kjente syntaksfeil: ${occurrences}`);
      }
      source = source.replace(brokenSource, fixedSource);

      if (!source.includes("const VERSION = '2.1.0'")) {
        throw new Error('Feil versjon av appkjernen');
      }

      const scriptUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.onload = () => URL.revokeObjectURL(scriptUrl);
      script.onerror = () => {
        URL.revokeObjectURL(scriptUrl);
        console.error('2.1-kjernen kunne ikke startes');
      };
      document.head.append(script);
    } catch (error) {
      console.error('Skyfunksjonene kunne ikke lastes', error);
      document.querySelector('#account-info .settings-meta')?.replaceChildren('Oppdateringsfeil');
    }
  }

  bootCloud();
})();
