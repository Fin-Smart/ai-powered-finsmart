export type BudgetKind = 'monthly' | 'oneoff';

export type BudgetCategory = {
  id: string;
  name: string;
  limitCents: number;
};

export type Budget = {
  id: string;
  name: string;
  /** Free-form type tag, e.g. "Household" or "Holiday". */
  label: string;
  kind: BudgetKind;
  /** One-off budgets only: first and last day (start of day, ms). */
  startDate: number | null;
  endDate: number | null;
  currency: string;
  /** Money available per month (monthly) or in total (one-off). */
  availableCents: number;
  categories: BudgetCategory[];
  createdAt: number;
  updatedAt: number;
};

export type BudgetDraft = Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>;

/** `monthly` is a salary that repeats; `total` is a fixed amount of money the person has. */
export type IncomeKind = 'monthly' | 'total';

export type Income = {
  kind: IncomeKind;
  amountCents: number;
  currency: string;
  updatedAt: number;
};

export type IncomeDraft = Omit<Income, 'updatedAt'>;

export type TransactionDirection = 'out' | 'in';
export type TransactionSource = 'manual' | 'sms' | 'email';

export type BudgetTransaction = {
  id: string;
  amountCents: number;
  direction: TransactionDirection;
  categoryId: string | null;
  note: string;
  date: number;
  source: TransactionSource;
  /** SMS/email id the transaction was detected from, used to avoid duplicates. */
  sourceId: string | null;
  detected: boolean;
  /** Created by ticking a category as paid; removing it unticks the category. */
  marksPaid?: boolean;
  createdAt: number;
};

export type TransactionDraft = Omit<BudgetTransaction, 'id' | 'createdAt'>;

export type BudgetPeriod = { start: number; end: number; label: string };

export type BudgetSummary = {
  budget: Budget;
  period: BudgetPeriod;
  /** Transactions inside the active period, newest first. */
  transactions: BudgetTransaction[];
  spentCents: number;
  receivedCents: number;
  remainingCents: number;
  spentByCategory: Record<string, number>;
  /** Categories ticked as paid in the active period. */
  paidCategoryIds: string[];
};
