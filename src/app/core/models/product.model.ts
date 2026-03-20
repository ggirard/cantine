export interface Product {
  id?: string;
  name: string;
  price: number; // en centimes
  imageUrl: string;
  available: boolean;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}
