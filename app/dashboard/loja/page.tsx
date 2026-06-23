import Link from 'next/link';
import StoreProductCard from '@/components/store/StoreProductCard';
import StoreSubNav from '@/components/store/StoreSubNav';
import { STORE_PRODUCTS } from '@/lib/store/catalog';
import { requireDashboardUser } from '@/lib/dashboard/queries';
import { getMonthlyKitStoreAvailability } from '@/lib/store/monthly-kits';

function MonthlyKitEmptyState({
  issue,
}: {
  issue?: 'no_subscription' | 'no_theme' | 'no_plan';
}) {
  if (issue === 'no_subscription') {
    return (
      <section className="mb-12 rounded-sm border border-gold/20 bg-gold/[0.04] p-5">
        <p className="text-sm text-stone-300">
          O kit do mês extra é exclusivo para assinantes.{' '}
          <Link href="/#planos" className="text-ember hover:underline">
            Assine um plano
          </Link>{' '}
          para comprar cópias adicionais do tema corrente.
        </p>
      </section>
    );
  }

  if (issue === 'no_theme') {
    return (
      <section className="mb-12 rounded-sm border border-white/[0.06] bg-stone-950/40 p-5">
        <p className="text-sm text-stone-400">
          Ainda não há um tema do mês configurado para venda extra. Nossa equipe
          está preparando o próximo kit — volte em breve.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-12 rounded-sm border border-white/[0.06] bg-stone-950/40 p-5">
      <p className="text-sm text-stone-400">
        Não encontramos o plano vinculado à sua assinatura. Atualize seus dados
        em{' '}
        <Link href="/dashboard/subscription" className="text-ember hover:underline">
          Minha assinatura
        </Link>{' '}
        ou fale com o suporte.
      </p>
    </section>
  );
}

export default async function StorePage() {
  const { user, supabase } = await requireDashboardUser();
  const monthlyKitStore = await getMonthlyKitStoreAvailability(user.id, supabase);

  return (
    <div>
      <StoreSubNav />

      <p className="mb-8 max-w-2xl text-sm text-stone-400">
        Materiais extras para sua mesa de RPG. Assinantes podem comprar cópias
        adicionais do kit do mês — enviadas junto com a próxima caixa, sem frete.
      </p>

      {monthlyKitStore.products.length > 0 ? (
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
            {monthlyKitStore.products.map((product) => (
              <StoreProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : (
        <MonthlyKitEmptyState issue={monthlyKitStore.issue} />
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
