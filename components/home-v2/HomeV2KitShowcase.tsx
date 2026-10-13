'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Expand,
  Layers,
  LayoutGrid,
  Package,
  PackageOpen,
  Puzzle,
  Scale,
  type LucideIcon,
} from 'lucide-react';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import HomeV2PhotoViewer from '@/components/home-v2/HomeV2PhotoViewer';
import {
  trackKitCtaClick,
  trackKitGalleryLightbox,
  trackKitGalleryMedia,
  trackKitGalleryTab,
  trackKitGalleryView,
  trackKitPlanClick,
} from '@/lib/home-v2/analytics';
import {
  KIT_PLANS_SECTION_HREF,
  KIT_SHOWCASE_COPY,
  KIT_TABS,
  kitItemsByCategory,
  type KitCategory,
  type KitGalleryItem,
} from '@/lib/home-v2/kit-showcase';

const copy = KIT_SHOWCASE_COPY;

const TAB_ICONS: Record<KitCategory, LucideIcon> = {
  conteudo: Package,
  mesa: LayoutGrid,
  planos: Scale,
  unboxing: PackageOpen,
  encaixe: Puzzle,
  colecao: Layers,
};

const TAB_META = KIT_TABS.map((tab) => {
  const entries = kitItemsByCategory(tab.id);
  const count = entries.length;
  const unit = tab.id === 'planos' ? (count === 1 ? 'plano' : 'planos') : count === 1 ? 'foto' : 'fotos';
  return {
    ...tab,
    Icon: TAB_ICONS[tab.id],
    thumbnail: entries[0]?.thumbnail ?? entries[0]?.src ?? null,
    position: entries[0]?.position ?? 'center',
    countLabel: `${count} ${unit}`,
  };
});

function planLabel(plan: KitGalleryItem['plan']) {
  if (plan === 'heroi') return 'Herói';
  if (plan === 'lendario') return 'Lendário';
  if (plan === 'aventureiro') return 'Aventureiro';
  return null;
}

function eventProps(item: KitGalleryItem, position: number) {
  return {
    plan: item.plan,
    mediaType: item.mediaType,
    category: item.category,
    position,
  };
}

export default function HomeV2KitShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tablistRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [category, setCategory] = useState<KitCategory>('conteudo');
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const items = kitItemsByCategory(category);
  const item = items[index] ?? items[0];
  const comparing = category === 'planos';

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let viewed = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (viewed) return;
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRect.height >= window.innerHeight * 0.5
        );
        if (!visible) return;
        viewed = true;
        trackKitGalleryView();
      },
      { threshold: [0, 0.25, 0.5] }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const revealTab = (tabIndex: number) => {
    const tab = tabRefs.current[tabIndex];
    if (!tab) return;
    tab.focus({ preventScroll: true });
    const list = tablistRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const left = tab.offsetLeft - (list.clientWidth - tab.clientWidth) / 2;
    list.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  };

  const selectTab = (next: KitCategory, tabIndex: number) => {
    setCategory(next);
    setIndex(0);
    trackKitGalleryTab(next);
    revealTab(tabIndex);
  };

  const onTabKeyDown = (event: React.KeyboardEvent, tabIndex: number) => {
    const last = KIT_TABS.length - 1;
    let next = tabIndex;
    if (event.key === 'ArrowRight') next = tabIndex === last ? 0 : tabIndex + 1;
    else if (event.key === 'ArrowLeft') next = tabIndex === 0 ? last : tabIndex - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    const tab = KIT_TABS[next];
    if (!tab) return;
    setCategory(tab.id);
    setIndex(0);
    trackKitGalleryTab(tab.id);
    revealTab(next);
  };

  const selectMedia = (nextIndex: number) => {
    const total = items.length;
    if (total === 0) return;
    const next = (nextIndex + total) % total;
    if (next === index) return;
    setIndex(next);
    const media = items[next];
    if (media) trackKitGalleryMedia(eventProps(media, next + 1));
  };

  const openLightbox = () => {
    if (!item) return;
    trackKitGalleryLightbox(eventProps(item, index + 1));
    setLightbox(index);
  };

  const onStageTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const onStageTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch || items.length < 2) return;
    const dx = touch.clientX - start.x;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(touch.clientY - start.y)) {
      selectMedia(index + (dx < 0 ? 1 : -1));
    }
  };

  const multiple = items.length > 1;
  const label = item ? planLabel(item.plan) : null;

  return (
    <section
      ref={sectionRef}
      id="kits"
      className="relative isolate overflow-hidden bg-mesa-ink px-4 py-20 sm:px-6 md:py-28"
      aria-labelledby="home-v2-kits-title"
    >
      <div className="home-v2-grid home-v2-fog pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -left-40 top-1/3 -z-10 h-[34rem] w-[48rem] rounded-full bg-mesa-ember/[0.07] blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl">
        <header className="grid gap-6 md:grid-cols-[1.15fr_0.85fr] md:items-end md:gap-16">
          <div>
            <p className="home-v2-reveal home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">{copy.eyebrow}</p>
            <h2
              id="home-v2-kits-title"
              data-reveal="mask"
              className="home-v2-reveal home-v2-display mt-3 max-w-3xl text-balance text-[clamp(2.2rem,6vw,4.75rem)] leading-[0.9] text-mesa-parchment"
              style={{ '--stagger': 1 } as React.CSSProperties}
            >
              {copy.title}
            </h2>
          </div>
          <p
            className="home-v2-reveal max-w-md text-pretty text-base leading-relaxed text-mesa-ash md:pb-1"
            style={{ '--stagger': 2 } as React.CSSProperties}
          >
            {copy.support}
          </p>
        </header>

        <div className="home-v2-reveal mt-10 md:mt-14" style={{ '--stagger': 2 } as React.CSSProperties}>
          <div
            ref={tablistRef}
            role="tablist"
            aria-label="Fotos do kit"
            className="home-v2-snap -mx-4 flex gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6 [&::-webkit-scrollbar]:hidden"
          >
            {TAB_META.map((tab, tabIndex) => {
              const selected = tab.id === category;
              const Icon = tab.Icon;
              return (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabRefs.current[tabIndex] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`kit-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls="kit-gallery-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(tab.id, tabIndex)}
                  onKeyDown={(event) => onTabKeyDown(event, tabIndex)}
                  className={`group/tab relative aspect-[4/3] w-[44%] shrink-0 snap-start cursor-pointer overflow-hidden rounded-2xl border text-left transition-[border-color,transform,box-shadow] duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mesa-ember sm:w-auto ${
                    selected
                      ? 'border-mesa-ember shadow-[0_18px_40px_-18px_rgba(255,100,45,0.6)]'
                      : 'border-white/10 hover:-translate-y-0.5 hover:border-white/30'
                  }`}
                >
                  {tab.thumbnail ? (
                    <Image
                      src={tab.thumbnail}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 16vw, (min-width: 640px) 30vw, 44vw"
                      className={`object-cover transition-[opacity,transform,filter] duration-300 ease-out ${
                        selected
                          ? 'scale-100 opacity-100'
                          : 'scale-[1.02] opacity-45 saturate-50 group-hover/tab:scale-[1.05] group-hover/tab:opacity-80 group-hover/tab:saturate-100'
                      }`}
                      style={{ objectPosition: tab.position }}
                    />
                  ) : (
                    <span aria-hidden="true" className="absolute inset-0 bg-mesa-stone" />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-mesa-ink via-mesa-ink/35 to-mesa-ink/10"
                  />
                  <span
                    aria-hidden="true"
                    className={`absolute left-2.5 top-2.5 flex size-7 items-center justify-center rounded-full backdrop-blur-md transition-colors duration-200 ${
                      selected ? 'bg-mesa-ember text-mesa-ink' : 'bg-mesa-ink/60 text-mesa-parchment'
                    }`}
                  >
                    <Icon className="size-3.5" strokeWidth={2} />
                  </span>
                  <span className="home-v2-display absolute right-2.5 top-2.5 rounded-full bg-mesa-ink/60 px-2 py-1 text-[10px] tracking-[0.14em] text-mesa-parchment/85 backdrop-blur-md">
                    {tab.countLabel}
                  </span>
                  <span
                    className={`home-v2-display absolute inset-x-3 bottom-2.5 text-balance text-[13px] leading-[1.05] tracking-[0.06em] transition-colors duration-200 sm:text-sm ${
                      selected ? 'text-mesa-parchment' : 'text-mesa-parchment/75 group-hover/tab:text-mesa-parchment'
                    }`}
                  >
                    {tab.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-mesa-ember transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      selected ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div id="kit-gallery-panel" role="tabpanel" aria-labelledby={`kit-tab-${category}`} className="mt-6 md:mt-8">
            {comparing ? (
              <PlanComparison />
            ) : item ? (
              <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
                <div className="min-w-0 lg:flex">
                  <div
                    className="group relative aspect-[4/3] overflow-hidden rounded-2xl border sm:rounded-3xl border-white/10 bg-mesa-stone shadow-2xl shadow-black/40 sm:aspect-[16/10.5] lg:aspect-auto lg:min-h-[28rem] lg:flex-1"
                    onTouchStart={onStageTouchStart}
                    onTouchEnd={onStageTouchEnd}
                  >
                    <Image
                      key={item.id}
                      src={item.src}
                      alt={item.alt}
                      fill
                      sizes="(min-width: 1024px) 62vw, 100vw"
                      className="home-v2-kit-swap home-v2-media-zoom object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      style={{ objectPosition: item.position ?? 'center' }}
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-mesa-ink/70 to-transparent"
                    />
                    <p className="home-v2-display pointer-events-none absolute left-3 top-3 inline-flex max-w-[calc(100%-4.75rem)] items-center gap-2 rounded-full bg-mesa-parchment px-3 py-1.5 text-[11px] leading-tight tracking-[0.14em] text-mesa-ink shadow-lg shadow-black/30 sm:left-5 sm:top-5 sm:tracking-[0.16em]">
                      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-mesa-ember" />
                      {item.badge}
                    </p>
                    <button
                      type="button"
                      onClick={openLightbox}
                      aria-label={`${copy.ampliar}: ${item.alt}`}
                      className="absolute right-3 top-3 flex size-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-mesa-ink/60 text-mesa-parchment backdrop-blur-md transition-colors duration-200 hover:border-mesa-ember/60 hover:bg-mesa-ink/80 sm:right-5 sm:top-5"
                    >
                      <Expand aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
                    </button>
                    {multiple ? (
                      <div className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-full border border-white/15 bg-mesa-ink/60 p-1 backdrop-blur-md sm:bottom-5 sm:right-5">
                        <button
                          type="button"
                          onClick={() => selectMedia(index - 1)}
                          aria-label={copy.previous}
                          className="flex size-11 cursor-pointer items-center justify-center rounded-full text-mesa-parchment sm:size-10 transition-colors duration-200 hover:bg-white/10"
                        >
                          <ChevronLeft aria-hidden="true" className="size-5" />
                        </button>
                        <p className="home-v2-display min-w-[3.25rem] text-center text-xs tracking-[0.16em] text-mesa-parchment" aria-live="polite">
                          <span className="text-mesa-ember">{String(index + 1).padStart(2, '0')}</span>
                          <span className="mx-1 text-white/35">/</span>
                          {String(items.length).padStart(2, '0')}
                          <span className="sr-only">
                            {index + 1} de {items.length}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => selectMedia(index + 1)}
                          aria-label={copy.next}
                          className="flex size-11 cursor-pointer items-center justify-center rounded-full text-mesa-parchment sm:size-10 transition-colors duration-200 hover:bg-white/10"
                        >
                          <ChevronRight aria-hidden="true" className="size-5" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <aside className="relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-mesa-stone p-5 shadow-2xl shadow-black/25 sm:rounded-3xl sm:p-8">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full border border-mesa-jade/10"
                  />
                  <p className="home-v2-display relative inline-flex items-center gap-2 text-[11px] tracking-[0.22em] text-mesa-jade">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-mesa-jade" />
                    {label ? `Plano ${label}` : 'O kit'}
                  </p>
                  <h3 key={item.id} className="home-v2-swap home-v2-display relative mt-3 text-balance text-[26px] leading-[0.95] text-mesa-parchment sm:text-[28px] md:text-[34px]">
                    {item.title}
                  </h3>
                  <p className="relative mt-4 text-pretty text-base leading-relaxed text-mesa-ash">{item.description}</p>
                  {item.bullets ? (
                    <ul className="relative mt-5 grid grid-cols-2 gap-2 sm:mt-6">
                      {item.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-2 rounded-xl border border-white/10 bg-mesa-ink/50 px-2.5 py-2.5 text-[13px] leading-snug sm:px-3 sm:text-sm text-mesa-parchment"
                        >
                          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-mesa-jade" strokeWidth={2.25} />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {item.cta ? (
                    <div className="relative mt-6 sm:mt-8 lg:mt-auto lg:pt-8">
                      <HomeV2Button
                        href={KIT_PLANS_SECTION_HREF}
                        size="lg"
                        arrow
                        className="w-full"
                        onClick={() => (item.plan ? trackKitPlanClick(item.plan) : trackKitCtaClick())}
                      >
                        {item.cta.label}
                      </HomeV2Button>
                    </div>
                  ) : null}
                </aside>

              </div>
            ) : null}
          </div>
        </div>
      </div>

      {lightbox !== null && item ? (
        <HomeV2PhotoViewer
          eyebrow={copy.eyebrow}
          title={items[lightbox]?.title ?? item.title}
          photos={items.map((photo) => ({ src: photo.src, alt: photo.alt }))}
          initialIndex={lightbox}
          previewSizes="(min-width: 1024px) 68vw, 100vw"
          onClose={() => setLightbox(null)}
          cta={{
            href: KIT_PLANS_SECTION_HREF,
            label: copy.ctaAcquire,
            onClick: trackKitCtaClick,
          }}
        />
      ) : null}
    </section>
  );
}

function PlanComparison() {
  const plans = kitItemsByCategory('planos');
  return (
    <div>
      <div className="max-w-2xl">
        <h3 className="home-v2-display text-balance text-[28px] leading-[0.95] text-mesa-parchment md:text-[40px]">
          {copy.comparisonTitle}
        </h3>
        <p className="mt-3 text-pretty text-base leading-relaxed text-mesa-ash">{copy.comparisonSupport}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-mesa-ash md:hidden">Deslize para comparar</p>
      </div>
      <ol className="home-v2-snap -mx-4 mt-6 flex gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] md:mx-0 md:mt-8 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
        {plans.map((plan, planIndex) => {
          const planId = plan.plan;
          return (
          <li
            key={plan.id}
            className="group flex w-[82%] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-mesa-stone sm:w-[60%] md:w-auto md:rounded-3xl shadow-2xl shadow-black/25 transition-[transform,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-white/25"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-mesa-ink">
              <Image
                src={plan.src}
                alt={plan.alt}
                fill
                sizes="(min-width: 768px) 30vw, 100vw"
                className="home-v2-media-zoom object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                style={{ objectPosition: plan.position ?? 'center' }}
              />
              <p className="home-v2-display pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-mesa-parchment px-3 py-1.5 text-[11px] tracking-[0.16em] text-mesa-ink shadow-lg shadow-black/30">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-mesa-ember" />
                {plan.badge}
              </p>
            </div>
            <div className="flex flex-1 flex-col px-5 pb-6 pt-5">
              <span className="home-v2-display text-xs tracking-[0.16em] text-mesa-jade">
                {String(planIndex + 1).padStart(2, '0')}
              </span>
              <h4 className="home-v2-display mt-2 text-2xl leading-none text-mesa-parchment">{plan.title}</h4>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-mesa-ash">{plan.description}</p>
              {plan.cta && planId ? (
                <div className="pt-5">
                  <HomeV2Button
                    href={KIT_PLANS_SECTION_HREF}
                    size="lg"
                    arrow
                    className="w-full"
                    onClick={() => trackKitPlanClick(planId)}
                  >
                    {plan.cta.label}
                  </HomeV2Button>
                </div>
              ) : null}
            </div>
          </li>
          );
        })}
      </ol>
    </div>
  );
}
