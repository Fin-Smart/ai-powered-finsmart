import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * A small on-device log of what the person does in FinSmart. Smart Coach reads a summary of it
 * to choose lessons and quiz topics. Nothing here leaves the phone except that summary.
 */
export type HabitType =
  | 'budget_created'
  | 'expense_added'
  | 'money_in_added'
  | 'bill_paid'
  | 'income_set'
  | 'scam_check'
  | 'scam_flagged'
  | 'coach_question'
  | 'lesson';

type HabitEvent = { type: HabitType; at: number; detail?: string };
type QuizResult = { at: number; topic: string; question: string; correct: boolean };
type HabitLog = { events: HabitEvent[]; quiz: QuizResult[] };

const STORAGE_KEY = 'coach:habits:v1';
const MAX_EVENTS = 200;
const MAX_QUIZ_RESULTS = 100;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const DETAIL_LENGTH = 80;

let log: HabitLog = { events: [], quiz: [] };
let shieldSnapshot = { flaggedEmails: 0, flaggedTexts: 0 };
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function changed() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribeHabits(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const loaded = AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (!raw) return;
    const stored = JSON.parse(raw) as Partial<HabitLog>;
    // Events recorded before the log finished loading are kept on top of the stored ones.
    log = {
      events: [...(stored.events ?? []), ...log.events].slice(-MAX_EVENTS),
      quiz: [...(stored.quiz ?? []), ...log.quiz].slice(-MAX_QUIZ_RESULTS),
    };
    changed();
  })
  .catch(() => undefined);

function persist() {
  changed();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(log)).catch(() => undefined);
  }, 1000);
}

export function recordHabit(type: HabitType, detail?: string) {
  const trimmed = detail?.replace(/\s+/g, ' ').trim().slice(0, DETAIL_LENGTH);
  log.events = [...log.events, { type, at: Date.now(), detail: trimmed || undefined }].slice(-MAX_EVENTS);
  persist();
}

export function recordQuizAnswer(topic: string, question: string, correct: boolean) {
  log.quiz = [...log.quiz, { at: Date.now(), topic, question, correct }].slice(-MAX_QUIZ_RESULTS);
  persist();
}

/** Live counts from Shield; not stored, since the inbox itself is the source of truth. */
export function setShieldSnapshot(snapshot: { flaggedEmails: number; flaggedTexts: number }) {
  shieldSnapshot = snapshot;
  changed();
}

export type HabitStats = {
  quizAnswered: number;
  quizCorrect: number;
  lessons: number;
  scamChecks: number;
  riskyChecks: number;
  /** Emails and text conversations Shield currently flags. */
  shieldFlagged: number;
};

/** Counts for the last 30 days, for the dashboard. */
export function habitStats(now = Date.now()): HabitStats {
  const recent = log.events.filter((event) => now - event.at < WINDOW_MS);
  const count = (type: HabitType) => recent.filter((event) => event.type === type).length;
  const quiz = log.quiz.filter((result) => now - result.at < WINDOW_MS);
  return {
    quizAnswered: quiz.length,
    quizCorrect: quiz.filter((result) => result.correct).length,
    lessons: count('lesson'),
    scamChecks: count('scam_check'),
    riskyChecks: count('scam_flagged'),
    shieldFlagged: shieldSnapshot.flaggedEmails + shieldSnapshot.flaggedTexts,
  };
}

/** Live habit counts; re-renders whenever something new is recorded. */
export function useHabitStats() {
  useSyncExternalStore(subscribeHabits, () => version);
  return habitStats();
}

/** Questions asked in recent quizzes, so new quizzes don't repeat them. */
export function recentQuizQuestions(limit = 30) {
  return log.quiz.slice(-limit).map((result) => result.question);
}

export async function clearHabits() {
  await loaded;
  log = { events: [], quiz: [] };
  changed();
  if (saveTimer) clearTimeout(saveTimer);
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

function mostCommon(values: string[], limit: number) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

/** A short description of recent habits for Smart Coach, or null when there's nothing yet. */
export function habitsForCoach(now = Date.now()) {
  const recent = log.events.filter((event) => now - event.at < WINDOW_MS);
  const ofType = (type: HabitType) => recent.filter((event) => event.type === type);
  const facts: string[] = [];

  const budgets = ofType('budget_created');
  if (budgets.length) facts.push(`created ${plural(budgets.length, 'budget')}`);

  const expenses = ofType('expense_added');
  if (expenses.length) {
    const top = mostCommon(expenses.flatMap((event) => (event.detail ? [event.detail] : [])), 3);
    facts.push(`logged ${plural(expenses.length, 'expense')}${top.length ? ` (mostly ${top.join(', ')})` : ''}`);
  }

  const moneyIn = ofType('money_in_added');
  if (moneyIn.length) facts.push(`recorded money coming in ${plural(moneyIn.length, 'time')}`);

  const bills = ofType('bill_paid');
  if (bills.length) facts.push(`ticked ${plural(bills.length, 'budget item')} as paid`);

  if (ofType('income_set').length) facts.push('set up their income');

  const checks = ofType('scam_check');
  const flagged = ofType('scam_flagged');
  if (checks.length) {
    facts.push(
      `checked ${plural(checks.length, 'message')} for scams${flagged.length ? `, ${flagged.length} looked risky` : ''}`,
    );
  }

  const lines: string[] = [];
  if (facts.length) lines.push(`In the last 30 days they ${facts.join('; ')}.`);

  const { flaggedEmails, flaggedTexts } = shieldSnapshot;
  if (flaggedEmails || flaggedTexts) {
    lines.push(
      `Shield currently flags ${[
        flaggedEmails ? plural(flaggedEmails, 'email') : null,
        flaggedTexts ? plural(flaggedTexts, 'text conversation') : null,
      ]
        .filter(Boolean)
        .join(' and ')} in their inbox as possible scams.`,
    );
  }

  const questions = ofType('coach_question').slice(-5);
  if (questions.length) {
    lines.push(`Recent questions to you: ${questions.map((event) => `"${event.detail}"`).join(', ')}.`);
  }

  const lessons = ofType('lesson').slice(-5);
  if (lessons.length) {
    lines.push(`Recent lesson topics (avoid repeating): ${lessons.map((event) => event.detail).join(', ')}.`);
  }

  const quiz = log.quiz.filter((result) => now - result.at < WINDOW_MS);
  if (quiz.length) {
    const correct = quiz.filter((result) => result.correct).length;
    const weak = mostCommon(
      quiz.filter((result) => !result.correct).map((result) => result.topic),
      3,
    );
    lines.push(
      `Quiz record: ${correct} of ${quiz.length} correct.${weak.length ? ` Topics they found hard: ${weak.join(', ')}.` : ''}`,
    );
  }

  if (lines.length === 0) return null;
  return ["The user's recent activity in FinSmart. Use it to pick relevant lessons; don't recite it.", ...lines].join(
    '\n',
  );
}
