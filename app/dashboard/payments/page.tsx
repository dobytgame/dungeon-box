import DashboardCard from '@/components/dashboard/DashboardCard';
import EmptyState from '@/components/dashboard/EmptyState';
import PaymentReceiptList from '@/components/dashboard/PaymentReceiptList';
import { getPayments, requireDashboardUser } from '@/lib/dashboard/queries';

export default async function PaymentsPage() {
  const { user } = await requireDashboardUser();
  const payments = await getPayments(user.id);

  return (
    <div className="space-y-8 md:space-y-10">
      {payments.length === 0 ? (
        <EmptyState
          title="Nenhum pagamento ainda"
          description="Suas cobranças mensais aparecem aqui após a primeira assinatura."
          ctaLabel="Assinar um plano"
          ctaHref="/checkout?plan=heroi"
        />
      ) : (
        <DashboardCard title="Histórico" accent="ember">
          <PaymentReceiptList payments={payments} />
        </DashboardCard>
      )}
    </div>
  );
}
