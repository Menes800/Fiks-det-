(() => {
  const parts = Array.from(
    { length: 10 },
    (_, index) => `./cloud-v21/part-${String(index + 1).padStart(2, '0')}.b64?v=1`,
  );
  const repairs = [
    ['email: cleanEmail(form.email.value)),', 'email: cleanEmail(form.email.value),'],
    ["toLocaleDateString('v'b-NO')", "toLocaleDateString('nb-NO')"],
    ["icon: row.icon || '📦\", color:", "icon: row.icon || '📦', color:"],
    ["icon: row.icon || '📦\", kind:", "icon: row.icon || '📦', kind:"],
  ];

  function repairSource(input) {
    let source = input;
    for (const [broken, fixed] of repairs) {
      const occurrences = source.split(broken).length - 1;
      if (occurrences !== 1) {
        throw new Error(`Uventet antall forekomster av kjent kildefeil: ${occurrences}`);
      }
      source = source.replace(broken, fixed);
    }
    return source;
  }

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
      const bytes = joinBytes(encodedParts.map(decodePart));
      const source = repairSource(new TextDecoder().decode(bytes));

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
