import { Injectable } from '@angular/core';
import {
  collection,
  query,
  where,
} from 'firebase/firestore';
import { collectionData } from 'rxfire/firestore';
import { Observable, map } from 'rxjs';
import { Transaction } from '../models';
import { getDb } from './firestore.helper';

@Injectable({ providedIn: 'root' })
export class TransactionService {

  getTransactionsByUser(userId: string): Observable<Transaction[]> {
    const txnCol = collection(getDb(), 'transactions');
    const q = query(txnCol, where('userId', '==', userId));
    return (collectionData(q, { idField: 'id' }) as Observable<Transaction[]>).pipe(
      map((txns) => txns.sort((a, b) => this.toMillis(b.createdAt) - this.toMillis(a.createdAt)))
    );
  }

  getAllTransactions(): Observable<Transaction[]> {
    const txnCol = collection(getDb(), 'transactions');
    return (collectionData(txnCol, { idField: 'id' }) as Observable<Transaction[]>).pipe(
      map((txns) => txns.sort((a, b) => this.toMillis(b.createdAt) - this.toMillis(a.createdAt)))
    );
  }

  private toMillis(date: any): number {
    if (date?.toMillis) return date.toMillis();
    if (date?.toDate) return date.toDate().getTime();
    return new Date(date).getTime();
  }
}
