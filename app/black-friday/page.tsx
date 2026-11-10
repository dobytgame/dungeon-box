import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, Hammer, Map, MessageCircle, Plus, ScrollText, ShieldCheck, Truck } from 'lucide-react';
import HomeV2Footer from '@/components/home-v2/HomeV2Footer';
import { checkoutHref, getCheckoutPlan } from '@/lib/checkout/plans';
import { faqItems } from '@/lib/data';
import { COMPANY } from '@/lib/legal/constants';
import { SUBSCRIPTION_PRODUCTION_NOTE } from '@/lib/production/lead-time';
import { buildOpenGraph, buildTwitterCard, campaignPageRobots } from '@/lib/seo/metadata';
import { absoluteUrl } from '@/lib/seo/site';
import {
  BF_COMBO_DISCOUNT_PERCENT,
  BF_MAX_INSTALLMENTS,
  BF_MONTHLY_DISCOUNT_CYCLES,
  BF_MONTHLY_DISCOUNT_PERCENT,
  bfComboListCents,
  bfComboTotalCents,
  bfMonthlyPromoPlanCents,
  blackFridayCheckoutHref,
  formatCents,
  formatRatePercent,
} from '@/lib/campaigns/black-friday';
import { BLACK_FRIDAY_END, BLACK_FRIDAY_START, getBlackFridayWindow } from './campaign';
import Countdown from './countdown';
import HeroGallery, { type HeroSlide } from './hero-gallery';
import OfferPicker, { type PickerOffer } from './offer-picker';
import PrintReveal from './print-reveal';
import StickyCta from './sticky-cta';
import '@/app/home-v2/home-v2.css';
import styles from './black-friday.module.css';

export const dynamic = 'force-dynamic';

const path = '/black-friday';
const title = 'Black Friday DungeonBox | Plano Lendário';
const description = 'Black Friday DungeonBox: Plano Lendário com 8% off nos 3 primeiros meses ou 15% off no combo de 3 meses, para novos assinantes.';
const tablePhoto = '/images/img-dungeon-box-black/1.png';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: absoluteUrl(path) },
  robots: campaignPageRobots,
  openGraph: {
    ...buildOpenGraph({ title, description, path }),
    images: [{ url: absoluteUrl(tablePhoto), width: 1920, height: 1080, alt: 'Mesa de RPG montada com peças DungeonBox' }],
  },
  twitter: { ...buildTwitterCard({ title, description }), images: [absoluteUrl(tablePhoto)] },
};

export const viewport: Viewport = {
  themeColor: '#0b0807',
  viewportFit: 'cover',
};

const plan = getCheckoutPlan('lendario');
const price = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
}).format(plan.price);

const planCents = Math.round(plan.price * 100);
const monthlyPromo = formatCents(bfMonthlyPromoPlanCents(planCents));
const comboListCents = bfComboListCents(planCents, 0);
const comboPromoCents = bfComboTotalCents(planCents, 0);
const checkoutMensal = blackFridayCheckoutHref('mensal', 'oferta');
const checkoutCombo = blackFridayCheckoutHref('combo', 'oferta');

const stats = [
  { value: String(plan.pieceCount), unit: 'peças', note: 'pisos, paredes, decoração e clips' },
  { value: '3', unit: 'miniaturas', note: 'guerreiro, mago e esqueleto' },
  { value: '5–6', unit: 'salas', note: 'por caixa, com decoração premium' },
  { value: '70×80', unit: 'cm de mesa', note: 'cenário para campanha completa' },
];

const gallery = [
  { src: '/images/home-v2/kits/dungeonbox-unboxing-lendario.webp', alt: 'Caixa DungeonBox aberta com as peças à frente', caption: 'Peças em cinza pedra, prontas para jogar ou pintar.', width: 1120, height: 430 },
  { src: '/images/home-v2/kits/f1-sala.webp', alt: 'Sala de dungeon montada com portão, baú, pilares e corredores modulares', caption: 'Salas completas, montadas em minutos.', width: 1080, height: 500 },
  { src: '/images/home-v2/kits/dungeonbox-openlock-encaixe.webp', alt: 'Detalhe dos pisos e das paredes modulares encaixados', caption: 'Encaixe OpenLOCK entre todos os kits.', width: 640, height: 480 },
];

const heroSlides: HeroSlide[] = [
  {
    src: '/images/img-dungeon-box-black/1.png',
    alt: 'Cenário montado com pisos e paredes modulares em pedra cinza, com caixa DungeonBox ao fundo',
    label: 'Em mesa',
    caption: 'Montagem com a caixa ao fundo',
  },
  {
    src: '/images/img-dungeon-box-black/2.png',
    alt: 'Layout de dungeon com paredes, portões, baús e detalhes de pedra em cinza, com placa da marca DungeonBox',
    label: 'Lendário',
    caption: 'Kit e identidade na mesa',
  },
  {
    src: '/images/img-dungeon-box-black/3.png',
    alt: 'Vista em ângulo de salas e corredores modulares com portas de grades, baús e textura de pedra',
    label: 'Salas',
    caption: 'Portões, corredores e decoração',
  },
  {
    src: '/images/img-dungeon-box-black/4.png',
    alt: 'Miniaturas e monstros em cena sobre pisos com lava impressa e caixa preta DungeonBox ao fundo',
    label: 'Ação',
    caption: 'Miniaturas e pisos com lava',
  },
  {
    src: '/images/img-dungeon-box-black/6.png',
    alt: 'Caverna modular em pedra sobre base de corte com grade, com dados coloridos ao lado',
    label: 'Sessão',
    caption: 'Na mesa de hobby, com escala',
  },
  {
    src: '/images/img-dungeon-box-black/7.png',
    alt: 'Vista de cima de caverna com várias salas ligadas por corredores sobre grid',
    label: 'Vista',
    caption: 'Salas e túneis encaixados',
  },
];

const heroVideo = {
  src: '/images/img-dungeon-box-black/video-dungeon.mp4',
  poster: '/images/img-dungeon-box-black/2.png',
  title: 'DungeonBox em vídeo',
  durationSeconds: 57,
};

const kitQuestions = faqItems.filter(({ q }) =>
  [
    'Posso cancelar quando quiser?',
    'Quanto tempo demora para chegar?',
    'As peças vêm pintadas?',
    'Como funciona o frete?',
  ].includes(q)
).map((item) => ({ ...item, campaign: false }));

const campaignQuestions = [
  {
    q: 'Até quando vale a Black Friday?',
    a: 'Durante todo o mês de novembro de 2026, até 30/11 às 23h59 (horário de Brasília).',
    campaign: true,
  },
  {
    q: 'Como funciona o desconto?',
    a: `No mensal, o Plano Lendário sai com ${BF_MONTHLY_DISCOUNT_PERCENT}% de desconto nas ${BF_MONTHLY_DISCOUNT_CYCLES} primeiras mensalidades (frete à parte) e depois volta ao valor normal. No combo de 3 meses, você paga as 3 caixas de uma vez com ${BF_COMBO_DISCOUNT_PERCENT}% de desconto; a renovação segue no preço regular do combo. Vale para quem ainda não assina o Lendário.`,
    campaign: true,
  },
  {
    q: 'Posso parcelar o combo?',
    a: `Sim, em até ${BF_MAX_INSTALLMENTS}x no cartão. À vista sai sem juros; a partir de 2x há juros de ${formatRatePercent()} ao mês, e o checkout mostra o valor de cada parcela e o total antes de você pagar.`,
    campaign: true,
  },
  {
    q: 'O que vem no Encontro de Estreia?',
    a: 'Uma aventura curta em PDF para narrar na primeira sessão e um mapa com sugestão de montagem usando o Kit 1. O bônus é digital, vale para a primeira assinatura paga do Lendário feita pelo site durante a campanha e é limitado a um por assinante.',
    campaign: true,
  },
];

const tapeTop = ['Black Friday', `−${BF_COMBO_DISCOUNT_PERCENT}% no combo`, `−${BF_MONTHLY_DISCOUNT_PERCENT}% no mensal`, 'Novembro inteiro'];
const tapeBottom = ['Encontro de Estreia', '132 peças', '3 miniaturas', 'Kit 1 · Ruínas Perdidas'];

/** Posições fixas para as brasas: renderização idêntica no servidor e no cliente. */
const embers = Array.from({ length: 10 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  size: `${3 + (i % 3)}px`,
  duration: `${7 + (i % 4) * 1.5}s`,
  delay: `${-(i * 1.1).toFixed(1)}s`,
  drift: `${(i % 2 ? 1 : -1) * (14 + (i % 3) * 10)}px`,
}));

function Tape({ items, variant }: { items: string[]; variant: 'fire' | 'hazard' }) {
  const group = [...items, ...items];
  return (
    <div className={`${styles.tape} ${variant === 'fire' ? styles.tapeFire : styles.tapeHazard}`}>
      <div className={styles.tapeTrack}>
        {[0, 1].map((copy) => (
          <span key={copy} className={styles.tapeGroup}>
            {group.map((item, i) => (
              <span key={`${item}-${i}`}>
                {item}
                <i />
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function BlackFridayPage() {
  const now = Date.now();
  const bonusReady = process.env.BLACK_FRIDAY_BONUS_READY === 'true';
  const offerWindow = getBlackFridayWindow(now);
  const open = offerWindow === 'open';
  const promoLive = offerWindow !== 'closed';
  const showBonus = bonusReady && promoLive;
  const checkout = checkoutHref('lendario');
  const heroHref = open
    ? blackFridayCheckoutHref('combo', 'hero')
    : promoLive
      ? '#oferta'
      : checkout;
  const heroAction = open ? `Combo 3 meses −${BF_COMBO_DISCOUNT_PERCENT}%` : promoLive ? 'Ver a oferta' : 'Assinar o Lendário';
  const HeroArrow = heroHref === '#oferta' ? ArrowDown : ArrowRight;
  const countdownTarget = open ? BLACK_FRIDAY_END : BLACK_FRIDAY_START;
  const countdownLabel = open ? 'A oferta termina em' : 'A oferta começa em';
  const pickerOffers: PickerOffer[] = [
    {
      id: 'combo',
      name: 'Combo 3 meses',
      off: `−${BF_COMBO_DISCOUNT_PERCENT}%`,
      badge: 'Maior desconto',
      lines: [
        { label: '3 caixas Lendário', value: formatCents(comboListCents), strike: true },
        { label: `Black −${BF_COMBO_DISCOUNT_PERCENT}%`, value: `−${formatCents(comboListCents - comboPromoCents)}`, highlight: true },
        ...(showBonus ? [{ label: 'Bônus Encontro de Estreia', value: 'grátis' }] : []),
        { label: 'Frete', value: '3 envios · por CEP' },
      ],
      totalLabel: 'À vista',
      total: formatCents(comboPromoCents),
      totalNote: '+ frete',
      fine: `Pago de uma vez. Ou em até ${BF_MAX_INSTALLMENTS}x no cartão, com juros de ${formatRatePercent()} ao mês a partir de 2x.`,
      href: open ? checkoutCombo : null,
      cta: 'Assinar o combo',
    },
    {
      id: 'mensal',
      name: 'Mensal',
      off: `−${BF_MONTHLY_DISCOUNT_PERCENT}% por ${BF_MONTHLY_DISCOUNT_CYCLES} meses`,
      lines: [
        { label: 'Plano Lendário', value: formatCents(planCents), strike: true },
        { label: `Black −${BF_MONTHLY_DISCOUNT_PERCENT}%`, value: `−${formatCents(planCents - bfMonthlyPromoPlanCents(planCents))}`, highlight: true },
        ...(showBonus ? [{ label: 'Bônus Encontro de Estreia', value: 'grátis' }] : []),
        { label: 'Frete', value: 'por CEP' },
      ],
      totalLabel: 'Por mês',
      total: monthlyPromo,
      totalNote: '+ frete',
      fine: `Nos ${BF_MONTHLY_DISCOUNT_CYCLES} primeiros meses. Do ${BF_MONTHLY_DISCOUNT_CYCLES + 1}º em diante, ${price}/mês + frete. Cancele quando quiser.`,
      href: open ? checkoutMensal : null,
      cta: 'Assinar o mensal',
    },
  ];
  const faqList = [
    ...(promoLive ? campaignQuestions.filter(({ q }) => bonusReady || !q.includes('Encontro de Estreia')) : []),
    ...kitQuestions,
  ];

  return (
    <div className={styles.page}>
      <div className={styles.promoBar}>
        <span className={styles.promoTag}>BF 2026</span>
        <p>
          <strong>Black Friday</strong> · novembro inteiro · até {BF_COMBO_DISCOUNT_PERCENT}% OFF no Lendário
        </p>
        <a href="#oferta" className={styles.promoLink}>
          Ver <ArrowRight size={14} aria-hidden="true" />
        </a>
      </div>

      <header className={`${styles.shell} ${styles.header}`}>
        <Link href="/" className={styles.logo} aria-label="DungeonBox, página inicial">
          <Image src="/images/dungeonbox.png" alt="" width={486} height={176} priority />
        </Link>
        <a href="#kit" className={styles.headerLink}>
          O que vem no kit <ArrowDown size={15} aria-hidden="true" />
        </a>
      </header>

      <main id="conteudo">
        <section className={styles.hero} aria-labelledby="titulo-black">
          <div className={styles.outlineRows} aria-hidden="true">
            {[0, 1].map((row) => (
              <div key={row} className={styles.outlineRow}>
                <span>Black Friday ✦ Lendário ✦ Black Friday ✦ Lendário ✦&nbsp;</span>
                <span>Black Friday ✦ Lendário ✦ Black Friday ✦ Lendário ✦&nbsp;</span>
              </div>
            ))}
          </div>
          <div className={styles.embers} aria-hidden="true">
            {embers.map((ember, i) => (
              <span
                key={i}
                style={{
                  '--left': ember.left,
                  '--size': ember.size,
                  '--duration': ember.duration,
                  '--delay': ember.delay,
                  '--drift': ember.drift,
                } as React.CSSProperties}
              />
            ))}
          </div>

          <div className={`${styles.shell} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <a href="#kit" className={styles.spinBadge} aria-label="Ver o que vem no kit">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <defs>
                    <path id="bf-spin-path" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
                  </defs>
                  <text>
                    <textPath href="#bf-spin-path">VEJA O QUE VEM NO KIT ✦ BLACK FRIDAY ✦</textPath>
                  </text>
                </svg>
                <ArrowDown size={24} aria-hidden="true" />
              </a>

              <h1 id="titulo-black" className={styles.heroTitle}>
                <span className={`${styles.sticker} ${styles.stickerBlack}`}>Black</span>
                <span className={`${styles.sticker} ${styles.stickerFriday}`}>Friday</span>
                <span className={styles.heroLine}>
                  Sua mesa vai ficar <em>lendária.</em>
                </span>
              </h1>

              <p className={styles.intro}>
                Pisos, paredes, decoração e miniaturas de verdade. O cenário cresce a cada caixa do{' '}
                <strong>Plano Lendário</strong>.
              </p>

              <div className={styles.heroBuy}>
                {promoLive ? (
                  <div className={styles.heroPriceCombo}>
                    <p className={styles.heroPriceEyebrow}>
                      Combo 3 meses · <em>−{BF_COMBO_DISCOUNT_PERCENT}%</em>
                    </p>
                    <div className={styles.price}>
                      <s>{formatCents(comboListCents)}</s>
                      <strong>{formatCents(comboPromoCents)}</strong>
                      <span>à vista + frete das 3 caixas</span>
                    </div>
                    <p className={styles.heroPriceAlt}>
                      Ou mensal com <strong>−{BF_MONTHLY_DISCOUNT_PERCENT}%</strong> nos{' '}
                      {BF_MONTHLY_DISCOUNT_CYCLES} primeiros meses ({monthlyPromo}/mês + frete).
                    </p>
                  </div>
                ) : (
                  <div className={styles.price}>
                    <strong>{price}</strong>
                    <span>/mês + frete</span>
                  </div>
                )}
                <Link id="hero-cta" href={heroHref} className={styles.cta}>
                  <span>{heroAction}</span>
                  <HeroArrow size={20} aria-hidden="true" />
                </Link>
              </div>
              <ul className={styles.trust}>
                <li><ShieldCheck size={15} aria-hidden="true" /> Cancele quando quiser</li>
                <li><Truck size={15} aria-hidden="true" /> Frete por CEP</li>
              </ul>
            </div>

            <HeroGallery
              slides={heroSlides}
              video={heroVideo}
              tag={
                <div className={styles.hangTag} aria-hidden="true">
                  <span className={styles.hangString} />
                  <span className={styles.hangCard}>
                    {showBonus ? (
                      <>
                        <small>Bônus</small>
                        <strong>Estreia</strong>
                        <small>na 1ª caixa</small>
                      </>
                    ) : (
                      <>
                        <small>Kit</small>
                        <strong>Lendário</strong>
                      </>
                    )}
                  </span>
                </div>
              }
            />
          </div>
        </section>

        <div className={styles.tapes} aria-hidden="true">
          <Tape items={tapeTop} variant="fire" />
          <Tape items={tapeBottom} variant="hazard" />
        </div>

        <section className={`${styles.shell} ${styles.window}`} aria-label="Calendário da Black Friday">
          <div>
            <p className={styles.windowEyebrow}>{open ? 'Oferta no ar' : 'Black Friday 2026'}</p>
            <p className={styles.windowDate}>Novembro inteiro</p>
            <p className={styles.windowNote}>Até 30/11, 23h59 · horário de Brasília</p>
          </div>
          {promoLive ? (
            <Countdown key={offerWindow} initialNow={now} target={countdownTarget} label={countdownLabel} />
          ) : (
            <p className={styles.status}>A campanha terminou.</p>
          )}
        </section>

        <section id="kit" className={`${styles.shell} ${styles.kit}`} aria-labelledby="titulo-kit">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Da caixa à mesa</p>
            <h2 id="titulo-kit">O que vem no Lendário</h2>
            <p>
              A primeira caixa começa nas <strong>Ruínas Perdidas</strong>, o Kit 1 da DungeonBox.
            </p>
          </div>

          <dl className={styles.stats}>
            {stats.map(({ value, unit, note }) => (
              <div key={unit} className={styles.stat}>
                <dt>
                  <span className={styles.statValue}>{value}</span>
                  <span className={styles.statUnit}>{unit}</span>
                </dt>
                <dd>{note}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.small}>Quantidades aproximadas por kit; podem variar conforme o tema do mês.</p>

          <div className={styles.gallery} role="list" aria-label="Fotos do kit">
            {gallery.map((photo) => (
              <figure key={photo.src} role="listitem" className={styles.polaroid}>
                <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(max-width: 900px) 80vw, 33vw" />
                <figcaption>{photo.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="oferta" className={`${styles.shell} ${styles.offerSection}`} aria-labelledby="titulo-oferta">
          <div className={styles.offerCopy}>
            <p className={styles.eyebrow}>{promoLive ? 'Black Friday · Plano Lendário' : 'Assinatura mensal'}</p>
            <h2 id="titulo-oferta">
              {promoLive ? (
                <>Sua estreia <em>lendária</em></>
              ) : (
                <>Comece pelo <em>Lendário</em></>
              )}
            </h2>
            <p>Comece nas Ruínas Perdidas e use as próximas caixas para ampliar a sua dungeon.</p>

            {showBonus && (
              <div className={styles.bonusCard}>
                <p className={styles.bonusCardTitle}>
                  <span>Bônus</span> Encontro de Estreia
                </p>
                <ul className={styles.bonusList}>
                  <li>
                    <span className={styles.bonusIcon}><ScrollText size={20} aria-hidden="true" /></span>
                    Aventura curta em PDF para narrar na primeira sessão.
                  </li>
                  <li>
                    <span className={styles.bonusIcon}><Map size={20} aria-hidden="true" /></span>
                    Mapa com sugestão de montagem usando o Kit 1.
                  </li>
                </ul>
                <p className={styles.bonusTerms}>
                  Bônus digital para a primeira assinatura paga do Lendário feita pelo site durante a campanha. Um por assinante.
                </p>
              </div>
            )}

            <p className={styles.perksTitle}>Em toda assinatura Lendário</p>
            <ol className={styles.perks}>
              {plan.perks.map((perk, i) => (
                <li key={perk}>
                  <span className={styles.perkNum}>{String(i + 1).padStart(2, '0')}</span>
                  {perk}
                </li>
              ))}
            </ol>

            <ul className={styles.offerTrust}>
              <li><ShieldCheck size={16} aria-hidden="true" /> Cancele quando quiser</li>
              <li><Truck size={16} aria-hidden="true" /> Frete por CEP</li>
              <li><Hammer size={16} aria-hidden="true" /> Produção sob demanda</li>
            </ul>
          </div>

          <div id="oferta-card" className={styles.printer}>
            <div className={styles.printerSlot} aria-hidden="true" />
            <PrintReveal className={styles.receiptClip}>
              <div className={styles.receipt}>
                <span className={styles.stamp} aria-hidden="true">
                  <small>Edição</small>
                  Black Friday
                  <small>2026</small>
                </span>
                <p className={styles.receiptBrand}>✦ DungeonBox ✦</p>
                <p className={styles.receiptTitle}>Cupom da mesa</p>
                <p className={`${styles.receiptMeta} ${promoLive ? '' : styles.receiptMetaSolo}`}>
                  Black Friday 2026 · válido até 30/11
                </p>
                {promoLive && (
                  <p className={styles.receiptElegibilidade}>Oferta exclusiva para novos assinantes do Lendário</p>
                )}

                {promoLive ? (
                  <OfferPicker offers={pickerOffers} defaultSelectedId="combo" />
                ) : (
                  <>
                    <dl className={styles.receiptLines}>
                      <div>
                        <dt>Plano Lendário</dt>
                        <dd>{price}/mês</dd>
                      </div>
                      <div>
                        <dt>Kit 1 · Ruínas Perdidas</dt>
                        <dd>incluso</dd>
                      </div>
                      <div>
                        <dt>{plan.pieceCount} peças + 3 miniaturas</dt>
                        <dd>incluso</dd>
                      </div>
                      <div>
                        <dt>Frete</dt>
                        <dd>por CEP</dd>
                      </div>
                    </dl>

                    <div className={styles.receiptTotal}>
                      <span>Total mensal</span>
                      <strong>
                        {price}
                        <small>+ frete</small>
                      </strong>
                    </div>

                    <Link href={checkout} className={`${styles.cta} ${styles.receiptCta}`}>
                      <span>Assinar pelo site</span>
                      <ArrowRight size={20} aria-hidden="true" />
                    </Link>
                  </>
                )}
                <p className={styles.receiptFine}>{SUBSCRIPTION_PRODUCTION_NOTE}</p>
                <span className={styles.barcode} aria-hidden="true" />
              </div>
            </PrintReveal>
          </div>
        </section>

        <section className={`${styles.shell} ${styles.faq}`} aria-labelledby="titulo-faq">
          <div className={styles.faqHead}>
            <span className={styles.faqGlyph} aria-hidden="true">?</span>
            <p className={styles.eyebrow}>Antes de assinar</p>
            <h2 id="titulo-faq">
              Perguntas <em>frequentes</em>
            </h2>
            <p className={styles.faqLead}>Tudo o que você precisa saber antes de montar a primeira dungeon.</p>
            <a className={styles.faqHelp} href={COMPANY.whatsappUrl} target="_blank" rel="noopener noreferrer">
              <span className={styles.faqHelpIcon}><MessageCircle size={20} aria-hidden="true" /></span>
              <span>
                <small>Ainda com dúvida?</small>
                Fale no WhatsApp
              </span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
          <div className={styles.faqList}>
            {faqList.map(({ q, a, campaign }, i) => (
              <details key={q} className={styles.faqItem} name="faq-black-friday">
                <summary>
                  <span className={styles.faqNum}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.faqQ}>
                    {campaign && <span className={styles.faqTag}>Black Friday</span>}
                    {q}
                  </span>
                  <span className={styles.faqToggle} aria-hidden="true">
                    <Plus size={18} />
                  </span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <div className={`home-v2 ${styles.footerWrap}`}>
        <HomeV2Footer
          context="shop"
          ctaHref={open ? blackFridayCheckoutHref('combo', 'footer') : checkout}
          ctaLabel="Assinar o Lendário"
        />
      </div>

      <StickyCta
        href={open ? '#oferta-card' : promoLive ? '#oferta' : checkout}
        label={open ? 'Combo −15%' : promoLive ? 'Ver oferta' : 'Assinar'}
        price={promoLive ? formatCents(comboPromoCents) : price}
        priceUnit={promoLive ? '+ frete' : '/mês'}
      >
        {promoLive ? (
          <Countdown key={`sticky-${offerWindow}`} initialNow={now} target={countdownTarget} label={countdownLabel} compact />
        ) : (
          <span className={styles.stickyNote}>Plano Lendário</span>
        )}
      </StickyCta>
    </div>
  );
}
