'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminUpdateCustomerBillingProfileAction } from '@/lib/admin/actions';
import { maskCpf, maskPhone } from '@/lib/masks';

function hasValidCpf(value: string | null | undefined): boolean {
  return (value?.replace(/\D/g, '') ?? '').length === 11;
}

function hasValidPhone(value: string | null | undefined): boolean {
  return (value?.replace(/\D/g, '') ?? '').length >= 10;
}

interface Props {
  userId: string;
  cpf: string | null;
  phone: string | null;
  onSaved?: () => void;
}

export default function AdminCustomerBillingProfileForm({
  userId,
  cpf,
  phone,
  onSaved,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cpfValue, setCpfValue] = useState(cpf ? maskCpf(cpf) : '');
  const [phoneValue, setPhoneValue] = useState(phone ? maskPhone(phone) : '');

  const needsCpf = !hasValidCpf(cpf);
  const needsPhone = !hasValidPhone(phone);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await adminUpdateCustomerBillingProfileAction(
        userId,
        formData
      );
      if ('error' in response && response.error) {
        setError(response.error);
        return;
      }

      setMessage('Dados salvos.');
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-sm border border-amber-500/25 bg-amber-500/[0.05] p-4"
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-amber-200/90">
          Dados para cobrança PIX
        </p>
        <p className="mt-1 text-sm text-stone-400">
          {needsCpf && needsPhone
            ? 'Informe CPF e telefone do cliente para gerar o PIX.'
            : needsCpf
              ? 'Informe o CPF do cliente para gerar o PIX.'
              : 'Informe o telefone do cliente para gerar o PIX.'}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-stone-500">
            CPF
          </span>
          <input
            name="cpf"
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            maxLength={14}
            value={cpfValue}
            onChange={(event) => setCpfValue(maskCpf(event.target.value))}
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 font-mono text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-stone-500">
            Telefone
          </span>
          <input
            name="phone"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            maxLength={15}
            value={phoneValue}
            onChange={(event) => setPhoneValue(maskPhone(event.target.value))}
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-sm border border-amber-400/40 bg-amber-500/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-50"
      >
        {pending ? 'Salvando…' : 'Salvar dados'}
      </button>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-amber-100">{message}</p> : null}
    </form>
  );
}

export { hasValidCpf, hasValidPhone };
