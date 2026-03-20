import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { collectionData } from 'rxfire/firestore';
import { Observable, map } from 'rxjs';
import { AppUser } from '../models';
import { getDb } from './firestore.helper';

@Injectable({ providedIn: 'root' })
export class UserService {

  getUsers(): Observable<AppUser[]> {
    const usersCol = collection(getDb(), 'users');
    return (collectionData(usersCol, { idField: 'uid' }) as Observable<AppUser[]>).pipe(
      map((users) => users.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')))
    );
  }

  async createUser(user: Partial<AppUser> & { email: string }): Promise<void> {
    const tempId = this.generateTempId(user.email);
    await setDoc(doc(getDb(), `users/${tempId}`), {
      email: user.email,
      displayName: user.displayName || '',
      photoURL: '',
      role: user.role || 'member',
      balance: 0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async updateUser(uid: string, data: Partial<AppUser>): Promise<void> {
    await updateDoc(doc(getDb(), `users/${uid}`), {
      ...data,
      updatedAt: new Date(),
    });
  }

  async deleteUser(uid: string): Promise<void> {
    await deleteDoc(doc(getDb(), `users/${uid}`));
  }

  private generateTempId(email: string): string {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `pre_${Math.abs(hash).toString(36)}`;
  }
}
