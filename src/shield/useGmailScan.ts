import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

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
import {
  fetchEmailPage,
  GmailApiDisabledError,
  GmailAuthError,
  type EmailPage,
  type GmailMessage,
} from './gmail';

export type GmailStatus = 'unavailable' | 'signedOut' | 'needsAccess' | 'paused' | 'loading' | 'ready' | 'error';

const ENABLED_KEY = 'shield:gmail-enabled';

export function useGmailScan() {
  const user = useAuthUser();
  const [status, setStatus] = useState<GmailStatus>(isGoogleSignInAvailable ? 'signedOut' : 'unavailable');
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [enabled, setEnabledState] = useState(true);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const enabledRef = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(ENABLED_KEY)
      .then((stored) => {
        enabledRef.current = stored !== 'false';
        setEnabledState(enabledRef.current);
      })
      .catch(() => undefined)
      .finally(() => setPreferenceLoaded(true));
  }, []);

  /** Resolves true when the inbox loaded. `freshToken` skips the cached Google access token. */
  const refresh = useCallback(async (freshToken = false) => {
    if (!isGoogleSignInAvailable) return false;
    if (!auth.currentUser) {
      setStatus('signedOut');
      setEmails([]);
      setNextPageToken(null);
      return false;
    }
    if (!enabledRef.current) {
      setStatus('paused');
      setEmails([]);
      setNextPageToken(null);
      return false;
    }

    await restoreGoogleSession();
    if (!hasGmailAccess()) {
      setStatus('needsAccess');
      return false;
    }

    setStatus('loading');
    try {
      let page: EmailPage;
      try {
        page = await fetchEmailPage(await getGoogleAccessToken(freshToken));
      } catch (error) {
        // A cached token can predate the Gmail grant; retry once with a newly minted one.
        if (!(error instanceof GmailAuthError) || freshToken) throw error;
        page = await fetchEmailPage(await getGoogleAccessToken(true));
      }

      // Checks may have been switched off while the request was in flight.
      if (!enabledRef.current) return false;
      setEmails(page.emails);
      setNextPageToken(page.nextPageToken);
      setStatus('ready');
      return true;
    } catch (error) {
      if (!enabledRef.current) return false;
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
    if (preferenceLoaded) void refresh();
  }, [user, refresh, preferenceLoaded]);

  const loadMore = useCallback(async () => {
    if (!nextPageToken || isLoadingMore || !enabledRef.current) return;
    setIsLoadingMore(true);
    try {
      const page = await fetchEmailPage(await getGoogleAccessToken(), nextPageToken);
      if (!enabledRef.current) return;
      setEmails((current) => {
        const known = new Set(current.map((email) => email.id));
        return [...current, ...page.emails.filter((email) => !known.has(email.id))];
      });
      setNextPageToken(page.nextPageToken);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't load more emails. Please try again."));
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextPageToken]);

  const setEnabled = useCallback(
    async (value: boolean) => {
      enabledRef.current = value;
      setEnabledState(value);
      AsyncStorage.setItem(ENABLED_KEY, String(value)).catch(() =>
        toast.error("Couldn't save your Gmail setting. It will reset when you restart the app."),
      );

      if (!value) {
        setStatus('paused');
        setEmails([]);
        setNextPageToken(null);
        toast.info('Gmail checks are off. Shield will not read your emails.');
        return;
      }
      if (await refresh()) toast.success('Gmail checks are on');
    },
    [refresh],
  );

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const hasSession = auth.currentUser ? await ensureGoogleSession() : await signInWithGoogle();
      if (!hasSession) return;
      if (!(await requestGmailAccess())) {
        toast.info('Gmail access is needed for Shield to check your emails.');
        return;
      }
      if (!enabledRef.current) {
        enabledRef.current = true;
        setEnabledState(true);
        AsyncStorage.setItem(ENABLED_KEY, 'true').catch(() => undefined);
      }
      if (await refresh(true)) toast.success('Gmail connected');
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't connect Gmail. Please try again."));
    } finally {
      setIsConnecting(false);
    }
  }, [refresh]);

  return {
    status,
    emails,
    enabled,
    isConnecting,
    isSignedIn: user !== null,
    hasMore: nextPageToken !== null,
    isLoadingMore,
    setEnabled,
    connect,
    refresh,
    loadMore,
  };
}
