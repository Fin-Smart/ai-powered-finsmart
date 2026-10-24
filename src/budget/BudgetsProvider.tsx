import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { toast } from '../components/toast/toastStore';
import { useAuthUser } from '../hooks/useAuthUser';
import { budgetErrorMessage, subscribeBudgets, subscribeTransactions } from './budgetRepo';
import { setCoachBudgets } from './coachContext';
import { activePeriod } from './period';
import type { Budget, BudgetSummary, BudgetTransaction } from './types';

type BudgetsContextValue = {
  uid: string | null;
  summaries: BudgetSummary[];
  isLoading: boolean;
};

const BudgetsContext = createContext<BudgetsContextValue>({ uid: null, summaries: [], isLoading: true });

const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000];

function summarize(budget: Budget, transactions: BudgetTransaction[]): BudgetSummary {
  const spentByCategory: Record<string, number> = {};
  const paid = new Set<string>();
  let spentCents = 0;
  let receivedCents = 0;

  for (const transaction of transactions) {
    if (transaction.marksPaid && transaction.categoryId) paid.add(transaction.categoryId);
    if (transaction.direction === 'in') {
      receivedCents += transaction.amountCents;
      continue;
    }
    spentCents += transaction.amountCents;
    const key = transaction.categoryId ?? 'uncategorised';
    spentByCategory[key] = (spentByCategory[key] ?? 0) + transaction.amountCents;
  }

  return {
    budget,
    period: activePeriod(budget),
    transactions,
    spentCents,
    receivedCents,
    remainingCents: budget.availableCents + receivedCents - spentCents,
    spentByCategory,
    paidCategoryIds: budget.categories.filter((category) => paid.has(category.id)).map((category) => category.id),
  };
}

/**
 * Live budgets and their current-period transactions for the signed-in user. A Firestore listener
 * stops for good after an error, so failed listeners are recreated with backoff and on app resume.
 */
export function BudgetsProvider({ children }: { children: ReactNode }) {
  const user = useAuthUser();
  const uid = user?.uid ?? null;
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactionsByBudget, setTransactionsByBudget] = useState<Record<string, BudgetTransaction[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [generation, setGeneration] = useState(0);
  const failures = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reconnect = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = null;
    setGeneration((value) => value + 1);
  }, []);

  const handleError = useCallback(
    (error: unknown, fallback: string) => {
      setIsLoading(false);
      if (failures.current === 0) {
        toast.error(budgetErrorMessage(error, fallback), { action: { label: 'Retry', onPress: reconnect } });
      }
      if (!retryTimer.current) {
        const delay = RETRY_DELAYS_MS[Math.min(failures.current, RETRY_DELAYS_MS.length - 1)];
        retryTimer.current = setTimeout(reconnect, delay);
      }
      failures.current += 1;
    },
    [reconnect],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && failures.current > 0) reconnect();
    });
    return () => {
      subscription.remove();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [reconnect]);

  useEffect(() => {
    if (!uid) {
      setBudgets([]);
      setTransactionsByBudget({});
      setIsLoading(false);
      failures.current = 0;
      return;
    }
    return subscribeBudgets(
      uid,
      (next) => {
        failures.current = 0;
        setBudgets(next);
        setIsLoading(false);
      },
      (error) => handleError(error, "Couldn't load your budgets. Please try again."),
    );
  }, [uid, generation, handleError]);

  // One listener per budget, scoped to its active period. Re-subscribes when dates change.
  const periodKey = budgets
    .map((budget) => {
      const period = activePeriod(budget);
      return `${budget.id}:${period.start}:${period.end}`;
    })
    .join('|');

  useEffect(() => {
    if (!uid) return;
    const unsubscribers = budgets.map((budget) => {
      const period = activePeriod(budget);
      return subscribeTransactions(
        uid,
        budget.id,
        period.start,
        period.end,
        (transactions) => setTransactionsByBudget((current) => ({ ...current, [budget.id]: transactions })),
        (error) => handleError(error, `Couldn't load spending for ${budget.name}.`),
      );
    });
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- periodKey captures the inputs that matter.
  }, [uid, periodKey, generation, handleError]);

  const summaries = useMemo(
    () => budgets.map((budget) => summarize(budget, transactionsByBudget[budget.id] ?? [])),
    [budgets, transactionsByBudget],
  );

  useEffect(() => {
    setCoachBudgets(summaries);
  }, [summaries]);

  const value = useMemo(() => ({ uid, summaries, isLoading }), [uid, summaries, isLoading]);
  return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>;
}

export function useBudgets() {
  return useContext(BudgetsContext);
}
