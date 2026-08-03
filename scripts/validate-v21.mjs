import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import vm from 'node:vm';

const partPaths = Array.from(
  { length: 9 },
  (_, index) => `cloud-v21-packed/part-${String(index + 1).padStart(2, '0')}.b64`,
);
const base64 = partPaths.map((path) => readFileSync(path, 'utf8').trim()).join('');
const source = gunzipSync(Buffer.from(base64, 'base64')).toString('utf8');

if (!source.startsWith('(() => {')) {
  throw new Error('2.1-kjernen kunne ikke rekonstrueres fra gzip-delene');
}
if (!source.includes("const VERSION = '2.1.0'")) {
  throw new Error('Feil eller manglende versjon i 2.1-kjernen');
}
if (source.includes('hed-share-invite')) {
  throw new Error('Den defekte invitasjonsloopen finnes fortsatt i appkjernen');
}
new vm.Script(source, { filename: 'cloud-v21.js' });

const index = readFileSync('index.html', 'utf8');
const serviceWorker = readFileSync('sw.js', 'utf8');
const loader = readFileSync('cloud-loader.js', 'utf8');

if (index.includes('invite-share.js') || serviceWorker.includes('invite-share.js')) {
  throw new Error('Den defekte invitasjonskoden er fortsatt referert');
}
if (!index.includes('v21.css?v=1') || !index.includes('cloud-loader.js?v=4')) {
  throw new Error('2.1-filene er ikke aktivert i index.html');
}
if (!serviceWorker.includes("hvor-er-den-v9")) {
  throw new Error('Service worker bruker feil cacheversjon');
}
for (const file of [loader, serviceWorker]) {
  if (!file.includes('{ length: 9 }') || !file.includes('./cloud-v21-packed/part-') || !file.includes('.b64?v=1')) {
    throw new Error('Loader eller service worker mangler den komprimerte apppakken');
  }
  if (file.includes('./cloud-v21/part-') || file.includes('cloud.js.gz')) {
    throw new Error('En gammel apppakke er fortsatt aktiv');
  }
}

console.log(`Hvor er den? 2.1 validert: ${source.length} tegn, ${partPaths.length} gzip-deler.`);
