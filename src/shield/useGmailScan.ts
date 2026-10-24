import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useAuthUser } from '../hooks/useAuthUser';
import { auth } from '../lib/firebase';
import {
  getGoogleAccessToken,
  hasGmailAccess,
  isGoogleSignInAvailable,
  requestGmailAccess,
  restoreGoogleSession,
  signInWithGoogle,
} from '../lib/googleAuth';
import { fetchRecentEmails, GmailAuthError, type GmailMessage } from './gmail';

export type GmailStatus = 'unavailable' | 'signedOut' | 'needsAccess' | 'loading' | 'ready' | 'error';

export function useGmailScan() {
  const user = useAuthUser();
  const [status, setStatus] = useState<GmailStatus>(isGoogleSignInAvailable ? 'signedOut' : 'unavailable');
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const refresh = useCallback(async () => {
    if (!isGoogleSignInAvailable) return;
    if (!auth.currentUser) {
      setStatus('signedOut');
      setEmails([]);
      return;
    }

    await restoreGoogleSession();
    if (!hasGmailAccess()) {
      setStatus('needsAccess');
      return;
    }

    setStatus('loading');
    try {
      setEmails(await fetchRecentEmails(await getGoogleAccessToken()));
      setStatus('ready');
    } catch (error) {
      if (__DEV__) console.warn('[Shield] loading Gmail failed', error);
      setStatus(error instanceof GmailAuthError ? 'needsAccess' : 'error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [user, refresh]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      if (!auth.currentUser && !(await signInWithGoogle())) return;
      if (!(await requestGmailAccess())) return;
      await refresh();
    } catch (error) {
      Alert.alert("Couldn't connect Gmail", error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsConnecting(false);
    }
  }, [refresh]);

  return { status, emails, isConnecting, isSignedIn: user !== null, connect, refresh };
}
