import { useRef, useState } from 'react';
import { Keyboard, Text, type TextInputInstance } from 'react-native';

import { AuthField } from '../../components/auth/AuthField';
import { GoogleButton, PrimaryButton, TextLink } from '../../components/auth/AuthButtons';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { LockIcon, MailIcon } from '../../components/icons';
import { toast } from '../../components/toast/toastStore';
import { authErrorMessage, isValidEmail, logIn, welcomeMessage } from '../../lib/emailAuth';
import { auth } from '../../lib/firebase';
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

  const emailInvalid = submitted && !isValidEmail(email);
  const passwordInvalid = submitted && !password;

  const submit = async () => {
    setSubmitted(true);
    const problem = !isValidEmail(email) ? 'Enter a valid email address.' : !password ? 'Enter your password.' : null;
    if (problem) {
      toast.error(problem);
      return;
    }

    Keyboard.dismiss();
    setBusy('email');
    try {
      const user = await logIn(email, password);
      toast.success(welcomeMessage(user.displayName));
    } catch (caught) {
      toast.error(authErrorMessage(caught));
      setBusy(null);
    }
  };

  const continueWithGoogle = async () => {
    setBusy('google');
    try {
      if (await signInWithGoogle()) {
        toast.success(welcomeMessage(auth.currentUser?.displayName));
      }
    } catch (caught) {
      toast.error(authErrorMessage(caught));
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
        invalid={emailInvalid}
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
        invalid={passwordInvalid}
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

      <PrimaryButton label="Log in" onPress={submit} busy={busy === 'email'} />
    </AuthLayout>
  );
}
