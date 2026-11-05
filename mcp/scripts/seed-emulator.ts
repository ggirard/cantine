// Données de test pour l'émulateur (projet demo-cantine) : refuse de tourner ailleurs.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('FIRESTORE_EMULATOR_HOST et FIREBASE_AUTH_EMULATOR_HOST requis : ce script ne touche que l\'émulateur');
}

const app = initializeApp({ projectId: 'demo-cantine' });
const db = getFirestore(app);
const auth = getAuth(app);
const now = new Date();

const members = [
  { email: 'membre@example.com', displayName: 'Membre Test', balance: 1000, active: true },
  { email: 'inactif@example.com', displayName: 'Inactif Test', balance: 0, active: false },
];
for (const m of members) {
  const user = await auth.createUser({ email: m.email, emailVerified: true, displayName: m.displayName });
  await db.doc(`users/${user.uid}`).set({ ...m, uid: user.uid, photoURL: '', role: 'member', createdAt: now, updatedAt: now });
}
// Pré-provisionné, jamais connecté à l'app : pas de compte Firebase Auth
await db.doc('users/temp_jamais').set({ email: 'jamais@example.com', displayName: 'Jamais Connecté', role: 'member', balance: 0, active: true, createdAt: now, updatedAt: now });

const products = [
  { id: 'redbull', name: 'Red Bull', price: 300, category: 'Boissons', available: true, status: 'approved' },
  { id: 'chips', name: 'Chips Lay\'s', price: 150, category: 'Collations', available: true },
  { id: 'kitkat', name: 'Kit Kat', price: 200, category: 'Collations', available: false },
  { id: 'propose', name: 'Kombucha', price: 0, category: 'Boissons', available: false, status: 'pending' },
];
for (const { id, ...p } of products) {
  await db.doc(`products/${id}`).set({ ...p, imageUrl: '', createdAt: now, updatedAt: now });
}
console.log('Émulateur peuplé : 3 membres, 4 produits');
