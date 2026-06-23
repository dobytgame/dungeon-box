'use client';

import { X } from 'lucide-react';
import { useAdminOverlay } from '@/lib/admin/use-admin-overlay';
import AdminOverlayPortal from '@/components/admin/AdminOverlayPortal';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  disableEscape?: boolean;
}

export default function CycleDetailModal({
  open,
  onClose,
  title,
  description,
  children,
  disableEscape = false,
}: Props) {
  useAdminOverlay(open, disableEscape ? () => {} : onClose);

  if (!open) return null;

  return (
    <AdminOverlayPortal>
      <div
        className="fixed inset-0 z-[220] flex h-[100dvh] w-screen items-end justify-center p-0 sm:items-center sm:p-6"
        role="presentation"
      >
        <button
          type="button"
          className="absolute inset-0 cursor-pointer bg-black/80 backdrop-blur-[2px]"
          aria-label="Fechar modal"
          onClick={disableEscape ? undefined : onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cycle-detail-modal-title"
          className="relative z-10 flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded border border-zinc-800 bg-zinc-950 shadow-2xl sm:rounded-lg"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2
                id="cycle-detail-modal-title"
                className="font-mono text-sm font-medium uppercase tracking-[0.14em] text-zinc-100 sm:text-base"
              >
                {title}
              </h2>
              {description ? (
                <p className="mt-2 truncate text-sm text-zinc-500">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded border border-zinc-800 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            {children}
          </div>
        </div>
      </div>
    </AdminOverlayPortal>
  );
}
