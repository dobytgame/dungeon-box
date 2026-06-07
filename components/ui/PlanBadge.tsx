import { Hexagon } from 'lucide-react';

interface Props {
  label: string;
  variant?: 'silver' | 'ember' | 'frost';
  pulse?: boolean;
}

const variantStyles = {
  silver: 'border-silver/40 text-silver bg-silver/5',
  ember: 'border-ember/50 text-ember bg-ember/10',
  frost: 'border-frost/50 text-frost bg-frost/10',
};

export default function PlanBadge({ label, variant = 'silver', pulse = false }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 font-display text-xs uppercase tracking-[0.2em] ${variantStyles[variant]} ${pulse ? 'animate-pulse-glow' : ''}`}
    >
      <Hexagon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
