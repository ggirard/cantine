// Règles Firestore : ce qu'un membre, un admin et un inconnu peuvent faire.
// Lancer : npm test (démarre l'émulateur Firestore le temps des tests)
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';

let env;
const google = (email) => ({ email, email_verified: true });

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cantine-rules',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/admin'), { uid: 'admin', email: 'admin@x.com', role: 'admin', balance: 0, active: true });
    await setDoc(doc(db, 'users/alice'), { uid: 'alice', email: 'alice@x.com', role: 'member', balance: 1000, active: true });
    await setDoc(doc(db, 'users/bob'), { uid: 'bob', email: 'bob@x.com', role: 'member', balance: 500, active: true });
    await setDoc(doc(db, 'users/zed'), { uid: 'zed', email: 'zed@x.com', role: 'member', balance: 0, active: false });
    await setDoc(doc(db, 'users/pre_carl'), { email: 'carl@x.com', displayName: 'Carl', role: 'member', balance: 250, active: true });
    await setDoc(doc(db, 'products/redbull'), { name: 'Red Bull', price: 300, available: true, status: 'approved' });
  });
});

const as = (uid, email) => env.authenticatedContext(uid, google(email ?? `${uid}@x.com`)).firestore();

describe('trous fermés', () => {
  test('un membre ne peut pas se promouvoir admin', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { role: 'admin' }));
  });
  test('un membre ne peut pas augmenter son solde', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { balance: 999999 }));
  });
  test('un membre ne peut pas se réactiver', async () => {
    await assertFails(updateDoc(doc(as('zed'), 'users/zed'), { active: true }));
  });
  test("n'importe quel compte Google ne peut pas se créer un doc admin", async () => {
    await assertFails(setDoc(doc(as('mallory'), 'users/mallory'), { uid: 'mallory', email: 'mallory@x.com', role: 'admin', balance: 0, active: true }));
  });
  test('une migration ne peut pas changer le rôle ni le solde du doc pré-provisionné', async () => {
    const db = as('carl-uid', 'carl@x.com');
    const base = { uid: 'carl-uid', email: 'carl@x.com', role: 'member', balance: 250, active: true, migratedFrom: 'pre_carl' };
    await assertFails(setDoc(doc(db, 'users/carl-uid'), { ...base, role: 'admin' }));
    await assertFails(setDoc(doc(db, 'users/carl-uid'), { ...base, balance: 99999 }));
  });
  test("on ne migre pas le doc pré-provisionné de quelqu'un d'autre", async () => {
    await assertFails(setDoc(doc(as('mallory'), 'users/mallory'), {
      uid: 'mallory', email: 'carl@x.com', role: 'member', balance: 250, active: true, migratedFrom: 'pre_carl',
    }));
  });
  test('un courriel non vérifié ne permet pas de migrer', async () => {
    const db = env.authenticatedContext('carl-uid', { email: 'carl@x.com', email_verified: false }).firestore();
    await assertFails(setDoc(doc(db, 'users/carl-uid'), { uid: 'carl-uid', email: 'carl@x.com', role: 'member', balance: 250, active: true, migratedFrom: 'pre_carl' }));
  });
  test('un membre ne peut pas supprimer son propre doc (effacer sa dette)', async () => {
    await assertFails(deleteDoc(doc(as('alice'), 'users/alice')));
  });
  test('un membre ne lit pas les autres membres', async () => {
    await assertFails(getDoc(doc(as('alice'), 'users/bob')));
    await assertFails(getDocs(collection(as('alice'), 'users')));
  });
  test("un membre n'écrit pas de transaction pour un autre ni de crédit", async () => {
    const db = as('alice');
    await assertFails(addDoc(collection(db, 'transactions'), { userId: 'bob', type: 'achat', amount: 300, balanceAfter: 500, createdBy: 'alice' }));
    await assertFails(addDoc(collection(db, 'transactions'), { userId: 'alice', type: 'credit', amount: 5000, balanceAfter: 1000, createdBy: 'alice' }));
  });
  test('un compte Google sans doc ne voit pas le catalogue', async () => {
    await assertFails(getDoc(doc(as('mallory'), 'products/redbull')));
  });
  test('un membre inactif ne peut pas acheter', async () => {
    await assertFails(updateDoc(doc(as('zed'), 'users/zed'), { balance: -300 }));
  });
});

describe("ce que l'app fait encore", () => {
  test('connexion : mise à jour du profil Google', async () => {
    await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), { displayName: 'Alice', photoURL: 'p', updatedAt: new Date() }));
    await assertSucceeds(updateDoc(doc(as('zed'), 'users/zed'), { displayName: 'Zed', updatedAt: new Date() }));
  });
  test('première connexion : recherche par courriel, migration, suppression du doc pré-provisionné', async () => {
    const db = as('carl-uid', 'carl@x.com');
    const snap = await assertSucceeds(getDocs(query(collection(db, 'users'), where('email', '==', 'carl@x.com'))));
    const pre = snap.docs[0];
    await assertSucceeds(setDoc(doc(db, 'users/carl-uid'), {
      ...pre.data(), uid: 'carl-uid', migratedFrom: pre.id, displayName: 'Carl', photoURL: '', updatedAt: new Date(),
    }));
    await assertSucceeds(deleteDoc(doc(db, `users/${pre.id}`)));
  });
  test('achat du panier (purchaseCart) : solde et transactions dans une même transaction', async () => {
    const db = as('alice');
    await assertSucceeds(runTransaction(db, async (tx) => {
      const ref = doc(db, 'users/alice');
      const balance = (await tx.get(ref)).data().balance - 600;
      tx.update(ref, { balance, updatedAt: new Date() });
      tx.set(doc(collection(db, 'transactions')), {
        userId: 'alice', type: 'achat', amount: 600, balanceAfter: balance, description: 'Achat: Red Bull x2',
        productId: 'redbull', quantity: 2, createdBy: 'alice', createdAt: new Date(),
      });
    }));
  });
  test('un achat avec un balanceAfter mensonger est refusé', async () => {
    const db = as('alice');
    await assertFails(runTransaction(db, async (tx) => {
      const ref = doc(db, 'users/alice');
      tx.update(ref, { balance: 700, updatedAt: new Date() });
      tx.set(doc(collection(db, 'transactions')), { userId: 'alice', type: 'achat', amount: 300, balanceAfter: 9999, createdBy: 'alice' });
    }));
  });
  test('un membre lit son doc, ses transactions et le catalogue', async () => {
    const db = as('alice');
    await assertSucceeds(getDoc(doc(db, 'users/alice')));
    await assertSucceeds(getDocs(query(collection(db, 'transactions'), where('userId', '==', 'alice'))));
    await assertSucceeds(getDoc(doc(db, 'products/redbull')));
  });
  test('un membre propose un produit', async () => {
    await assertSucceeds(addDoc(collection(as('alice'), 'products'), {
      name: 'Kombucha', status: 'pending', available: false, price: 0, submittedBy: 'alice',
    }));
  });
  test("l'admin gère membres, soldes, produits et transactions", async () => {
    const db = as('admin');
    await assertSucceeds(getDocs(collection(db, 'users')));
    await assertSucceeds(setDoc(doc(db, 'users/pre_dan'), { email: 'dan@x.com', role: 'member', balance: 0, active: true }));
    await assertSucceeds(updateDoc(doc(db, 'users/bob'), { balance: 5000, role: 'admin' }));
    await assertSucceeds(addDoc(collection(db, 'transactions'), { userId: 'bob', type: 'credit', amount: 4500, balanceAfter: 5000, createdBy: 'admin' }));
    await assertSucceeds(updateDoc(doc(db, 'products/redbull'), { price: 350 }));
    await assertSucceeds(deleteDoc(doc(db, 'users/zed')));
  });
  test('un admin désactivé perd ses droits', async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'users/admin'), { active: false }));
    await assertFails(updateDoc(doc(as('admin'), 'users/bob'), { balance: 99999 }));
  });
  test('les collections du serveur MCP sont fermées au client', async () => {
    await assertFails(getDocs(collection(as('admin'), 'mcp_oauth_clients')));
  });
});
