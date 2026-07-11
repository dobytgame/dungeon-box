'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, Copy, CreditCard, Loader2, Plus } from 'lucide-react';
import AdminCustomerAddressForm from '@/components/admin/AdminCustomerAddressForm';
import AdminCustomerBillingProfileForm, {
  hasValidCpf,
  hasValidPhone,
} from '@/components/admin/AdminCustomerBillingProfileForm';
import { adminCreateSubscriptionPixAction } from '@/lib/admin/actions';
import {
  COMBO_OPTIONS,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import type { PlanSlug } from '@/lib/checkout/plans';
import { formatMoney } from '@/lib/dashboard/format';

interface PlanOption {
  slug: PlanSlug;
  name: string;
}

interface AddressOption {
  id: string;
  label: string;
  isDefault: boolean;
}

type PixResult = {
  subscriptionId: string;
  paymentId: string;
  amountCents: number;
  planName: string;
  paymentUrl: string;
  emailSent: boolean;
  pix: {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };
};

interface Props {
  userId: string;
  customerName: string;
  customerCpf: string | null;
  customerPhone: string | null;
  planOptions: PlanOption[];
  addresses: AddressOption[];
}

const BILLING_OPTIONS: Array<{ value: BillingTerm; label: string }> = [
  { value: 'monthly', label: 'Mensal' },
  ...COMBO_OPTIONS.map((option) => ({
    value: option.term,
    label: `${option.label} (${option.badge})`,
  })),
];

export default function CustomerActivatePlanPanel({
  userId,
  customerName,
  customerCpf,
  customerPhone,
  planOptions,
  addresses,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<PixResult | null>(null);

  const defaultPlan = planOptions[1]?.slug ?? planOptions[0]?.slug ?? 'heroi';
  const defaultAddress =
    addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? '';

  const [selectedPlan, setSelectedPlan] = useState<PlanSlug>(defaultPlan);
  const [selectedAddress, setSelectedAddress] = useState(defaultAddress);
  const [billingTerm, setBillingTerm] = useState<BillingTerm>('monthly');
  const [couponCode, setCouponCode] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(addresses.length === 0);

  const profileComplete =
    hasValidCpf(customerCpf) && hasValidPhone(customerPhone);

  useEffect(() => {
    if (addresses.length === 0) {
      setSelectedAddress('');
      return;
    }

    setSelectedAddress((current) => {
      if (current && addresses.some((address) => address.id === current)) {
        return current;
      }
      return (
        addresses.find((address) => address.isDefault)?.id ??
        addresses[0]?.id ??
        ''
      );
    });
  }, [addresses]);

  const canSubmit =
    profileComplete &&
    planOptions.length > 0 &&
    selectedAddress.length > 0 &&
    !showAddressForm;

  const billingLabel = useMemo(
    () => BILLING_OPTIONS.find((option) => option.value === billingTerm)?.label,
    [billingTerm]
  );

  function submit() {
    setMessage('');
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.set('plan_slug', selectedPlan);
    formData.set('address_id', selectedAddress);
    formData.set('billing_term', billingTerm);
    if (couponCode.trim()) {
      formData.set('coupon_code', couponCode.trim());
    }
    if (specialNotes.trim()) {
      formData.set('special_notes', specialNotes.trim());
    }

    startTransition(async () => {
      const response = await adminCreateSubscriptionPixAction(userId, formData);
      if ('error' in response && response.error) {
        setError(response.error);
        return;
      }

      if ('success' in response && response.success) {
        setResult({
          subscriptionId: response.subscriptionId,
          paymentId: response.paymentId,
          amountCents: response.amountCents,
          planName: response.planName,
          paymentUrl: response.paymentUrl,
          emailSent: response.emailSent,
          pix: response.pix,
        });
        setMessage(
          response.emailSent
            ? `PIX gerado e e-mail enviado para ${customerName}.`
            : 'PIX gerado. Não foi possível enviar o e-mail — compartilhe o código manualmente.'
        );
      }
    });
  }

  async function copyPayload() {
    if (!result?.pix.payload) return;
    try {
      await navigator.clipboard.writeText(result.pix.payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Não foi possível copiar o código PIX.');
    }
  }

  if (addresses.length === 0) {
    return (
      <section className="rounded-sm border border-emerald-500/20 bg-emerald-500/[0.04] p-5 md:p-6">
        <div>
          <h3 className="flex items-center gap-2 font-display text-sm uppercase tracking-widest text-emerald-200">
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            Ativar plano com PIX
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-400">
            Complete o cadastro do cliente para gerar a cobrança PIX.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {!profileComplete ? (
            <AdminCustomerBillingProfileForm
              userId={userId}
              cpf={customerCpf}
              phone={customerPhone}
            />
          ) : null}

          {profileComplete ? (
            <AdminCustomerAddressForm
              userId={userId}
              defaultRecipient={customerName}
              compact
              onSaved={(addressId) => {
                setSelectedAddress(addressId);
                setShowAddressForm(false);
              }}
            />
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-sm border border-emerald-500/20 bg-emerald-500/[0.04] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 font-display text-sm uppercase tracking-widest text-emerald-200">
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            Ativar plano com PIX
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-400">
            Cria assinatura pendente, gera cobrança PIX no Asaas e envia o link
            por e-mail para o cliente.
          </p>
        </div>
      </div>

      {!profileComplete ? (
        <div className="mt-5">
          <AdminCustomerBillingProfileForm
            userId={userId}
            cpf={customerCpf}
            phone={customerPhone}
          />
        </div>
      ) : (
        <>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`activate-plan-${userId}`}
            className="block font-mono text-[10px] uppercase tracking-wider text-stone-500"
          >
            Plano
          </label>
          <select
            id={`activate-plan-${userId}`}
            value={selectedPlan}
            onChange={(event) =>
              setSelectedPlan(event.target.value as PlanSlug)
            }
            disabled={pending || !!result}
            className="mt-1.5 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          >
            {planOptions.map((plan) => (
              <option key={plan.slug} value={plan.slug}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`activate-billing-${userId}`}
            className="block font-mono text-[10px] uppercase tracking-wider text-stone-500"
          >
            Cobrança
          </label>
          <select
            id={`activate-billing-${userId}`}
            value={billingTerm}
            onChange={(event) =>
              setBillingTerm(event.target.value as BillingTerm)
            }
            disabled={pending || !!result}
            className="mt-1.5 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          >
            {BILLING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-[240px] flex-1">
              <label
                htmlFor={`activate-address-${userId}`}
                className="block font-mono text-[10px] uppercase tracking-wider text-stone-500"
              >
                Endereço de entrega
              </label>
              <select
                id={`activate-address-${userId}`}
                value={selectedAddress}
                onChange={(event) => setSelectedAddress(event.target.value)}
                disabled={pending || !!result || showAddressForm}
                className="mt-1.5 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.isDefault ? 'Padrão · ' : ''}
                    {address.label}
                  </option>
                ))}
              </select>
            </div>
            {!result ? (
              <button
                type="button"
                onClick={() => setShowAddressForm((current) => !current)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-white/10 px-3 py-2 font-display text-[10px] uppercase tracking-wider text-stone-300 transition hover:border-white/20"
              >
                <Plus className="h-3.5 w-3.5" />
                {showAddressForm ? 'Fechar cadastro' : 'Novo endereço'}
              </button>
            ) : null}
          </div>

          {showAddressForm ? (
            <AdminCustomerAddressForm
              userId={userId}
              defaultRecipient={customerName}
              compact
              onSaved={(addressId) => {
                setSelectedAddress(addressId);
                setShowAddressForm(false);
              }}
              onCancel={() => setShowAddressForm(false)}
            />
          ) : null}
        </div>

        <div>
          <label
            htmlFor={`activate-coupon-${userId}`}
            className="block font-mono text-[10px] uppercase tracking-wider text-stone-500"
          >
            Cupom (opcional)
          </label>
          <input
            id={`activate-coupon-${userId}`}
            type="text"
            value={couponCode}
            onChange={(event) => setCouponCode(event.target.value)}
            disabled={pending || !!result}
            placeholder="CODIGO10"
            className="mt-1.5 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white placeholder:text-stone-600"
          />
        </div>

        <div>
          <label
            htmlFor={`activate-notes-${userId}`}
            className="block font-mono text-[10px] uppercase tracking-wider text-stone-500"
          >
            Observações (opcional)
          </label>
          <input
            id={`activate-notes-${userId}`}
            type="text"
            value={specialNotes}
            onChange={(event) => setSpecialNotes(event.target.value)}
            disabled={pending || !!result}
            placeholder="Notas internas de produção"
            className="mt-1.5 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white placeholder:text-stone-600"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !canSubmit || !!result}
          onClick={submit}
          className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Gerando PIX…
            </>
          ) : (
            'Gerar PIX e enviar e-mail'
          )}
        </button>

        {result ? (
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setMessage('');
              setError('');
            }}
            className="rounded-sm border border-white/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-300 hover:border-white/20"
          >
            Novo PIX
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-emerald-200">{message}</p>
      ) : null}

      {result ? (
        <div className="mt-5 rounded-sm border border-white/[0.08] bg-stone-950/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
                Cobrança gerada
              </p>
              <p className="mt-1 text-sm text-stone-200">
                {result.planName}
                {billingLabel ? ` · ${billingLabel}` : ''}
              </p>
              <p className="mt-1 font-mono text-lg text-white">
                {formatMoney(result.amountCents)}
              </p>
              <p className="mt-2 text-xs text-stone-500">
                Expira em{' '}
                {new Intl.DateTimeFormat('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(new Date(result.pix.expirationDate))}
              </p>
            </div>

            {result.pix.encodedImage ? (
              <img
                src={`data:image/png;base64,${result.pix.encodedImage}`}
                alt="QR Code PIX"
                className="h-36 w-36 rounded-sm border border-white/10 bg-white p-2"
              />
            ) : null}
          </div>

          <div className="mt-4 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
              Código copia e cola
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="block max-w-full flex-1 break-all rounded-sm border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-stone-300">
                {result.pix.payload}
              </code>
              <button
                type="button"
                onClick={() => void copyPayload()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-white/10 px-3 py-2 text-xs text-stone-300 hover:border-white/20"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={result.paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-console hover:underline"
            >
              Abrir página de pagamento
            </a>
            <Link
              href={`/admin/assinaturas/${result.subscriptionId}`}
              className="text-xs text-console hover:underline"
            >
              Ver assinatura
            </Link>
          </div>
        </div>
      ) : null}
        </>
      )}
    </section>
  );
}
