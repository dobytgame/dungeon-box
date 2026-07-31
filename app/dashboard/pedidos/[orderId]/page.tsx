import { notFound } from 'next/navigation';
import StoreOrderDetailView from '@/components/dashboard/StoreOrderDetailView';
import { requireDashboardUser } from '@/lib/dashboard/queries';
import { getDashboardStoreOrderDetail } from '@/lib/dashboard/store-orders';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function DashboardOrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  const normalized = orderId.trim();

  if (!UUID_RE.test(normalized)) {
    notFound();
  }

  const { supabase, user } = await requireDashboardUser();
  const order = await getDashboardStoreOrderDetail(
    supabase,
    user.id,
    normalized
  );

  if (!order) {
    notFound();
  }

  return <StoreOrderDetailView order={order} />;
}
