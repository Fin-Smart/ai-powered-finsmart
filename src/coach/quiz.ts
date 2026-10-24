import { AIError, getGenerativeModel, Schema, ThinkingLevel } from '@react-native-firebase/ai';

import { budgetContextForCoach } from '../budget/coachContext';
import { ai } from '../lib/ai';
import { assertTokensAvailable, OutOfTokensError, recordAiUsage } from '../lib/aiUsage';
import { habitsForCoach, recentQuizQuestions } from './habits';
import { COACH_MODEL, getCoachErrorMessage, isTimeout } from './smartCoach';

export const QUIZ_LENGTH = 10;
/** The quiz is written as two parallel halves, so the first question is ready in about half the time. */
const HALF = QUIZ_LENGTH / 2;
const QUIZ_TIMEOUT_MS = 45_000;

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
};

const quizModel = getGenerativeModel(ai, {
  model: COACH_MODEL,
  systemInstruction: `You write short multiple-choice quizzes for Smart Coach, the personal finance teacher in the FinSmart app.
Write exactly the number of beginner questions requested, on the focus requested. Each has 4 short options with exactly one correct answer.
Where it fits, base questions on the user's own budgets and activity, using their real numbers and currency.
Keep questions under 25 words and options under 12 words. Explanations are one or two short, encouraging sentences.
Avoid trick questions, "all of the above", and recommending specific products, stocks or crypto.`,
  generationConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    responseMimeType: 'application/json',
    responseSchema: Schema.object({
      properties: {
        questions: Schema.array({
          items: Schema.object({
            properties: {
              question: Schema.string(),
              options: Schema.array({ items: Schema.string() }),
              correctIndex: Schema.integer({ description: 'Index of the correct option, starting at 0' }),
              explanation: Schema.string(),
              topic: Schema.string({ description: 'Two or three words, e.g. "Emergency fund"' }),
            },
          }),
        }),
      },
    }),
  },
});

function shuffleOptions(question: QuizQuestion): QuizQuestion {
  const order = question.options.map((_, index) => index).sort(() => Math.random() - 0.5);
  return {
    ...question,
    options: order.map((index) => question.options[index]),
    correctIndex: order.indexOf(question.correctIndex),
  };
}

const isValid = (question: QuizQuestion) =>
  Boolean(question.question?.trim()) &&
  Array.isArray(question.options) &&
  question.options.length >= 2 &&
  question.options.length <= 5 &&
  Number.isInteger(question.correctIndex) &&
  question.correctIndex >= 0 &&
  question.correctIndex < question.options.length;

/** Ten questions built around the lesson that was just taught and the person's own habits. */
/** Only dropped connections and server hiccups are worth one immediate retry. */
function isRetryable(error: unknown) {
  if (!(error instanceof AIError) || isTimeout(error)) return false;
  const status = error.customErrorData?.status;
  return (error.code as string) === 'error' || (status !== undefined && status >= 500);
}

async function generateBatch(focus: string, count: number): Promise<QuizQuestion[]> {
  const avoid = recentQuizQuestions();
  const prompt = [
    `Write ${count} questions. Focus: ${focus}`,
    budgetContextForCoach(),
    habitsForCoach(),
    avoid.length ? `Don't repeat these recent questions:\n${avoid.map((question) => `- ${question}`).join('\n')}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  const generate = () => quizModel.generateContent(prompt, { timeout: QUIZ_TIMEOUT_MS });

  try {
    assertTokensAvailable();
    let result: Awaited<ReturnType<typeof generate>>;
    try {
      result = await generate();
    } catch (error) {
      if (!isRetryable(error)) throw error;
      result = await generate();
    }
    recordAiUsage(result.response);
    const { questions } = JSON.parse(result.response.text()) as { questions: QuizQuestion[] };
    const usable = questions
      .filter(isValid)
      .slice(0, count)
      .map((question) => shuffleOptions({ ...question, topic: question.topic?.trim() || 'Money basics' }));
    if (usable.length === 0) throw new Error('empty quiz');
    return usable;
  } catch (error) {
    if (error instanceof OutOfTokensError) throw error;
    throw new Error(
      error instanceof Error && error.message === 'empty quiz'
        ? "I couldn't put a quiz together this time. Please try again."
        : getCoachErrorMessage(error),
    );
  }
}

export type QuizRequest = {
  /** Questions on the lesson's topic; the quiz can start as soon as these arrive. */
  first: Promise<QuizQuestion[]>;
  /** Related essentials and the person's own money, written at the same time. */
  rest: Promise<QuizQuestion[]>;
};

/**
 * Starts writing a ten-question quiz as two parallel halves. `topic` is the lesson topic, or null
 * for a general quiz. Both promises are pre-handled so an abandoned quiz never reports an error.
 */
export function generateQuiz(topic: string | null): QuizRequest {
  const first = generateBatch(
    topic ? `the lesson topic "${topic}", beginner level` : 'budgeting and saving basics',
    HALF,
  );
  const rest = generateBatch(
    `related money essentials${topic ? ` other than "${topic}"` : ''}: debt and credit, interest, emergency funds, spotting financial scams, and the user's own budgets`,
    QUIZ_LENGTH - HALF,
  );
  first.catch(() => undefined);
  rest.catch(() => undefined);
  return { first, rest };
}
