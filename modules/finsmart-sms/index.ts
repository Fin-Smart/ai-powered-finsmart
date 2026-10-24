import { NativeModule, requireOptionalNativeModule } from 'expo';

export type SmsConversation = {
  threadId: string;
  address: string;
  snippet: string;
  date: number;
  lastDirection: 'in' | 'out';
  unreadCount: number;
  /** Up to three most recent incoming message bodies, newest first. */
  recentIncoming: string[];
};

export type SmsMessage = {
  id: string;
  threadId: string;
  address: string;
  body: string;
  date: number;
  direction: 'in' | 'out';
  status: 'received' | 'sent' | 'sending' | 'failed';
  read: boolean;
};

export type SmsLaunchAction =
  | { type: 'thread'; threadId: string }
  | { type: 'compose'; address: string; body: string };

type FinsmartSmsEvents = {
  onSmsReceived: (message: SmsMessage) => void;
  onSmsChanged: (event: { threadId: string }) => void;
  onLaunchAction: (action: SmsLaunchAction) => void;
};

declare class FinsmartSmsModule extends NativeModule<FinsmartSmsEvents> {
  isDefaultSmsApp(): boolean;
  requestDefaultSmsApp(): Promise<boolean>;
  getConversations(scanLimit: number): Promise<SmsConversation[]>;
  getMessages(threadId: string, limit: number): Promise<SmsMessage[]>;
  /** Resolves with the thread id the sent message was stored in. */
  sendSms(address: string, body: string): Promise<string | null>;
  markThreadRead(threadId: string): Promise<void>;
  consumeLaunchAction(): SmsLaunchAction | null;
}

/** `null` on iOS, web and Expo Go, where the native module isn't available. */
export default requireOptionalNativeModule<FinsmartSmsModule>('FinsmartSms');
