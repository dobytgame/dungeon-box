'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Loader2, Palette } from 'lucide-react';
import AsaasPaymentForm, {
  type AsaasCardPayload,
} from '@/components/checkout/AsaasPaymentForm';
import DashboardCard from '@/components/dashboard/DashboardCard';
import {
  PAINT_KIT_BUMPS,
  type PaintKitBumpId,
} from '@/lib/checkout/order-bumps';
import { formatMoney, relOne } from '@/lib/dashboard/format';
import type { Subscription } from '@/lib/dashboard/types';
import { subscriptionEligibleForPaintKitAddon } from '@/lib/subscriptions/paint-kit-addon';

interface Props {
  subscription: Subscription;
}

export default function PaintKitAddon({ subscription }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [recurring, setRecurring] = useState(false);
  const [selectedBump, setSelectedBump] = useState<PaintKitBumpId>('profissional');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const plan = relOne(subscription.plans);
  const bump = PAINT_KIT_BUMPS.find((item) => item.id === selectedBump);

  if (!subscriptionEligibleForPaintKitAddon(subscription)) {
    return null;
  }

  if (success) {
    return (
      <DashboardCard title="Kit de pintura adicionado" accent="gold">
        <div className="flex items-start gap-3 text-sm text-stone-300">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
          <p>
            {recurring
              ? 'O kit de pintura passará a acompanhar cada caixa do seu plano a partir do próximo ciclo de cobrança.'
              : 'O kit de pintura será enviado junto com a sua próxima caixa, sem custo extra de frete.'}
          </p>
        </div>
      </DashboardCard>
    );
  }

  async function handlePurchase(card: AsaasCardPayload) {
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/subscriptions/paint-kit/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionId: subscription.id,
            bumpId: selectedBump,
            recurring,
            creditCard: card,
          }),
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(
            typeof payload.error === 'string'
              ? payload.error
              : 'Não foi possível concluir a compra.'
          );
          return;
        }

        setSuccess(true);
        router.refresh();
      } catch {
        setError('Erro de conexão. Tente novamente.');
      }
    });
  }

  return (
    <DashboardCard title="Adicionar kit de pintura" accent="gold">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-sm border border-gold/20 bg-gold/5 p-4">
          <Palette className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
          <div className="space-y-1 text-sm text-stone-300">
            <p>
              Sua assinatura do plano{' '}
              <span className="text-white">{plan?.name ?? 'atual'}</span> ainda não
              inclui kit de pintura. Adicione agora e receba junto com a próxima
              caixa — <span className="text-gold">frete grátis</span> (envio no mesmo
              pacote da dungeon).
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {PAINT_KIT_BUMPS.map((item) => {
            const isSelected = selectedBump === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedBump(item.id)}
                className={`w-full cursor-pointer rounded-sm border p-4 text-left transition ${
                  isSelected
                    ? 'border-gold/40 bg-gold/10'
                    : 'border-white/[0.06] bg-stone-950/40 hover:border-white/15'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="mt-1 text-xs text-stone-500">{item.tagline}</p>
                  </div>
                  <p className="font-display text-sm text-gold">{item.priceLabel}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-2 rounded-sm border border-white/[0.06] p-4">
          <p className="font-display text-xs uppercase tracking-widest text-stone-400">
            Forma de cobrança
          </p>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-stone-300">
            <input
              type="radio"
              name={`paint-kit-billing-${subscription.id}`}
              checked={!recurring}
              onChange={() => setRecurring(false)}
              className="mt-1"
            />
            <span>
              <span className="text-white">Só na próxima caixa</span>
              <span className="mt-0.5 block text-xs text-stone-500">
                Cobrança única de {bump?.priceLabel ?? '—'} agora
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-stone-300">
            <input
              type="radio"
              name={`paint-kit-billing-${subscription.id}`}
              checked={recurring}
              onChange={() => setRecurring(true)}
              className="mt-1"
            />
            <span>
              <span className="text-white">Todo mês</span>
              <span className="mt-0.5 block text-xs text-stone-500">
                +{bump ? formatMoney(bump.priceCents) : '—'}/mês na assinatura
              </span>
            </span>
          </label>
        </div>

        <AsaasPaymentForm
          disabled={pending}
          onError={setError}
          onSubmit={handlePurchase}
        />

        {pending ? (
          <p className="flex items-center gap-2 text-sm text-stone-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Processando pagamento…
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <p className="text-xs text-stone-600">
          Prefere concluir depois?{' '}
          <Link
            href={`/dashboard/addons/paint-kit?subscription=${subscription.id}`}
            className="text-ember hover:underline"
          >
            Abrir página dedicada
          </Link>
        </p>
      </div>
    </DashboardCard>
  );
}
