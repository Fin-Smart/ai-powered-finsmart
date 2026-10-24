import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Native modals draw above the root view, so each modal mounts its own overlay viewport and only the
 * most recently mounted one renders dialogs and toasts.
 */
let viewports: number[] = [];
let nextViewportId = 1;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useIsTopViewport() {
  const [id] = useState(() => nextViewportId++);

  useEffect(() => {
    viewports = [...viewports, id];
    notify();
    return () => {
      viewports = viewports.filter((viewport) => viewport !== id);
      notify();
    };
  }, [id]);

  return useSyncExternalStore(subscribe, () => viewports[viewports.length - 1] === id);
}
