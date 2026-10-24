import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';

import { db } from '../lib/firebase';
import type { Budget, BudgetDraft, BudgetTransaction, TransactionDraft } from './types';

const budgetsRef = (uid: string) => collection(db, 'users', uid, 'budgets');
const transactionsRef = (uid: string, budgetId: string) =>
  collection(db, 'users', uid, 'budgets', budgetId, 'transactions');

export function subscribeBudgets(uid: string, onChange: (budgets: Budget[]) => void, onError: (error: Error) => void) {
  return onSnapshot(
    query(budgetsRef(uid), orderBy('createdAt', 'asc')),
    (snapshot) => onChange(snapshot.docs.map((item) => ({ ...(item.data() as Omit<Budget, 'id'>), id: item.id }))),
    onError,
  );
}

/** Transactions with `start <= date < end`, newest first. */
export function subscribeTransactions(
  uid: string,
  budgetId: string,
  start: number,
  end: number,
  onChange: (transactions: BudgetTransaction[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(transactionsRef(uid, budgetId), where('date', '>=', start), where('date', '<', end), orderBy('date', 'desc')),
    (snapshot) =>
      onChange(snapshot.docs.map((item) => ({ ...(item.data() as Omit<BudgetTransaction, 'id'>), id: item.id }))),
    onError,
  );
}

export async function createBudget(uid: string, draft: BudgetDraft) {
  const now = Date.now();
  const created = await addDoc(budgetsRef(uid), { ...draft, createdAt: now, updatedAt: now });
  return created.id;
}

export function updateBudget(uid: string, budgetId: string, patch: Partial<BudgetDraft>) {
  return updateDoc(doc(budgetsRef(uid), budgetId), { ...patch, updatedAt: Date.now() });
}

/** Deletes the budget and all of its transactions. */
export async function deleteBudget(uid: string, budgetId: string) {
  const transactions = await getDocs(transactionsRef(uid, budgetId));
  const batch = writeBatch(db);
  transactions.docs.forEach((item) => batch.delete(item.ref));
  batch.delete(doc(budgetsRef(uid), budgetId));
  await batch.commit();
}

export async function addTransaction(uid: string, budgetId: string, draft: TransactionDraft) {
  await addDoc(transactionsRef(uid, budgetId), { ...draft, createdAt: Date.now() });
}

export function updateTransaction(uid: string, budgetId: string, transactionId: string, patch: Partial<TransactionDraft>) {
  return updateDoc(doc(transactionsRef(uid, budgetId), transactionId), patch);
}

export function deleteTransaction(uid: string, budgetId: string, transactionId: string) {
  return deleteDoc(doc(transactionsRef(uid, budgetId), transactionId));
}
