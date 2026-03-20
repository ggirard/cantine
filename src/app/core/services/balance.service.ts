import { Injectable } from '@angular/core';
import {
  doc,
  runTransaction,
  collection,
  addDoc,
} from 'firebase/firestore';
import { getDb } from './firestore.helper';
import { CartItem } from './cart.service';

@Injectable({ providedIn: 'root' })
export class BalanceService {

  async purchase(
    userId: string,
    productId: string,
    productName: string,
    price: number,
    createdBy: string
  ): Promise<void> {
    const db = getDb();
    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, `users/${userId}`);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('Utilisateur introuvable');

      const currentBalance = userSnap.data()['balance'] as number;
      const newBalance = currentBalance - price;

      transaction.update(userRef, {
        balance: newBalance,
        updatedAt: new Date(),
      });

      return { newBalance };
    });

    await addDoc(collection(db, 'transactions'), {
      userId,
      type: 'achat',
      amount: price,
      balanceAfter: result.newBalance,
      description: `Achat: ${productName}`,
      productId,
      createdBy,
      createdAt: new Date(),
    });
  }

  async credit(
    userId: string,
    amount: number,
    description: string,
    createdBy: string
  ): Promise<void> {
    const db = getDb();
    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, `users/${userId}`);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('Utilisateur introuvable');

      const currentBalance = userSnap.data()['balance'] as number;
      const newBalance = currentBalance + amount;

      transaction.update(userRef, {
        balance: newBalance,
        updatedAt: new Date(),
      });

      return { newBalance };
    });

    await addDoc(collection(db, 'transactions'), {
      userId,
      type: 'credit',
      amount,
      balanceAfter: result.newBalance,
      description,
      createdBy,
      createdAt: new Date(),
    });
  }

  async purchaseCart(
    userId: string,
    items: CartItem[],
    createdBy: string
  ): Promise<void> {
    const db = getDb();
    const totalAmount = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, `users/${userId}`);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('Utilisateur introuvable');

      const currentBalance = userSnap.data()['balance'] as number;
      const newBalance = currentBalance - totalAmount;

      transaction.update(userRef, {
        balance: newBalance,
        updatedAt: new Date(),
      });

      return { newBalance };
    });

    // Create one transaction doc per cart item
    for (const item of items) {
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'achat',
        amount: item.product.price * item.quantity,
        balanceAfter: result.newBalance,
        description: `Achat: ${item.product.name} x${item.quantity}`,
        productId: item.product.id,
        quantity: item.quantity,
        createdBy,
        createdAt: new Date(),
      });
    }
  }

  async manualDebit(
    userId: string,
    amount: number,
    description: string,
    createdBy: string
  ): Promise<void> {
    const db = getDb();
    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, `users/${userId}`);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('Utilisateur introuvable');

      const currentBalance = userSnap.data()['balance'] as number;
      const newBalance = currentBalance - amount;

      transaction.update(userRef, {
        balance: newBalance,
        updatedAt: new Date(),
      });

      return { newBalance };
    });

    await addDoc(collection(db, 'transactions'), {
      userId,
      type: 'debit_manuel',
      amount,
      balanceAfter: result.newBalance,
      description,
      createdBy,
      createdAt: new Date(),
    });
  }
}
