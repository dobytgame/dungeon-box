import type { AdminStoreOrderFulfillmentStatus } from '@/lib/admin/store-orders';
import StatusBadge from '@/components/dashboard/StatusBadge';
import type { PaymentStatus } from '@/lib/dashboard/types';

interface Props {
  fulfillmentStatus: AdminStoreOrderFulfillmentStatus;
  paymentStatus?: PaymentStatus;
}

export default function StoreOrderFulfillmentBadge({
  fulfillmentStatus,
  paymentStatus = 'pending',
}: Props) {
  if (fulfillmentStatus === 'pending_payment') {
    return <StatusBadge kind="payment" status={paymentStatus} />;
  }

  return <StatusBadge kind="cycle" status={fulfillmentStatus} />;
}
