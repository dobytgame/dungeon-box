'use client';

import { useState, useTransition } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { saveAddress } from '@/app/dashboard/actions';
import { BRAZIL_STATES } from '@/lib/dashboard/constants';
import { formatZip } from '@/lib/dashboard/format';
import type { Address } from '@/lib/dashboard/types';
import type { CheckoutData } from '@/lib/checkout/types';
import { digitsOnly, maskCep } from '@/lib/masks';
import { fetchAddressByCep } from '@/lib/viacep';
import CheckoutSection from './CheckoutSection';

interface Props {
  data: CheckoutData;
  setData: React.Dispatch<React.SetStateAction<CheckoutData>>;
  addresses: Address[];
  onNext: () => void;
  onBack: () => void;
}

const emptyForm = {
  label: 'Entrega',
  recipient: '',
  zip_code: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: 'SP',
};

const inputClass =
  'mt-2 w-full rounded-sm border border-white/[0.08] bg-stone-950/80 px-3 py-2.5 text-sm text-white outline-none transition-colors duration-200 focus:border-frost/40 focus:ring-1 focus:ring-frost/20';

const labelClass =
  'font-display text-[0.65rem] uppercase tracking-[0.25em] text-stone-500';

export default function StepAddress({
  data,
  setData,
  addresses,
  onNext,
  onBack,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(addresses.length === 0);
  const [form, setForm] = useState(emptyForm);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  const selected = addresses.find((a) => a.id === data.addressId);

  async function handleCepChange(raw: string) {
    const masked = maskCep(raw);
    setForm((f) => ({ ...f, zip_code: masked }));
    setCepError('');

    if (digitsOnly(masked).length !== 8) return;

    setCepLoading(true);
    const result = await fetchAddressByCep(masked);
    setCepLoading(false);

    if (!result) {
      setCepError('CEP não encontrado.');
      return;
    }

    setForm((f) => ({
      ...f,
      zip_code: masked,
      street: result.street || f.street,
      neighborhood: result.neighborhood || f.neighborhood,
      city: result.city || f.city,
      state: result.state || f.state,
    }));
  }

  function submitNew() {
    setMessage('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    fd.set('is_default', 'on');

    startTransition(async () => {
      const result = await saveAddress(fd);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      if (result.id) {
        setData((prev) => ({ ...prev, addressId: result.id! }));
        setShowForm(false);
        setMessage('');
      }
    });
  }

  function continueWithSelected() {
    if (!data.addressId && addresses.length > 0) {
      const def = addresses.find((a) => a.is_default) ?? addresses[0];
      setData((prev) => ({ ...prev, addressId: def.id }));
    }
    if (!data.addressId && !selected) {
      setMessage('Selecione ou cadastre um endereço de entrega.');
      return;
    }
    onNext();
  }

  return (
    <div className="space-y-8">
      <CheckoutSection
        title="Endereço de entrega"
        subtitle="Sua caixa mensal será enviada para este endereço."
      >
        {addresses.length > 0 && !showForm ? (
          <ul className="space-y-3">
            {addresses.map((addr) => {
              const isActive = data.addressId === addr.id;
              return (
                <li key={addr.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setData((prev) => ({ ...prev, addressId: addr.id }))
                    }
                    className={`w-full cursor-pointer rounded-sm border p-4 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frost ${
                      isActive
                        ? 'border-frost/40 bg-frost/[0.06]'
                        : 'border-white/[0.08] bg-stone-950/40 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          isActive ? 'text-frost' : 'text-stone-600'
                        }`}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {addr.recipient}
                          {addr.is_default ? (
                            <span className="ml-2 font-display text-[9px] uppercase tracking-widest text-stone-500">
                              Padrão
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-sm text-stone-400">
                          {addr.street}, {addr.number}
                          {addr.complement ? ` — ${addr.complement}` : ''}
                        </p>
                        <p className="text-xs text-stone-500">
                          {addr.neighborhood} · {addr.city}/{addr.state} · CEP{' '}
                          {formatZip(addr.zip_code)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {showForm ? (
          <div className="space-y-4 rounded-sm border border-white/[0.06] bg-stone-950/30 p-4 md:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={labelClass}>Destinatário</span>
                <input
                  value={form.recipient}
                  onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>CEP</span>
                <input
                  value={form.zip_code}
                  onChange={(e) => handleCepChange(e.target.value)}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                  maxLength={9}
                  className={inputClass}
                />
                {cepLoading ? (
                  <span className="mt-1 block text-xs text-stone-500">
                    Buscando endereço…
                  </span>
                ) : null}
                {cepError ? (
                  <span className="mt-1 block text-xs text-red-400">{cepError}</span>
                ) : null}
              </label>
              <label className="block">
                <span className={labelClass}>Número</span>
                <input
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Rua</span>
                <input
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Bairro</span>
                <input
                  value={form.neighborhood}
                  onChange={(e) =>
                    setForm({ ...form, neighborhood: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Cidade</span>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>UF</span>
                <select
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className={inputClass}
                >
                  {BRAZIL_STATES.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Complemento</span>
                <input
                  value={form.complement}
                  onChange={(e) =>
                    setForm({ ...form, complement: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={submitNew}
              className="cursor-pointer rounded-sm border border-frost/40 bg-frost/10 px-5 py-2.5 font-display text-xs uppercase tracking-widest text-frost transition-colors duration-200 hover:bg-frost/20 disabled:opacity-50"
            >
              {pending ? 'Salvando…' : 'Salvar endereço'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex cursor-pointer items-center gap-2 text-sm text-stone-500 transition-colors duration-200 hover:text-frost"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo endereço
          </button>
        )}
      </CheckoutSection>

      {message ? (
        <p className="rounded-sm border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer rounded-sm border border-white/15 px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-400 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          Voltar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={continueWithSelected}
          className="flex-1 cursor-pointer rounded-sm bg-ember py-3.5 font-display text-sm uppercase tracking-widest text-stone-950 transition-colors duration-200 hover:bg-ember-bright disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          Ir para pagamento
        </button>
      </div>
    </div>
  );
}
