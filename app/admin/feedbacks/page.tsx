import { requireAdmin } from '@/lib/admin/auth';
import {
  getAdminFeedbackStats,
  listAdminFeedback,
} from '@/lib/admin/feedback';
import AdminFeedbacksClient from '@/components/admin/AdminFeedbacksClient';

interface Props {
  searchParams: Promise<{ q?: string; rating?: string }>;
}

export default async function AdminFeedbacksPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { q, rating } = await searchParams;

  const [feedbackResult, stats] = await Promise.all([
    listAdminFeedback(admin, { q, rating, limit: 100 }),
    getAdminFeedbackStats(admin),
  ]);

  return (
    <AdminFeedbacksClient
      feedbacks={feedbackResult.rows}
      queryError={feedbackResult.queryError}
      stats={stats}
      q={q}
      rating={rating}
    />
  );
}
