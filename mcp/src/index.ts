import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpAuthRouter, getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { config } from './config.js';
import { provider, loginRouter } from './auth.js';
import { createServer } from './tools.js';

const mcpUrl = new URL('/mcp', config.baseUrl);

const app = express();
// Derrière Apache : l'IP cliente vient de X-Forwarded-For (limites de débit du SDK).
app.set('trust proxy', 1);

app.use(
  mcpAuthRouter({
    provider,
    issuerUrl: config.baseUrl,
    resourceServerUrl: mcpUrl,
    resourceName: 'Cantine',
    // Les clients de Claude ne doivent pas expirer : il faudrait reconnecter le connecteur.
    clientRegistrationOptions: { clientSecretExpirySeconds: 0 },
  }),
);
app.use(loginRouter);

app.get('/healthz', (_req, res) => {
  res.send('ok');
});

const bearer = requireBearerAuth({
  verifier: provider,
  resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpUrl),
});

// Transport sans état, réponses JSON (pas de SSE) : un serveur MCP par requête.
app.post('/mcp', bearer, express.json(), async (req, res) => {
  const uid = req.auth?.extra?.uid as string | undefined;
  if (!uid) {
    res.status(401).end();
    return;
  }
  const server = createServer(uid);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => {
    void transport.close();
    void server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    console.error('requête MCP', e);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Erreur interne' }, id: null });
    }
  }
});

// Pas de flux serveur→client en mode sans état
app.all('/mcp', (_req, res) => {
  res.status(405).set('Allow', 'POST').end();
});

app.listen(config.port, () => {
  console.log(`Cantine MCP sur ${mcpUrl.href} (port ${config.port}, projet ${config.projectId})`);
});
