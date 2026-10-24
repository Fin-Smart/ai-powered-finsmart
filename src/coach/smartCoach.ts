import { AIError, AIErrorCode, getGenerativeModel } from 'firebase/ai';

import { ai } from '../lib/ai';

export const COACH_MODEL = 'gemini-3.8-flash';

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
});

export function startCoachChat() {
  return coachModel.startChat();
}

export const COACH_SUGGESTIONS = [
  'How do I make my first budget?',
  'What is compound interest?',
  'How big should my emergency fund be?',
  "What's the difference between saving and investing?",
] as const;

export function getCoachErrorMessage(error: unknown) {
  if (error instanceof AIError) {
    const status = error.customErrorData?.status;

    if (status === 429) {
      return "I've reached my usage limit for the moment. Give me a minute and try again.";
    }
    if (status === 401 || status === 403 || error.code === AIErrorCode.API_NOT_ENABLED) {
      return "I can't connect right now. Smart Coach isn't fully set up yet.";
    }
    if (error.code === AIErrorCode.FETCH_ERROR) {
      return "I couldn't reach the server. Check your internet connection and try again.";
    }
    if (error.code === AIErrorCode.RESPONSE_ERROR) {
      return "I can't help with that one. Try asking about budgeting, saving, debt or investing basics.";
    }
  }

  return 'Something went wrong on my side. Please try again.';
}
