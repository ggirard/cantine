function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

export const config = {
  port: Number(process.env.PORT ?? 8787),
  // URL publique du serveur, telle que Claude la voit (ex. https://cantine-mcp.gaubey.com)
  baseUrl: new URL(process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 8787}`),
  projectId: process.env.FIREBASE_PROJECT_ID ?? (emulator ? 'demo-cantine' : required('FIREBASE_PROJECT_ID')),
  // Secret HMAC qui signe les codes et jetons OAuth émis par ce serveur
  tokenSecret: new TextEncoder().encode(required('TOKEN_SECRET')),
  // Client OAuth Google (console GCP du projet Firebase)
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  // Connexion simulée (formulaire courriel) : seulement contre l'émulateur, jamais en prod
  devFakeLogin: emulator && process.env.DEV_FAKE_LOGIN === '1',
  maxQuantityPerItem: 20,
};

if (!config.devFakeLogin && (!config.googleClientId || !config.googleClientSecret)) {
  throw new Error('GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont requis (ou DEV_FAKE_LOGIN=1 contre l\'émulateur)');
}
if (config.tokenSecret.length < 32) {
  throw new Error('TOKEN_SECRET doit faire au moins 32 caractères');
}
