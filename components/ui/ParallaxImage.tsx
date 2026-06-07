'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

interface Props {
  src: string;
  alt: string;
  className?: string;
  speed?: number;
  priority?: boolean;
  objectFit?: 'cover' | 'contain';
  /** Disable inner scale (better for object-contain hero shots) */
  noScale?: boolean;
}

export default function ParallaxImage({
  src,
  alt,
  className = '',
  speed = 0.15,
  priority = false,
  objectFit = 'cover',
  noScale = false,
}: Props) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`${speed * -100}px`, `${speed * 100}px`],
  );

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        style={{ y }}
        className={`relative h-full w-full ${noScale ? '' : 'scale-110'}`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          className={objectFit === 'contain' ? 'object-contain' : 'object-cover'}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </motion.div>
    </div>
  );
}
