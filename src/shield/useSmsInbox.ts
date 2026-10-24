import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

import FinsmartSms, { type SmsConversation } from '../../modules/finsmart-sms';
import { errorMessage, toast } from '../components/toast/toastStore';

/** Conversations are built from the most recent N texts; older threads appear as N grows. */
const INITIAL_SCAN_LIMIT = 1500;

/** Android 9 and below grant SMS permissions at runtime even to the default SMS app. */
async function requestRuntimePermissions() {
  if (Platform.OS !== 'android') return;
  const version = Number(Platform.Version);

  if (version < 29) {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);
  }
  if (version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
}

export function useSmsInbox() {
  const [isDefault, setIsDefault] = useState(() => FinsmartSms?.isDefaultSmsApp() ?? false);
  const [conversations, setConversations] = useState<SmsConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [canLoadOlder, setCanLoadOlder] = useState(true);
  const scanLimitRef = useRef(INITIAL_SCAN_LIMIT);

  const refresh = useCallback(async () => {
    if (!FinsmartSms) return;
    const nowDefault = FinsmartSms.isDefaultSmsApp();
    setIsDefault(nowDefault);
    if (!nowDefault) {
      setConversations([]);
      return;
    }

    setIsLoading(true);
    try {
      setConversations(await FinsmartSms.getConversations(scanLimitRef.current));
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't load your texts. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Scans further back for older conversations; stops offering once nothing new turns up. */
  const loadOlder = useCallback(async () => {
    if (!FinsmartSms || isLoadingOlder) return;
    setIsLoadingOlder(true);
    try {
      const previousCount = conversations.length;
      scanLimitRef.current *= 2;
      const loaded = await FinsmartSms.getConversations(scanLimitRef.current);
      setConversations(loaded);
      if (loaded.length <= previousCount) setCanLoadOlder(false);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't load older texts. Please try again."));
    } finally {
      setIsLoadingOlder(false);
    }
  }, [conversations.length, isLoadingOlder]);

  useEffect(() => {
    if (!FinsmartSms) return;
    void refresh();

    const subscriptions = [
      FinsmartSms.addListener('onSmsReceived', () => void refresh()),
      FinsmartSms.addListener('onSmsChanged', () => void refresh()),
      // The user can change the default SMS app in Settings while FinSmart is in the background.
      AppState.addEventListener('change', (state) => {
        if (state === 'active') void refresh();
      }),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [refresh]);

  const becomeDefault = useCallback(async () => {
    if (!FinsmartSms) return false;
    setIsRequesting(true);
    try {
      const granted = await FinsmartSms.requestDefaultSmsApp();
      if (granted) {
        await requestRuntimePermissions();
        toast.success('FinSmart is now your SMS app');
      } else {
        toast.info("FinSmart wasn't set as your SMS app. Shield can't check your texts until it is.");
      }
      await refresh();
      return granted;
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't change your SMS app. Please try again."));
      return false;
    } finally {
      setIsRequesting(false);
    }
  }, [refresh]);

  return {
    isSupported: FinsmartSms !== null,
    isDefault,
    conversations,
    isLoading,
    isRequesting,
    isLoadingOlder,
    canLoadOlder,
    refresh,
    loadOlder,
    becomeDefault,
  };
}
