import Link from 'next/link';

interface Props {
  label: string;
  variant?: 'ember' | 'frost' | 'gold' | 'default';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  className?: string;
}

const variants = {
  ember: 'bg-ember text-stone-950 hover:bg-ember-bright',
  frost: 'border border-frost text-frost hover:bg-frost/10',
  gold: 'bg-gold text-stone-950 hover:bg-gold-bright',
  default: 'border border-white/20 text-white hover:bg-white/10',
};

const sizes = {
  sm: 'px-5 py-2.5 text-sm',
  md: 'px-7 py-3.5 text-base',
  lg: 'px-9 py-4 text-lg',
};

export default function CTAButton({
  label,
  variant = 'ember',
  size = 'md',
  href = '#planos',
  className = '',
}: Props) {
  const classes = `inline-flex cursor-pointer items-center justify-center rounded-sm font-display uppercase tracking-widest transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <Link href={href} className={classes}>
      {label}
    </Link>
  );
}
