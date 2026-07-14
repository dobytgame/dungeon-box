'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Images, Loader2, Trash2 } from 'lucide-react';
import AdminStoreImageField from '@/components/admin/AdminStoreImageField';
import AdminStoreMediaGallery from '@/components/admin/AdminStoreMediaGallery';
import { uploadStoreMedia } from '@/lib/admin/store-media-client';
import { STORE_PRODUCT_IMAGE_SIZE } from '@/lib/store/product-media';

const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface Props {
  imageUrl: string | null;
  galleryUrls: string[];
}

export default function StoreProductMediaFields({
  imageUrl: initialImageUrl,
  galleryUrls: initialGalleryUrls,
}: Props) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? '');
  const [galleryUrls, setGalleryUrls] = useState<string[]>(initialGalleryUrls);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [error, setError] = useState('');
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleGalleryUpload(file: File) {
    setUploadingGallery(true);
    setError('');
    try {
      const url = await uploadStoreMedia(file, 'products');
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

      <AdminStoreImageField
        label="Imagem principal"
        hint={`Quadrado ${STORE_PRODUCT_IMAGE_SIZE}×${STORE_PRODUCT_IMAGE_SIZE}px recomendado.`}
        value={imageUrl}
        onChange={setImageUrl}
        uploadFolder="products"
        showManualUrl
      />

      <div>
        <p className={labelClass}>Galeria</p>
        <p className="mt-1 text-xs text-stone-500">
          Imagens adicionais na página do produto. Use {STORE_PRODUCT_IMAGE_SIZE}×
          {STORE_PRODUCT_IMAGE_SIZE}px.
        </p>

        {galleryUrls.length > 0 ? (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {galleryUrls.map((url) => (
              <li
                key={url}
                className="group relative overflow-hidden rounded-sm border border-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  width={STORE_PRODUCT_IMAGE_SIZE}
                  height={STORE_PRODUCT_IMAGE_SIZE}
                  className="aspect-square w-full object-cover"
                />
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
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploadingGallery}
            onClick={() => galleryInputRef.current?.click()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-white/10 px-3 py-2 text-xs uppercase tracking-widest text-stone-300 hover:border-white/20"
          >
            {uploadingGallery ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            Enviar imagem
          </button>
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-white/10 px-3 py-2 text-xs uppercase tracking-widest text-stone-300 hover:border-white/20"
          >
            <Images className="h-4 w-4" />
            Escolher da galeria
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <AdminStoreMediaGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={(url) => {
          setGalleryUrls((current) =>
            current.includes(url) ? current : [...current, url]
          );
        }}
        title="Adicionar à galeria do produto"
        description="Selecione imagens já enviadas ao bucket store-media."
      />
    </div>
  );
}
