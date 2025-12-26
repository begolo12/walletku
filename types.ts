
export enum WalletType {
  CASH = 'Cash',
  CREDIT_CARD = 'Credit Card',
  DEBIT_CARD = 'Debit Card',
  E_MONEY = 'E-Money'
}

export enum TransactionType {
  INCOME = 'Income',
  EXPENSE = 'Expense'
}

export interface User {
  username: string;
  password?: string;
  fullName: string;
  joinedDate: string;
  email?: string;
  phone?: string;
  bio?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  balance: number;
  color: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  note: string;
  date: string;
}
