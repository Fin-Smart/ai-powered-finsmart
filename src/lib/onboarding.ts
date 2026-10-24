import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_KEY = 'onboarding:done';

export async function hasSeenOnboarding() {
  return (await AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null)) === '1';
}

export async function markOnboardingSeen() {
  await AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => undefined);
}
