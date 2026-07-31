import { redirect } from 'next/navigation';
import StoreCheckoutForm from '@/components/store/StoreCheckoutForm';
import {
  getAddresses,
  getManageableSubscriptions,
} from '@/lib/dashboard/queries';
import { getStorePaymentConfig } from '@/lib/store/payment-config';
import { createClient } from '@/lib/supabase/server';
import { STORE_ROUTES } from '@/lib/store/routes';

export default async function LojaCheckoutPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(STORE_ROUTES.checkout)}`);
  }

  const [addresses, subscriptions, paymentConfig] = await Promise.all([
    getAddresses(user.id),
    getManageableSubscriptions(user.id),
    getStorePaymentConfig(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="font-display text-xs uppercase tracking-[0.25em] text-stone-500">
          Checkout
        </p>
        <h1 className="mt-2 font-display text-2xl uppercase tracking-wide text-white">
          Finalizar compra
        </h1>
      </div>
      {!paymentConfig.ready ? (
        <div
          className="mb-6 rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          Pagamentos da loja temporariamente indisponíveis.
          {paymentConfig.issue ? ` ${paymentConfig.issue}` : ''}
        </div>
      ) : null}
      <StoreCheckoutForm
        addresses={addresses}
        subscriptions={subscriptions}
        paymentConfig={paymentConfig}
        embedded
      />
    </div>
  );
}
