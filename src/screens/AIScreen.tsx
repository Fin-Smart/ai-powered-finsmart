import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSmartCoach } from '../coach/useSmartCoach';
import { useBottomNavInset } from '../components/BottomNav';
import { CoachAvatar } from '../components/coach/CoachAvatar';
import { CoachIntro } from '../components/coach/CoachIntro';
import { Composer } from '../components/coach/Composer';
import { MessageBubble } from '../components/coach/MessageBubble';
import { QuickReplies } from '../components/coach/QuickReplies';
import { ComposeIcon } from '../components/icons';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';
import { useTheme } from '../theme/ThemeProvider';

export function AIScreen() {
  const { colors, spacing, typography } = useTheme().theme;
  const insets = useSafeAreaInsets();
  const bottomNavInset = useBottomNavInset();
  const keyboardVisible = useKeyboardVisible();
  const { messages, isResponding, send, retry, stop, reset } = useSmartCoach();
  const [draft, setDraft] = useState('');
  const [composerHeight, setComposerHeight] = useState(0);

  const isEmpty = messages.length === 0;
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);
  const lastMessageId = messages.at(-1)?.id;
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
              {isResponding ? 'typing…' : 'Money coach'}
            </Text>
          </View>

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
              renderItem={({ item }) => (
                <MessageBubble message={item} onRetry={item.id === lastMessageId ? retry : undefined} />
              )}
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
            {isEmpty ? <QuickReplies onSelect={(text) => void send(text)} /> : null}
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
    </View>
  );
}
