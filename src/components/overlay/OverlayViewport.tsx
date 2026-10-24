import { DialogLayer } from '../dialog/DialogLayer';
import { ToastLayer } from '../toast/ToastLayer';
import { useIsTopViewport } from './useIsTopViewport';

/** Hosts dialogs and toasts. Mount once at the root and once inside every native modal. */
export function OverlayViewport({ topOffset }: { topOffset?: number }) {
  const isTop = useIsTopViewport();
  if (!isTop) return null;

  return (
    <>
      <DialogLayer />
      <ToastLayer topOffset={topOffset} />
    </>
  );
}
