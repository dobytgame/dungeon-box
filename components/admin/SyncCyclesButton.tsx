'use client';

import { useTransition } from 'react';
import { syncSubscriptionCyclesAction } from '@/lib/admin/actions';

export default function SyncCyclesButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await syncSubscriptionCyclesAction();
        });
      }}
      className="cursor-pointer rounded border border-console/30 bg-console/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-console transition hover:bg-console/15 disabled:opacity-50"
    >
      {pending ? 'Sincronizando…' : 'Sincronizar ciclos'}
    </button>
  );
}
