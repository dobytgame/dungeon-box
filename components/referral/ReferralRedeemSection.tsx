'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  REFERRAL_REWARDS,
  type ReferralRewardType,
} from '@/lib/referral/constants';
import type { Address } from '@/lib/dashboard/types';

interface Props {
  balance: number;
  defaultAddress: Address | null;
}

export default function ReferralRedeemSection({ balance, defaultAddress }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReferralRewardType | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [address, setAddress] = useState({
    recipient: defaultAddress?.recipient ?? '',
    zip_code: defaultAddress?.zip_code?.replace(/\D/g, '') ?? '',
    street: defaultAddress?.street ?? '',
    number: defaultAddress?.number ?? '',
    complement: defaultAddress?.complement ?? '',
    neighborhood: defaultAddress?.neighborhood ?? '',
    city: defaultAddress?.city ?? '',
    state: defaultAddress?.state ?? 'SP',
  });

  async function handleRedeem(rewardType: ReferralRewardType) {
    setSelected(rewardType);
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/referral/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewardType,
          shippingAddress: address,
          notes: rewardType === 'avulso' ? notes : null,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof payload.error === 'string'
            ? payload.error
            : 'Não foi possível solicitar o resgate.'
        );
      }

      setSuccess('Resgate solicitado! Enviaremos junto ao seu próximo kit mensal.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao resgatar.');
    } finally {
      setLoading(false);
      setSelected(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-emerald-400" role="status">
          {success}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-xs uppercase tracking-[0.15em] text-stone-500">
              <th className="px-3 py-3 font-normal">Recompensa</th>
              <th className="px-3 py-3 font-normal">Pontos</th>
              <th className="px-3 py-3 font-normal" />
            </tr>
          </thead>
          <tbody>
            {REFERRAL_REWARDS.map((reward) => {
              const canRedeem = balance >= reward.points;
              const isLoading = loading && selected === reward.type;

              return (
                <tr
                  key={reward.type}
                  className="border-b border-white/[0.04] text-stone-300"
                >
                  <td className="px-3 py-4">
                    <p className="font-medium text-white">{reward.label}</p>
                    <p className="mt-1 text-xs text-stone-500">{reward.description}</p>
                  </td>
                  <td className="px-3 py-4 font-display text-gold">{reward.points}</td>
                  <td className="px-3 py-4 text-right">
                    <button
                      type="button"
                      disabled={!canRedeem || loading}
                      onClick={() => handleRedeem(reward.type)}
                      className="inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-sm border border-white/15 px-4 py-2 font-display text-[0.65rem] uppercase tracking-widest text-stone-200 transition-colors hover:border-ember/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : null}
                      Resgatar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-sm border border-white/[0.06] bg-stone-950/30 p-5">
        <h3 className="font-display text-sm uppercase tracking-widest text-white">
          Endereço de entrega
        </h3>
        <p className="mt-2 text-sm text-stone-500">
          A recompensa será enviada junto ao seu próximo kit mensal.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs text-stone-500">Destinatário</span>
            <input
              value={address.recipient}
              onChange={(e) =>
                setAddress((prev) => ({ ...prev, recipient: e.target.value }))
              }
              className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label>
            <span className="text-xs text-stone-500">CEP</span>
            <input
              value={address.zip_code}
              onChange={(e) =>
                setAddress((prev) => ({
                  ...prev,
                  zip_code: e.target.value.replace(/\D/g, '').slice(0, 8),
                }))
              }
              className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label>
            <span className="text-xs text-stone-500">Número</span>
            <input
              value={address.number}
              onChange={(e) =>
                setAddress((prev) => ({ ...prev, number: e.target.value }))
              }
              className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs text-stone-500">Rua</span>
            <input
              value={address.street}
              onChange={(e) =>
                setAddress((prev) => ({ ...prev, street: e.target.value }))
              }
              className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label>
            <span className="text-xs text-stone-500">Bairro</span>
            <input
              value={address.neighborhood}
              onChange={(e) =>
                setAddress((prev) => ({ ...prev, neighborhood: e.target.value }))
              }
              className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label>
            <span className="text-xs text-stone-500">Cidade</span>
            <input
              value={address.city}
              onChange={(e) =>
                setAddress((prev) => ({ ...prev, city: e.target.value }))
              }
              className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-xs text-stone-500">
            Produto avulso desejado (obrigatório para resgate avulso)
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: Pincel detalhe #2"
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
    </div>
  );
}
