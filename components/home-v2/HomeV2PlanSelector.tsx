'use client';

import { useCallback, useId, useState, type KeyboardEvent } from 'react';
import {
  ArrowUpCircle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Truck,
  Unlock,
} from 'lucide-react';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import HomeV2PhotoViewer from '@/components/home-v2/HomeV2PhotoViewer';
import HomeV2PlanDetails, { type HomeV2PlanPurchase } from '@/components/home-v2/HomeV2PlanDetails';
import HomeV2PlanGallery, { PLAN_PHOTO_SIZES } from '@/components/home-v2/HomeV2PlanGallery';
import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';
import {
  formatHomeV2Price,
  getHomeV2PlanCta,
  HOME_V2_COPY,
  type HomeV2Plan,
} from '@/lib/home-v2/content';
import {
  getHomeV2ComboPricing,
  HOME_V2_COMBO_TERMS,
  HOME_V2_DEFAULT_COMBO_TERM,
  isHomeV2ComboTerm,
  type HomeV2ComboTerm,
  type HomeV2PlanMode,
} from '@/lib/home-v2/combo';
import {
  trackHomeV2CheckoutStarted,
  trackHomeV2ComboTermChanged,
  trackHomeV2PlanGalleryOpened,
  trackHomeV2PlanModeChanged,
  trackHomeV2PlanSelected,
  trackHomeV2PlanViewed,
} from '@/lib/home-v2/analytics';

interface Props {
  plans: HomeV2Plan[];
}

const REASSURANCE_ICONS = [ShieldCheck, Unlock, ArrowUpCircle] as const;
const COMBO_REASSURANCE_ICONS = [ShieldCheck, CreditCard, ArrowUpCircle] as const;
const PLAN_MODES: HomeV2PlanMode[] = ['subscription', 'combo'];

export default function HomeV2PlanSelector({ plans }: Props) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [activeSlug, setActiveSlug] = useState(
    () => plans.find((plan) => plan.badge)?.slug ?? plans[0]?.slug
  );
  const openPlan = plans.find((plan) => plan.slug === openSlug) ?? null;
  const closeDetails = useCallback(() => setOpenSlug(null), []);
  const [gallery, setGallery] = useState<{ slug: string; index: number } | null>(null);
  const galleryPlan = plans.find((plan) => plan.slug === gallery?.slug) ?? null;
  const closeGallery = useCallback(() => setGallery(null), []);
  const copy = HOME_V2_COPY.plans;

  const [mode, setMode] = useState<HomeV2PlanMode>('subscription');
  const [term, setTerm] = useState<HomeV2ComboTerm>(HOME_V2_DEFAULT_COMBO_TERM);
  const isCombo = mode === 'combo';
  const modeTabsId = useId();
  const panelId = `${modeTabsId}-panel`;
  const tabId = (value: HomeV2PlanMode) => `${modeTabsId}-${value}`;

  const changeMode = (next: HomeV2PlanMode) => {
    if (next === mode) return;
    setMode(next);
    trackHomeV2PlanModeChanged(next);
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = mode === 'subscription' ? 'combo' : 'subscription';
    changeMode(next);
    document.getElementById(tabId(next))?.focus();
  };

  const purchaseFor = (plan: HomeV2Plan): HomeV2PlanPurchase => {
    if (!isCombo) {
      return {
        href: plan.checkoutUrl,
        priceCents: plan.monthlyPriceCents,
        priceSuffix: '/mês',
        term: 'monthly',
      };
    }
    const pricing = getHomeV2ComboPricing(plan.slug, plan.monthlyPriceCents, term);
    return {
      href: pricing.checkoutUrl,
      priceCents: pricing.totalCents,
      priceSuffix: `/${pricing.months} meses`,
      note: `${copy.comboEquivalent} ${formatHomeV2Price(pricing.perMonthCents)}/mês · ${pricing.installments}`,
      term: pricing.term,
    };
  };

  const trackBuy = (plan: HomeV2Plan) => {
    const buy = purchaseFor(plan);
    trackHomeV2PlanSelected(plan.slug, buy.priceCents / 100);
    trackHomeV2CheckoutStarted(plan.slug, buy.term);
  };

  return (
    <section
      id="planos"
      className="relative overflow-hidden bg-mesa-stone px-4 py-20 sm:px-6 md:py-28"
      aria-labelledby="home-v2-planos-title"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-40 -z-0 h-[36rem] w-[56rem] -translate-x-1/2 rounded-full bg-mesa-ember/[0.07] blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl">
        <HomeV2SectionHeading
          eyebrow={copy.eyebrow}
          title={copy.title}
          support={copy.support}
          titleId="home-v2-planos-title"
          align="center"
        />

        <div className="home-v2-reveal mt-10 flex justify-center">
          <div
            role="tablist"
            aria-label={copy.modeLabel}
            className="relative grid w-full max-w-sm grid-cols-2 gap-1 rounded-full border border-white/10 bg-mesa-ink/70 p-1"
          >
            <span
              aria-hidden="true"
              className="absolute bottom-1 left-1 top-1 w-[calc((100%-0.75rem)/2)] rounded-full bg-mesa-parchment shadow-[0_10px_30px_-12px_rgba(243,239,231,0.5)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                transform: `translateX(calc(${PLAN_MODES.indexOf(mode)} * (100% + 0.25rem)))`,
              }}
            />
            {PLAN_MODES.map((value) => {
              const selected = value === mode;
              const attention = value === 'combo' && !selected;
              return (
                <button
                  key={value}
                  id={tabId(value)}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={panelId}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => changeMode(value)}
                  onKeyDown={onTabKeyDown}
                  className={`home-v2-display relative flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-base tracking-wide transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mesa-ember ${
                    selected
                      ? 'text-mesa-ink'
                      : attention
                        ? 'home-v2-combo-pulse bg-mesa-ember text-mesa-ink hover:bg-[#ff7a4a]'
                        : 'text-mesa-parchment/80 hover:text-mesa-parchment'
                  }`}
                >
                  {copy.modes[value]}
                  {value === 'combo' ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] tracking-[0.12em] transition-colors ${
                        selected ? 'bg-mesa-ink/10 text-mesa-ink' : 'bg-mesa-ink/15 text-mesa-ink'
                      }`}
                    >
                      {copy.comboModeHint}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div id={panelId} role="tabpanel" aria-labelledby={tabId(mode)}>
        <div
          role="group"
          aria-label={copy.switcherLabel}
          className="home-v2-reveal relative mx-auto mt-6 grid max-w-xl grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-mesa-ink/70 p-1 lg:hidden"
        >
          <span
            aria-hidden="true"
            className="absolute bottom-1 left-1 top-1 w-[calc((100%-1rem)/3)] rounded-xl bg-mesa-stone shadow-[inset_0_0_0_1px_rgba(255,100,45,0.6),0_10px_30px_-12px_rgba(255,100,45,0.45)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              transform: `translateX(calc(${Math.max(0, plans.findIndex((plan) => plan.slug === activeSlug))} * (100% + 0.25rem)))`,
            }}
          />
          {plans.map((plan) => {
            const active = plan.slug === activeSlug;
            return (
              <button
                key={plan.slug}
                type="button"
                aria-pressed={active}
                aria-controls={`home-v2-plan-card-${plan.slug}`}
                onClick={() => setActiveSlug(plan.slug)}
                className={`relative flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-xl px-1 pb-2 pt-3 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mesa-ember ${
                  active ? '' : 'hover:bg-white/[0.04]'
                }`}
              >
                {plan.badge ? (
                  <span className="home-v2-display absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-mesa-ember px-2 py-0.5 text-[11px] leading-tight tracking-[0.1em] text-mesa-ink">
                    {plan.badge}
                  </span>
                ) : null}
                <span
                  className={`home-v2-display text-base leading-tight tracking-wide transition-colors ${
                    active ? 'text-mesa-parchment' : 'text-mesa-parchment/70'
                  }`}
                >
                  {plan.name}
                </span>
                <span className="mt-0.5 whitespace-nowrap text-[11px] tabular-nums text-mesa-ash">
                  {isCombo
                    ? `${formatHomeV2Price(getHomeV2ComboPricing(plan.slug, plan.monthlyPriceCents, term).totalCents)} total`
                    : `${formatHomeV2Price(plan.monthlyPriceCents)}/mês`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mx-auto mt-5 grid max-w-xl gap-6 lg:mt-14 lg:max-w-none lg:grid-cols-3 lg:gap-6">
          {plans.map((plan, index) => {
            const featured = Boolean(plan.badge);
            const active = plan.slug === activeSlug;
            const pricing = getHomeV2ComboPricing(plan.slug, plan.monthlyPriceCents, term);
            const selectId = `${modeTabsId}-term-${plan.slug}`;
            return (
              <div
                key={plan.slug}
                id={`home-v2-plan-card-${plan.slug}`}
                className={`home-v2-reveal lg:flex ${featured ? 'lg:-my-4' : ''} ${active ? 'flex' : 'hidden'}`}
                style={{ '--stagger': index } as React.CSSProperties}
              >
              <article
                key={active ? 'active' : 'idle'}
                aria-labelledby={`home-v2-plan-${plan.slug}`}
                className={`home-v2-swap group relative flex w-full flex-col overflow-hidden rounded-3xl border bg-mesa-ink transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 ${
                  featured
                    ? 'border-2 border-mesa-ember shadow-[0_0_0_1px_rgba(255,100,45,0.45),0_0_40px_-4px_rgba(255,100,45,0.35),0_36px_90px_-28px_rgba(255,100,45,0.55)] ring-1 ring-mesa-ember/40'
                    : 'border-white/10 shadow-2xl shadow-black/25 hover:border-white/25'
                }`}
              >
                <div className="relative">
                  <HomeV2PlanGallery
                    planName={plan.name}
                    photos={plan.gallery}
                    variant={featured ? 'featured' : 'default'}
                    onOpen={(photo) => {
                      trackHomeV2PlanGalleryOpened(plan.slug, photo + 1);
                      setGallery({ slug: plan.slug, index: photo });
                    }}
                  />
                  {plan.badge ? (
                    <span className="home-v2-display pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-mesa-ember px-3 py-1.5 text-[11px] tracking-[0.16em] text-mesa-ink shadow-lg shadow-black/30">
                      <Sparkles aria-hidden="true" className="size-3" strokeWidth={2.5} />
                      {plan.badge}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col px-5 pb-6 pt-3">
                  <h3
                    id={`home-v2-plan-${plan.slug}`}
                    className="home-v2-display text-2xl leading-none text-mesa-parchment"
                  >
                    {plan.name}
                  </h3>
                  <p className="mt-2 min-h-[2.75rem] text-sm leading-relaxed text-mesa-ash">
                    {plan.tagline}
                  </p>

                  {isCombo ? (
                    <>
                      <label
                        htmlFor={selectId}
                        className="home-v2-display mt-4 block text-[11px] tracking-[0.2em] text-mesa-ash"
                      >
                        {copy.comboTermLabel}
                      </label>
                      <div className="relative mt-2">
                        <select
                          id={selectId}
                          value={term}
                          onChange={(event) => {
                            const next = event.target.value;
                            if (!isHomeV2ComboTerm(next)) return;
                            setTerm(next);
                            trackHomeV2ComboTermChanged(next);
                          }}
                          className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/15 bg-mesa-stone pl-4 pr-10 text-sm font-semibold text-mesa-parchment transition-colors hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mesa-ember"
                        >
                          {HOME_V2_COMBO_TERMS.map((value) => (
                            <option key={value} value={value}>
                              {getHomeV2ComboPricing(plan.slug, plan.monthlyPriceCents, value).optionLabel}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          aria-hidden="true"
                          className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-mesa-ash"
                        />
                      </div>
                      <div key={term} className="home-v2-swap">
                        <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
                          <span className="home-v2-display text-5xl leading-none text-mesa-parchment">
                            {formatHomeV2Price(pricing.totalCents)}
                          </span>
                          <span className="text-sm text-mesa-ash">/{pricing.months} meses</span>
                        </p>
                        <p className="mt-2 text-sm text-mesa-ash">
                          <s className="decoration-mesa-ash/60">{formatHomeV2Price(pricing.fullPriceCents)}</s>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span className="font-semibold text-mesa-jade">
                            {copy.comboSavings} {formatHomeV2Price(pricing.savingsCents)}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-mesa-ash">
                          {copy.comboEquivalent} {formatHomeV2Price(pricing.perMonthCents)}/mês ·{' '}
                          {pricing.installments}
                        </p>
                        {pricing.freeShipping ? (
                          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-mesa-jade/30 bg-mesa-jade/10 px-2.5 py-1 text-xs font-semibold text-mesa-jade">
                            <Truck aria-hidden="true" className="size-3.5" strokeWidth={2} />
                            {copy.comboFreeShipping}
                          </p>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-mesa-ash">{copy.comboBilling}</p>
                    </>
                  ) : (
                    <div key="monthly" className="home-v2-swap">
                      <p className="mt-4 flex items-baseline gap-1.5">
                        <span className="home-v2-display text-5xl leading-none text-mesa-parchment">
                          {formatHomeV2Price(plan.monthlyPriceCents)}
                        </span>
                        <span className="text-sm text-mesa-ash">/mês</span>
                      </p>
                      <p className="mt-2 text-xs text-mesa-ash">{copy.billing}</p>
                    </div>
                  )}

                  <dl className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/[0.02] py-3">
                    {plan.metrics.map((metric) => (
                      <div key={metric.label} className="px-3 text-center">
                        <dt className="text-[11px] uppercase tracking-[0.14em] text-mesa-ash">
                          {metric.label}
                        </dt>
                        <dd className="mt-1 text-sm font-semibold tabular-nums text-mesa-parchment">
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-auto flex flex-col gap-1 pt-6">
                    <HomeV2Button
                      href={purchaseFor(plan).href}
                      variant={featured ? 'primary' : 'outline'}
                      size="md"
                      arrow
                      className="w-full"
                      onClick={() => trackBuy(plan)}
                    >
                      {getHomeV2PlanCta(plan.slug)}
                    </HomeV2Button>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      className="group/details mx-auto inline-flex min-h-11 cursor-pointer items-center gap-1 px-2 text-sm text-mesa-ash transition-colors hover:text-mesa-parchment"
                      onClick={() => {
                        trackHomeV2PlanViewed(plan.slug);
                        setOpenSlug(plan.slug);
                      }}
                    >
                      Ver o que vem na caixa
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 transition-transform duration-150 group-hover/details:translate-x-0.5"
                      />
                    </button>
                  </div>
                </div>
              </article>
              </div>
            );
          })}
        </div>
        </div>

        <div className="home-v2-reveal mt-14 grid gap-6 rounded-2xl border border-white/10 bg-mesa-ink/60 p-5 backdrop-blur-sm md:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <p className="text-sm leading-relaxed text-mesa-ash md:text-base">
            <span className="font-semibold text-mesa-parchment">{copy.footerLead}</span>{' '}
            {copy.footer}
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {(isCombo ? copy.comboReassurance : copy.reassurance).map((item, index) => {
              const Icon = (isCombo ? COMBO_REASSURANCE_ICONS : REASSURANCE_ICONS)[index];
              return (
                <li key={item} className="inline-flex items-center gap-2 text-sm text-mesa-parchment">
                  <Icon aria-hidden="true" className="size-4 text-mesa-jade" strokeWidth={1.75} />
                  {item}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {openPlan ? (
        <HomeV2PlanDetails plan={openPlan} purchase={purchaseFor(openPlan)} onClose={closeDetails} />
      ) : null}

      {galleryPlan && gallery ? (
        <HomeV2PhotoViewer
          eyebrow={`Plano ${galleryPlan.name}`}
          title="Fotos do kit"
          photos={galleryPlan.gallery}
          initialIndex={gallery.index}
          onClose={closeGallery}
          previewSizes={PLAN_PHOTO_SIZES}
          cta={{
            href: purchaseFor(galleryPlan).href,
            label: getHomeV2PlanCta(galleryPlan.slug),
            support: `${formatHomeV2Price(purchaseFor(galleryPlan).priceCents)}${purchaseFor(galleryPlan).priceSuffix} · ${isCombo ? copy.comboBilling : copy.billing}`,
            onClick: () => trackBuy(galleryPlan),
          }}
        />
      ) : null}
    </section>
  );
}
