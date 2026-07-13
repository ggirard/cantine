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
        products
          .filter((p) => p.status !== 'pending')
          .sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''))
      )
    );
  }

  getAvailableProducts(): Observable<Product[]> {
    return this.getProducts().pipe(
      map((products) => products.filter((p) => p.available))
    );
  }

  getPendingSubmissions(): Observable<Product[]> {
    const productsCol = collection(getDb(), 'products');
    return (collectionData(productsCol, { idField: 'id' }) as Observable<Product[]>).pipe(
      map((products) =>
        products
          .filter((p) => p.status === 'pending')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      )
    );
  }

  async submitProduct(
    name: string,
    category: string,
    imageUrl: string,
    submissionNote: string,
    submittedBy: string,
    submittedByName: string,
  ): Promise<string> {
    return this.createProduct({
      name,
      category,
      imageUrl,
      available: false,
      price: 0,
      status: 'pending',
      submittedBy,
      submittedByName,
      submissionNote,
    });
  }

  async approveProduct(id: string, price: number, imageUrl: string): Promise<void> {
    await this.updateProduct(id, { status: 'approved', available: true, price, imageUrl });
  }

  async rejectProduct(id: string): Promise<void> {
    await this.deleteProduct(id);
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

  /** Taille max du fichier source accepté (avant compression). */
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
  /** Largeur/hauteur max après compression. */
  private readonly MAX_DIMENSION = 1024; // px
  /** Qualité JPEG en sortie. */
  private readonly OUTPUT_QUALITY = 0.8;
  /** Types d'image acceptés. */
  private readonly ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  /**
   * Valide, lit puis compresse une image. Retourne une data URL JPEG
   * redimensionnée (max 1024px) — bien en dessous de la limite de 1 Mo
   * par document Firestore. Lève une erreur avec un message lisible en cas
   * de fichier invalide ou trop volumineux.
   */
  async processImage(file: File): Promise<string> {
    if (!this.ACCEPTED_TYPES.includes(file.type)) {
      throw new Error('Format non supporté. Utilisez une image JPG, PNG, WebP ou GIF.');
    }
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('Image trop volumineuse (10 Mo maximum).');
    }
    const dataUrl = await this.readFileAsDataUrl(file);
    return this.compressImage(dataUrl);
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
      reader.readAsDataURL(file);
    });
  }

  private compressImage(dataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, this.MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Compression de l\'image impossible.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', this.OUTPUT_QUALITY));
      };
      img.onerror = () => reject(new Error('Image invalide ou corrompue.'));
      img.src = dataUrl;
    });
  }
}
