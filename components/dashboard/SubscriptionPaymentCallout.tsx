import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/dashboard/format';
import type { PendingPaymentLinkSource } from '@/lib/payments/pending-payment-link';

interface Props {
  status: 'pending' | 'past_due';
  planName?: string | null;
  paymentUrl: string;
  paymentSource: PendingPaymentLinkSource;
  amountCents: number;
  dueDate?: string | null;
  resumeCheckoutHref?: string;
}

export default function SubscriptionPaymentCallout({
  status,
  planName,
  paymentUrl,
  paymentSource,
  amountCents,
  dueDate,
  resumeCheckoutHref,
}: Props) {
  const isPastDue = status === 'past_due';
  const hasGatewayLink = paymentSource === 'asaas' || paymentSource === 'stripe';
  const borderClass = isPastDue
    ? 'border-red-400/30 bg-red-500/10'
    : 'border-amber-500/30 bg-amber-500/10';
  const titleClass = isPastDue ? 'text-red-200' : 'text-amber-100/90';
  const bodyClass = isPastDue ? 'text-red-100/80' : 'text-amber-100/90';

  return (
    <div
      className={`rounded-sm border p-4 md:p-5 ${borderClass}`}
      role="alert"
    >
      <p className={`font-display text-xs uppercase tracking-widest ${titleClass}`}>
        {isPastDue ? 'Pagamento em atraso' : 'Pagamento pendente'}
      </p>
      <p className={`mt-2 text-sm leading-relaxed ${bodyClass}`}>
        {isPastDue ? (
          <>
            {planName ? (
              <>
                Sua assinatura <strong className="text-white">{planName}</strong> está com
                cobrança pendente de{' '}
                <strong className="text-white">{formatMoney(amountCents)}</strong>.
              </>
            ) : (
              <>
                Há uma cobrança pendente de{' '}
                <strong className="text-white">{formatMoney(amountCents)}</strong> na sua
                assinatura.
              </>
            )}{' '}
            Regularize para continuar recebendo suas caixas.
          </>
        ) : (
          <>
            O pagamento deste plano ainda não foi concluído. Você pode finalizar pelo link
            abaixo ou voltar ao checkout.
          </>
        )}
      </p>
      {dueDate ? (
        <p className={`mt-2 font-mono text-[11px] ${bodyClass}`}>
          Vencimento: {formatDate(dueDate)}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {hasGatewayLink ? (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-sm px-5 py-2.5 font-display text-xs uppercase tracking-widest transition ${
              isPastDue
                ? 'bg-red-400 text-stone-950 hover:bg-red-300'
                : 'bg-ember text-stone-950 hover:bg-ember-bright'
            }`}
          >
            Pagar agora
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : (
          <Link
            href={paymentUrl}
            className={`inline-flex min-h-[44px] items-center rounded-sm px-5 py-2.5 font-display text-xs uppercase tracking-widest transition ${
              isPastDue
                ? 'bg-red-400 text-stone-950 hover:bg-red-300'
                : 'bg-ember text-stone-950 hover:bg-ember-bright'
            }`}
          >
            Regularizar assinatura
          </Link>
        )}

        {!isPastDue && resumeCheckoutHref ? (
          <Link
            href={resumeCheckoutHref}
            className="inline-flex min-h-[44px] items-center rounded-sm border border-white/15 px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-300 transition hover:border-white/30 hover:text-white"
          >
            Continuar checkout
          </Link>
        ) : null}
      </div>

      {hasGatewayLink ? (
        <p className="mt-3 text-xs text-stone-500">
          Pagamento seguro via {paymentSource === 'asaas' ? 'Asaas' : 'Stripe'} — cartão,
          PIX ou boleto conforme disponível.
        </p>
      ) : null}
    </div>
  );
}
