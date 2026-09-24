import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  arrow?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
}

const variants: Record<Variant, string> = {
  primary:
    'home-v2-sheen bg-mesa-ember text-mesa-ink shadow-[0_10px_30px_-6px_rgba(255,100,45,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-[#ff7a4a] hover:shadow-[0_16px_40px_-8px_rgba(255,100,45,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]',
  secondary:
    'bg-mesa-parchment text-mesa-ink hover:bg-white shadow-[0_10px_28px_-10px_rgba(243,239,231,0.35)]',
  ghost:
    'bg-white/[0.04] text-mesa-parchment ring-1 ring-inset ring-white/15 backdrop-blur-sm hover:bg-white/[0.09] hover:ring-white/30',
  outline:
    'border border-mesa-parchment/20 bg-transparent text-mesa-parchment hover:border-mesa-ember/70 hover:bg-mesa-ember/[0.06]',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-11 gap-1.5 px-4 text-sm',
  md: 'min-h-12 gap-2 px-6 text-base',
  lg: 'min-h-14 gap-2.5 px-8 text-lg',
};

export default function HomeV2Button({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  arrow = false,
  icon,
  onClick,
}: Props) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group/cta home-v2-display inline-flex cursor-pointer items-center justify-center rounded-sm tracking-[0.1em] transition-[background-color,box-shadow,border-color,transform,color] duration-150 ease-out hover:scale-[1.015] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mesa-ember ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon ? <span aria-hidden="true" className="shrink-0">{icon}</span> : null}
      <span>{children}</span>
      {arrow ? (
        <ArrowRight
          aria-hidden="true"
          strokeWidth={2.25}
          className="size-[1.15em] shrink-0 transition-transform duration-150 ease-out group-hover/cta:translate-x-[3px]"
        />
      ) : null}
    </Link>
  );
}
