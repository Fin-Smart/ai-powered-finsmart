import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeProvider';
import { GlassSurface, isLiquidGlassEnabled } from '../GlassSurface';
import { BackIcon } from '../icons';

const mascot = require('../../../assets/icon-dark.png');

const CARD_OVERLAP = 56;
const CARD_RADIUS = 32;

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  /** Smaller hero for screens with more fields. */
  compact?: boolean;
  onBack?: () => void;
  /** Content below the glass card, e.g. alternative sign-in options and screen links. */
  footer?: ReactNode;
  children: ReactNode;
};

export function AuthLayout({ title, subtitle, compact, onBack, footer, children }: AuthLayoutProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [opacity]);

  const heroHeight = Math.min(height * (compact ? 0.27 : 0.38), compact ? 250 : 340) + insets.top;
  const mascotSize = (heroHeight - insets.top) * (compact ? 0.62 : 0.7);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing.lg }}>
          <View
            style={{
              height: heroHeight - 50,
              backgroundColor: colors.background,
              paddingTop: insets.top + spacing.md,
              alignItems: 'center',
              overflow: 'hidden',
            }}>
            <Text
              accessibilityRole="header"
              style={{ color: colors.text, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.xxl + 8, letterSpacing: -0.5 }}>
              Finsmart
            </Text>
           
            <Image
              source={mascot}
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              style={{ position: 'absolute', bottom: -mascotSize * 0.08, width: mascotSize, height: mascotSize }}
            />
          </View>

          {onBack ? (
            <GlassSurface
              style={{
                position: 'absolute',
                top: insets.top + spacing.sm + 10,
                left: spacing.md,
                width: 44,
                height: 44,
                borderRadius: 22,
              }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={onBack}
                hitSlop={8}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <BackIcon size={22} color={isLiquidGlassEnabled ? colors.textSecondary : colors.text} strokeWidth={2} />
              </Pressable>
            </GlassSurface>
          ) : null}

          <Animated.View style={{ opacity, marginTop: -CARD_OVERLAP, paddingHorizontal: spacing.md }}>
            <GlassSurface interactive={false} style={{ borderRadius: CARD_RADIUS, padding: spacing.lg, gap: spacing.md }}>
              <View style={{ gap: spacing.xs }}>
                <Text style={{ color: colors.text, fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.xl }}>
                  {title}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: typography.fontSize.sm,
                    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
                  }}>
                  {subtitle}
                </Text>
              </View>
              {children}
            </GlassSurface>
          </Animated.View>

          {footer ? (
            <Animated.View style={{ opacity, paddingHorizontal: spacing.md, paddingTop: spacing.lg, gap: spacing.md }}>
              {footer}
            </Animated.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
