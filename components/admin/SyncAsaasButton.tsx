'use client';

import { useTransition } from 'react';
import { syncAsaasSubscriptionAction } from '@/lib/admin/actions';

interface Props {
  subscriptionId: string;
}

export default function SyncAsaasButton({ subscriptionId }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await syncAsaasSubscriptionAction(subscriptionId);
        });
      }}
      className="cursor-pointer rounded-sm border border-white/15 px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-300 transition hover:border-white/30 hover:text-white disabled:opacity-50"
    >
      {pending ? 'Sincronizando…' : 'Sincronizar Asaas'}
    </button>
  );
}
