'use client';

import { useState, useTransition } from 'react';
import { deleteAddress, saveAddress } from '@/app/dashboard/actions';
import { BRAZIL_STATES } from '@/lib/dashboard/constants';
import type { Address } from '@/lib/dashboard/types';
import { formatZip } from '@/lib/dashboard/format';
import { digitsOnly, maskCep } from '@/lib/masks';
import { fetchAddressByCep } from '@/lib/viacep';

interface Props {
  addresses: Address[];
}

const emptyForm = {
  id: '',
  label: 'Principal',
  recipient: '',
  zip_code: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: 'SP',
  is_default: false,
};

export default function AddressManager({ addresses }: Props) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(addresses.length === 0);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  function editAddress(addr: Address) {
    setForm({
      id: addr.id,
      label: addr.label ?? 'Principal',
      recipient: addr.recipient,
      zip_code: maskCep(addr.zip_code),
      street: addr.street,
      number: addr.number,
      complement: addr.complement ?? '',
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
      is_default: addr.is_default ?? false,
    });
    setShowForm(true);
  }

  function submit(formData: FormData) {
    setMessage('');
    startTransition(async () => {
      const result = await saveAddress(formData);
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage('Endereço salvo.');
        setForm(emptyForm);
        setShowForm(false);
      }
    });
  }

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

  function remove(id: string) {
    if (!confirm('Remover este endereço?')) return;
    const fd = new FormData();
    fd.set('id', id);
    startTransition(async () => {
      const result = await deleteAddress(fd);
      setMessage(result.error ?? 'Endereço removido.');
    });
  }

  return (
    <div className="space-y-6">
      {addresses.length > 0 ? (
        <ul className="space-y-3">
          {addresses.map((addr) => (
            <li
              key={addr.id}
              className="rounded-sm border border-white/[0.06] bg-stone-950/30 p-4 transition hover:border-white/10"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {addr.label}
                    {addr.is_default ? (
                      <span className="ml-2 text-xs text-frost">Padrão</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-stone-400">
                    {addr.recipient} · {addr.street}, {addr.number}
                    {addr.complement ? ` — ${addr.complement}` : ''}
                  </p>
                  <p className="text-sm text-stone-500">
                    {addr.neighborhood}, {addr.city}/{addr.state} · CEP{' '}
                    {formatZip(addr.zip_code)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => editAddress(addr)}
                    className="text-xs text-stone-400 hover:text-white"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(addr.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="cursor-pointer rounded-sm border border-dashed border-white/15 px-4 py-3 font-display text-xs uppercase tracking-widest text-stone-500 transition hover:border-ember/40 hover:text-ember"
        >
          + Adicionar endereço
        </button>
      ) : (
        <form action={submit} className="space-y-4 rounded-sm border border-white/10 p-5">
          <input type="hidden" name="id" value={form.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-stone-500">Apelido</span>
              <input
                name="label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-stone-500">Destinatário</span>
              <input
                name="recipient"
                required
                value={form.recipient}
                onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-stone-500">CEP</span>
              <input
                name="zip_code"
                required
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                maxLength={9}
                value={form.zip_code}
                onChange={(e) => handleCepChange(e.target.value)}
                className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
              />
              {cepLoading ? (
                <span className="mt-1 block text-xs text-stone-500">Buscando endereço…</span>
              ) : null}
              {cepError ? (
                <span className="mt-1 block text-xs text-red-400">{cepError}</span>
              ) : null}
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs uppercase tracking-wider text-stone-500">Rua</span>
              <input
                name="street"
                required
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-stone-500">Número</span>
              <input
                name="number"
                required
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-stone-500">Complemento</span>
              <input
                name="complement"
                value={form.complement}
                onChange={(e) => setForm({ ...form, complement: e.target.value })}
                className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-stone-500">Bairro</span>
              <input
                name="neighborhood"
                required
                value={form.neighborhood}
                onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-stone-500">Cidade</span>
              <input
                name="city"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-stone-500">UF</span>
              <select
                name="state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
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
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-stone-950 text-ember"
            />
            Endereço padrão para entregas
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer rounded-sm bg-ember px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright disabled:opacity-50"
            >
              {pending ? 'Salvando…' : form.id ? 'Atualizar' : 'Cadastrar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
              className="text-sm text-stone-500 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {message ? <p className="text-sm text-stone-400">{message}</p> : null}
    </div>
  );
}
