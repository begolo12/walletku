
import React from 'react';
import { WalletType, Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Food & Drinks', color: '#ef4444', icon: '🍔' },
  { id: 'cat-2', name: 'Transport', color: '#3b82f6', icon: '🚗' },
  { id: 'cat-3', name: 'Shopping', color: '#a855f7', icon: '🛍️' },
  { id: 'cat-4', name: 'Entertainment', color: '#f59e0b', icon: '🎬' },
  { id: 'cat-5', name: 'Rent & Bills', color: '#10b981', icon: '🏠' },
  { id: 'cat-6', name: 'Salary', color: '#22c55e', icon: '💰' },
  { id: 'cat-7', name: 'Health', color: '#ec4899', icon: '🏥' },
  { id: 'cat-8', name: 'Others', color: '#64748b', icon: '📦' },
];

export const WALLET_TYPES = [
  { type: WalletType.CASH, color: 'bg-emerald-500' },
  { type: WalletType.CREDIT_CARD, color: 'bg-rose-500' },
  { type: WalletType.DEBIT_CARD, color: 'bg-blue-500' },
  { type: WalletType.E_MONEY, color: 'bg-purple-500' },
];
