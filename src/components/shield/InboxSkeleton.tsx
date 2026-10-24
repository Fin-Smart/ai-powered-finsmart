import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

const PREVIEW_WIDTHS = ['92%', '78%', '86%', '70%', '82%'] as const;

/** Placeholder inbox rows shown while messages load for the first time. */
export function InboxSkeleton({ rows = 5, label }: { rows?: number; label: string }) {
  const { colors, spacing } = useTheme().theme;
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(label);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [label, pulse]);

  const bar = (width: `${number}%` | number, height: number) => ({
    width,
    height,
    borderRadius: height / 2,
    backgroundColor: colors.fill,
  });

  return (
    <Animated.View accessible accessibilityLabel={label} accessibilityRole="progressbar" style={{ opacity: pulse }}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: spacing.sm + 4, paddingVertical: spacing.sm + 2 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.fill }} />
          <View style={{ flex: 1, gap: spacing.sm, paddingTop: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={bar('45%', 12)} />
              <View style={bar(36, 10)} />
            </View>
            <View style={bar(PREVIEW_WIDTHS[index % PREVIEW_WIDTHS.length], 10)} />
            <View style={bar('55%', 10)} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}
