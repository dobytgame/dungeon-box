'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  STORE_CATEGORY_BANNER_HEIGHT,
  STORE_CATEGORY_BANNER_WIDTH,
  STORE_CATEGORY_THUMB_SIZE,
} from '@/lib/store/category-media';

const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

async function uploadImage(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await fetch('/api/admin/store/upload', {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? 'Falha no upload.');
  }

  return payload.url;
}

interface Props {
  bannerUrl: string | null;
  thumbUrl: string | null;
}

export default function StoreCategoryMediaFields({
  bannerUrl: initialBannerUrl,
  thumbUrl: initialThumbUrl,
}: Props) {
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl ?? '');
  const [thumbUrl, setThumbUrl] = useState(initialThumbUrl ?? '');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [error, setError] = useState('');
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(
    file: File,
    folder: string,
    onSuccess: (url: string) => void,
    setUploading: (value: boolean) => void
  ) {
    setUploading(true);
    setError('');
    try {
      const url = await uploadImage(file, folder);
      onSuccess(url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Falha no upload.'
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5 rounded-sm border border-white/10 bg-stone-950/40 p-4">
      <input type="hidden" name="banner_url" value={bannerUrl} />
      <input type="hidden" name="thumb_url" value={thumbUrl} />

      <div>
        <p className={labelClass}>Banner da página</p>
        <p className="mt-1 text-xs text-stone-500">
          Exibido no topo da página da categoria. Recomendado{' '}
          {STORE_CATEGORY_BANNER_WIDTH}×{STORE_CATEGORY_BANNER_HEIGHT}px.
        </p>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <div className="flex aspect-[21/9] h-36 w-full max-w-2xl items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-stone-900/60 sm:h-40">
            {bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerUrl}
                alt="Banner da categoria"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="px-2 text-center text-xs text-stone-600">
                Sem banner
              </span>
            )}
          </div>
          <MediaActions
            uploading={uploadingBanner}
            hasImage={Boolean(bannerUrl)}
            onPick={() => bannerInputRef.current?.click()}
            onRemove={() => setBannerUrl('')}
          />
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleUpload(file, 'categories/banners', setBannerUrl, setUploadingBanner);
            }
            event.target.value = '';
          }}
        />
      </div>

      <div>
        <p className={labelClass}>Miniatura da loja</p>
        <p className="mt-1 text-xs text-stone-500">
          Usada no slider de categorias na home. Recomendado {STORE_CATEGORY_THUMB_SIZE}×
          {STORE_CATEGORY_THUMB_SIZE}px.
        </p>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <div className="flex aspect-square h-32 w-32 items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-stone-900/60">
            {thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbUrl}
                alt="Miniatura da categoria"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="px-2 text-center text-xs text-stone-600">
                Sem miniatura
              </span>
            )}
          </div>
          <MediaActions
            uploading={uploadingThumb}
            hasImage={Boolean(thumbUrl)}
            onPick={() => thumbInputRef.current?.click()}
            onRemove={() => setThumbUrl('')}
          />
        </div>
        <input
          ref={thumbInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleUpload(file, 'categories/thumbs', setThumbUrl, setUploadingThumb);
            }
            event.target.value = '';
          }}
        />
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function MediaActions({
  uploading,
  hasImage,
  onPick,
  onRemove,
}: {
  uploading: boolean;
  hasImage: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={uploading}
        onClick={onPick}
        className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-white/10 px-3 py-2 text-xs uppercase tracking-widest text-stone-300 hover:border-white/20"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        Enviar imagem
      </button>
      {hasImage ? (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex cursor-pointer items-center gap-2 text-xs text-red-400 hover:text-red-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remover
        </button>
      ) : null}
    </div>
  );
}
