import { useSyncExternalStore } from 'react';

export type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export type DialogButton = {
  label: string;
  style?: DialogButtonStyle;
  onPress?: () => void;
};

export type Dialog = {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
};

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

let current: Dialog | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** In-app replacement for `Alert.alert`, rendered as a liquid glass dialog. */
export const dialog = {
  show(options: Omit<Dialog, 'id'>) {
    current = { id: nextId++, ...options };
    notify();
  },

  /** Resolves `true` when the user confirms and `false` when they cancel or press Back. */
  confirm({ title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', destructive }: ConfirmOptions) {
    return new Promise<boolean>((resolve) => {
      dialog.show({
        title,
        message,
        buttons: [
          { label: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
          { label: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
        ],
      });
    });
  },

  dismiss(id: number) {
    if (current?.id === id) {
      current = null;
      notify();
    }
  },
};

export function useCurrentDialog() {
  return useSyncExternalStore(subscribe, () => current);
}
