import type { ChatSession, Content } from '@react-native-firebase/ai';
import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from '../components/toast/toastStore';
import { createTitle, saveConversation, type Conversation, type StoredMessage } from './chatHistory';
import { getCoachErrorMessage, startCoachChat } from './smartCoach';

export type CoachMessage = {
  id: string;
  role: 'user' | 'coach';
  text: string;
  status: 'streaming' | 'done';
};

let idCounter = 0;
const createId = () => `${Date.now()}-${idCounter++}`;

/** Question/answer pairs that completed successfully; failed or in-flight turns are left out. */
function completedTurns(messages: CoachMessage[]): StoredMessage[] {
  const turns: StoredMessage[] = [];

  for (let i = 0; i < messages.length - 1; i++) {
    const question = messages[i];
    const answer = messages[i + 1];

    if (question.role === 'user' && answer.role === 'coach' && answer.status === 'done' && answer.text.trim()) {
      turns.push(
        { id: question.id, role: 'user', text: question.text },
        { id: answer.id, role: 'coach', text: answer.text },
      );
      i++;
    }
  }

  return turns;
}

const toChatHistory = (messages: StoredMessage[]): Content[] =>
  messages.map((message) => ({
    role: message.role === 'user' ? 'user' : 'model',
    parts: [{ type: 'text', text: message.text }],
  }));

export function useSmartCoach() {
  const chatRef = useRef<ChatSession | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const respondingRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);
  const savedTurnCountRef = useRef(0);
  const sendRef = useRef<(input: string) => Promise<void>>(async () => undefined);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const updateMessage = useCallback((id: string, patch: Partial<CoachMessage>) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, ...patch } : message)));
  }, []);

  const cancelResponse = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    respondingRef.current = false;
    setIsResponding(false);
  }, []);

  const send = useCallback(
    async (input: string) => {
      const text = input.trim();
      if (!text || respondingRef.current) {
        return;
      }

      if (!conversationIdRef.current) {
        conversationIdRef.current = createId();
        setConversationId(conversationIdRef.current);
      }
      chatRef.current ??= startCoachChat();
      const chat = chatRef.current;
      const userMessageId = createId();
      const replyId = createId();
      const controller = new AbortController();

      abortRef.current = controller;
      respondingRef.current = true;
      setIsResponding(true);
      setMessages((prev) => [
        ...prev,
        { id: userMessageId, role: 'user', text, status: 'done' },
        { id: replyId, role: 'coach', text: '', status: 'streaming' },
      ]);

      let reply = '';

      try {
        const result = await chat.sendMessageStream(text, { signal: controller.signal });

        for await (const chunk of result.stream) {
          reply += chunk.text();
          updateMessage(replyId, { text: reply });
        }

        updateMessage(replyId, { status: 'done' });
      } catch (error) {
        if (controller.signal.aborted) {
          if (reply) {
            updateMessage(replyId, { status: 'done' });
          } else {
            setMessages((prev) => prev.filter((message) => message.id !== replyId));
          }
        } else {
          setMessages((prev) => prev.filter((message) => message.id !== replyId));
          toast.error(getCoachErrorMessage(error), {
            action: {
              label: 'Retry',
              onPress: () => {
                if (respondingRef.current) {
                  toast.info('Wait for the current reply to finish, then try again.');
                  return;
                }
                setMessages((prev) => prev.filter((message) => message.id !== userMessageId));
                void sendRef.current(text);
              },
            },
          });
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          respondingRef.current = false;
          setIsResponding(false);
        }
      }
    },
    [updateMessage],
  );

  useEffect(() => {
    const id = conversationIdRef.current;
    if (isResponding || !id) {
      return;
    }

    const turns = completedTurns(messages);
    if (turns.length === 0 || turns.length === savedTurnCountRef.current) {
      return;
    }

    savedTurnCountRef.current = turns.length;
    saveConversation({ id, title: createTitle(turns[0].text), updatedAt: Date.now(), messages: turns }).catch(() =>
      toast.error("Couldn't save this chat to your history."),
    );
  }, [messages, isResponding]);

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const reset = useCallback(() => {
    cancelResponse();
    chatRef.current = null;
    conversationIdRef.current = null;
    savedTurnCountRef.current = 0;
    setConversationId(null);
    setMessages([]);
  }, [cancelResponse]);

  const openConversation = useCallback(
    (conversation: Conversation) => {
      cancelResponse();
      chatRef.current = startCoachChat(toChatHistory(conversation.messages));
      conversationIdRef.current = conversation.id;
      savedTurnCountRef.current = conversation.messages.length;
      setConversationId(conversation.id);
      setMessages(conversation.messages.map((message) => ({ ...message, status: 'done' })));
    },
    [cancelResponse],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    messages,
    isResponding,
    conversationId,
    send,
    stop: cancelResponse,
    reset,
    openConversation,
  };
}
