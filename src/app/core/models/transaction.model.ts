export interface Transaction {
  id?: string;
  userId: string;
  type: 'achat' | 'credit' | 'debit_manuel';
  amount: number; // en centimes
  balanceAfter: number; // en centimes
  description: string;
  productId?: string;
  createdBy: string;
  createdAt: Date;
}
