'use client';

import { Check, MapPin, Package, Paintbrush } from 'lucide-react';
import { plans } from '@/lib/data';
import { getPaintKitBump } from '@/lib/checkout/order-bumps';
import type { CheckoutData } from '@/lib/checkout/types';
import { getPlanTheme } from '@/lib/plan-theme';
import { formatZip } from '@/lib/dashboard/format';
import type { Address } from '@/lib/dashboard/types';

interface Props {
  data: CheckoutData;
  step: number;
  addresses: Address[];
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function CheckoutSummary({ data, step, addresses }: Props) {
  const plan = plans.find((p) => p.id === data.planSlug)!;
  const theme = getPlanTheme(plan.accent);
  const bump = getPaintKitBump(data.paintKitBump);
  const deliveryItems =
    'deliveryItems' in plan && Array.isArray(plan.deliveryItems)
      ? plan.deliveryItems
      : [];
  const address = addresses.find((a) => a.id === data.addressId);
  const planCents = plan.price * 100;
  const firstChargeCents = planCents + (bump?.priceCents ?? 0);

  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <div className="overflow-hidden rounded-sm border border-white/[0.08] bg-stone-950/60 backdrop-blur-sm">
        <div className={`h-1 w-full ${theme.accentLine}`} aria-hidden="true" />

        <div className="p-5 md:p-6">
          <p className="font-display text-[10px] uppercase tracking-[0.3em] text-stone-500">
            Resumo do pedido
          </p>

          <div className="mt-4 flex items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div>
              <p className={`font-display text-lg uppercase tracking-wide ${theme.nameClass}`}>
                {plan.name}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">Assinatura mensal</p>
            </div>
            <p className="shrink-0 text-right">
              <span className="font-display text-2xl tabular-nums text-white">
                R$ {plan.price}
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-stone-600">
                por mês
              </span>
            </p>
          </div>

          {step >= 1 && deliveryItems.length > 0 ? (
            <div className="border-b border-white/[0.06] py-4">
              <div className="flex items-center gap-2 text-stone-500">
                <Package className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <p className="font-display text-[10px] uppercase tracking-[0.25em]">
                  Na sua caixa
                </p>
              </div>
              <ul className="mt-3 max-h-36 space-y-2 overflow-y-auto pr-1 text-xs leading-relaxed text-stone-400 [scrollbar-width:thin]">
                {deliveryItems.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check
                      className={`mt-0.5 h-3 w-3 shrink-0 ${theme.checkClass}`}
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {bump ? (
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] py-4">
              <div className="flex gap-2">
                <Paintbrush
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs font-medium text-stone-200">{bump.name}</p>
                  <p className="mt-0.5 text-[10px] text-stone-500">Pagamento único · 1ª caixa</p>
                </div>
              </div>
              <p className="shrink-0 font-display text-sm text-gold">{bump.priceLabel}</p>
            </div>
          ) : null}

          {step >= 2 && address ? (
            <div className="border-b border-white/[0.06] py-4">
              <div className="flex items-center gap-2 text-stone-500">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <p className="font-display text-[10px] uppercase tracking-[0.25em]">
                  Entrega
                </p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-400">
                {address.recipient}
                <br />
                {address.street}, {address.number}
                <br />
                {address.neighborhood} — {address.city}/{address.state}
                <br />
                CEP {formatZip(address.zip_code)}
              </p>
            </div>
          ) : null}

          <div className="pt-4">
            {bump ? (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs text-stone-500">1ª cobrança</p>
                  <p className="font-display text-lg tabular-nums text-white">
                    {formatBRL(firstChargeCents)}
                  </p>
                </div>
                <p className="mt-1 text-right text-[10px] text-stone-600">
                  Depois, R$ {plan.price}/mês
                </p>
              </>
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs text-stone-500">Total recorrente</p>
                <p className="font-display text-lg tabular-nums text-white">
                  R$ {plan.price}
                  <span className="text-sm text-stone-500">/mês</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 hidden text-center text-[11px] leading-relaxed text-stone-600 lg:block">
        Cancele quando quiser · Peças em cinza pedra
      </p>
    </aside>
  );
}
