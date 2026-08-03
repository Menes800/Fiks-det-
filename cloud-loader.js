(() => {
  async function bootCloud() {
    try {
      const response = await fetch('./cloud.js.gz?v=1');
      if (!response.ok) throw new Error('Kunne ikke laste skysynkronisering');
      const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
      const source = await new Response(stream).text();
      const scriptUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.onload = () => URL.revokeObjectURL(scriptUrl);
      script.onerror = () => URL.revokeObjectURL(scriptUrl);
      document.head.append(script);
    } catch (error) {
      console.error('Skyfunksjonene kunne ikke lastes', error);
    }
  }
  bootCloud();
})();
