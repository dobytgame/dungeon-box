'use client';

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ChevronDown, Hexagon, Lock, Users } from 'lucide-react';
import Image from 'next/image';
import { useRef } from 'react';
import {
  CoinIcon,
  D20Icon,
  PotionIcon,
  ScrollIcon,
  SwordIcon,
} from '@/components/hero/RpgIcons';
import CTAButton from '@/components/ui/CTAButton';
import GlowOrb from '@/components/ui/GlowOrb';
import ParallaxFloat from '@/components/ui/ParallaxFloat';
import { WHATSAPP_GUILD_URL } from '@/lib/launch/constants';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const mouseSpring = { stiffness: 90, damping: 30, mass: 0.5 };

const compatibilityChips = [
  'OpenLOCK',
  'Escala 28mm',
  'D&D · Tormenta · Pathfinder',
] as const;

interface LaunchHeroProps {
  waitlistCount?: number;
}

export default function LaunchHero({ waitlistCount = 0 }: LaunchHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const imageScrollY = useTransform(scrollYProgress, [0, 1], [0, 48]);

  const imageParallaxX = useSpring(
    useTransform(mouseX, (v) => (reduced ? 0 : v * 10)),
    mouseSpring,
  );
  const imageParallaxY = useSpring(
    useTransform(mouseY, (v) => (reduced ? 0 : v * 8)),
    mouseSpring,
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const showWaitlist = waitlistCount > 0;

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[100dvh] overflow-hidden bg-stone-950 bg-grid noise"
      aria-labelledby="launch-hero-title"
    >
      <div
        className="hero-image-spotlight pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[min(42vw,28rem)] bg-gradient-to-r from-stone-950 via-stone-950/80 to-transparent"
        aria-hidden="true"
      />
      <GlowOrb
        color="frost"
        size="lg"
        position="-top-20 left-1/2 -translate-x-1/2"
      />
      <GlowOrb
        color="ember"
        size="md"
        position="bottom-0 right-0 translate-x-1/4"
      />

      <ParallaxFloat
        sectionRef={sectionRef}
        mouseX={mouseX}
        mouseY={mouseY}
        className="left-[4%] top-[22%] hidden opacity-50 md:block"
        scrollSpeed={0.35}
        depth={0.9}
        floatDuration={6}
        floatDistance={14}
        initialRotate={-18}
      >
        <D20Icon variant="frost" className="h-14 w-14 lg:h-16 lg:w-16" />
      </ParallaxFloat>

      <ParallaxFloat
        sectionRef={sectionRef}
        mouseX={mouseX}
        mouseY={mouseY}
        className="left-[10%] bottom-[30%] hidden opacity-35 lg:block"
        scrollSpeed={0.5}
        depth={0.35}
        floatDuration={7}
        floatDistance={8}
        delay={1.2}
        initialRotate={12}
      >
        <SwordIcon className="h-16 w-8" />
      </ParallaxFloat>

      <ParallaxFloat
        sectionRef={sectionRef}
        mouseX={mouseX}
        mouseY={mouseY}
        className="right-[5%] top-[16%] hidden opacity-60 md:block"
        scrollSpeed={0.2}
        depth={0.7}
        floatDuration={5.5}
        floatDistance={12}
        delay={0.4}
        initialRotate={22}
      >
        <CoinIcon className="h-12 w-12 lg:h-14 lg:w-14" />
      </ParallaxFloat>

      <ParallaxFloat
        sectionRef={sectionRef}
        mouseX={mouseX}
        mouseY={mouseY}
        className="right-[3%] bottom-[42%] opacity-40 md:opacity-50"
        scrollSpeed={0.6}
        depth={1}
        floatDuration={4.5}
        floatDistance={16}
        delay={0.2}
        initialRotate={-25}
      >
        <D20Icon variant="gold" className="h-11 w-11 md:h-14 md:w-14" />
      </ParallaxFloat>

      <ParallaxFloat
        sectionRef={sectionRef}
        mouseX={mouseX}
        mouseY={mouseY}
        className="right-[28%] bottom-[10%] hidden opacity-40 xl:block"
        scrollSpeed={0.3}
        depth={0.4}
        floatDuration={5}
        floatDistance={9}
        delay={1.6}
        initialRotate={15}
      >
        <PotionIcon className="h-12 w-9" />
      </ParallaxFloat>

      <ParallaxFloat
        sectionRef={sectionRef}
        mouseX={mouseX}
        mouseY={mouseY}
        className="left-[42%] top-[12%] hidden opacity-30 xl:block"
        scrollSpeed={0.15}
        depth={0.25}
        floatDuration={8}
        floatDistance={6}
        delay={2}
        initialRotate={-5}
      >
        <ScrollIcon className="h-10 w-14" />
      </ParallaxFloat>

      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col justify-center px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-32 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10 lg:px-8 lg:pt-36 xl:gap-14">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10"
        >
          <motion.div variants={item} className="mb-7 flex flex-wrap items-center gap-3">
            <span className="inline-flex max-w-full flex-wrap items-center gap-2.5 rounded-sm border border-frost/35 bg-frost/[0.07] px-3.5 py-2 font-display text-[0.65rem] uppercase tracking-[0.22em] text-frost shadow-[0_0_24px_rgba(0,212,255,0.12)] backdrop-blur-sm sm:px-4 sm:text-xs sm:tracking-[0.28em]">
              <span
                className="relative flex h-2 w-2 shrink-0"
                aria-hidden="true"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-frost opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-frost" />
              </span>
              <Hexagon className="h-3.5 w-3.5" aria-hidden="true" />
              Lançamento em breve · Vagas de fundador
            </span>

            {showWaitlist ? (
              <span className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-stone-300">
                <Users className="h-3.5 w-3.5 text-frost" aria-hidden="true" />
                <span>
                  <span className="font-display text-sm text-white">
                    {waitlistCount}
                  </span>{' '}
                  {waitlistCount === 1 ? 'mestre na lista' : 'mestres na lista'}
                </span>
              </span>
            ) : null}
          </motion.div>

          <motion.div variants={item} className="relative pl-0 lg:pl-6">
            <span
              className="absolute left-0 top-2 hidden h-[calc(100%-0.5rem)] w-1 rounded-full bg-gradient-to-b from-ember via-ember/50 to-frost/40 lg:block"
              aria-hidden="true"
            />

            <h1
              id="launch-hero-title"
              className="font-display text-[clamp(2.35rem,7.5vw,5.75rem)] leading-[0.88] tracking-tight text-white"
            >
              <span className="block">Sua dungeon</span>
              <span className="block">nunca mais</span>
              <span className="mt-2 block text-gradient-ember">
                vai parecer amadora.
              </span>
            </h1>
          </motion.div>

          <motion.p
            variants={item}
            className="mt-7 max-w-xl text-base leading-[1.7] text-stone-300 sm:text-lg md:text-xl"
          >
            A primeira assinatura mensal de{' '}
            <span className="text-white">cenários 3D modulares</span> do Brasil.
            Todo mês um kit novo na sua porta —{' '}
            <span className="text-stone-200">tiles, paredes, props</span>. Sua
            dungeon cresce a cada caixa. Para sempre.
          </motion.p>

          <motion.ul
            variants={item}
            className="mt-6 flex flex-wrap gap-2"
            aria-label="Compatibilidade"
          >
            {compatibilityChips.map((chip) => (
              <li
                key={chip}
                className="rounded-sm border border-white/10 bg-stone-900/50 px-2.5 py-1.5 font-display text-[0.62rem] uppercase tracking-[0.18em] text-stone-400 sm:text-[0.68rem] sm:tracking-[0.22em]"
              >
                {chip}
              </li>
            ))}
          </motion.ul>

          <motion.div
            variants={item}
            className="mt-9 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4"
          >
            <CTAButton
              label="Entrar no Grupo de Fundadores"
              size="lg"
              href={WHATSAPP_GUILD_URL}
              external
              className="w-full border-glow-ember shadow-[0_8px_32px_rgba(255,107,43,0.25)] sm:w-auto"
            />
            <CTAButton
              label="Receber novidades por e-mail"
              variant="frost"
              size="lg"
              href="#captura"
              className="w-full sm:w-auto"
            />
          </motion.div>

          <motion.div
            variants={item}
            className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone-500"
          >
            <span className="inline-flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 shrink-0 text-stone-600" aria-hidden="true" />
              Grupo fechado
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-stone-700 sm:inline" aria-hidden="true" />
            <span>Sem spam</span>
            <span className="hidden h-1 w-1 rounded-full bg-stone-700 sm:inline" aria-hidden="true" />
            <span>Cancele quando quiser</span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.9,
            delay: 0.25,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="relative z-10 mt-12 w-full lg:mt-0"
        >
          <motion.div
            style={{
              x: imageParallaxX,
              y: reduced ? 0 : imageScrollY,
            }}
            className="relative"
          >
            <motion.div style={{ y: imageParallaxY }} className="hero-relic-frame relative px-2 sm:px-4">
              <span
                className="hero-relic-corner left-[2%] top-[4%] border-l-2 border-t-2"
                aria-hidden="true"
              />
              <span
                className="hero-relic-corner right-[2%] top-[4%] border-r-2 border-t-2"
                aria-hidden="true"
              />
              <span
                className="hero-relic-corner bottom-[4%] left-[2%] border-b-2 border-l-2"
                aria-hidden="true"
              />
              <span
                className="hero-relic-corner bottom-[4%] right-[2%] border-b-2 border-r-2"
                aria-hidden="true"
              />

              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember/25 blur-[90px]"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute left-1/2 top-[55%] h-[48%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-frost/10 blur-[70px]"
                aria-hidden="true"
              />

              <Image
                src="/images/img-hero-dungeonbox.png"
                alt="Mesa de RPG com caixa DungeonBox aberta, miniaturas, dados e cenários 3D modulares"
                width={2528}
                height={1686}
                priority
                className="relative z-10 h-auto max-h-[min(44vh,340px)] w-full object-contain drop-shadow-[0_24px_80px_rgba(0,0,0,0.7)] sm:max-h-[min(50vh,420px)] lg:max-h-[min(74vh,640px)] lg:scale-[1.02]"
                sizes="(max-width: 1024px) 92vw, 50vw"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <a
        href="#problema"
        className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 cursor-pointer flex-col items-center gap-2 text-stone-500 transition-colors hover:text-stone-300 sm:bottom-8"
        aria-label="Rolar para continuar"
      >
        <span className="font-display text-[0.65rem] uppercase tracking-[0.35em]">
          Scroll
        </span>
        <span
          className="flex h-9 w-5 items-start justify-center rounded-full border border-white/15 p-1"
          aria-hidden="true"
        >
          <span className="hero-scroll-line h-2 w-0.5 origin-top rounded-full bg-ember" />
        </span>
        <ChevronDown className="h-4 w-4 opacity-60" aria-hidden="true" />
      </a>
    </section>
  );
}
