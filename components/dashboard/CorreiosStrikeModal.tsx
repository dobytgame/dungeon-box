'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X } from 'lucide-react';
import {
  CORREIOS_STRIKE_IMAGE,
  CORREIOS_STRIKE_NOTICE_KEY,
  CORREIOS_STRIKE_PARAGRAPHS,
  CORREIOS_STRIKE_TITLE,
  CORREIOS_STRIKE_WHATSAPP_URL,
} from '@/lib/dashboard/correios-strike';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface Props {
  enabled: boolean;
}

export default function CorreiosStrikeModal({ enabled }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (window.localStorage.getItem(CORREIOS_STRIKE_NOTICE_KEY) === '1') {
        return;
      }
    } catch {
      // Storage pode estar bloqueado; ainda assim mostramos o aviso.
    }
    setOpen(true);
  }, [enabled]);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(CORREIOS_STRIKE_NOTICE_KEY, '1');
    } catch {
      // Sem persistência, o modal some só nesta visita.
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, dismiss]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-stone-950/80 backdrop-blur-sm"
        aria-label="Fechar comunicado"
        onClick={dismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="correios-strike-title"
        className="relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-sm border border-white/10 bg-stone-950 shadow-2xl sm:rounded-sm"
      >
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden border-b border-white/[0.06] bg-stone-900">
          <Image
            src={CORREIOS_STRIKE_IMAGE}
            alt="Correios em greve"
            fill
            priority
            sizes="(max-width: 640px) 100vw, 576px"
            className="object-cover"
          />
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm border border-white/15 bg-stone-950/80 text-stone-200 backdrop-blur-sm transition-colors hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="font-display text-[11px] uppercase tracking-[0.32em] text-ember">
            Aviso de entrega
          </p>
          <h2
            id="correios-strike-title"
            className="mt-2 font-display text-2xl uppercase leading-tight tracking-wide text-white sm:text-3xl"
          >
            {CORREIOS_STRIKE_TITLE}
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-stone-300">
            {CORREIOS_STRIKE_PARAGRAPHS.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-white/[0.06] bg-stone-950/95 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={dismiss}
            className="min-h-[44px] cursor-pointer rounded-sm border border-white/15 px-4 py-2.5 text-sm text-stone-300 transition-colors hover:border-white/25 hover:text-white"
          >
            Entendi
          </button>
          <a
            href={CORREIOS_STRIKE_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-sm bg-[#25D366] px-5 py-2.5 font-display text-xs uppercase tracking-widest text-white transition-colors hover:bg-[#1ebe5d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Dúvidas no WhatsApp
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
