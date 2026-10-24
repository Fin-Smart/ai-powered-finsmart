import type { Budget, BudgetPeriod } from './types';

const DAY = 24 * 60 * 60 * 1000;
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const dayFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const shortDayFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

export const startOfDay = (time: number) => new Date(time).setHours(0, 0, 0, 0);

export const formatDay = (time: number) => dayFormat.format(time);

/** The current month for monthly budgets; the budget's own dates (inclusive) for one-off budgets. */
export function activePeriod(budget: Pick<Budget, 'kind' | 'startDate' | 'endDate' | 'createdAt'>, now = Date.now()): BudgetPeriod {
  if (budget.kind === 'monthly') {
    const today = new Date(now);
    const start = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime();
    return { start, end, label: monthFormat.format(start) };
  }

  const start = budget.startDate ?? startOfDay(budget.createdAt);
  const lastDay = budget.endDate ?? start;
  return {
    start,
    end: lastDay + DAY,
    label: `${shortDayFormat.format(start)} – ${dayFormat.format(lastDay)}`,
  };
}
