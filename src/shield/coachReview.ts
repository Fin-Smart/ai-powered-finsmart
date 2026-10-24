import { getGenerativeModel, Schema, ThinkingLevel } from '@react-native-firebase/ai';

import { COACH_MODEL, getCoachErrorMessage, isTimeout } from '../coach/smartCoach';
import { ai } from '../lib/ai';
import { assertTokensAvailable, recordAiUsage } from '../lib/aiUsage';
import { onSignOut } from '../lib/session';
import type { MessageInput, RiskLevel } from './scamDetector';

export type CoachReview = {
  verdict: RiskLevel;
  explanation: string;
  advice: string[];
};

/** Scam signals appear early; long newsletters otherwise dominate the request time. */
const MAX_MESSAGE_CHARS = 2500;
const REVIEW_TIMEOUT_MS = 20_000;

/** Flash-Lite with low thinking: a scam verdict is a quick classification, not a long answer. */
const reviewModel = getGenerativeModel(ai, {
  model: COACH_MODEL,
  systemInstruction: `You are Smart Coach, the scam-awareness coach in the FinSmart app.
You review one SMS or email that a user is unsure about and decide whether it is a financial scam.
Judge only from the message content, sender and links. Common scams: advance-fee ("you won R1000, pay R200 to claim"), fake bank/SARS/SASSA/courier messages, requests for OTPs/PINs/passwords/card details, fake investments, and payment by gift card, airtime or crypto.
Write for a non-technical reader in plain, calm language. Never tell the user to click links, call numbers or reply to the message.`,
  generationConfig: {
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    responseMimeType: 'application/json',
    responseSchema: Schema.object({
      properties: {
        verdict: Schema.enumString({
          enum: ['safe', 'suspicious', 'scam'],
          description: 'scam = clearly fraudulent, suspicious = red flags but unclear, safe = no meaningful red flags',
        }),
        explanation: Schema.string({ description: 'One or two short sentences explaining the verdict.' }),
        advice: Schema.array({
          items: Schema.string(),
          description: 'Two or three short, practical next steps for the user.',
        }),
      },
    }),
  },
});

/** Reviews already requested this session, so reopening a message doesn't wait again. */
const reviews = new Map<string, Promise<CoachReview>>();
onSignOut(() => reviews.clear());

function buildPrompt(message: MessageInput) {
  const text = message.text.replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE_CHARS);
  return [
    `Channel: ${message.channel === 'sms' ? 'SMS' : 'Email'}`,
    message.sender ? `Sender: ${message.sender}` : null,
    message.subject ? `Subject: ${message.subject}` : null,
    `Message:\n${text}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function requestReview(prompt: string): Promise<CoachReview> {
  try {
    assertTokensAvailable();
    const result = await reviewModel.generateContent(prompt, { timeout: REVIEW_TIMEOUT_MS });
    recordAiUsage(result.response);
    return JSON.parse(result.response.text()) as CoachReview;
  } catch (error) {
    if (isTimeout(error)) {
      throw new Error('Smart Coach is taking too long. Please try again.');
    }
    throw new Error(getCoachErrorMessage(error));
  }
}

export function reviewWithCoach(message: MessageInput): Promise<CoachReview> {
  const prompt = buildPrompt(message);
  const cached = reviews.get(prompt);
  if (cached) return cached;

  const pending = requestReview(prompt).catch((error: unknown) => {
    reviews.delete(prompt);
    throw error;
  });
  reviews.set(prompt, pending);
  return pending;
}
