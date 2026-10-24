import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';

import { auth } from './firebase';

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidEmail = (email: string) => EMAIL_PATTERN.test(email.trim());

export async function logIn(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function register(name: string, email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(user, { displayName: name.trim() });
  await sendEmailVerification(user).catch(() => undefined);
}

export async function sendResetLink(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export function authErrorMessage(error: unknown) {
  const code = error instanceof FirebaseError ? error.code : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return "That email and password don't match. Try again or reset your password.";
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Log in instead.';
    case 'auth/invalid-email':
      return "That doesn't look like a valid email address.";
    case 'auth/weak-password':
      return `Choose a stronger password with at least ${MIN_PASSWORD_LENGTH} characters.`;
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'No internet connection. Check your connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact FinSmart support.';
    case 'auth/operation-not-allowed':
      return "Email sign-in isn't turned on for FinSmart yet.";
    default:
      return error instanceof Error && !code ? error.message : 'Something went wrong. Please try again.';
  }
}
