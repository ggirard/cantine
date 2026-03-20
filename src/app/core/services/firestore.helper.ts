import { getFirestore } from 'firebase/firestore';

export function getDb() {
  return getFirestore();
}
