'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import AdminStoreImageField from '@/components/admin/AdminStoreImageField';
import {
  deleteStoreBannerAction,
  saveStoreBannerAction,
} from '@/lib/admin/actions';
import type { AdminStoreBannerRow } from '@/lib/admin/store-banners';

const inputClass =
  'mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white';
const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface Props {
  banner?: AdminStoreBannerRow | null;
}

export default function StoreBannerForm({ banner }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState(banner?.image_url ?? '');

  return (
    <form
      className="max-w-xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError('');

        startTransition(async () => {
          const result = await saveStoreBannerAction(banner?.id ?? null, formData);
          if ('error' in result && result.error) {
            setError(result.error);
            return;
          }
          if ('id' in result) {
            router.push(`/admin/loja/banners/${result.id}`);
            router.refresh();
          }
        });
      }}
    >
      <div>
        <label htmlFor="title" className={labelClass}>
          Título
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={banner?.title ?? ''}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="subtitle" className={labelClass}>
          Subtítulo
        </label>
        <textarea
          id="subtitle"
          name="subtitle"
          rows={3}
          defaultValue={banner?.subtitle ?? ''}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cta_label" className={labelClass}>
            Texto do botão
          </label>
          <input
            id="cta_label"
            name="cta_label"
            defaultValue={banner?.cta_label ?? ''}
            className={inputClass}
            placeholder="Ver produtos"
          />
        </div>
        <div>
          <label htmlFor="cta_href" className={labelClass}>
            Link do botão
          </label>
          <input
            id="cta_href"
            name="cta_href"
            defaultValue={banner?.cta_href ?? ''}
            className={inputClass}
            placeholder="/loja#produtos"
          />
        </div>
      </div>

      <div className="rounded-sm border border-white/10 bg-stone-950/40 p-4">
        <AdminStoreImageField
          label="Imagem de fundo"
          hint="Opcional. Recomendado 1920×1080px ou proporção widescreen. Sem imagem, usa gradiente escuro padrão."
          value={imageUrl}
          onChange={setImageUrl}
          uploadFolder="banners"
          name="image_url"
          previewClassName="h-40 w-full max-w-2xl"
          previewAspectClassName="aspect-[21/9]"
          emptyLabel="Sem imagem"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sort_order" className={labelClass}>
            Ordem
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            min={0}
            defaultValue={banner?.sort_order ?? 0}
            className={inputClass}
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-300">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={banner?.is_active ?? true}
              className="rounded border-white/20"
            />
            Ativo no slider
          </label>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-sm bg-console px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-950 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar banner
        </button>

        {banner ? (
          <button
            type="button"
            disabled={deletePending}
            onClick={() => {
              if (!window.confirm('Excluir este banner?')) return;
              setDeletePending(true);
              void deleteStoreBannerAction(banner.id).then((result) => {
                setDeletePending(false);
                if ('error' in result && result.error) {
                  setError(result.error);
                  return;
                }
                router.push('/admin/loja/banners');
                router.refresh();
              });
            }}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-sm border border-red-400/30 px-5 py-3 font-display text-xs uppercase tracking-widest text-red-300"
          >
            Excluir
          </button>
        ) : null}
      </div>
    </form>
  );
}
