'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';

const inputClass =
  'mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white';
const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface Props {
  imageUrl: string | null;
  galleryUrls: string[];
}

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'products');

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

export default function StoreProductMediaFields({
  imageUrl: initialImageUrl,
  galleryUrls: initialGalleryUrls,
}: Props) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? '');
  const [galleryUrls, setGalleryUrls] = useState<string[]>(initialGalleryUrls);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [error, setError] = useState('');
  const mainInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleMainUpload(file: File) {
    setUploadingMain(true);
    setError('');
    try {
      const url = await uploadImage(file);
      setImageUrl(url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Falha no upload.'
      );
    } finally {
      setUploadingMain(false);
    }
  }

  async function handleGalleryUpload(file: File) {
    setUploadingGallery(true);
    setError('');
    try {
      const url = await uploadImage(file);
      setGalleryUrls((current) => [...current, url]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Falha no upload.'
      );
    } finally {
      setUploadingGallery(false);
    }
  }

  return (
    <div className="space-y-5 rounded-sm border border-white/10 bg-stone-950/40 p-4">
      <input type="hidden" name="image_url" value={imageUrl} />
      <input
        type="hidden"
        name="gallery_urls"
        value={JSON.stringify(galleryUrls)}
      />

      <div>
        <p className={labelClass}>Imagem principal</p>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-stone-900/60">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Imagem principal do produto"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="px-2 text-center text-xs text-stone-600">
                Sem imagem
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={mainInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleMainUpload(file);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={uploadingMain}
              onClick={() => mainInputRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-white/10 px-3 py-2 text-xs uppercase tracking-widest text-stone-300 hover:border-white/20"
            >
              {uploadingMain ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              Enviar imagem
            </button>
            {imageUrl ? (
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="inline-flex cursor-pointer items-center gap-2 text-xs text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <p className={labelClass}>Galeria</p>
        <p className="mt-1 text-xs text-stone-500">
          Imagens adicionais exibidas na página do produto.
        </p>

        {galleryUrls.length > 0 ? (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {galleryUrls.map((url) => (
              <li
                key={url}
                className="group relative overflow-hidden rounded-sm border border-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remover da galeria"
                  onClick={() =>
                    setGalleryUrls((current) => current.filter((item) => item !== url))
                  }
                  className="absolute right-2 top-2 rounded-sm bg-stone-950/80 p-1 text-red-300 opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleGalleryUpload(file);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={uploadingGallery}
          onClick={() => galleryInputRef.current?.click()}
          className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-sm border border-white/10 px-3 py-2 text-xs uppercase tracking-widest text-stone-300 hover:border-white/20"
        >
          {uploadingGallery ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          Adicionar à galeria
        </button>
      </div>

      <div>
        <label htmlFor="image_url_manual" className={labelClass}>
          URL manual (opcional)
        </label>
        <input
          id="image_url_manual"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="https://..."
          className={inputClass}
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
