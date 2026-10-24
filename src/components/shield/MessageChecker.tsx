import { useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { assessMessage, type MessageInput, type ScamAssessment } from '../../shield/scamDetector';
import { useTheme } from '../../theme/ThemeProvider';
import { ScamVerdict } from './ScamVerdict';

type Channel = MessageInput['channel'];

const COPY: Record<Channel, { sender: string; senderPlaceholder: string; body: string; bodyPlaceholder: string; button: string }> = {
  sms: {
    sender: 'From (number or name)',
    senderPlaceholder: 'e.g. +27 82 123 4567',
    body: 'Message',
    bodyPlaceholder: "Paste the text you're unsure about",
    button: 'Check text',
  },
  email: {
    sender: 'From (email address)',
    senderPlaceholder: 'e.g. support@bank.co.za',
    body: 'Email',
    bodyPlaceholder: "Paste the email you're unsure about",
    button: 'Check email',
  },
};

export function MessageChecker({ channel }: { channel: Channel }) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [checked, setChecked] = useState<{ id: number; input: MessageInput; assessment: ScamAssessment } | null>(null);
  const copy = COPY[channel];

  const clearResult = () => setChecked(null);

  const check = () => {
    const input: MessageInput = {
      channel,
      text: text.trim(),
      sender: sender.trim() || undefined,
      subject: channel === 'email' ? subject.trim() || undefined : undefined,
    };
    Keyboard.dismiss();
    setChecked({ id: Date.now(), input, assessment: assessMessage(input) });
  };

  const inputStyle = {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
  } as const;

  const label = {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
  } as const;

  return (
    <View style={{  borderRadius: radius.xl,  gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text style={label}>{copy.sender}</Text>
        <TextInput
          value={sender}
          onChangeText={(value) => {
            setSender(value);
            clearResult();
          }}
          placeholder={copy.senderPlaceholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={channel === 'email' ? 'email-address' : 'default'}
          style={inputStyle}
        />
      </View>

      {channel === 'email' ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={label}>Subject</Text>
          <TextInput
            value={subject}
            onChangeText={(value) => {
              setSubject(value);
              clearResult();
            }}
            placeholder="e.g. Your account has been suspended"
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
          />
        </View>
      ) : null}

      <View style={{ gap: spacing.xs }}>
        <Text style={label}>{copy.body}</Text>
        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            clearResult();
          }}
          placeholder={copy.bodyPlaceholder}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          style={[inputStyle, { minHeight: 110, maxHeight: 220 }]}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!text.trim()}
        onPress={check}
        style={({ pressed }) => ({
          alignItems: 'center',
          paddingVertical: spacing.sm + 6,
          borderRadius: 999,
          backgroundColor: text.trim() ? colors.primary : colors.border,
          opacity: pressed ? 0.8 : 1,
        })}>
        <Text
          style={{
            color: text.trim() ? colors.onPrimary : colors.textMuted,
            fontFamily: typography.fontFamily.semiBold,
            fontSize: typography.fontSize.md,
          }}>
          {copy.button}
        </Text>
      </Pressable>

      {checked ? (
        <View style={{ paddingTop: spacing.xs }}>
          <ScamVerdict key={checked.id} input={checked.input} assessment={checked.assessment} />
        </View>
      ) : null}
    </View>
  );
}
