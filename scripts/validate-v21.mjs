import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const partPaths = Array.from(
  { length: 10 },
  (_, index) => `cloud-v21/part-${String(index + 1).padStart(2, '0')}.b64`,
);
const base64 = partPaths.map((path) => readFileSync(path, 'utf8').trim()).join('');
let source = Buffer.from(base64, 'base64').toString('utf8');

const brokenSource = 'email: cleanEmail(form.email.value)),';
const fixedSource = 'email: cleanEmail(form.email.value),';
const occurrences = source.split(brokenSource).length - 1;
if (occurrences !== 1) {
  throw new Error(`Uventet antall kjente syntaksfeil: ${occurrences}`);
}
source = source.replace(brokenSource, fixedSource);

if (!source.startsWith('(() => {')) {
  throw new Error('2.1-kjernen kunne ikke rekonstrueres fra delene');
}
if (!source.includes("const VERSION = '2.1.0'")) {
  throw new Error('Feil eller manglende versjon i 2.1-kjernen');
}
if (source.includes("const SHARE_CLASS = 'hed-share-invite'") || source.includes('new MutationObserver(queueScan)')) {
  throw new Error('Den defekte invitasjonsloopen finnes fortsatt i appkjernen');
}
new vm.Script(source, { filename: 'cloud-v21.js' });

const index = readFileSync('index.html', 'utf8');
const serviceWorker = readFileSync('sw.js', 'utf8');
const loader = readFileSync('cloud-loader.js', 'utf8');

if (index.includes('invite-share.js') || serviceWorker.includes('invite-share.js')) {
  throw new Error('Den defekte invitasjonskoden er fortsatt referert');
}
if (!index.includes('v21.css?v=1') || !index.includes('cloud-loader.js?v=5')) {
  throw new Error('2.1-filene er ikke aktivert i index.html');
}
if (!serviceWorker.includes("hvor-er-den-v10")) {
  throw new Error('Service worker bruker feil cacheversjon');
}
for (const file of [loader, serviceWorker]) {
  if (!file.includes('{ length: 10 }') || !file.includes('./cloud-v21/part-') || !file.includes('.b64?v=1')) {
    throw new Error('Loader eller service worker mangler den komplette apppakken');
  }
}
if (!loader.includes(brokenSource) || !loader.includes(fixedSource)) {
  throw new Error('Den kontrollerte syntaksreparasjonen mangler i loaderen');
}

console.log(`Hvor er den? 2.1 validert: ${source.length} tegn, ${partPaths.length} deler.`);
