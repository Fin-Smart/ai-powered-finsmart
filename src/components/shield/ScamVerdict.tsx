import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { reviewWithCoach, type CoachReview } from '../../shield/coachReview';
import type { MessageInput, ScamAssessment } from '../../shield/scamDetector';
import { useTheme } from '../../theme/ThemeProvider';
import { CoachAvatar } from '../coach/CoachAvatar';
import { errorMessage, toast } from '../toast/toastStore';
import { RiskBadge } from './RiskBadge';

type ReviewState = { status: 'idle' } | { status: 'loading' } | { status: 'done'; review: CoachReview };

type ScamVerdictProps = {
  input: MessageInput;
  assessment: ScamAssessment;
};

/** Risk badge, the reasons behind it and an optional Smart Coach second opinion. */
export function ScamVerdict({ input, assessment }: ScamVerdictProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const [review, setReview] = useState<ReviewState>({ status: 'idle' });

  const askCoach = async () => {
    setReview({ status: 'loading' });
    try {
      setReview({ status: 'done', review: await reviewWithCoach(input) });
    } catch (error) {
      setReview({ status: 'idle' });
      toast.error(errorMessage(error), { action: { label: 'Retry', onPress: () => void askCoach() } });
    }
  };

  return (
    <View style={{ gap: spacing.sm + 2 }}>
      <RiskBadge level={assessment.level} />
      {assessment.reasons.length > 0 ? (
        assessment.reasons.map((reason) => <Bullet key={reason} text={reason} />)
      ) : (
        <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }}>
          No common scam signs found. Still, never share PINs or OTPs, and only pay through your bank's official app.
        </Text>
      )}

      <CoachSecondOpinion state={review} onAsk={askCoach} />
    </View>
  );
}

export function Bullet({ text }: { text: string }) {
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
      <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs, textAlign: 'center' }}>
        Sends this message to Smart Coach (Google Gemini) for a second opinion.
      </Text>
    </View>
  );
}
