(() => {
  'use strict';

  const normalize = (value) => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('nb-NO')
    .replace(/[^a-z0-9æøå]+/g, ' ')
    .trim();

  const itemRules = [
    { icon: '🔑', category: ['annet'], words: ['nokkel', 'nokler', 'bilnokkel', 'husnokkel', 'reservenokkel', 'nokkelknippe', 'adgangsbrikke', 'brikke'] },
    { icon: '🛂', category: ['dokument'], words: ['pass', 'id kort', 'legitimasjon', 'forerkort', 'bankid', 'reisekort'] },
    { icon: '📄', category: ['dokument'], words: ['dokument', 'kontrakt', 'avtale', 'vitnemal', 'attest', 'forsikring', 'kvittering', 'garanti', 'skjote', 'sertifikat'] },
    { icon: '📚', category: ['dokument'], words: ['bok', 'boker', 'perm', 'mappe', 'manual', 'bruksanvisning'] },
    { icon: '💳', category: ['dokument'], words: ['bankkort', 'kredittkort', 'kortmappe', 'lommebok'] },
    { icon: '💰', category: ['annet'], words: ['kontanter', 'penger', 'mynt', 'sparegris'] },
    { icon: '🔨', category: ['verktoy'], words: ['hammer', 'slegge', 'klubbe'] },
    { icon: '🪛', category: ['verktoy'], words: ['skrutrekker', 'bits', 'bitsett', 'torx', 'unbrako', 'sekskantnokkel'] },
    { icon: '🔧', category: ['verktoy'], words: ['fastnokkel', 'skiftenokkel', 'momentnokkel', 'rortang', 'tang', 'avbiter', 'polygrip'] },
    { icon: '🛠️', category: ['verktoy'], words: ['verktoy', 'skralle', 'pipesett', 'verktoykasse', 'slagtrekker', 'multiverktoy'] },
    { icon: '🪚', category: ['verktoy'], words: ['sag', 'handsag', 'stikksag', 'sirkelsag', 'bajonettsag'] },
    { icon: '🧰', category: ['verktoy'], words: ['verktoysett', 'skruer', 'spiker', 'festemidler', 'bor', 'borsett'] },
    { icon: '🪜', category: ['verktoy'], words: ['stige', 'trappestige', 'gardintrapp'] },
    { icon: '📏', category: ['verktoy'], words: ['meterstokk', 'maleband', 'vater', 'laser', 'malerverktoy'] },
    { icon: '🧱', category: ['verktoy'], words: ['murstein', 'flis', 'fugemasse', 'sparkel', 'sement', 'betong'] },
    { icon: '🪣', category: ['verktoy'], words: ['malingsspann', 'maling', 'beis', 'lakk', 'pensel', 'malerull'] },
    { icon: '🔩', category: ['verktoy'], words: ['skrue', 'skruer', 'mutter', 'bolter', 'bolt', 'skive'] },
    { icon: '⚙️', category: ['verktoy'], words: ['reservedel', 'deler', 'maskindel', 'gir', 'lager'] },
    { icon: '🪠', category: ['verktoy'], words: ['avlopspumpe', 'stakefjær', 'sugekopp', 'plumbo'] },
    { icon: '🔌', category: ['elektronikk'], words: ['lader', 'ladekabel', 'kabel', 'ledning', 'skjoteledning', 'adapter', 'stromforsyning', 'kontakt'] },
    { icon: '🔋', category: ['elektronikk'], words: ['batteri', 'batterier', 'powerbank', 'batteribank'] },
    { icon: '💻', category: ['elektronikk'], words: ['pc', 'laptop', 'macbook', 'datamaskin', 'chromebook'] },
    { icon: '🖥️', category: ['elektronikk'], words: ['skjerm', 'monitor', 'tv', 'fjernsyn'] },
    { icon: '⌨️', category: ['elektronikk'], words: ['tastatur', 'keyboard'] },
    { icon: '🖱️', category: ['elektronikk'], words: ['mus', 'datamus', 'mouse'] },
    { icon: '📱', category: ['elektronikk'], words: ['mobil', 'telefon', 'iphone', 'android', 'deksel'] },
    { icon: '🎧', category: ['elektronikk'], words: ['hodetelefon', 'headset', 'orepropper', 'airpods'] },
    { icon: '🔊', category: ['elektronikk'], words: ['hoyttaler', 'soundbar', 'radio'] },
    { icon: '📷', category: ['elektronikk'], words: ['kamera', 'objektiv', 'kamerautstyr', 'gopro'] },
    { icon: '🎮', category: ['elektronikk'], words: ['spillkonsoll', 'playstation', 'xbox', 'nintendo', 'kontroller', 'handkontroll'] },
    { icon: '💡', category: ['elektronikk'], words: ['lyspare', 'lysparer', 'lampe', 'led lys', 'julelys'] },
    { icon: '🔦', category: ['elektronikk'], words: ['lommelykt', 'hodelykt', 'arbeidslys'] },
    { icon: '🧯', category: ['annet'], words: ['brannslukker', 'slukkeapparat', 'brannteppe'] },
    { icon: '🚨', category: ['elektronikk'], words: ['roykvarsler', 'brannvarsler', 'alarm', 'co varsler'] },
    { icon: '🧥', category: ['klær'], words: ['jakke', 'vinterjakke', 'regnjakke', 'frakk', 'kape'] },
    { icon: '👕', category: ['klær'], words: ['t skjorte', 'skjorte', 'genser', 'hoodie', 'overdel'] },
    { icon: '👖', category: ['klær'], words: ['bukse', 'jeans', 'shorts', 'joggebukse'] },
    { icon: '👗', category: ['klær'], words: ['kjole', 'skjort', 'dress'] },
    { icon: '👟', category: ['klær'], words: ['sko', 'joggesko', 'treningssko', 'sandaler', 'stovler'] },
    { icon: '🧦', category: ['klær'], words: ['sokker', 'stromper', 'ullundertoy', 'undertoy'] },
    { icon: '🧤', category: ['klær'], words: ['hansker', 'votter'] },
    { icon: '🧢', category: ['klær'], words: ['caps', 'lue', 'hatt'] },
    { icon: '🎒', category: ['klær'], words: ['ryggsekk', 'sekk', 'bag', 'veske'] },
    { icon: '🧳', category: ['annet'], words: ['koffert', 'reisebag', 'handbagasje'] },
    { icon: '🍳', category: ['kjokken'], words: ['stekepanne', 'panne', 'gryte', 'kjele'] },
    { icon: '🔪', category: ['kjokken'], words: ['kniv', 'kokkekniv', 'brodkniv', 'knivsett'] },
    { icon: '🍴', category: ['kjokken'], words: ['bestikk', 'gaffel', 'skje', 'spisepinner'] },
    { icon: '🥣', category: ['kjokken'], words: ['bolle', 'skål', 'matboks', 'oppbevaringsboks'] },
    { icon: '☕', category: ['kjokken'], words: ['kopp', 'krus', 'kaffekanne', 'termos'] },
    { icon: '🍽️', category: ['kjokken'], words: ['tallerken', 'servise', 'fat'] },
    { icon: '🥤', category: ['kjokken'], words: ['drikkeflaske', 'flaske', 'shaker'] },
    { icon: '🧊', category: ['kjokken'], words: ['kjolebag', 'kjoleelement', 'isbitform'] },
    { icon: '🧹', category: ['annet'], words: ['stovsuger', 'kost', 'feiebrett', 'mopp', 'rengjoring'] },
    { icon: '🧽', category: ['annet'], words: ['svamp', 'klut', 'mikrofiber', 'oppvaskborste'] },
    { icon: '🧴', category: ['annet'], words: ['såpe', 'sjampo', 'balsam', 'krem', 'vaskemiddel', 'rengjoringsmiddel'] },
    { icon: '🧻', category: ['annet'], words: ['toalettpapir', 'torkerull', 'papir'] },
    { icon: '💊', category: ['annet'], words: ['medisin', 'tablett', 'piller', 'vitaminer'] },
    { icon: '🩹', category: ['annet'], words: ['forstehjelp', 'plaster', 'bandasje', 'sårutstyr'] },
    { icon: '🌡️', category: ['elektronikk'], words: ['termometer', 'febermaler'] },
    { icon: '🏋️', category: ['annet'], words: ['manual', 'manualer', 'vekt', 'vekter', 'treningsutstyr', 'kettlebell'] },
    { icon: '🧘', category: ['annet'], words: ['yogamatte', 'treningsmatte', 'strikk', 'treningsstrikk'] },
    { icon: '⚽', category: ['annet'], words: ['fotball', 'ball', 'basketball', 'handball'] },
    { icon: '🎿', category: ['annet'], words: ['ski', 'skistaver', 'skisko'] },
    { icon: '⛸️', category: ['annet'], words: ['skoyter', 'ishockey'] },
    { icon: '🚲', category: ['annet'], words: ['sykkel', 'sykkelhjelm', 'sykkellas'] },
    { icon: '🚗', category: ['bil'], words: ['bil', 'bilen', 'bilutstyr', 'reservehjul'] },
    { icon: '🛞', category: ['bil'], words: ['dekk', 'sommerdekk', 'vinterdekk', 'felg', 'hjul'] },
    { icon: '🧰', category: ['bil'], words: ['jekk', 'startkabler', 'varseltrekant', 'slepetau'] },
    { icon: '🧴', category: ['bil'], words: ['motorolje', 'spylervaske', 'kjoleveske', 'bilpleie'] },
    { icon: '🐕', category: ['kjæledyr', 'kjaeledyr'], words: ['hundebånd', 'hundeband', 'sele', 'kobbel', 'hund'] },
    { icon: '🐾', category: ['kjæledyr', 'kjaeledyr'], words: ['kjæledyr', 'dyreutstyr', 'hundeting', 'katteting'] },
    { icon: '🥣', category: ['kjæledyr', 'kjaeledyr'], words: ['hundematskål', 'matskål', 'vannskål'] },
    { icon: '🦴', category: ['kjæledyr', 'kjaeledyr'], words: ['hundeleke', 'tyggebein', 'godbit'] },
    { icon: '🎄', category: ['annet'], words: ['juletre', 'julepynt', 'julekuler', 'advent'] },
    { icon: '🎁', category: ['annet'], words: ['gave', 'gaver', 'gavepapir'] },
    { icon: '🏕️', category: ['annet'], words: ['telt', 'camping', 'liggeunderlag', 'sovepose'] },
    { icon: '🎣', category: ['annet'], words: ['fiskestang', 'fiskeutstyr', 'sluk', 'snelle'] },
    { icon: '🌂', category: ['annet'], words: ['paraply', 'regntrekk'] },
    { icon: '🕶️', category: ['annet'], words: ['solbriller', 'briller', 'brilleetui'] },
    { icon: '⌚', category: ['elektronikk'], words: ['klokke', 'smartklokke', 'garmin'] },
    { icon: '💍', category: ['annet'], words: ['ring', 'smykke', 'halskjede', 'armband'] },
    { icon: '🧸', category: ['annet'], words: ['leke', 'bamser', 'bamse', 'barneleke'] },
    { icon: '🪴', category: ['annet'], words: ['plante', 'blomst', 'potte'] },
  ];

  const placeRules = [
    { icon: '🚪', words: ['entre', 'inngang', 'gang', 'vindfang'] },
    { icon: '🛏️', words: ['soverom', 'gjesterom'] },
    { icon: '🛋️', words: ['stue', 'tv stue', 'salong'] },
    { icon: '🍳', words: ['kjokken', 'matbod', 'spiskammer'] },
    { icon: '🛁', words: ['bad', 'baderom', 'dusjrom'] },
    { icon: '🚽', words: ['toalett', 'wc'] },
    { icon: '🧺', words: ['vaskerom', 'vaskekjeller'] },
    { icon: '🪑', words: ['kontor', 'arbeidsrom'] },
    { icon: '📦', words: ['bod', 'lager', 'loftsbod'] },
    { icon: '🗄️', words: ['kjellerbod', 'kjeller', 'arkiv'] },
    { icon: '🚗', words: ['garasje', 'carport', 'bil'] },
    { icon: '🌿', words: ['hage', 'uteplass', 'balkong', 'terrasse'] },
    { icon: '🗄️', words: ['kommode', 'skuffeseksjon'] },
    { icon: '🚪', words: ['skap', 'garderobe', 'overskap', 'underskap'] },
    { icon: '🗃️', words: ['skuff', 'skuffe'] },
    { icon: '📦', words: ['kasse', 'boks', 'plastkasse', 'flyttekasse'] },
    { icon: '📁', words: ['mappe', 'perm', 'arkivboks'] },
    { icon: '🧰', words: ['verktoykasse', 'toolbox'] },
    { icon: '🎒', words: ['bag', 'sekk', 'ryggsekk'] },
    { icon: '🧊', words: ['kjoleskap', 'fryser', 'fryseboks'] },
    { icon: '📚', words: ['bokhylle', 'hylle', 'reol'] },
  ];

  function scoreRule(text, rule) {
    let best = 0;
    for (const word of rule.words) {
      const needle = normalize(word);
      if (!needle) continue;
      if (text === needle) best = Math.max(best, 1000 + needle.length);
      else if (text.includes(needle)) best = Math.max(best, 500 + needle.length);
      else {
        const parts = needle.split(' ');
        if (parts.every((part) => text.includes(part))) best = Math.max(best, 200 + needle.length);
      }
    }
    return best;
  }

  function categoryId(aliases, categories) {
    const list = Array.isArray(categories) ? categories : [];
    for (const alias of aliases || []) {
      const needle = normalize(alias);
      const match = list.find((entry) => normalize(entry.name) === needle || normalize(entry.name).includes(needle));
      if (match) return match.id;
    }
    return list.find((entry) => entry.id === 'cat-other')?.id || list.at(-1)?.id || '';
  }

  function suggest(name, categories = [], type = 'item') {
    const text = normalize(name);
    if (!text) return null;
    const rules = type === 'item' ? itemRules : placeRules;
    let winner = null;
    for (const rule of rules) {
      const score = scoreRule(text, rule);
      if (!winner || score > winner.score) winner = score ? { rule, score } : winner;
    }
    if (!winner) return null;
    return {
      icon: winner.rule.icon,
      categoryId: type === 'item' ? categoryId(winner.rule.category, categories) : '',
      confidence: winner.score >= 1000 ? 'high' : winner.score >= 500 ? 'medium' : 'low',
    };
  }

  window.HED27Rules = { normalize, suggest, itemRules, placeRules };
})();
