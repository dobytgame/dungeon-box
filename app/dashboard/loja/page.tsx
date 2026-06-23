import Link from 'next/link';
import StoreProductCard from '@/components/store/StoreProductCard';
import StoreSubNav from '@/components/store/StoreSubNav';
import { STORE_PRODUCTS } from '@/lib/store/catalog';
import {
  getManageableSubscriptions,
  requireDashboardUser,
} from '@/lib/dashboard/queries';
import { getMonthlyKitProductsForUser } from '@/lib/store/monthly-kits';

export default async function StorePage() {
  const { user } = await requireDashboardUser();
  const subscriptions = await getManageableSubscriptions(user.id);
  const monthlyKits = await getMonthlyKitProductsForUser(subscriptions);
  const hasActiveSubscription = subscriptions.some(
    (sub) => sub.status === 'active' || sub.status === 'past_due'
  );

  return (
    <div>
      <StoreSubNav />

      <p className="mb-8 max-w-2xl text-sm text-stone-400">
        Materiais extras para sua mesa de RPG. Assinantes podem comprar cópias
        adicionais do kit do mês — enviadas junto com a próxima caixa, sem frete.
      </p>

      {monthlyKits.length > 0 ? (
        <section className="mb-12">
          <div className="mb-6">
            <p className="font-display text-xs uppercase tracking-[0.25em] text-gold">
              Exclusivo assinantes
            </p>
            <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-white">
              Kit do mês
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-stone-400">
              Quer outra cópia do tema deste mês? Compre quantas precisar — todas
              vão na mesma entrega da sua assinatura, sem custo de frete.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {monthlyKits.map((product) => (
              <StoreProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : hasActiveSubscription ? (
        <section className="mb-12 rounded-sm border border-white/[0.06] bg-stone-950/40 p-5">
          <p className="text-sm text-stone-400">
            Não foi possível carregar o kit do mês para sua assinatura. Se o
            problema persistir, entre em contato com o suporte.
          </p>
        </section>
      ) : (
        <section className="mb-12 rounded-sm border border-gold/20 bg-gold/[0.04] p-5">
          <p className="text-sm text-stone-300">
            O kit do mês extra é exclusivo para assinantes.{' '}
            <Link href="/#planos" className="text-ember hover:underline">
              Assine um plano
            </Link>{' '}
            para comprar cópias adicionais do tema corrente.
          </p>
        </section>
      )}

      <section>
        <div className="mb-6">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-stone-500">
            Acessórios
          </p>
          <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-white">
            Kits de pintura
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {STORE_PRODUCTS.map((product) => (
            <StoreProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
