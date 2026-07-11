'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminSaveCustomerAddressAction } from '@/lib/admin/actions';
import { BRAZIL_STATES } from '@/lib/dashboard/constants';
import { digitsOnly, maskCep } from '@/lib/masks';
import { fetchAddressByCep } from '@/lib/viacep';

const emptyForm = {
  label: 'Principal',
  recipient: '',
  zip_code: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: 'SP',
  is_default: true,
};

interface Props {
  userId: string;
  defaultRecipient?: string;
  onSaved?: (addressId: string) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export default function AdminCustomerAddressForm({
  userId,
  defaultRecipient = '',
  onSaved,
  onCancel,
  compact = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [form, setForm] = useState({
    ...emptyForm,
    recipient: defaultRecipient,
    is_default: true,
  });

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

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await adminSaveCustomerAddressAction(userId, formData);
      if ('error' in response && response.error) {
        setError(response.error);
        return;
      }

      setMessage('Endereço cadastrado.');
      setForm({ ...emptyForm, recipient: defaultRecipient, is_default: true });
      router.refresh();
      if (response.id) {
        onSaved?.(response.id);
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className={`space-y-4 rounded-sm border border-white/10 bg-stone-950/40 ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
        Novo endereço de entrega
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-stone-500">
            Apelido
          </span>
          <input
            name="label"
            value={form.label}
            onChange={(event) =>
              setForm({ ...form, label: event.target.value })
            }
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-stone-500">
            Destinatário
          </span>
          <input
            name="recipient"
            required
            value={form.recipient}
            onChange={(event) =>
              setForm({ ...form, recipient: event.target.value })
            }
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-stone-500">
            CEP
          </span>
          <input
            name="zip_code"
            required
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            maxLength={9}
            value={form.zip_code}
            onChange={(event) => void handleCepChange(event.target.value)}
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
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
        <label className="block md:col-span-2">
          <span className="text-xs uppercase tracking-wider text-stone-500">
            Rua
          </span>
          <input
            name="street"
            required
            value={form.street}
            onChange={(event) =>
              setForm({ ...form, street: event.target.value })
            }
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-stone-500">
            Número
          </span>
          <input
            name="number"
            required
            value={form.number}
            onChange={(event) =>
              setForm({ ...form, number: event.target.value })
            }
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-stone-500">
            Complemento
          </span>
          <input
            name="complement"
            value={form.complement}
            onChange={(event) =>
              setForm({ ...form, complement: event.target.value })
            }
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-stone-500">
            Bairro
          </span>
          <input
            name="neighborhood"
            required
            value={form.neighborhood}
            onChange={(event) =>
              setForm({ ...form, neighborhood: event.target.value })
            }
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-stone-500">
            Cidade
          </span>
          <input
            name="city"
            required
            value={form.city}
            onChange={(event) =>
              setForm({ ...form, city: event.target.value })
            }
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-stone-500">
            UF
          </span>
          <select
            name="state"
            value={form.state}
            onChange={(event) =>
              setForm({ ...form, state: event.target.value })
            }
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          >
            {BRAZIL_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          type="checkbox"
          name="is_default"
          checked={form.is_default}
          onChange={(event) =>
            setForm({ ...form, is_default: event.target.checked })
          }
          className="h-4 w-4 rounded border-white/20 bg-stone-950 text-emerald-400"
        />
        Endereço padrão para entregas
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-sm border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-50"
        >
          {pending ? 'Salvando…' : 'Salvar endereço'}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-stone-500 hover:text-white"
          >
            Cancelar
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-200">{message}</p> : null}
    </form>
  );
}
