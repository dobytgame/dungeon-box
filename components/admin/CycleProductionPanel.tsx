'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import type { CycleStatus } from '@/lib/dashboard/types';
import { advanceCycleProductionAction } from '@/lib/admin/actions';
import {
  getAllowedCycleTransitions,
  getCycleRollbackTargets,
  productionActionLabel,
} from '@/lib/subscriptions/cycle-production';
import CycleShipForm from './CycleShipForm';

interface Props {
  cycleId: string;
  status: CycleStatus;
  defaultCarrier?: string;
  cancelReason?: string | null;
  productionNotes?: string | null;
  shipMode?: 'inline' | 'modal';
  onShipRequest?: () => void;
  onUpdated?: () => void;
}

export default function CycleProductionPanel({
  cycleId,
  status,
  defaultCarrier = 'Correios',
  cancelReason,
  productionNotes,
  shipMode = 'inline',
  onShipRequest,
  onUpdated,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

  function handleSuccess(message: string) {
    setMessage(message);
    onUpdated?.();
  }

  const transitions = getAllowedCycleTransitions(status).filter((target) => {
    if (target === 'shipped') return false;
    if (status === 'shipped' && target === 'delivered') return false;
    return true;
  });

  const rollbackTargets = getCycleRollbackTargets(status);

  if (status === 'cancelled') {
    return (
      <section className="admin-panel rounded p-5 md:p-6">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
          Produção encerrada
        </h3>
        {cancelReason ? (
          <p className="mt-3 text-sm text-zinc-500">
            Motivo: <span className="text-zinc-300">{cancelReason}</span>
          </p>
        ) : null}
        {productionNotes ? (
          <p className="mt-2 text-sm text-zinc-500">
            Notas: <span className="text-zinc-300">{productionNotes}</span>
          </p>
        ) : null}
      </section>
    );
  }

  function runTransition(target: CycleStatus, successMessage: string) {
    setError('');
    setMessage('');
    startTransition(async () => {
      const result = await advanceCycleProductionAction(cycleId, target);
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      handleSuccess(successMessage);
    });
  }

  return (
    <section className="space-y-6">
      {rollbackTargets.length > 0 ? (
        <div className="admin-panel rounded border-amber-500/20 p-5 md:p-6">
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-amber-200/90">
            Corrigir status
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Use se o pedido avançou por engano. Pode voltar para qualquer etapa
            anterior; dados de envio e entrega são removidos quando necessário.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {rollbackTargets.map((rollbackTarget) => {
              const rollbackLabel = productionActionLabel(status, rollbackTarget);
              if (!rollbackLabel) return null;

              return (
                <button
                  key={rollbackTarget}
                  type="button"
                  disabled={pending}
                  onClick={() => runTransition(rollbackTarget, 'Status revertido.')}
                  className="cursor-pointer rounded border border-amber-500/30 bg-amber-500/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-200 transition hover:bg-amber-500/15 disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
                  ) : (
                    rollbackLabel
                  )}
                </button>
              );
            })}
          </div>
          {error ? (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-3 text-sm text-emerald-300" role="status">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}

      {status === 'preparing' ? (
        <div className="admin-panel rounded border-console/20 p-5 md:p-6">
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-console">
            Registrar envio
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Move o pedido para <strong className="text-zinc-300">Enviado</strong> e
            dispara o e-mail de rastreio.
          </p>
          {shipMode === 'modal' ? (
            <button
              type="button"
              onClick={onShipRequest}
              className="mt-5 cursor-pointer rounded border border-console/30 bg-console/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-console transition hover:bg-console/15"
            >
              Abrir formulário de rastreio
            </button>
          ) : (
            <div className="mt-5 max-w-md">
              <CycleShipForm
                cycleId={cycleId}
                defaultCarrier={defaultCarrier}
                onSuccess={() => handleSuccess('Envio registrado. E-mail de rastreio disparado.')}
              />
            </div>
          )}
        </div>
      ) : null}

      {transitions.length > 0 ? (
        <div className="admin-panel rounded p-5 md:p-6">
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
            Ações de produção
          </h3>

          <div className="mt-4 flex flex-wrap gap-2">
            {transitions.map((target) => {
              const label = productionActionLabel(status, target);
              if (!label) return null;

              if (target === 'cancelled') {
                return (
                  <button
                    key={target}
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setShowCancelForm((value) => !value);
                      setError('');
                      setMessage('');
                    }}
                    className="cursor-pointer rounded border border-red-500/30 bg-red-500/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
                  >
                    {label}
                  </button>
                );
              }

              return (
                <button
                  key={target}
                  type="button"
                  disabled={pending}
                  onClick={() => runTransition(target, 'Status atualizado.')}
                  className="cursor-pointer rounded border border-console/30 bg-console/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-console transition hover:bg-console/15 disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
                  ) : (
                    label
                  )}
                </button>
              );
            })}
          </div>

          {showCancelForm ? (
            <form
              className="mt-4 max-w-lg space-y-3 border-t border-zinc-800 pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                setError('');
                setMessage('');
                startTransition(async () => {
                  const result = await advanceCycleProductionAction(
                    cycleId,
                    'cancelled',
                    formData
                  );
                  if ('error' in result && result.error) {
                    setError(result.error);
                    return;
                  }
                  handleSuccess('Pedido cancelado.');
                  setShowCancelForm(false);
                });
              }}
            >
              <div>
                <label
                  htmlFor={`cancel-reason-${cycleId}`}
                  className="block font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500"
                >
                  Motivo do cancelamento
                </label>
                <textarea
                  id={`cancel-reason-${cycleId}`}
                  name="cancel_reason"
                  required
                  rows={3}
                  disabled={pending}
                  placeholder="Ex.: assinatura cancelada antes do envio"
                  className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="cursor-pointer rounded border border-red-500/40 bg-red-500/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-red-300 disabled:opacity-50"
              >
                Confirmar cancelamento
              </button>
            </form>
          ) : null}

          {error ? (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-3 text-sm text-emerald-300" role="status">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}

      {status === 'shipped' ? (
        <div className="admin-panel rounded p-5 md:p-6">
          <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
            Pós-envio
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Quando o rastreio confirmar entrega, marque como entregue.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => runTransition('delivered', 'Pedido marcado como entregue.')}
            className="mt-4 cursor-pointer rounded border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
          >
            {pending ? 'Salvando…' : 'Marcar entregue'}
          </button>
          {error ? (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-3 text-sm text-emerald-300" role="status">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
