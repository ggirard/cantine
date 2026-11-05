import { db, auth } from './firebase.js';
import { config } from './config.js';

// Mêmes collections et mêmes formes de documents que l'app Angular (src/app/core/models).

export interface Product {
  id: string;
  name: string;
  price: number; // en centimes
  category: string;
}

export interface Member {
  uid: string;
  email: string;
  displayName: string;
  balance: number; // en centimes
}

export class CantineError extends Error {}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
}

/**
 * Retrouve le membre à partir du courriel vérifié par Google.
 * On passe par Firebase Auth pour obtenir l'uid : un doc pré-provisionné (id temporaire)
 * est migré vers users/{uid} à la première connexion à l'app, et une transaction écrite
 * sur l'id temporaire perdrait son lien avec l'historique.
 */
export async function resolveMember(email: string): Promise<Member> {
  let uid: string;
  try {
    uid = (await auth.getUserByEmail(email)).uid;
  } catch {
    throw new CantineError(`Aucun compte Cantine pour ${email}. Connecte-toi une première fois à l'app web de la Cantine.`);
  }
  return getMember(uid);
}

export async function getMember(uid: string): Promise<Member> {
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) {
    throw new CantineError("Compte non activé : connecte-toi une première fois à l'app web de la Cantine.");
  }
  const data = snap.data()!;
  if (data.active === false) throw new CantineError('Ce compte Cantine est désactivé.');
  return { uid, email: data.email, displayName: data.displayName ?? '', balance: data.balance ?? 0 };
}

function isPurchasable(data: FirebaseFirestore.DocumentData): boolean {
  return data.available === true && data.status !== 'pending';
}

export async function listProducts(): Promise<Product[]> {
  const snap = await db.collection('products').where('available', '==', true).get();
  return snap.docs
    .filter((d) => isPurchasable(d.data()))
    .map((d) => ({ id: d.id, name: d.data().name, price: d.data().price, category: d.data().category ?? '' }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export interface HistoryEntry {
  type: string;
  description: string;
  amount: number;
  balanceAfter: number;
  createdAt: Date;
}

export async function getHistory(uid: string, limit: number): Promise<HistoryEntry[]> {
  // Tri en mémoire comme l'app : évite un index composite userId + createdAt.
  const snap = await db.collection('transactions').where('userId', '==', uid).get();
  return snap.docs
    .map((d) => {
      const t = d.data();
      return {
        type: t.type,
        description: t.description,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt?.toDate?.() ?? new Date(t.createdAt),
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export interface PurchaseLine {
  productId: string;
  quantity: number;
}

export interface PurchaseResult {
  lines: { name: string; quantity: number; amount: number }[];
  total: number;
  balanceAfter: number;
}

/**
 * Équivalent serveur de BalanceService.purchaseCart : débite le solde et écrit une
 * transaction 'achat' par ligne. Le prix vient toujours de Firestore, jamais de l'appelant,
 * et tout se fait dans une seule transaction (le solde et l'historique ne peuvent diverger).
 */
export async function purchase(uid: string, lines: PurchaseLine[]): Promise<PurchaseResult> {
  const merged = new Map<string, number>();
  for (const line of lines) merged.set(line.productId, (merged.get(line.productId) ?? 0) + line.quantity);
  for (const [productId, quantity] of merged) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > config.maxQuantityPerItem) {
      throw new CantineError(`Quantité invalide pour ${productId} : entre 1 et ${config.maxQuantityPerItem}.`);
    }
  }

  return db.runTransaction(async (tx) => {
    const userRef = db.doc(`users/${uid}`);
    const productRefs = [...merged.keys()].map((id) => db.doc(`products/${id}`));
    const [userSnap, ...productSnaps] = await tx.getAll(userRef, ...productRefs);

    if (!userSnap.exists) throw new CantineError('Utilisateur introuvable');
    if (userSnap.data()!.active === false) throw new CantineError('Ce compte Cantine est désactivé.');

    const resolved = productSnaps.map((snap) => {
      if (!snap.exists) throw new CantineError(`Produit inconnu : ${snap.id}. Utilise list_products.`);
      const p = snap.data()!;
      if (!isPurchasable(p)) throw new CantineError(`« ${p.name} » n'est pas disponible présentement.`);
      const quantity = merged.get(snap.id)!;
      return { id: snap.id, name: p.name as string, quantity, amount: (p.price as number) * quantity };
    });

    const total = resolved.reduce((sum, l) => sum + l.amount, 0);
    const balanceAfter = (userSnap.data()!.balance as number) - total;
    const now = new Date();

    tx.update(userRef, { balance: balanceAfter, updatedAt: now });
    for (const line of resolved) {
      tx.create(db.collection('transactions').doc(), {
        userId: uid,
        type: 'achat',
        amount: line.amount,
        balanceAfter,
        description: `Achat: ${line.name} x${line.quantity}`,
        productId: line.id,
        quantity: line.quantity,
        createdBy: uid,
        createdAt: now,
        source: 'mcp',
      });
    }

    return { lines: resolved.map(({ name, quantity, amount }) => ({ name, quantity, amount })), total, balanceAfter };
  });
}
