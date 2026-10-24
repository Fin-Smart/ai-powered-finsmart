import type { SmsConversation } from '../../modules/finsmart-sms';
import { assessMessage, type RiskLevel, type ScamAssessment } from './scamDetector';
import type { GmailMessage } from './gmail';

const RANK: Record<RiskLevel, number> = { safe: 0, suspicious: 1, scam: 2 };

export const isFlagged = (assessment: ScamAssessment) => assessment.level !== 'safe';

/** Riskiest of a conversation's recent incoming texts. */
export function assessConversation(conversation: SmsConversation): ScamAssessment {
  return conversation.recentIncoming
    .map((text) => assessMessage({ channel: 'sms', text, sender: conversation.address }))
    .reduce<ScamAssessment>(
      (worst, current) => (RANK[current.level] > RANK[worst.level] ? current : worst),
      { level: 'safe', score: 0, reasons: [] },
    );
}

export function emailInput(email: GmailMessage) {
  return { channel: 'email' as const, sender: email.fromAddress, subject: email.subject, text: email.body || email.snippet };
}

export const assessEmail = (email: GmailMessage) => assessMessage(emailInput(email));
