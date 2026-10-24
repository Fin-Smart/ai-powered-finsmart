import { doc, increment, onSnapshot, setDoc } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuthUser } from '../hooks/useAuthUser';
import { auth, db } from './firebase';

export type Plan = 'free' | 'pro';

/** Smart Coach tokens per day for each plan. Subscriptions will set `plan` on the user's profile. */
export const DAILY_TOKEN_ALLOWANCE: Record<Plan, number> = {
  free: 20_000,
  pro: 500_000,
};

export const PLAN_LABELS: Record<Plan, string> = { free: 'Free', pro: 'Pro' };

/** Local calendar day, e.g. "2026-10-24", so usage resets at the person's own midnight. */
export function dayKey(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const usageRef = (uid: string, day: string) => doc(db, 'users', uid, 'usage', day);

/** Adds a response's token count to today's total. Never throws; usage tracking must not break a reply. */
export function recordAiUsage(response: { usageMetadata?: { totalTokenCount?: number } } | null | undefined) {
  const tokens = response?.usageMetadata?.totalTokenCount ?? 0;
  const uid = auth.currentUser?.uid;
  if (!uid || tokens <= 0) return;
  const day = dayKey();
  setDoc(usageRef(uid, day), { day, tokens: increment(tokens), updatedAt: Date.now() }, { merge: true }).catch(
    () => undefined,
  );
}

export type AiUsage = {
  plan: Plan;
  usedTokens: number;
  allowance: number;
  remaining: number;
  isLoading: boolean;
};

/** Today's Smart Coach token use against the plan's daily allowance, updated live. */
export function useAiUsage(): AiUsage {
  const user = useAuthUser();
  const uid = user?.uid ?? null;
  const [day, setDay] = useState(dayKey);
  const [plan, setPlan] = useState<Plan>('free');
  const [usedTokens, setUsedTokens] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Roll over to the new day when the app comes back after midnight.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDay(dayKey());
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => setPlan(snapshot.data()?.plan === 'pro' ? 'pro' : 'free'),
      () => setPlan('free'),
    );
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setUsedTokens(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    return onSnapshot(
      usageRef(uid, day),
      (snapshot) => {
        setUsedTokens(Number(snapshot.data()?.tokens ?? 0));
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, [uid, day]);

  const allowance = DAILY_TOKEN_ALLOWANCE[plan];
  return { plan, usedTokens, allowance, remaining: Math.max(allowance - usedTokens, 0), isLoading };
}
