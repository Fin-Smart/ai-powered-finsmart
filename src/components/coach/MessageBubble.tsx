import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import type { CoachMessage } from '../../coach/useSmartCoach';
import { useTheme } from '../../theme/ThemeProvider';
import { RefreshIcon } from '../icons';
import { CoachAvatar } from './CoachAvatar';
import { CoachText } from './CoachText';

const AVATAR_SIZE = 28;

type MessageBubbleProps = {
  message: CoachMessage;
  onRetry?: () => void;
};

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const isUser = message.role === 'user';
  const isError = message.status === 'error';

  const bubble = (
    <View
      style={{
        flexShrink: 1,
        backgroundColor: isUser ? colors.primary : isError ? colors.secondaryMuted : colors.surface,
        borderRadius: 22,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
      }}>
      {message.status === 'streaming' && !message.text ? (
        <TypingDots color={colors.textMuted} />
      ) : (
        <CoachText text={message.text} color={isUser ? colors.onPrimary : colors.text} />
      )}
    </View>
  );

  if (isUser) {
    return <View style={{ alignItems: 'flex-end', paddingLeft: spacing.xxl }}>{bubble}</View>;
  }

  return (
    <View style={{ paddingRight: spacing.xl, gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
        <CoachAvatar size={AVATAR_SIZE} />
        {bubble}
      </View>

      {isError && onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginLeft: AVATAR_SIZE + spacing.sm + spacing.xs,
            opacity: pressed ? 0.6 : 1,
          })}>
          <RefreshIcon size={15} color={colors.secondary} />
          <Text
            style={{
              color: colors.secondary,
              fontFamily: typography.fontFamily.semiBold,
              fontSize: typography.fontSize.xs,
            }}>
            Tap to retry
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TypingDots({ color }: { color: string }) {
  const progress = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.stagger(
        160,
        progress.map((value) =>
          Animated.sequence([
            Animated.timing(value, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.timing(value, { toValue: 0.3, duration: 320, useNativeDriver: true }),
          ]),
        ),
      ),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <View
      accessibilityLabel="Smart Coach is typing"
      style={{ flexDirection: 'row', gap: 5, paddingVertical: 8, paddingHorizontal: 2 }}>
      {progress.map((opacity, index) => (
        <Animated.View
          key={index}
          style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, opacity }}
        />
      ))}
    </View>
  );
}
