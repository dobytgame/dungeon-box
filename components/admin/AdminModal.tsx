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
}

export default function AdminModal({
  open,
  onClose,
  title,
  description,
  children,
}: Props) {
  useAdminOverlay(open, onClose);

  if (!open) return null;

  return (
    <AdminOverlayPortal>
      <div
        className="fixed inset-0 z-[210] flex h-[100dvh] w-screen items-end justify-center p-0 sm:items-center sm:p-4"
        role="presentation"
      >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/75 backdrop-blur-[2px]"
        aria-label="Fechar modal"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded border border-zinc-800 bg-zinc-950 shadow-2xl sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div>
            <h2
              id="admin-modal-title"
              className="font-mono text-sm font-medium uppercase tracking-[0.14em] text-zinc-100"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm text-zinc-500">{description}</p>
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
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
    </AdminOverlayPortal>
  );
}
