import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { collectionData } from 'rxfire/firestore';
import { Observable, map } from 'rxjs';
import { Product } from '../models';
import { getDb } from './firestore.helper';

@Injectable({ providedIn: 'root' })
export class ProductService {

  getProducts(): Observable<Product[]> {
    const productsCol = collection(getDb(), 'products');
    return (collectionData(productsCol, { idField: 'id' }) as Observable<Product[]>).pipe(
      map((products) =>
        products.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''))
      )
    );
  }

  getAvailableProducts(): Observable<Product[]> {
    return this.getProducts().pipe(
      map((products) => products.filter((p) => p.available))
    );
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const productsCol = collection(getDb(), 'products');
    const docRef = await addDoc(productsCol, {
      ...product,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    await updateDoc(doc(getDb(), `products/${id}`), {
      ...data,
      updatedAt: new Date(),
    });
  }

  async deleteProduct(id: string): Promise<void> {
    await deleteDoc(doc(getDb(), `products/${id}`));
  }

  imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
