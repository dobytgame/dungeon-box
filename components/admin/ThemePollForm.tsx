'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import AdminStoreImageField from '@/components/admin/AdminStoreImageField';
import { saveThemePollAction } from '@/lib/admin/theme-poll-actions';
import { toBrazilDateKey } from '@/lib/datetime/brazil';
import { THEME_VOTE_MIN_CYCLE } from '@/lib/theme-votes/types';
import type { ThemePoll } from '@/lib/theme-votes/types';

const inputClass =
  'mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white';
const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface Props {
  poll?: ThemePoll | null;
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toBrazilDateKey(date.toISOString());
}

export default function ThemePollForm({ poll }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const option1 = poll?.options.find((option) => option.sort_order === 1);
  const option2 = poll?.options.find((option) => option.sort_order === 2);
  const [image1, setImage1] = useState(option1?.image_url ?? '');
  const [image2, setImage2] = useState(option2?.image_url ?? '');

  const today = toBrazilDateKey(new Date().toISOString());

  return (
    <form
      className="max-w-3xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError('');
        startTransition(async () => {
          const result = await saveThemePollAction(poll?.id ?? null, formData);
          if ('error' in result && result.error) {
            setError(result.error);
            return;
          }
          if ('id' in result) {
            router.push(`/admin/temas/votacao/${result.id}`);
            router.refresh();
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="cycle_number" className={labelClass}>
            Ciclo
          </label>
          <input
            id="cycle_number"
            name="cycle_number"
            type="number"
            min={THEME_VOTE_MIN_CYCLE}
            required
            defaultValue={poll?.cycle_number ?? THEME_VOTE_MIN_CYCLE}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-stone-500">
            A votação começa no ciclo {THEME_VOTE_MIN_CYCLE}.
          </p>
        </div>
        <div>
          <label htmlFor="starts_on" className={labelClass}>
            Data de liberação
          </label>
          <input
            id="starts_on"
            name="starts_on"
            type="date"
            required
            defaultValue={
              poll?.starts_at ? toBrazilDateKey(poll.starts_at) : today
            }
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="ends_on" className={labelClass}>
            Data de fim
          </label>
          <input
            id="ends_on"
            name="ends_on"
            type="date"
            required
            defaultValue={
              poll?.ends_at ? toBrazilDateKey(poll.ends_at) : addDays(today, 7)
            }
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {[1, 2].map((slot) => {
          const option = slot === 1 ? option1 : option2;
          const image = slot === 1 ? image1 : image2;
          const setImage = slot === 1 ? setImage1 : setImage2;

          return (
            <fieldset
              key={slot}
              className="space-y-4 rounded-sm border border-white/10 bg-stone-950/40 p-4"
            >
              <legend className="px-1 font-display text-xs uppercase tracking-widest text-console">
                Tema {slot}
              </legend>
              {option?.id ? (
                <input type="hidden" name={`option_${slot}_id`} value={option.id} />
              ) : null}
              <div>
                <label htmlFor={`option_${slot}_name`} className={labelClass}>
                  Nome
                </label>
                <input
                  id={`option_${slot}_name`}
                  name={`option_${slot}_name`}
                  required
                  defaultValue={option?.name ?? ''}
                  className={inputClass}
                />
              </div>
              <AdminStoreImageField
                label="Imagem"
                hint="Arte que o assinante vê na votação."
                value={image}
                onChange={setImage}
                uploadFolder="themes"
                name={`option_${slot}_image_url`}
                previewClassName="h-40 w-full max-w-xs"
                previewAspectClassName="aspect-[4/3]"
                showManualUrl
              />
            </fieldset>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-console px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Salvar votação
      </button>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
