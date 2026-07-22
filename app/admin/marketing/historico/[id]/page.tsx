import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminMarketingDispatchDetail from '@/components/admin/AdminMarketingDispatchDetail';
import { requireAdmin } from '@/lib/admin/auth';
import { getMarketingDispatchDetail } from '@/lib/admin/marketing-dispatch';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminMarketingDispatchPage({ params }: Props) {
  const { admin } = await requireAdmin();
  const { id } = await params;
  const { dispatch, recipients } = await getMarketingDispatchDetail(admin, id);

  if (!dispatch) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/marketing/historico"
          className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
        >
          ← Histórico
        </Link>
      </div>

      <AdminMarketingDispatchDetail dispatch={dispatch} recipients={recipients} />
    </div>
  );
}
