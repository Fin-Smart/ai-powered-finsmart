import { AccessibilityInfo, Pressable, Text, View } from 'react-native';

import type { QuizCardState } from '../../coach/useSmartCoach';
import { useTheme } from '../../theme/ThemeProvider';
import { CoachAvatar } from './CoachAvatar';
import { CoachText } from './CoachText';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

type QuizCardProps = {
  quiz: QuizCardState;
  onAnswer: (option: number) => void;
  onEnd: () => void;
};

export function QuizCard({ quiz, onAnswer, onEnd }: QuizCardProps) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const { question, answer, skipped } = quiz;
  const answered = answer !== null;
  const correct = answer === question.correctIndex;
  const open = !answered && !skipped;

  const choose = (option: number) => {
    if (!open) return;
    onAnswer(option);
    AccessibilityInfo.announceForAccessibility(
      option === question.correctIndex ? `Correct. ${question.explanation}` : `Not quite. ${question.explanation}`,
    );
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingRight: spacing.md }}>
      <CoachAvatar size={28} />
      <View style={{ flex: 1, gap: spacing.sm + 2, padding: spacing.md, borderRadius: 22, backgroundColor: colors.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }}>
            Question {quiz.index + 1} of {quiz.total}
          </Text>
          <Text
            numberOfLines={1}
            style={{ flex: 1, color: colors.textMuted, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs }}>
            {question.topic}
          </Text>
          {open ? (
            <Pressable accessibilityRole="button" onPress={onEnd} hitSlop={10}>
              <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xs }}>
                End quiz
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md, lineHeight: 22 }}>
          {question.question}
        </Text>

        <View style={{ gap: spacing.sm }}>
          {question.options.map((option, index) => {
            const isCorrect = index === question.correctIndex;
            const isPicked = index === answer;
            const highlight = answered && isCorrect ? 'right' : answered && isPicked ? 'wrong' : null;
            const background = highlight === 'right' ? colors.primary : highlight === 'wrong' ? colors.secondary : colors.background;
            const foreground =
              highlight === 'right' ? colors.onPrimary : highlight === 'wrong' ? colors.onSecondary : colors.text;

            return (
              <Pressable
                key={index}
                accessibilityRole="radio"
                accessibilityState={{ checked: isPicked, disabled: !open }}
                accessibilityLabel={`${LETTERS[index]}. ${option}${answered && isCorrect ? ', correct answer' : ''}`}
                disabled={!open}
                onPress={() => choose(index)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm + 2,
                  paddingVertical: spacing.sm + 2,
                  paddingHorizontal: spacing.sm + 4,
                  borderRadius: radius.lg,
                  backgroundColor: background,
                  opacity: pressed ? 0.7 : !open && !highlight ? 0.55 : 1,
                })}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: highlight ? 0 : 1,
                    borderColor: colors.border,
                    backgroundColor: highlight ? 'rgba(255,255,255,0.22)' : 'transparent',
                  }}>
                  <Text style={{ color: foreground, fontFamily: typography.fontFamily.semiBold, fontSize: 11 }}>{LETTERS[index]}</Text>
                </View>
                <Text style={{ flex: 1, color: foreground, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.sm }}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {answered ? (
          <View style={{ gap: 2 }}>
            <Text
              style={{
                color: correct ? colors.primary : colors.secondary,
                fontFamily: typography.fontFamily.semiBold,
                fontSize: typography.fontSize.sm,
              }}>
              {correct ? 'Correct!' : 'Not quite.'}
            </Text>
            <CoachText text={question.explanation} color={colors.textSecondary} />
          </View>
        ) : skipped ? (
          <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs }}>
            Skipped
          </Text>
        ) : null}
      </View>
    </View>
  );
}
