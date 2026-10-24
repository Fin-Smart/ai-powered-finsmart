import { useSyncExternalStore } from 'react';

import type { SmsLaunchAction } from '../../modules/finsmart-sms';
import { onSignOut } from '../lib/session';

/** A notification tap or sms: link waiting to be opened by the Shield tab. */
let pending: SmsLaunchAction | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

onSignOut(() => setPendingSmsAction(null));

export function setPendingSmsAction(action: SmsLaunchAction | null) {
  pending = action;
  notify();
}

export function takePendingSmsAction() {
  const action = pending;
  if (action) {
    pending = null;
    notify();
  }
  return action;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePendingSmsAction() {
  return useSyncExternalStore(subscribe, () => pending);
}
