import {
  GlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export const isLiquidGlassEnabled =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

type GlassSurfaceProps = {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  tintColor?: string;
  interactive?: boolean;
};

/** Native liquid glass on supported iOS builds; a solid floating surface everywhere else. */
export function GlassSurface({ style, children, tintColor, interactive = true }: GlassSurfaceProps) {
  const { theme } = useTheme();

  if (isLiquidGlassEnabled) {
    return (
      <GlassView
        isInteractive={interactive}
        colorScheme={theme.scheme}
        tintColor={tintColor}
        style={style}>
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        style,
        styles.fallback,
        {
          backgroundColor: tintColor ?? theme.colors.floatingSurface,
          borderColor: tintColor ?? theme.colors.floatingBorder,
        },
      ]}>
      {children}
    </View>
  );
}

type GlassGroupProps = ViewProps & { spacing?: number };

/** Groups glass surfaces so they blend together natively; a plain View in the fallback. */
export function GlassGroup({ spacing, children, ...viewProps }: GlassGroupProps) {
  if (isLiquidGlassEnabled) {
    return (
      <GlassContainer spacing={spacing} {...viewProps}>
        {children}
      </GlassContainer>
    );
  }

  return <View {...viewProps}>{children}</View>;
}

const styles = StyleSheet.create({
  fallback: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
