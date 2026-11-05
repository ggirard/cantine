import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { config } from './config.js';
import { CantineError, formatCents, getHistory, getMember, listProducts, purchase } from './cantine.js';

const TYPE_LABELS: Record<string, string> = { achat: 'Achat', credit: 'Crédit', debit_manuel: 'Débit manuel' };

function text(value: string) {
  return { content: [{ type: 'text' as const, text: value }] };
}

// Une erreur métier devient un résultat isError que Claude peut expliquer à la personne.
async function run(fn: () => Promise<string>) {
  try {
    return text(await fn());
  } catch (e) {
    if (e instanceof CantineError) return { ...text(e.message), isError: true };
    throw e;
  }
}

/** Un serveur par requête (transport sans état), lié au membre authentifié. */
export function createServer(uid: string): McpServer {
  const server = new McpServer(
    { name: 'cantine', version: '0.1.0' },
    {
      instructions:
        "Cantine du club social. Quand la personne dit avoir pris quelque chose à la cantine, " +
        'retrouve le ou les produits avec list_products puis enregistre-les avec purchase. ' +
        'Si un produit est ambigu ou introuvable, demande avant d\'acheter. Les montants sont en dollars canadiens.',
    },
  );

  server.registerTool(
    'list_products',
    {
      title: 'Catalogue de la cantine',
      description: 'Liste les produits disponibles à la cantine, avec leur id, catégorie et prix.',
      annotations: { readOnlyHint: true },
    },
    () =>
      run(async () => {
        const products = await listProducts();
        if (products.length === 0) return 'Aucun produit disponible.';
        return products.map((p) => `- ${p.name} (${p.category || 'sans catégorie'}) : ${formatCents(p.price)} [id: ${p.id}]`).join('\n');
      }),
  );

  server.registerTool(
    'get_balance',
    {
      title: 'Mon solde',
      description: 'Donne le solde Cantine de la personne. Un solde négatif est une avance à rembourser.',
      annotations: { readOnlyHint: true },
    },
    () =>
      run(async () => {
        const member = await getMember(uid);
        return `Solde de ${member.displayName || member.email} : ${formatCents(member.balance)}`;
      }),
  );

  server.registerTool(
    'my_history',
    {
      title: 'Mon historique',
      description: 'Dernières transactions Cantine de la personne (achats, crédits, débits manuels), la plus récente en premier.',
      inputSchema: { limit: z.number().int().min(1).max(50).default(10).describe('Nombre de transactions (1 à 50)') },
      annotations: { readOnlyHint: true },
    },
    ({ limit }) =>
      run(async () => {
        const history = await getHistory(uid, limit);
        if (history.length === 0) return 'Aucune transaction.';
        return history
          .map((t) => {
            const sign = t.type === 'credit' ? '+' : '-';
            const date = t.createdAt.toLocaleString('fr-CA', { timeZone: 'America/Toronto' });
            return `- ${date} · ${TYPE_LABELS[t.type] ?? t.type} · ${t.description} · ${sign}${formatCents(t.amount)} (solde : ${formatCents(t.balanceAfter)})`;
          })
          .join('\n');
      }),
  );

  server.registerTool(
    'purchase',
    {
      title: 'Enregistrer une consommation',
      description:
        'Enregistre ce que la personne a pris à la cantine et débite son solde. Prendre les product_id de list_products. ' +
        "Irréversible pour la personne : seul un admin peut corriger une erreur. En cas de doute sur le produit ou la quantité, demander d'abord.",
      inputSchema: {
        items: z
          .array(
            z.object({
              product_id: z.string().min(1).describe('id du produit (voir list_products)'),
              quantity: z.number().int().min(1).max(config.maxQuantityPerItem).default(1),
            }),
          )
          .min(1)
          .max(20),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    ({ items }) =>
      run(async () => {
        const result = await purchase(uid, items.map((i) => ({ productId: i.product_id, quantity: i.quantity })));
        const lines = result.lines.map((l) => `- ${l.name} x${l.quantity} : ${formatCents(l.amount)}`).join('\n');
        return `Enregistré :\n${lines}\nTotal : ${formatCents(result.total)}\nNouveau solde : ${formatCents(result.balanceAfter)}`;
      }),
  );

  return server;
}
