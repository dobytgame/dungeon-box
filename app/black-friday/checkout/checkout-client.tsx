'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { ArrowLeft, Check, CreditCard, Loader2, Lock, MapPin, Plus, ShieldCheck, Truck } from 'lucide-react';
import { saveAddress, updateProfile } from '@/app/dashboard/actions';
import {
  BF_COMBO_DISCOUNT_PERCENT,
  BF_MONTHLY_DISCOUNT_CYCLES,
  BF_MONTHLY_DISCOUNT_PERCENT,
  bfInstallmentPlans,
  formatCents,
  formatRatePercent,
  quoteBlackFriday,
  type BlackFridayCtaPlacement,
  type BlackFridayOption,
} from '@/lib/campaigns/black-friday';
import { BRAZIL_STATES } from '@/lib/dashboard/constants';
import { formatZip } from '@/lib/dashboard/format';
import type { Address, Profile } from '@/lib/dashboard/types';
import { digitsOnly, maskCep, maskCpf, maskPhone } from '@/lib/masks';
import { validateCreditCard } from '@/lib/payments/card-validation';
import { tokenizePagarmeCard } from '@/lib/pagarme/tokenize-card';
import { isValidBrazilMobilePhone, parseBrazilPhoneForStorage } from '@/lib/phone/brazil';
import { fetchAddressByCep } from '@/lib/viacep';
import styles from './checkout.module.css';

type Props = {
  initialOption: BlackFridayOption;
  planCents: number;
  addresses: Address[];
  profile: Profile | null;
  ctaPlacement: BlackFridayCtaPlacement;
};

type Shipping = { cents: number; label: string; etaDaysMin: number; etaDaysMax: number };

const emptyAddress = {
  recipient: '',
  zip_code: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: 'SP',
};

function formatCardNumber(value: string) {
  return digitsOnly(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(value: string) {
  const d = digitsOnly(value).slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}

export default function BlackFridayCheckout({
  initialOption,
  planCents,
  addresses: initialAddresses,
  profile,
  ctaPlacement,
}: Props) {
  const router = useRouter();
  const [option, setOption] = useState<BlackFridayOption>(initialOption);
  const [installments, setInstallments] = useState(1);

  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressId, setAddressId] = useState(
    () => (initialAddresses.find((a) => a.is_default) ?? initialAddresses[0])?.id ?? ''
  );
  const [showAddressForm, setShowAddressForm] = useState(initialAddresses.length === 0);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [addressError, setAddressError] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [savingAddress, startSavingAddress] = useTransition();

  const [shipping, setShipping] = useState<Shipping | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');

  const [profileState, setProfileState] = useState(profile);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [cpf, setCpf] = useState(profile?.cpf ? maskCpf(profile.cpf) : '');
  const [phone, setPhone] = useState(profile?.phone ? maskPhone(profile.phone) : '');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, startSavingProfile] = useTransition();

  const [holderName, setHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const needsName = !profileState?.full_name?.trim();
  const needsCpf = digitsOnly(profileState?.cpf ?? '').length !== 11;
  const needsPhone = !isValidBrazilMobilePhone(profileState?.phone ?? '');
  const profileReady = !needsName && !needsCpf && !needsPhone;

  const previewQuote = useMemo(
    () => quoteBlackFriday({ option, planCents, shippingCents: shipping?.cents ?? 0, installmentCount: installments }),
    [option, planCents, shipping, installments]
  );
  const monthlyPreview = quoteBlackFriday({ option: 'mensal', planCents, shippingCents: shipping?.cents ?? 0 });
  const comboPreview = quoteBlackFriday({ option: 'combo', planCents, shippingCents: shipping?.cents ?? 0 });
  const installmentPlans = useMemo(
    () => (comboPreview.option === 'combo' ? bfInstallmentPlans(comboPreview.comboCents) : []),
    [comboPreview]
  );

  const chargeCents = previewQuote.option === 'combo' ? previewQuote.chargeCents : previewQuote.firstChargeCents;
  const readyToPay = Boolean(addressId) && Boolean(shipping) && !shippingLoading && profileReady;
  /** Frete de 1 caixa/mês (API); no combo o total cobrado usa 3× esse valor. */
  const perShipmentCents = shipping?.cents ?? 0;
  const comboShippingTotalCents = perShipmentCents * 3;

  useEffect(() => {
    if (!addressId) {
      setShipping(null);
      return;
    }
    let cancelled = false;
    setShippingLoading(true);
    setShippingError('');
    fetch('/api/shipping/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planSlugs: ['lendario'], addressId }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const quote = json?.quotes?.lendario;
        if (!res.ok || !quote) {
          setShipping(null);
          setShippingError(json?.error ?? 'Não foi possível calcular o frete.');
          return;
        }
        setShipping({
          cents: quote.free ? 0 : quote.cents,
          label: quote.label ?? quote.region,
          etaDaysMin: quote.etaDaysMin,
          etaDaysMax: quote.etaDaysMax,
        });
      })
      .catch(() => {
        if (!cancelled) setShippingError('Não foi possível calcular o frete.');
      })
      .finally(() => {
        if (!cancelled) setShippingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [addressId]);

  async function handleCep(raw: string) {
    const masked = maskCep(raw);
    setAddressForm((f) => ({ ...f, zip_code: masked }));
    setAddressError('');
    if (digitsOnly(masked).length !== 8) return;
    setCepLoading(true);
    const result = await fetchAddressByCep(masked);
    setCepLoading(false);
    if (!result) {
      setAddressError('CEP não encontrado.');
      return;
    }
    setAddressForm((f) => ({
      ...f,
      street: result.street || f.street,
      neighborhood: result.neighborhood || f.neighborhood,
      city: result.city || f.city,
      state: result.state || f.state,
    }));
  }

  function submitAddress(event: React.FormEvent) {
    event.preventDefault();
    setAddressError('');
    const required = ['recipient', 'zip_code', 'street', 'number', 'neighborhood', 'city'] as const;
    if (required.some((key) => !addressForm[key].trim())) {
      setAddressError('Preencha os campos obrigatórios do endereço.');
      return;
    }
    const fd = new FormData();
    fd.set('label', 'Entrega');
    Object.entries(addressForm).forEach(([k, v]) => fd.set(k, v));
    fd.set('is_default', 'on');
    startSavingAddress(async () => {
      const result = await saveAddress(fd);
      if (result.error || !result.id) {
        setAddressError(result.error ?? 'Não foi possível salvar o endereço.');
        return;
      }
      const saved: Address = {
        id: result.id,
        user_id: profileState?.id ?? '',
        label: 'Entrega',
        ...addressForm,
        zip_code: digitsOnly(addressForm.zip_code),
        complement: addressForm.complement || null,
        is_default: true,
        created_at: new Date().toISOString(),
      };
      setAddresses((list) => [saved, ...list.map((a) => ({ ...a, is_default: false }))]);
      setAddressId(saved.id);
      setShowAddressForm(false);
      setAddressForm(emptyAddress);
    });
  }

  function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError('');
    if (!profileState) return;
    const nextCpf = digitsOnly(cpf);
    if (needsCpf && nextCpf.length !== 11) {
      setProfileError('Informe um CPF válido com 11 dígitos.');
      return;
    }
    if (needsPhone) {
      const parsed = parseBrazilPhoneForStorage(phone);
      if (!parsed.ok) {
        setProfileError(parsed.error);
        return;
      }
    }
    if (needsName && !fullName.trim()) {
      setProfileError('Informe seu nome completo.');
      return;
    }
    const fd = new FormData();
    fd.set('full_name', fullName.trim() || profileState.full_name || '');
    fd.set('cpf', needsCpf ? cpf : profileState.cpf ?? '');
    fd.set('phone', needsPhone ? phone : profileState.phone ?? '');
    fd.set('display_name', profileState.display_name ?? '');
    fd.set('birth_date', profileState.birth_date ?? '');
    if (profileState.newsletter) fd.set('newsletter', 'on');
    startSavingProfile(async () => {
      const result = await updateProfile(fd);
      if (result.error) {
        setProfileError(result.error);
        return;
      }
      setProfileState((p) =>
        p
          ? {
              ...p,
              full_name: fullName.trim() || p.full_name,
              cpf: needsCpf ? nextCpf : p.cpf,
              phone: needsPhone ? phone : p.phone,
            }
          : p
      );
    });
  }

  const pay = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!readyToPay || paying) return;
      setPayError('');

      const exp = digitsOnly(expiry);
      const month = Number.parseInt(exp.slice(0, 2), 10);
      if (exp.length < 4 || month < 1 || month > 12) {
        setPayError('Validade do cartão inválida.');
        return;
      }
      const number = digitsOnly(cardNumber);
      const validation = validateCreditCard({
        holderName: holderName.trim(),
        number,
        expiryMonth: String(month),
        expiryYear: exp.slice(2),
        ccv: digitsOnly(cvv),
      });
      if (!validation.ok) {
        setPayError(validation.error);
        return;
      }

      setPaying(true);
      try {
        const token = await tokenizePagarmeCard({
          holderName: holderName.trim(),
          number,
          expiryMonth: String(month),
          expiryYear: exp.slice(2),
          cvv: digitsOnly(cvv),
        });
        const { readStoredMarketingAttribution } = await import('@/lib/marketing/utm-session');
        const marketingAttribution = readStoredMarketingAttribution();

        const res = await fetch('/api/black-friday/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            option,
            addressId,
            installmentCount: option === 'combo' ? installments : 1,
            cardToken: token.token,
            cardLast4: token.last4,
            cardBrand: token.brand,
            expectedChargeCents: chargeCents,
            ctaPlacement,
            ...(marketingAttribution ? { marketingAttribution } : {}),
          }),
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (payload.code === 'SUBSCRIPTION_ALREADY_ACTIVE') {
            router.push('/dashboard/subscription');
            return;
          }
          throw new Error(typeof payload.error === 'string' ? payload.error : 'Não foi possível confirmar o pagamento.');
        }

        router.push(`/assinatura-confirmada?ids=${encodeURIComponent(payload.subscriptionId ?? '')}`);
        router.refresh();
      } catch (error) {
        setPayError(error instanceof Error ? error.message : 'Não foi possível confirmar o pagamento.');
        setPaying(false);
      }
    },
    [
      addressId,
      cardNumber,
      chargeCents,
      ctaPlacement,
      cvv,
      expiry,
      holderName,
      installments,
      option,
      paying,
      readyToPay,
      router,
    ]
  );

  const selectedAddress = addresses.find((a) => a.id === addressId);
  const shippingKnown = Boolean(shipping);
  const plusShipping = shippingKnown ? '' : ' + frete';

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/black-friday" className={styles.back}>
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Oferta</span>
        </Link>
        <Link href="/" aria-label="DungeonBox, página inicial" className={styles.logo}>
          <Image src="/images/dungeonbox.png" alt="" width={486} height={176} priority />
        </Link>
        <span className={styles.secure}>
          <Lock size={15} aria-hidden="true" />
          Seguro
        </span>
      </header>

      <main className={styles.layout}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Black Friday · Plano Lendário</p>
          <h1>
            Feche a sua <em>mesa</em>
          </h1>
          <p>Três passos: escolha, endereço e cartão. A primeira caixa sai nas Ruínas Perdidas.</p>
        </div>

        <div className={styles.steps}>
          <section className={styles.step} aria-labelledby="passo-plano">
            <h2 id="passo-plano" className={styles.stepTitle}>
              <span>01</span> Escolha a oferta
            </h2>
            <div className={styles.options} role="radiogroup" aria-label="Oferta da Black Friday">
              <button
                type="button"
                role="radio"
                aria-checked={option === 'mensal'}
                className={styles.option}
                data-selected={option === 'mensal'}
                onClick={() => setOption('mensal')}
              >
                <span className={styles.optionTag}>−{BF_MONTHLY_DISCOUNT_PERCENT}%</span>
                <span className={styles.optionName}>Mensal</span>
                <span className={styles.optionPrice}>
                  <s>{formatCents(planCents)}</s>
                  <strong>{formatCents(planCents - monthlyPreview.discountCents)}</strong>
                  <small>/mês{plusShipping}</small>
                </span>
                <span className={styles.optionNote}>
                  Nos {BF_MONTHLY_DISCOUNT_CYCLES} primeiros meses. Depois {formatCents(planCents)}/mês. Cancele quando quiser.
                </span>
                <span className={styles.optionCheck} aria-hidden="true">
                  <Check size={18} />
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={option === 'combo'}
                className={`${styles.option} ${styles.optionHot}`}
                data-selected={option === 'combo'}
                onClick={() => setOption('combo')}
              >
                <span className={styles.optionTag}>−{BF_COMBO_DISCOUNT_PERCENT}%</span>
                <span className={styles.optionRibbon}>Maior desconto</span>
                <span className={styles.optionName}>Combo 3 meses</span>
                <span className={styles.optionPrice}>
                  <s>{formatCents(comboPreview.option === 'combo' ? comboPreview.listCents : 0)}</s>
                  <strong>{formatCents(comboPreview.option === 'combo' ? comboPreview.comboCents : 0)}</strong>
                  <small>{shippingKnown ? `${formatCents(comboShippingTotalCents)} frete (3 envios)` : '+ frete (3 envios)'}</small>
                </span>
                <span className={styles.optionNote}>
                  3 caixas pagas de uma vez. À vista ou em até 12x com juros de {formatRatePercent()} ao mês.
                </span>
                <span className={styles.optionCheck} aria-hidden="true">
                  <Check size={18} />
                </span>
              </button>
            </div>
          </section>

          <section className={styles.step} aria-labelledby="passo-entrega">
            <h2 id="passo-entrega" className={styles.stepTitle}>
              <span>02</span> Entrega
            </h2>

            {addresses.length > 0 && !showAddressForm && (
              <ul className={styles.addressList} role="radiogroup" aria-label="Endereço de entrega">
                {addresses.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={a.id === addressId}
                      data-selected={a.id === addressId}
                      className={styles.address}
                      onClick={() => setAddressId(a.id)}
                    >
                      <MapPin size={18} aria-hidden="true" />
                      <span>
                        <strong>{a.recipient}</strong>
                        {a.street}, {a.number}
                        {a.complement ? ` · ${a.complement}` : ''}
                        <small>
                          {a.neighborhood} · {a.city}/{a.state} · CEP {formatZip(a.zip_code)}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {showAddressForm ? (
              <form className={styles.form} onSubmit={submitAddress}>
                <label className={styles.full}>
                  <span>Quem recebe</span>
                  <input value={addressForm.recipient} onChange={(e) => setAddressForm({ ...addressForm, recipient: e.target.value })} autoComplete="name" required />
                </label>
                <label>
                  <span>CEP</span>
                  <input value={addressForm.zip_code} onChange={(e) => void handleCep(e.target.value)} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" maxLength={9} required />
                  {cepLoading && <small>Buscando endereço…</small>}
                </label>
                <label>
                  <span>Número</span>
                  <input value={addressForm.number} onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })} inputMode="numeric" required />
                </label>
                <label className={styles.full}>
                  <span>Rua</span>
                  <input value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} autoComplete="address-line1" required />
                </label>
                <label className={styles.full}>
                  <span>Complemento</span>
                  <input value={addressForm.complement} onChange={(e) => setAddressForm({ ...addressForm, complement: e.target.value })} autoComplete="address-line2" />
                </label>
                <label className={styles.full}>
                  <span>Bairro</span>
                  <input value={addressForm.neighborhood} onChange={(e) => setAddressForm({ ...addressForm, neighborhood: e.target.value })} required />
                </label>
                <label>
                  <span>Cidade</span>
                  <input value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} autoComplete="address-level2" required />
                </label>
                <label>
                  <span>UF</span>
                  <select value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}>
                    {BRAZIL_STATES.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </label>
                {addressError && (
                  <p className={styles.error} role="alert">
                    {addressError}
                  </p>
                )}
                <div className={styles.formActions}>
                  {addresses.length > 0 && (
                    <button type="button" className={styles.ghostButton} onClick={() => setShowAddressForm(false)}>
                      Cancelar
                    </button>
                  )}
                  <button type="submit" className={styles.solidButton} disabled={savingAddress}>
                    {savingAddress ? <Loader2 size={18} className={styles.spin} aria-hidden="true" /> : null}
                    Salvar endereço
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" className={styles.addLink} onClick={() => setShowAddressForm(true)}>
                <Plus size={16} aria-hidden="true" /> Outro endereço
              </button>
            )}

            {selectedAddress && !showAddressForm && (
              <p className={styles.shipping} role="status" aria-live="polite">
                <Truck size={18} aria-hidden="true" />
                {shippingLoading && 'Calculando frete…'}
                {!shippingLoading && shipping && (
                  <span>
                    {shipping.label}
                    {option === 'combo' ? (
                      <>
                        {' · '}
                        <strong>
                          {shipping.cents === 0
                            ? 'frete grátis nos 3 envios'
                            : `${formatCents(perShipmentCents)} por envio · total ${formatCents(comboShippingTotalCents)} (3×)`}
                        </strong>
                      </>
                    ) : (
                      <>
                        {' · '}
                        <strong>{shipping.cents === 0 ? 'frete grátis' : `${formatCents(shipping.cents)}/mês`}</strong>
                      </>
                    )}
                  </span>
                )}
                {!shippingLoading && shippingError && <span className={styles.errorInline}>{shippingError}</span>}
              </p>
            )}
          </section>

          {profileState && !profileReady && (
            <section className={styles.step} aria-labelledby="passo-dados">
              <h2 id="passo-dados" className={styles.stepTitle}>
                <span>03</span> Seus dados
              </h2>
              <p className={styles.stepNote}>CPF e celular são exigidos pela operadora para a cobrança no cartão.</p>
              <form className={styles.form} onSubmit={submitProfile}>
                {needsName && (
                  <label className={styles.full}>
                    <span>Nome completo</span>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
                  </label>
                )}
                {needsCpf && (
                  <label>
                    <span>CPF</span>
                    <input value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" maxLength={14} required />
                  </label>
                )}
                {needsPhone && (
                  <label>
                    <span>Celular</span>
                    <input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" maxLength={18} required />
                  </label>
                )}
                {profileError && (
                  <p className={styles.error} role="alert">
                    {profileError}
                  </p>
                )}
                <div className={styles.formActions}>
                  <button type="submit" className={styles.solidButton} disabled={savingProfile}>
                    {savingProfile ? <Loader2 size={18} className={styles.spin} aria-hidden="true" /> : null}
                    Salvar dados
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className={styles.step} aria-labelledby="passo-cartao">
            <h2 id="passo-cartao" className={styles.stepTitle}>
              <span>{profileState && !profileReady ? '04' : '03'}</span> Cartão de crédito
            </h2>
            <form id="bf-pay" className={styles.form} onSubmit={pay}>
              <label className={styles.full}>
                <span>Nome impresso no cartão</span>
                <input value={holderName} onChange={(e) => setHolderName(e.target.value)} autoComplete="cc-name" required />
              </label>
              <label className={styles.full}>
                <span>Número do cartão</span>
                <span className={styles.inputIcon}>
                  <input value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" required />
                  <CreditCard size={18} aria-hidden="true" />
                </span>
              </label>
              <label>
                <span>Validade</span>
                <input value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" required />
              </label>
              <label>
                <span>CVV</span>
                <input value={cvv} onChange={(e) => setCvv(digitsOnly(e.target.value).slice(0, 4))} inputMode="numeric" autoComplete="cc-csc" placeholder="123" required />
              </label>
              {option === 'combo' && (
                <label className={styles.full}>
                  <span>Parcelamento</span>
                  <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                    {installmentPlans.map((p) => (
                      <option key={p.count} value={p.count}>
                        {p.count === 1
                          ? `À vista · ${formatCents(p.totalCents)}`
                          : `${p.count}x de ${formatCents(p.installmentCents)} · total ${formatCents(p.totalCents)}`}
                      </option>
                    ))}
                  </select>
                  <small>
                    1x no cartão: valor integral, taxa de parcelamento a cargo da loja (sem repasse na fatura).
                    A partir de 2x, juros de {formatRatePercent()} ao mês (tabela Price) por conta de quem compra.
                  </small>
                </label>
              )}
            </form>
          </section>
        </div>

        <aside className={styles.summary} aria-label="Resumo do pedido">
          <div className={styles.receipt}>
            <p className={styles.receiptBrand}>✦ DungeonBox ✦</p>
            <p className={styles.receiptTitle}>Seu cupom</p>
            <p className={styles.receiptMeta}>Black Friday 2026 · Plano Lendário</p>

            <dl className={styles.lines}>
              {previewQuote.option === 'mensal' ? (
                <>
                  <div>
                    <dt>Lendário mensal</dt>
                    <dd>{formatCents(previewQuote.planCents)}</dd>
                  </div>
                  <div className={styles.lineDiscount}>
                    <dt>Black −{BF_MONTHLY_DISCOUNT_PERCENT}%</dt>
                    <dd>−{formatCents(previewQuote.discountCents)}</dd>
                  </div>
                  <div>
                    <dt>Frete</dt>
                    <dd>{shippingKnown ? (previewQuote.shippingCents === 0 ? 'grátis' : formatCents(previewQuote.shippingCents)) : 'a calcular'}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>3 caixas Lendário</dt>
                    <dd>{formatCents(previewQuote.listCents)}</dd>
                  </div>
                  <div className={styles.lineDiscount}>
                    <dt>Black −{BF_COMBO_DISCOUNT_PERCENT}%</dt>
                    <dd>−{formatCents(previewQuote.discountCents)}</dd>
                  </div>
                  {previewQuote.installments.interestCents > 0 && (
                    <div>
                      <dt>Juros {previewQuote.installments.count}x</dt>
                      <dd>+{formatCents(previewQuote.installments.interestCents)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Frete</dt>
                    <dd>
                      {shippingKnown
                        ? shipping?.cents === 0
                          ? 'grátis nos 3 envios'
                          : `${formatCents(comboShippingTotalCents)} · ${formatCents(perShipmentCents)}/envio × 3`
                        : 'a calcular'}
                    </dd>
                  </div>
                </>
              )}
            </dl>

            <div className={styles.total}>
              <span>{previewQuote.option === 'mensal' ? 'Hoje' : 'Total'}</span>
              <strong>{shippingKnown ? formatCents(chargeCents) : '—'}</strong>
            </div>
            <p className={styles.totalNote}>
              {previewQuote.option === 'mensal'
                ? `Mais 2 meses neste valor. Do 4º mês em diante, ${shippingKnown ? formatCents(previewQuote.regularChargeCents) : `${formatCents(planCents)} + frete`}/mês.`
                : previewQuote.installments.count > 1
                  ? `${previewQuote.installments.count}x de ${formatCents(previewQuote.installments.installmentCents)} no cartão. Depois de 3 meses, renova pelo preço normal do combo.`
                  : 'À vista no cartão. Depois de 3 meses, renova pelo preço normal do combo.'}
            </p>

            <button type="submit" form="bf-pay" className={styles.payButton} disabled={!readyToPay || paying}>
              {paying ? (
                <>
                  <Loader2 size={20} className={styles.spin} aria-hidden="true" />
                  Processando…
                </>
              ) : (
                <>
                  <Lock size={18} aria-hidden="true" />
                  {shippingKnown ? `Pagar ${formatCents(chargeCents)}` : 'Pagar'}
                </>
              )}
            </button>
            {!readyToPay && !paying && (
              <p className={styles.hint}>
                {!addressId || showAddressForm
                  ? 'Escolha o endereço para calcular o frete.'
                  : !profileReady
                    ? 'Complete seus dados para liberar o pagamento.'
                    : 'Calculando o frete…'}
              </p>
            )}
            {payError && (
              <p className={styles.error} role="alert">
                {payError}
              </p>
            )}
            <ul className={styles.trust}>
              <li>
                <ShieldCheck size={15} aria-hidden="true" /> Pagamento processado pelo Pagar.me
              </li>
              <li>
                <Lock size={15} aria-hidden="true" /> Os dados do cartão não passam pelo nosso servidor
              </li>
            </ul>
            <span className={styles.barcode} aria-hidden="true" />
          </div>
        </aside>
      </main>
    </div>
  );
}
