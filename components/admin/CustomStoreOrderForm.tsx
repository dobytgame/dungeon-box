'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, Copy, Loader2, Plus, Trash2 } from 'lucide-react';
import AdminCustomerAddressForm from '@/components/admin/AdminCustomerAddressForm';
import AdminCustomerBillingProfileForm, {
  hasValidCpf,
  hasValidPhone,
} from '@/components/admin/AdminCustomerBillingProfileForm';
import {
  adminCreateCustomStoreOrderAction,
  getCustomOrderCustomerAction,
  searchCustomOrderCustomersAction,
} from '@/lib/admin/custom-store-order-actions';
import type { CustomOrderCustomer } from '@/lib/admin/custom-store-order';
import { formatMoney } from '@/lib/dashboard/format';
import { parseBRLToCents } from '@/lib/store/parse-brl';

type LineDraft = {
  key: string;
  name: string;
  quantity: string;
  unitPrice: string;
};

type CreatedOrder = {
  paymentId: string;
  orderId: string;
  amountCents: number;
  paymentUrl: string;
  emailSent: boolean;
  customerEmail: string;
};

const inputClass =
  'mt-1.5 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white placeholder:text-stone-600';

function emptyLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    name: '',
    quantity: '1',
    unitPrice: '',
  };
}

interface Props {
  initialCustomer?: CustomOrderCustomer | null;
}

export default function CustomStoreOrderForm({ initialCustomer = null }: Props) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<CustomOrderCustomer | null>(
    initialCustomer
  );
  const [addressId, setAddressId] = useState(
    initialCustomer?.addresses.find((address) => address.isDefault)?.id ??
      initialCustomer?.addresses[0]?.id ??
      ''
  );
  const [showAddressForm, setShowAddressForm] = useState(
    (initialCustomer?.addresses.length ?? 0) === 0
  );
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreatedOrder | null>(null);
  const [copied, setCopied] = useState(false);

  const profileComplete =
    hasValidCpf(customer?.cpf) && hasValidPhone(customer?.phone);

  const totalCents = useMemo(() => {
    return lines.reduce((sum, line) => {
      const unit = parseBRLToCents(line.unitPrice) ?? 0;
      const qty = Math.max(1, Number.parseInt(line.quantity, 10) || 1);
      return sum + unit * qty;
    }, 0);
  }, [lines]);

  useEffect(() => {
    if (customer) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const handle = window.setTimeout(() => {
      setSearching(true);
      void searchCustomOrderCustomersAction(q)
        .then(setResults)
        .finally(() => setSearching(false));
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query, customer]);

  async function selectCustomer(userId: string) {
    setError('');
    const loaded = await getCustomOrderCustomerAction(userId);
    if (!loaded) {
      setError('Cliente não encontrado.');
      return;
    }
    setCustomer(loaded);
    setAddressId(
      loaded.addresses.find((address) => address.isDefault)?.id ??
        loaded.addresses[0]?.id ??
        ''
    );
    setShowAddressForm(loaded.addresses.length === 0);
    setResults([]);
    setQuery('');
  }

  async function copyLink() {
    if (!result?.paymentUrl) return;
    try {
      await navigator.clipboard.writeText(result.paymentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Não foi possível copiar o link.');
    }
  }

  function submit() {
    if (!customer) {
      setError('Selecione um cliente.');
      return;
    }

    const formData = new FormData();
    formData.set('user_id', customer.id);
    formData.set('address_id', addressId);
    formData.set('notes', notes);
    formData.set('send_email', sendEmail ? '1' : '0');
    formData.set(
      'items',
      JSON.stringify(
        lines.map((line) => ({
          name: line.name,
          quantity: Number.parseInt(line.quantity, 10) || 1,
          unitPrice: line.unitPrice,
        }))
      )
    );

    setError('');
    startTransition(async () => {
      const response = await adminCreateCustomStoreOrderAction(formData);
      if ('error' in response && response.error) {
        setError(response.error);
        return;
      }
      if ('success' in response && response.success) {
        setResult({
          paymentId: response.paymentId,
          orderId: response.orderId,
          amountCents: response.amountCents,
          paymentUrl: response.paymentUrl,
          emailSent: response.emailSent,
          customerEmail: response.customerEmail,
        });
      }
    });
  }

  if (result) {
    return (
      <section className="admin-panel rounded p-5 md:p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-console">
          Pedido criado
        </p>
        <h2 className="mt-1 font-display text-lg uppercase tracking-wide text-white">
          Link de pagamento pronto
        </h2>
        <p className="mt-2 text-sm text-stone-400">
          {result.emailSent
            ? `E-mail enviado para ${result.customerEmail}.`
            : `Não foi possível enviar o e-mail. Copie o link e envie para ${result.customerEmail}.`}
        </p>
        <p className="mt-4 font-display text-2xl text-white">
          {formatMoney(result.amountCents)}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex min-h-[40px] items-center gap-2 rounded border border-console/30 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-console hover:bg-console/10"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? 'Copiado' : 'Copiar link'}
          </button>
          <Link
            href={`/admin/loja/pedidos/${result.paymentId}`}
            className="inline-flex min-h-[40px] items-center rounded border border-zinc-700 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-300 hover:border-zinc-600"
          >
            Abrir pedido
          </Link>
          <a
            href={result.paymentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[40px] items-center rounded border border-zinc-700 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-300 hover:border-zinc-600"
          >
            Ver página do cliente
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-panel space-y-6 rounded p-5 md:p-6">
      {!customer ? (
        <div>
          <label
            htmlFor="custom-order-customer"
            className="block font-mono text-[10px] uppercase tracking-wider text-stone-500"
          >
            Cliente
          </label>
          <input
            id="custom-order-customer"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, e-mail ou CPF"
            className={inputClass}
          />
          {searching ? (
            <p className="mt-2 flex items-center gap-2 text-xs text-stone-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Buscando…
            </p>
          ) : null}
          {results.length > 0 ? (
            <ul className="mt-2 divide-y divide-white/5 rounded-sm border border-white/10">
              {results.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => void selectCustomer(row.id)}
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-white/[0.04]"
                  >
                    <span className="text-sm text-white">{row.name}</span>
                    <span className="text-xs text-stone-500">{row.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">
              Cliente
            </p>
            <p className="mt-1 text-white">{customer.name}</p>
            <p className="text-sm text-stone-500">{customer.email}</p>
          </div>
          {!initialCustomer ? (
            <button
              type="button"
              onClick={() => {
                setCustomer(null);
                setAddressId('');
                setShowAddressForm(false);
              }}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500 hover:text-console"
            >
              Trocar cliente
            </button>
          ) : null}
        </div>
      )}

      {customer && !profileComplete ? (
        <AdminCustomerBillingProfileForm
          userId={customer.id}
          cpf={customer.cpf}
          phone={customer.phone}
          onSaved={() => void selectCustomer(customer.id)}
        />
      ) : null}

      {customer && profileComplete ? (
        <>
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-[240px] flex-1">
                <label
                  htmlFor="custom-order-address"
                  className="block font-mono text-[10px] uppercase tracking-wider text-stone-500"
                >
                  Endereço de entrega
                </label>
                {customer.addresses.length > 0 && !showAddressForm ? (
                  <select
                    id="custom-order-address"
                    value={addressId}
                    onChange={(event) => setAddressId(event.target.value)}
                    className={inputClass}
                  >
                    {customer.addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setShowAddressForm((current) => !current)}
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-console hover:underline"
              >
                {showAddressForm ? 'Usar endereço salvo' : 'Novo endereço'}
              </button>
            </div>
            {showAddressForm ? (
              <AdminCustomerAddressForm
                userId={customer.id}
                defaultRecipient={customer.name}
                compact
                onSaved={(id) => {
                  setAddressId(id);
                  setShowAddressForm(false);
                  void selectCustomer(customer.id);
                }}
                onCancel={
                  customer.addresses.length > 0
                    ? () => setShowAddressForm(false)
                    : undefined
                }
              />
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
                Itens
              </p>
              <button
                type="button"
                onClick={() => setLines((current) => [...current, emptyLine()])}
                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-console hover:underline"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Adicionar item
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {lines.map((line, index) => (
                <div
                  key={line.key}
                  className="grid gap-3 md:grid-cols-[1fr_88px_140px_36px]"
                >
                  <input
                    value={line.name}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((row) =>
                          row.key === line.key
                            ? { ...row, name: event.target.value }
                            : row
                        )
                      )
                    }
                    placeholder={`Item ${index + 1}`}
                    className={inputClass}
                  />
                  <input
                    value={line.quantity}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((row) =>
                          row.key === line.key
                            ? { ...row, quantity: event.target.value }
                            : row
                        )
                      )
                    }
                    inputMode="numeric"
                    placeholder="Qtd"
                    className={inputClass}
                  />
                  <input
                    value={line.unitPrice}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((row) =>
                          row.key === line.key
                            ? { ...row, unitPrice: event.target.value }
                            : row
                        )
                      )
                    }
                    placeholder="Valor (ex: 89,90)"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLines((current) =>
                        current.length === 1
                          ? [emptyLine()]
                          : current.filter((row) => row.key !== line.key)
                      )
                    }
                    className="mt-1.5 inline-flex h-10 items-center justify-center text-stone-500 hover:text-red-300"
                    aria-label="Remover item"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-stone-400">
              Total: <span className="text-white">{formatMoney(totalCents)}</span>
              <span className="text-stone-600"> · frete incluso no valor</span>
            </p>
          </div>

          <div>
            <label
              htmlFor="custom-order-notes"
              className="block font-mono text-[10px] uppercase tracking-wider text-stone-500"
            >
              Observação (opcional)
            </label>
            <textarea
              id="custom-order-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Detalhes de produção, peça extra, cor, etc."
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-stone-300">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(event) => setSendEmail(event.target.checked)}
              className="rounded border-white/20 bg-stone-950"
            />
            Enviar e-mail com o link de pagamento
          </label>

          {error ? (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={submit}
            disabled={pending || !addressId || totalCents <= 0}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm bg-console px-5 font-display text-xs uppercase tracking-widest text-stone-950 disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Criando pedido…
              </>
            ) : (
              'Criar pedido e gerar link'
            )}
          </button>
        </>
      ) : null}

      {error && !customer ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
