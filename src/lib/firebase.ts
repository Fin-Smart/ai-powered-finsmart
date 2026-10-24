import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Analytics, getAnalytics, isSupported } from 'firebase/analytics';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { CustomProvider, initializeAppCheck } from 'firebase/app-check';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * AI Logic enforces App Check. The JS SDK has no native attestation on iOS/Android,
 * so development uses a debug token registered in the Firebase console.
 * Must run before any service that sends App Check tokens (e.g. AI Logic) is created.
 */
const appCheckDebugToken = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;

if (__DEV__ && appCheckDebugToken) {
  (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
    appCheckDebugToken;

  try {
    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: () => Promise.reject(new Error('No production App Check provider configured.')),
      }),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // App Check already initialized (Fast Refresh)
  }
}

function createAuth(): Auth {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Auth already initialized (Fast Refresh)
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);

/** Analytics is web-only with the Firebase JS SDK. */
export let analytics: Analytics | null = null;

if (Platform.OS === 'web') {
  void isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
