import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { Product } from '../models';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private itemsSubject = new BehaviorSubject<CartItem[]>([]);

  readonly items$: Observable<CartItem[]> = this.itemsSubject.asObservable();

  readonly itemCount$: Observable<number> = this.items$.pipe(
    map((items) => items.reduce((sum, item) => sum + item.quantity, 0))
  );

  readonly total$: Observable<number> = this.items$.pipe(
    map((items) => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0))
  );

  addItem(product: Product): void {
    const items = this.itemsSubject.getValue();
    const existing = items.find((item) => item.product.id === product.id);
    if (existing) {
      this.itemsSubject.next(
        items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      this.itemsSubject.next([...items, { product, quantity: 1 }]);
    }
  }

  removeItem(productId: string): void {
    const items = this.itemsSubject.getValue();
    this.itemsSubject.next(items.filter((item) => item.product.id !== productId));
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    const items = this.itemsSubject.getValue();
    this.itemsSubject.next(
      items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }

  clear(): void {
    this.itemsSubject.next([]);
  }
}
