import { OAuthProvider, reauthenticateWithCredential, revokeToken, signInWithCredential } from '@react-native-firebase/auth';
import { requireOptionalNativeModule } from 'expo';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { auth } from './firebase';

type CryptoPackage = typeof import('expo-crypto');

/** Sign in with Apple is iOS-only, and older dev builds may not include the native modules yet. */
export const isAppleSignInAvailable =
  Platform.OS === 'ios' &&
  requireOptionalNativeModule('ExpoAppleAuthentication') !== null &&
  requireOptionalNativeModule('ExpoCrypto') !== null;

export class AppleSignInUnavailableError extends Error {
  constructor() {
    super('Sign in with Apple needs the installed FinSmart app on an iPhone or iPad.');
  }
}

/**
 * Shows the Apple sheet and returns a Firebase credential, or null if the user cancels. Firebase
 * checks Apple's token against the raw nonce, while Apple only ever sees its SHA-256 hash.
 */
async function requestAppleCredential() {
  if (!isAppleSignInAvailable) throw new AppleSignInUnavailableError();
  const Crypto: CryptoPackage = require('expo-crypto');

  const rawNonce = Crypto.randomUUID();
  const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let apple: AppleAuthentication.AppleAuthenticationCredential;
  try {
    apple = await AppleAuthentication.signInAsync({
      nonce,
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
      return null;
    }
    throw error;
  }

  return {
    // Apple only shares the name on the very first authorization; Firebase stores it as the display name.
    credential: new OAuthProvider('apple.com').credential({
      idToken: apple.identityToken ?? undefined,
      rawNonce,
      fullName: apple.fullName ?? undefined,
    }),
    authorizationCode: apple.authorizationCode,
  };
}

/** Signs in with Apple and links the account to Firebase Auth. Returns false if the user cancels. */
export async function signInWithApple(): Promise<boolean> {
  const result = await requestAppleCredential();
  if (!result) return false;
  await signInWithCredential(auth, result.credential);
  return true;
}

/**
 * Confirms the current Firebase user with Apple again before deleting the account. Returns the fresh
 * authorization code needed to revoke Apple's token, or null if the user cancels.
 */
export async function reauthenticateWithApple(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const result = await requestAppleCredential();
  if (!result) return null;
  await reauthenticateWithCredential(user, result.credential);
  return result.authorizationCode;
}

/** Apple requires apps to revoke its tokens when an account is deleted. */
export async function revokeAppleAccess(authorizationCode: string) {
  await revokeToken(auth, authorizationCode);
}
