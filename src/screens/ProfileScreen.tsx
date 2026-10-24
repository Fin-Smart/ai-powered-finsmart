import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { ProfileIcon } from '../components/icons';
import { Screen } from '../components/Screen';
import { errorMessage, toast } from '../components/toast/toastStore';
import { useAuthUser } from '../hooks/useAuthUser';
import { signOutEverywhere } from '../lib/googleAuth';
import { useTheme } from '../theme/ThemeProvider';

const AVATAR_SIZE = 88;

export function ProfileScreen() {
  const { colors, spacing, typography } = useTheme().theme;
  const user = useAuthUser();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutEverywhere();
      toast.success('Signed out');
    } catch (error) {
      setIsSigningOut(false);
      toast.error(errorMessage(error, "Couldn't sign out. Please try again."));
    }
  };

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
          {user?.displayName || 'FinSmart member'}
        </Text>
        <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }}>
          {user?.email}
        </Text>
        {user && !user.emailVerified ? (
          <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
            Email not verified yet. Check your inbox for the link.
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isSigningOut}
        onPress={signOut}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          marginTop: spacing.xl,
          paddingVertical: spacing.sm + 6,
          borderRadius: 999,
          backgroundColor: colors.surface,
          opacity: pressed || isSigningOut ? 0.7 : 1,
        })}>
        {isSigningOut ? <ActivityIndicator size="small" color={colors.secondary} /> : null}
        <Text style={{ color: colors.secondary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
          Sign out
        </Text>
      </Pressable>
    </Screen>
  );
}
