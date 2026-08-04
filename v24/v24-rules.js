(() => {
  'use strict';

  const W = window.HED23;
  if (!W?.buildPlan) return;

  const originalBuildPlan = W.buildPlan.bind(W);
  W.version = '2.4.0';
  W.aiPaused = true;

  const clamp = (value, min = 1, max = 99) => Math.max(min, Math.min(max, Math.round(Number(value) || min)));
  const normalize = (value) => String(value || '').trim().toLocaleLowerCase('nb-NO');

  function resolvedContext(input = {}, plan = {}) {
    const templateKey = input.templateKey || plan.templateKey || 'weekend';
    const template = W.templates.find((entry) => entry.key === templateKey);
    const days = clamp(input.days || W.durationDays?.[input.duration] || 4, 1, 60);
    const baggage = input.baggage || template?.defaults?.baggage || 'normal';
    const climate = input.climate || (templateKey === 'sun' ? 'hot' : templateKey === 'cabin' ? 'mixed' : 'mixed');
    const packingStyle = input.packingStyle || (baggage === 'carryon' ? 'light' : 'normal');
    return {
      ...template?.defaults,
      ...input,
      templateKey,
      days,
      people: clamp(input.people || 1, 1, 8),
      baggage,
      climate,
      packingStyle,
      laundry: input.laundry || 'unknown',
      activities: Array.isArray(input.activities) ? input.activities : [...(template?.defaults?.activities || [])],
    };
  }

  function clothingDays(ctx) {
    if (ctx.laundry === 'yes') return Math.min(ctx.days, ctx.packingStyle === 'light' ? 5 : 7);
    if (ctx.laundry === 'no') return ctx.days;
    return Math.min(ctx.days, ctx.packingStyle === 'light' ? 7 : 10);
  }

  function styleAdd(ctx) {
    return ctx.packingStyle === 'safe' ? 1 : 0;
  }

  function quantity(type, ctx) {
    const windowDays = clothingDays(ctx);
    const people = ctx.people;
    const extra = styleAdd(ctx);
    const hot = ctx.climate === 'hot';
    const values = {
      underwear: (windowDays + (ctx.packingStyle === 'light' ? 0 : 1) + extra) * people,
      socks: (Math.max(1, hot ? Math.ceil(windowDays * .65) : windowDays) + extra) * people,
      tops: (Math.max(2, Math.ceil(windowDays / (ctx.packingStyle === 'light' ? 3 : 2))) + extra) * people,
      bottoms: (Math.max(1, Math.ceil(windowDays / (ctx.packingStyle === 'safe' ? 2.5 : ctx.packingStyle === 'light' ? 4 : 3))) + extra) * people,
      training: Math.max(1, Math.min(windowDays, ctx.laundry === 'yes' ? 3 : Math.ceil(ctx.days / 2))) * people,
      swimwear: (ctx.packingStyle === 'light' ? 1 : 2) * people,
      toothbrush: people,
      petMeals: Math.max(2, ctx.days * 2),
    };
    return clamp(values[type] || 1);
  }

  function quantityType(title) {
    const value = normalize(title);
    if (value.includes('undertøy')) return 'underwear';
    if (value.includes('sokker') && !value.includes('varme')) return 'socks';
    if (value.includes('overdeler') || value.includes('arbeidsklær')) return 'tops';
    if (value.includes('bukser eller underdeler')) return 'bottoms';
    if (value.includes('treningstøy')) return 'training';
    if (value.includes('badetøy')) return 'swimwear';
    if (value.includes('tannbørste')) return 'toothbrush';
    if (value.includes('mat til kjæledyret')) return 'petMeals';
    return '';
  }

  function quantityReason(type, ctx) {
    const windowDays = clothingDays(ctx);
    if (type === 'petMeals') return `Beregnet for ${ctx.days} dager`;
    if (type === 'toothbrush') return `Én per person`;
    if (type === 'swimwear') return ctx.packingStyle === 'light' ? 'Pakk lett' : 'Ett ekstra sett gjør tørking enklere';
    if (ctx.laundry === 'yes') return `Beregnet med klesvask underveis`;
    if (ctx.laundry === 'unknown' && ctx.days > windowDays) return `Forslag for ${windowDays} dager – juster opp dersom du ikke kan vaske`;
    if (ctx.packingStyle === 'light') return 'Redusert for lett pakking';
    if (ctx.packingStyle === 'safe') return 'Ett ekstra for sikkerhets skyld';
    return `Beregnet for ${ctx.days} dager`;
  }

  function addItem(items, entry) {
    const key = normalize(entry.title);
    if (!key || items.some((item) => normalize(item.title) === key)) return;
    items.push({
      id: `v24-${key.replace(/[^a-z0-9æøå]+/gi, '-').slice(0, 36)}`,
      section: entry.section || 'Pakkeliste',
      title: entry.title,
      quantity: clamp(entry.quantity || 1),
      note: entry.note || '',
      reason: entry.reason || '',
      status: entry.status || 'needed',
      essential: Boolean(entry.essential),
      selected: entry.selected !== false,
      origin: 'rules-v2',
    });
  }

  function applyClimate(items, ctx) {
    if (ctx.climate === 'hot') {
      addItem(items, { section: 'Klær', title: 'Shorts eller lette underdeler', quantity: quantity('bottoms', ctx), reason: 'Tilpasset varmt klima' });
      addItem(items, { section: 'Sol og bad', title: 'Leppepomade med solfaktor', reason: 'Tilpasset varmt klima' });
      addItem(items, { section: 'Sol og bad', title: 'Lett overdel som dekker solen', reason: 'Tilpasset varmt klima' });
    }
    if (ctx.climate === 'mixed') {
      addItem(items, { section: 'Klær', title: 'Regnjakke eller lett skalljakke', reason: 'Tilpasset variert vær' });
      addItem(items, { section: 'Klær', title: 'Varm genser eller mellomlag', reason: 'Tilpasset variert vær' });
    }
    if (ctx.climate === 'cold') {
      addItem(items, { section: 'Klær', title: 'Varmt mellomlag', essential: true, reason: 'Tilpasset kaldt klima' });
      addItem(items, { section: 'Klær', title: 'Lue og hansker', reason: 'Tilpasset kaldt klima' });
      addItem(items, { section: 'Klær', title: 'Varm jakke', essential: true, reason: 'Tilpasset kaldt klima' });
    }
  }

  function applyBaggage(items, ctx) {
    if (ctx.baggage === 'carryon') {
      addItem(items, { section: 'Huskeliste', title: 'Kontroller mål og vekt på håndbagasjen', essential: true, reason: 'Kun håndbagasje' });
      addItem(items, { section: 'Hygiene', title: 'Væsker i beholdere på maks 100 ml', essential: true, reason: 'Kun håndbagasje' });
    }
    if (ctx.baggage === 'checked') {
      addItem(items, { section: 'Viktig', title: 'Det viktigste i håndbagasjen', reason: 'Ved forsinket innsjekket bagasje' });
      addItem(items, { section: 'Huskeliste', title: 'Merk kofferten med kontaktinformasjon', reason: 'Innsjekket bagasje' });
    }
  }

  function applyActivities(items, ctx) {
    const activities = new Set(ctx.activities || []);
    if (activities.has('swim')) addItem(items, { section: 'Sol og bad', title: 'Pose til vått badetøy', reason: 'Bading er valgt' });
    if (activities.has('training')) addItem(items, { section: 'Trening', title: 'Pose til brukt treningstøy', reason: 'Trening er valgt' });
    if (activities.has('formal')) addItem(items, { section: 'Klær', title: 'Sko til pent antrekk', reason: 'Pent antrekk er valgt' });
    if (activities.has('cook')) addItem(items, { section: 'Mat', title: 'Basisvarer som mangler på stedet', reason: 'Matlaging er valgt' });
    if (activities.has('pet')) addItem(items, { section: 'Kjæledyr', title: 'Dokumentasjon eller vaksinekort ved behov', reason: 'Kjæledyr er med' });
  }

  function assumptions(ctx) {
    const result = [];
    const style = { light: 'Du vil pakke lett', normal: 'Du vil pakke normalt', safe: 'Du vil ha litt ekstra med' }[ctx.packingStyle];
    if (style) result.push(style);
    if (ctx.laundry === 'yes') result.push('Du kan vaske klær underveis');
    if (ctx.laundry === 'no') result.push('Du kan ikke vaske klær underveis');
    if (ctx.laundry === 'unknown' && ctx.days > 10) result.push('Vaskemulighet er ukjent, så klesmengden er begrenset til et fornuftig utgangspunkt');
    return result;
  }

  W.buildPlan = function buildBetterPlan(context = {}) {
    const original = originalBuildPlan(context);
    const ctx = resolvedContext(context, original);
    const items = (original.items || []).map((entry) => {
      const type = quantityType(entry.title);
      if (!type) return { ...entry, reason: entry.reason || '' };
      return { ...entry, quantity: quantity(type, ctx), reason: quantityReason(type, ctx), origin: 'rules-v2' };
    });

    applyClimate(items, ctx);
    applyBaggage(items, ctx);
    applyActivities(items, ctx);

    return {
      ...original,
      context: ctx,
      summary: `${ctx.days} dag${ctx.days === 1 ? '' : 'er'} · ${ctx.people} person${ctx.people === 1 ? '' : 'er'} · ${{ light: 'pakk lett', normal: 'vanlig pakking', safe: 'ekstra trygg' }[ctx.packingStyle]}`,
      assumptions: assumptions(ctx),
      items,
      source: 'rules-v2',
    };
  };
})();