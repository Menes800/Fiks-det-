import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import vm from 'node:vm';

const partPaths = Array.from(
  { length: 9 },
  (_, index) => `cloud-v21-packed/part-${String(index + 1).padStart(2, '0')}.b64`,
);
const compressed = Buffer.concat(
  partPaths.map((path) => Buffer.from(readFileSync(path, 'utf8').trim(), 'base64')),
);
const source = gunzipSync(compressed).toString('utf8');

if (!source.startsWith('(() => {')) {
  throw new Error('2.1-kjernen kunne ikke rekonstrueres fra gzip-delene');
}
if (!source.includes("const VERSION = '2.1.0'")) {
  throw new Error('Feil eller manglende versjon i 2.1-kjernen');
}
if (source.includes("const SHARE_CLASS = 'hed-share-invite'") || source.includes('new MutationObserver(queueScan)')) {
  throw new Error('Den defekte invitasjonsloopen finnes fortsatt i appkjernen');
}
try {
  new vm.Script(source, { filename: 'cloud-v21.js' });
} catch (error) {
  const match = String(error.stack || error).match(/cloud-v21\.js:(\d+)/);
  const lineNumber = Number(match?.[1] || 1);
  const lines = source.split('\n');
  const from = Math.max(0, lineNumber - 8);
  const to = Math.min(lines.length, lineNumber + 7);
  console.error('\nKilde rundt syntaksfeilen:');
  for (let index = from; index < to; index += 1) {
    console.error(`${String(index + 1).padStart(4, ' ')} | ${lines[index]}`);
  }
  throw error;
}

const index = readFileSync('index.html', 'utf8');
const serviceWorker = readFileSync('sw.js', 'utf8');
const loader = readFileSync('cloud-loader.js', 'utf8');

if (index.includes('invite-share.js') || serviceWorker.includes('invite-share.js')) {
  throw new Error('Den defekte invitasjonskoden er fortsatt referert');
}
if (!index.includes('v21.css?v=1') || !index.includes('cloud-loader.js?v=6')) {
  throw new Error('2.1-filene er ikke aktivert i index.html');
}
if (!serviceWorker.includes("hvor-er-den-v11")) {
  throw new Error('Service worker bruker feil cacheversjon');
}
for (const file of [loader, serviceWorker]) {
  if (!file.includes('{ length: 9 }') || !file.includes('./cloud-v21-packed/part-') || !file.includes('.b64?v=1')) {
    throw new Error('Loader eller service worker mangler den komplette gzip-pakken');
  }
}
if (!loader.includes('encodedParts.map(decodePart)') || !loader.includes('joinBytes')) {
  throw new Error('Loaderen dekoder ikke gzip-delene separat');
}
if (!loader.includes("new DecompressionStream('gzip')")) {
  throw new Error('Loaderen pakker ikke ut gzip-kjernen');
}

console.log(`Hvor er den? 2.1 validert: ${source.length} tegn, ${partPaths.length} gzip-deler.`);
