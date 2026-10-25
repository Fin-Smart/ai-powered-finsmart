import { getApp } from '@react-native-firebase/app';
import { initializeAppCheck } from '@react-native-firebase/app-check';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';

/** Configured natively from google-services.json / GoogleService-Info.plist. */
export const app = getApp();

/**
 * Release builds attest with App Attest (iOS) and Play Integrity (Android). Development builds use
 * the debug provider; register its token per app in Firebase console > App Check > Manage debug tokens.
 * Sideloaded Android APKs can't pass Play Integrity, so any Android build given a debug token uses it.
 * Must be initialized before AI Logic, Firestore or Storage send requests.
 */
const debugToken = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN || undefined;

export const appCheck = initializeAppCheck(app, {
  provider: {
    providerOptions: {
      android: { provider: __DEV__ || debugToken ? 'debug' : 'playIntegrity', debugToken },
      apple: { provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback', debugToken },
    },
  },
  isTokenAutoRefreshEnabled: true,
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
