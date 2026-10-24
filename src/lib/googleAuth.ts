import { GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut } from 'firebase/auth';
import { Platform, TurboModuleRegistry } from 'react-native';

import { auth } from './firebase';

type GoogleSignInPackage = typeof import('@react-native-google-signin/google-signin');

export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * `null` in Expo Go (the package throws on import without its native module) and when the
 * OAuth client IDs for this platform haven't been configured yet.
 */
const google: GoogleSignInPackage | null =
  TurboModuleRegistry.get('RNGoogleSignin') && webClientId && (Platform.OS !== 'ios' || iosClientId)
    ? require('@react-native-google-signin/google-signin')
    : null;

google?.GoogleSignin.configure({ webClientId, iosClientId });

export const isGoogleSignInAvailable = google !== null;

export class GoogleSignInUnavailableError extends Error {
  constructor() {
    super('Google sign-in needs the installed FinSmart app and its Google client IDs.');
  }
}

function requireGoogle() {
  if (!google) throw new GoogleSignInUnavailableError();
  return google;
}

/** Signs in with Google and links the account to Firebase Auth. Returns false if the user cancels. */
export async function signInWithGoogle(): Promise<boolean> {
  const { GoogleSignin, isSuccessResponse } = requireGoogle();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return false;

  const idToken = response.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
  await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  return true;
}

export async function signOutEverywhere() {
  if (google) {
    await google.GoogleSignin.signOut().catch(() => undefined);
  }
  await firebaseSignOut(auth);
}

/** Restores the native Google session after an app restart so Gmail tokens can be fetched. */
export async function restoreGoogleSession() {
  if (!google || google.GoogleSignin.getCurrentUser()) return;
  if (google.GoogleSignin.hasPreviousSignIn()) {
    await google.GoogleSignin.signInSilently().catch(() => undefined);
  }
}

export function hasGmailAccess() {
  return google?.GoogleSignin.getCurrentUser()?.scopes.includes(GMAIL_READONLY_SCOPE) ?? false;
}

/** Asks for read-only Gmail access on top of the existing sign-in. Returns false if declined. */
export async function requestGmailAccess(): Promise<boolean> {
  const { GoogleSignin } = requireGoogle();
  const response = await GoogleSignin.addScopes({ scopes: [GMAIL_READONLY_SCOPE] });
  return response?.type === 'success' && response.data.scopes.includes(GMAIL_READONLY_SCOPE);
}

export async function getGoogleAccessToken() {
  const { GoogleSignin } = requireGoogle();
  return (await GoogleSignin.getTokens()).accessToken;
}
