import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from './config.js';

// Contre l'émulateur, aucune clé n'est nécessaire ; sinon GOOGLE_APPLICATION_CREDENTIALS
// pointe vers la clé du compte de service.
const app = process.env.FIRESTORE_EMULATOR_HOST
  ? initializeApp({ projectId: config.projectId })
  : initializeApp({ projectId: config.projectId, credential: applicationDefault() });

export const db = getFirestore(app);
export const auth = getAuth(app);
