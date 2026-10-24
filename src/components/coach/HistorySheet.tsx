import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteConversation, loadConversations, type Conversation } from '../../coach/chatHistory';
import { formatWhen } from '../../lib/formatWhen';
import { useTheme } from '../../theme/ThemeProvider';
import { HistoryIcon } from '../icons';
import { errorMessage, toast } from '../toast/toastStore';
import { ToastViewport } from '../toast/ToastViewport';

type HistorySheetProps = {
  visible: boolean;
  activeConversationId: string | null;
  onClose: () => void;
  onSelect: (conversation: Conversation) => void;
  onDeleted: (id: string) => void;
};

export function HistorySheet({ visible, activeConversationId, onClose, onSelect, onDeleted }: HistorySheetProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void loadConversations().then((items) => {
      if (!cancelled) setConversations(items);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const confirmDelete = (conversation: Conversation) => {
    Alert.alert('Delete this chat?', conversation.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteConversation(conversation.id);
            setConversations((prev) => prev?.filter((item) => item.id !== conversation.id) ?? null);
            onDeleted(conversation.id);
            toast.success('Chat deleted');
          } catch (error) {
            toast.error(errorMessage(error, "Couldn't delete this chat. Please try again."));
          }
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'android' ? insets.top : 0,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md + 4,
            paddingBottom: spacing.md,
          }}>
          <Text
            accessibilityRole="header"
            style={{ color: colors.text, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.xl }}>
            History
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10}>
            <Text
              style={{
                color: colors.primary,
                fontFamily: typography.fontFamily.semiBold,
                fontSize: typography.fontSize.md,
              }}>
              Done
            </Text>
          </Pressable>
        </View>

        {conversations && conversations.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
            <HistoryIcon size={40} color={colors.textMuted} />
            <Text
              style={{
                marginTop: spacing.md,
                color: colors.text,
                fontFamily: typography.fontFamily.semiBold,
                fontSize: typography.fontSize.md,
              }}>
              No chats yet
            </Text>
            <Text
              style={{
                marginTop: spacing.xs,
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.fontSize.sm,
                textAlign: 'center',
              }}>
              Your conversations with Smart Coach will show up here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingBottom: insets.bottom + spacing.lg }}
            ListFooterComponent={
              conversations?.length ? (
                <Text
                  style={{
                    marginTop: spacing.md,
                    color: colors.textMuted,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: typography.fontSize.xs,
                    textAlign: 'center',
                  }}>
                  Long-press a chat to delete it
                </Text>
              ) : undefined
            }
            renderItem={({ item }) => {
              const isActive = item.id === activeConversationId;
              const lastReply = item.messages.findLast((message) => message.role === 'coach')?.text ?? '';

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint="Opens this chat. Long-press to delete."
                  onPress={() => onSelect(item)}
                  onLongPress={() => confirmDelete(item)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    gap: spacing.md,
                    paddingVertical: spacing.sm + 4,
                    paddingHorizontal: spacing.md,
                    borderRadius: 16,
                    backgroundColor: isActive || pressed ? colors.surface : 'transparent',
                  })}>
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.text,
                        fontFamily: typography.fontFamily.semiBold,
                        fontSize: typography.fontSize.md,
                      }}>
                      {item.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        marginTop: 2,
                        color: colors.textSecondary,
                        fontFamily: typography.fontFamily.regular,
                        fontSize: typography.fontSize.sm,
                      }}>
                      {lastReply.replace(/\*\*/g, '').replace(/\s+/g, ' ')}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontFamily: typography.fontFamily.regular,
                      fontSize: typography.fontSize.xs,
                      marginTop: 3,
                    }}>
                    {formatWhen(item.updatedAt)}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}
        <ToastViewport topOffset={Platform.OS === 'android' ? insets.top + spacing.sm : spacing.sm + 4} />
      </View>
    </Modal>
  );
}
