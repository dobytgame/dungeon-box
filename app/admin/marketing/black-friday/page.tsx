import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import { requireAdmin } from '@/lib/admin/auth';
import { loadBlackFridayCampaignReport } from '@/lib/admin/black-friday-campaign';
import {
  BLACK_FRIDAY_CAMPAIGN_CODE,
  blackFridayCtaPlacementLabel,
} from '@/lib/campaigns/black-friday';
import { formatDateTime, formatMoney } from '@/lib/dashboard/format';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminBlackFridayCampaignPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const report = await loadBlackFridayCampaignReport(admin);

  const oferta = report.byPlacement.find((row) => row.placement === 'oferta');
  const hero = report.byPlacement.find((row) => row.placement === 'hero');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-medium text-zinc-100">Black Friday 2026</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Código {BLACK_FRIDAY_CAMPAIGN_CODE} · origem do CTA na LP e conversões no checkout
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Checkout aberto" value={String(report.intentsTotal)} hint="Intenções autenticadas" />
        <StatCard label="Assinaturas pagas" value={String(report.signupsTotal)} hint="campaign_signups" />
        <StatCard
          label="Cupom (meio da página)"
          value={String(oferta?.signups ?? 0)}
          hint={`${oferta?.intents ?? 0} abriram checkout`}
        />
        <StatCard
          label="1ª cobrança (total)"
          value={formatMoney(report.chargeCentsTotal)}
          hint="Soma first_charge_cents"
        />
      </div>

      <section className="rounded-lg border border-zinc-800 bg-zinc-950/80">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-400">Por origem do clique</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Compare checkouts vs. assinaturas. O meio da página usa <code className="text-zinc-300">origem=oferta</code>.
          </p>
        </div>
        <AdminTable
          rows={report.byPlacement.filter((row) => row.intents > 0 || row.signups > 0)}
          emptyMessage="Ainda não há dados. Aplique a migration e aguarde tráfego na LP."
          columns={[
            {
              key: 'label',
              header: 'Origem',
              cell: (row) => (
                <div>
                  <p className="text-zinc-100">{row.label}</p>
                  <p className="font-mono text-[10px] text-zinc-600">{row.placement}</p>
                </div>
              ),
            },
            {
              key: 'intents',
              header: 'Checkouts',
              cell: (row) => row.intents,
            },
            {
              key: 'signups',
              header: 'Assinaturas',
              cell: (row) => (
                <span className={row.placement === 'oferta' ? 'font-medium text-console' : ''}>
                  {row.signups}
                </span>
              ),
            },
            {
              key: 'rate',
              header: 'Conv.',
              cell: (row) =>
                row.intents > 0 ? `${Math.round((row.signups / row.intents) * 100)}%` : '—',
            },
          ]}
        />
      </section>

      {hero && (hero.signups > 0 || hero.intents > 0) ? (
        <p className="text-sm text-zinc-500">
          Hero: {hero.signups} assinatura(s) de {hero.intents} checkout(s).
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-400">Últimas conversões</h2>
        <AdminTable
          rows={report.signups}
          emptyMessage="Nenhuma assinatura registrada nesta campanha."
          columns={[
            {
              key: 'when',
              header: 'Data',
              cell: (row) => formatDateTime(row.created_at),
            },
            {
              key: 'customer',
              header: 'Cliente',
              cell: (row) => (
                <div>
                  <p className="text-zinc-100">{row.profile?.full_name ?? '—'}</p>
                  <p className="text-xs text-zinc-500">{row.profile?.email ?? row.user_id}</p>
                </div>
              ),
            },
            {
              key: 'origin',
              header: 'Origem',
              cell: (row) => blackFridayCtaPlacementLabel(row.cta_placement),
            },
            {
              key: 'term',
              header: 'Oferta',
              cell: (row) => (row.billing_term === 'combo_3' ? 'Combo 3m' : 'Mensal'),
            },
            {
              key: 'charge',
              header: '1ª cobrança',
              cell: (row) => formatMoney(row.first_charge_cents),
            },
            {
              key: 'sub',
              header: '',
              cell: (row) => (
                <Link
                  href={`/admin/assinaturas/${row.subscription_id}`}
                  className="text-sm text-console hover:underline"
                >
                  Assinatura →
                </Link>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-medium tabular-nums text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-600">{hint}</p>
    </div>
  );
}
