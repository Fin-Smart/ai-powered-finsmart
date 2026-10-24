import { useSyncExternalStore } from 'react';

import type { TabKey } from '../components/BottomNav';

/** Where a shortcut wants to go, and what to open once it gets there. */
export type QuickIntent =
  | { tab: 'home' }
  | { tab: 'shield'; section?: 'email' | 'sms' }
  | { tab: 'ai'; start?: 'quiz' | 'lesson' }
  | {
      tab: 'profile';
      open?: { type: 'budget'; budgetId: string; screen?: 'expense' } | { type: 'newBudget' } | { type: 'income' };
    };

let pending: QuickIntent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Switches tab and leaves the intent for that tab's screen to pick up. */
export function navigate(intent: QuickIntent) {
  pending = intent;
  notify();
}

export function usePendingIntent() {
  return useSyncExternalStore(subscribe, () => pending);
}

/** Returns and clears the pending intent if it's for `tab`. */
export function takeIntent<T extends TabKey>(tab: T): Extract<QuickIntent, { tab: T }> | null {
  if (pending?.tab !== tab) return null;
  const intent = pending as Extract<QuickIntent, { tab: T }>;
  pending = null;
  notify();
  return intent;
}
