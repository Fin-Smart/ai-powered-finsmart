import type { ChatSession } from 'firebase/ai';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getCoachErrorMessage, startCoachChat } from './smartCoach';

export type CoachMessage = {
  id: string;
  role: 'user' | 'coach';
  text: string;
  status: 'streaming' | 'done' | 'error';
};

let idCounter = 0;
const createId = () => `${Date.now()}-${idCounter++}`;

export function useSmartCoach() {
  const chatRef = useRef<ChatSession | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const respondingRef = useRef(false);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [isResponding, setIsResponding] = useState(false);

  const updateMessage = useCallback((id: string, patch: Partial<CoachMessage>) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, ...patch } : message)));
  }, []);

  const send = useCallback(
    async (input: string) => {
      const text = input.trim();
      if (!text || respondingRef.current) {
        return;
      }

      chatRef.current ??= startCoachChat();
      const chat = chatRef.current;
      const replyId = createId();
      const controller = new AbortController();

      abortRef.current = controller;
      respondingRef.current = true;
      setIsResponding(true);
      setMessages((prev) => [
        ...prev,
        { id: createId(), role: 'user', text, status: 'done' },
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
          if (__DEV__) {
            console.warn('[Smart Coach]', error);
          }
          updateMessage(replyId, { text: getCoachErrorMessage(error), status: 'error' });
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

  const retry = useCallback(() => {
    const lastUserMessage = messages.findLast((message) => message.role === 'user');
    if (!lastUserMessage) {
      return;
    }

    setMessages((prev) =>
      prev.filter((message) => message.id !== lastUserMessage.id && message.status !== 'error'),
    );
    void send(lastUserMessage.text);
  }, [messages, send]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    chatRef.current = null;
    respondingRef.current = false;
    setIsResponding(false);
    setMessages([]);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { messages, isResponding, send, retry, stop, reset };
}
