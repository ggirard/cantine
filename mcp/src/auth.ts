import express, { type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import type { AuthorizationParams, OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { InvalidGrantError, InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { config } from './config.js';
import { db } from './firebase.js';
import { CantineError, resolveMember } from './cantine.js';

/*
 * Ce serveur est lui-même le serveur d'autorisation OAuth que Claude utilise (enregistrement
 * dynamique du client, code + PKCE). Google ne sert qu'à prouver le courriel de la personne :
 * Google ne supporte pas l'enregistrement dynamique, donc on ne peut pas y renvoyer Claude directement.
 *
 * Codes, jetons d'accès et de rafraîchissement sont des JWT signés (HMAC, TOKEN_SECRET) :
 * rien à stocker sauf les clients enregistrés (Firestore, collection mcp_oauth_clients,
 * inaccessible à l'app web puisque firestore.rules n'a aucune règle pour elle).
 */

const ISSUER = config.baseUrl.href;
const ACCESS_TTL = 60 * 60; // 1 h
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 jours
const CODE_TTL = 5 * 60;
const LOGIN_TTL = 10 * 60;
const GOOGLE_CALLBACK_PATH = '/oauth/google/callback';
const DEV_LOGIN_PATH = '/oauth/dev-login';

type TokenType = 'login' | 'code' | 'access' | 'refresh';

async function sign(typ: TokenType, claims: JWTPayload, ttlSeconds: number): Promise<string> {
  return new SignJWT({ ...claims, typ })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(config.tokenSecret);
}

async function verify(typ: TokenType, token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, config.tokenSecret, { issuer: ISSUER, algorithms: ['HS256'] });
  if (payload.typ !== typ) throw new Error(`jeton de type ${payload.typ}, attendu ${typ}`);
  return payload;
}

// Un code d'autorisation ne sert qu'une fois (une seule instance du serveur : mémoire suffisante).
const usedCodes = new Map<string, number>();
function consumeCode(jti: string, exp: number): void {
  const now = Date.now() / 1000;
  for (const [id, e] of usedCodes) if (e < now) usedCodes.delete(id);
  if (usedCodes.has(jti)) throw new InvalidGrantError('Code déjà utilisé');
  usedCodes.set(jti, exp);
}

const clientsCollection = db.collection('mcp_oauth_clients');

const clientsStore: OAuthRegisteredClientsStore = {
  async getClient(clientId) {
    const snap = await clientsCollection.doc(clientId).get();
    return snap.exists ? (snap.data() as OAuthClientInformationFull) : undefined;
  },
  async registerClient(client) {
    const full = { ...client, client_id: randomUUID(), client_id_issued_at: Math.floor(Date.now() / 1000) };
    // Firestore refuse les undefined
    await clientsCollection.doc(full.client_id).set(JSON.parse(JSON.stringify(full)));
    return full;
  },
};

async function issueTokens(clientId: string, uid: string, email: string, resource?: string): Promise<OAuthTokens> {
  const claims = { sub: uid, email, cid: clientId, ...(resource ? { res: resource } : {}) };
  return {
    access_token: await sign('access', claims, ACCESS_TTL),
    token_type: 'Bearer',
    expires_in: ACCESS_TTL,
    refresh_token: await sign('refresh', claims, REFRESH_TTL),
  };
}

export const provider: OAuthServerProvider = {
  get clientsStore() {
    return clientsStore;
  },

  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response) {
    // Tout ce qu'il faudra pour émettre le code au retour de Google voyage dans un jeton signé.
    const login = await sign(
      'login',
      {
        cid: client.client_id,
        ru: params.redirectUri,
        cc: params.codeChallenge,
        st: params.state,
        res: params.resource?.href,
      },
      LOGIN_TTL,
    );

    if (config.devFakeLogin) {
      res.redirect(`${DEV_LOGIN_PATH}?login=${encodeURIComponent(login)}`);
      return;
    }

    const google = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    google.search = new URLSearchParams({
      client_id: config.googleClientId,
      redirect_uri: new URL(GOOGLE_CALLBACK_PATH, config.baseUrl).href,
      response_type: 'code',
      scope: 'openid email',
      state: login,
      prompt: 'select_account',
    }).toString();
    res.redirect(google.href);
  },

  async challengeForAuthorizationCode(client, authorizationCode) {
    const code = await verify('code', authorizationCode).catch(() => {
      throw new InvalidGrantError('Code invalide ou expiré');
    });
    if (code.cid !== client.client_id) throw new InvalidGrantError('Code émis pour un autre client');
    return code.cc as string;
  },

  async exchangeAuthorizationCode(client, authorizationCode, _codeVerifier, redirectUri) {
    const code = await verify('code', authorizationCode).catch(() => {
      throw new InvalidGrantError('Code invalide ou expiré');
    });
    if (code.cid !== client.client_id) throw new InvalidGrantError('Code émis pour un autre client');
    if (redirectUri && redirectUri !== code.ru) throw new InvalidGrantError('redirect_uri différent');
    consumeCode(code.jti!, code.exp!);
    return issueTokens(client.client_id, code.sub!, code.email as string, code.res as string | undefined);
  },

  async exchangeRefreshToken(client, refreshToken) {
    const refresh = await verify('refresh', refreshToken).catch(() => {
      throw new InvalidGrantError('Jeton de rafraîchissement invalide ou expiré');
    });
    if (refresh.cid !== client.client_id) throw new InvalidGrantError('Jeton émis pour un autre client');
    // Re-vérifie le compte : un membre désactivé perd l'accès au plus tard à l'expiration du jeton d'accès.
    try {
      await resolveMember(refresh.email as string);
    } catch (e) {
      throw new InvalidGrantError(e instanceof Error ? e.message : 'Compte invalide');
    }
    return issueTokens(client.client_id, refresh.sub!, refresh.email as string, refresh.res as string | undefined);
  },

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const access = await verify('access', token).catch(() => {
      throw new InvalidTokenError('Jeton invalide ou expiré');
    });
    return {
      token,
      clientId: access.cid as string,
      scopes: [],
      expiresAt: access.exp,
      resource: access.res ? new URL(access.res as string) : undefined,
      extra: { uid: access.sub, email: access.email },
    };
  },
};

/** Termine l'autorisation : la personne est identifiée, on émet le code et on retourne vers Claude. */
async function completeLogin(res: Response, loginToken: string, email: string): Promise<void> {
  const login = await verify('login', loginToken);
  let uid: string;
  try {
    uid = (await resolveMember(email)).uid;
  } catch (e) {
    const message = e instanceof CantineError ? e.message : 'Erreur inattendue';
    res.status(403).type('html').send(page('Accès refusé', `<p>${escapeHtml(message)}</p>`));
    return;
  }
  const code = await sign('code', { sub: uid, email, cid: login.cid, cc: login.cc, ru: login.ru, res: login.res }, CODE_TTL);
  const target = new URL(login.ru as string);
  target.searchParams.set('code', code);
  if (login.st) target.searchParams.set('state', login.st as string);
  res.redirect(target.href);
}

const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export const loginRouter = express.Router();

loginRouter.get(GOOGLE_CALLBACK_PATH, async (req, res) => {
  try {
    const { code, state, error } = req.query as Record<string, string | undefined>;
    if (error || !code || !state) {
      res.status(400).type('html').send(page('Connexion annulée', '<p>La connexion Google a été annulée.</p>'));
      return;
    }
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: new URL(GOOGLE_CALLBACK_PATH, config.baseUrl).href,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) throw new Error(`échange du code Google : HTTP ${tokenRes.status}`);
    const { id_token } = (await tokenRes.json()) as { id_token?: string };
    if (!id_token) throw new Error('réponse Google sans id_token');
    const { payload } = await jwtVerify(id_token, googleJwks, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: config.googleClientId,
    });
    if (payload.email_verified !== true || typeof payload.email !== 'string') {
      res.status(403).type('html').send(page('Accès refusé', '<p>Courriel Google non vérifié.</p>'));
      return;
    }
    await completeLogin(res, state, payload.email.toLowerCase());
  } catch (e) {
    console.error('callback Google', e);
    res.status(400).type('html').send(page('Erreur de connexion', '<p>La connexion a échoué. Réessaie depuis Claude.</p>'));
  }
});

if (config.devFakeLogin) {
  console.warn('⚠ DEV_FAKE_LOGIN actif : connexion par simple courriel (émulateur seulement)');
  loginRouter.get(DEV_LOGIN_PATH, (req, res) => {
    const login = escapeHtml(String(req.query.login ?? ''));
    res.type('html').send(
      page(
        'Connexion (dev)',
        `<form method="post"><input type="hidden" name="login" value="${login}">
         <label>Courriel <input name="email" type="email" required autofocus></label>
         <button>Continuer</button></form>`,
      ),
    );
  });
  loginRouter.post(DEV_LOGIN_PATH, express.urlencoded({ extended: false }), async (req, res) => {
    try {
      await completeLogin(res, req.body.login, String(req.body.email).toLowerCase());
    } catch (e) {
      console.error('dev-login', e);
      res.status(400).send('Jeton de connexion invalide ou expiré');
    }
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${title} · Cantine</title><body style="font-family:system-ui;max-width:28rem;margin:4rem auto;padding:0 1rem">
<h1>${title}</h1>${body}</body></html>`;
}
