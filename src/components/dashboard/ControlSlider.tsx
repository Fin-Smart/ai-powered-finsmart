import { useEffect, useRef, type ComponentType } from 'react';
import { Animated, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import type { IconProps } from '../icons';

type ControlSliderProps = {
  /** 0 to 1; values outside are clamped. */
  value: number;
  width: number;
  height: number;
  orientation?: 'vertical' | 'horizontal';
  Icon?: ComponentType<IconProps>;
  iconSize?: number;
  /** Fill colour; defaults to the primary blue. */
  tint?: string;
  accessibilityLabel: string;
};

const ICON_INSET = 16;

/**
 * A level indicator in the style of the iOS Control Center volume and brightness sliders: a very
 * rounded track that fills from the bottom (or left), with the icon sitting inside the fill.
 */
export function ControlSlider({
  value,
  width,
  height,
  orientation = 'vertical',
  Icon,
  iconSize = 24,
  tint,
  accessibilityLabel,
}: ControlSliderProps) {
  const { colors } = useTheme().theme;
  const level = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1);
  const progress = useRef(new Animated.Value(0)).current;
  const vertical = orientation === 'vertical';
  const length = vertical ? height : width;
  const radius = Math.min(width, height) * 0.36;
  // The icon turns white once the fill has reached its middle.
  const iconCovered = level * length >= ICON_INSET + iconSize / 2;

  useEffect(() => {
    Animated.spring(progress, { toValue: level, damping: 18, stiffness: 120, mass: 0.9, useNativeDriver: true }).start();
  }, [level, progress]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(level * 100) }}
      style={{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: colors.fill }}>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width,
          height,
          backgroundColor: tint ?? colors.primary,
          transformOrigin: vertical ? 'bottom' : 'left',
          transform: [vertical ? { scaleY: progress } : { scaleX: progress }],
        }}
      />
      {Icon ? (
        <View
          pointerEvents="none"
          style={
            vertical
              ? { position: 'absolute', left: 0, right: 0, bottom: ICON_INSET, alignItems: 'center' }
              : { position: 'absolute', top: 0, bottom: 0, left: ICON_INSET, justifyContent: 'center' }
          }>
          <Icon size={iconSize} color={iconCovered ? colors.onPrimary : colors.textSecondary} strokeWidth={2} />
        </View>
      ) : null}
    </View>
  );
}
