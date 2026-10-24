import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { isGoogleSignInAvailable } from '../../lib/googleAuth';
import { useTheme } from '../../theme/ThemeProvider';
import { GlassSurface, isLiquidGlassEnabled } from '../GlassSurface';
import { GoogleLogoIcon } from '../icons';

const HEIGHT = 54;

/** Solid primary action inside the glass card (glass-on-glass muddies both layers). */
export function PrimaryButton({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  const { colors, typography } = useTheme().theme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        height: HEIGHT,
        borderRadius: HEIGHT / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        opacity: pressed || busy ? 0.8 : 1,
      })}>
      {busy ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** "Continue with Google" as a floating glass pill; hidden where Google sign-in isn't available. */
export function GoogleButton({ onPress, busy }: { onPress: () => void; busy?: boolean }) {
  const { colors, spacing, typography } = useTheme().theme;
  if (!isGoogleSignInAvailable) return null;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
        <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
          or
        </Text>
        <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
      </View>

      <GlassSurface style={{ height: HEIGHT, borderRadius: HEIGHT / 2 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={onPress}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm + 2,
            opacity: (pressed && !isLiquidGlassEnabled) || busy ? 0.7 : 1,
          })}>
          {busy ? <ActivityIndicator color={colors.text} /> : <GoogleLogoIcon size={20} color={colors.text} strokeWidth={2} />}
          <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
            Continue with Google
          </Text>
        </Pressable>
      </GlassSurface>
    </View>
  );
}

export function TextLink({ prompt, label, onPress }: { prompt?: string; label: string; onPress: () => void }) {
  const { colors, typography } = useTheme().theme;

  return (
    <Text style={{ textAlign: 'center', color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }}>
      {prompt ? `${prompt} ` : null}
      <Text
        accessibilityRole="link"
        onPress={onPress}
        suppressHighlighting
        style={{ color: colors.primary, fontFamily: typography.fontFamily.semiBold }}>
        {label}
      </Text>
    </Text>
  );
}

export function FormError({ message }: { message: string | null }) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  if (!message) return null;

  return (
    <Text
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.secondaryMuted,
        color: colors.secondary,
        borderRadius: radius.md,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.fontSize.sm,
        overflow: 'hidden',
      }}>
      {message}
    </Text>
  );
}
