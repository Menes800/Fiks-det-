(() => {
  'use strict';

  const H = window.HED21;
  const W = window.HED23;
  if (!H || !W) return;

  function errorWithCode(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function knownItemNames() {
    return (globalThis.state?.data?.items || [])
      .map((entry) => String(entry?.name || '').trim())
      .filter(Boolean)
      .slice(0, 120);
  }

  async function generateAI(options = {}) {
    await H.ready;
    if (!H.client) throw errorWithCode('Logg inn for å bruke AI-assistenten.', 'AI_SIGN_IN');

    const context = options.context || {};
    const basePlan = options.basePlan || null;
    const prompt = String(options.prompt || '').trim().slice(0, 800);
    if (!prompt && !basePlan) throw errorWithCode('Beskriv turen eller velg en mal først.', 'AI_EMPTY');

    const body = {
      prompt,
      template_key: context.templateKey || basePlan?.templateKey || 'custom',
      choices: {
        duration: context.duration || '',
        days: Math.max(1, Math.min(60, Number(context.days) || 0)),
        people: Math.max(1, Math.min(12, Number(context.people) || 1)),
        transport: context.transport || '',
        baggage: context.baggage || '',
        activities: Array.isArray(context.activities) ? context.activities.slice(0, 12) : [],
        destination: String(context.destination || basePlan?.destination || '').slice(0, 120),
      },
      base_items: (basePlan?.items || []).filter((entry) => entry.selected !== false).slice(0, 70).map((entry) => ({
        section: entry.section,
        title: entry.title,
        quantity: entry.quantity,
        status: entry.status,
        essential: Boolean(entry.essential),
      })),
      known_item_names: knownItemNames(),
      locale: 'nb-NO',
    };

    const { data, error } = await H.client.functions.invoke('ai-packing-plan', { body });
    if (error) {
      const message = error.context?.body?.message || error.message || 'AI-tjenesten svarte ikke.';
      throw errorWithCode(message, error.context?.body?.code || 'AI_REQUEST_FAILED');
    }
    if (!data?.plan) throw errorWithCode(data?.message || 'AI-en laget ikke et gyldig forslag.', data?.code || 'AI_INVALID');

    return {
      plan: W.normalizeAIPlan(data.plan, basePlan || {}),
      remaining: Number.isFinite(data.remaining) ? data.remaining : null,
      model: data.model || '',
    };
  }

  W.generateAI = generateAI;
})();