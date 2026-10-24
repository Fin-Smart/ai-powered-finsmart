import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { useBudgets } from '../budget/BudgetsProvider';
import { BudgetCard } from '../components/budget/BudgetCard';
import { BudgetSheet, type BudgetSheetTarget } from '../components/budget/BudgetSheet';
import { ProfileIcon } from '../components/icons';
import { Screen } from '../components/Screen';
import { errorMessage, toast } from '../components/toast/toastStore';
import { useAuthUser } from '../hooks/useAuthUser';
import { signOutEverywhere } from '../lib/googleAuth';
import { useTheme } from '../theme/ThemeProvider';

const AVATAR_SIZE = 72;

export function ProfileScreen() {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const user = useAuthUser();
  const { summaries, isLoading } = useBudgets();
  const [sheet, setSheet] = useState<BudgetSheetTarget | null>(null);
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

  const sectionTitle = {
    color: colors.text,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.lg,
  } as const;

  return (
    <Screen title="Profile">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg }}>
        {user?.photoURL ? (
          <Image
            source={{ uri: user.photoURL }}
            accessibilityIgnoresInvertColors
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
            <ProfileIcon size={34} color={colors.textMuted} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xl }}>
            {user?.displayName || 'FinSmart member'}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }}>
            {user?.email}
          </Text>
          {user && !user.emailVerified ? (
            <Text style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
              Email not verified yet. Check your inbox for the link.
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.sm + 2 }}>
        <Text accessibilityRole="header" style={[sectionTitle, { flex: 1 }]}>
          Budgets
        </Text>
        {summaries.length > 0 ? (
          <Text
            accessibilityRole="button"
            onPress={() => setSheet({ mode: 'create' })}
            suppressHighlighting
            style={{ color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
            + New budget
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.textMuted} style={{ paddingVertical: spacing.lg }} />
      ) : summaries.length === 0 ? (
        <View style={{ gap: spacing.sm + 2, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
            Create your first budget
          </Text>
          <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, lineHeight: 20 }}>
            Set how much you have, split it into categories, and track what you spend. Smart Coach can plan it with you.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSheet({ mode: 'create' })}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              marginTop: spacing.xs,
              paddingVertical: spacing.sm + 2,
              paddingHorizontal: spacing.md + 4,
              borderRadius: 999,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
            })}>
            <Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
              Create budget
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: spacing.sm + 2 }}>
          {summaries.map((summary) => (
            <BudgetCard key={summary.budget.id} summary={summary} onPress={() => setSheet({ mode: 'view', budgetId: summary.budget.id })} />
          ))}
        </View>
      )}

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

      <BudgetSheet target={sheet} onClose={() => setSheet(null)} />
    </Screen>
  );
}
