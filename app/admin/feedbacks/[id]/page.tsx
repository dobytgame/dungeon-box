import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminStarRating from '@/components/admin/AdminStarRating';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminFeedbackDetail } from '@/lib/admin/feedback';
import { formatDateTime } from '@/lib/dashboard/format';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminFeedbackDetailPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const feedback = await getAdminFeedbackDetail(admin, id);

  if (!feedback) notFound();

  return (
    <div className="space-y-8">
      <Link
        href="/admin/feedbacks"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para feedbacks
      </Link>

      <div className="admin-panel space-y-6 rounded p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Avaliação
            </p>
            <div className="mt-2 flex items-center gap-3">
              <AdminStarRating rating={feedback.rating} size="md" />
              <span className="font-display text-xl text-zinc-100">
                {feedback.rating}/5
              </span>
            </div>
          </div>
          <p className="font-mono text-xs text-zinc-500">
            {formatDateTime(feedback.createdAt)}
          </p>
        </div>

        <dl className="grid gap-4 border-t border-zinc-800/80 pt-5 md:grid-cols-2">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Cliente
            </dt>
            <dd className="mt-1 text-sm text-zinc-200">
              <Link
                href={`/admin/clientes/${feedback.userId}`}
                className="hover:text-console"
              >
                {feedback.customerName ?? feedback.customerEmail ?? '—'}
              </Link>
              {feedback.customerEmail ? (
                <p className="mt-1 text-xs text-zinc-500">{feedback.customerEmail}</p>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Ciclo
            </dt>
            <dd className="mt-1 text-sm text-zinc-200">
              <Link
                href={`/admin/ciclos/${feedback.cycleId}`}
                className="hover:text-console"
              >
                {feedback.cycleNumber
                  ? `#${feedback.cycleNumber}${feedback.themeName ? ` · ${feedback.themeEmoji ?? ''} ${feedback.themeName}` : ''}`
                  : feedback.cycleId}
              </Link>
            </dd>
          </div>
        </dl>

        <div className="border-t border-zinc-800/80 pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Comentário
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {feedback.message?.trim() || 'Sem comentário.'}
          </p>
        </div>

        {feedback.imageUrls.length > 0 ? (
          <div className="border-t border-zinc-800/80 pt-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Fotos ({feedback.imageUrls.length})
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {feedback.imageUrls.map((url, index) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-[4/3] overflow-hidden rounded border border-zinc-800 bg-zinc-900"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Foto ${index + 1} do feedback`}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
