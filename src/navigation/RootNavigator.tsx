import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useAuthState } from '../hooks/useAuthUser';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';

export function RootNavigator() {
  const { user, initializing } = useAuthState();

  useEffect(() => {
    if (!initializing) {
      void SplashScreen.hideAsync();
    }
  }, [initializing]);

  if (initializing) {
    return null;
  }

  return user ? <TabNavigator /> : <AuthNavigator />;
}
