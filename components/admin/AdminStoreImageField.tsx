'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Images, Loader2, Trash2 } from 'lucide-react';
import AdminStoreMediaGallery from '@/components/admin/AdminStoreMediaGallery';
import { uploadStoreMedia } from '@/lib/admin/store-media-client';

const inputClass =
  'mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white';
const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface Props {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  uploadFolder: string;
  name?: string;
  previewClassName?: string;
  previewAspectClassName?: string;
  showManualUrl?: boolean;
  emptyLabel?: string;
}

export default function AdminStoreImageField({
  label,
  hint,
  value,
  onChange,
  uploadFolder,
  name,
  previewClassName = 'h-36 w-36',
  previewAspectClassName = 'aspect-square',
  showManualUrl = true,
  emptyLabel = 'Sem imagem',
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload(file: File) {
    setUploading(true);
    setError('');
    try {
      const url = await uploadStoreMedia(file, uploadFolder);
      onChange(url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Falha no upload.'
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <p className={labelClass}>{label}</p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}

      <div className="mt-3 flex flex-wrap items-start gap-4">
        <div
          className={`flex ${previewAspectClassName} ${previewClassName} items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-stone-900/60`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-xs text-stone-600">{emptyLabel}</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleUpload(file);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-white/10 px-3 py-2 text-xs uppercase tracking-widest text-stone-300 hover:border-white/20"
          >
            {uploading ? (
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
          {value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex cursor-pointer items-center gap-2 text-xs text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover
            </button>
          ) : null}
        </div>
      </div>

      {showManualUrl ? (
        <div className="mt-4">
          <label className={labelClass}>URL manual (opcional)</label>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <AdminStoreMediaGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={onChange}
      />
    </div>
  );
}
