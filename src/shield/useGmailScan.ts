import { useCallback, useEffect, useState } from 'react';

import { errorMessage, toast } from '../components/toast/toastStore';
import { useAuthUser } from '../hooks/useAuthUser';
import { auth } from '../lib/firebase';
import {
  ensureGoogleSession,
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

  /** Resolves true when the inbox loaded. */
  const refresh = useCallback(async () => {
    if (!isGoogleSignInAvailable) return false;
    if (!auth.currentUser) {
      setStatus('signedOut');
      setEmails([]);
      return false;
    }

    await restoreGoogleSession();
    if (!hasGmailAccess()) {
      setStatus('needsAccess');
      return false;
    }

    setStatus('loading');
    try {
      setEmails(await fetchRecentEmails(await getGoogleAccessToken()));
      setStatus('ready');
      return true;
    } catch (error) {
      if (error instanceof GmailAuthError) {
        setStatus('needsAccess');
        toast.error('Gmail access expired. Tap Connect Gmail to reconnect.');
      } else {
        setStatus('error');
        toast.error(errorMessage(error, "Couldn't load your Gmail. Please try again."));
      }
      return false;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [user, refresh]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const hasSession = auth.currentUser ? await ensureGoogleSession() : await signInWithGoogle();
      if (!hasSession) return;
      if (!(await requestGmailAccess())) {
        toast.info('Gmail access is needed for Shield to check your emails.');
        return;
      }
      if (await refresh()) toast.success('Gmail connected');
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't connect Gmail. Please try again."));
    } finally {
      setIsConnecting(false);
    }
  }, [refresh]);

  return { status, emails, isConnecting, isSignedIn: user !== null, connect, refresh };
}
