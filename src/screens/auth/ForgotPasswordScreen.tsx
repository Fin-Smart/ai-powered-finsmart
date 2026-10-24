import { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';

import { AuthField } from '../../components/auth/AuthField';
import { FormError, PrimaryButton, TextLink } from '../../components/auth/AuthButtons';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { MailIcon, MailSentIcon } from '../../components/icons';
import { authErrorMessage, isValidEmail, sendResetLink } from '../../lib/emailAuth';
import { useTheme } from '../../theme/ThemeProvider';

type ForgotPasswordScreenProps = {
  initialEmail: string;
  onBack: (email: string) => void;
};

export function ForgotPasswordScreen({ initialEmail, onBack }: ForgotPasswordScreenProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const [email, setEmail] = useState(initialEmail);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const emailError = submitted && !isValidEmail(email) ? 'Enter a valid email address.' : null;

  const submit = async () => {
    setSubmitted(true);
    setError(null);
    if (!isValidEmail(email)) return;

    Keyboard.dismiss();
    setBusy(true);
    try {
      await sendResetLink(email);
      setSentTo(email.trim());
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <AuthLayout
        compact
        onBack={() => onBack(sentTo)}
        title="Check your inbox"
        subtitle={`If there's a FinSmart account for ${sentTo}, a link to reset your password is on its way.`}
        footer={<TextLink prompt="Didn't get it?" label="Send again" onPress={submit} />}>
        <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MailSentIcon size={34} color={colors.primary} />
          </View>
        </View>
        <Text
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.fontSize.sm,
            lineHeight: 21,
          }}>
          The link expires after an hour. Check your spam folder if you can't find it.
        </Text>
        <FormError message={error} />
        <PrimaryButton label="Back to log in" onPress={() => onBack(sentTo)} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      compact
      onBack={() => onBack(email)}
      title="Reset your password"
      subtitle="Enter the email you signed up with and we'll send you a link to choose a new password.">
      <AuthField
        label="Email"
        Icon={MailIcon}
        value={email}
        onChangeText={setEmail}
        error={emailError}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <FormError message={error} />
      <PrimaryButton label="Send reset link" onPress={submit} busy={busy} />
    </AuthLayout>
  );
}
