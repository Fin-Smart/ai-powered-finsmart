import { onAuthStateChanged } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  writeBatch,
} from '@react-native-firebase/firestore';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { auth, db } from './firebase';

/** Free Smart Coach tokens everyone gets each day; purchased tokens are only used after these. */
export const FREE_DAILY_TOKENS = 100;
/** R10 per 1,000 tokens. */
export const CENTS_PER_THOUSAND_TOKENS = 1000;
export const TOKEN_CURRENCY = 'ZAR';

export type TokenPack = { tokens: number; priceCents: number };

export const TOKEN_PACKS: TokenPack[] = [10_000, 20_000, 50_000, 100_000].map((tokens) => ({
  tokens,
  priceCents: (tokens / 1000) * CENTS_PER_THOUSAND_TOKENS,
}));

export type Purchase = {
  id: string;
  tokens: number;
  priceCents: number;
  currency: string;
  createdAt: number;
};

export class OutOfTokensError extends Error {
  constructor() {
    super("You're out of Smart Coach tokens. Buy more, or come back tomorrow for your free tokens.");
  }
}

/** Local calendar day, e.g. "2026-10-24", so free tokens reset at the person's own midnight. */
export function dayKey(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const profileRef = (uid: string) => doc(db, 'users', uid);
const usageRef = (uid: string, day: string) => doc(db, 'users', uid, 'usage', day);
const purchasesRef = (uid: string) => collection(db, 'users', uid, 'purchases');

export type TokenState = {
  uid: string | null;
  day: string;
  /** Everything used today, free and paid. */
  usedToday: number;
  freeLeft: number;
  /** Purchased tokens still available. */
  balance: number;
  purchasedTotal: number;
  /** Free tokens left today plus the purchased balance. */
  available: number;
  isLoading: boolean;
};

type Raw = {
  uid: string | null;
  day: string;
  usedToday: number;
  freeUsedToday: number;
  balance: number;
  purchasedTotal: number;
  profileLoaded: boolean;
  usageLoaded: boolean;
};

let raw: Raw = {
  uid: null,
  day: dayKey(),
  usedToday: 0,
  freeUsedToday: 0,
  balance: 0,
  purchasedTotal: 0,
  profileLoaded: true,
  usageLoaded: true,
};
let snapshot = derive(raw);
const listeners = new Set<() => void>();
let unsubscribers: (() => void)[] = [];

function derive(value: Raw): TokenState {
  const freeLeft = Math.max(FREE_DAILY_TOKENS - value.freeUsedToday, 0);
  const balance = Math.max(value.balance, 0);
  return {
    uid: value.uid,
    day: value.day,
    usedToday: value.usedToday,
    freeLeft,
    balance,
    purchasedTotal: value.purchasedTotal,
    available: freeLeft + balance,
    isLoading: !(value.profileLoaded && value.usageLoaded),
  };
}

function update(patch: Partial<Raw>) {
  raw = { ...raw, ...patch };
  snapshot = derive(raw);
  listeners.forEach((listener) => listener());
}

/** Follows the signed-in user's balance and today's usage. Called on sign-in changes and at midnight. */
function watch(uid: string | null) {
  unsubscribers.forEach((unsubscribe) => unsubscribe());
  unsubscribers = [];
  const day = dayKey();
  update({
    uid,
    day,
    usedToday: 0,
    freeUsedToday: 0,
    balance: 0,
    purchasedTotal: 0,
    profileLoaded: !uid,
    usageLoaded: !uid,
  });
  if (!uid) return;

  unsubscribers.push(
    onSnapshot(
      profileRef(uid),
      (doc) => {
        const tokens = doc.data()?.tokens;
        update({
          balance: Number(tokens?.balance ?? 0),
          purchasedTotal: Number(tokens?.purchasedTotal ?? 0),
          profileLoaded: true,
        });
      },
      () => update({ profileLoaded: true }),
    ),
    onSnapshot(
      usageRef(uid, day),
      (doc) => {
        const data = doc.data();
        update({
          usedToday: Number(data?.tokens ?? 0),
          freeUsedToday: Number(data?.freeUsed ?? 0),
          usageLoaded: true,
        });
      },
      () => update({ usageLoaded: true }),
    ),
  );
}

onAuthStateChanged(auth, (user) => watch(user?.uid ?? null));
AppState.addEventListener('change', (state) => {
  if (state === 'active' && raw.day !== dayKey()) watch(raw.uid);
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Live token balance and today's free allowance. */
export function useTokens(): TokenState {
  return useSyncExternalStore(subscribe, () => snapshot);
}

/** Call before any Smart Coach request. Lets requests through while the balance is still loading. */
export function assertTokensAvailable() {
  if (snapshot.uid && !snapshot.isLoading && snapshot.available <= 0) {
    throw new OutOfTokensError();
  }
}

/**
 * Charges a response's tokens: today's free tokens first, then the purchased balance, which never
 * goes below zero. Never throws; usage tracking must not break a reply.
 */
export function recordAiUsage(response: { usageMetadata?: { totalTokenCount?: number } } | null | undefined) {
  const used = response?.usageMetadata?.totalTokenCount ?? 0;
  const uid = auth.currentUser?.uid;
  if (!uid || used <= 0) return;
  const day = dayKey();

  runTransaction(db, async (transaction) => {
    const usageDoc = await transaction.get(usageRef(uid, day));
    const profileDoc = await transaction.get(profileRef(uid));
    const usage = usageDoc.data() ?? {};
    const freeUsed = Number(usage.freeUsed ?? 0);
    const fromFree = Math.min(Math.max(FREE_DAILY_TOKENS - freeUsed, 0), used);
    const balance = Number(profileDoc.data()?.tokens?.balance ?? 0);
    const charged = Math.min(used - fromFree, Math.max(balance, 0));

    transaction.set(
      usageRef(uid, day),
      {
        day,
        tokens: Number(usage.tokens ?? 0) + used,
        freeUsed: freeUsed + fromFree,
        paidUsed: Number(usage.paidUsed ?? 0) + charged,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    if (charged > 0) {
      transaction.set(profileRef(uid), { tokens: { balance: balance - charged } }, { merge: true });
    }
  }).catch(() => undefined);
}

/**
 * Test purchase: no payment is taken, but the purchase is recorded and the balance goes up,
 * exactly as a real store purchase will once payments are added.
 */
export async function purchaseTokens(pack: TokenPack) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to buy tokens.');
  const batch = writeBatch(db);
  batch.set(doc(purchasesRef(uid)), {
    tokens: pack.tokens,
    priceCents: pack.priceCents,
    currency: TOKEN_CURRENCY,
    status: 'completed',
    method: 'test',
    createdAt: Date.now(),
  });
  batch.set(
    profileRef(uid),
    { tokens: { balance: increment(pack.tokens), purchasedTotal: increment(pack.tokens) } },
    { merge: true },
  );
  await batch.commit();
}

export function subscribePurchases(uid: string, onChange: (purchases: Purchase[]) => void, onError: () => void) {
  return onSnapshot(
    query(purchasesRef(uid), orderBy('createdAt', 'desc'), limit(10)),
    (result) =>
      onChange(
        result.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            tokens: Number(data.tokens ?? 0),
            priceCents: Number(data.priceCents ?? 0),
            currency: String(data.currency ?? TOKEN_CURRENCY),
            createdAt: Number(data.createdAt ?? 0),
          };
        }),
      ),
    onError,
  );
}
