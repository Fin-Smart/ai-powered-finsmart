import { useRef, useState } from 'react';
import { Keyboard, Text, type TextInputInstance } from 'react-native';

import { AuthField } from '../../components/auth/AuthField';
import { FormError, GoogleButton, PrimaryButton, TextLink } from '../../components/auth/AuthButtons';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { LockIcon, MailIcon } from '../../components/icons';
import { authErrorMessage, isValidEmail, logIn } from '../../lib/emailAuth';
import { signInWithGoogle } from '../../lib/googleAuth';
import { useTheme } from '../../theme/ThemeProvider';

type LoginScreenProps = {
  initialEmail: string;
  onRegister: (email: string) => void;
  onForgotPassword: (email: string) => void;
};

export function LoginScreen({ initialEmail, onRegister, onForgotPassword }: LoginScreenProps) {
  const { colors, typography } = useTheme().theme;
  const passwordRef = useRef<TextInputInstance>(null);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailError = submitted && !isValidEmail(email) ? 'Enter a valid email address.' : null;
  const passwordError = submitted && !password ? 'Enter your password.' : null;

  const submit = async () => {
    setSubmitted(true);
    setError(null);
    if (!isValidEmail(email) || !password) return;

    Keyboard.dismiss();
    setBusy('email');
    try {
      await logIn(email, password);
    } catch (caught) {
      setError(authErrorMessage(caught));
      setBusy(null);
    }
  };

  const continueWithGoogle = async () => {
    setError(null);
    setBusy('google');
    try {
      await signInWithGoogle();
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Keep learning and keep scammers out."
      footer={
        <>
          <GoogleButton onPress={continueWithGoogle} busy={busy === 'google'} />
          <TextLink prompt="New to FinSmart?" label="Create an account" onPress={() => onRegister(email)} />
        </>
      }>
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
        importantForAutofill="yes"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <AuthField
        ref={passwordRef}
        password
        label="Password"
        Icon={LockIcon}
        value={password}
        onChangeText={setPassword}
        error={passwordError}
        placeholder="Your password"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        importantForAutofill="yes"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Text
        accessibilityRole="link"
        onPress={() => onForgotPassword(email)}
        suppressHighlighting
        style={{
          alignSelf: 'flex-end',
          color: colors.primary,
          fontFamily: typography.fontFamily.semiBold,
          fontSize: typography.fontSize.sm,
          paddingVertical: 2,
        }}>
        Forgot password?
      </Text>

      <FormError message={error} />
      <PrimaryButton label="Log in" onPress={submit} busy={busy === 'email'} />
    </AuthLayout>
  );
}
