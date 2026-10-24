import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'smart-coach:conversations:v1';
const MAX_CONVERSATIONS = 50;
const TITLE_LENGTH = 60;

export type StoredMessage = {
  id: string;
  role: 'user' | 'coach';
  text: string;
  /** Sent by Smart Coach on the user's behalf, e.g. to start a lesson; kept for context, never shown. */
  hidden?: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: StoredMessage[];
};

let writeQueue: Promise<unknown> = Promise.resolve();

/** Serializes read-modify-write cycles so overlapping saves can't drop each other's changes. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => undefined);
  return next;
}

export async function loadConversations(): Promise<Conversation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

export function saveConversation(conversation: Conversation) {
  return enqueue(async () => {
    const existing = await loadConversations();
    const next = [conversation, ...existing.filter((item) => item.id !== conversation.id)].slice(
      0,
      MAX_CONVERSATIONS,
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  });
}

export function deleteConversation(id: string) {
  return enqueue(async () => {
    const existing = await loadConversations();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((item) => item.id !== id)));
  });
}

export function clearConversations() {
  return enqueue(() => AsyncStorage.removeItem(STORAGE_KEY));
}

export function createTitle(firstQuestion: string) {
  const singleLine = firstQuestion.replace(/\s+/g, ' ').trim();
  return singleLine.length > TITLE_LENGTH ? `${singleLine.slice(0, TITLE_LENGTH - 1).trimEnd()}…` : singleLine;
}
