import { AIError, getGenerativeModel, Schema, ThinkingLevel } from '@react-native-firebase/ai';

import { budgetContextForCoach } from '../budget/coachContext';
import { ai } from '../lib/ai';
import { habitsForCoach, recentQuizQuestions } from './habits';
import { FAST_MODEL, getCoachErrorMessage, isTimeout } from './smartCoach';

export const QUIZ_LENGTH = 10;
const QUIZ_TIMEOUT_MS = 45_000;

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
};

const quizModel = getGenerativeModel(ai, {
  model: FAST_MODEL,
  systemInstruction: `You write short multiple-choice quizzes for Smart Coach, the personal finance teacher in the FinSmart app.
Write exactly ${QUIZ_LENGTH} questions for a beginner. Each has 4 short options with exactly one correct answer.
Start with the lesson's topic, then mix in related essentials: budgeting, saving, debt and credit, interest, emergency funds, and spotting financial scams.
Where it fits, base questions on the user's own budgets and activity, using their real numbers and currency.
Keep questions under 25 words and options under 12 words. Explanations are one or two short, encouraging sentences.
Avoid trick questions, "all of the above", and recommending specific products, stocks or crypto.`,
  generationConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
export async function generateQuiz(lesson: string | null): Promise<QuizQuestion[]> {
  const avoid = recentQuizQuestions();
  const prompt = [
    lesson ? `Lesson just taught:\n${lesson}` : 'There was no lesson; choose beginner essentials.',
    budgetContextForCoach(),
    habitsForCoach(),
    avoid.length ? `Don't repeat these recent questions:\n${avoid.map((question) => `- ${question}`).join('\n')}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  const generate = () => quizModel.generateContent(prompt, { timeout: QUIZ_TIMEOUT_MS });

  try {
    let result: Awaited<ReturnType<typeof generate>>;
    try {
      result = await generate();
    } catch (error) {
      if (!(error instanceof AIError) || (error.code as string) !== 'fetch-error' || isTimeout(error)) throw error;
      result = await generate();
    }
    const { questions } = JSON.parse(result.response.text()) as { questions: QuizQuestion[] };
    const usable = questions
      .filter(isValid)
      .slice(0, QUIZ_LENGTH)
      .map((question) => shuffleOptions({ ...question, topic: question.topic?.trim() || 'Money basics' }));
    if (usable.length === 0) throw new Error('empty quiz');
    return usable;
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message === 'empty quiz'
        ? "I couldn't put a quiz together this time. Please try again."
        : getCoachErrorMessage(error),
    );
  }
}
