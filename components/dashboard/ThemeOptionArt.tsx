import StoreMediaImage from '@/components/store/StoreMediaImage';

type ThemeOptionArtProps = {
  name: string;
  imageUrl: string | null;
  className?: string;
  dimmed?: boolean;
  zoom?: boolean;
  priority?: boolean;
};

export default function ThemeOptionArt({
  name,
  imageUrl,
  className = '',
  dimmed = false,
  zoom = false,
  priority = false,
}: ThemeOptionArtProps) {
  return (
    <div
      className={`relative overflow-hidden bg-stone-900 ${dimmed ? 'grayscale contrast-75' : ''} ${className}`}
    >
      {imageUrl ? (
        <StoreMediaImage
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className={`object-cover transition duration-500 motion-reduce:transition-none ${
            dimmed ? 'opacity-45' : 'opacity-100'
          } ${zoom ? 'group-hover:scale-[1.05] motion-reduce:transform-none' : ''}`}
          priority={priority}
        />
      ) : (
        <div className="flex h-full min-h-[10rem] items-center justify-center px-4 text-center font-display text-xs uppercase tracking-[0.25em] text-stone-600">
          Sem arte
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
