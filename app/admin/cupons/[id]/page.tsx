import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminTable from '@/components/admin/AdminTable';
import PromoCodeForm from '@/components/admin/PromoCodeForm';
import { requireAdmin } from '@/lib/admin/auth';
import {
  getAdminPromoCode,
  listPromoRedemptions,
} from '@/lib/admin/queries';
import { formatPromoSummary } from '@/lib/checkout/promo-codes';
import { formatDate } from '@/lib/dashboard/format';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminPromoDetailPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const promo = await getAdminPromoCode(admin, id);

  if (!promo) notFound();

  const redemptions = await listPromoRedemptions(admin, id);

  return (
    <div className="space-y-8">
      <Link
        href="/admin/cupons"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para cupons
      </Link>

      <div className="rounded-sm border border-white/[0.06] p-4 text-sm text-stone-400">
        Resumo atual: {formatPromoSummary(promo)} · {promo.times_redeemed} resgate(s)
      </div>

      <PromoCodeForm promo={promo} />

      <section>
        <h3 className="font-display text-sm uppercase tracking-widest text-stone-400">
          Resgates
        </h3>
        <div className="mt-4">
          <AdminTable
            rows={redemptions}
            getRowHref={(row) => `/admin/clientes/${row.user_id}`}
            columns={[
              {
                key: 'customer',
                header: 'Cliente',
                cell: (row) => (
                  <div>
                    <p>{row.customerName ?? '—'}</p>
                    <p className="text-xs text-stone-500">{row.customerEmail}</p>
                  </div>
                ),
              },
              {
                key: 'subscription',
                header: 'Assinatura',
                cell: (row) =>
                  row.subscription_id ? (
                    <Link
                      href={`/admin/assinaturas/${row.subscription_id}`}
                      className="text-console hover:underline"
                    >
                      Ver
                    </Link>
                  ) : (
                    '—'
                  ),
              },
              {
                key: 'date',
                header: 'Data',
                cell: (row) => formatDate(row.created_at),
              },
            ]}
            emptyMessage="Nenhum resgate ainda."
          />
        </div>
      </section>
    </div>
  );
}
