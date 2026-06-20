import Link from 'next/link';
import DashboardCard from '@/components/dashboard/DashboardCard';
import StoreSubNav from '@/components/store/StoreSubNav';

interface Props {
  searchParams: Promise<{ order?: string }>;
}

export default async function StoreSuccessPage({ searchParams }: Props) {
  const { order } = await searchParams;

  return (
    <div>
      <StoreSubNav />

      <DashboardCard title="Pedido confirmado" accent="gold">
        <p className="text-sm text-stone-300">
          Pagamento recebido com sucesso. Se você escolheu envio com a próxima caixa,
          o kit já está vinculado à sua assinatura. Caso contrário, nossa equipe
          preparará o envio avulso em breve.
        </p>
        {order ? (
          <p className="mt-3 font-mono text-xs text-stone-500">
            Referência: {order}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/dashboard/payments"
            className="inline-flex min-h-[44px] items-center rounded-sm bg-ember px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
          >
            Ver pagamentos
          </Link>
          <Link
            href="/dashboard/loja"
            className="inline-flex min-h-[44px] items-center font-display text-xs uppercase tracking-widest text-gold hover:text-gold/80"
          >
            Continuar comprando
          </Link>
        </div>
      </DashboardCard>
    </div>
  );
}
