import { onSignOut } from '../lib/session';
import { allocateIncome } from './income';
import { formatMoney } from './money';
import type { BudgetSummary, Income } from './types';

/** Latest budgets and income, kept outside React so Smart Coach can read them when a chat starts. */
let latest: BudgetSummary[] = [];
let latestIncome: Income | null = null;

onSignOut(() => {
  latest = [];
  latestIncome = null;
});

export function setCoachBudgets(summaries: BudgetSummary[], income: Income | null) {
  latest = summaries;
  latestIncome = income;
}

function describe({ budget, period, spentCents, receivedCents, remainingCents, spentByCategory, paidCategoryIds }: BudgetSummary) {
  const money = (cents: number) => formatMoney(cents, budget.currency);
  const categories = budget.categories
    .map(
      (category) =>
        `${category.name} ${money(spentByCategory[category.id] ?? 0)} of ${money(category.limitCents)}${
          paidCategoryIds.includes(category.id) ? ' (paid)' : ''
        }`,
    )
    .join('; ');

  return [
    `- "${budget.name}" (${budget.label}, ${budget.kind === 'monthly' ? 'monthly' : 'one-off'}, ${period.label}):`,
    `available ${money(budget.availableCents)}, spent ${money(spentCents)}, received ${money(receivedCents)}, left ${money(remainingCents)}.`,
    categories ? `Categories: ${categories}.` : 'No categories yet.',
  ].join(' ');
}

function describeIncome(income: Income) {
  const money = (cents: number) => formatMoney(cents, income.currency);
  const { allocatedCents, freeCents } = allocateIncome(
    income,
    latest.map((summary) => summary.budget),
  );
  return [
    income.kind === 'monthly' ? `Income: ${money(income.amountCents)} per month.` : `Money they have: ${money(income.amountCents)}.`,
    `${money(allocatedCents)} is assigned to budgets,`,
    freeCents >= 0 ? `${money(freeCents)} is not budgeted yet.` : `budgets exceed it by ${money(-freeCents)}.`,
  ].join(' ');
}

/** Budget facts for the system instruction, or null when the user has no budgets or income. */
export function budgetContextForCoach() {
  if (latest.length === 0 && !latestIncome) return null;
  return [
    "The user's FinSmart money and budgets right now. Use them to personalise examples and advice when relevant,",
    "but don't recite them unless asked. Never invent figures that aren't listed.",
    latestIncome ? describeIncome(latestIncome) : null,
    ...latest.map(describe),
  ]
    .filter(Boolean)
    .join('\n');
}
