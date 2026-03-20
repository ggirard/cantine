export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'member';
  balance: number; // en centimes
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
