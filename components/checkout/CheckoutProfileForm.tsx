'use client';

import { useState, useTransition } from 'react';
import { Loader2, UserRound } from 'lucide-react';
import { updateProfile } from '@/app/dashboard/actions';
import { maskCpf, maskPhone } from '@/lib/masks';
import type { Profile } from '@/lib/dashboard/types';

const inputClass =
  'mt-2 w-full rounded-sm border border-white/[0.08] bg-stone-950/80 px-3 py-2.5 text-sm text-white outline-none transition-colors duration-200 focus:border-frost/40 focus:ring-1 focus:ring-frost/20';

const labelClass =
  'font-display text-[0.65rem] uppercase tracking-[0.25em] text-stone-500';

interface Props {
  profile: Profile;
  requirePhone: boolean;
  onSaved: (updates: Pick<Profile, 'full_name' | 'phone' | 'cpf'>) => void;
}

export default function CheckoutProfileForm({
  profile,
  requirePhone,
  onSaved,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [phone, setPhone] = useState(() =>
    profile.phone ? maskPhone(profile.phone) : ''
  );
  const [cpf, setCpf] = useState(() =>
    profile.cpf ? maskCpf(profile.cpf) : ''
  );

  const needsFullName = !profile.full_name?.trim();
  const cpfDigits = (profile.cpf ?? '').replace(/\D/g, '');
  const phoneDigits = (profile.phone ?? '').replace(/\D/g, '');
  const needsCpf = cpfDigits.length !== 11;
  const needsPhone = requirePhone && phoneDigits.length < 10;

  if (!needsFullName && !needsCpf && !needsPhone) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const formData = new FormData(event.currentTarget);
    const nextCpf = (formData.get('cpf') as string)?.replace(/\D/g, '') ?? '';
    const nextPhone = (formData.get('phone') as string)?.replace(/\D/g, '') ?? '';
    const nextFullName =
      (formData.get('full_name') as string)?.trim() ||
      profile.full_name?.trim() ||
      null;

    if (needsCpf && nextCpf.length !== 11) {
      setError('Informe um CPF válido com 11 dígitos.');
      return;
    }

    if (needsPhone && nextPhone.length < 10) {
      setError('Informe um telefone com DDD.');
      return;
    }

    if (needsFullName && !nextFullName) {
      setError('Informe seu nome completo.');
      return;
    }

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.error) {
        setError(result.error);
        return;
      }

      onSaved({
        full_name: nextFullName,
        phone: nextPhone || profile.phone,
        cpf: nextCpf || profile.cpf,
      });
    });
  }

  return (
    <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-stone-950/60">
          <UserRound className="h-5 w-5 text-amber-200/80" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-100/95">
            Complete seus dados para pagar
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-100/75">
            {requirePhone
              ? 'CPF e telefone são obrigatórios para cobrança recorrente no cartão.'
              : 'O CPF é obrigatório para assinaturas recorrentes.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {needsFullName ? (
          <label className="block">
            <span className={labelClass}>Nome completo</span>
            <input
              name="full_name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              required
              className={inputClass}
            />
          </label>
        ) : (
          <input type="hidden" name="full_name" value={profile.full_name ?? ''} />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {needsCpf ? (
            <label className="block">
              <span className={labelClass}>CPF</span>
              <input
                name="cpf"
                value={cpf}
                onChange={(event) => setCpf(maskCpf(event.target.value))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                maxLength={14}
                required
                className={inputClass}
              />
            </label>
          ) : (
            <input type="hidden" name="cpf" value={profile.cpf ?? ''} />
          )}

          {needsPhone ? (
            <label className="block">
              <span className={labelClass}>Telefone</span>
              <input
                name="phone"
                value={phone}
                onChange={(event) => setPhone(maskPhone(event.target.value))}
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                maxLength={15}
                required
                className={inputClass}
              />
            </label>
          ) : (
            <input type="hidden" name="phone" value={profile.phone ?? ''} />
          )}
        </div>

        <input
          type="hidden"
          name="display_name"
          value={profile.display_name ?? ''}
        />
        <input
          type="hidden"
          name="birth_date"
          value={profile.birth_date ?? ''}
        />
        {profile.newsletter ? (
          <input type="hidden" name="newsletter" value="on" />
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-ember px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Salvando…
              </>
            ) : (
              'Salvar e continuar'
            )}
          </button>
          {error ? (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
