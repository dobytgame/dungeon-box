'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateProfile } from '@/app/dashboard/actions';
import { maskCpf, maskPhone } from '@/lib/masks';
import { parseBrazilPhoneForStorage } from '@/lib/phone/brazil';
import type { Profile } from '@/lib/dashboard/types';
import { mesaFieldLabel, mesaInput, mesaPrimaryButton } from '@/lib/dashboard/ui';

interface Props {
  profile: Profile;
  redirectTo?: string;
}

export default function ProfileForm({ profile, redirectTo }: Props) {
  const router = useRouter();
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

    const rawPhone = (formData.get('phone') as string)?.trim() ?? '';
    if (rawPhone) {
      const parsed = parseBrazilPhoneForStorage(rawPhone);
      if (!parsed.ok) {
        setMessage(parsed.error);
        return;
      }
    }

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      if (redirectTo && redirectTo.startsWith('/')) {
        router.push(redirectTo);
        router.refresh();
        return;
      }
      setMessage('Perfil salvo com sucesso.');
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className={mesaFieldLabel}>Nome completo</span>
          <input
            name="full_name"
            defaultValue={profile.full_name ?? ''}
            className={mesaInput}
          />
        </label>
        <label className="block">
          <span className={mesaFieldLabel}>Nome de exibição</span>
          <input
            name="display_name"
            defaultValue={profile.display_name ?? ''}
            className={mesaInput}
          />
        </label>
        <label className="block">
          <span className={mesaFieldLabel}>Telefone</span>
          <input
            name="phone"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            maxLength={18}
            className={mesaInput}
          />
        </label>
        <label className="block">
          <span className={mesaFieldLabel}>CPF</span>
          <input
            name="cpf"
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            maxLength={14}
            className={mesaInput}
          />
        </label>
        <label className="block">
          <span className={mesaFieldLabel}>Data de nascimento</span>
          <input
            type="date"
            name="birth_date"
            defaultValue={profile.birth_date ?? ''}
            className={mesaInput}
          />
        </label>
      </div>

      <label className="flex min-h-11 items-center gap-3 text-sm text-mesa-parchment">
        <input
          type="checkbox"
          name="newsletter"
          defaultChecked={profile.newsletter ?? true}
          className="size-4 rounded border-white/20 bg-mesa-ink text-mesa-ember focus:ring-mesa-ember"
        />
        Receber novidades, temas do mês e ofertas por e-mail
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className={mesaPrimaryButton}
        >
          {pending ? 'Salvando…' : 'Salvar perfil'}
        </button>
        {message ? (
          <p className={`text-sm ${message.includes('sucesso') ? 'text-mesa-jade' : 'text-mesa-ember'}`}>
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
