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
import { fetchRecentEmails, GmailApiDisabledError, GmailAuthError, type GmailMessage } from './gmail';

export type GmailStatus = 'unavailable' | 'signedOut' | 'needsAccess' | 'loading' | 'ready' | 'error';

export function useGmailScan() {
  const user = useAuthUser();
  const [status, setStatus] = useState<GmailStatus>(isGoogleSignInAvailable ? 'signedOut' : 'unavailable');
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  /** Resolves true when the inbox loaded. `freshToken` skips the cached Google access token. */
  const refresh = useCallback(async (freshToken = false) => {
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
      try {
        setEmails(await fetchRecentEmails(await getGoogleAccessToken(freshToken)));
      } catch (error) {
        // A cached token can predate the Gmail grant; retry once with a newly minted one.
        if (!(error instanceof GmailAuthError) || freshToken) throw error;
        setEmails(await fetchRecentEmails(await getGoogleAccessToken(true)));
      }
      setStatus('ready');
      return true;
    } catch (error) {
      if (error instanceof GmailAuthError) {
        setStatus('needsAccess');
        toast.error("Gmail didn't give FinSmart access. Tap Connect Gmail and allow reading your email.");
      } else if (error instanceof GmailApiDisabledError) {
        setStatus('error');
        toast.error(error.message);
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
      if (await refresh(true)) toast.success('Gmail connected');
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't connect Gmail. Please try again."));
    } finally {
      setIsConnecting(false);
    }
  }, [refresh]);

  return { status, emails, isConnecting, isSignedIn: user !== null, connect, refresh };
}
