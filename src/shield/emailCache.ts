import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EmailPage, GmailMessage } from './gmail';

const PREFIX = 'shield:gmail-cache:v1:';
const MAX_EMAILS = 20;
/** Android storage rows top out around 2 MB, so very large newsletters are kept as plain text only. */
const MAX_CACHED_HTML = 40_000;

const keyFor = (uid: string) => `${PREFIX}${uid}`;

/** The newest emails from the last successful sync, shown instantly while the inbox refreshes. */
export async function readEmailCache(uid: string): Promise<EmailPage | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(uid));
    return raw ? (JSON.parse(raw) as EmailPage) : null;
  } catch {
    return null;
  }
}

export function writeEmailCache(uid: string, page: EmailPage) {
  const emails: GmailMessage[] = page.emails.slice(0, MAX_EMAILS).map((email) => ({
    ...email,
    html: email.html.length > MAX_CACHED_HTML ? '' : email.html,
  }));
  const nextPageToken = page.emails.length > MAX_EMAILS ? null : page.nextPageToken;
  return AsyncStorage.setItem(keyFor(uid), JSON.stringify({ emails, nextPageToken })).catch(() => undefined);
}

/** Clears cached emails for every account on this phone. */
export async function clearEmailCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(PREFIX)));
  } catch {
    // Nothing cached, or storage unavailable; either way there's nothing left to clear.
  }
}
