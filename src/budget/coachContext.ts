import { formatMoney } from './money';
import type { BudgetSummary } from './types';

/** Latest budgets, kept outside React so Smart Coach can read them when a chat starts. */
let latest: BudgetSummary[] = [];

export function setCoachBudgets(summaries: BudgetSummary[]) {
  latest = summaries;
}

function describe({ budget, period, spentCents, receivedCents, remainingCents, spentByCategory }: BudgetSummary) {
  const money = (cents: number) => formatMoney(cents, budget.currency);
  const categories = budget.categories
    .map((category) => `${category.name} ${money(spentByCategory[category.id] ?? 0)} of ${money(category.limitCents)}`)
    .join('; ');

  return [
    `- "${budget.name}" (${budget.label}, ${budget.kind === 'monthly' ? 'monthly' : 'one-off'}, ${period.label}):`,
    `available ${money(budget.availableCents)}, spent ${money(spentCents)}, received ${money(receivedCents)}, left ${money(remainingCents)}.`,
    categories ? `Categories: ${categories}.` : 'No categories yet.',
  ].join(' ');
}

/** Budget facts for the system instruction, or null when the user has no budgets. */
export function budgetContextForCoach() {
  if (latest.length === 0) return null;
  return [
    "The user's FinSmart budgets right now. Use them to personalise examples and advice when relevant,",
    "but don't recite them unless asked. Never invent figures that aren't listed.",
    ...latest.map(describe),
  ].join('\n');
}
