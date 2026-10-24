import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FinsmartSms, { type SmsMessage } from '../../../modules/finsmart-sms';
import { formatWhen } from '../../lib/formatWhen';
import { assessMessage } from '../../shield/scamDetector';
import { useTheme } from '../../theme/ThemeProvider';
import { PaperPlaneIcon } from '../icons';
import { Sheet } from '../Sheet';
import { errorMessage, toast } from '../toast/toastStore';
import { RiskBadge } from './RiskBadge';
import { ScamVerdict } from './ScamVerdict';

const MESSAGE_LIMIT = 200;

type ThreadSheetProps = {
  thread: { threadId: string; address: string } | null;
  onClose: () => void;
};

export function ThreadSheet({ thread, onClose }: ThreadSheetProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const threadId = thread?.threadId;

  const load = useCallback(async () => {
    if (!FinsmartSms || !threadId) return;
    try {
      setMessages(await FinsmartSms.getMessages(threadId, MESSAGE_LIMIT));
      await FinsmartSms.markThreadRead(threadId);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't load this conversation. Please try again."));
    }
  }, [threadId]);

  useEffect(() => {
    if (!FinsmartSms || !threadId) return;
    setMessages([]);
    setExpandedId(null);
    void load();

    const reloadIfThisThread = (event: { threadId: string }) => {
      if (event.threadId === threadId) void load();
    };
    const subscriptions = [
      FinsmartSms.addListener('onSmsReceived', reloadIfThisThread),
      FinsmartSms.addListener('onSmsChanged', reloadIfThisThread),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [threadId, load]);

  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);

  const send = async () => {
    const body = draft.trim();
    if (!FinsmartSms || !thread || !body) return;
    setIsSending(true);
    try {
      await FinsmartSms.sendSms(thread.address, body);
      setDraft('');
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Message not sent. Please try again.'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Sheet visible={thread !== null} title={thread?.address ?? ''} subtitle="Text messages" onClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <FlatList
          data={newestFirst}
          inverted
          keyExtractor={(message) => message.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm + 2 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          renderItem={({ item }) => {
            const incoming = item.direction === 'in';
            const assessment = incoming
              ? assessMessage({ channel: 'sms', text: item.body, sender: item.address })
              : null;
            const flagged = assessment && assessment.level !== 'safe';
            const expanded = expandedId === item.id;

            return (
              <View style={{ alignItems: incoming ? 'flex-start' : 'flex-end', gap: spacing.xs }}>
                <View
                  style={{
                    maxWidth: '85%',
                    borderRadius: 20,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm + 2,
                    backgroundColor: incoming ? (flagged ? colors.secondaryMuted : colors.surface) : colors.primary,
                  }}>
                  <Text
                    selectable
                    style={{
                      color: incoming ? colors.text : colors.onPrimary,
                      fontFamily: typography.fontFamily.regular,
                      fontSize: typography.fontSize.md,
                      lineHeight: 22,
                    }}>
                    {item.body}
                  </Text>
                </View>

                <Text style={{ color: item.status === 'failed' ? colors.secondary : colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
                  {item.status === 'failed' ? 'Not sent' : item.status === 'sending' ? 'Sending…' : formatWhen(item.date)}
                </Text>

                {flagged && assessment ? (
                  expanded ? (
                    <View style={{ width: '92%' }}>
                      <ScamVerdict input={{ channel: 'sms', text: item.body, sender: item.address }} assessment={assessment} />
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Why was this flagged?"
                      onPress={() => setExpandedId(item.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <RiskBadge level={assessment.level} />
                      <Text style={{ color: colors.secondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }}>
                        Why?
                      </Text>
                    </Pressable>
                  )
                ) : null}
              </View>
            );
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.sm),
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
          }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Text message"
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              flex: 1,
              maxHeight: 120,
              minHeight: 44,
              borderRadius: 22,
              paddingHorizontal: spacing.md,
              paddingTop: 11,
              paddingBottom: 11,
              backgroundColor: colors.surface,
              color: colors.text,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.md,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send text"
            disabled={!draft.trim() || isSending}
            onPress={send}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: draft.trim() ? colors.primary : colors.border,
              opacity: pressed || isSending ? 0.7 : 1,
            })}>
            <PaperPlaneIcon size={20} color={draft.trim() ? colors.onPrimary : colors.textMuted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}
