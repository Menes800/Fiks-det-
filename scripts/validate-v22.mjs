import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import vm from 'node:vm';

const v21Scripts = [
  'v21/v21-client.js',
  'v21/v21-account.js',
  'v21/v21-invite.js',
  'v21/v21-qr.js',
  'v21/v21-polish.js',
];
const v22Scripts = [
  'v22/v22-data.js',
  'v22/v22-lists.js',
  'v22/v22-bridge.js',
  'v22/v22-polish.js',
];

for (const path of [...v21Scripts, ...v22Scripts]) {
  const source = readFileSync(path, 'utf8');
  new vm.Script(source, { filename: path });
  if (!source.trim().endsWith('})();')) throw new Error(`${path} ser avkuttet ut`);
}

const cloudSource = gunzipSync(readFileSync('cloud.js.gz')).toString('utf8');
new vm.Script(cloudSource, { filename: 'cloud.js' });

const index = readFileSync('index.html', 'utf8');
const serviceWorker = readFileSync('sw.js', 'utf8');
const data = readFileSync('v22/v22-data.js', 'utf8');
const lists = readFileSync('v22/v22-lists.js', 'utf8');
const bridge = readFileSync('v22/v22-bridge.js', 'utf8');
const polish = readFileSync('v22/v22-polish.js', 'utf8');
const css = readFileSync('v22/v22.css', 'utf8');

if (!serviceWorker.includes("hvor-er-den-v15")) throw new Error('Service worker bruker feil cacheversjon');
if (!index.includes('v2.2')) throw new Error('Index viser ikke versjon 2.2');
if (!data.includes('V.memberLimit = 5')) throw new Error('Gratisgrensen på fem medlemmer mangler');
if (!data.includes("key: 'sun'") || !data.includes("key: 'dog'") || !data.includes("key: 'moving'")) throw new Error('Turmalene er ufullstendige');
if (!lists.includes('data-nav="lists"') || !lists.includes('data-v22-mode="unpack"')) throw new Error('Lister eller pakk-ut-modus mangler');
if (!lists.includes('itemLocation') || !lists.includes('linkedItemId')) throw new Error('Kobling til plasseringen hjemme mangler');
if (!bridge.includes("screen === 'lists'") || !bridge.includes('originalNavigate')) throw new Error('Navigasjon tilbake til Lister mangler');
if (!polish.includes('Gratis · 5 medlemmer')) throw new Error('Gratisplanen vises ikke');
if (!css.includes('.v22-list-card') || !css.includes('.v22-item-row') || !css.includes('.v22-dialog')) throw new Error('2.2-stilarket er ufullstendig');
if (readFileSync('v21/v21-polish.js', 'utf8').includes('characterData: true')) throw new Error('Den gamle frysefeilen er tilbake');

const assets = [
  './v22/v22.css?v=1',
  './v22/v22-data.js?v=1',
  './v22/v22-lists.js?v=1',
  './v22/v22-bridge.js?v=1',
  './v22/v22-polish.js?v=1',
];
for (const asset of assets) {
  if (!index.includes(asset) || !serviceWorker.includes(asset)) throw new Error(`${asset} mangler i index eller service worker`);
}

console.log(`Hvor er den? 2.2 validert: ${v22Scripts.length} nye moduler, turmaler, pakk-ut-modus og medlemsgrense.`);
