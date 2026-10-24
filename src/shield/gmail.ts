const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const MAX_BODY_LENGTH = 6000;

export type GmailMessage = {
  id: string;
  from: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  date: number;
  snippet: string;
  body: string;
  unread: boolean;
};

type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
};

type GmailApiMessage = {
  id: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: GmailPart;
};

/** The token is expired, revoked, or was issued before Gmail access was granted. */
export class GmailAuthError extends Error {}

/** The Gmail API is turned off in the Google Cloud project that owns the OAuth client. */
export class GmailApiDisabledError extends Error {}

type GoogleApiErrorBody = {
  error?: {
    message?: string;
    status?: string;
    errors?: { reason?: string }[];
    details?: { reason?: string }[];
  };
};

const SCOPE_REASONS = new Set(['ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'insufficientPermissions', 'authError']);
const DISABLED_REASONS = new Set(['SERVICE_DISABLED', 'accessNotConfigured']);

async function gmailFetch<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (response.ok) {
    return (await response.json()) as T;
  }

  const body = (await response.json().catch(() => ({}))) as GoogleApiErrorBody;
  const reasons = [...(body.error?.errors ?? []), ...(body.error?.details ?? [])]
    .map((item) => item.reason)
    .filter((reason): reason is string => Boolean(reason));

  if (reasons.some((reason) => DISABLED_REASONS.has(reason))) {
    throw new GmailApiDisabledError(
      "The Gmail API is turned off for FinSmart's Google Cloud project. Turn it on in Google Cloud console.",
    );
  }
  if (response.status === 401 || reasons.some((reason) => SCOPE_REASONS.has(reason))) {
    throw new GmailAuthError('Gmail access has expired or was not granted.');
  }
  throw new Error(body.error?.message ? `Gmail: ${body.error.message}` : `Gmail request failed (${response.status}).`);
}

function decodeBase64Url(data: string) {
  const binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function htmlToText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>/gi, ' $1 ')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

function findPart(part: GmailPart | undefined, mimeType: string): GmailPart | undefined {
  if (!part) return undefined;
  if (part.mimeType === mimeType && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return undefined;
}

function extractBody(payload: GmailPart | undefined) {
  const plain = findPart(payload, 'text/plain');
  if (plain?.body?.data) return decodeBase64Url(plain.body.data);
  const html = findPart(payload, 'text/html');
  if (html?.body?.data) return htmlToText(decodeBase64Url(html.body.data));
  return '';
}

function parseFrom(from: string) {
  const match = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  const address = (match?.[2] ?? from).trim().toLowerCase();
  const name = match?.[1]?.trim() || address;
  return { name, address };
}

/** Recent inbox emails (newest first), fetched read-only with the signed-in user's token. */
export const EMAIL_PAGE_SIZE = 20;

export type EmailPage = { emails: GmailMessage[]; nextPageToken: string | null };

/** One page of the inbox, newest first. Pass the previous page's `nextPageToken` to continue. */
export async function fetchEmailPage(accessToken: string, pageToken?: string | null): Promise<EmailPage> {
  const params = new URLSearchParams({ maxResults: String(EMAIL_PAGE_SIZE), q: 'in:inbox' });
  if (pageToken) params.set('pageToken', pageToken);

  const list = await gmailFetch<{ messages?: { id: string }[]; nextPageToken?: string }>(
    accessToken,
    `/messages?${params.toString()}`,
  );

  const messages = await Promise.all(
    (list.messages ?? []).map(({ id }) => gmailFetch<GmailApiMessage>(accessToken, `/messages/${id}?format=full`)),
  );

  return { emails: messages.map(toGmailMessage), nextPageToken: list.nextPageToken ?? null };
}

function toGmailMessage(message: GmailApiMessage): GmailMessage {
  const header = (name: string) =>
    message.payload?.headers?.find((item) => item.name.toLowerCase() === name)?.value ?? '';
  const from = header('from');
  const { name, address } = parseFrom(from);

  return {
    id: message.id,
    from,
    fromName: name,
    fromAddress: address,
    subject: header('subject') || '(no subject)',
    date: Number(message.internalDate ?? Date.now()),
    snippet: message.snippet ?? '',
    body: extractBody(message.payload).slice(0, MAX_BODY_LENGTH),
    unread: message.labelIds?.includes('UNREAD') ?? false,
  };
}
