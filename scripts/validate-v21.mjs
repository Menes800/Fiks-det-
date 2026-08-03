import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import vm from 'node:vm';

const scripts = [
  'v21/v21-client.js',
  'v21/v21-account.js',
  'v21/v21-invite.js',
  'v21/v21-qr.js',
  'v21/v21-polish.js',
];
for (const path of scripts) {
  const source = readFileSync(path, 'utf8');
  new vm.Script(source, { filename: path });
  if (!source.includes('window.HED21') && path.endsWith('v21-client.js')) {
    throw new Error('2.1-klienten oppretter ikke HED21-navnerommet');
  }
}

const cloudSource = gunzipSync(readFileSync('cloud.js.gz')).toString('utf8');
new vm.Script(cloudSource, { filename: 'cloud.js' });

const index = readFileSync('index.html', 'utf8');
const serviceWorker = readFileSync('sw.js', 'utf8');
const loader = readFileSync('cloud-loader.js', 'utf8');
const css = readFileSync('v21/v21-modular.css', 'utf8');

if (index.includes('invite-share.js') || serviceWorker.includes('invite-share.js')) {
  throw new Error('Den defekte invitasjonskoden er fortsatt referert');
}
if (index.includes('cloud-v21/') || index.includes('cloud-v21-packed/')) {
  throw new Error('En ødelagt 2.1-pakke er fortsatt aktivert');
}
if (!loader.includes("fetch('./cloud.js.gz?v=1')")) {
  throw new Error('Den stabile sky-kjernen er ikke aktivert');
}
if (!index.includes('cloud-loader.js?v=3') || !serviceWorker.includes('cloud-loader.js?v=3')) {
  throw new Error('Feil versjon av sky-loaderen');
}
if (!serviceWorker.includes("hvor-er-den-v12")) {
  throw new Error('Service worker bruker feil cacheversjon');
}
if (!css.includes('.v21-dialog') || !css.includes('.v21-sync-pill')) {
  throw new Error('2.1-stilarket er ufullstendig');
}
for (const path of scripts) {
  const webPath = `./${path}?v=1`;
  if (!index.includes(webPath) || !serviceWorker.includes(webPath)) {
    throw new Error(`${webPath} mangler i index eller service worker`);
  }
}
if (!index.includes('./v21/v21-modular.css?v=1') || !serviceWorker.includes('./v21/v21-modular.css?v=1')) {
  throw new Error('2.1-stilarket er ikke aktivert');
}
if (!readFileSync('v21/v21-account.js', 'utf8').includes("rpc('create_invitation'")) {
  throw new Error('Invitasjonsoppretting mangler');
}
if (!readFileSync('v21/v21-invite.js', 'utf8').includes("rpc('accept_invitation'")) {
  throw new Error('Mottak av invitasjon mangler');
}
if (!readFileSync('v21/v21-qr.js', 'utf8').includes('BarcodeDetector')) {
  throw new Error('QR-skanneren mangler');
}

console.log(`Hvor er den? 2.1 validert: ${scripts.length} moduler og stabil sky-kjerne.`);
