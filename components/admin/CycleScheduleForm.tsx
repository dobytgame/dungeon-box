'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  setCycleProductionMonthAction,
  updateCycleScheduleAction,
} from '@/lib/admin/actions';
import {
  PRODUCTION_CALENDAR_START,
  productionMonthLabel,
} from '@/lib/admin/production-month';

interface Props {
  cycleId: string;
  cycleNumber: number;
  productionMonthKey: string | null;
  scheduledProductionMonth: string | null;
  onSuccess?: () => void;
}

export default function CycleScheduleForm({
  cycleId,
  cycleNumber,
  productionMonthKey,
  scheduledProductionMonth,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [renumberSubmitting, setRenumberSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const defaultMonth = productionMonthKey ?? PRODUCTION_CALENDAR_START;
  const usesFallbackMonth =
    !scheduledProductionMonth && productionMonthKey != null;

  return (
    <div className="max-w-md space-y-5">
      <form
        key={`${cycleId}-month-${defaultMonth}`}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const productionMonth = formData.get('production_month') as string;

          setSubmitting(true);
          setError('');
          setMessage('');

          void setCycleProductionMonthAction(cycleId, productionMonth).then(
            (result) => {
              setSubmitting(false);
              if ('error' in result && result.error) {
                setError(result.error);
                return;
              }
              if ('unchanged' in result && result.unchanged) {
                setMessage('Este mês já está selecionado.');
                return;
              }
              setMessage('Mês de produção atualizado.');
              onSuccess?.();
            }
          );
        }}
      >
        <div>
          <label
            htmlFor={`production-month-${cycleId}`}
            className="block font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500"
          >
            Mês de produção
          </label>
          <input
            id={`production-month-${cycleId}`}
            name="production_month"
            type="month"
            min={PRODUCTION_CALENDAR_START}
            required
            disabled={submitting}
            defaultValue={defaultMonth}
            className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-console/50"
          />
        </div>

        <p className="text-xs text-zinc-500">
          {usesFallbackMonth ? (
            <>
              Hoje o kanban usa{' '}
              <span className="text-zinc-400">
                {productionMonthLabel(defaultMonth)}
              </span>{' '}
              pelo pagamento. Ao salvar, o mês fica fixo manualmente.
            </>
          ) : (
            <>
              O card aparece na coluna de{' '}
              <span className="text-zinc-400">
                {productionMonthLabel(defaultMonth)}
              </span>
              .
            </>
          )}
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex cursor-pointer items-center gap-2 rounded border border-console/30 bg-console/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-console transition hover:bg-console/15 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Salvando…
            </>
          ) : (
            'Salvar mês de produção'
          )}
        </button>
      </form>

      <details className="rounded border border-zinc-800/80 bg-zinc-950/40 p-4">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          Renumerar ciclo (avançado)
        </summary>
        <form
          key={`${cycleId}-cycle-${cycleNumber}`}
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            setRenumberSubmitting(true);
            setError('');
            setMessage('');

            void updateCycleScheduleAction(cycleId, formData).then((result) => {
              setRenumberSubmitting(false);
              if ('error' in result && result.error) {
                setError(result.error);
                return;
              }
              if ('success' in result && result.absorbed) {
                setMessage(
                  `Este card passou a ser o ciclo #${result.cycleNumber}. O ciclo que ocupava esse número foi removido — não foi criado outro no lugar.`
                );
              } else {
                setMessage('Número do ciclo atualizado.');
              }
              onSuccess?.();
            });
          }}
        >
          <p className="text-xs text-amber-200/80">
            O número que você gravar neste card prevalece. Se já existir outro
            ciclo com esse número nesta assinatura, aquele registro sai — não
            troca de lugar e não recria o ciclo antigo. Não confunda com o mês
            do kanban.
          </p>
          <div>
            <label
              htmlFor={`cycle-number-${cycleId}`}
              className="block font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500"
            >
              Número do ciclo
            </label>
            <input
              id={`cycle-number-${cycleId}`}
              name="cycle_number"
              type="number"
              min={1}
              step={1}
              required
              disabled={renumberSubmitting}
              defaultValue={cycleNumber}
              className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-zinc-100 outline-none focus:border-console/50"
            />
            <input type="hidden" name="production_month" value={defaultMonth} />
          </div>
          <button
            type="submit"
            disabled={renumberSubmitting}
            className="inline-flex cursor-pointer items-center gap-2 rounded border border-zinc-700 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
          >
            {renumberSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Salvando…
              </>
            ) : (
              'Salvar número do ciclo'
            )}
          </button>
        </form>
      </details>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
