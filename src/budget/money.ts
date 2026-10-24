import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const CURRENCY_BY_REGION: Record<string, string> = {
  ZA: 'ZAR',
  US: 'USD',
  GB: 'GBP',
  NG: 'NGN',
  KE: 'KES',
  GH: 'GHS',
  BW: 'BWP',
  NA: 'NAD',
  ZW: 'USD',
  AU: 'AUD',
  CA: 'CAD',
  IN: 'INR',
  DE: 'EUR',
  FR: 'EUR',
  NL: 'EUR',
  IE: 'EUR',
};

export const CURRENCY_OPTIONS = [
  { code: 'ZAR', name: 'South African rand' },
  { code: 'USD', name: 'US dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British pound' },
  { code: 'NGN', name: 'Nigerian naira' },
  { code: 'KES', name: 'Kenyan shilling' },
  { code: 'BWP', name: 'Botswana pula' },
] as const;

const CURRENCY_KEY = 'settings:currency';
let preferredCurrency: string | null = null;
const currencyListeners = new Set<() => void>();

AsyncStorage.getItem(CURRENCY_KEY)
  .then((stored) => {
    if (stored) {
      preferredCurrency = stored;
      currencyListeners.forEach((listener) => listener());
    }
  })
  .catch(() => undefined);

function regionCurrency() {
  const locale = Intl.NumberFormat().resolvedOptions().locale;
  const region = locale.match(/[-_]([A-Z]{2})\b/)?.[1];
  return (region && CURRENCY_BY_REGION[region]) || 'ZAR';
}

/** The currency picked in Profile settings, else the phone region's, defaulting to rand. */
export function defaultCurrency() {
  return preferredCurrency ?? regionCurrency();
}

export async function setPreferredCurrency(code: string) {
  preferredCurrency = code;
  currencyListeners.forEach((listener) => listener());
  await AsyncStorage.setItem(CURRENCY_KEY, code);
}

function subscribeCurrency(listener: () => void) {
  currencyListeners.add(listener);
  return () => {
    currencyListeners.delete(listener);
  };
}

export function usePreferredCurrency() {
  return useSyncExternalStore(subscribeCurrency, defaultCurrency);
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, fractionDigits: number) {
  const key = `${currency}:${fractionDigits}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, cached);
  }
  return cached;
}

/** Whole amounts without cents ("R1 200"), otherwise two decimals. */
export function formatMoney(cents: number, currency: string) {
  return formatter(currency, cents % 100 === 0 ? 0 : 2).format(cents / 100);
}

/** Hermes on iOS has no `formatToParts`, so the symbol is whatever surrounds a formatted zero. */
export function currencySymbol(currency: string) {
  return formatter(currency, 0).format(0).replace(/[\d\s\u00a0\u202f.,-]/g, '') || currency;
}

/**
 * Parses what people type: "1 234,56", "1,234.56", "R1234" or "1234.5". The last "." or ","
 * counts as the decimal separator only when one or two digits follow it.
 */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  const separator = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  const hasDecimals = separator >= 0 && cleaned.length - separator - 1 <= 2;
  const whole = (hasDecimals ? cleaned.slice(0, separator) : cleaned).replace(/[.,]/g, '');
  const fraction = hasDecimals ? cleaned.slice(separator + 1).padEnd(2, '0') : '00';

  const cents = Number(whole || '0') * 100 + Number(fraction);
  return Number.isFinite(cents) ? cents : null;
}

/** Plain editable text for a stored amount, e.g. 125050 -> "1250.50". */
export function centsToInput(cents: number) {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}
