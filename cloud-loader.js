(() => {
  const parts = Array.from(
    { length: 9 },
    (_, index) => `./cloud-v21-packed/part-${String(index + 1).padStart(2, '0')}.b64?v=1`,
  );

  function decodePart(base64) {
    const binary = atob(base64.replace(/\s+/g, ''));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  function joinBytes(chunks) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return combined;
  }

  async function bootCloud() {
    try {
      const responses = await Promise.all(
        parts.map((url) => fetch(url, { cache: 'no-cache' })),
      );
      const failed = responses.find((response) => !response.ok);
      if (failed) throw new Error(`Kunne ikke laste appkjernen (${failed.status})`);

      const encodedParts = await Promise.all(responses.map((response) => response.text()));
      const compressed = joinBytes(encodedParts.map(decodePart));

      if (typeof DecompressionStream !== 'function') {
        throw new Error('Nettleseren støtter ikke utpakking av appkjernen');
      }

      const stream = new Blob([compressed])
        .stream()
        .pipeThrough(new DecompressionStream('gzip'));
      const source = await new Response(stream).text();

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
