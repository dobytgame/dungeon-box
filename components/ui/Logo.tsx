import Image from 'next/image';
import Link from 'next/link';

interface Props {
  variant?: 'nav' | 'footer' | 'hero';
  className?: string;
  linked?: boolean;
  href?: string;
}

const variantStyles = {
  nav: 'h-20 w-auto',
  footer: 'h-auto w-[240px]',
  hero: 'h-auto w-full max-w-sm sm:max-w-md lg:max-w-lg',
};

const variantDimensions = {
  nav: { width: 280, height: 80 },
  footer: { width: 240, height: 70 },
  hero: { width: 560, height: 160 },
} as const;

export default function Logo({
  variant = 'nav',
  className = '',
  linked = true,
  href = '/',
}: Props) {
  const { width, height } = variantDimensions[variant];

  const image = (
    <Image
      src="/images/dungeonbox.png"
      alt="DungeonBox — Kits de RPG impressos. Aventuras que ganham vida."
      width={width}
      height={height}
      className={`${variantStyles[variant]} ${className}`}
      priority={variant === 'nav' || variant === 'hero'}
    />
  );

  if (!linked) {
    return image;
  }

  return (
    <Link
      href={href}
      className="inline-flex cursor-pointer transition-opacity hover:opacity-90"
    >
      {image}
    </Link>
  );
}
