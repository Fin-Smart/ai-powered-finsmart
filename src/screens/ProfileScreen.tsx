import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from 'react-native';

import { ProfileIcon } from '../components/icons';
import { Screen } from '../components/Screen';
import { useAuthUser } from '../hooks/useAuthUser';
import { isGoogleSignInAvailable, signInWithGoogle, signOutEverywhere } from '../lib/googleAuth';
import { useTheme } from '../theme/ThemeProvider';

const AVATAR_SIZE = 88;

export function ProfileScreen() {
  const { colors, spacing, typography } = useTheme().theme;
  const user = useAuthUser();
  const [isBusy, setIsBusy] = useState(false);

  const run = async (task: () => Promise<unknown>, failureTitle: string) => {
    setIsBusy(true);
    try {
      await task();
    } catch (error) {
      Alert.alert(failureTitle, error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const button = (label: string, onPress: () => void, variant: 'primary' | 'plain') => (
    <Pressable
      accessibilityRole="button"
      disabled={isBusy}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        alignSelf: 'stretch',
        paddingVertical: spacing.sm + 6,
        borderRadius: 999,
        backgroundColor: variant === 'primary' ? colors.text : colors.surface,
        opacity: pressed || isBusy ? 0.7 : 1,
      })}>
      {isBusy ? <ActivityIndicator size="small" color={variant === 'primary' ? colors.background : colors.text} /> : null}
      <Text
        style={{
          color: variant === 'primary' ? colors.background : colors.secondary,
          fontFamily: typography.fontFamily.semiBold,
          fontSize: typography.fontSize.md,
        }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Screen title="Profile">
      <View style={{ alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl }}>
        {user?.photoURL ? (
          <Image
            source={{ uri: user.photoURL }}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: colors.surface }}
          />
        ) : (
          <View
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: AVATAR_SIZE / 2,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <ProfileIcon size={40} color={colors.textMuted} />
          </View>
        )}

        <Text style={{ marginTop: spacing.sm, color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xl }}>
          {user ? (user.displayName ?? 'FinSmart member') : 'Welcome to FinSmart'}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.fontSize.sm,
            textAlign: 'center',
          }}>
          {user ? user.email : 'Sign in to protect your Gmail with Shield and keep your account across devices.'}
        </Text>
      </View>

      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        {user
          ? button('Sign out', () => void run(signOutEverywhere, "Couldn't sign out"), 'plain')
          : isGoogleSignInAvailable
            ? button('Continue with Google', () => void run(signInWithGoogle, "Couldn't sign in"), 'primary')
            : (
                <Text
                  style={{
                    color: colors.textMuted,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: typography.fontSize.xs,
                    textAlign: 'center',
                  }}>
                  Google sign-in works in the installed FinSmart app once its Google client IDs are set up. It isn't
                  available in Expo Go.
                </Text>
              )}
      </View>
    </Screen>
  );
}
