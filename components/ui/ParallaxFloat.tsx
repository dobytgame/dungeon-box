'use client';

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { type ReactNode, type RefObject } from 'react';

const spring = { stiffness: 120, damping: 22, mass: 0.4 };

interface Props {
  children: ReactNode;
  sectionRef: RefObject<HTMLElement | null>;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  className?: string;
  /** Scroll parallax intensity (px at full scroll through hero) */
  scrollSpeed?: number;
  /** Mouse parallax depth — higher = more movement */
  depth?: number;
  floatDuration?: number;
  floatDistance?: number;
  delay?: number;
  initialRotate?: number;
}

export default function ParallaxFloat({
  children,
  sectionRef,
  mouseX,
  mouseY,
  className = '',
  scrollSpeed = 0.25,
  depth = 0.5,
  floatDuration = 5,
  floatDistance = 10,
  delay = 0,
  initialRotate = 0,
}: Props) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const scrollY = useTransform(scrollYProgress, [0, 1], [0, scrollSpeed * 140]);
  const parallaxX = useSpring(
    useTransform(mouseX, (v) => v * depth * 48),
    spring,
  );
  const parallaxY = useSpring(
    useTransform(mouseY, (v) => v * depth * 48),
    spring,
  );
  const combinedY = useTransform(
    [scrollY, parallaxY],
    ([sy, py]) => (sy as number) + (py as number),
  );

  if (reduced) {
    return (
      <div className={`pointer-events-none absolute ${className}`} aria-hidden="true">
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={`pointer-events-none absolute z-[1] ${className}`}
      style={{
        x: parallaxX,
        y: combinedY,
        rotate: initialRotate,
      }}
      aria-hidden="true"
    >
      <motion.div
        animate={{ y: [0, -floatDistance, 0] }}
        transition={{
          duration: floatDuration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
