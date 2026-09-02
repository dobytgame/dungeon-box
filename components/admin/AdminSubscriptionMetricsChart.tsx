'use client';

import { useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailySalesPeriod } from '@/lib/admin/daily-sales';
import type { SubscriptionMetricsChartData } from '@/lib/admin/subscription-metrics';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  data: SubscriptionMetricsChartData;
}

type SeriesKey = 'novos' | 'cancelamentos' | 'renovacoes';

const COUNT_SERIES: {
  key: SeriesKey;
  label: string;
  color: string;
}[] = [
  { key: 'novos', label: 'Novos', color: '#34d399' },
  { key: 'cancelamentos', label: 'Cancelamentos', color: '#f87171' },
  { key: 'renovacoes', label: 'Renovações', color: '#2dd4bf' },
];

const PERIOD_OPTIONS: { value: DailySalesPeriod; label: string }[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'year', label: 'Ano inteiro' },
];

const MONTH_OPTIONS = [
  { value: '', label: 'Todos os meses' },
  ...Array.from({ length: 12 }, (_, index) => {
    const date = new Date(2026, index, 1);
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
    return { value: String(index + 1), label };
  }),
];

function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

function formatMrrAxis(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return `R$ ${value}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const novos = payload.find((entry) => entry.dataKey === 'novos')?.value ?? 0;
  const cancelamentos =
    payload.find((entry) => entry.dataKey === 'cancelamentos')?.value ?? 0;
  const renovacoes =
    payload.find((entry) => entry.dataKey === 'renovacoes')?.value ?? 0;
  const mrr = payload.find((entry) => entry.dataKey === 'mrr')?.value ?? 0;
  const ativos = payload.find((entry) => entry.dataKey === 'ativos')?.value ?? 0;

  return (
    <div className="rounded-md border border-white/10 bg-stone-950/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
        {label}
      </p>
      <div className="mt-2 space-y-1">
        <p className="font-mono text-xs text-emerald-300">Novos: {novos}</p>
        <p className="font-mono text-xs text-red-300">Cancelamentos: {cancelamentos}</p>
        <p className="font-mono text-xs text-console">Renovações: {renovacoes}</p>
        <p className="font-mono text-xs text-gold">
          MRR: {formatMoney(Math.round(mrr * 100))}
        </p>
        <p className="border-t border-white/10 pt-1 font-mono text-xs text-zinc-300">
          Ativos: {ativos}
        </p>
      </div>
    </div>
  );
}

export default function AdminSubscriptionMetricsChart({ data }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [activeSeries, setActiveSeries] = useState<Record<SeriesKey, boolean>>({
    novos: true,
    cancelamentos: true,
    renovacoes: true,
  });

  const chartData = useMemo(
    () =>
      data.points.map((point) => ({
        label: point.label,
        novos: point.newCount,
        cancelamentos: point.cancelledCount,
        renovacoes: point.renewalCount,
        mrr: centsToReais(point.mrrCents),
        ativos: point.activeCount,
      })),
    [data.points]
  );

  const tickInterval = Math.max(1, Math.floor(chartData.length / 8));

  function updateFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function toggleSeries(key: SeriesKey) {
    setActiveSeries((current) => {
      const next = { ...current, [key]: !current[key] };
      if (!next.novos && !next.cancelamentos && !next.renovacoes) return current;
      return next;
    });
  }

  return (
    <div className="admin-panel rounded p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Assinaturas
          </p>
          <h3 className="mt-2 text-lg font-medium text-zinc-100">
            Movimento e recorrência
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
            {data.periodLabel} · {data.totals.newCount} novos ·{' '}
            {data.totals.cancelledCount} cancelamentos · {data.totals.renewalCount}{' '}
            renovações
            {data.totals.renewalRevenueCents > 0 ? (
              <>
                {' '}
                ·{' '}
                <span className="text-gold">
                  {formatMoney(data.totals.renewalRevenueCents)} em renovações
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="sub-metrics-year">
            Ano
          </label>
          <select
            id="sub-metrics-year"
            value={String(data.filters.year)}
            disabled={isPending}
            onChange={(event) => updateFilters({ salesYear: event.target.value })}
            className="rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          >
            {data.availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="sub-metrics-month">
            Mês
          </label>
          <select
            id="sub-metrics-month"
            value={data.filters.month ? String(data.filters.month) : ''}
            disabled={isPending}
            onChange={(event) => updateFilters({ salesMonth: event.target.value })}
            className="rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          >
            {MONTH_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="sub-metrics-period">
            Período
          </label>
          <select
            id="sub-metrics-period"
            value={data.filters.period}
            disabled={isPending || data.filters.month != null}
            onChange={(event) => updateFilters({ salesPeriod: event.target.value })}
            className="rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 rounded-sm border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs leading-relaxed text-zinc-500">
        <strong className="font-medium text-emerald-300">Novos</strong> = 1ª cobrança
        aprovada no dia (Asaas ou Pagar.me).{' '}
        <strong className="font-medium text-console">Renovações</strong> = 2ª cobrança
        em diante, quando o pagamento é confirmado. Combos não geram renovação durante o
        período pré-pago.
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {COUNT_SERIES.map((series) => {
          const active = activeSeries[series.key];
          return (
            <button
              key={series.key}
              type="button"
              onClick={() => toggleSeries(series.key)}
              className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-xs transition ${
                active
                  ? 'border-white/15 bg-white/5 text-zinc-100'
                  : 'border-white/5 text-zinc-600'
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: active ? series.color : '#52525b' }}
                aria-hidden="true"
              />
              {series.label}
            </button>
          );
        })}
        <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500">
          <span className="h-0.5 w-4 bg-gold" aria-hidden="true" />
          MRR (linha)
        </span>
      </div>

      {chartData.length === 0 ? (
        <p className="mt-8 font-mono text-xs text-zinc-600">Sem dados no período.</p>
      ) : (
        <div
          className={`mt-6 h-[340px] w-full ${isPending ? 'opacity-60' : ''}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                interval={tickInterval}
                tick={{ fill: '#71717a', fontSize: 11 }}
              />
              <YAxis
                yAxisId="count"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={32}
                allowDecimals={false}
                tick={{ fill: '#71717a', fontSize: 11 }}
              />
              <YAxis
                yAxisId="mrr"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={56}
                tickFormatter={formatMrrAxis}
                tick={{ fill: '#a8a29e', fontSize: 11 }}
              />
              <Tooltip content={<ChartTooltip />} />
              {COUNT_SERIES.map((series) =>
                activeSeries[series.key] ? (
                  <Bar
                    key={series.key}
                    yAxisId="count"
                    dataKey={series.key}
                    fill={series.color}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={18}
                    isAnimationActive={!isPending}
                  />
                ) : null
              )}
              <Line
                yAxisId="mrr"
                type="monotone"
                dataKey="mrr"
                stroke="#d4a853"
                strokeWidth={2}
                dot={false}
                isAnimationActive={!isPending}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4 border-t border-white/[0.06] pt-4 font-mono text-[11px] text-zinc-500">
        <span>
          Churn:{' '}
          <strong className="text-red-300">
            {data.summary.churnRatePercent != null
              ? `${data.summary.churnRatePercent}%`
              : '—'}
          </strong>
        </span>
        <span>
          Retenção:{' '}
          <strong className="text-console">
            {data.summary.retentionRatePercent != null
              ? `${data.summary.retentionRatePercent}%`
              : '—'}
          </strong>
        </span>
        <span>
          Crescimento líquido:{' '}
          <strong
            className={
              data.totals.netGrowth >= 0 ? 'text-emerald-300' : 'text-red-300'
            }
          >
            {data.totals.netGrowth >= 0 ? '+' : ''}
            {data.totals.netGrowth}
          </strong>
        </span>
        <span>
          Renovações pagas:{' '}
          <strong className="text-console">{data.totals.renewalCount}</strong>
          {data.totals.renewalRevenueCents > 0 ? (
            <span className="text-gold">
              {' '}
              · {formatMoney(data.totals.renewalRevenueCents)}
            </span>
          ) : null}
        </span>
        <span>
          MRR recorrente:{' '}
          <strong className="text-gold">{formatMoney(data.summary.mrrCents)}</strong>
        </span>
        <span>
          Ativos:{' '}
          <strong className="text-zinc-200">{data.summary.activeSubscribers}</strong>
        </span>
      </div>
    </div>
  );
}
