import Link from 'next/link';
import type { AdminCustomerReferralAttribution } from '@/lib/admin/types';
import { referralStatusLabel } from '@/lib/admin/referral-attribution';

interface Props {
  attribution: AdminCustomerReferralAttribution;
  compact?: boolean;
  showReferrerLink?: boolean;
}

export default function ReferralAttributionBadge({
  attribution,
  compact = false,
  showReferrerLink = true,
}: Props) {
  const referrerLabel =
    attribution.referrerName ?? attribution.referrerEmail ?? 'Parceiro';
  const statusLabel = referralStatusLabel(attribution.status);

  if (compact) {
    return (
      <div className="space-y-0.5">
        <span className="inline-flex items-center rounded-sm border border-sky-400/30 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-sky-200">
          Link parceiro
        </span>
        {showReferrerLink ? (
          <Link
            href={`/admin/clientes/${attribution.referrerId}`}
            className="block text-xs text-stone-400 hover:text-console"
          >
            {referrerLabel}
          </Link>
        ) : (
          <p className="text-xs text-stone-400">{referrerLabel}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-sky-400/20 bg-sky-500/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-sm border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sky-200">
          Link parceiro
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
          {statusLabel}
        </span>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-stone-500">
            Indicado por
          </dt>
          <dd className="mt-0.5 text-stone-200">
            {showReferrerLink ? (
              <Link
                href={`/admin/clientes/${attribution.referrerId}`}
                className="hover:text-console"
              >
                {referrerLabel}
              </Link>
            ) : (
              referrerLabel
            )}
            {attribution.referrerEmail ? (
              <span className="block font-mono text-xs text-stone-500">
                {attribution.referrerEmail}
              </span>
            ) : null}
          </dd>
        </div>
        {attribution.referralCode ? (
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-stone-500">
              Código
            </dt>
            <dd className="mt-0.5 font-mono text-stone-300">
              {attribution.referralCode}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
