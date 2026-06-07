'use client';

import { useState, useTransition } from 'react';
import { updateProfile } from '@/app/dashboard/actions';
import { maskCpf, maskPhone } from '@/lib/masks';
import type { Profile } from '@/lib/dashboard/types';

interface Props {
  profile: Profile;
}

export default function ProfileForm({ profile }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState(() =>
    profile.phone ? maskPhone(profile.phone) : ''
  );
  const [cpf, setCpf] = useState(() =>
    profile.cpf ? maskCpf(profile.cpf) : ''
  );

  function onSubmit(formData: FormData) {
    setMessage('');
    startTransition(async () => {
      const result = await updateProfile(formData);
      setMessage(result.error ? result.error : 'Perfil salvo com sucesso.');
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="font-display text-[0.65rem] uppercase tracking-[0.25em] text-stone-500">
            Nome completo
          </span>
          <input
            name="full_name"
            defaultValue={profile.full_name ?? ''}
            className="mt-2 w-full rounded-sm border border-white/[0.08] bg-stone-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-ember/40 focus:ring-1 focus:ring-ember/20"
          />
        </label>
        <label className="block">
          <span className="font-display text-[0.65rem] uppercase tracking-[0.25em] text-stone-500">
            Nome de exibição
          </span>
          <input
            name="display_name"
            defaultValue={profile.display_name ?? ''}
            className="mt-2 w-full rounded-sm border border-white/[0.08] bg-stone-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-ember/40 focus:ring-1 focus:ring-ember/20"
          />
        </label>
        <label className="block">
          <span className="font-display text-[0.65rem] uppercase tracking-[0.25em] text-stone-500">
            Telefone
          </span>
          <input
            name="phone"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            maxLength={15}
            className="mt-2 w-full rounded-sm border border-white/[0.08] bg-stone-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-ember/40 focus:ring-1 focus:ring-ember/20"
          />
        </label>
        <label className="block">
          <span className="font-display text-[0.65rem] uppercase tracking-[0.25em] text-stone-500">
            CPF
          </span>
          <input
            name="cpf"
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            maxLength={14}
            className="mt-2 w-full rounded-sm border border-white/[0.08] bg-stone-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-ember/40 focus:ring-1 focus:ring-ember/20"
          />
        </label>
        <label className="block">
          <span className="font-display text-[0.65rem] uppercase tracking-[0.25em] text-stone-500">
            Data de nascimento
          </span>
          <input
            type="date"
            name="birth_date"
            defaultValue={profile.birth_date ?? ''}
            className="mt-2 w-full rounded-sm border border-white/[0.08] bg-stone-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-ember/40 focus:ring-1 focus:ring-ember/20"
          />
        </label>
      </div>

      <label className="flex items-center gap-3 text-sm text-stone-300">
        <input
          type="checkbox"
          name="newsletter"
          defaultChecked={profile.newsletter ?? true}
          className="h-4 w-4 rounded border-white/20 bg-stone-950 text-ember focus:ring-ember"
        />
        Receber novidades, temas do mês e ofertas por e-mail
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-sm bg-ember px-6 py-3 font-display text-sm uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright disabled:opacity-50"
        >
          {pending ? 'Salvando…' : 'Salvar perfil'}
        </button>
        {message ? (
          <p className={`text-sm ${message.includes('sucesso') ? 'text-emerald-400' : 'text-red-400'}`}>
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
