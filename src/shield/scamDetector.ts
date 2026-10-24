export type RiskLevel = 'safe' | 'suspicious' | 'scam';

export type MessageInput = {
  text: string;
  channel: 'sms' | 'email';
  /** Phone number / short code for SMS, email address for email. */
  sender?: string;
  subject?: string;
};

export type ScamAssessment = {
  level: RiskLevel;
  score: number;
  reasons: string[];
};

const SCAM_THRESHOLD = 60;
const SUSPICIOUS_THRESHOLD = 30;

const MONEY = /(?:\b(?:r|zar|usd|gbp|eur)\s?\d[\d\s,]*(?:[.,]\d{2})?\b|[$£€]\s?\d[\d,]*(?:\.\d{2})?|\b\d[\d,]*(?:\.\d{2})?\s?(?:rand|dollars?)\b)/gi;
const WINDFALL =
  /\b(?:you(?:'ve| have)? (?:won|been selected|qualif(?:y|ied))|winner|prize|lottery|lotto|jackpot|inheritance|unclaimed|reward|cash ?back|refund (?:of|due)|grant|bonus|(?:has|have) been (?:credited|deposited|sent) to you|you (?:have )?received|claim (?:your|it|now|the))\b/i;
const PAYMENT_ASK =
  /\b(?:pay|send|deposit|transfer|e-?wallet|cash ?send|instant money|airtime|recharge)\b[^.!?\n]{0,60}\b(?:fee|charge|r\s?\d|\d+\s?rand|amount|first|to (?:claim|release|receive|unlock|process))\b|\b(?:processing|release|admin(?:istration)?|clearance|delivery|activation|handling|registration|claim) (?:fee|charge|cost)\b/i;
const CREDENTIALS =
  /\b(?:otp|one[- ]time (?:pin|password|code)|pin|password|passcode|cvv|cvc|card number|card details|banking details|login details|verification code|security code|id number)\b/i;
const CREDENTIAL_ASK = /\b(?:send|share|confirm|reply with|provide|enter|update|verify|give us|forward)\b/i;
const SAFETY_NOTICE = /\b(?:do not|don't|never|will never)\s+(?:share|disclose|give|send)\b/i;
const URGENCY =
  /\b(?:urgent(?:ly)?|immediately|right away|act now|asap|within \d+\s?(?:hours?|hrs?|minutes?|mins?)|today only|final (?:notice|warning|reminder)|last chance|expires? (?:today|soon|in)|before it(?:'s| is) too late)\b/i;
const ACCOUNT_THREAT =
  /\b(?:account|card|profile|wallet|number|sim)\b[^.!?\n]{0,40}\b(?:suspended|blocked|locked|closed|deactivated|frozen|compromised|restricted|on hold|will be (?:suspended|blocked|closed|deactivated))\b/i;
const UNTRACEABLE_PAYMENT =
  /\b(?:gift ?cards?|google play cards?|itunes cards?|apple cards?|steam cards?|vouchers?|airtime|1voucher|ott voucher|bitcoin|btc|usdt|crypto(?:currency)?|binance)\b/i;
const EASY_MONEY =
  /\b(?:guaranteed (?:returns?|profits?|income)|double your money|risk[- ]free (?:investment|returns?)|earn (?:r|\$)?\s?\d[\d,]* (?:per|a|every) (?:day|week|hour)|work from home and earn|investment opportunity|forex (?:signals|trading)|mining profits?)\b/i;
const MOVE_TO_CHAT = /\b(?:whatsapp|telegram|signal)\b[^.!?\n]{0,30}\b(?:me|us|now|on|for|to claim)\b/i;

const URL = /\b(?:https?:\/\/|www\.)[^\s<>"')]+|\b[a-z0-9-]+\.(?:com|co\.za|net|org|xyz|top|click|link|info|live|icu|buzz|site|online|shop|app|ly|gd|gl|cc|me)\b(?:\/[^\s<>"')]*)?/gi;
const SHORTENERS = /\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|rb\.gy|shorturl\.at|tiny\.cc|ow\.ly|s\.id|t\.ly)\b/i;
const RISKY_TLD = /\.(?:xyz|top|click|link|icu|buzz|live|site|online|shop|rest|monster|cfd|sbs)(?:[/:?#]|$)/i;
const IP_URL = /\bhttps?:\/\/\d{1,3}(?:\.\d{1,3}){3}/i;
const FREE_MAIL = /@(?:gmail|googlemail|outlook|hotmail|live|yahoo|ymail|aol|icloud|proton(?:mail)?|gmx|mail)\.[a-z.]+$/i;
const PHONE_NUMBER = /^\+?\d[\d\s-]{7,}$/;

/** Organisations scammers commonly impersonate in South Africa and globally, with their real domains. */
const BRANDS: { name: string; pattern: RegExp; domains: string[] }[] = [
  { name: 'FNB', pattern: /\b(?:fnb|first national bank)\b/i, domains: ['fnb.co.za'] },
  { name: 'Absa', pattern: /\babsa\b/i, domains: ['absa.co.za', 'absa.africa'] },
  { name: 'Standard Bank', pattern: /\bstandard ?bank\b/i, domains: ['standardbank.co.za'] },
  { name: 'Nedbank', pattern: /\bnedbank\b/i, domains: ['nedbank.co.za'] },
  { name: 'Capitec', pattern: /\bcapitec\b/i, domains: ['capitecbank.co.za'] },
  { name: 'TymeBank', pattern: /\btyme ?bank\b/i, domains: ['tymebank.co.za'] },
  { name: 'Discovery', pattern: /\bdiscovery bank\b/i, domains: ['discovery.co.za'] },
  { name: 'SARS', pattern: /\bsars\b|\bsouth african revenue service\b/i, domains: ['sars.gov.za'] },
  { name: 'SASSA', pattern: /\bsassa\b/i, domains: ['sassa.gov.za'] },
  { name: 'the Post Office', pattern: /\b(?:sapo|post office)\b/i, domains: ['postoffice.co.za'] },
  { name: 'DHL', pattern: /\bdhl\b/i, domains: ['dhl.com', 'dhl.co.za'] },
  { name: 'FedEx', pattern: /\bfedex\b/i, domains: ['fedex.com'] },
  { name: 'PayPal', pattern: /\bpaypal\b/i, domains: ['paypal.com'] },
  { name: 'Netflix', pattern: /\bnetflix\b/i, domains: ['netflix.com'] },
  { name: 'Amazon', pattern: /\bamazon\b/i, domains: ['amazon.com', 'amazon.co.za'] },
  { name: 'Apple', pattern: /\bapple id\b|\bicloud\b/i, domains: ['apple.com', 'icloud.com'] },
  { name: 'Vodacom', pattern: /\bvodacom\b/i, domains: ['vodacom.co.za'] },
  { name: 'MTN', pattern: /\bmtn\b/i, domains: ['mtn.co.za', 'mtn.com'] },
  { name: 'Takealot', pattern: /\btakealot\b/i, domains: ['takealot.com'] },
];

type Signal = { weight: number; reason: string };

const hostOf = (url: string) =>
  url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split(/[/?#:]/)[0]
    .toLowerCase();

const belongsTo = (host: string, domains: string[]) =>
  domains.some((domain) => host === domain || host.endsWith(`.${domain}`));

export function assessMessage({ text, channel, sender, subject }: MessageInput): ScamAssessment {
  const body = [subject, text].filter(Boolean).join('\n');
  const signals: Signal[] = [];
  const add = (weight: number, reason: string) => signals.push({ weight, reason });

  const amounts = body.match(MONEY) ?? [];
  const urls = (body.match(URL) ?? []).map((url) => url.replace(/[.,;:!?]+$/, ''));
  const hosts = urls.map(hostOf);
  const windfall = WINDFALL.test(body);
  const paymentAsk = PAYMENT_ASK.test(body);
  const easyMoney = EASY_MONEY.test(body);

  if (windfall && paymentAsk) {
    add(65, 'Says you will receive money but asks you to pay first. This is a classic advance-fee scam.');
  } else if (paymentAsk && amounts.length >= 2) {
    add(30, 'Asks you to pay a fee or send money to unlock a larger amount.');
  } else if (windfall) {
    add(20, 'Claims you won or are owed money you did not expect.');
  }

  if (CREDENTIALS.test(body) && CREDENTIAL_ASK.test(body) && !SAFETY_NOTICE.test(body)) {
    add(55, 'Asks for a PIN, OTP, password or card details. Banks never ask for these by message.');
  }

  if (UNTRACEABLE_PAYMENT.test(body) && (paymentAsk || windfall || easyMoney || /\b(?:pay|buy|send)\b/i.test(body))) {
    add(35, "Involves gift cards, airtime, vouchers or crypto, which scammers prefer because payments can't be reversed.");
  }

  if (easyMoney) {
    add(35, 'Promises easy or guaranteed money. Real investments never guarantee returns.');
  }

  if (paymentAsk && !windfall && urls.length > 0) {
    add(15, 'Asks you to pay a fee through a link in the message.');
  }

  if (ACCOUNT_THREAT.test(body)) {
    add(25, 'Claims your account or card is blocked or at risk to scare you into acting.');
  }

  if (URGENCY.test(body)) {
    add(15, 'Pressures you to act quickly.');
  }

  if (MOVE_TO_CHAT.test(body) && (windfall || paymentAsk || amounts.length > 0)) {
    add(15, 'Tries to move the conversation to WhatsApp or another chat app.');
  }

  if (urls.length > 0) {
    if (urls.some((url) => IP_URL.test(url))) {
      add(30, 'Contains a link to a bare IP address instead of a real website.');
    } else if (urls.some((url) => SHORTENERS.test(url))) {
      add(20, 'Uses a shortened link that hides where it really goes.');
    } else if (urls.some((url) => RISKY_TLD.test(hostOf(url) + '/'))) {
      add(15, 'Links to a website with an unusual address often used by scammers.');
    } else {
      add(5, 'Contains a link.');
    }
  }

  const impersonated = BRANDS.find((brand) => brand.pattern.test(body));
  if (impersonated) {
    const foreignHost = hosts.find((host) => !belongsTo(host, impersonated.domains));
    if (foreignHost) {
      add(30, `Mentions ${impersonated.name} but links to ${foreignHost}, which isn't their website.`);
    }

    const from = sender?.trim() ?? '';
    if (channel === 'email' && from.includes('@')) {
      const fromDomain = from.split('@')[1]?.toLowerCase() ?? '';
      if (FREE_MAIL.test(from)) {
        add(30, `Claims to be ${impersonated.name} but was sent from a personal email address.`);
      } else if (fromDomain && !belongsTo(fromDomain, impersonated.domains)) {
        add(20, `Claims to be ${impersonated.name} but was sent from ${fromDomain}.`);
      }
    } else if (channel === 'sms' && PHONE_NUMBER.test(from)) {
      add(10, `Claims to be ${impersonated.name} but came from a regular phone number.`);
    }
  }

  const score = Math.min(
    signals.reduce((total, signal) => total + signal.weight, 0),
    100,
  );
  const reasons = signals
    .filter((signal) => signal.weight >= 10)
    .sort((a, b) => b.weight - a.weight)
    .map((signal) => signal.reason);

  return {
    level: score >= SCAM_THRESHOLD ? 'scam' : score >= SUSPICIOUS_THRESHOLD ? 'suspicious' : 'safe',
    score,
    reasons,
  };
}
