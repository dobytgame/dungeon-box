'use client';

import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';

interface Props {
  backHref?: string;
}

export default function PurchaseTermsToolbar({ backHref = '/dashboard/subscription' }: Props) {
  return (
    <div className="purchase-terms-no-print mb-8 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-white/[0.06] bg-stone-950/50 p-4">
      <Link
        href={backHref}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm text-stone-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar à assinatura
      </Link>

      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-sm border border-white/10 bg-white/[0.03] px-4 font-display text-xs uppercase tracking-widest text-stone-200 transition hover:border-white/20 hover:text-white"
      >
        <Printer className="h-4 w-4" aria-hidden="true" />
        Imprimir
      </button>
    </div>
  );
}
