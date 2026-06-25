'use client';

import { useTransition } from 'react';
import { setSubscriptionPartnerAction } from '@/lib/admin/actions';

interface Props {
  subscriptionId: string;
}

export default function PartnerRemoveButton({ subscriptionId }: Props) {
  const [pending, startTransition] = useTransition();

  function remove() {
    if (
      !window.confirm(
        'Remover status de parceiro desta assinatura? A cobrança voltará a ser exigida nas renovações.'
      )
    ) {
      return;
    }

    startTransition(async () => {
      await setSubscriptionPartnerAction(subscriptionId, false);
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={remove}
      className="cursor-pointer rounded-sm border border-white/10 px-3 py-1.5 font-display text-[10px] uppercase tracking-wider text-stone-400 transition-colors hover:border-red-400/30 hover:text-red-300 disabled:opacity-50"
    >
      {pending ? '…' : 'Remover parceiro'}
    </button>
  );
}
