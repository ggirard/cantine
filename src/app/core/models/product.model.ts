export interface Product {
  id?: string;
  name: string;
  price: number; // en centimes
  imageUrl: string;
  available: boolean;
  category: string;
  status?: 'pending' | 'approved';
  submittedBy?: string;
  submittedByName?: string;
  submissionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}
