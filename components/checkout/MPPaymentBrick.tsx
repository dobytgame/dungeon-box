'use client';

import { useEffect, useRef, useState } from 'react';
import { MP_PUBLIC_KEY } from '@/lib/mercadopago-public';

interface CardFormData {
  token: string;
  payer?: {
    email?: string;
    identification?: { type?: string; number?: string };
  };
}

interface Props {
  amount: number;
  payerEmail: string;
  payerCpf?: string | null;
  disabled?: boolean;
  onSubmit: (cardData: CardFormData) => Promise<void>;
  onError: (message: string) => void;
}

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string }
    ) => {
      bricks: () => {
        create: (
          brick: string,
          containerId: string,
          settings: Record<string, unknown>
        ) => Promise<{ unmount: () => void }>;
      };
    };
    cardPaymentBrickController?: { unmount: () => void };
  }
}

export default function MPPaymentBrick({
  amount,
  payerEmail,
  payerCpf,
  disabled,
  onSubmit,
  onError,
}: Props) {
  const containerIdRef = useRef(`mp-card-${Math.random().toString(36).slice(2)}`);
  const containerId = containerIdRef.current;
  const controllerRef = useRef<{ unmount: () => void } | null>(null);
  const onSubmitRef = useRef(onSubmit);
  const onErrorRef = useRef(onError);
  const [loading, setLoading] = useState(true);
  const [scriptError, setScriptError] = useState('');

  useEffect(() => {
    onSubmitRef.current = onSubmit;
    onErrorRef.current = onError;
  }, [onSubmit, onError]);

  useEffect(() => {
    if (!MP_PUBLIC_KEY || disabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function mountBrick() {
      try {
        await loadMpScript();
        if (cancelled || !window.MercadoPago) return;

        controllerRef.current?.unmount();

        const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
        const bricks = mp.bricks();

        const cpfDigits = payerCpf?.replace(/\D/g, '') ?? '';
        const payer: Record<string, unknown> = { email: payerEmail };
        if (cpfDigits.length === 11) {
          payer.identification = { type: 'CPF', number: cpfDigits };
        }

        controllerRef.current = await bricks.create('cardPayment', containerId, {
          initialization: {
            amount,
            payer,
          },
          customization: {
            paymentMethods: {
              maxInstallments: 1,
              minInstallments: 1,
            },
            visual: {
              style: {
                theme: 'dark',
                customVariables: {
                  baseColor: '#ff6b2b',
                  borderRadiusSmall: '0px',
                  borderRadiusMedium: '0px',
                  borderRadiusLarge: '0px',
                  formBackgroundColor: 'transparent',
                  inputBackgroundColor: '#0c0a09',
                },
              },
              texts: {
                formSubmit: 'Confirmar assinatura',
              },
            },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setLoading(false);
            },
            onError: (error: { message?: string }) => {
              onErrorRef.current(
                error?.message ?? 'Erro no formulário de pagamento.'
              );
              setLoading(false);
            },
            onSubmit: (cardData: CardFormData) =>
              new Promise<void>((resolve, reject) => {
                onSubmitRef
                  .current(cardData)
                  .then(() => resolve())
                  .catch((err) => {
                    reject(err);
                  });
              }),
          },
        });

        window.cardPaymentBrickController = controllerRef.current;
      } catch (err) {
        if (!cancelled) {
          setScriptError(
            err instanceof Error ? err.message : 'Falha ao carregar Mercado Pago.'
          );
          setLoading(false);
        }
      }
    }

    mountBrick();

    return () => {
      cancelled = true;
      controllerRef.current?.unmount();
      controllerRef.current = null;
    };
  }, [amount, payerEmail, payerCpf, disabled, containerId]);

  if (!MP_PUBLIC_KEY) {
    return (
      <p className="text-sm text-stone-500">
        Configure <code className="text-stone-400">NEXT_PUBLIC_MP_PUBLIC_KEY</code>{' '}
        para exibir o formulário de cartão.
      </p>
    );
  }

  if (disabled) {
    return (
      <p className="text-sm text-stone-500">
        Complete o CPF no perfil para liberar o pagamento.
      </p>
    );
  }

  return (
    <div className="relative min-h-[200px]">
      {loading ? (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-stone-500">
          Carregando formulário seguro…
        </p>
      ) : null}
      {scriptError ? (
        <p className="text-sm text-red-400" role="alert">
          {scriptError}
        </p>
      ) : null}
      <div id={containerId} className="w-full" />
    </div>
  );
}

function loadMpScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.MercadoPago) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-mp-sdk="v2"]'
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.MercadoPago) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('SDK Mercado Pago indisponível.'))
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.dataset.mpSdk = 'v2';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('SDK Mercado Pago indisponível.'));
    document.head.appendChild(script);
  });
}
