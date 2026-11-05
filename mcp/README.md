# Cantine MCP

Serveur MCP qui permet de dire à Claude ce qu'on a pris à la cantine (« j'ai pris 2 Red Bull pis des chips »).
Il écrit dans la même base Firestore que l'app web, avec les mêmes documents `transactions`, et ajoute `source: 'mcp'`.

| Outil | Rôle |
|---|---|
| `list_products` | Catalogue disponible (exclut les produits indisponibles et les propositions) |
| `get_balance` | Solde de la personne connectée |
| `my_history` | Ses dernières transactions |
| `purchase` | Débite le solde et écrit une transaction `achat` par produit, en une seule transaction Firestore. Le prix vient de Firestore. |

Il n'y a pas d'annulation : comme dans l'app, un admin corrige une erreur (crédit).

## Identité

Le serveur est son propre serveur d'autorisation OAuth, celui auquel Claude s'adresse (enregistrement dynamique, code + PKCE). Google sert seulement à prouver le courriel. La personne doit s'être connectée **au moins une fois à l'app web** : on retrouve son `users/{uid}` par son compte Firebase Auth, jamais par un document pré-provisionné. Un compte `active: false` est refusé.

Les clients OAuth enregistrés vivent dans la collection `mcp_oauth_clients`. `firestore.rules` n'a aucune règle pour elle, donc l'app web n'y a pas accès. Les codes et les jetons sont des JWT signés par `TOKEN_SECRET` : rien d'autre n'est stocké. Changer ce secret déconnecte tout le monde.

## Développement (émulateur, sans toucher à la vraie base)

Il faut le CLI Firebase et Java. Lance chaque commande dans son propre terminal :

```bash
npm install
npm run emulators
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run seed
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 DEV_FAKE_LOGIN=1 TOKEN_SECRET=dev-secret-dev-secret-dev-secret-1234 npm run dev
npx tsx scripts/e2e-emulator.ts
```

Avec `DEV_FAKE_LOGIN=1`, la connexion Google est remplacée par un formulaire de courriel. Ce mode ne s'active que si `FIRESTORE_EMULATOR_HOST` est défini. Pour essayer dans Claude Code : `claude mcp add --transport http cantine-dev http://localhost:8787/mcp`, puis se connecter avec `membre@example.com`.

`.npmrc` force le registre npm public, pour que le lockfile s'installe aussi hors du réseau Omnimed.

## Configuration

| Variable | |
|---|---|
| `BASE_URL` | URL publique (`https://cantine-mcp.gaubey.com`) : émetteur OAuth et URL de callback |
| `FIREBASE_PROJECT_ID` | `cantine-8c37b` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Clé du compte de service Firebase (accès admin complet à la base : à protéger) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Client OAuth « Application Web » dans la console GCP du projet |
| `TOKEN_SECRET` | 32 caractères ou plus, aléatoire (`openssl rand -base64 48`) |

## Déploiement (server.gaubey.com)

1. **Google Cloud** (projet `cantine-8c37b`) : *API et services → Identifiants*. Dans un client OAuth « Application Web », ajouter l'URI de redirection `https://cantine-mcp.gaubey.com/oauth/google/callback`.
2. **Firebase** : *Paramètres du projet → Comptes de service → Générer une clé*. La copier dans `/srv/cantine-mcp/firebase-sa.json` (`chmod 600`, lisible par l'uid 1000 du conteneur).
3. **DNS Namecheap** : `CNAME cantine-mcp → gaubey.com`.
4. **Image** : `docker build -t cantine-mcp:latest mcp` depuis une copie du repo sur le serveur.
5. **Portainer** : une stack depuis `deploy/docker-compose.yml`, avec `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `TOKEN_SECRET` en variables d'environnement.
6. **Apache** : copier `deploy/apache/*.conf` dans `/etc/apache2/sites-available/`, puis `a2ensite cantine-mcp.conf`, `systemctl reload apache2` et `certbot --apache` (tout sélectionner). Le vhost SSL pointe déjà sur le certificat `gaubey.com`, que certbot étend.
7. **Vérifier** : `curl https://cantine-mcp.gaubey.com/healthz` doit répondre `ok`.
8. **Claude** : *Paramètres → Connecteurs → Ajouter un connecteur personnalisé*, URL `https://cantine-mcp.gaubey.com/mcp`.
