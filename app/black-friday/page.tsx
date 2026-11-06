import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Box, ChevronDown, Dices, Layers3, Map, ScrollText, Sparkles } from 'lucide-react';
import { checkoutHref, getCheckoutPlan } from '@/lib/checkout/plans';
import { faqItems } from '@/lib/data';
import { SUBSCRIPTION_PRODUCTION_NOTE } from '@/lib/production/lead-time';
import { buildOpenGraph, buildTwitterCard, campaignPageRobots } from '@/lib/seo/metadata';
import { absoluteUrl } from '@/lib/seo/site';
import { BLACK_FRIDAY_END, BLACK_FRIDAY_START, getBlackFridayPhase } from './campaign';
import Countdown from './countdown';
import styles from './black-friday.module.css';

export const dynamic = 'force-dynamic';

const path = '/black-friday';
const title = 'Black Friday DungeonBox | Plano Lendário';
const description = 'Conheça a assinatura Lendário da DungeonBox e a edição Black Friday para novos assinantes.';
const tablePhoto = '/images/home-v2/mesa-montada-3.png';

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

const plan = getCheckoutPlan('lendario');
const price = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
}).format(plan.price);
const kitHighlights = [
  { icon: Layers3, title: `Cerca de ${plan.pieceCount} peças`, description: 'Pisos, paredes, decoração e clips OpenLOCK. A quantidade varia conforme o tema.' },
  { icon: Dices, title: '3 miniaturas', description: 'Personagens para colocar em cena junto com o cenário da sua primeira mesa.' },
  { icon: Box, title: 'Uma caixa por mês', description: 'Expanda o cenário a cada entrega. As peças modulares encaixam entre os kits.' },
];
const kitQuestions = faqItems.filter(({ q }) =>
  [
    'Posso cancelar quando quiser?',
    'Quanto tempo demora para chegar?',
    'As peças vêm pintadas?',
    'Como funciona o frete?',
  ].includes(q)
);

export default function BlackFridayPage() {
  const now = Date.now();
  const bonusReady = process.env.BLACK_FRIDAY_BONUS_READY === 'true';
  const phase = getBlackFridayPhase(now, bonusReady);
  const active = phase === 'active';
  const showBonus = active || (phase === 'upcoming' && bonusReady);
  const checkout = checkoutHref('lendario');
  const heroHref = active ? checkout : '#oferta';
  const heroAction = active ? 'Assinar o Lendário' : 'Conhecer o Lendário';
  const HeroArrow = active ? ArrowRight : ArrowDown;

  return (
    <div className={styles.page}>
      <header className={`${styles.shell} ${styles.header}`}>
        <Link href="/" className={styles.logo} aria-label="DungeonBox, página inicial">
          <Image src="/images/dungeonbox.png" alt="" width={486} height={176} />
        </Link>
        <a href="#kit" className={styles.headerLink}>O que vem no kit <ArrowDown size={15} aria-hidden="true" /></a>
      </header>

      <main id="conteudo">
        <section className={`${styles.shell} ${styles.hero}`} aria-labelledby="titulo-black">
          <div className={styles.heroCopy}>
            <p className={styles.badge}><span /> Black Friday DungeonBox</p>
            <h1 id="titulo-black">Sua mesa vai ficar <em>lendária.</em></h1>
            <p className={styles.intro}>
              Monte sua próxima dungeon com pisos, paredes, decoração e miniaturas de verdade.
              O cenário cresce a cada caixa do <strong>Plano Lendário</strong>.
            </p>
            <div className={styles.price}><strong>{price}</strong><span>/mês + frete</span></div>
            {showBonus && <p className={styles.heroBonus}><Sparkles size={17} aria-hidden="true" /> Bônus Encontro de Estreia na primeira assinatura</p>}
            <Link href={heroHref} className={styles.cta}>{heroAction}<HeroArrow size={19} aria-hidden="true" /></Link>
            <p className={styles.small}>Assinatura mensal · Cancele quando quiser</p>
          </div>
          <figure className={styles.heroVisual}>
            <Image
              src={tablePhoto}
              alt="Miniaturas de aventureiros entre pisos e paredes modulares de pedra cinza"
              fill
              priority
              sizes="(max-width: 800px) 100vw, 55vw"
              className={styles.heroImage}
            />
            <figcaption><span>Em mesa</span> Exemplo de montagem</figcaption>
          </figure>
        </section>

        <section className={`${styles.shell} ${styles.window}`} aria-label="Calendário da Black Friday">
          <div>
            <p className={styles.eyebrow}>{active ? 'Oferta no ar' : 'Black Friday 2026'}</p>
            <p className={styles.windowDate}>27 a 30 de novembro</p>
            <p className={styles.small}>Horário de Brasília</p>
          </div>
          {showBonus && (
            <Countdown
              key={phase}
              initialNow={now}
              target={active ? BLACK_FRIDAY_END : BLACK_FRIDAY_START}
              label={active ? 'A oferta termina em' : 'A oferta começa em'}
            />
          )}
          {phase === 'upcoming' && !bonusReady && <p className={styles.status}>A oferta será divulgada aqui.</p>}
          {phase === 'unavailable' && <p className={styles.status}>Oferta indisponível no momento.</p>}
          {phase === 'closed' && <p className={styles.status}>A campanha terminou.</p>}
        </section>

        <section id="kit" className={`${styles.shell} ${styles.kit}`} aria-labelledby="titulo-kit">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Da caixa à mesa</p>
            <h2 id="titulo-kit">O que vem no Lendário</h2>
            <p>A primeira caixa começa nas <strong>Ruínas Perdidas</strong>, o Kit 1 da DungeonBox.</p>
          </div>
          <div className={styles.highlights}>
            {kitHighlights.map(({ icon: Icon, title, description }) => (
              <div key={title} className={styles.highlight}>
                <Icon size={25} strokeWidth={1.6} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
          <div className={styles.gallery}>
            <figure>
              <Image src="/images/home-v2/kits/dungeonbox-unboxing-lendario.webp" alt="Caixa DungeonBox aberta com as peças à frente" width={1120} height={430} sizes="(max-width: 800px) 100vw, 65vw" />
              <figcaption>Peças em cinza pedra, prontas para jogar ou pintar.</figcaption>
            </figure>
            <figure>
              <Image src="/images/home-v2/kits/dungeonbox-openlock-encaixe.webp" alt="Detalhe dos pisos e das paredes modulares encaixados" width={640} height={480} sizes="(max-width: 800px) 100vw, 35vw" />
              <figcaption>Detalhe do sistema OpenLOCK.</figcaption>
            </figure>
          </div>
        </section>

        <section id="oferta" className={`${styles.shell} ${styles.offerSection}`} aria-labelledby="titulo-oferta">
          <div className={styles.offer}>
            <div className={styles.offerCopy}>
              <p className={styles.eyebrow}>{showBonus ? 'Bônus da Black Friday' : 'Assinatura mensal'}</p>
              <h2 id="titulo-oferta">{showBonus ? 'Encontro de Estreia' : 'Comece pelo Lendário'}</h2>
              {showBonus ? (
                <>
                  <p>Uma sessão pronta para colocar suas primeiras peças em jogo.</p>
                  <ul className={styles.bonusList}>
                    <li><ScrollText size={21} aria-hidden="true" /> Aventura curta em PDF para narrar na primeira sessão.</li>
                    <li><Map size={21} aria-hidden="true" /> Mapa com sugestão de montagem usando o Kit 1.</li>
                  </ul>
                  <p className={styles.offerTerms}>Bônus digital para a primeira assinatura paga do Lendário feita pelo site durante a campanha. Um por assinante.</p>
                </>
              ) : (
                <p>Comece nas Ruínas Perdidas e use as próximas caixas para ampliar a sua dungeon.</p>
              )}
            </div>
            <div className={styles.order}>
              <span className={styles.eyebrow}>Plano Lendário</span>
              <div className={styles.price}><strong>{price}</strong><span>/mês</span></div>
              <p>Frete calculado por CEP no checkout.</p>
              <Link href={checkout} className={styles.cta}>
                {active ? 'Assinar o Lendário' : 'Assinar pelo site'}
                <ArrowRight size={19} aria-hidden="true" />
              </Link>
              {showBonus && !active && <p className={styles.small}>O bônus estará disponível a partir de 27/11.</p>}
              <p className={styles.small}>{SUBSCRIPTION_PRODUCTION_NOTE}</p>
            </div>
          </div>
        </section>

        <section className={`${styles.shell} ${styles.faq}`} aria-labelledby="titulo-faq">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Antes de assinar</p>
            <h2 id="titulo-faq">Perguntas frequentes</h2>
          </div>
          <div>
            {kitQuestions.map(({ q, a }) => (
              <details key={q}>
                <summary>{q}<ChevronDown size={19} aria-hidden="true" /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className={`${styles.shell} ${styles.footer}`}>
        <Link href="/" className={styles.logo} aria-label="DungeonBox, página inicial">
          <Image src="/images/dungeonbox.png" alt="" width={486} height={176} />
        </Link>
        <nav aria-label="Links institucionais">
          <Link href="/termos">Termos de uso</Link>
          <Link href="/privacidade">Privacidade</Link>
        </nav>
      </footer>
    </div>
  );
}
