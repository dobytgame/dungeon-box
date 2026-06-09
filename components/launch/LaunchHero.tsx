'use client';

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ChevronDown, Hexagon, Lock } from 'lucide-react';
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
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const mouseSpring = { stiffness: 90, damping: 30, mass: 0.5 };

export default function LaunchHero() {
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

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen overflow-hidden bg-stone-950 bg-grid noise"
    >
      <div
        className="hero-image-spotlight pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <GlowOrb color="frost" size="lg" position="-top-20 left-1/2 -translate-x-1/2" />
      <GlowOrb color="ember" size="md" position="bottom-0 right-0 translate-x-1/4" />

      <ParallaxFloat
        sectionRef={sectionRef}
        mouseX={mouseX}
        mouseY={mouseY}
        className="left-[4%] top-[22%] hidden opacity-60 md:block"
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
        className="left-[10%] bottom-[30%] hidden opacity-40 lg:block"
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
        className="right-[5%] top-[16%] hidden opacity-70 md:block"
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
        className="right-[3%] bottom-[42%] opacity-50 md:opacity-60"
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
        className="right-[28%] bottom-[10%] hidden opacity-45 xl:block"
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
        className="left-[42%] top-[12%] hidden opacity-35 xl:block"
        scrollSpeed={0.15}
        depth={0.25}
        floatDuration={8}
        floatDistance={6}
        delay={2}
        initialRotate={-5}
      >
        <ScrollIcon className="h-10 w-14" />
      </ParallaxFloat>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-8 lg:px-8 lg:pt-32 xl:gap-12">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10"
        >
          <motion.div variants={item} className="mb-6">
            <span className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-sm border border-frost/30 bg-frost/5 px-3 py-2 font-display text-[0.65rem] uppercase tracking-[0.2em] text-frost backdrop-blur-sm sm:px-4 sm:text-xs sm:tracking-[0.25em]">
              <Hexagon className="h-3.5 w-3.5" aria-hidden="true" />
              Lançamento em breve · Vagas de fundador abertas
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="font-display text-[clamp(2.25rem,8vw,5.5rem)] leading-[0.9] tracking-tight text-white"
          >
            Sua dungeon nunca mais
            <span className="mt-1 block text-gradient-ember">
              vai parecer amadora.
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-lg text-lg leading-relaxed text-stone-300 md:text-xl"
          >
            A DungeonBox é a primeira assinatura mensal de cenários 3D modulares
            do Brasil. Todo mês um kit novo chega na sua porta — tiles, paredes,
            props. Sua dungeon cresce a cada caixa. Para sempre.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4"
          >
            <CTAButton
              label="Entrar no Grupo de Fundadores"
              size="lg"
              href={WHATSAPP_GUILD_URL}
              external
              className="w-full sm:w-auto"
            />
            <CTAButton
              label="Receber novidades por e-mail"
              variant="default"
              size="lg"
              href="#captura"
              className="w-full sm:w-auto"
            />
          </motion.div>

          <motion.p
            variants={item}
            className="mt-5 inline-flex flex-wrap items-center gap-2 text-sm text-stone-500"
          >
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Grupo fechado · Sem spam · Cancele quando quiser
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.9,
            delay: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="relative z-10 mt-10 w-full lg:mt-0"
        >
          <motion.div
            style={{
              x: imageParallaxX,
              y: reduced ? 0 : imageScrollY,
            }}
            className="relative"
          >
            <motion.div style={{ y: imageParallaxY }} className="relative">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember/20 blur-[80px]"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-[50%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-frost/10 blur-[60px]"
                aria-hidden="true"
              />

              <Image
                src="/images/img-hero-dungeonbox.png"
                alt="Mesa de RPG com caixa DungeonBox aberta, miniaturas, dados e cenários 3D modulares"
                width={2528}
                height={1686}
                priority
                className="relative z-10 h-auto max-h-[min(42vh,320px)] w-full object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.65)] sm:max-h-[min(48vh,400px)] lg:max-h-[min(72vh,620px)] lg:origin-center lg:scale-[1.04]"
                sizes="(max-width: 1024px) 92vw, 52vw"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <a
        href="#problema"
        className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 cursor-pointer flex-col items-center gap-1.5 text-stone-500 transition-colors hover:text-stone-300 sm:bottom-8 sm:gap-2"
        aria-label="Rolar para continuar"
      >
        <span className="font-display text-xs uppercase tracking-[0.3em]">
          Scroll
        </span>
        <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden="true" />
      </a>
    </section>
  );
}
