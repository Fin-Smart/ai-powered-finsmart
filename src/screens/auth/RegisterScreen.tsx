import { useRef, useState } from 'react';
import { Keyboard, type TextInputInstance } from 'react-native';

import { AuthField } from '../../components/auth/AuthField';
import { PrimaryButton, SocialButtons, type SocialProvider, TextLink } from '../../components/auth/AuthButtons';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { LockIcon, MailIcon, ProfileIcon } from '../../components/icons';
import { toast } from '../../components/toast/toastStore';
import { signInWithApple } from '../../lib/appleAuth';
import { authErrorMessage, isValidEmail, MIN_PASSWORD_LENGTH, register, welcomeMessage } from '../../lib/emailAuth';
import { auth } from '../../lib/firebase';
import { signInWithGoogle } from '../../lib/googleAuth';

type RegisterScreenProps = {
  initialEmail: string;
  onBack: () => void;
  onLogIn: (email: string) => void;
};

export function RegisterScreen({ initialEmail, onBack, onLogIn }: RegisterScreenProps) {
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState<'email' | SocialProvider | null>(null);

  const nameInvalid = submitted && !name.trim();
  const emailInvalid = submitted && !isValidEmail(email);
  const passwordInvalid = submitted && password.length < MIN_PASSWORD_LENGTH;

  const submit = async () => {
    setSubmitted(true);
    const problem = !name.trim()
      ? 'Enter your name.'
      : !isValidEmail(email)
        ? 'Enter a valid email address.'
        : password.length < MIN_PASSWORD_LENGTH
          ? `Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`
          : null;
    if (problem) {
      toast.error(problem);
      return;
    }

    Keyboard.dismiss();
    setBusy('email');
    try {
      await register(name, email, password);
      toast.success('Account created. Check your email to verify it.');
    } catch (caught) {
      toast.error(authErrorMessage(caught));
      setBusy(null);
    }
  };

  const continueWith = async (provider: SocialProvider) => {
    setBusy(provider);
    try {
      if (await (provider === 'google' ? signInWithGoogle() : signInWithApple())) {
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
      compact
      onBack={onBack}
      title="Create your account"
      subtitle="Learn money basics and get warned about scams."
      footer={
        <>
          <SocialButtons
            onGoogle={() => continueWith('google')}
            onApple={() => continueWith('apple')}
            busy={busy === 'email' ? null : busy}
          />
          <TextLink prompt="Already have an account?" label="Log in" onPress={() => onLogIn(email)} />
        </>
      }>
      <AuthField
        label="Name"
        Icon={ProfileIcon}
        value={name}
        onChangeText={setName}
        invalid={nameInvalid}
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

      <PrimaryButton label="Create account" onPress={submit} busy={busy === 'email'} />

     
    </AuthLayout>
  );
}
