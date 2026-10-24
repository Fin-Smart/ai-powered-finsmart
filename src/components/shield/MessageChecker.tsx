import { useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import { reviewWithCoach, type CoachReview } from '../../shield/coachReview';
import { assessMessage, type MessageInput, type ScamAssessment } from '../../shield/scamDetector';
import { useTheme } from '../../theme/ThemeProvider';
import { CoachAvatar } from '../coach/CoachAvatar';
import { RiskBadge } from './RiskBadge';

type Channel = MessageInput['channel'];

type ReviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; review: CoachReview }
  | { status: 'error'; message: string };

export function MessageChecker() {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const [channel, setChannel] = useState<Channel>('sms');
  const [sender, setSender] = useState('');
  const [text, setText] = useState('');
  const [checked, setChecked] = useState<{ input: MessageInput; assessment: ScamAssessment } | null>(null);
  const [review, setReview] = useState<ReviewState>({ status: 'idle' });

  const clearResult = () => {
    setChecked(null);
    setReview({ status: 'idle' });
  };

  const check = () => {
    const input: MessageInput = { channel, text: text.trim(), sender: sender.trim() || undefined };
    Keyboard.dismiss();
    setReview({ status: 'idle' });
    setChecked({ input, assessment: assessMessage(input) });
  };

  const askCoach = async () => {
    if (!checked) return;
    setReview({ status: 'loading' });
    try {
      setReview({ status: 'done', review: await reviewWithCoach(checked.input) });
    } catch (error) {
      setReview({ status: 'error', message: error instanceof Error ? error.message : 'Please try again.' });
    }
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
        <View style={{ gap: spacing.sm + 2, paddingTop: spacing.xs }}>
          <RiskBadge level={checked.assessment.level} />
          {checked.assessment.reasons.length > 0 ? (
            checked.assessment.reasons.map((reason) => <Bullet key={reason} text={reason} />)
          ) : (
            <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }}>
              No common scam signs found. Still, never share PINs or OTPs, and only pay through your bank's official app.
            </Text>
          )}

          <CoachSecondOpinion state={review} onAsk={askCoach} />
        </View>
      ) : null}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  const { colors, spacing, typography } = useTheme().theme;
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Text style={{ color: colors.text, fontSize: typography.fontSize.sm, lineHeight: 21 }}>•</Text>
      <Text
        style={{
          flex: 1,
          color: colors.text,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.fontSize.sm,
          lineHeight: 21,
        }}>
        {text}
      </Text>
    </View>
  );
}

function CoachSecondOpinion({ state, onAsk }: { state: ReviewState; onAsk: () => void }) {
  const { colors, spacing, typography, radius } = useTheme().theme;

  if (state.status === 'done') {
    return (
      <View style={{ backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <CoachAvatar size={28} />
          <Text style={{ flex: 1, color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
            Smart Coach says
          </Text>
          <RiskBadge level={state.review.verdict} />
        </View>
        <Text style={{ color: colors.text, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, lineHeight: 21 }}>
          {state.review.explanation}
        </Text>
        {state.review.advice.map((tip) => (
          <Bullet key={tip} text={tip} />
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <Pressable
        accessibilityRole="button"
        disabled={state.status === 'loading'}
        onPress={onAsk}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm + 4,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          opacity: pressed ? 0.7 : 1,
        })}>
        {state.status === 'loading' ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <CoachAvatar size={24} />
        )}
        <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
          {state.status === 'loading' ? 'Smart Coach is checking…' : 'Ask Smart Coach'}
        </Text>
      </Pressable>
      {state.status === 'error' ? (
        <Text style={{ color: colors.secondary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs, textAlign: 'center' }}>
          {state.message}
        </Text>
      ) : (
        <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs, textAlign: 'center' }}>
          Sends this message to Smart Coach (Google Gemini) for a second opinion.
        </Text>
      )}
    </View>
  );
}
