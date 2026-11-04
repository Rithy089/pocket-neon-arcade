import { useEffect, useRef } from 'react';
import { soundManager } from '../utils/audio';

/** Shared focus boundary for existing menu wrappers; gameplay is disabled separately. */
export function useArcadeDialogs(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    soundManager.playUiBeep();
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('.fixed.z-50 > div');
    if (!dialog) return;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', dialog.querySelector('h2')?.textContent || 'Arcade menu');
    dialog.tabIndex = -1;
    const root = document.querySelector<HTMLElement>('.arcade-shell');
    if (root) root.inert = true;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, a[href], [tabindex="0"]'));
    (focusable()[0] || dialog).focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0], last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      if (root) root.inert = false;
      previous?.focus();
    };
  }, [open]);
}
