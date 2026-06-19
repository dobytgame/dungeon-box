'use client';

import { X } from 'lucide-react';
import { useAdminOverlay } from '@/lib/admin/use-admin-overlay';
import AdminOverlayPortal from '@/components/admin/AdminOverlayPortal';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  disableEscape?: boolean;
}

export default function AdminSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  disableEscape = false,
}: Props) {
  useAdminOverlay(open, onClose, !disableEscape);

  if (!open) return null;

  return (
    <AdminOverlayPortal>
      <div
        className="fixed inset-0 z-[200] h-[100dvh] w-screen"
        role="presentation"
      >
        <button
          type="button"
          className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-[2px]"
          aria-label="Fechar painel"
          onClick={onClose}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-sheet-title"
          className="absolute inset-y-0 right-0 flex h-full w-full max-w-lg flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl"
        >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Pedido
            </p>
            <h2
              id="admin-sheet-title"
              className="mt-1 truncate font-mono text-base font-medium text-zinc-100"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 truncate text-sm text-zinc-500">{subtitle}</p>
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
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>
    </AdminOverlayPortal>
  );
}
