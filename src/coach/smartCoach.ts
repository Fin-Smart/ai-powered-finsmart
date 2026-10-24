import { AIError, getGenerativeModel, ThinkingLevel, type Content } from '@react-native-firebase/ai';

import { budgetContextForCoach } from '../budget/coachContext';
import { ai } from '../lib/ai';

export const COACH_MODEL = 'gemini-3.8-flash';
/** For structured one-shot tasks (scam reviews, budget plans) where speed matters more than depth. */
export const FAST_MODEL = 'gemini-3.5-flash-lite';

const SYSTEM_INSTRUCTION = `You are Smart Coach, the friendly personal finance teacher inside the FinSmart app.

Your job is to teach people how money works so they can make their own confident decisions. Most users are beginners.

How to teach:
- Use plain, everyday language. Explain any financial term the first time you use it.
- Keep answers short: 2-4 short paragraphs or a short list, under 150 words, unless the user asks for more detail.
- Use simple worked examples with round numbers. Don't assume a country or currency; if it matters (tax, accounts, interest rates), ask where the user lives.
- When it helps, end with one short question to check understanding or suggest a next step.
- Be encouraging and never judgmental about someone's money situation.

Boundaries:
- You teach general financial concepts; you are not a licensed financial adviser. Don't recommend specific stocks, funds, cryptocurrencies or financial products, and don't promise returns. When a question needs personal advice, explain the concepts involved and suggest speaking to a qualified adviser.
- Only discuss money and personal finance. If asked about something else, kindly steer back to finance.
- Never ask for passwords, PINs, full card numbers or bank account numbers. If a user shares them, tell them not to.

Formatting:
- Plain text only. You may use **bold** for key terms and lines starting with "- " for lists.
- No headings, tables, code blocks or emojis.`;

const coachModel = getGenerativeModel(ai, {
  model: COACH_MODEL,
  systemInstruction: SYSTEM_INSTRUCTION,
  // Beginner money questions don't need deep reasoning; low thinking starts the reply sooner.
  generationConfig: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
});

/** Each chat starts with the user's latest budgets so advice can use their real numbers. */
export function startCoachChat(history: Content[] = []) {
  const budgets = budgetContextForCoach();
  return coachModel.startChat({
    history,
    systemInstruction: budgets ? `${SYSTEM_INSTRUCTION}\n\n${budgets}` : SYSTEM_INSTRUCTION,
  });
}

export const COACH_SUGGESTIONS = [
  'How do I make my first budget?',
  'What is compound interest?',
  'How big should my emergency fund be?',
  "What's the difference between saving and investing?",
] as const;

export function isTimeout(error: unknown) {
  return error instanceof Error && /timeout|timed out|abort/i.test(`${error.name} ${error.message}`);
}

export function getCoachErrorMessage(error: unknown) {
  if (error instanceof AIError) {
    const status = error.customErrorData?.status;

    if (status === 429) {
      return "I've reached my usage limit for the moment. Give me a minute and try again.";
    }
    // AIErrorCode is a const enum, which Babel can't inline across modules, so compare the strings.
    const code: string = error.code;
    if (status === 401 || status === 403 || code === 'api-not-enabled') {
      return "I can't connect right now. Smart Coach isn't fully set up yet.";
    }
    if (code === 'fetch-error') {
      // Request timeouts abort the fetch, which the SDK also reports as a fetch error.
      return isTimeout(error)
        ? "I'm taking too long to answer. Please try again."
        : "I couldn't reach the server. Check your internet connection and try again.";
    }
    if (code === 'response-error') {
      return "I can't help with that one. Try asking about budgeting, saving, debt or investing basics.";
    }
  }

  return 'Something went wrong on my side. Please try again.';
}
