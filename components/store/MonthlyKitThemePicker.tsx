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
    <div className="space-y-2 border-t border-white/[0.06] pt-4">
      <p className="font-display text-[10px] uppercase tracking-widest text-stone-500">
        Tema do kit
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {themes.map((theme) => {
          const selected = selectedThemeId === theme.id;
          const label = formatStoreKitThemeLabel(theme);

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-sm border px-3 py-2.5 text-left transition ${
                selected
                  ? 'border-ember/50 bg-ember/10'
                  : 'border-white/10 bg-stone-950 hover:border-white/20'
              }`}
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-white/10 bg-stone-900">
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
                  <div className="flex h-full w-full items-center justify-center font-display text-[10px] text-gold">
                    {theme.kitNumber}
                  </div>
                )}
              </div>
              <span className="min-w-0">
                <span className="block text-sm text-white">{theme.name}</span>
                <span className="block text-[10px] uppercase tracking-widest text-stone-500">
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
