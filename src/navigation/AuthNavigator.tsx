import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

type AuthRoute = 'login' | 'register' | 'forgot';

export function AuthNavigator() {
  const [route, setRoute] = useState<AuthRoute>('login');
  const [email, setEmail] = useState('');

  const go = (next: AuthRoute, typedEmail: string) => {
    setEmail(typedEmail);
    setRoute(next);
  };

  useEffect(() => {
    if (route === 'login') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setRoute('login');
      return true;
    });
    return () => subscription.remove();
  }, [route]);

  return (
    <>
      {route === 'login' ? (
        <LoginScreen
          initialEmail={email}
          onRegister={(typed) => go('register', typed)}
          onForgotPassword={(typed) => go('forgot', typed)}
        />
      ) : route === 'register' ? (
        <RegisterScreen
          initialEmail={email}
          onBack={() => setRoute('login')}
          onLogIn={(typed) => go('login', typed)}
        />
      ) : (
        <ForgotPasswordScreen initialEmail={email} onBack={(typed) => go('login', typed)} />
      )}
      <StatusBar style="light" />
    </>
  );
}
