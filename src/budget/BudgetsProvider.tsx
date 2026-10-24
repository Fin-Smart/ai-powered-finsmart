import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { toast } from '../components/toast/toastStore';
import { useAuthUser } from '../hooks/useAuthUser';
import { subscribeBudgets, subscribeTransactions } from './budgetRepo';
import { setCoachBudgets } from './coachContext';
import { activePeriod } from './period';
import type { Budget, BudgetSummary, BudgetTransaction } from './types';

type BudgetsContextValue = {
  uid: string | null;
  summaries: BudgetSummary[];
  isLoading: boolean;
};

const BudgetsContext = createContext<BudgetsContextValue>({ uid: null, summaries: [], isLoading: true });

function summarize(budget: Budget, transactions: BudgetTransaction[]): BudgetSummary {
  const spentByCategory: Record<string, number> = {};
  let spentCents = 0;
  let receivedCents = 0;

  for (const transaction of transactions) {
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
  };
}

/** Live budgets and their current-period transactions for the signed-in user. */
export function BudgetsProvider({ children }: { children: ReactNode }) {
  const user = useAuthUser();
  const uid = user?.uid ?? null;
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactionsByBudget, setTransactionsByBudget] = useState<Record<string, BudgetTransaction[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setBudgets([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    return subscribeBudgets(
      uid,
      (next) => {
        setBudgets(next);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
        toast.error("Couldn't load your budgets. Check your connection and try again.");
      },
    );
  }, [uid]);

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
        () => toast.error(`Couldn't load spending for ${budget.name}.`),
      );
    });
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- periodKey captures the inputs that matter.
  }, [uid, periodKey]);

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
