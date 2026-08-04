import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-5-mini';
const DAILY_LIMIT = Math.max(1, Math.min(100, Number(Deno.env.get('AI_DAILY_LIMIT')) || 10));

function firstKey(value: string | undefined): string {
  if (!value) return '';
  try { return String(Object.values(JSON.parse(value) || {})[0] || ''); } catch { return ''; }
}

const PUBLISHABLE_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || firstKey(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'));
const SECRET_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || firstKey(Deno.env.get('SUPABASE_SECRET_KEYS'));
const allowedOrigins = new Set(['https://menes800.github.io','http://localhost:3000','http://127.0.0.1:3000','http://localhost:5173','http://127.0.0.1:5173']);

function cors(req: Request): HeadersInit {
  const origin = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://menes800.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}
function reply(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
function text(value: unknown, max: number): string { return String(value ?? '').trim().slice(0, max); }
function strings(value: unknown, count: number, max: number): string[] { return Array.isArray(value) ? value.map((entry) => text(entry, max)).filter(Boolean).slice(0, count) : []; }
async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function userFrom(req: Request): Promise<{ id: string } | null> {
  const authorization = req.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ') || !SUPABASE_URL || !PUBLISHABLE_KEY) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authorization, apikey: PUBLISHABLE_KEY } });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return user?.id ? { id: String(user.id) } : null;
}
async function admin(path: string, init: RequestInit = {}): Promise<Response> {
  if (!SUPABASE_URL || !SECRET_KEY) throw new Error('SUPABASE_ADMIN_NOT_CONFIGURED');
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}
async function usedToday(userId: string): Promise<number> {
  const since = new Date(Date.now() - 86400000).toISOString();
  const response = await admin(`ai_requests?user_id=eq.${encodeURIComponent(userId)}&success=eq.true&created_at=gte.${encodeURIComponent(since)}&select=id&limit=${DAILY_LIMIT + 1}`);
  if (!response.ok) throw new Error('AI_USAGE_LOOKUP_FAILED');
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows.length : 0;
}
async function log(entry: Record<string, unknown>): Promise<void> {
  try { await admin('ai_requests', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(entry) }); }
  catch (error) { console.error('Could not log AI request', error); }
}
function outputText(response: any): string {
  if (typeof response?.output_text === 'string') return response.output_text;
  for (const output of response?.output || []) for (const content of output?.content || []) if (content?.type === 'output_text' && typeof content.text === 'string') return content.text;
  return '';
}

const schema = {
  type: 'object', additionalProperties: false,
  required: ['title','destination','kind','summary','assumptions','items'],
  properties: {
    title: { type: 'string' }, destination: { type: 'string' },
    kind: { type: 'string', enum: ['trip','packing','reminder','shopping','moving','custom'] },
    summary: { type: 'string' }, assumptions: { type: 'array', items: { type: 'string' } },
    items: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      required: ['section','title','quantity','note','status','essential','selected'],
      properties: {
        section: { type: 'string' }, title: { type: 'string' }, quantity: { type: 'integer', minimum: 1, maximum: 99 },
        note: { type: 'string' }, status: { type: 'string', enum: ['needed','buy'] }, essential: { type: 'boolean' }, selected: { type: 'boolean' },
      },
    } },
  },
};

const instructions = `Du er listeassistenten i den norske appen «Hvor er den?». Lag praktiske, korte og ryddige pakkelister, huskelister, handlelister eller flyttelister.
- Svar kun i oppgitt JSON-format.
- Bruk generelle ord som passer alle. Ikke finn på personnavn, dyrenavn eller private opplysninger.
- Ikke avslør eller gjett plasseringer hjemme. Navn på registrerte ting brukes bare for samme ordlyd og færre duplikater.
- Behold viktige elementer fra grunnlisten, fjern duplikater og tydelig unødvendige punkter.
- Tilpass antall etter dager og personer. Antall er totalt.
- Bruk naturlige seksjoner. Status buy brukes bare når noe må kjøpes.
- Marker dokumenter, medisiner, nøkler, nødvendig utstyr og sikkerhetsoppgaver som essential.
- Maksimalt 50 konkrete punkter.
- Ikke gi medisinske, juridiske eller sikkerhetskritiske garantier.
- Legg korte antakelser brukeren bør kontrollere i assumptions.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return reply(req, { code: 'METHOD_NOT_ALLOWED', message: 'Bare POST støttes.' }, 405);
  const user = await userFrom(req);
  if (!user) return reply(req, { code: 'UNAUTHORIZED', message: 'Logg inn på nytt for å bruke AI.' }, 401);
  if (!OPENAI_API_KEY) return reply(req, { code: 'AI_NOT_CONFIGURED', message: 'AI-nøkkelen er ikke konfigurert ennå.' }, 503);

  let body: any;
  try { body = await req.json(); } catch { return reply(req, { code: 'INVALID_JSON', message: 'Ugyldig forespørsel.' }, 400); }
  const prompt = text(body?.prompt, 800);
  const choices = body?.choices && typeof body.choices === 'object' ? body.choices : {};
  const knownItems = strings(body?.known_item_names, 120, 80);
  const baseItems = Array.isArray(body?.base_items) ? body.base_items.slice(0, 70).map((entry: any) => ({
    section: text(entry?.section, 50), title: text(entry?.title, 120), quantity: Math.max(1, Math.min(99, Number(entry?.quantity) || 1)),
    status: entry?.status === 'buy' ? 'buy' : 'needed', essential: Boolean(entry?.essential),
  })).filter((entry: any) => entry.title) : [];
  if (!prompt && !baseItems.length) return reply(req, { code: 'EMPTY_REQUEST', message: 'Beskriv turen eller velg en mal først.' }, 400);

  let used = 0;
  try { used = await usedToday(user.id); } catch { return reply(req, { code: 'AI_USAGE_UNAVAILABLE', message: 'Kunne ikke kontrollere AI-grensen akkurat nå.' }, 503); }
  if (used >= DAILY_LIMIT) return reply(req, { code: 'AI_LIMIT', message: `Du har brukt dagens ${DAILY_LIMIT} AI-forslag.`, remaining: 0 }, 429);

  const context = {
    user_request: prompt, template_key: text(body?.template_key, 40),
    choices: {
      duration: text(choices.duration, 20), days: Math.max(0, Math.min(60, Number(choices.days) || 0)),
      people: Math.max(1, Math.min(12, Number(choices.people) || 1)), transport: text(choices.transport, 20),
      baggage: text(choices.baggage, 20), activities: strings(choices.activities, 12, 30), destination: text(choices.destination, 120),
    },
    base_items: baseItems, known_item_names: knownItems, locale: 'nb-NO',
  };
  const inputHash = await hash(JSON.stringify(context));
  const safetyIdentifier = `hed_${(await hash(user.id)).slice(0, 32)}`;

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_MODEL, instructions, input: JSON.stringify(context), reasoning: { effort: 'low' },
        max_output_tokens: 2600, store: false, safety_identifier: safetyIdentifier,
        text: { format: { type: 'json_schema', name: 'packing_plan', description: 'Liste som brukeren skal forhåndsvise og godkjenne.', strict: true, schema } },
      }),
    });
  } catch {
    await log({ user_id: user.id, feature: 'packing_plan', model: OPENAI_MODEL, success: false, input_hash: inputHash, error_code: 'OPENAI_NETWORK' });
    return reply(req, { code: 'AI_NETWORK', message: 'AI-tjenesten kunne ikke nås.' }, 503);
  }

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    const code = response.status === 429 ? 'AI_BUSY' : 'OPENAI_ERROR';
    await log({ user_id: user.id, feature: 'packing_plan', model: OPENAI_MODEL, success: false, input_hash: inputHash, error_code: code });
    console.error('OpenAI error', response.status, responseBody?.error?.code || responseBody?.error?.message);
    return reply(req, { code, message: response.status === 429 ? 'AI-en er opptatt akkurat nå.' : 'AI-en klarte ikke å lage et forslag.' }, 502);
  }

  let plan: unknown;
  try { plan = JSON.parse(outputText(responseBody)); }
  catch {
    await log({ user_id: user.id, feature: 'packing_plan', model: OPENAI_MODEL, success: false, input_hash: inputHash, error_code: 'INVALID_MODEL_JSON' });
    return reply(req, { code: 'AI_INVALID', message: 'AI-en svarte i et ugyldig format.' }, 502);
  }

  await log({
    user_id: user.id, feature: 'packing_plan', model: responseBody?.model || OPENAI_MODEL, success: true, input_hash: inputHash,
    input_tokens: Number(responseBody?.usage?.input_tokens) || null, output_tokens: Number(responseBody?.usage?.output_tokens) || null, error_code: null,
  });
  return reply(req, { plan, model: responseBody?.model || OPENAI_MODEL, remaining: Math.max(0, DAILY_LIMIT - used - 1) });
});