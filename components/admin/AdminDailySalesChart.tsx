'use client';

import { useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  DailySalesChartData,
  DailySalesPeriod,
} from '@/lib/admin/daily-sales';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  data: DailySalesChartData;
}

type SeriesKey = 'assinatura' | 'loja';

const NEW_SALES_SERIES: {
  key: SeriesKey;
  label: string;
  color: string;
  fill: string;
}[] = [
  {
    key: 'assinatura',
    label: 'Assinatura (nova)',
    color: '#2dd4bf',
    fill: 'rgba(45, 212, 191, 0.35)',
  },
  {
    key: 'loja',
    label: 'Loja (nova)',
    color: '#60a5fa',
    fill: 'rgba(96, 165, 250, 0.35)',
  },
];

const RENEWAL_COLOR = '#d4a853';

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

function formatAxisValue(value: number): string {
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

  const assinatura =
    payload.find((entry) => entry.dataKey === 'assinatura')?.value ?? 0;
  const loja = payload.find((entry) => entry.dataKey === 'loja')?.value ?? 0;
  const renovacoes =
    payload.find((entry) => entry.dataKey === 'renovacoes')?.value ?? 0;
  const novas = assinatura + loja;
  const total = novas + renovacoes;

  return (
    <div className="rounded-md border border-white/10 bg-stone-950/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
        {label}
      </p>
      <div className="mt-2 space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          Vendas novas
        </p>
        <p className="font-mono text-xs text-console">
          Assinatura: {formatMoney(Math.round(assinatura * 100))}
        </p>
        <p className="font-mono text-xs text-sky-300">
          Loja: {formatMoney(Math.round(loja * 100))}
        </p>
        <p className="font-mono text-xs text-zinc-300">
          Subtotal novas: {formatMoney(Math.round(novas * 100))}
        </p>
        <p className="border-t border-white/10 pt-1 font-mono text-xs text-gold">
          Renovações: {formatMoney(Math.round(renovacoes * 100))}
        </p>
        <p className="border-t border-white/10 pt-1 font-mono text-xs text-zinc-200">
          Receita total: {formatMoney(Math.round(total * 100))}
        </p>
      </div>
    </div>
  );
}

export default function AdminDailySalesChart({ data }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [activeSeries, setActiveSeries] = useState<Record<SeriesKey, boolean>>({
    assinatura: true,
    loja: true,
  });
  const [showRenewals, setShowRenewals] = useState(true);

  const chartData = useMemo(
    () =>
      data.points.map((point) => ({
        label: point.label,
        assinatura: centsToReais(point.assinaturaCents),
        loja: centsToReais(point.lojaCents),
        renovacoes: centsToReais(point.renewalCents),
        novas: centsToReais(point.totalCents),
        total: centsToReais(point.totalRevenueCents),
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
      if (!next.assinatura && !next.loja) return current;
      return next;
    });
  }

  return (
    <div className="admin-panel rounded p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Receita diária
          </p>
          <h3 className="mt-2 text-lg font-medium text-zinc-100">
            Vendas novas e renovações
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
            {data.periodLabel} ·{' '}
            <span className="text-zinc-300">
              {formatMoney(data.totals.totalCents)} em vendas novas
            </span>
            {data.totals.renewalCents > 0 ? (
              <>
                {' '}
                ·{' '}
                <span className="text-gold">
                  {formatMoney(data.totals.renewalCents)} em renovações
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="sales-chart-year">
            Ano
          </label>
          <select
            id="sales-chart-year"
            value={String(data.filters.year)}
            disabled={isPending}
            onChange={(event) =>
              updateFilters({ salesYear: event.target.value })
            }
            className="rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          >
            {data.availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="sales-chart-month">
            Mês
          </label>
          <select
            id="sales-chart-month"
            value={data.filters.month ? String(data.filters.month) : ''}
            disabled={isPending}
            onChange={(event) =>
              updateFilters({ salesMonth: event.target.value })
            }
            className="rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          >
            {MONTH_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="sales-chart-period">
            Período
          </label>
          <select
            id="sales-chart-period"
            value={data.filters.period}
            disabled={isPending || data.filters.month != null}
            onChange={(event) =>
              updateFilters({ salesPeriod: event.target.value })
            }
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
        <strong className="font-medium text-zinc-300">Vendas novas</strong> = 1ª
        cobrança (assinatura, combo ou loja).{' '}
        <strong className="font-medium text-gold">Renovações</strong> = mensalidades
        recorrentes já pagas. Combos entram só na compra inicial — não geram
        renovação mensal durante o período pré-pago.
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {NEW_SALES_SERIES.map((series) => {
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
        <button
          type="button"
          onClick={() => setShowRenewals((current) => !current)}
          className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-xs transition ${
            showRenewals
              ? 'border-white/15 bg-white/5 text-zinc-100'
              : 'border-white/5 text-zinc-600'
          }`}
        >
          <span
            className="h-0.5 w-4"
            style={{ backgroundColor: showRenewals ? RENEWAL_COLOR : '#52525b' }}
            aria-hidden="true"
          />
          Renovações (linha)
        </button>
      </div>

      {chartData.length === 0 ? (
        <p className="mt-8 font-mono text-xs text-zinc-600">Sem dados no período.</p>
      ) : (
        <div
          className={`mt-6 h-[320px] w-full ${isPending ? 'opacity-60' : ''}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                {NEW_SALES_SERIES.map((series) => (
                  <linearGradient
                    key={series.key}
                    id={`fill-${series.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={series.color} stopOpacity={0.45} />
                    <stop offset="95%" stopColor={series.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
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
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={56}
                tickFormatter={formatAxisValue}
                tick={{ fill: '#71717a', fontSize: 11 }}
              />
              <Tooltip content={<ChartTooltip />} />
              {NEW_SALES_SERIES.map((series) =>
                activeSeries[series.key] ? (
                  <Area
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    stackId="new-sales"
                    stroke={series.color}
                    strokeWidth={2}
                    fill={`url(#fill-${series.key})`}
                    fillOpacity={1}
                    isAnimationActive={!isPending}
                  />
                ) : null
              )}
              {showRenewals ? (
                <Line
                  type="monotone"
                  dataKey="renovacoes"
                  stroke={RENEWAL_COLOR}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={!isPending}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4 border-t border-white/[0.06] pt-4 font-mono text-[11px] text-zinc-500">
        <span>
          Vendas novas:{' '}
          <strong className="text-zinc-200">
            {formatMoney(data.totals.totalCents)}
          </strong>
        </span>
        <span>
          Assinatura:{' '}
          <strong className="text-console">
            {formatMoney(data.totals.assinaturaCents)}
          </strong>
        </span>
        <span>
          Loja:{' '}
          <strong className="text-sky-300">{formatMoney(data.totals.lojaCents)}</strong>
        </span>
        <span>
          Renovações:{' '}
          <strong className="text-gold">
            {formatMoney(data.totals.renewalCents)}
          </strong>
        </span>
        <span>
          Receita total:{' '}
          <strong className="text-zinc-100">
            {formatMoney(data.totals.totalRevenueCents)}
          </strong>
        </span>
      </div>
    </div>
  );
}
