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
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <div className="mb-8">
        <p className="home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">Checkout</p>
        <h1 className="home-v2-display mt-3 text-[clamp(2.25rem,6vw,3.5rem)] leading-[0.92] text-mesa-parchment">
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
