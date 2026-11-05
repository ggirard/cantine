// Parcours complet contre un serveur lancé avec DEV_FAKE_LOGIN=1 sur l'émulateur peuplé par seed-emulator :
// enregistrement du client, autorisation + PKCE, jetons, puis appels des outils MCP.
import { createHash, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL ?? 'http://localhost:8787';
const REDIRECT = 'http://localhost:9/callback';

async function login(email: string) {
  const reg = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_name: 'e2e', redirect_uris: [REDIRECT], token_endpoint_auth_method: 'none' }),
  });
  assert.equal(reg.status, 201, await reg.clone().text());
  const { client_id } = await reg.json();

  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const auth = new URL(`${BASE}/authorize`);
  auth.search = new URLSearchParams({
    client_id, redirect_uri: REDIRECT, response_type: 'code', code_challenge: challenge,
    code_challenge_method: 'S256', state: 'xyz', resource: `${BASE}/mcp`,
  }).toString();
  const toDev = await fetch(auth, { redirect: 'manual' });
  assert.equal(toDev.status, 302);
  const devUrl = new URL(toDev.headers.get('location')!, BASE);
  const loginToken = devUrl.searchParams.get('login')!;

  const back = await fetch(devUrl.origin + devUrl.pathname, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ login: loginToken, email }),
  });
  if (back.status !== 302) return { refused: back.status, body: await back.text() };
  const cb = new URL(back.headers.get('location')!);
  assert.equal(cb.searchParams.get('state'), 'xyz');
  const code = cb.searchParams.get('code')!;

  const tokenReq = () => fetch(`${BASE}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verifier, client_id, redirect_uri: REDIRECT }),
  });
  const tok = await tokenReq();
  assert.equal(tok.status, 200, await tok.clone().text());
  const tokens = await tok.json();
  const replay = await tokenReq();
  assert.equal(replay.status, 400, 'un code ne doit servir qu\'une fois');

  const refreshed = await fetch(`${BASE}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id }),
  });
  assert.equal(refreshed.status, 200, await refreshed.clone().text());
  return { accessToken: tokens.access_token as string };
}

let id = 0;
async function rpc(token: string | null, method: string, params: object = {}) {
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  });
  return { status: res.status, headers: res.headers, body: res.status === 200 ? await res.json() : await res.text() };
}

const call = async (token: string, name: string, args: object = {}) => {
  const r = await rpc(token, 'tools/call', { name, arguments: args });
  assert.equal(r.status, 200);
  return { text: r.body.result.content[0].text as string, isError: Boolean(r.body.result.isError) };
};

// Sans jeton : 401 avec le pointeur vers les métadonnées OAuth
const anon = await rpc(null, 'tools/list');
assert.equal(anon.status, 401);
assert.match(anon.headers.get('www-authenticate') ?? '', /resource_metadata=/);
console.log('✓ 401 sans jeton');

const meta = await (await fetch(`${BASE}/.well-known/oauth-protected-resource/mcp`)).json();
assert.equal(meta.resource, `${BASE}/mcp`);
console.log('✓ métadonnées de ressource protégée');

// Comptes refusés
for (const email of ['inactif@example.com', 'jamais@example.com', 'inconnu@example.com']) {
  const r = await login(email);
  assert.ok('refused' in r && r.refused === 403, `${email} devrait être refusé`);
  console.log(`✓ ${email} refusé : ${(r as { body: string }).body.match(/<p>(.*?)<\/p>/)?.[1]}`);
}

const { accessToken } = (await login('membre@example.com')) as { accessToken: string };
console.log('✓ OAuth complet (code à usage unique, rafraîchissement)');

const init = await rpc(accessToken, 'initialize', {
  protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '0' },
});
assert.equal(init.status, 200);
const tools = await rpc(accessToken, 'tools/list');
console.log('✓ outils :', tools.body.result.tools.map((t: { name: string }) => t.name).join(', '));

const catalogue = await call(accessToken, 'list_products');
assert.match(catalogue.text, /Red Bull/);
assert.match(catalogue.text, /Chips/);
assert.doesNotMatch(catalogue.text, /Kit Kat|Kombucha/);
console.log('✓ catalogue (indisponibles et propositions exclus)\n' + catalogue.text);

console.log((await call(accessToken, 'get_balance')).text);

const achat = await call(accessToken, 'purchase', { items: [{ product_id: 'redbull', quantity: 2 }, { product_id: 'chips' }] });
assert.equal(achat.isError, false, achat.text);
assert.match(achat.text, /Nouveau solde : 2,50/);
console.log('✓ achat\n' + achat.text);

for (const [items, why] of [
  [[{ product_id: 'kitkat' }], 'indisponible'],
  [[{ product_id: 'propose' }], 'proposition'],
  [[{ product_id: 'nexistepas' }], 'inconnu'],
] as const) {
  const r = await call(accessToken, 'purchase', { items });
  assert.equal(r.isError, true, `${why} devrait échouer`);
  console.log(`✓ refus ${why} : ${r.text}`);
}
const tooMany = await rpc(accessToken, 'tools/call', { name: 'purchase', arguments: { items: [{ product_id: 'redbull', quantity: 99 }] } });
assert.equal(tooMany.body.result?.isError ?? Boolean(tooMany.body.error), true);
console.log('✓ quantité 99 refusée');

const solde = await call(accessToken, 'get_balance');
assert.match(solde.text, /2,50/);
console.log('✓ solde inchangé après les refus : ' + solde.text);

console.log((await call(accessToken, 'my_history', { limit: 5 })).text);
console.log('\nTous les tests passent.');
