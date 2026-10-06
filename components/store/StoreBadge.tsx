import type { ReactNode } from 'react';

const TONES = {
  ember: 'bg-mesa-ember text-mesa-ink',
  jade: 'bg-mesa-jade text-mesa-ink',
  ghost: 'bg-mesa-ink/75 text-mesa-parchment ring-1 ring-inset ring-white/15 backdrop-blur-md',
} as const;

interface Props {
  tone: keyof typeof TONES;
  children: ReactNode;
}

export default function StoreBadge({ tone, children }: Props) {
  return (
    <span
      className={`home-v2-display inline-flex items-center rounded-full px-2.5 py-1 text-[11px] leading-none tracking-[0.14em] shadow-lg shadow-black/30 ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
