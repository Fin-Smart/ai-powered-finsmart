import { getGenerativeModel, Schema } from 'firebase/ai';

import { COACH_MODEL, getCoachErrorMessage } from '../coach/smartCoach';
import { ai } from '../lib/ai';
import type { MessageInput, RiskLevel } from './scamDetector';

export type CoachReview = {
  verdict: RiskLevel;
  explanation: string;
  advice: string[];
};

const reviewModel = getGenerativeModel(ai, {
  model: COACH_MODEL,
  systemInstruction: `You are Smart Coach, the scam-awareness coach in the FinSmart app.
You review one SMS or email that a user is unsure about and decide whether it is a financial scam.
Judge only from the message content, sender and links. Common scams: advance-fee ("you won R1000, pay R200 to claim"), fake bank/SARS/SASSA/courier messages, requests for OTPs/PINs/passwords/card details, fake investments, and payment by gift card, airtime or crypto.
Write for a non-technical reader in plain, calm language. Never tell the user to click links, call numbers or reply to the message.`,
  generationConfig: {
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

export async function reviewWithCoach(message: MessageInput): Promise<CoachReview> {
  const prompt = [
    `Channel: ${message.channel === 'sms' ? 'SMS' : 'Email'}`,
    message.sender ? `Sender: ${message.sender}` : null,
    message.subject ? `Subject: ${message.subject}` : null,
    `Message:\n${message.text}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const result = await reviewModel.generateContent(prompt);
    return JSON.parse(result.response.text()) as CoachReview;
  } catch (error) {
    if (__DEV__) {
      console.warn('[Shield] coach review failed', error);
    }
    throw new Error(getCoachErrorMessage(error));
  }
}
