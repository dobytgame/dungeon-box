import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { PAGARME_TOKENIZATION_READY } from '@/lib/pagarme/public';
import { readActiveGatewayFromDb } from '@/lib/payments/gateway-config';
import { getActivePaymentProvider } from '@/lib/payments/provider';

const GATEWAY_LABELS = {
  asaas: 'Asaas',
  pagarme: 'Pagar.me',
} as const;

export default async function AdminActiveGatewayNotice() {
  const fromDb = await readActiveGatewayFromDb();
  const effectiveProvider = await getActivePaymentProvider();

  const activeGateway =
    fromDb ??
    (effectiveProvider === 'pagarme' || effectiveProvider === 'asaas'
      ? effectiveProvider
      : 'asaas');

  const label = GATEWAY_LABELS[activeGateway];

  const checkoutReady =
    effectiveProvider === 'pagarme'
      ? PAGARME_CONFIGURED && PAGARME_TOKENIZATION_READY
      : effectiveProvider === 'asaas'
        ? ASAAS_CONFIGURED
        : false;

  const tone = checkoutReady
    ? 'border-console/30 bg-console/10 text-console'
    : 'border-amber-500/30 bg-amber-500/10 text-amber-100';

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-sm border px-4 py-3 ${tone}`}
      role="status"
    >
      <div className="flex min-w-0 items-start gap-3">
        <CreditCard className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-80">
            Gateway de assinaturas
          </p>
          <p className="mt-0.5 text-sm">
            Novos checkouts:{' '}
            <span className="font-medium text-white">{label}</span>
            {!checkoutReady ? (
              <span className="text-amber-200/90"> — chaves incompletas no ambiente</span>
            ) : null}
          </p>
          {!fromDb ? (
            <p className="mt-1 text-xs opacity-80">
              Usando fallback do ambiente — confira a migration do gateway no Supabase.
            </p>
          ) : null}
        </div>
      </div>
      <Link
        href="/admin/financeiro/gateway"
        className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-white/80 underline-offset-2 hover:text-white hover:underline"
      >
        Alterar gateway
      </Link>
    </div>
  );
}
