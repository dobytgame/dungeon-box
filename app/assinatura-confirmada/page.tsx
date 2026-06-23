import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import CheckoutSuccessStatus from '@/components/checkout/CheckoutSuccessStatus';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = privatePageMetadata('Assinatura confirmada');

function SuccessFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950">
      <Loader2 className="h-8 w-8 animate-spin text-ember" aria-hidden="true" />
    </div>
  );
}

export default function AssinaturaConfirmadaPage() {
  return (
    <Suspense fallback={<SuccessFallback />}>
      <CheckoutSuccessStatus />
    </Suspense>
  );
}
