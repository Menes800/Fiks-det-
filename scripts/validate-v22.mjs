import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import vm from 'node:vm';

const scripts = [
  'v21/v21-client.js','v21/v21-account.js','v21/v21-invite.js','v21/v21-qr.js','v21/v21-polish.js',
  'v22/v22-data.js','v23/v23-catalog.js','v23/v23-ai.js','v23/v23-wizard.js',
  'v22/v22-mobile-hotfix.js','v22/v22-lists.js','v22/v22-compact-ui.js','v22/v22-bridge.js','v22/v22-polish.js',
];
for (const path of scripts) {
  const source = readFileSync(path, 'utf8');
  new vm.Script(source, { filename: path });
  if (!source.trim().endsWith('})();')) throw new Error(`${path} ser avkuttet ut`);
}

new vm.Script(gunzipSync(readFileSync('cloud.js.gz')).toString('utf8'), { filename: 'cloud.js' });
const index = readFileSync('index.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
const data = readFileSync('v22/v22-data.js', 'utf8');
const catalog = readFileSync('v23/v23-catalog.js', 'utf8');
const ai = readFileSync('v23/v23-ai.js', 'utf8');
const wizard = readFileSync('v23/v23-wizard.js', 'utf8');
const css = readFileSync('v23/v23.css', 'utf8');
const edge = readFileSync('supabase/functions/ai-packing-plan/index.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260804093000_ai_requests.sql', 'utf8');
const compactUi = readFileSync('v22/v22-compact-ui.js', 'utf8');
const compactCss = readFileSync('v22/v22-compact-ui.css', 'utf8');

if (!sw.includes("hvor-er-den-v18")) throw new Error('Service worker bruker feil cacheversjon');
if (!index.includes('v2.3')) throw new Error('Index viser ikke versjon 2.3');
if (!data.includes('V.memberLimit = 5')) throw new Error('Gratisgrensen på fem medlemmer mangler');
if (!catalog.includes("name: 'Reise med kjæledyr'") || catalog.includes('Tica')) throw new Error('Kjæledyrmalen er ikke generell');
for (const key of ['weekend','sun','cabin','work','day','sport','pet','moving','shopping']) {
  if (!catalog.includes(`key: '${key}'`)) throw new Error(`Malen ${key} mangler`);
}
if (!catalog.includes('quantityFor') || !catalog.includes('durationDays')) throw new Error('Regelmotor for antall mangler');
if (!wizard.includes('Beskriv det med én setning') || !wizard.includes('data-v23-choice') || !wizard.includes('data-v23-create-list')) throw new Error('Den trykkbaserte veiviseren er ufullstendig');
if (!wizard.includes('Plasseringene dine sendes ikke til AI')) throw new Error('Personverninformasjonen mangler');
if (!ai.includes("functions.invoke('ai-packing-plan'") || !ai.includes('known_item_names')) throw new Error('AI-klienten mangler');
if (!edge.includes("store: false") || !edge.includes('safety_identifier') || !edge.includes("verify") && !edge.includes('userFrom')) throw new Error('AI-funksjonen mangler personvern eller autentisering');
if (!edge.includes('json_schema') || !edge.includes('OPENAI_API_KEY')) throw new Error('Strukturert AI-svar mangler');
if (!migration.includes('enable row level security') || !migration.includes('revoke all')) throw new Error('AI-bruksloggen er ikke låst ned');
if (!compactUi.includes('v22-is-unpack') || !compactCss.includes('.v22-quick-add')) throw new Error('Kompakt listevisning mangler');
if (!css.includes('.v23-ai-hero') || !css.includes('.v23-preview-item')) throw new Error('2.3-stilen er ufullstendig');
if (readFileSync('v21/v21-polish.js', 'utf8').includes('characterData: true')) throw new Error('Den gamle frysefeilen er tilbake');

const assets = ['./v23/v23.css?v=1','./v23/v23-catalog.js?v=1','./v23/v23-ai.js?v=1','./v23/v23-wizard.js?v=1'];
for (const asset of assets) if (!index.includes(asset) || !sw.includes(asset)) throw new Error(`${asset} mangler i index eller service worker`);
if (!(index.indexOf('v23/v23-wizard.js') < index.indexOf('v22/v22-lists.js'))) throw new Error('Veiviseren må lastes før gammel malhåndtering');

console.log(`Hvor er den? 2.3 validert: ${scripts.length} klientmoduler, generiske maler, regelmotor, AI-veiviser og sikker Edge Function.`);