'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Anima o cupom "saindo da impressora" ao entrar na tela; sem JS ou com movimento reduzido, fica visível. */
export default function PrintReveal({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'armed' | 'play'>('idle');

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    setState('armed');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setState('play');
        observer.disconnect();
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} data-print={state}>
      {children}
    </div>
  );
}
