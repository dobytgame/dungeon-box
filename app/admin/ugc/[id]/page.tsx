import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminUgcMarketingForm from '@/components/admin/AdminUgcMarketingForm';
import AdminUgcReviewForm from '@/components/admin/AdminUgcReviewForm';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminUgcDetail } from '@/lib/admin/ugc';
import { UGC_REJECT_REASONS } from '@/lib/ugc/constants';
import { formatInstagramHandle } from '@/lib/ugc/instagram';
import {
  optionLabel,
  UGC_FIRST_3D,
  UGC_LIKED_MOST,
  UGC_PLAYER_COUNTS,
  UGC_RPG_EXPERIENCE,
  UGC_RPG_SYSTEMS,
  UGC_SESSION_TYPES,
} from '@/lib/ugc/options';
import { formatDateTime } from '@/lib/dashboard/format';

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
} as const;

const PEOPLE_LABEL = {
  none: 'Sem pessoas identificáveis',
  adults: 'Pessoas adultas',
  minors: 'Crianças ou adolescentes',
} as const;

const CREDIT_LABEL = {
  none: 'Não identificar',
  name: 'Nome',
  instagram: 'Instagram',
  both: 'Nome + Instagram',
} as const;

function rejectReasonLabel(value: string | null): string | null {
  if (!value) return null;
  return UGC_REJECT_REASONS.find((item) => item.value === value)?.label ?? value;
}

export default async function AdminUgcDetailPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const submission = await getAdminUgcDetail(admin, id);

  if (!submission) notFound();

  return (
    <div className="space-y-8">
      <Link
        href="/admin/ugc"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para UGC
      </Link>

      <div className="admin-panel space-y-6 rounded p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Mostre sua Aventura
            </p>
            <p className="mt-2 font-display text-xl text-zinc-100">
              {submission.rewardStatus === 'sent'
                ? 'Brinde enviado'
                : STATUS_LABEL[submission.contentStatus]}
            </p>
          </div>
          <p className="font-mono text-xs text-zinc-500">
            {formatDateTime(submission.createdAt)}
          </p>
        </div>

        <dl className="grid gap-4 border-t border-zinc-800/80 pt-5 md:grid-cols-2">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Cliente
            </dt>
            <dd className="mt-1 text-sm text-zinc-200">
              <Link
                href={`/admin/clientes/${submission.userId}`}
                className="hover:text-console"
              >
                {submission.customerName ?? submission.customerEmail ?? '—'}
              </Link>
              {submission.customerEmail ? (
                <p className="mt-1 text-xs text-zinc-500">{submission.customerEmail}</p>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Instagram
            </dt>
            <dd className="mt-1 text-sm text-zinc-200">
              {formatInstagramHandle(submission.instagram) ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Mesa
            </dt>
            <dd className="mt-1 text-sm text-zinc-200">
              {optionLabel(UGC_RPG_SYSTEMS, submission.rpgSystem) ?? '—'}
              {submission.rpgSystemOther ? ` (${submission.rpgSystemOther})` : ''}
              {' · '}
              {optionLabel(UGC_PLAYER_COUNTS, submission.playerCount) ?? '—'} jogadores
              {' · '}
              {optionLabel(UGC_SESSION_TYPES, submission.sessionType) ?? '—'}
              {submission.sessionTypeOther ? ` (${submission.sessionTypeOther})` : ''}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Kits
            </dt>
            <dd className="mt-1 text-sm text-zinc-200">
              {submission.kitLabels.length > 0 ? submission.kitLabels.join(', ') : '—'}
              {submission.kitOther ? ` · ${submission.kitOther}` : ''}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Pessoas / crédito
            </dt>
            <dd className="mt-1 text-sm text-zinc-200">
              {PEOPLE_LABEL[submission.peopleVisible]} ·{' '}
              {CREDIT_LABEL[submission.creditPreference]}
            </dd>
          </div>
          {submission.rewardCycleId ? (
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                Brinde
              </dt>
              <dd className="mt-1 text-sm text-zinc-200">
                <Link
                  href={`/admin/ciclos/${submission.rewardCycleId}`}
                  className="hover:text-console"
                >
                  Ciclo #{submission.rewardCycleNumber ?? '—'} ·{' '}
                  {submission.rewardStatus === 'sent' ? 'enviado' : 'na fila'}
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="border-t border-zinc-800/80 pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Contexto da cena
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {submission.context}
          </p>
          {submission.momentHighlight ? (
            <p className="mt-4 text-sm text-zinc-400">
              Momento: {submission.momentHighlight}
            </p>
          ) : null}
          {submission.tableReaction ? (
            <p className="mt-2 text-sm text-zinc-400">
              Reação: {submission.tableReaction}
            </p>
          ) : null}
          {submission.likedMost.length > 0 ? (
            <p className="mt-2 text-sm text-zinc-400">
              Gostaram:{' '}
              {submission.likedMost
                .map((item) => optionLabel(UGC_LIKED_MOST, item) ?? item)
                .join(', ')}
              {submission.likedMostOther ? ` (${submission.likedMostOther})` : ''}
            </p>
          ) : null}
          {submission.highlight ? (
            <p className="mt-4 text-sm italic text-zinc-400">
              “{submission.highlight}”
            </p>
          ) : null}
          {submission.rpgExperience || submission.first3dSet ? (
            <p className="mt-3 text-xs text-zinc-500">
              {optionLabel(UGC_RPG_EXPERIENCE, submission.rpgExperience) ?? ''}
              {submission.first3dSet
                ? ` · 3D: ${optionLabel(UGC_FIRST_3D, submission.first3dSet)}`
                : ''}
            </p>
          ) : null}
        </div>

        {submission.media.length > 0 ? (
          <div className="border-t border-zinc-800/80 pt-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Mídias ({submission.media.length})
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {submission.media.map((item, index) =>
                item.url ? (
                  item.isVideo ? (
                    <video
                      key={item.id}
                      src={item.url}
                      controls
                      className="aspect-[4/3] w-full rounded border border-zinc-800 bg-zinc-900 object-cover"
                    />
                  ) : (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block aspect-[4/3] overflow-hidden rounded border border-zinc-800 bg-zinc-900"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.originalName ?? `Foto ${index + 1}`}
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      />
                    </a>
                  )
                ) : (
                  <p key={item.id} className="text-xs text-zinc-500">
                    Não foi possível assinar {item.path}
                  </p>
                )
              )}
            </div>
          </div>
        ) : null}

        <div className="border-t border-zinc-800/80 pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Autorizações registradas
          </p>
          <ul className="mt-3 space-y-1 text-xs text-zinc-400">
            <li>
              Uso do conteúdo · v{submission.consentContentVersion} ·{' '}
              {formatDateTime(submission.consentContentAt)}
            </li>
            {submission.consentLikenessAt ? (
              <li>
                Imagem de pessoas · v{submission.consentLikenessVersion} ·{' '}
                {formatDateTime(submission.consentLikenessAt)}
              </li>
            ) : (
              <li>Imagem de pessoas · não aplicável</li>
            )}
            <li>
              Ciência do brinde · v{submission.consentRewardVersion} ·{' '}
              {formatDateTime(submission.consentRewardAt)}
            </li>
            {submission.consentGuildaAt ? (
              <li>
                Destaque da Guilda · v{submission.consentGuildaVersion} ·{' '}
                {formatDateTime(submission.consentGuildaAt)}
              </li>
            ) : null}
          </ul>
          {submission.rejectReason ? (
            <p className="mt-3 text-sm text-red-300">
              Recusa: {rejectReasonLabel(submission.rejectReason)}
              {submission.reviewNote ? ` — ${submission.reviewNote}` : ''}
            </p>
          ) : null}
        </div>

        <AdminUgcReviewForm
          submissionId={submission.id}
          contentStatus={submission.contentStatus}
        />

        {submission.contentStatus === 'approved' ? (
          <AdminUgcMarketingForm
            submissionId={submission.id}
            usageTags={submission.usageTags}
            potential={submission.marketingPotential}
            notes={submission.marketingNotes}
            rewardStatus={submission.rewardStatus}
          />
        ) : null}
      </div>
    </div>
  );
}
