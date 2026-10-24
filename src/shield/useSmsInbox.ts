import { useCallback, useEffect, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

import FinsmartSms, { type SmsConversation } from '../../modules/finsmart-sms';

const SCAN_LIMIT = 1500;

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
      setConversations(await FinsmartSms.getConversations(SCAN_LIMIT));
    } catch (error) {
      if (__DEV__) console.warn('[Shield] loading texts failed', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      if (granted) await requestRuntimePermissions();
      await refresh();
      return granted;
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
    refresh,
    becomeDefault,
  };
}
