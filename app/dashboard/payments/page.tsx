import DashboardCard from '@/components/dashboard/DashboardCard';
import EmptyState from '@/components/dashboard/EmptyState';
import PaymentReceiptList from '@/components/dashboard/PaymentReceiptList';
import SubscriptionCardUpdate from '@/components/dashboard/SubscriptionCardUpdate';
import SubscriptionGatewayMigration from '@/components/dashboard/SubscriptionGatewayMigration';
import {
  getCardUpdateSubscriptions,
  getManageableSubscriptions,
  getPayments,
  getPixCardMigrationSubscriptions,
  requireDashboardUser,
} from '@/lib/dashboard/queries';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';

export default async function PaymentsPage() {
  const { user } = await requireDashboardUser();
  const cardUpdatesEnabled = ASAAS_CONFIGURED || PAGARME_CONFIGURED;
  const [payments, cardUpdateSubscriptions, pixCardSubscriptions, manageable] =
    await Promise.all([
      getPayments(user.id),
      cardUpdatesEnabled
        ? getCardUpdateSubscriptions(user.id)
        : Promise.resolve([]),
      PAGARME_CONFIGURED
        ? getPixCardMigrationSubscriptions(user.id)
        : Promise.resolve([]),
      getManageableSubscriptions(user.id),
    ]);

  const subscriptionById = new Map(manageable.map((sub) => [sub.id, sub]));

  return (
    <div className="space-y-8 md:space-y-10">
      {pixCardSubscriptions.map((row) => {
        const sub = subscriptionById.get(row.id);
        const plan = sub?.plans;
        const planName = Array.isArray(plan) ? plan[0]?.name : plan?.name;
        return (
          <DashboardCard key={row.id} title="Renovação automática" accent="jade">
            <SubscriptionGatewayMigration
              subscriptionId={row.id}
              planName={planName ?? row.planName}
              nextBillingDate={sub?.next_billing_date ?? null}
              subscriptionStatus={row.status}
              variant="pix"
            />
          </DashboardCard>
        );
      })}

      {cardUpdateSubscriptions.length > 0 ? (
        <DashboardCard title="Cartão da assinatura" accent="jade">
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
