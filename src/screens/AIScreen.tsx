import { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSmartCoach } from '../coach/useSmartCoach';
import { useBottomNavInset } from '../components/BottomNav';
import { CoachAvatar } from '../components/coach/CoachAvatar';
import { CoachIntro } from '../components/coach/CoachIntro';
import { Composer } from '../components/coach/Composer';
import { HistorySheet } from '../components/coach/HistorySheet';
import { MessageBubble } from '../components/coach/MessageBubble';
import { QuickReplies } from '../components/coach/QuickReplies';
import { QuizCard } from '../components/coach/QuizCard';
import { ComposeIcon, HistoryIcon } from '../components/icons';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';
import { useTheme } from '../theme/ThemeProvider';

let autoSessionStarted = false;

export function AIScreen() {
  const { colors, spacing, typography } = useTheme().theme;
  const insets = useSafeAreaInsets();
  const bottomNavInset = useBottomNavInset();
  const keyboardVisible = useKeyboardVisible();
  const {
    messages,
    isResponding,
    isPreparingQuiz,
    quizProgress,
    conversationId,
    send,
    stop,
    reset,
    openConversation,
    startSession,
    startQuiz,
    answerQuiz,
    endQuiz,
  } = useSmartCoach();
  const [draft, setDraft] = useState('');
  const [composerHeight, setComposerHeight] = useState(0);
  const [historyVisible, setHistoryVisible] = useState(false);

  // The tab is mounted in the background shortly after launch, so this session is usually ready
  // before it's opened. It fails quietly; "Today's lesson" starts one again with full error messages.
  useEffect(() => {
    if (autoSessionStarted) return;
    autoSessionStarted = true;
    void startSession({ silent: true });
  }, [startSession]);

  const visibleMessages = useMemo(() => messages.filter((message) => !message.hidden), [messages]);
  const isEmpty = visibleMessages.length === 0;
  const newestFirst = useMemo(() => [...visibleMessages].reverse(), [visibleMessages]);
  const status = isResponding
    ? 'typing…'
    : isPreparingQuiz
      ? 'preparing your quiz…'
      : quizProgress
        ? `Quiz · question ${quizProgress.current} of ${quizProgress.total}`
        : 'Money coach';
  const contentBottomInset = composerHeight + spacing.md;

  const sendDraft = () => {
    void send(draft);
    setDraft('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm + 2,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: spacing.sm + 2,
            paddingHorizontal: spacing.md,
            borderBottomWidth: isEmpty ? 0 : 0.5,
            borderBottomColor: colors.border,
          }}>
          <CoachAvatar size={36} />
          <View style={{ flex: 1 }}>
            <Text
              accessibilityRole="header"
              style={{
                color: colors.text,
                fontFamily: typography.fontFamily.semiBold,
                fontSize: typography.fontSize.md,
              }}>
              Smart Coach
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.fontSize.xs,
              }}>
              {status}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chat history"
            onPress={() => setHistoryVisible(true)}
            hitSlop={10}
            style={({ pressed }) => ({ padding: spacing.xs, opacity: pressed ? 0.5 : 1 })}>
            <HistoryIcon size={25} color={colors.text} />
          </Pressable>

          {isEmpty ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start a new chat"
              onPress={reset}
              hitSlop={10}
              style={({ pressed }) => ({ padding: spacing.xs, opacity: pressed ? 0.5 : 1 })}>
              <ComposeIcon size={25} color={colors.text} />
            </Pressable>
          )}
        </View>

        <View style={{ flex: 1 }}>
          {isEmpty ? (
            <CoachIntro bottomInset={contentBottomInset} />
          ) : (
            <FlatList
              data={newestFirst}
              inverted
              keyExtractor={(message) => message.id}
              renderItem={({ item }) =>
                item.quiz ? (
                  <QuizCard quiz={item.quiz} onAnswer={(option) => answerQuiz(item.id, option)} onEnd={endQuiz} />
                ) : (
                  <MessageBubble message={item} />
                )
              }
              ListHeaderComponent={<View style={{ height: contentBottomInset }} />}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 2 }} />}
              contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            />
          )}

          <View
            pointerEvents="box-none"
            onLayout={(event) => setComposerHeight(event.nativeEvent.layout.height)}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: spacing.md,
              paddingBottom: keyboardVisible ? spacing.sm : bottomNavInset,
            }}>
            {isEmpty ? (
              <QuickReplies
                actions={[
                  { label: "Today's lesson", onPress: () => void startSession() },
                  { label: 'Quiz me', onPress: () => void startQuiz() },
                ]}
                onSelect={(text) => void send(text)}
              />
            ) : null}
            <Composer
              value={draft}
              onChangeText={setDraft}
              onSend={sendDraft}
              onStop={stop}
              isResponding={isResponding}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      <HistorySheet
        visible={historyVisible}
        activeConversationId={conversationId}
        onClose={() => setHistoryVisible(false)}
        onSelect={(conversation) => {
          openConversation(conversation);
          setDraft('');
          setHistoryVisible(false);
        }}
        onDeleted={(id) => {
          if (id === conversationId) {
            reset();
          }
        }}
      />
    </View>
  );
}
