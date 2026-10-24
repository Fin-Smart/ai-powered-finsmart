import { AIError, getGenerativeModel, Schema, ThinkingLevel } from '@react-native-firebase/ai';

import { COACH_MODEL, getCoachErrorMessage, isTimeout } from '../coach/smartCoach';
import { ai } from '../lib/ai';
import { assertTokensAvailable, recordAiUsage } from '../lib/aiUsage';
import { formatMoney } from './money';
import type { BudgetKind } from './types';

export type PlannedCategory = { name: string; limitCents: number; reason: string };
export type BudgetPlan = { categories: PlannedCategory[]; tips: string[] };
/** A plan category with its tick state; unticked ones stay in the list but aren't applied. */
export type DraftCategory = PlannedCategory & { included: boolean };
export type AdjustedPlan = { categories: DraftCategory[]; tips: string[]; summary: string };

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

type AdjustRequest = PlanRequest & {
  /** The plan as it is on screen now, including the user's own edits. */
  draft: DraftCategory[];
  instruction: string;
};

const PLAN_TIMEOUT_MS = 45_000;
const RULES = 'Never recommend specific financial products, stocks or crypto.';

const plannerModel = getGenerativeModel(ai, {
  model: COACH_MODEL,
  systemInstruction: `You are Smart Coach in the FinSmart app, helping a beginner plan a budget.
Split the money available into 4-9 practical categories with whole-number amounts in the user's currency.
The amounts must add up to no more than the money available. For monthly budgets include an emergency fund or savings category unless money is very tight.
Respect the user's goals and any existing categories that still make sense. Keep each reason to one short sentence. Give 2-3 short, practical tips.
${RULES}`,
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

const adjusterModel = getGenerativeModel(ai, {
  model: COACH_MODEL,
  systemInstruction: `You are Smart Coach in the FinSmart app, editing a beginner's draft budget plan.
You get the current plan and a change the user asked for. Return the complete updated plan.
- "included" true means the category is ticked and will be used; false means it is unticked: kept in the list but not used.
- Tick or untick only when the user asks (e.g. "untick", "skip", "don't use", "turn off", "bring back").
- To remove a category, leave it out. To add one, include it with included true and a one-sentence reason.
- Keep every category the user did not ask about exactly as it was: same name, amount, included value and reason.
- When asked to rebalance or make it fit, the ticked amounts must add up to no more than the money available.
- Amounts are in currency units, not cents.
- Return 2-3 short, practical tips that suit the updated plan.
- summary: one short sentence saying what you changed, e.g. "Removed Fun and added Gym for R400."
- If the request is not about this budget, change nothing and say so in the summary.
${RULES}`,
  generationConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    responseMimeType: 'application/json',
    responseSchema: Schema.object({
      properties: {
        categories: Schema.array({
          items: Schema.object({
            properties: {
              name: Schema.string({ description: 'Short category name, e.g. Groceries' }),
              amount: Schema.number({ description: 'Currency units, not cents' }),
              reason: Schema.string({ description: 'One short sentence' }),
              included: Schema.boolean({ description: 'true = ticked and used, false = unticked' }),
            },
          }),
        }),
        tips: Schema.array({ items: Schema.string() }),
        summary: Schema.string({ description: 'One short sentence describing the change' }),
      },
    }),
  },
});

type RawCategory = { name: string; amount: number; reason: string; included?: boolean };

function describeBudget(request: PlanRequest) {
  const money = (cents: number) => formatMoney(cents, request.currency);
  return [
    `Budget: "${request.name}" (${request.label}), ${request.kind === 'monthly' ? 'resets every month' : 'one-off'}.`,
    `Money available: ${money(request.availableCents)} (${request.currency}).`,
    request.goals.trim() ? `What matters to the user: ${request.goals.trim()}` : null,
    request.current.length
      ? `Current categories: ${request.current
          .map((item) => `${item.name} (limit ${money(item.limitCents)}, spent ${money(item.spentCents)})`)
          .join('; ')}.`
      : null,
  ];
}

async function generate<T>(model: typeof plannerModel, prompt: string): Promise<T> {
  const run = () => model.generateContent(prompt, { timeout: PLAN_TIMEOUT_MS });
  try {
    assertTokensAvailable();
    let result: Awaited<ReturnType<typeof run>>;
    try {
      result = await run();
    } catch (error) {
      // One quiet retry for dropped connections; quota and setup errors won't fix themselves.
      if (!(error instanceof AIError) || (error.code as string) !== 'fetch-error' || isTimeout(error)) throw error;
      result = await run();
    }
    recordAiUsage(result.response);
    return JSON.parse(result.response.text()) as T;
  } catch (error) {
    throw new Error(getCoachErrorMessage(error));
  }
}

const toCents = (amount: number) => Math.round(amount * 100);

export async function planBudget(request: PlanRequest): Promise<BudgetPlan> {
  const raw = await generate<{ categories: RawCategory[]; tips: string[] }>(
    plannerModel,
    describeBudget(request).filter(Boolean).join('\n'),
  );
  return {
    categories: raw.categories
      .filter((item) => item.name.trim() && item.amount > 0)
      .map((item) => ({ name: item.name.trim(), limitCents: toCents(Math.round(item.amount)), reason: item.reason })),
    tips: raw.tips ?? [],
  };
}

/** Lets Smart Coach tick, untick, add, remove or re-price categories in the draft plan. */
export async function adjustPlan(request: AdjustRequest): Promise<AdjustedPlan> {
  const money = (cents: number) => formatMoney(cents, request.currency);
  const prompt = [
    ...describeBudget(request),
    'Current plan:',
    ...request.draft.map(
      (item) =>
        `- ${item.included ? '[ticked]' : '[unticked]'} ${item.name}: ${money(item.limitCents)}${item.reason ? ` (${item.reason})` : ''}`,
    ),
    `Change requested: ${request.instruction.trim()}`,
  ]
    .filter(Boolean)
    .join('\n');

  const raw = await generate<{ categories: RawCategory[]; tips: string[]; summary: string }>(adjusterModel, prompt);
  return {
    categories: raw.categories
      .filter((item) => item.name.trim() && item.amount >= 0)
      .map((item) => ({
        name: item.name.trim(),
        limitCents: toCents(item.amount),
        reason: item.reason ?? '',
        included: item.included !== false,
      })),
    tips: raw.tips ?? [],
    summary: raw.summary ?? '',
  };
}
