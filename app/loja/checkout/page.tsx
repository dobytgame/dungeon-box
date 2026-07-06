import { redirect } from 'next/navigation';
import StoreCheckoutForm from '@/components/store/StoreCheckoutForm';
import {
  getAddresses,
  getManageableSubscriptions,
} from '@/lib/dashboard/queries';
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

  const [addresses, subscriptions] = await Promise.all([
    getAddresses(user.id),
    getManageableSubscriptions(user.id),
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
      <StoreCheckoutForm addresses={addresses} subscriptions={subscriptions} embedded />
    </div>
  );
}
