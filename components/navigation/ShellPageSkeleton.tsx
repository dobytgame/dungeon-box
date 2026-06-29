interface Props {
  variant: 'admin' | 'dashboard';
}

function Block({
  className,
  variant,
}: {
  className: string;
  variant: Props['variant'];
}) {
  return (
    <div
      className={`shell-skeleton rounded ${variant === 'admin' ? 'shell-skeleton-admin' : 'shell-skeleton-dashboard'} ${className}`}
      aria-hidden="true"
    />
  );
}

export default function ShellPageSkeleton({ variant }: Props) {
  if (variant === 'admin') {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Carregando conteúdo">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Block variant={variant} className="h-3 w-24" />
            <Block variant={variant} className="h-8 w-56 max-w-full" />
          </div>
          <Block variant={variant} className="h-10 w-32" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="admin-panel space-y-3 rounded p-4">
              <Block variant={variant} className="h-3 w-20" />
              <Block variant={variant} className="h-7 w-28" />
            </div>
          ))}
        </div>

        <div className="admin-panel space-y-4 rounded p-5">
          <Block variant={variant} className="h-4 w-40" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Block key={index} variant={variant} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" aria-busy="true" aria-label="Carregando conteúdo">
      <div className="space-y-3">
        <Block variant={variant} className="h-3 w-28" />
        <Block variant={variant} className="h-10 w-64 max-w-full" />
        <Block variant={variant} className="h-4 w-full max-w-xl" />
      </div>

      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Block key={index} variant={variant} className="h-11 w-28 shrink-0" />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="space-y-4 rounded-sm border border-white/10 bg-stone-950/60 p-5"
          >
            <Block variant={variant} className="h-4 w-32" />
            <Block variant={variant} className="h-20 w-full" />
            <Block variant={variant} className="h-10 w-36" />
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-sm border border-white/10 bg-stone-950/60 p-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <Block key={index} variant={variant} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
