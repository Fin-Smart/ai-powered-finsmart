import { useSyncExternalStore } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastAction = { label: string; onPress: () => void };

export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
  duration: number;
};

type ToastOptions = { action?: ToastAction; duration?: number };

const DEFAULT_ERROR = 'Something went wrong. Please try again.';

let current: Toast | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function show(kind: ToastKind, message: string, options: ToastOptions = {}) {
  current = {
    id: nextId++,
    kind,
    message,
    action: options.action,
    duration: options.duration ?? (options.action ? 6000 : kind === 'error' ? 5000 : 3000),
  };
  notify();
}

/** Human-readable text for anything thrown; never exposes stack traces. */
export function errorMessage(error: unknown, fallback = DEFAULT_ERROR) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** The app's only channel for surfacing errors and confirmations to the user. */
export const toast = {
  success: (message: string, options?: ToastOptions) => show('success', message, options),
  error: (message: string, options?: ToastOptions) => show('error', message, options),
  info: (message: string, options?: ToastOptions) => show('info', message, options),
  dismiss: (id?: number) => {
    if (current && (id === undefined || current.id === id)) {
      current = null;
      notify();
    }
  },
};

export function useCurrentToast() {
  return useSyncExternalStore(subscribe, () => current);
}
