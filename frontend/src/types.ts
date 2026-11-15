export interface User {
  id: string;
  name: string;
  email: string;
}
export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  transactionCount: number;
}
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category: Category;
}
export interface TransactionPage {
  items: Transaction[];
  total: number;
}
export interface Summary {
  balance: number;
  income: number;
  expense: number;
}
export interface Filter {
  search?: string;
  type?: string;
  categoryId?: string;
  month?: string;
}
export interface AuthPayload {
  token: string;
  user: User;
}
