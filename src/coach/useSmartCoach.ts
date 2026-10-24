import type { ChatSession, Content } from '@react-native-firebase/ai';
import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from '../components/toast/toastStore';
import { createTitle, saveConversation, type Conversation, type StoredMessage } from './chatHistory';
import { recordHabit, recordQuizAnswer } from './habits';
import { generateQuiz, type QuizQuestion } from './quiz';
import { getCoachErrorMessage, LESSON_PROMPT, parseLesson, startCoachChat } from './smartCoach';

export type QuizCardState = {
  index: number;
  total: number;
  question: QuizQuestion;
  /** The option the person picked, or null while the question is waiting for an answer. */
  answer: number | null;
  /** The quiz was ended before this question was answered. */
  skipped?: boolean;
};

export type CoachMessage = {
  id: string;
  role: 'user' | 'coach';
  text: string;
  status: 'streaming' | 'done';
  /** Prompts Smart Coach sends on the user's behalf, e.g. to start a lesson. Not shown in the chat. */
  hidden?: boolean;
  quiz?: QuizCardState;
};

type SendOptions = { hidden?: boolean; lesson?: boolean };

type QuizRun = { questions: QuizQuestion[]; index: number; correct: number; missedTopics: string[] };

/** Pause after an answer so the explanation can be read before the next question appears. */
const NEXT_QUESTION_DELAY_MS = 1400;

let idCounter = 0;
const createId = () => `${Date.now()}-${idCounter++}`;

/** Question/answer pairs that completed successfully; failed or in-flight turns and quiz cards are left out. */
function completedTurns(messages: CoachMessage[]): StoredMessage[] {
  const turns: StoredMessage[] = [];

  for (let i = 0; i < messages.length - 1; i++) {
    const question = messages[i];
    const answer = messages[i + 1];

    if (
      question.role === 'user' &&
      answer.role === 'coach' &&
      !answer.quiz &&
      answer.status === 'done' &&
      answer.text.trim()
    ) {
      turns.push(
        { id: question.id, role: 'user', text: question.text, ...(question.hidden ? { hidden: true } : null) },
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

function quizSummary(run: QuizRun, answered: number) {
  const total = run.questions.length;
  const score =
    answered === total ? `Quiz complete: ${run.correct} of ${total} correct.` : `Quiz ended: ${run.correct} of ${answered} answered correctly.`;
  const praise =
    answered === 0
      ? 'Come back to it any time.'
      : run.correct / answered >= 0.8
        ? 'Great work, you really know this.'
        : run.correct / answered >= 0.5
          ? 'Good effort, you are getting there.'
          : 'Every question you miss is something new you have learned.';
  const topics = [...new Set(run.missedTopics)].slice(0, 3);
  return [
    `**${score}** ${praise}`,
    topics.length ? `Worth another look: ${topics.join(', ')}. Ask me about any of them and I'll explain.` : null,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function useSmartCoach() {
  const chatRef = useRef<ChatSession | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const respondingRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);
  const savedTurnCountRef = useRef(0);
  const lessonTopicRef = useRef<string | null>(null);
  const sendRef = useRef<(input: string, options?: SendOptions) => Promise<string | null>>(async () => null);
  /** Bumped by reset/openConversation so late quiz results from an old session are ignored. */
  const sessionRef = useRef(0);
  const quizRef = useRef<QuizRun | null>(null);
  const preparingQuizRef = useRef(false);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isPreparingQuiz, setIsPreparingQuiz] = useState(false);
  const [quizProgress, setQuizProgress] = useState<{ current: number; total: number } | null>(null);

  const updateMessage = useCallback((id: string, patch: Partial<CoachMessage>) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, ...patch } : message)));
  }, []);

  const cancelResponse = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    respondingRef.current = false;
    setIsResponding(false);
  }, []);

  /** Resolves with the full reply, or null if it failed or was stopped. */
  const send = useCallback(
    async (input: string, options: SendOptions = {}): Promise<string | null> => {
      const text = input.trim();
      if (!text || respondingRef.current) {
        return null;
      }

      if (!conversationIdRef.current) {
        conversationIdRef.current = createId();
        setConversationId(conversationIdRef.current);
      }
      if (!options.hidden) recordHabit('coach_question', text);
      chatRef.current ??= startCoachChat();
      const chat = chatRef.current;
      const userMessageId = createId();
      const replyId = createId();
      const controller = new AbortController();
      const display = (reply: string) => (options.lesson ? parseLesson(reply).text : reply);

      abortRef.current = controller;
      respondingRef.current = true;
      setIsResponding(true);
      setMessages((prev) => [
        ...prev,
        { id: userMessageId, role: 'user', text, status: 'done', ...(options.hidden ? { hidden: true } : null) },
        { id: replyId, role: 'coach', text: '', status: 'streaming' },
      ]);

      let reply = '';

      try {
        const result = await chat.sendMessageStream(text, { signal: controller.signal });

        for await (const chunk of result.stream) {
          reply += chunk.text();
          updateMessage(replyId, { text: display(reply) });
        }

        updateMessage(replyId, { status: 'done', text: display(reply) || reply });
        return reply;
      } catch (error) {
        if (controller.signal.aborted) {
          if (reply) {
            updateMessage(replyId, { status: 'done', text: display(reply) || reply });
          } else {
            // A stopped hidden prompt has nothing left to show, so its turn goes too.
            setMessages((prev) =>
              prev.filter((message) => message.id !== replyId && !(options.hidden && message.id === userMessageId)),
            );
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
                void sendRef.current(text, options);
              },
            },
          });
        }
        return null;
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

  const showQuestion = useCallback((run: QuizRun) => {
    const card: QuizCardState = {
      index: run.index,
      total: run.questions.length,
      question: run.questions[run.index],
      answer: null,
    };
    setQuizProgress({ current: run.index + 1, total: run.questions.length });
    setMessages((prev) => [...prev, { id: createId(), role: 'coach', text: '', status: 'done', quiz: card }]);
  }, []);

  const finishQuiz = useCallback((run: QuizRun, answered: number) => {
    quizRef.current = null;
    setQuizProgress(null);
    setMessages((prev) => [
      ...prev,
      { id: createId(), role: 'coach', text: quizSummary(run, answered), status: 'done' },
    ]);
  }, []);

  /** Generates ten questions, then shows them one at a time as each is answered. */
  const startQuiz = useCallback(
    async (lesson: string | null = null) => {
      if (quizRef.current || preparingQuizRef.current) {
        toast.info('Finish the current quiz first.');
        return;
      }
      const session = sessionRef.current;
      const placeholderId = createId();
      preparingQuizRef.current = true;
      setIsPreparingQuiz(true);
      setMessages((prev) => [...prev, { id: placeholderId, role: 'coach', text: '', status: 'streaming' }]);

      try {
        const questions = await generateQuiz(lesson);
        if (session !== sessionRef.current) return;
        const run: QuizRun = { questions, index: 0, correct: 0, missedTopics: [] };
        quizRef.current = run;
        setMessages((prev) => prev.filter((message) => message.id !== placeholderId));
        showQuestion(run);
      } catch (error) {
        if (session !== sessionRef.current) return;
        setMessages((prev) => prev.filter((message) => message.id !== placeholderId));
        toast.error(error instanceof Error ? error.message : getCoachErrorMessage(error), {
          action: { label: 'Retry', onPress: () => void startQuizRef.current(lesson) },
        });
      } finally {
        if (session === sessionRef.current) {
          preparingQuizRef.current = false;
          setIsPreparingQuiz(false);
        }
      }
    },
    [showQuestion],
  );
  const startQuizRef = useRef(startQuiz);

  const answerQuiz = useCallback(
    (messageId: string, option: number) => {
      const run = quizRef.current;
      if (!run) return;
      const question = run.questions[run.index];
      const correct = option === question.correctIndex;
      const answeredIndex = run.index;

      if (correct) run.correct += 1;
      else run.missedTopics.push(question.topic);
      recordQuizAnswer(question.topic, question.question, correct);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId && message.quiz && message.quiz.answer === null
            ? { ...message, quiz: { ...message.quiz, answer: option } }
            : message,
        ),
      );
      run.index += 1;

      const session = sessionRef.current;
      setTimeout(() => {
        if (session !== sessionRef.current || quizRef.current !== run) return;
        if (run.index < run.questions.length) showQuestion(run);
        else finishQuiz(run, answeredIndex + 1);
      }, NEXT_QUESTION_DELAY_MS);
    },
    [finishQuiz, showQuestion],
  );

  const endQuiz = useCallback(() => {
    const run = quizRef.current;
    if (!run) return;
    setMessages((prev) =>
      prev.map((message) =>
        message.quiz && message.quiz.answer === null && !message.quiz.skipped
          ? { ...message, quiz: { ...message.quiz, skipped: true } }
          : message,
      ),
    );
    finishQuiz(run, run.index);
  }, [finishQuiz]);

  /** Opens a session on Smart Coach's own initiative: a short lesson picked from habits, then a quiz on it. */
  const startSession = useCallback(async () => {
    if (respondingRef.current || quizRef.current || preparingQuizRef.current) return;
    const session = sessionRef.current;
    const reply = await sendRef.current(LESSON_PROMPT, { hidden: true, lesson: true });
    if (!reply || session !== sessionRef.current) return;

    const { topic, text } = parseLesson(reply);
    if (topic) {
      lessonTopicRef.current = topic;
      recordHabit('lesson', topic);
    }
    await startQuizRef.current(text || reply);
  }, []);

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
    const firstQuestion = turns.find((turn) => turn.role === 'user' && !turn.hidden);
    const title = firstQuestion
      ? createTitle(firstQuestion.text)
      : createTitle(`Lesson: ${lessonTopicRef.current ?? 'money basics'}`);
    saveConversation({ id, title, updatedAt: Date.now(), messages: turns }).catch(() =>
      toast.error("Couldn't save this chat to your history."),
    );
  }, [messages, isResponding]);

  useEffect(() => {
    sendRef.current = send;
    startQuizRef.current = startQuiz;
  }, [send, startQuiz]);

  const clearQuiz = useCallback(() => {
    sessionRef.current += 1;
    quizRef.current = null;
    preparingQuizRef.current = false;
    setIsPreparingQuiz(false);
    setQuizProgress(null);
  }, []);

  const reset = useCallback(() => {
    cancelResponse();
    clearQuiz();
    chatRef.current = null;
    conversationIdRef.current = null;
    lessonTopicRef.current = null;
    savedTurnCountRef.current = 0;
    setConversationId(null);
    setMessages([]);
  }, [cancelResponse, clearQuiz]);

  const openConversation = useCallback(
    (conversation: Conversation) => {
      cancelResponse();
      clearQuiz();
      chatRef.current = startCoachChat(toChatHistory(conversation.messages));
      conversationIdRef.current = conversation.id;
      lessonTopicRef.current = null;
      savedTurnCountRef.current = conversation.messages.length;
      setConversationId(conversation.id);
      setMessages(conversation.messages.map((message) => ({ ...message, status: 'done' })));
    },
    [cancelResponse, clearQuiz],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    messages,
    isResponding,
    isPreparingQuiz,
    quizProgress,
    conversationId,
    send,
    stop: cancelResponse,
    reset,
    openConversation,
    startSession,
    startQuiz,
    answerQuiz,
    endQuiz,
  };
}
