import { useCallback, useEffect, useState } from 'react';

import { AnimatedSplash } from '../components/AnimatedSplash';
import { useAuthState } from '../hooks/useAuthUser';
import { hasSeenOnboarding, markOnboardingSeen } from '../lib/onboarding';
import { OnboardingScreen, type OnboardingExit } from '../screens/OnboardingScreen';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';

export function RootNavigator() {
  const { user, initializing } = useAuthState();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [authRoute, setAuthRoute] = useState<OnboardingExit>('login');
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    void hasSeenOnboarding().then(setOnboarded);
  }, []);

  const finishOnboarding = (next: OnboardingExit) => {
    setAuthRoute(next);
    setOnboarded(true);
    void markOnboardingSeen();
  };

  const hideSplash = useCallback(() => setSplashVisible(false), []);
  const ready = !initializing && onboarded !== null;

  return (
    <>
      {!ready ? null : user ? (
        <TabNavigator />
      ) : onboarded ? (
        <AuthNavigator initialRoute={authRoute} />
      ) : (
        <OnboardingScreen onDone={finishOnboarding} />
      )}
      {splashVisible ? <AnimatedSplash ready={ready} onFinish={hideSplash} /> : null}
    </>
  );
}
