import {
  GoogleAuthProvider,
  reauthenticateWithCredential,
  signInWithCredential,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import { TurboModuleRegistry } from 'react-native';

import { clearEmailCache } from '../shield/emailCache';
import { auth } from './firebase';

type GoogleSignInPackage = typeof import('@react-native-google-signin/google-signin');

export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

/** The iOS client ID comes from GoogleService-Info.plist; Firebase Auth also needs the web client ID. */
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

/** `null` when the native module is missing or the web client ID hasn't been configured yet. */
const google: GoogleSignInPackage | null =
  TurboModuleRegistry.get('RNGoogleSignin') && webClientId
    ? require('@react-native-google-signin/google-signin')
    : null;

google?.GoogleSignin.configure({ webClientId });

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
  await clearEmailCache();
  if (google) {
    await google.GoogleSignin.signOut().catch(() => undefined);
  }
  await firebaseSignOut(auth);
}

/** Confirms the current Firebase user with Google again, for sensitive actions like deleting the account. */
export async function reauthenticateWithGoogle(): Promise<boolean> {
  const { GoogleSignin, isSuccessResponse } = requireGoogle();
  const user = auth.currentUser;
  if (!user) return false;
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return false;
  const idToken = response.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
  await reauthenticateWithCredential(user, GoogleAuthProvider.credential(idToken));
  return true;
}

/** Removes FinSmart's Google and Gmail permissions from the Google account. */
export async function revokeGoogleAccess() {
  if (!google?.GoogleSignin.getCurrentUser()) return;
  await google.GoogleSignin.revokeAccess().catch(() => undefined);
  await google.GoogleSignin.signOut().catch(() => undefined);
}

/** Restores the native Google session after an app restart so Gmail tokens can be fetched. */
export async function restoreGoogleSession() {
  if (!google || google.GoogleSignin.getCurrentUser()) return;
  if (google.GoogleSignin.hasPreviousSignIn()) {
    await google.GoogleSignin.signInSilently().catch(() => undefined);
  }
}

/**
 * Starts a native Google session without touching the Firebase account, so people who log in with
 * email and password can still connect Gmail. Returns false if they cancel.
 */
export async function ensureGoogleSession(): Promise<boolean> {
  const { GoogleSignin, isSuccessResponse } = requireGoogle();
  if (GoogleSignin.getCurrentUser()) return true;
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  return isSuccessResponse(await GoogleSignin.signIn());
}

export function hasGmailAccess() {
  return google?.GoogleSignin.getCurrentUser()?.scopes.includes(GMAIL_READONLY_SCOPE) ?? false;
}

/** Asks for read-only Gmail access on top of the existing sign-in. Returns false if declined. */
export async function requestGmailAccess(): Promise<boolean> {
  const { GoogleSignin } = requireGoogle();
  try {
    const response = await GoogleSignin.addScopes({ scopes: [GMAIL_READONLY_SCOPE] });
    return response?.type === 'success' && response.data.scopes.includes(GMAIL_READONLY_SCOPE);
  } catch (error) {
    // iOS rejects when the scope is already granted; that still means access is available.
    if (hasGmailAccess()) return true;
    throw error;
  }
}

/**
 * `forceRefresh` drops the cached token first. Android keeps returning a token minted before a scope
 * was added, so a fresh one is needed after `requestGmailAccess` or when Gmail rejects the old one.
 */
export async function getGoogleAccessToken(forceRefresh = false) {
  const { GoogleSignin } = requireGoogle();
  const { accessToken } = await GoogleSignin.getTokens();
  if (!forceRefresh) return accessToken;

  await GoogleSignin.clearCachedAccessToken(accessToken).catch(() => undefined);
  return (await GoogleSignin.getTokens()).accessToken;
}
