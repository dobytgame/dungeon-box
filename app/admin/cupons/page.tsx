import { requireAdmin } from '@/lib/admin/auth';
import { listAdminPromoCodes } from '@/lib/admin/queries';
import AdminPromoCodesClient from '@/components/admin/AdminPromoCodesClient';

interface Props {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminPromoCodesPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { q, status } = await searchParams;
  const promos = await listAdminPromoCodes(admin, { q, status, limit: 100 });

  return <AdminPromoCodesClient promos={promos} q={q} status={status} />;
}
