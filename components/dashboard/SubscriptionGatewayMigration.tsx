'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import PagarmePaymentForm from '@/components/checkout/PagarmePaymentForm';
import SubscriptionMigrationLinkActions from '@/components/dashboard/SubscriptionMigrationLinkActions';
import { formatDate, formatMoney } from '@/lib/dashboard/format';
import {
  migrationNeedsImmediateCharge,
  resolveMigrationCatchUpStartAt,
  resolveMigrationStartAt,
} from '@/lib/pagarme/migration-schedule';

interface Props {
  subscriptionId: string;
  planName: string;
  nextBillingDate: string | null;
  subscriptionStatus: string;
  amountCents?: number | null;
}

export default function SubscriptionGatewayMigration({
  subscriptionId,
  planName,
  nextBillingDate,
  subscriptionStatus,
  amountCents = null,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMeta, setSuccessMeta] = useState<{
    chargedImmediately: boolean;
    nextBillingDate: string | null;
  } | null>(null);
  const [error, setError] = useState('');

  const chargeNow = migrationNeedsImmediateCharge({
    status: subscriptionStatus,
    nextBillingDate,
  });
  const scheduledDate = (
    chargeNow
      ? resolveMigrationCatchUpStartAt(nextBillingDate)
      : resolveMigrationStartAt(nextBillingDate)
  ).toISOString();
  const overdueLabel = formatDate(nextBillingDate);
  const scheduledLabel = formatDate(
    successMeta?.nextBillingDate ?? scheduledDate
  );
  const amountLabel =
    amountCents != null && amountCents > 0 ? formatMoney(amountCents) : null;
  const chargedImmediately = successMeta?.chargedImmediately ?? chargeNow;

  if (success) {
    return (
      <div
        className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100"
        role="status"
      >
        <p className="font-display text-xs uppercase tracking-widest text-emerald-200">
          {chargedImmediately ? 'Pagamento regularizado' : 'Pagamento atualizado'}
        </p>
        <p className="mt-2">
          Sua assinatura <span className="text-white">{planName}</span> agora
          está no Pagar.me.
          {chargedImmediately ? (
            <>
              {amountLabel ? (
                <>
                  {' '}
                  Cobramos <span className="text-white">{amountLabel}</span> agora
                  para quitar o atraso
                </>
              ) : (
                <> O atraso foi quitado agora</>
              )}
              {scheduledLabel !== '—' ? (
                <>
                  ; a próxima renovação fica em{' '}
                  <span className="text-white">{scheduledLabel}</span>
                </>
              ) : null}
              .
            </>
          ) : (
            <>
              {' '}
              Plano e benefícios permanecem os mesmos
              {scheduledLabel !== '—' ? (
                <>
                  ; a próxima cobrança segue em{' '}
                  <span className="text-white">{scheduledLabel}</span>
                </>
              ) : null}
              .
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-sm border p-4 ${
        chargeNow
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-ember/40 bg-ember/10'
      }`}
    >
      <p
        className={`font-display text-xs uppercase tracking-widest ${
          chargeNow ? 'text-amber-200' : 'text-ember-bright'
        }`}
      >
        {chargeNow ? 'Regularize e migre o pagamento' : 'Atualize seu pagamento'}
      </p>
      <p className="mt-2 text-sm text-stone-300">
        Estamos migrando cobranças para o Pagar.me. Cadastre o cartão aqui para
        continuar a assinatura <span className="text-white">{planName}</span>
        {chargeNow ? (
          <>
            . Há um pagamento em atraso
            {overdueLabel !== '—' ? (
              <>
                {' '}
                (vencimento {overdueLabel})
              </>
            ) : null}
            {amountLabel ? (
              <>
                : cobramos <span className="text-white">{amountLabel}</span> agora
              </>
            ) : (
              ': cobramos a mensalidade agora'
            )}
            {scheduledLabel !== '—' ? (
              <>
                {' '}
                e a próxima renovação fica em{' '}
                <span className="text-white">{scheduledLabel}</span>
              </>
            ) : null}
          </>
        ) : scheduledLabel !== '—' ? (
          <>
            . A cobrança só acontece em{' '}
            <span className="text-white">{scheduledLabel}</span> — atualizar agora
            não gera cobrança antecipada
          </>
        ) : null}
        . Leva menos de 2 minutos.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError('');
          }}
          className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-sm bg-ember px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-950 transition-colors duration-200 hover:bg-ember-bright"
        >
          {chargeNow ? 'Pagar atraso e migrar' : 'Atualizar cartão agora'}
        </button>
      ) : (
        <div className="mt-4 border-t border-white/10 pt-4">
          <PagarmePaymentForm
            submitLabel={
              chargeNow ? 'Pagar atraso e migrar' : 'Confirmar e migrar'
            }
            onSubmit={async (tokenized) => {
              setError('');
              const response = await fetch(
                '/api/subscriptions/migrate-gateway',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    subscriptionId,
                    cardToken: tokenized.token,
                    cardLast4: tokenized.last4,
                    cardBrand: tokenized.brand,
                  }),
                }
              );
              const payload = (await response.json().catch(() => ({}))) as {
                error?: string;
                chargedImmediately?: boolean;
                nextBillingDate?: string;
              };
              if (!response.ok) {
                setError(
                  payload.error ?? 'Não foi possível migrar o pagamento.'
                );
                return;
              }
              setSuccessMeta({
                chargedImmediately: Boolean(payload.chargedImmediately),
                nextBillingDate: payload.nextBillingDate ?? scheduledDate,
              });
              setSuccess(true);
              setOpen(false);
              router.refresh();
            }}
            onError={setError}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 cursor-pointer text-sm text-stone-500 hover:text-stone-300"
          >
            Cancelar
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <SubscriptionMigrationLinkActions subscriptionId={subscriptionId} />
    </div>
  );
}
