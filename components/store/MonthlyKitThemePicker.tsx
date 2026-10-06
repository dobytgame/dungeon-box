'use client';

import StoreMediaImage from '@/components/store/StoreMediaImage';
import type { StoreKitTheme } from '@/lib/store/kit-themes';
import { formatStoreKitThemeLabel } from '@/lib/store/kit-themes';

interface Props {
  themes: StoreKitTheme[];
  selectedThemeId: string;
  onChange: (themeId: string) => void;
}

export default function MonthlyKitThemePicker({
  themes,
  selectedThemeId,
  onChange,
}: Props) {
  if (themes.length === 0) return null;

  return (
    <div className="space-y-3 border-t border-white/10 pt-5" role="group" aria-labelledby="kit-theme-label">
      <p id="kit-theme-label" className="home-v2-display text-[11px] tracking-[0.2em] text-mesa-ash">
        Tema do kit
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {themes.map((theme) => {
          const selected = selectedThemeId === theme.id;
          const label = formatStoreKitThemeLabel(theme);

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id)}
              aria-pressed={selected}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200 ${
                selected
                  ? 'border-mesa-ember bg-mesa-ember/[0.08]'
                  : 'border-white/10 bg-mesa-stone hover:border-white/25'
              }`}
            >
              <div className="size-10 shrink-0 overflow-hidden rounded-md border border-white/10 bg-mesa-ink">
                {theme.imageUrl ? (
                  <StoreMediaImage
                    src={theme.imageUrl}
                    alt=""
                    width={80}
                    height={80}
                    sizes="40px"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="home-v2-display flex size-full items-center justify-center text-sm tabular-nums text-mesa-parchment">
                    {theme.kitNumber}
                  </div>
                )}
              </div>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-mesa-parchment">{theme.name}</span>
                <span className="block truncate text-[11px] uppercase tracking-[0.14em] text-mesa-ash">
                  {label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
