import { useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { assessMessage, type MessageInput, type ScamAssessment } from '../../shield/scamDetector';
import { useTheme } from '../../theme/ThemeProvider';
import { ScamVerdict } from './ScamVerdict';

type Channel = MessageInput['channel'];

export function MessageChecker() {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const [channel, setChannel] = useState<Channel>('sms');
  const [sender, setSender] = useState('');
  const [text, setText] = useState('');
  const [checked, setChecked] = useState<{ id: number; input: MessageInput; assessment: ScamAssessment } | null>(null);

  const clearResult = () => setChecked(null);

  const check = () => {
    const input: MessageInput = { channel, text: text.trim(), sender: sender.trim() || undefined };
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
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', backgroundColor: colors.background, borderRadius: 999, padding: 4 }}>
        {(['sms', 'email'] as const).map((option) => {
          const selected = channel === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                setChannel(option);
                clearResult();
              }}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: spacing.sm,
                borderRadius: 999,
                backgroundColor: selected ? colors.text : 'transparent',
              }}>
              <Text
                style={{
                  color: selected ? colors.background : colors.text,
                  fontFamily: typography.fontFamily.semiBold,
                  fontSize: typography.fontSize.sm,
                }}>
                {option === 'sms' ? 'Text message' : 'Email'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text style={label}>{channel === 'sms' ? 'From (number or name)' : 'From (email address)'}</Text>
        <TextInput
          value={sender}
          onChangeText={(value) => {
            setSender(value);
            clearResult();
          }}
          placeholder={channel === 'sms' ? 'e.g. +27 82 123 4567' : 'e.g. support@bank.co.za'}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={channel === 'email' ? 'email-address' : 'default'}
          style={inputStyle}
        />
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text style={label}>Message</Text>
        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            clearResult();
          }}
          placeholder="Paste the message you're unsure about"
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
          Check message
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
