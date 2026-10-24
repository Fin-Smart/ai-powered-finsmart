import { AIError, getGenerativeModel, Schema, ThinkingLevel } from '@react-native-firebase/ai';

import { FAST_MODEL, getCoachErrorMessage, isTimeout } from '../coach/smartCoach';
import { ai } from '../lib/ai';
import { formatMoney } from './money';
import type { BudgetKind } from './types';

export type PlannedCategory = { name: string; limitCents: number; reason: string };
export type BudgetPlan = { categories: PlannedCategory[]; tips: string[] };

type PlanRequest = {
  kind: BudgetKind;
  label: string;
  name: string;
  currency: string;
  availableCents: number;
  goals: string;
  /** Existing categories with what was spent this period, to keep the plan realistic. */
  current: { name: string; limitCents: number; spentCents: number }[];
};

const PLAN_TIMEOUT_MS = 45_000;

const plannerModel = getGenerativeModel(ai, {
  model: FAST_MODEL,
  systemInstruction: `You are Smart Coach in the FinSmart app, helping a beginner plan a budget.
Split the money available into 4-9 practical categories with whole-number amounts in the user's currency.
The amounts must add up to no more than the money available. For monthly budgets include an emergency fund or savings category unless money is very tight.
Respect the user's goals and any existing categories that still make sense. Keep each reason to one short sentence. Give 2-3 short, practical tips.
Never recommend specific financial products, stocks or crypto.`,
  generationConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    responseMimeType: 'application/json',
    responseSchema: Schema.object({
      properties: {
        categories: Schema.array({
          items: Schema.object({
            properties: {
              name: Schema.string({ description: 'Short category name, e.g. Groceries' }),
              amount: Schema.number({ description: 'Whole currency units, not cents' }),
              reason: Schema.string({ description: 'One short sentence' }),
            },
          }),
        }),
        tips: Schema.array({ items: Schema.string() }),
      },
    }),
  },
});

export async function planBudget(request: PlanRequest): Promise<BudgetPlan> {
  const money = (cents: number) => formatMoney(cents, request.currency);
  const prompt = [
    `Budget: "${request.name}" (${request.label}), ${request.kind === 'monthly' ? 'resets every month' : 'one-off'}.`,
    `Money available: ${money(request.availableCents)} (${request.currency}).`,
    request.goals.trim() ? `What matters to the user: ${request.goals.trim()}` : null,
    request.current.length
      ? `Current categories: ${request.current
          .map((item) => `${item.name} (limit ${money(item.limitCents)}, spent ${money(item.spentCents)})`)
          .join('; ')}.`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const generate = () => plannerModel.generateContent(prompt, { timeout: PLAN_TIMEOUT_MS });

  try {
    let result: Awaited<ReturnType<typeof generate>>;
    try {
      result = await generate();
    } catch (error) {
      // One quiet retry for dropped connections; quota and setup errors won't fix themselves.
      if (!(error instanceof AIError) || (error.code as string) !== 'fetch-error' || isTimeout(error)) throw error;
      result = await generate();
    }
    const raw = JSON.parse(result.response.text()) as {
      categories: { name: string; amount: number; reason: string }[];
      tips: string[];
    };
    return {
      categories: raw.categories
        .filter((item) => item.name.trim() && item.amount > 0)
        .map((item) => ({ name: item.name.trim(), limitCents: Math.round(item.amount) * 100, reason: item.reason })),
      tips: raw.tips ?? [],
    };
  } catch (error) {
    throw new Error(getCoachErrorMessage(error));
  }
}
