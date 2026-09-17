import AdminFormNav from '@/components/admin/AdminFormNav';
import CustomStoreOrderForm from '@/components/admin/CustomStoreOrderForm';
import { requireAdmin } from '@/lib/admin/auth';
import { getCustomOrderCustomer } from '@/lib/admin/custom-store-order';

interface Props {
  searchParams: Promise<{ userId?: string }>;
}

export default async function AdminNewCustomStoreOrderPage({
  searchParams,
}: Props) {
  const { admin } = await requireAdmin();
  const { userId } = await searchParams;
  const initialCustomer = userId
    ? await getCustomOrderCustomer(admin, userId)
    : null;

  return (
    <div className="space-y-6">
      <AdminFormNav
        backHref="/admin/loja/pedidos"
        backLabel="Voltar para pedidos"
      />
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          Loja
        </p>
        <h1 className="mt-1 font-display text-xl uppercase tracking-wide text-white">
          Pedido personalizado
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-400">
          Escreva os itens e o valor, gere um link de pagamento e envie ao
          cliente. Depois de pago, o pedido entra na fila da loja como envio
          avulso.
        </p>
      </div>
      <CustomStoreOrderForm initialCustomer={initialCustomer} />
    </div>
  );
}
