import Link from 'next/link';

type Variant = 'primary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  onClick?: () => void;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-mesa-ember text-mesa-ink shadow-[0_10px_28px_rgba(255,100,45,0.28)] hover:brightness-110',
  ghost: 'bg-transparent text-mesa-parchment hover:text-white',
  outline:
    'border border-mesa-parchment/20 bg-transparent text-mesa-parchment hover:border-mesa-parchment/45 hover:bg-white/[0.04]',
};

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2.5 text-[11px]',
  md: 'px-5 py-3 text-xs',
  lg: 'px-6 py-3.5 text-sm',
};

export default function HomeV2Button({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
}: Props) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`home-v2-display inline-flex cursor-pointer items-center justify-center rounded-sm tracking-[0.16em] transition duration-150 ease-out hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mesa-ember ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </Link>
  );
}
