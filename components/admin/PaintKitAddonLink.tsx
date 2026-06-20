'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { paintKitAddonAbsoluteUrl } from '@/lib/subscriptions/paint-kit-addon-shared';

interface Props {
  subscriptionId: string;
  origin?: string | null;
}

export default function PaintKitAddonLink({ subscriptionId, origin }: Props) {
  const [copied, setCopied] = useState(false);
  const href = paintKitAddonAbsoluteUrl(subscriptionId, origin);

  return (
    <div className="rounded-sm border border-gold/20 bg-gold/5 p-4">
      <p className="font-display text-xs uppercase tracking-widest text-gold">
        Link — kit de pintura
      </p>
      <p className="mt-2 text-sm text-stone-400">
        Envie ao cliente para adicionar o kit profissional (R$ 99,99, frete grátis na
        próxima caixa). O link exige login na conta dele.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 truncate rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-xs text-stone-300">
          {href}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(href);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-gold/30 px-4 py-2 font-display text-xs uppercase tracking-widest text-gold transition hover:bg-gold/10"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar link
            </>
          )}
        </button>
      </div>
    </div>
  );
}
