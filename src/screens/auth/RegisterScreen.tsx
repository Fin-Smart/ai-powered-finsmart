import { useRef, useState } from 'react';
import { Keyboard, Text, type TextInputInstance } from 'react-native';

import { AuthField } from '../../components/auth/AuthField';
import { FormError, GoogleButton, PrimaryButton, TextLink } from '../../components/auth/AuthButtons';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { LockIcon, MailIcon, ProfileIcon } from '../../components/icons';
import { authErrorMessage, isValidEmail, MIN_PASSWORD_LENGTH, register } from '../../lib/emailAuth';
import { signInWithGoogle } from '../../lib/googleAuth';
import { useTheme } from '../../theme/ThemeProvider';

type RegisterScreenProps = {
  initialEmail: string;
  onBack: () => void;
  onLogIn: (email: string) => void;
};

export function RegisterScreen({ initialEmail, onBack, onLogIn }: RegisterScreenProps) {
  const { colors, typography } = useTheme().theme;
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nameError = submitted && !name.trim() ? 'Enter your name.' : null;
  const emailError = submitted && !isValidEmail(email) ? 'Enter a valid email address.' : null;
  const passwordError =
    submitted && password.length < MIN_PASSWORD_LENGTH ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : null;

  const submit = async () => {
    setSubmitted(true);
    setError(null);
    if (!name.trim() || !isValidEmail(email) || password.length < MIN_PASSWORD_LENGTH) return;

    Keyboard.dismiss();
    setBusy('email');
    try {
      await register(name, email, password);
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
      compact
      onBack={onBack}
      title="Create your account"
      subtitle="Learn money basics and get warned about scams."
      footer={
        <>
          <GoogleButton onPress={continueWithGoogle} busy={busy === 'google'} />
          <TextLink prompt="Already have an account?" label="Log in" onPress={() => onLogIn(email)} />
        </>
      }>
      <AuthField
        label="Name"
        Icon={ProfileIcon}
        value={name}
        onChangeText={setName}
        error={nameError}
        placeholder="Your name"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <AuthField
        ref={emailRef}
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
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        placeholder="Create a password"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        passwordRules={`minlength: ${MIN_PASSWORD_LENGTH};`}
        importantForAutofill="yes"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <FormError message={error} />
      <PrimaryButton label="Create account" onPress={submit} busy={busy === 'email'} />

     
    </AuthLayout>
  );
}
