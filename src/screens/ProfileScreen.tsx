import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import appConfig from '../../app.json';
import { useBudgets } from '../budget/BudgetsProvider';
import { CURRENCY_OPTIONS, setPreferredCurrency, usePreferredCurrency } from '../budget/money';
import { clearConversations } from '../coach/chatHistory';
import { BudgetCard } from '../components/budget/BudgetCard';
import { BudgetSheet, type BudgetSheetTarget } from '../components/budget/BudgetSheet';
import { dialog } from '../components/dialog/dialogStore';
import {
  AppearanceIcon,
  CurrencyIcon,
  DeleteIcon,
  GoogleLogoIcon,
  HistoryIcon,
  InfoIcon,
  LockIcon,
  LogoutIcon,
  MailIcon,
  MailVerifyIcon,
  PlusIcon,
  ProfileIcon,
} from '../components/icons';
import { Screen } from '../components/Screen';
import { SettingsGroup, SettingsRow } from '../components/settings/SettingsList';
import { errorMessage, toast } from '../components/toast/toastStore';
import { useAuthUser } from '../hooks/useAuthUser';
import { deleteAccount, resendVerificationEmail, sendPasswordChangeLink, SignInAgainError, signInMethods } from '../lib/account';
import { signOutEverywhere } from '../lib/googleAuth';
import { useTheme, type ThemePreference } from '../theme/ThemeProvider';

const AVATAR_SIZE = 72;

const APPEARANCE_LABELS: Record<ThemePreference, string> = {
  system: 'Match phone',
  light: 'Light',
  dark: 'Dark',
};

type BusyAction = 'password' | 'verify' | 'signOut' | 'delete' | null;

export function ProfileScreen() {
  const { theme, preference, setPreference } = useTheme();
  const { colors, spacing, typography } = theme;
  const user = useAuthUser();
  const { summaries, isLoading } = useBudgets();
  const currency = usePreferredCurrency();
  const [sheet, setSheet] = useState<BudgetSheetTarget | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);

  const methods = user ? signInMethods(user) : [];
  const usesPassword = methods.includes('password');
  const usesGoogle = methods.includes('google');

  const runBusy = async (action: Exclude<BusyAction, null>, task: () => Promise<void>) => {
    setBusy(action);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  };

  const changePassword = async () => {
    const confirmed = await dialog.confirm({
      title: 'Change password',
      message: `We'll email a secure link to ${user?.email ?? 'your inbox'} so you can choose a new password.`,
      confirmLabel: 'Send link',
    });
    if (!confirmed) return;
    await runBusy('password', async () => {
      try {
        const email = await sendPasswordChangeLink();
        toast.success(`Password link sent to ${email}`);
      } catch (error) {
        toast.error(errorMessage(error, "Couldn't send the link. Please try again."));
      }
    });
  };

  const verifyEmail = () =>
    runBusy('verify', async () => {
      try {
        await resendVerificationEmail();
        toast.success('Verification email sent. Check your inbox.');
      } catch (error) {
        toast.error(errorMessage(error, "Couldn't send the verification email. Please try again."));
      }
    });

  const chooseAppearance = () =>
    dialog.show({
      title: 'Appearance',
      buttons: [
        ...(Object.keys(APPEARANCE_LABELS) as ThemePreference[]).map((option) => ({
          label: option === preference ? `${APPEARANCE_LABELS[option]} ✓` : APPEARANCE_LABELS[option],
          onPress: () => setPreference(option),
        })),
        { label: 'Cancel', style: 'cancel' as const },
      ],
    });

  const chooseCurrency = () =>
    dialog.show({
      title: 'Currency',
      message: 'Used for new budgets. Existing budgets keep their currency.',
      buttons: [
        ...CURRENCY_OPTIONS.map((option) => ({
          label: option.code === currency ? `${option.name} ✓` : option.name,
          onPress: () => {
            setPreferredCurrency(option.code).catch(() =>
              toast.error("Couldn't save your currency. It will reset when you restart the app."),
            );
          },
        })),
        { label: 'Cancel', style: 'cancel' as const },
      ],
    });

  const clearHistory = async () => {
    const confirmed = await dialog.confirm({
      title: 'Clear Smart Coach history?',
      message: 'All saved chats on this phone will be removed.',
      confirmLabel: 'Clear',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await clearConversations();
      toast.success('Chat history cleared');
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't clear your chats. Please try again."));
    }
  };

  const signOut = async () => {
    const confirmed = await dialog.confirm({ title: 'Sign out of FinSmart?', confirmLabel: 'Sign out', destructive: true });
    if (!confirmed) return;
    setBusy('signOut');
    try {
      await signOutEverywhere();
      toast.success('Signed out');
    } catch (error) {
      setBusy(null);
      toast.error(errorMessage(error, "Couldn't sign out. Please try again."));
    }
  };

  const removeAccount = async () => {
    const confirmed = await dialog.confirm({
      title: 'Delete your account?',
      message:
        'Your budgets, spending records and Smart Coach chats will be permanently deleted, and FinSmart will lose access to your Gmail. This cannot be undone.',
      confirmLabel: 'Delete account',
      destructive: true,
    });
    if (!confirmed) return;
    setBusy('delete');
    try {
      if (await deleteAccount()) {
        toast.success('Your account has been deleted');
      } else {
        setBusy(null);
      }
    } catch (error) {
      setBusy(null);
      if (error instanceof SignInAgainError) {
        toast.error(error.message, { action: { label: 'Log out', onPress: () => void signOutEverywhere() } });
      } else {
        toast.error(errorMessage(error, "Couldn't delete your account. Please try again."));
      }
    }
  };

  const currencyName = CURRENCY_OPTIONS.find((option) => option.code === currency)?.name ?? currency;

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
        </View>
      </View>

      <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
        <SettingsGroup
          title="Budgets"
          footer={
            !isLoading && summaries.length === 0
              ? 'Split your money into categories and track what you spend. Smart Coach can plan it with you.'
              : undefined
          }>
          {summaries.map((summary) => (
            <BudgetCard key={summary.budget.id} summary={summary} onPress={() => setSheet({ mode: 'view', budgetId: summary.budget.id })} />
          ))}
          <SettingsRow
            Icon={PlusIcon}
            label={summaries.length === 0 ? 'Create a budget' : 'New budget'}
            busy={isLoading}
            onPress={() => setSheet({ mode: 'create' })}
          />
        </SettingsGroup>

        <SettingsGroup title="Account">
          <SettingsRow
            Icon={usesGoogle ? GoogleLogoIcon : MailIcon}
            label="Signed in with"
            value={usesGoogle && usesPassword ? 'Google and email' : usesGoogle ? 'Google' : 'Email'}
          />
          {usesPassword ? (
            <SettingsRow Icon={LockIcon} label="Change password" busy={busy === 'password'} onPress={changePassword} />
          ) : null}
          {user && !user.emailVerified ? (
            <SettingsRow Icon={MailVerifyIcon} label="Verify email" value="Not verified" busy={busy === 'verify'} onPress={verifyEmail} />
          ) : null}
        </SettingsGroup>

        <SettingsGroup title="Preferences">
          <SettingsRow Icon={AppearanceIcon} label="Appearance" value={APPEARANCE_LABELS[preference]} onPress={chooseAppearance} />
          <SettingsRow Icon={CurrencyIcon} label="Currency" value={currencyName} onPress={chooseCurrency} />
        </SettingsGroup>

        <SettingsGroup title="Smart Coach" footer="Chats are saved on this phone only.">
          <SettingsRow Icon={HistoryIcon} label="Clear chat history" onPress={clearHistory} />
        </SettingsGroup>

        <SettingsGroup title="About">
          <SettingsRow Icon={InfoIcon} label="Version" value={appConfig.expo.version} />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow Icon={LogoutIcon} label="Sign out" destructive busy={busy === 'signOut'} onPress={signOut} />
          <SettingsRow Icon={DeleteIcon} label="Delete account" destructive busy={busy === 'delete'} onPress={removeAccount} />
        </SettingsGroup>
      </View>

      <BudgetSheet target={sheet} onClose={() => setSheet(null)} />
    </Screen>
  );
}
