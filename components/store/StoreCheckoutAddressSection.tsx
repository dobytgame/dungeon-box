'use client';

import { MapPin, Plus } from 'lucide-react';
import { useState, useTransition } from 'react';
import { saveAddress } from '@/app/dashboard/actions';
import { BRAZIL_STATES } from '@/lib/dashboard/constants';
import { formatZip } from '@/lib/dashboard/format';
import type { Address } from '@/lib/dashboard/types';
import { digitsOnly, maskCep } from '@/lib/masks';
import { fetchAddressByCep } from '@/lib/viacep';

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
  'mt-2 w-full rounded-sm border border-white/[0.08] bg-stone-950/80 px-3 py-2.5 text-base text-white outline-none transition-colors duration-200 focus:border-frost/40 focus:ring-1 focus:ring-frost/20 sm:text-sm';

const labelClass =
  'font-display text-[0.65rem] uppercase tracking-[0.25em] text-stone-500';

interface Props {
  addresses: Address[];
  selectedAddressId: string;
  onSelectAddress: (id: string) => void;
  onAddressesChange: (addresses: Address[]) => void;
  onError?: (message: string) => void;
}

export default function StoreCheckoutAddressSection({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddressesChange,
  onError,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(addresses.length === 0);
  const [form, setForm] = useState(emptyForm);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [formMessage, setFormMessage] = useState('');

  async function handleCepChange(raw: string) {
    const masked = maskCep(raw);
    setForm((current) => ({ ...current, zip_code: masked }));
    setCepError('');

    if (digitsOnly(masked).length !== 8) return;

    setCepLoading(true);
    const result = await fetchAddressByCep(masked);
    setCepLoading(false);

    if (!result) {
      setCepError('CEP não encontrado.');
      return;
    }

    setForm((current) => ({
      ...current,
      zip_code: masked,
      street: result.street || current.street,
      neighborhood: result.neighborhood || current.neighborhood,
      city: result.city || current.city,
      state: result.state || current.state,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setCepError('');
    setFormMessage('');
  }

  function submitNewAddress() {
    setFormMessage('');
    onError?.('');

    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) => fd.set(key, value));

    startTransition(async () => {
      const result = await saveAddress(fd);
      if (result.error) {
        setFormMessage(result.error);
        onError?.(result.error);
        return;
      }

      if (!result.id) {
        const message = 'Não foi possível salvar o endereço.';
        setFormMessage(message);
        onError?.(message);
        return;
      }

      const newAddress: Address = {
        id: result.id,
        user_id: '',
        label: form.label.trim() || 'Entrega',
        recipient: form.recipient.trim(),
        zip_code: digitsOnly(form.zip_code),
        street: form.street.trim(),
        number: form.number.trim(),
        complement: form.complement.trim() || null,
        neighborhood: form.neighborhood.trim(),
        city: form.city.trim(),
        state: form.state.toUpperCase().slice(0, 2),
        is_default: false,
        created_at: null,
      };

      onAddressesChange([...addresses, newAddress]);
      onSelectAddress(newAddress.id);
      setShowForm(false);
      resetForm();
    });
  }

  return (
    <div className="space-y-4">
      {addresses.length > 0 && !showForm ? (
        <div className="space-y-3">
          {addresses.map((address) => {
            const isSelected = selectedAddressId === address.id;

            return (
              <label
                key={address.id}
                className={`flex cursor-pointer gap-3 rounded-sm border p-4 transition ${
                  isSelected
                    ? 'border-frost/40 bg-frost/5'
                    : 'border-white/[0.06] hover:border-white/15'
                }`}
              >
                <input
                  type="radio"
                  name="store-address"
                  checked={isSelected}
                  onChange={() => onSelectAddress(address.id)}
                  className="mt-1"
                />
                <span className="min-w-0 text-sm text-stone-300">
                  <span className="flex items-center gap-2 text-white">
                    <MapPin
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? 'text-frost' : 'text-stone-600'
                      }`}
                      aria-hidden="true"
                    />
                    {address.recipient}
                    {address.is_default ? (
                      <span className="font-display text-[9px] uppercase tracking-widest text-stone-500">
                        Padrão
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block">
                    {address.street}, {address.number}
                    {address.complement ? ` — ${address.complement}` : ''}
                  </span>
                  <span className="block text-xs text-stone-500">
                    {address.neighborhood}, {address.city}/{address.state} ·{' '}
                    {formatZip(address.zip_code)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      ) : null}

      {showForm ? (
        <div className="space-y-4 rounded-sm border border-white/[0.06] bg-stone-950/30 p-4 md:p-5">
          <p className="font-display text-xs uppercase tracking-widest text-stone-500">
            Novo endereço de entrega
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={labelClass}>Destinatário</span>
              <input
                value={form.recipient}
                onChange={(event) =>
                  setForm((current) => ({ ...current, recipient: event.target.value }))
                }
                className={inputClass}
                autoComplete="name"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>CEP</span>
              <input
                value={form.zip_code}
                onChange={(event) => void handleCepChange(event.target.value)}
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
            <label className="block sm:col-span-2">
              <span className={labelClass}>Rua</span>
              <input
                value={form.street}
                onChange={(event) =>
                  setForm((current) => ({ ...current, street: event.target.value }))
                }
                className={inputClass}
                autoComplete="address-line1"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Número</span>
              <input
                value={form.number}
                onChange={(event) =>
                  setForm((current) => ({ ...current, number: event.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Complemento</span>
              <input
                value={form.complement}
                onChange={(event) =>
                  setForm((current) => ({ ...current, complement: event.target.value }))
                }
                className={inputClass}
                autoComplete="address-line2"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Bairro</span>
              <input
                value={form.neighborhood}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    neighborhood: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Cidade</span>
              <input
                value={form.city}
                onChange={(event) =>
                  setForm((current) => ({ ...current, city: event.target.value }))
                }
                className={inputClass}
                autoComplete="address-level2"
              />
            </label>
            <label className="block">
              <span className={labelClass}>UF</span>
              <select
                value={form.state}
                onChange={(event) =>
                  setForm((current) => ({ ...current, state: event.target.value }))
                }
                className={inputClass}
                autoComplete="address-level1"
              >
                {BRAZIL_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {formMessage ? (
            <p className="text-sm text-red-300" role="alert">
              {formMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={submitNewAddress}
              className="inline-flex min-h-[44px] cursor-pointer items-center rounded-sm border border-frost/40 bg-frost/10 px-5 py-2.5 font-display text-xs uppercase tracking-widest text-frost transition hover:bg-frost/20 disabled:opacity-50"
            >
              {pending ? 'Salvando…' : 'Salvar e usar este endereço'}
            </button>
            {addresses.length > 0 ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-sm text-stone-500 transition hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex cursor-pointer items-center gap-2 text-sm text-stone-500 transition hover:text-frost"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Cadastrar outro endereço de entrega
        </button>
      )}
    </div>
  );
}
