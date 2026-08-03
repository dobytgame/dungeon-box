'use client';

import { Check, Copy, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDateTime, formatMoney } from '@/lib/dashboard/format';

export type StorePixDetails = {
  encodedImage?: string;
  payload: string;
  expirationDate: string;
  imageUrl?: string;
};

interface Props {
  orderId: string;
  amountCents: number;
  pix: StorePixDetails;
  onConfirmed: () => void;
}

const POLL_MS = 2500;
const MAX_ATTEMPTS = 120;

export default function StorePixPaymentPanel({
  orderId,
  amountCents,
  pix,
  onConfirmed,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const confirmedRef = useRef(false);

  const copyPayload = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pix.payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Não foi possível copiar o código PIX.');
    }
  }, [pix.payload]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      while (!cancelled && attempts < MAX_ATTEMPTS && !confirmedRef.current) {
        attempts += 1;
        try {
          const res = await fetch(
            `/api/store/checkout/status?orderId=${encodeURIComponent(orderId)}`,
            { cache: 'no-store' }
          );
          const payload = await res.json().catch(() => ({}));

          if (cancelled || confirmedRef.current) return;

          if (res.ok && payload.state === 'approved') {
            confirmedRef.current = true;
            setChecking(false);
            onConfirmed();
            return;
          }
        } catch {
          if (!cancelled) {
            setError('Erro ao verificar pagamento. Tentando novamente…');
          }
        }

        await new Promise((resolve) => window.setTimeout(resolve, POLL_MS));
      }

      if (!cancelled && !confirmedRef.current) {
        setChecking(false);
        setError(
          'Ainda não identificamos o pagamento. Se já pagou, aguarde alguns instantes ou confira em Pagamentos.'
        );
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [orderId, onConfirmed]);

  const expirationLabel = pix.expirationDate
    ? formatDateTime(pix.expirationDate)
    : null;

  return (
    <div className="space-y-5">
      <div className="rounded-sm border border-gold/20 bg-gold/[0.04] p-4">
        <p className="font-display text-xs uppercase tracking-widest text-gold">
          Pague com PIX
        </p>
        <p className="mt-2 text-sm text-stone-300">
          Valor:{' '}
          <span className="font-display text-lg text-white">
            {formatMoney(amountCents)}
          </span>
        </p>
        {expirationLabel ? (
          <p className="mt-1 text-xs text-stone-500">
            Válido até {expirationLabel}
          </p>
        ) : null}
      </div>

      {pix.encodedImage ? (
        <div className="flex justify-center rounded-sm border border-white/[0.08] bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${pix.encodedImage}`}
            alt="QR Code PIX"
            className="h-52 w-52 object-contain"
          />
        </div>
      ) : pix.imageUrl ? (
        <div className="flex justify-center rounded-sm border border-white/[0.08] bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pix.imageUrl}
            alt="QR Code PIX"
            className="h-52 w-52 object-contain"
          />
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs text-stone-500">Pix copia e cola</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={pix.payload}
            className="min-w-0 flex-1 rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-xs text-stone-300"
          />
          <button
            type="button"
            onClick={() => void copyPayload()}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-sm border border-white/10 px-3 py-2 text-xs text-stone-300 transition hover:border-gold/30 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-gold" aria-hidden="true" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copiar
              </>
            )}
          </button>
        </div>
      </div>

      {checking ? (
        <p className="flex items-center gap-2 text-sm text-stone-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Aguardando confirmação do PIX…
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-stone-400" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
