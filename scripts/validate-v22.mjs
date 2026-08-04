import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import vm from 'node:vm';

const scripts = [
  'v21/v21-client.js','v21/v21-account.js','v21/v21-invite.js','v21/v21-qr.js','v21/v21-polish.js',
  'v22/v22-data.js','v23/v23-catalog.js','v24/v24-rules.js','v24/v24-wizard.js',
  'v22/v22-mobile-hotfix.js','v22/v22-lists.js','v22/v22-compact-ui.js','v22/v22-bridge.js','v22/v22-polish.js','v24/v24-ui.js',
];

for (const path of scripts) {
  const source = readFileSync(path, 'utf8');
  new vm.Script(source, { filename: path });
  if (!source.trim().endsWith('})();')) throw new Error(`${path} ser avkuttet ut`);
}
new vm.Script(gunzipSync(readFileSync('cloud.js.gz')).toString('utf8'), { filename: 'cloud.js' });

const index = readFileSync('index.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
const catalog = readFileSync('v23/v23-catalog.js', 'utf8');
const rules = readFileSync('v24/v24-rules.js', 'utf8');
const wizard = readFileSync('v24/v24-wizard.js', 'utf8');
const ui = readFileSync('v24/v24-ui.js', 'utf8');
const css = readFileSync('v24/v24.css', 'utf8');
const compactUi = readFileSync('v22/v22-compact-ui.js', 'utf8');
const compactCss = readFileSync('v22/v22-compact-ui.css', 'utf8');

if (!sw.includes("hvor-er-den-v19")) throw new Error('Service worker bruker feil cacheversjon');
if (!index.includes('v2.4')) throw new Error('Index viser ikke versjon 2.4');
if (index.includes('./v23/v23-ai.js') || index.includes('./v23/v23-wizard.js')) throw new Error('AI-versjonen skal være satt på pause i klienten');
if (!catalog.includes("name: 'Reise med kjæledyr'") || catalog.includes('Tica')) throw new Error('Kjæledyrmalen er ikke generell');
for (const key of ['weekend','sun','cabin','work','day','sport','pet','moving','shopping']) {
  if (!catalog.includes(`key: '${key}'`)) throw new Error(`Malen ${key} mangler`);
}
if (!rules.includes("W.aiPaused = true") || !rules.includes('clothingDays') || !rules.includes('packingStyle') || !rules.includes('laundry') || !rules.includes('climate')) throw new Error('Den utvidede regelmotoren mangler');
if (!rules.includes("Forslag for ${windowDays} dager") || !rules.includes('Væsker i beholdere på maks 100 ml')) throw new Error('Reglene for lange turer eller håndbagasje mangler');
if (!wizard.includes('SMART UTEN AI') || !wizard.includes('data-v24-preview') || !wizard.includes('Kan klær vaskes underveis?')) throw new Error('Den nye malbyggeren er ufullstendig');
if (!ui.includes('v24-home') || !ui.includes('v24-more-details') || !ui.includes('[data-v22-delete-list]')) throw new Error('Hjem, legg til ting eller sletting er ikke rettet');
if (!ui.includes('Appen lager en sikker lenke') || !ui.includes('Lag lenke og åpne deling')) throw new Error('Invitasjonsflyten er fortsatt misvisende');
if (!css.includes('.v24-home-summary') || !css.includes('.v24-location-card') || !css.includes('.v24-rule-intro')) throw new Error('2.4-stilen er ufullstendig');
if (!compactUi.includes('v22-is-unpack') || !compactCss.includes('.v22-quick-add')) throw new Error('Kompakt listevisning mangler');
if (readFileSync('v21/v21-polish.js', 'utf8').includes('characterData: true')) throw new Error('Den gamle frysefeilen er tilbake');

const assets = ['./v24/v24.css?v=1','./v24/v24-rules.js?v=1','./v24/v24-wizard.js?v=1','./v24/v24-ui.js?v=1'];
for (const asset of assets) {
  if (!index.includes(asset) || !sw.includes(asset)) throw new Error(`${asset} mangler i index eller service worker`);
}
if (!(index.indexOf('v24/v24-rules.js') < index.indexOf('v24/v24-wizard.js'))) throw new Error('Regelmotoren må lastes før malbyggeren');
if (!(index.indexOf('v24/v24-wizard.js') < index.indexOf('v22/v22-lists.js'))) throw new Error('Ny malbygger må fange klikk før gammel malhåndtering');
if (!(index.indexOf('v24/v24-ui.js') > index.indexOf('v22/v22-polish.js'))) throw new Error('2.4-oppryddingen må lastes sist');

console.log(`Hvor er den? 2.4 validert: ${scripts.length} klientmoduler, forbedret regelmotor, kompakt hjem, kortere registrering, tydelige invitasjoner og fungerende listesletting.`);