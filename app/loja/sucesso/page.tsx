import HomeV2Button from '@/components/home-v2/HomeV2Button';
import { Suspense } from 'react';
import ShopCard from '@/components/shop/ShopCard';
import StoreOrderSuccessAnalytics from '@/components/store/StoreOrderSuccessAnalytics';
import { STORE_ROUTES } from '@/lib/store/routes';

interface Props {
  searchParams: Promise<{ order?: string }>;
}

export default async function LojaSuccessPage({ searchParams }: Props) {
  const { order } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <Suspense fallback={null}>
        <StoreOrderSuccessAnalytics />
      </Suspense>

      <ShopCard title="Pedido confirmado" eyebrow="Sucesso">
        <p className="text-base leading-relaxed text-mesa-ash">
          Pagamento recebido com sucesso. Se você escolheu envio com a próxima
          caixa, o kit já está vinculado à sua assinatura. Caso contrário, nossa
          equipe preparará o envio avulso em breve.
        </p>
        {order ? (
          <p className="mt-3 font-mono text-xs text-mesa-ash/80">
            Referência: {order}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <HomeV2Button href="/dashboard/payments" arrow className="w-full sm:w-auto">
            Ver pagamentos
          </HomeV2Button>
          <HomeV2Button href={STORE_ROUTES.home} variant="outline" className="w-full sm:w-auto">
            Continuar comprando
          </HomeV2Button>
        </div>
      </ShopCard>
    </div>
  );
}
