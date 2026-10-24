import type { ComponentType } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { isAppleSignInAvailable } from '../../lib/appleAuth';
import { isGoogleSignInAvailable } from '../../lib/googleAuth';
import { useTheme } from '../../theme/ThemeProvider';
import { GlassSurface, isLiquidGlassEnabled } from '../GlassSurface';
import { AppleLogoIcon, GoogleLogoIcon, type IconProps } from '../icons';

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

export type SocialProvider = 'google' | 'apple';

type SocialButtonsProps = {
  onGoogle: () => void;
  onApple: () => void;
  busy?: SocialProvider | null;
};

/** Google and Apple as floating glass pills on one row; each is hidden where it isn't available. */
export function SocialButtons({ onGoogle, onApple, busy }: SocialButtonsProps) {
  const { colors, spacing, typography } = useTheme().theme;
  if (!isGoogleSignInAvailable && !isAppleSignInAvailable) return null;
  const both = isGoogleSignInAvailable && isAppleSignInAvailable;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
        <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
          or
        </Text>
        <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {isGoogleSignInAvailable ? (
          <SocialButton
            label={both ? 'Google' : 'Continue with Google'}
            accessibilityLabel="Continue with Google"
            Icon={GoogleLogoIcon}
            onPress={onGoogle}
            busy={busy === 'google'}
            disabled={busy != null}
          />
        ) : null}
        {isAppleSignInAvailable ? (
          <SocialButton
            label={both ? 'Apple' : 'Continue with Apple'}
            accessibilityLabel="Continue with Apple"
            Icon={AppleLogoIcon}
            onPress={onApple}
            busy={busy === 'apple'}
            disabled={busy != null}
          />
        ) : null}
      </View>
    </View>
  );
}

type SocialButtonProps = {
  label: string;
  accessibilityLabel: string;
  Icon: ComponentType<IconProps>;
  onPress: () => void;
  busy: boolean;
  disabled: boolean;
};

function SocialButton({ label, accessibilityLabel, Icon, onPress, busy, disabled }: SocialButtonProps) {
  const { colors, spacing, typography } = useTheme().theme;

  return (
    <GlassSurface style={{ flex: 1, height: HEIGHT, borderRadius: HEIGHT / 2 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ busy, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm + 2,
          opacity: (pressed && !isLiquidGlassEnabled) || busy ? 0.7 : 1,
        })}>
        {busy ? <ActivityIndicator color={colors.text} /> : <Icon size={20} color={colors.text} strokeWidth={2} />}
        <Text
          numberOfLines={1}
          style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
          {label}
        </Text>
      </Pressable>
    </GlassSurface>
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
