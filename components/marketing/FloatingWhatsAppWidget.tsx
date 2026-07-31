'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  trackWhatsAppLeadSubmit,
  trackWhatsAppWidgetOpen,
} from '@/lib/analytics/whatsapp-lead';
import { COMPANY } from '@/lib/legal/constants';
import { maskPhone } from '@/lib/masks';
import {
  buildWhatsAppChatUrl,
  buildWhatsAppLeadMessage,
} from '@/lib/whatsapp/chat';

const UTM_STORAGE_KEY = 'dbx_utm_params';

type UtmParams = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
};

function readUtmFromUrl(): UtmParams {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    utmContent: params.get('utm_content'),
    utmTerm: params.get('utm_term'),
  };
}

function hasUtmValues(utm: UtmParams): boolean {
  return Object.values(utm).some((value) => Boolean(value?.trim()));
}

function getStoredUtmParams(): UtmParams {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UtmParams;
  } catch {
    return {};
  }
}

function persistUtmParams(utm: UtmParams): void {
  if (typeof window === 'undefined' || !hasUtmValues(utm)) return;
  sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
}

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
  source?: string;
}

export default function FloatingWhatsAppWidget({
  source = 'floating_widget',
}: Props) {
  const formId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [wiggle, setWiggle] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [utm, setUtm] = useState<UtmParams>({});

  useEffect(() => {
    const fromUrl = readUtmFromUrl();
    if (hasUtmValues(fromUrl)) {
      persistUtmParams(fromUrl);
      setUtm(fromUrl);
      return;
    }
    setUtm(getStoredUtmParams());
  }, []);

  const triggerWiggle = useCallback(() => {
    setWiggle(true);
    window.setTimeout(() => setWiggle(false), 520);
  }, []);

  const openPanel = useCallback(() => {
    triggerWiggle();
    setOpen(true);
    setError('');
    trackWhatsAppWidgetOpen({
      source,
      pagePath: window.location.pathname,
    });
  }, [source, triggerWiggle]);

  const closePanel = useCallback(() => {
    setOpen(false);
    setError('');
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closePanel();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closePanel, open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      setError('Preencha todos os campos.');
      setSubmitting(false);
      return;
    }

    const pagePath = window.location.pathname;
    const pageUrl = window.location.href;

    try {
      const res = await fetch('/api/leads/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          source,
          pagePath,
          pageUrl,
          utmSource: utm.utmSource ?? null,
          utmMedium: utm.utmMedium ?? null,
          utmCampaign: utm.utmCampaign ?? null,
          utmContent: utm.utmContent ?? null,
          utmTerm: utm.utmTerm ?? null,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível enviar. Tente novamente.');
        setSubmitting(false);
        return;
      }

      trackWhatsAppLeadSubmit({
        source,
        pagePath,
        email: trimmedEmail,
      });

      const message = buildWhatsAppLeadMessage({
        name: trimmedName,
        email: trimmedEmail,
        phoneDisplay: trimmedPhone,
        pagePath,
      });

      const chatUrl = buildWhatsAppChatUrl(message);
      window.open(chatUrl, '_blank', 'noopener,noreferrer');
      setOpen(false);
      setName('');
      setEmail('');
      setPhone('');
    } catch {
      setError('Não foi possível enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-4 z-[80] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <>
          <button
            type="button"
            aria-label="Fechar formulário de WhatsApp"
            className="pointer-events-auto fixed inset-0 z-[79] bg-stone-950/70 backdrop-blur-[2px]"
            onClick={closePanel}
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${formId}-title`}
            className="pointer-events-auto relative z-[81] w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-stone-200/80 bg-stone-50 text-stone-900 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          >
            <div className="bg-[#25D366] px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
                    Atendimento
                  </p>
                  <h2
                    id={`${formId}-title`}
                    className="mt-1 font-display text-2xl uppercase leading-none tracking-wide"
                  >
                    Fale no WhatsApp
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/90">
                Preencha seus dados e abriremos uma conversa com nossa equipe.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
              <div>
                <label
                  htmlFor={`${formId}-name`}
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-500"
                >
                  Nome
                </label>
                <input
                  id={`${formId}-name`}
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none ring-[#25D366]/30 transition focus:border-[#25D366] focus:ring-2"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label
                  htmlFor={`${formId}-email`}
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-500"
                >
                  E-mail
                </label>
                <input
                  id={`${formId}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none ring-[#25D366]/30 transition focus:border-[#25D366] focus:ring-2"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label
                  htmlFor={`${formId}-phone`}
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-500"
                >
                  WhatsApp
                </label>
                <input
                  id={`${formId}-phone`}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  required
                  value={phone}
                  onChange={(event) => setPhone(maskPhone(event.target.value))}
                  className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none ring-[#25D366]/30 transition focus:border-[#25D366] focus:ring-2"
                  placeholder="(11) 99999-9999"
                />
              </div>

              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1ebe5d] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <WhatsAppIcon className="h-4 w-4" />
                )}
                Conversar no WhatsApp
              </button>

              <p className="text-[11px] leading-relaxed text-stone-500">
                Ao enviar, você concorda em ser contatado pela DungeonBox. Seus
                dados são usados conforme a{' '}
                <a
                  href="/privacidade"
                  className="underline underline-offset-2 hover:text-stone-700"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Política de Privacidade
                </a>
                .
              </p>
            </form>
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={openPanel}
        aria-label={`WhatsApp ${COMPANY.whatsappDisplay}`}
        aria-expanded={open}
        className={`pointer-events-auto group relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_40px_rgba(37,211,102,0.45)] transition hover:scale-105 hover:bg-[#1ebe5d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] ${wiggle ? 'whatsapp-fab-wiggle' : ''}`}
      >
        <span
          className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-ping"
          aria-hidden="true"
        />
        <span
          className="absolute inset-0 rounded-full bg-[#25D366]/20 blur-md transition group-hover:bg-[#25D366]/35"
          aria-hidden="true"
        />
        <WhatsAppIcon className="relative h-7 w-7" />
      </button>
    </div>
  );
}
