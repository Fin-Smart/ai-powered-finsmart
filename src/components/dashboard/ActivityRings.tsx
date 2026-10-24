import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../../theme/ThemeProvider';
import { withAlpha } from './palette';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type Ring = {
  label: string;
  /** 0 to 1. */
  value: number;
  /** Shown in the legend, e.g. "3 of 7". */
  detail: string;
  color: string;
};

const SIZE = 148;
const STROKE = 16;
const GAP = 4;

function RingArc({ ring, radius, delay }: { ring: Ring; radius: number; delay: number }) {
  const circumference = 2 * Math.PI * radius;
  const progress = useRef(new Animated.Value(0)).current;
  const level = Math.min(Math.max(ring.value, 0), 1);

  useEffect(() => {
    Animated.timing(progress, { toValue: level, duration: 900, delay, useNativeDriver: false }).start();
  }, [delay, level, progress]);

  return (
    <>
      <Circle cx={SIZE / 2} cy={SIZE / 2} r={radius} stroke={withAlpha(ring.color, 0.18)} strokeWidth={STROKE} fill="none" />
      <AnimatedCircle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={radius}
        stroke={ring.color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })}
        // Start at twelve o'clock rather than three.
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        opacity={level > 0 ? 1 : 0}
      />
    </>
  );
}

/** Apple Fitness–style concentric rings with a colour-keyed legend. */
export function ActivityRings({ rings }: { rings: Ring[] }) {
  const { colors, spacing, typography, radius } = useTheme().theme;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        padding: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: colors.surface,
      }}>
      <Svg width={SIZE} height={SIZE} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {rings.map((ring, index) => (
          <RingArc
            key={ring.label}
            ring={ring}
            radius={SIZE / 2 - STROKE / 2 - index * (STROKE + GAP)}
            delay={index * 120}
          />
        ))}
      </Svg>

      <View style={{ flex: 1, gap: spacing.md }}>
        {rings.map((ring) => (
          <View key={ring.label} accessible accessibilityLabel={`${ring.label}, ${ring.detail}`}>
            <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs }}>
              {ring.label}
            </Text>
            <Text style={{ color: ring.color, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.lg }}>
              {ring.detail}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
