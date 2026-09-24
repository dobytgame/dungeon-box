import { requireAdmin } from '@/lib/admin/auth';
import { getAdminUgcStats, listAdminUgc } from '@/lib/admin/ugc';
import AdminUgcClient from '@/components/admin/AdminUgcClient';

interface Props {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminUgcPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { q, status } = await searchParams;

  const [listResult, stats] = await Promise.all([
    listAdminUgc(admin, { q, status, limit: 100 }),
    getAdminUgcStats(admin),
  ]);

  return (
    <AdminUgcClient
      rows={listResult.rows}
      queryError={listResult.queryError}
      stats={stats}
      q={q}
      status={status}
    />
  );
}
