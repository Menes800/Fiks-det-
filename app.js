const levels = [
  { name: 'Vaktmester', min: 0 },
  { name: 'Driftsansvarlig', min: 300 },
  { name: 'Driftsleder', min: 700 },
  { name: 'Eiendomssjef', min: 1200 },
];

const severityOptions = ['Lav', 'Middels', 'Høy', 'Akutt'];

const scenarios = [
  {
    id: 'elevator-door',
    category: 'Heis',
    title: 'Heisdøren lukker ikke',
    description:
      'Heisen står i 3. etasje med åpen dør. Ingen personer sitter fast, men heisen kan ikke brukes.',
    severity: 'Høy',
    actions: [
      'Bestille vanlig service neste uke',
      'Sperre heisen, informere brukerne og kontakte heisleverandør',
      'Forsøke å dytte døren igjen manuelt',
      'Slå av strømmen i hele bygget',
    ],
    correctAction: 1,
    suppliers: ['Elektriker', 'Heisleverandør', 'Låsesmed', 'Rørlegger'],
    correctSupplier: 1,
    orderKeywords: ['heis', 'dør', 'lukker', 'kontroll'],
    idealOrder: 'Heisdør lukker ikke. Heisen er sperret. Bes om kontroll og utbedring.',
  },
  {
    id: 'water-leak',
    category: 'Vann',
    title: 'Det drypper fra taket i kjelleren',
    description:
      'Det kommer jevne dråper fra taket under et bad. Vannet treffer et teknisk rom, men har ikke nådd elektrisk utstyr.',
    severity: 'Akutt',
    actions: [
      'Sette ut en bøtte og sjekke igjen i morgen',
      'Stansee mulig vannkilde, sikre området og kontakte rørlegger',
      'Male over fuktmerket',
      'Bestille renhold',
    ],
    correctAction: 1,
    suppliers: ['Rørlegger', 'Maler', 'Ventilasjonsfirma', 'Heisleverandør'],
    correctSupplier: 0,
    orderKeywords: ['lekkasje', 'kjeller', 'kontroll', 'utbedring'],
    idealOrder: 'Mulig lekkasje fra bad over kjeller. Bes om å lokalisere årsak og utbedre.',
  },
  {
    id: 'fire-panel',
    category: 'Brann',
    title: 'Brannsentralen viser feil',
    description:
      'Sentralen viser feil på én detektor. Det er ingen tegn til røyk eller brann, men feilen lar seg ikke tilbakestille.',
    severity: 'Høy',
    actions: [
      'Koble ut hele brannalarmanlegget',
      'Loggføre feilen, kontrollere området og kontakte brannalarmleverandør',
      'Ignorere feilen siden det ikke brenner',
      'Bytte batteri i sentralen selv',
    ],
    correctAction: 1,
    suppliers: ['Brannalarmleverandør', 'Rørlegger', 'Glassmester', 'Heisleverandør'],
    correctSupplier: 0,
    orderKeywords: ['brannsentral', 'feil', 'detektor', 'kontroll'],
    idealOrder: 'Brannsentral viser feil på detektor. Feilen kan ikke tilbakestilles. Bes om kontroll og utbedring.',
  },
  {
    id: 'balcony-door',
    category: 'Dør',
    title: 'Balkongdøren kan ikke lukkes',
    description:
      'Leietaker melder at balkongdøren står på gløtt. Det er meldt kraftig regn og vind i kveld.',
    severity: 'Høy',
    actions: [
      'Avvente til ordinær befaring neste måned',
      'Sikre døren midlertidig uten å blokkere rømningsvei og bestille reparasjon',
      'Skru døren permanent fast i karmen',
      'Be leietaker holde døren på plass',
    ],
    correctAction: 1,
    suppliers: ['Tømrer/dørleverandør', 'Rørlegger', 'Heisleverandør', 'Ventilasjonsfirma'],
    correctSupplier: 0,
    orderKeywords: ['balkongdør', 'lukker', 'sikre', 'utbedre'],
    idealOrder: 'Balkongdør lar seg ikke lukke. Bes om å sikre døren og utbedre feilen.',
  },
  {
    id: 'dark-exit-sign',
    category: 'Nødlys',
    title: 'Markeringslyset er mørkt',
    description:
      'Markeringslyset over døren i rømningstrappen lyser ikke. Øvrig belysning fungerer.',
    severity: 'Høy',
    actions: [
      'Merke døren med en papirlapp',
      'Kontrollere alternativ merking og bestille rask utbedring av nødlyset',
      'Vente til neste årskontroll',
      'Fjerne armaturen',
    ],
    correctAction: 1,
    suppliers: ['Elektriker/nødlysleverandør', 'Rørlegger', 'Låsesmed', 'Maler'],
    correctSupplier: 0,
    orderKeywords: ['markeringslys', 'rømningstrapp', 'lyser', 'utbedre'],
    idealOrder: 'Markeringslys i rømningstrapp lyser ikke. Bes om kontroll og utbedring.',
  },
  {
    id: 'loose-socket',
    category: 'Elektro',
    title: 'Stikkontakten har løsnet',
    description:
      'En stikkontakt henger delvis ut av veggen i et fellesareal. Ingen synlige ledere, men mange går forbi.',
    severity: 'Høy',
    actions: [
      'Dytte kontakten inn igjen',
      'Sperre av ved behov og bestille elektriker',
      'Teipe den fast med pakketape',
      'La den være siden strømmen virker',
    ],
    correctAction: 1,
    suppliers: ['Elektriker', 'Tømrer', 'Rørlegger', 'Heisleverandør'],
    correctSupplier: 0,
    orderKeywords: ['stikkontakt', 'løsnet', 'kontroll', 'utbedre'],
    idealOrder: 'Stikkontakt har løsnet fra vegg. Bes om kontroll og utbedring.',
  },
  {
    id: 'blocked-exit',
    category: 'Rømning',
    title: 'Rømningsveien er blokkert',
    description:
      'Møbler og pappesker er satt i en korridor som inngår i rømningsveien. Passasjen er fortsatt mulig, men svært smal.',
    severity: 'Akutt',
    actions: [
      'Merke gjenstandene og vente én måned',
      'Fjerne eller flytte hindringene umiddelbart og følge opp ansvarlig',
      'Bestille maler til korridoren',
      'Låse døren inn til korridoren',
    ],
    correctAction: 1,
    suppliers: ['Vaktmester/drift', 'Heisleverandør', 'Rørlegger', 'Glassmester'],
    correctSupplier: 0,
    orderKeywords: ['rømningsvei', 'gjenstander', 'fjerne', 'fri'],
    idealOrder: 'Gjenstander blokkerer rømningsvei. Bes om å fjerne og holde passasjen fri.',
  },
  {
    id: 'ventilation-noise',
    category: 'Ventilasjon',
    title: 'Ventilasjonsanlegget lager kraftig lyd',
    description:
      'Det kommer kraftig vibrasjon fra ventilasjonsrommet. Anlegget går, men beboere i etasjen over klager på støy.',
    severity: 'Middels',
    actions: [
      'Slå av anlegget uten videre vurdering',
      'Kontrollere synlige forhold og bestille ventilasjonsservice',
      'Be beboerne bruke ørepropper',
      'Bestille låsesmed',
    ],
    correctAction: 1,
    suppliers: ['Ventilasjonsfirma', 'Rørlegger', 'Maler', 'Heisleverandør'],
    correctSupplier: 0,
    orderKeywords: ['ventilasjon', 'vibrasjon', 'støy', 'kontroll'],
    idealOrder: 'Kraftig vibrasjon og støy fra ventilasjonsanlegg. Bes om kontroll og utbedring.',
  },
];

const state = {
  score: getStoredNumber('fiks-det-score'),
  completed: getStoredNumber('fiks-det-completed'),
  streak: getStoredNumber('fiks-det-streak'),
  scenario: null,
  locked: false,
};

const elements = {
  form: document.querySelector('#decision-form'),
  severityOptions: document.querySelector('#severity-options'),
  actionOptions: document.querySelector('#action-options'),
  supplierOptions: document.querySelector('#supplier-options'),
  orderText: document.querySelector('#order-text'),
  orderCount: document.querySelector('#order-count'),
  submitButton: document.querySelector('#submit-button'),
  resultPanel: document.querySelector('#result-panel'),
  resetGame: document.querySelector('#reset-game'),
  nextCase: document.querySelector('#next-case'),
};

function getStoredNumber(key) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) ? value : 0;
}

function saveProgress() {
  localStorage.setItem('fiks-det-score', String(state.score));
  localStorage.setItem('fiks-det-completed', String(state.completed));
  localStorage.setItem('fiks-det-streak', String(state.streak));
}

function pickScenario(previousId) {
  const choices = scenarios.filter((scenario) => scenario.id !== previousId);
  return choices[Math.floor(Math.random() * choices.length)];
}

function getLevel(score) {
  return [...levels].reverse().find((level) => score >= level.min) ?? levels[0];
}

function updateScoreboard() {
  const currentLevel = getLevel(state.score);
  const nextLevel = levels.find((level) => level.min > state.score);
  const progress = nextLevel
    ? Math.min(
        100,
        ((state.score - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100,
      )
    : 100;

  document.querySelector('#score').textContent = state.score;
  document.querySelector('#completed').textContent = state.completed;
  document.querySelector('#streak').textContent = state.streak;
  document.querySelector('#level-name').textContent = currentLevel.name;
  document.querySelector('#progress-fill').style.width = `${progress}%`;
  document.querySelector('#next-level').textContent = nextLevel
    ? `${nextLevel.min - state.score} til neste nivå`
    : 'Maks nivå';
  document.querySelector('#case-number').textContent = `SAK ${state.completed + 1}`;
}

function makeChoice(name, value, text) {
  const label = document.createElement('label');
  label.className = 'choice';
  label.innerHTML = `
    <input type="radio" name="${name}" value="${value}" />
    <span class="choice-indicator"></span>
    <span>${text}</span>
  `;

  const input = label.querySelector('input');
  input.addEventListener('change', () => {
    document.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
      radio.closest('.choice').classList.toggle('choice--selected', radio.checked);
    });
    updateSubmitState();
  });

  return label;
}

function renderScenario() {
  const scenario = state.scenario;
  document.querySelector('#case-category').textContent = scenario.category;
  document.querySelector('#case-title').textContent = scenario.title;
  document.querySelector('#case-description').textContent = scenario.description;

  elements.severityOptions.replaceChildren(
    ...severityOptions.map((option) => makeChoice('severity', option, option)),
  );
  elements.actionOptions.replaceChildren(
    ...scenario.actions.map((option, index) => makeChoice('action', index, option)),
  );
  elements.supplierOptions.replaceChildren(
    ...scenario.suppliers.map((option, index) => makeChoice('supplier', index, option)),
  );

  elements.orderText.value = '';
  elements.orderText.disabled = false;
  elements.orderCount.textContent = '0';
  elements.submitButton.hidden = false;
  elements.submitButton.disabled = true;
  elements.resultPanel.hidden = true;
  state.locked = false;
  updateScoreboard();
}

function updateSubmitState() {
  const data = new FormData(elements.form);
  const complete =
    data.get('severity') &&
    data.get('action') !== null &&
    data.get('supplier') !== null &&
    elements.orderText.value.trim();

  elements.submitButton.disabled = !complete || state.locked;
}

function evaluateOrder(text, keywords) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return 0;

  const matches = keywords.filter((keyword) => normalized.includes(keyword));
  const keywordPoints = Math.round((matches.length / keywords.length) * 20);
  const clarityPoints = normalized.length >= 25 && normalized.length <= 180 ? 5 : 2;
  return Math.min(25, keywordPoints + clarityPoints);
}

function lockForm() {
  state.locked = true;
  elements.form.querySelectorAll('input, textarea').forEach((control) => {
    control.disabled = true;
  });
}

function showResult(result) {
  const verdict =
    result.roundScore >= 90
      ? 'Svært godt løst'
      : result.roundScore >= 75
        ? 'Godkjent driftshåndtering'
        : result.roundScore >= 50
          ? 'Nesten – men noe viktig glapp'
          : 'Her kunne det blitt dyrt';

  document.querySelector('#result-verdict').textContent = verdict;
  document.querySelector('#round-score').textContent = `+${result.roundScore}`;
  document.querySelector('#severity-points').textContent = `Alvorlighet: ${result.severity}/25`;
  document.querySelector('#action-points').textContent = `Første tiltak: ${result.action}/30`;
  document.querySelector('#supplier-points').textContent = `Leverandør: ${result.supplier}/20`;
  document.querySelector('#order-points').textContent = `Arbeidsordre: ${result.order}/25`;
  document.querySelector('#ideal-order').textContent = state.scenario.idealOrder;

  const bonusText = document.querySelector('#bonus-text');
  bonusText.hidden = result.bonus === 0;
  bonusText.textContent = `+${result.bonus} bonus for tre gode saker på rad.`;

  elements.submitButton.hidden = true;
  elements.resultPanel.hidden = false;
  elements.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function submitSolution(event) {
  event.preventDefault();
  if (state.locked) return;

  const data = new FormData(elements.form);
  const severity = data.get('severity');
  const action = Number(data.get('action'));
  const supplier = Number(data.get('supplier'));
  const order = evaluateOrder(elements.orderText.value, state.scenario.orderKeywords);

  const result = {
    severity: severity === state.scenario.severity ? 25 : 0,
    action: action === state.scenario.correctAction ? 30 : 0,
    supplier: supplier === state.scenario.correctSupplier ? 20 : 0,
    order,
  };

  const baseScore = result.severity + result.action + result.supplier + result.order;
  state.streak = baseScore >= 75 ? state.streak + 1 : 0;
  result.bonus = state.streak > 0 && state.streak % 3 === 0 ? 15 : 0;
  result.roundScore = baseScore + result.bonus;
  state.score += result.roundScore;
  state.completed += 1;

  saveProgress();
  lockForm();
  updateScoreboard();
  showResult(result);
}

function nextCase() {
  state.scenario = pickScenario(state.scenario.id);
  renderScenario();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetGame() {
  const confirmed = window.confirm('Vil du nullstille poeng og fremdrift?');
  if (!confirmed) return;

  state.score = 0;
  state.completed = 0;
  state.streak = 0;
  saveProgress();
  state.scenario = pickScenario(state.scenario?.id);
  renderScenario();
}

elements.orderText.addEventListener('input', () => {
  elements.orderCount.textContent = elements.orderText.value.length;
  updateSubmitState();
});
elements.form.addEventListener('submit', submitSolution);
elements.nextCase.addEventListener('click', nextCase);
elements.resetGame.addEventListener('click', resetGame);

state.scenario = pickScenario();
renderScenario();
