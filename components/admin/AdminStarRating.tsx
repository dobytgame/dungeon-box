import { Star } from 'lucide-react';

interface Props {
  rating: number;
  size?: 'sm' | 'md';
}

export default function AdminStarRating({ rating, size = 'sm' }: Props) {
  const iconClass = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <span className="inline-flex items-center gap-0.5 text-gold" aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= rating;
        return (
          <Star
            key={star}
            className={iconClass}
            fill={active ? 'currentColor' : 'none'}
            strokeWidth={active ? 0 : 2}
          />
        );
      })}
    </span>
  );
}
