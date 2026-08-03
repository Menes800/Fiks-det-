import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const partPaths = Array.from(
  { length: 10 },
  (_, index) => `cloud-v21/part-${String(index + 1).padStart(2, '0')}.b64`,
);
const base64 = partPaths.map((path) => readFileSync(path, 'utf8').trim()).join('');
const source = Buffer.from(base64, 'base64').toString('utf8');

if (!source.startsWith('(() => {')) {
  throw new Error('2.1-kjernen kunne ikke rekonstrueres fra delene');
}
if (!source.includes("const VERSION = '2.1.0'")) {
  throw new Error('Feil eller manglende versjon i 2.1-kjernen');
}
new vm.Script(source, { filename: 'cloud-v21.js' });

const index = readFileSync('index.html', 'utf8');
const serviceWorker = readFileSync('sw.js', 'utf8');
const loader = readFileSync('cloud-loader.js', 'utf8');

if (index.includes('invite-share.js') || serviceWorker.includes('invite-share.js')) {
  throw new Error('Den defekte invitasjonskoden er fortsatt referert');
}
if (!index.includes('v21.css?v=1') || !index.includes('cloud-loader.js?v=3')) {
  throw new Error('2.1-filene er ikke aktivert i index.html');
}
if (serviceWorker.includes('cloud.js.gz') || !serviceWorker.includes("hvor-er-den-v8")) {
  throw new Error('Service worker bruker feil appkjerne eller cacheversjon');
}
for (const path of partPaths) {
  const webPath = `./${path}?v=1`;
  if (!loader.includes(webPath) || !serviceWorker.includes(webPath)) {
    throw new Error(`${webPath} mangler i loader eller service worker`);
  }
}

console.log(`Hvor er den? 2.1 validert: ${source.length} tegn, ${partPaths.length} deler.`);
