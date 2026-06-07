interface Props {
  color: 'ember' | 'frost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  position?: string;
}

const colorMap = {
  ember: 'bg-ember/20',
  frost: 'bg-frost/15',
  gold: 'bg-gold/15',
};

const sizeMap = {
  sm: 'h-48 w-48',
  md: 'h-72 w-72',
  lg: 'h-96 w-96',
};

export default function GlowOrb({
  color,
  size = 'md',
  position = 'top-0 left-1/2 -translate-x-1/2',
}: Props) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${position} ${sizeMap[size]} ${colorMap[color]} rounded-full blur-3xl`}
    />
  );
}
