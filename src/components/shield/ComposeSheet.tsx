import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native';

import FinsmartSms from '../../../modules/finsmart-sms';
import { useTheme } from '../../theme/ThemeProvider';
import { Sheet } from '../Sheet';
import { errorMessage, toast } from '../toast/toastStore';

type ComposeSheetProps = {
  draft: { address: string; body: string } | null;
  onClose: () => void;
  onSent: (thread: { threadId: string; address: string }) => void;
};

export function ComposeSheet({ draft, onClose, onSent }: ComposeSheetProps) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const [address, setAddress] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (draft) {
      setAddress(draft.address);
      setBody(draft.body);
    }
  }, [draft]);

  const canSend = address.trim().length > 0 && body.trim().length > 0 && !isSending;

  const send = async () => {
    if (!FinsmartSms || !canSend) return;
    setIsSending(true);
    try {
      const threadId = await FinsmartSms.sendSms(address.trim(), body.trim());
      toast.success('Message sent');
      if (threadId) onSent({ threadId, address: address.trim() });
      else onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'Message not sent. Please try again.'));
    } finally {
      setIsSending(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
  } as const;

  return (
    <Sheet visible={draft !== null} title="New message" onClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="To: phone number"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            autoFocus
            style={inputStyle}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Message"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            style={[inputStyle, { minHeight: 140 }]}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!canSend}
            onPress={send}
            style={({ pressed }) => ({
              alignItems: 'center',
              paddingVertical: spacing.sm + 6,
              borderRadius: 999,
              backgroundColor: canSend ? colors.primary : colors.border,
              opacity: pressed ? 0.8 : 1,
            })}>
            <Text style={{ color: canSend ? colors.onPrimary : colors.textMuted, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
              {isSending ? 'Sending…' : 'Send'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}
