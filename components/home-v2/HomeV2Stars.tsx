import { Star } from 'lucide-react';

interface Props {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
} as const;

export default function HomeV2Stars({ value, size = 'sm', className = '' }: Props) {
  const label = `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de 5 estrelas`;

  return (
    <span role="img" aria-label={label} className={`inline-flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.min(1, Math.max(0, value - index));
        return (
          <span key={index} className={`relative inline-block ${SIZES[size]}`} aria-hidden="true">
            <Star className="absolute inset-0 size-full text-white/15" fill="currentColor" strokeWidth={0} />
            <span
              className="home-v2-stars-fill absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%`, '--star': index } as React.CSSProperties}
            >
              <Star
                className={`max-w-none text-gold drop-shadow-[0_0_6px_rgba(255,214,0,0.35)] ${SIZES[size]}`}
                fill="currentColor"
                strokeWidth={0}
              />
            </span>
          </span>
        );
      })}
    </span>
  );
}
