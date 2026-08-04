import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import vm from 'node:vm';

const scripts = [
  'v21/v21-client.js','v21/v21-account.js','v21/v21-invite.js','v21/v21-qr.js','v21/v21-polish.js',
  'v22/v22-data.js','v23/v23-catalog.js','v24/v24-rules.js','v24/v24-guard.js','v24/v24-wizard.js',
  'v22/v22-mobile-hotfix.js','v22/v22-lists.js','v22/v22-compact-ui.js','v22/v22-bridge.js','v22/v22-polish.js','v24/v24-ui.js','v25/v25.js',
  'v26/v26-invite.js','v26/v26-reminders.js','v26/v26-search.js','v27/v27-invites.js','v27/v27.js',
];
for (const path of scripts) {
  const source = readFileSync(path, 'utf8');
  new vm.Script(source, { filename: path });
  if (!source.trim().endsWith('})();')) throw new Error(`${path} ser avkuttet ut`);
}
new vm.Script(gunzipSync(readFileSync('cloud.js.gz')).toString('utf8'), { filename: 'cloud.js' });

const index = readFileSync('index.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
const v27 = readFileSync('v27/v27.js', 'utf8');
const inviteFix = readFileSync('v27/v27-invites.js', 'utf8');
const v27Css = readFileSync('v27/v27.css', 'utf8');
const reminders = readFileSync('v26/v26-reminders.js', 'utf8');
const search = readFileSync('v26/v26-search.js', 'utf8');
const invite = readFileSync('v26/v26-invite.js', 'utf8');
const reminderMigration = readFileSync('supabase/migrations/20260804112000_v26_item_reminders.sql', 'utf8');

if (!sw.includes("hvor-er-den-v22")) throw new Error('Service worker bruker feil cacheversjon');
if (!index.includes('v2.7')) throw new Error('Index viser ikke versjon 2.7');
if (index.includes('./v23/v23-ai.js')) throw new Error('Betalt AI skal fortsatt være satt på pause');
if (!invite.includes('https://menes800.github.io/Fiks-det-/') || !invite.includes('invitation_code')) throw new Error('Invitasjonsadressen er ikke bevart');
if (!reminders.includes("from('item_reminders')") || !reminders.includes('Kommer snart')) throw new Error('Påminnelser mangler');
if (!search.includes('data-v26-search-type') || !search.includes('uten bilde')) throw new Error('Smart søk mangler');
if (!reminderMigration.includes('enable row level security')) throw new Error('RLS for påminnelser mangler');
if (!v27.includes("H.version = '2.7.0'") || !v27.includes('RULES') || !v27.includes('nøkkel') || !v27.includes('batteridrill')) throw new Error('Emoji- og kategorireglene mangler');
if (!v27.includes('DRAFT_KEY') || !v27.includes('Lagre og legg til en ting til her')) throw new Error('Utkast eller rask registrering mangler');
if (!v27.includes('Finnes allerede') || !v27.includes('keepLocationAfterSave')) throw new Error('Duplikatkontroll eller behold plassering mangler');
if (!v27.includes('Frakoblet – lagrer lokalt') || !v27.includes('safe-area')) throw new Error('Mobil- eller offlinepuss mangler');
if (!inviteFix.includes('Tilbakekalt') || !inviteFix.includes('openAccountSheet')) throw new Error('Tilbakekalling oppdateres ikke på samme skjerm');
if (!v27Css.includes('.v27-smart-suggestion') || !v27Css.includes('.v27-old-invites') || !v27Css.includes('100dvh')) throw new Error('2.7-stilen er ufullstendig');

const assets = ['./v27/v27.css?v=1','./v27/v27-invites.js?v=1','./v27/v27.js?v=1'];
for (const asset of assets) if (!index.includes(asset) || !sw.includes(asset)) throw new Error(`${asset} mangler i index eller service worker`);
if (!(index.indexOf('v27/v27-invites.js') > index.indexOf('v26/v26-search.js'))) throw new Error('2.7 må lastes etter 2.6');
if (!(index.indexOf('v27/v27-invites.js') < index.indexOf('v27/v27.js'))) throw new Error('Invitasjonsfiksen må lastes før hovedlaget');

console.log(`Hvor er den? 2.7 validert: ${scripts.length} klientmoduler, lokale emoji-regler, kategoriforslag, duplikatkontroll, utkast, rask registrering og mobilpuss.`);
