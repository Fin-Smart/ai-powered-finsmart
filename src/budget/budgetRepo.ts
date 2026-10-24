import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';

import { db } from '../lib/firebase';
import type { Budget, BudgetDraft, BudgetTransaction, Income, IncomeDraft, TransactionDraft } from './types';

const profileRef = (uid: string) => doc(db, 'users', uid);
const budgetsRef = (uid: string) => collection(db, 'users', uid, 'budgets');

export function subscribeIncome(uid: string, onChange: (income: Income | null) => void, onError: (error: Error) => void) {
  return onSnapshot(
    profileRef(uid),
    (snapshot) => onChange((snapshot.data()?.income as Income | null | undefined) ?? null),
    onError,
  );
}

/** `null` removes the income. */
export function saveIncome(uid: string, income: IncomeDraft | null) {
  return setDoc(profileRef(uid), { income: income ? { ...income, updatedAt: Date.now() } : null }, { merge: true });
}
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

/** IDs are made on the phone so a new budget can be shown before the server confirms it. */
export function newBudgetId(uid: string) {
  return doc(budgetsRef(uid)).id;
}

export function createBudget(uid: string, budgetId: string, draft: BudgetDraft) {
  const now = Date.now();
  return setDoc(doc(budgetsRef(uid), budgetId), { ...draft, createdAt: now, updatedAt: now });
}

/** Friendly text for Firestore failures; `fallback` describes what was being attempted. */
export function budgetErrorMessage(error: unknown, fallback: string) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code.endsWith('permission-denied') || code.endsWith('unauthenticated')) {
    return "FinSmart isn't allowed to access your budgets right now. Sign out and back in, then try again.";
  }
  if (code.endsWith('unavailable') || code.endsWith('deadline-exceeded')) {
    return "You're offline. Your budgets will update when you're back online.";
  }
  if (code.endsWith('not-found')) {
    return 'This budget no longer exists.';
  }
  if (code.endsWith('resource-exhausted')) {
    return 'Too many changes at once. Wait a moment and try again.';
  }
  return fallback;
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

/** Removes every budget, transaction and the profile document, for account deletion. */
export async function deleteUserData(uid: string) {
  const budgets = await getDocs(budgetsRef(uid));
  for (const budget of budgets.docs) {
    await deleteBudget(uid, budget.id);
  }
  await deleteDoc(profileRef(uid));
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
