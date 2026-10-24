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

/** Currency for the phone's region, defaulting to rand for this South African app. */
export function defaultCurrency() {
  const locale = Intl.NumberFormat().resolvedOptions().locale;
  const region = locale.match(/[-_]([A-Z]{2})\b/)?.[1];
  return (region && CURRENCY_BY_REGION[region]) || 'ZAR';
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
