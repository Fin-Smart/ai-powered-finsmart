import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteUser, sendEmailVerification, sendPasswordResetEmail, type User } from '@react-native-firebase/auth';

import { deleteUserData } from '../budget/budgetRepo';
import { clearConversations } from '../coach/chatHistory';
import { clearHabits } from '../coach/habits';
import { clearEmailCache } from '../shield/emailCache';
import { auth } from './firebase';
import { reauthenticateWithGoogle, revokeGoogleAccess, signOutEverywhere } from './googleAuth';

/** Firebase only allows deleting an account shortly after signing in. */
const RECENT_SIGN_IN_MS = 5 * 60 * 1000;

export type SignInMethod = 'google' | 'password';

export function signInMethods(user: User): SignInMethod[] {
  return user.providerData.flatMap((provider): SignInMethod[] =>
    provider.providerId === 'google.com' ? ['google'] : provider.providerId === 'password' ? ['password'] : [],
  );
}

export async function sendPasswordChangeLink() {
  const email = auth.currentUser?.email;
  if (!email) throw new Error('Your account has no email address to send the link to.');
  await sendPasswordResetEmail(auth, email);
  return email;
}

export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in again to verify your email.');
  await sendEmailVerification(user);
}

export class SignInAgainError extends Error {
  constructor() {
    super('For your security, log in again, then delete your account.');
  }
}

/**
 * Deletes budgets, Smart Coach history, Google permissions and the Firebase account.
 * Returns false if the person cancels the Google confirmation.
 */
export async function deleteAccount(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) throw new SignInAgainError();

  const lastSignIn = Date.parse(user.metadata.lastSignInTime ?? '');
  if (!(Date.now() - lastSignIn < RECENT_SIGN_IN_MS)) {
    if (!signInMethods(user).includes('google')) throw new SignInAgainError();
    if (!(await reauthenticateWithGoogle())) return false;
  }

  await deleteUserData(user.uid);
  await clearConversations();
  await clearEmailCache();
  await clearHabits();
  await AsyncStorage.multiRemove(['shield:gmail-enabled', 'settings:currency']).catch(() => undefined);
  await revokeGoogleAccess();

  try {
    await deleteUser(user);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'auth/requires-recent-login') {
      throw new SignInAgainError();
    }
    throw error;
  }
  await signOutEverywhere().catch(() => undefined);
  return true;
}
