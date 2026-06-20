'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import DashboardCard from '@/components/dashboard/DashboardCard';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { formatMoney } from '@/lib/dashboard/format';
import { resolveCartLines } from '@/lib/store/cart';

export default function StoreCartView() {
  const { lines, subtotalCents, setQuantity, removeItem, hydrated } = useStoreCart();
  const resolved = resolveCartLines(lines);

  if (!hydrated) {
    return (
      <DashboardCard title="Carrinho" accent="gold">
        <p className="text-sm text-stone-500">Carregando carrinho…</p>
      </DashboardCard>
    );
  }

  if (resolved.length === 0) {
    return (
      <DashboardCard title="Carrinho vazio" accent="gold">
        <p className="text-sm text-stone-400">
          Você ainda não adicionou produtos. Explore os kits de pintura na loja.
        </p>
        <Link
          href="/dashboard/loja"
          className="mt-4 inline-flex font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
        >
          Ver produtos →
        </Link>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardCard title="Seu carrinho" accent="gold">
        <ul className="divide-y divide-white/[0.06]">
          {resolved.map((line) => (
              <li
                key={line.productId}
                className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{line.name}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    {formatMoney(line.priceCents)} cada
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center rounded-sm border border-white/10">
                    <button
                      type="button"
                      aria-label="Diminuir quantidade"
                      onClick={() =>
                        setQuantity(line.productId, Math.max(1, line.quantity - 1))
                      }
                      className="flex h-10 w-10 cursor-pointer items-center justify-center text-stone-400 hover:text-white"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[2rem] text-center text-sm text-white">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Aumentar quantidade"
                      onClick={() =>
                        setQuantity(line.productId, Math.min(9, line.quantity + 1))
                      }
                      className="flex h-10 w-10 cursor-pointer items-center justify-center text-stone-400 hover:text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="min-w-[5rem] text-right font-display text-sm text-gold">
                    {formatMoney(line.lineTotalCents)}
                  </p>

                  <button
                    type="button"
                    aria-label={`Remover ${line.name}`}
                    onClick={() => removeItem(line.productId)}
                    className="cursor-pointer text-stone-500 transition hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-stone-500">Subtotal</p>
            <p className="font-display text-2xl text-white">
              {formatMoney(subtotalCents)}
            </p>
            <p className="mt-1 text-xs text-stone-600">
              Frete grátis ao enviar com a próxima caixa da assinatura.
            </p>
          </div>
          <Link
            href="/dashboard/loja/checkout"
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-sm bg-ember px-6 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
          >
            Finalizar compra
          </Link>
        </div>
      </DashboardCard>
    </div>
  );
}
