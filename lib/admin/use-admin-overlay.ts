'use client';

import { useEffect } from 'react';

export function useAdminOverlay(
  open: boolean,
  onClose: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!open || !enabled) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, enabled]);
}
