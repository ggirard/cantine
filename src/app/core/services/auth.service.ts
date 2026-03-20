import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  onSnapshot,
} from 'firebase/firestore';
import { Observable, switchMap, map, of, shareReplay, firstValueFrom, filter, BehaviorSubject } from 'rxjs';
import { AppUser } from '../models';
import { getDb } from './firestore.helper';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private auth = getAuth();

  private firebaseUserSubject = new BehaviorSubject<User | null | undefined>(undefined);

  readonly firebaseUser$: Observable<User | null> = this.firebaseUserSubject.pipe(
    filter((u): u is User | null => u !== undefined),
    shareReplay(1)
  );

  readonly currentUser$: Observable<AppUser | null> = this.firebaseUser$.pipe(
    switchMap((fbUser) => {
      if (!fbUser) return of(null);
      return this.fetchAppUser(fbUser.uid);
    }),
    shareReplay(1)
  );

  readonly isAdmin$: Observable<boolean> = this.currentUser$.pipe(
    map((user) => user?.role === 'admin')
  );

  readonly isLoggedIn$: Observable<boolean> = this.currentUser$.pipe(
    map((user) => user !== null)
  );

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.firebaseUserSubject.next(user);
    });
  }

  async signInWithGoogle(): Promise<AppUser | null> {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    const uid = result.user.uid;
    const email = result.user.email!;
    const db = getDb();

    const userDocRef = doc(db, `users/${uid}`);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      await updateDoc(userDocRef, {
        displayName: result.user.displayName || '',
        photoURL: result.user.photoURL || '',
        updatedAt: new Date(),
      });
      return { uid, ...userDoc.data() } as AppUser;
    }

    // Chercher un doc pré-provisionné par email
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const preProvDoc = snapshot.docs[0];
        const preProvData = preProvDoc.data();

        await setDoc(userDocRef, {
          ...preProvData,
          uid,
          displayName: result.user.displayName || preProvData['displayName'] || '',
          photoURL: result.user.photoURL || '',
          updatedAt: new Date(),
        });

        if (preProvDoc.id !== uid) {
          await deleteDoc(doc(db, `users/${preProvDoc.id}`));
        }

        return { uid, ...preProvData } as AppUser;
      }
    } catch (e) {
      console.warn('Recherche par email échouée:', e);
    }

    // Premier utilisateur → admin
    const usersRef = collection(db, 'users');
    const countSnap = await getCountFromServer(usersRef);
    if (countSnap.data().count === 0) {
      const newAdmin: Record<string, unknown> = {
        uid,
        email,
        displayName: result.user.displayName || '',
        photoURL: result.user.photoURL || '',
        role: 'admin',
        balance: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(userDocRef, newAdmin);
      return { uid, ...newAdmin } as unknown as AppUser;
    }

    return null;
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/connexion']);
  }

  private fetchAppUser(uid: string): Observable<AppUser | null> {
    const docRef = doc(getDb(), `users/${uid}`);
    return new Observable<AppUser | null>((subscriber) => {
      const unsub = onSnapshot(docRef, (snap) => {
        if (!snap.exists()) {
          subscriber.next(null);
        } else {
          subscriber.next({ uid, ...snap.data() } as AppUser);
        }
      });
      return () => unsub();
    });
  }

  async getCurrentUser(): Promise<AppUser | null> {
    return firstValueFrom(this.currentUser$);
  }
}
