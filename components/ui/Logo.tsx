import Image from 'next/image';
import Link from 'next/link';

interface Props {
  variant?: 'nav' | 'footer' | 'hero';
  className?: string;
  linked?: boolean;
}

const variantStyles = {
  nav: 'h-9 w-auto md:h-11',
  footer: 'h-8 w-auto',
  hero: 'h-auto w-full max-w-sm sm:max-w-md lg:max-w-lg',
};

export default function Logo({ variant = 'nav', className = '', linked = true }: Props) {
  const image = (
    <Image
      src="/images/dungeonbox.png"
      alt="DungeonBox — Kits de RPG impressos. Aventuras que ganham vida."
      width={variant === 'hero' ? 560 : 220}
      height={variant === 'hero' ? 160 : 64}
      className={`${variantStyles[variant]} ${className}`}
      priority={variant === 'hero'}
    />
  );

  if (!linked) {
    return image;
  }

  return (
    <Link href="/" className="inline-flex cursor-pointer transition-opacity hover:opacity-90">
      {image}
    </Link>
  );
}
