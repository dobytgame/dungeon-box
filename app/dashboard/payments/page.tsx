import DashboardCard from '@/components/dashboard/DashboardCard';
import EmptyState from '@/components/dashboard/EmptyState';
import PaymentReceiptList from '@/components/dashboard/PaymentReceiptList';
import SubscriptionCardUpdate from '@/components/dashboard/SubscriptionCardUpdate';
import {
  getAsaasCardUpdateSubscriptions,
  getPayments,
  requireDashboardUser,
} from '@/lib/dashboard/queries';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';

export default async function PaymentsPage() {
  const { user } = await requireDashboardUser();
  const [payments, cardUpdateSubscriptions] = await Promise.all([
    getPayments(user.id),
    ASAAS_CONFIGURED ? getAsaasCardUpdateSubscriptions(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8 md:space-y-10">
      {cardUpdateSubscriptions.length > 0 ? (
        <DashboardCard title="Cartão da assinatura" accent="frost">
          <SubscriptionCardUpdate subscriptions={cardUpdateSubscriptions} />
        </DashboardCard>
      ) : null}

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
