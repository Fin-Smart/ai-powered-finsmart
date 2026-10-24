import { AIError, getGenerativeModel, ThinkingLevel, type Content } from '@react-native-firebase/ai';

import { budgetContextForCoach } from '../budget/coachContext';
import { ai } from '../lib/ai';
import { OutOfTokensError } from '../lib/aiUsage';
import { habitsForCoach } from './habits';

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
  // Beginner money questions don't need deep reasoning; low is the lightest level 3.8 Flash accepts.
  generationConfig: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
});

/** Each chat starts with the user's latest budgets and habits so advice can use their real situation. */
export function startCoachChat(history: Content[] = []) {
  const text = [SYSTEM_INSTRUCTION, budgetContextForCoach(), habitsForCoach()].filter(Boolean).join('\n\n');
  return coachModel.startChat({
    history,
    // Chat-level instructions are sent exactly as given (only model-level strings get wrapped),
    // and the API rejects a bare string, so it must already be a Content object.
    systemInstruction: { role: 'system', parts: [{ type: 'text', text }] },
  });
}

/**
 * Sent on the user's behalf (and hidden from the chat) to open a session. The reply's first line
 * names the topic so it can be logged and handed to the quiz.
 */
export const LESSON_PROMPT = `Start today's session with a short lesson for me.
Pick ONE topic that fits my recent FinSmart activity and budgets from your instructions. If there's little activity, pick a beginner essential I haven't covered recently.
Format: first line is only "Topic: <two to four words>". Then greet me in one short sentence and teach the topic in under 120 words, with one example that uses my own numbers when you have them.
Finish by saying a 10-question quiz on it is next.`;

const TOPIC_LINE = /^\s*\**topic:?\**\s*(.+)\n+/i;

/**
 * Splits the "Topic: …" line off a lesson reply. While the reply is still streaming and the line
 * isn't complete yet, `text` is empty so the label never flashes on screen.
 */
export function parseLesson(reply: string) {
  const match = reply.match(TOPIC_LINE);
  if (match) return { topic: match[1].replace(/\*+/g, '').trim(), text: reply.slice(match[0].length).trim() };
  const head = reply.trimStart().replace(/^\*+/, '').toLowerCase();
  if (!reply.includes('\n') && (head.startsWith('topic') || 'topic'.startsWith(head))) return { topic: null, text: '' };
  return { topic: null, text: reply };
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
  if (error instanceof OutOfTokensError) return error.message;
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
      // The SDK reports both timeouts and error responses from the server as fetch errors.
      if (isTimeout(error)) return "I'm taking too long to answer. Please try again.";
      if (status !== undefined && status >= 500) return "I'm very busy right now. Please try again in a moment.";
      if (status === 400 || status === 404) return "I couldn't process that. Please try again or start a new chat.";
      return "I couldn't reach the server. Check your internet connection and try again.";
    }
    if (code === 'response-error') {
      return "I can't help with that one. Try asking about budgeting, saving, debt or investing basics.";
    }
    if (code === 'error') {
      return "I couldn't reach the server. Check your internet connection and try again.";
    }
  }

  return 'Something went wrong on my side. Please try again.';
}
